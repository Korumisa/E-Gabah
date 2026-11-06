-- Security hardening (audit run-1): tighten module writes to match nav,
-- harden period lock/unlock, enforce payroll transitions + posting dates.
-- Depends on: auth_can_write_module, enable_ops_table_rls policies, period unlock RPCs.

-- ========== 1. Module write matrix (nav-aligned) ==========
-- Gudang: stock writer + lot_qc only (not full pembelian).
-- Keuangan: pembelian tables + sale_returns only (not sale_orders/payments).

create or replace function public.auth_can_write_module(p_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.active = true
      and (
        p.role = 'admin'
        or (p_key = 'pembelian' and p.role in ('pembelian', 'keuangan'))
        or (p_key = 'penjualan' and p.role = 'penjualan')
        or (p_key = 'produksi' and p.role = 'produksi')
        or (p_key in ('keuangan', 'period', 'bank', 'tax', 'gl') and p.role = 'keuangan')
        or (p_key = 'payroll' and p.role in ('keuangan', 'hr'))
        or (p_key = 'audit' and p.role in ('admin', 'keuangan', 'hr'))
      )
  );
$$;

create or replace function public.auth_can_write_lot_qc()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.active = true
      and p.role in ('admin', 'pembelian', 'gudang')
  );
$$;

create or replace function public.auth_can_write_sale_returns()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.active = true
      and p.role in ('admin', 'penjualan', 'keuangan')
  );
$$;

revoke all on function public.auth_can_write_lot_qc() from public;
grant execute on function public.auth_can_write_lot_qc() to authenticated;
revoke all on function public.auth_can_write_sale_returns() from public;
grant execute on function public.auth_can_write_sale_returns() to authenticated;

-- lot_qc: gudang + pembelian + admin
drop policy if exists lot_qc_insert on public.lot_qc;
drop policy if exists lot_qc_update on public.lot_qc;
drop policy if exists lot_qc_delete on public.lot_qc;
create policy lot_qc_insert on public.lot_qc
  for insert to authenticated
  with check (public.auth_can_write_lot_qc());
create policy lot_qc_update on public.lot_qc
  for update to authenticated
  using (public.auth_can_write_lot_qc())
  with check (public.auth_can_write_lot_qc());
create policy lot_qc_delete on public.lot_qc
  for delete to authenticated
  using (public.auth_can_write_lot_qc());

-- sale returns: penjualan + keuangan + admin
drop policy if exists sale_returns_insert on public.sale_returns;
drop policy if exists sale_returns_update on public.sale_returns;
drop policy if exists sale_returns_delete on public.sale_returns;
create policy sale_returns_insert on public.sale_returns
  for insert to authenticated
  with check (public.auth_can_write_sale_returns());
create policy sale_returns_update on public.sale_returns
  for update to authenticated
  using (public.auth_can_write_sale_returns())
  with check (public.auth_can_write_sale_returns());
create policy sale_returns_delete on public.sale_returns
  for delete to authenticated
  using (public.auth_can_write_sale_returns());

drop policy if exists sale_return_lines_insert on public.sale_return_lines;
drop policy if exists sale_return_lines_update on public.sale_return_lines;
drop policy if exists sale_return_lines_delete on public.sale_return_lines;
create policy sale_return_lines_insert on public.sale_return_lines
  for insert to authenticated
  with check (public.auth_can_write_sale_returns());
create policy sale_return_lines_update on public.sale_return_lines
  for update to authenticated
  using (public.auth_can_write_sale_returns())
  with check (public.auth_can_write_sale_returns());
create policy sale_return_lines_delete on public.sale_return_lines
  for delete to authenticated
  using (public.auth_can_write_sale_returns());

-- ========== 2. Period lock / unlock hardening ==========

-- No DELETE for clients — unlock/deactivate only via SECURITY DEFINER RPC + trigger.
drop policy if exists period_locks_delete on public.period_locks;

-- Keep UPDATE for period writers; trigger enforces unlock/date invariants.
drop policy if exists period_locks_update on public.period_locks;
create policy period_locks_update on public.period_locks
  for update to authenticated
  using (public.auth_can_write_module('period'))
  with check (public.auth_can_write_module('period'));

create or replace function public.enforce_period_lock_mutations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'period_locks delete is not allowed; use unlock RPC flow';
  end if;

  if coalesce(current_setting('app.allow_period_unlock', true), '') = 'on' then
    return new;
  end if;

  -- Block active → false without RPC (kept from 07; reinforce here).
  if old.active is true and new.active is false then
    raise exception 'period unlock requires approve_period_unlock_admin';
  end if;

  -- Active locks: cannot shrink/widen dates without RPC.
  if old.active is true then
    if new.start_date is distinct from old.start_date
       or new.end_date is distinct from old.end_date then
      raise exception 'active period_locks dates are immutable without unlock RPC';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.enforce_period_lock_no_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'period_locks delete is not allowed; use unlock RPC flow';
end;
$$;

drop trigger if exists trg_period_locks_unlock_rpc on public.period_locks;
drop trigger if exists trg_period_locks_mutations on public.period_locks;
drop trigger if exists trg_period_locks_no_delete on public.period_locks;
create trigger trg_period_locks_mutations
  before update on public.period_locks
  for each row
  execute function public.enforce_period_lock_mutations();
create trigger trg_period_locks_no_delete
  before delete on public.period_locks
  for each row
  execute function public.enforce_period_lock_no_delete();

-- Unlock request INSERT: force empty approvals / pending status.
create or replace function public.enforce_period_unlock_request_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.status := 'pending';
  new.approvals := '[]'::jsonb;
  new.admin_approval := null;
  new.rejected_by := null;
  new.reject_reason := null;
  return new;
end;
$$;

drop trigger if exists trg_period_unlock_requests_insert on public.period_unlock_requests;
create trigger trg_period_unlock_requests_insert
  before insert on public.period_unlock_requests
  for each row
  execute function public.enforce_period_unlock_request_insert();

drop policy if exists period_unlock_requests_delete on public.period_unlock_requests;
drop policy if exists period_unlock_requests_update on public.period_unlock_requests;

-- Posting tables: reject dates inside an active lock (unless unlock session flag).
create or replace function public.assert_date_not_in_locked_period(p_date text)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('app.allow_period_unlock', true), '') = 'on' then
    return;
  end if;
  if p_date is null or length(trim(p_date)) = 0 then
    return;
  end if;
  if exists (
    select 1
    from public.period_locks pl
    where pl.active = true
      and pl.start_date <= p_date
      and pl.end_date >= p_date
  ) then
    raise exception 'date % falls inside an active period lock', p_date;
  end if;
end;
$$;

create or replace function public.enforce_posting_period_lock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date text;
begin
  if tg_table_name = 'payroll_runs' then
    -- Payroll runs use period (YYYY-MM); skip ISO day check — status trigger covers workflow.
    return new;
  end if;
  v_date := new.date;
  perform public.assert_date_not_in_locked_period(v_date);
  return new;
end;
$$;

drop trigger if exists trg_cash_entries_period_lock on public.cash_entries;
create trigger trg_cash_entries_period_lock
  before insert or update of date on public.cash_entries
  for each row
  execute function public.enforce_posting_period_lock();

drop trigger if exists trg_gl_journals_period_lock on public.gl_journals;
create trigger trg_gl_journals_period_lock
  before insert or update of date on public.gl_journals
  for each row
  execute function public.enforce_posting_period_lock();

drop trigger if exists trg_expenses_period_lock on public.expenses;
create trigger trg_expenses_period_lock
  before insert or update of date on public.expenses
  for each row
  execute function public.enforce_posting_period_lock();

-- ========== 3. Payroll workflow enforcement ==========

create or replace function public.auth_payroll_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role::text
  from public.profiles p
  where p.id = auth.uid()
    and p.active = true
  limit 1;
$$;

create or replace function public.enforce_payroll_run_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := public.auth_payroll_role();
  v_status_changed boolean;
  v_approvals_changed boolean;
begin
  if tg_op = 'INSERT' then
    if new.status is distinct from 'draft'
       and new.status is distinct from 'menunggu_hr' then
      raise exception 'payroll_runs insert status must be draft or menunggu_hr';
    end if;
    return new;
  end if;

  v_status_changed := new.status is distinct from old.status;
  v_approvals_changed := new.approvals is distinct from old.approvals;

  if not v_status_changed and not v_approvals_changed then
    return new;
  end if;

  if v_role is null then
    raise exception 'payroll transition requires an active profile';
  end if;

  -- void: keuangan or admin only, from posted (or siap_cair cancel via reject path)
  if new.status = 'void' then
    if v_role not in ('admin', 'keuangan') then
      raise exception 'void payroll requires admin or keuangan';
    end if;
    if old.status not in ('posted', 'siap_cair', 'draft', 'menunggu_hr', 'menunggu_admin', 'menunggu_keuangan') then
      raise exception 'invalid payroll void from %', old.status;
    end if;
    return new;
  end if;

  -- reject → draft
  if new.status = 'draft' and old.status is distinct from 'draft' then
    if v_role not in ('admin', 'keuangan', 'hr') then
      raise exception 'reject payroll requires hr, admin, or keuangan';
    end if;
    if old.status not in ('menunggu_hr', 'menunggu_admin', 'menunggu_keuangan', 'siap_cair') then
      raise exception 'invalid payroll reject from %', old.status;
    end if;
    return new;
  end if;

  -- submit
  if old.status in ('draft') and new.status = 'menunggu_hr' then
    if v_role not in ('admin', 'hr', 'keuangan') then
      raise exception 'submit payroll requires hr, admin, or keuangan writer';
    end if;
    return new;
  end if;

  -- HR approve
  if old.status = 'menunggu_hr' and new.status = 'menunggu_admin' then
    if v_role is distinct from 'hr' and v_role is distinct from 'admin' then
      raise exception 'HR approval required';
    end if;
    return new;
  end if;

  -- Admin approve
  if old.status = 'menunggu_admin' and new.status = 'menunggu_keuangan' then
    if v_role is distinct from 'admin' then
      raise exception 'admin approval required';
    end if;
    return new;
  end if;

  -- Keuangan approve → siap_cair
  if old.status = 'menunggu_keuangan' and new.status = 'siap_cair' then
    if v_role is distinct from 'keuangan' and v_role is distinct from 'admin' then
      raise exception 'keuangan approval required';
    end if;
    return new;
  end if;

  -- Post / cair
  if old.status = 'siap_cair' and new.status = 'posted' then
    if v_role not in ('admin', 'keuangan') then
      raise exception 'post payroll requires admin or keuangan';
    end if;
    return new;
  end if;

  raise exception 'illegal payroll transition % → % for role %',
    old.status, new.status, coalesce(v_role, '?');
end;
$$;

drop trigger if exists trg_payroll_runs_transition on public.payroll_runs;
create trigger trg_payroll_runs_transition
  before insert or update on public.payroll_runs
  for each row
  execute function public.enforce_payroll_run_transition();
