-- 20261105_17: tighten sensitive SELECT; session list/revoke RPCs; login alert log.

-- ========== 1. Read helpers ==========
create or replace function public.auth_can_read_module(p_key text)
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
        or (p_key = 'pembelian' and p.role in ('pembelian', 'keuangan', 'gudang'))
        or (p_key = 'penjualan' and p.role in ('penjualan', 'keuangan'))
        or (p_key = 'produksi' and p.role in ('produksi', 'gudang'))
        or (p_key in ('keuangan', 'period', 'bank', 'tax', 'gl') and p.role = 'keuangan')
        or (p_key = 'payroll' and p.role in ('keuangan', 'hr'))
        or (p_key = 'audit' and p.role in ('keuangan', 'hr'))
      )
  );
$$;

revoke all on function public.auth_can_read_module(text) from public;
grant execute on function public.auth_can_read_module(text) to authenticated;

create or replace function public.auth_can_read_stock()
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
      and p.role in ('admin', 'gudang', 'produksi', 'pembelian', 'keuangan', 'penjualan')
  );
$$;

revoke all on function public.auth_can_read_stock() from public;
grant execute on function public.auth_can_read_stock() to authenticated;

-- Replace open SELECT on ops tables that used enable_ops_table_rls(..., module).
do $$
declare
  rec record;
begin
  for rec in
    select * from (values
      ('purchases', 'pembelian'),
      ('purchase_payments', 'pembelian'),
      ('purchase_returns', 'pembelian'),
      ('purchase_return_lines', 'pembelian'),
      ('lot_qc', 'pembelian'),
      ('sale_orders', 'penjualan'),
      ('sale_order_payments', 'penjualan'),
      ('sale_returns', 'penjualan'),
      ('sale_return_lines', 'penjualan'),
      ('production_batches', 'produksi'),
      ('batch_outputs', 'produksi'),
      ('pack_runs', 'produksi'),
      ('pack_run_lines', 'produksi'),
      ('lot_costs', 'produksi'),
      ('cash_entries', 'keuangan'),
      ('payables', 'keuangan'),
      ('receivables', 'keuangan'),
      ('expenses', 'keuangan'),
      ('period_locks', 'period'),
      ('period_unlock_requests', 'period'),
      ('bank_sessions', 'bank'),
      ('bank_lines', 'bank'),
      ('tax_settings', 'tax'),
      ('tax_docs', 'tax'),
      ('tax_invoices', 'tax'),
      ('gl_accounts', 'gl'),
      ('gl_account_map', 'gl'),
      ('gl_journals', 'gl'),
      ('gl_journal_lines', 'gl'),
      ('gl_failed_posts', 'gl'),
      ('payroll_runs', 'payroll'),
      ('payroll_lines', 'payroll'),
      ('audit_logs', 'audit')
    ) as t(tbl, module)
  loop
    execute format('drop policy if exists %I on public.%I', rec.tbl || '_select', rec.tbl);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.auth_can_read_module(%L))',
      rec.tbl || '_select', rec.tbl, rec.module
    );
  end loop;
end $$;

-- Stock tables
drop policy if exists stock_balances_select on public.stock_balances;
create policy stock_balances_select on public.stock_balances
  for select to authenticated
  using (public.auth_can_read_stock());

drop policy if exists stock_movements_select on public.stock_movements;
create policy stock_movements_select on public.stock_movements
  for select to authenticated
  using (public.auth_can_read_stock());

drop policy if exists stock_corrections_select on public.stock_corrections;
create policy stock_corrections_select on public.stock_corrections
  for select to authenticated
  using (public.auth_can_read_stock());

-- ========== 2. Auth sessions (own devices) ==========
create or replace function public.list_my_auth_sessions()
returns table (
  id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  user_agent text,
  ip text,
  aal text,
  is_current boolean
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    s.id,
    s.created_at,
    coalesce(s.updated_at, s.created_at) as updated_at,
    s.user_agent,
    host(s.ip)::text as ip,
    s.aal::text,
    (s.id = nullif(auth.jwt()->>'session_id', '')::uuid) as is_current
  from auth.sessions s
  where s.user_id = auth.uid()
  order by coalesce(s.updated_at, s.created_at) desc nulls last;
$$;

revoke all on function public.list_my_auth_sessions() from public;
grant execute on function public.list_my_auth_sessions() to authenticated;

create or replace function public.revoke_my_auth_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_current uuid := nullif(auth.jwt()->>'session_id', '')::uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if p_session_id is null then
    raise exception 'session id required';
  end if;
  if p_session_id = v_current then
    raise exception 'cannot revoke the current session; use sign out';
  end if;

  delete from auth.sessions
  where id = p_session_id
    and user_id = auth.uid();

  if not found then
    raise exception 'session not found';
  end if;
end;
$$;

revoke all on function public.revoke_my_auth_session(uuid) from public;
grant execute on function public.revoke_my_auth_session(uuid) to authenticated;

-- Admin: revoke all sessions for a branch user (except optionally keep theirs).
create or replace function public.admin_revoke_user_sessions(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  n integer;
begin
  if not public.auth_is_admin() then
    raise exception 'admin only';
  end if;
  if p_user_id is null then
    raise exception 'user id required';
  end if;

  delete from auth.sessions
  where user_id = p_user_id
    and id is distinct from nullif(auth.jwt()->>'session_id', '')::uuid;

  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.admin_revoke_user_sessions(uuid) from public;
grant execute on function public.admin_revoke_user_sessions(uuid) to authenticated;

-- ========== 3. Login alerts ==========
create table if not exists public.login_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  user_agent text,
  ip text,
  created_at timestamptz not null default now()
);

create index if not exists login_alerts_user_id_created_at_idx
  on public.login_alerts (user_id, created_at desc);

alter table public.login_alerts enable row level security;

drop policy if exists login_alerts_select on public.login_alerts;
create policy login_alerts_select on public.login_alerts
  for select to authenticated
  using (user_id = auth.uid() or public.auth_is_admin());

drop policy if exists login_alerts_insert on public.login_alerts;
-- inserts only via RPC
drop policy if exists login_alerts_update on public.login_alerts;
drop policy if exists login_alerts_delete on public.login_alerts;

drop policy if exists mfa_aal_gate on public.login_alerts;
create policy mfa_aal_gate on public.login_alerts
  as restrictive
  for all
  to authenticated
  using (public.auth_mfa_satisfied())
  with check (public.auth_mfa_satisfied());

create or replace function public.record_login_alert(
  p_user_agent text default null,
  p_ip text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_id uuid;
  v_enabled boolean := true;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select email into v_email from public.profiles where id = v_uid;
  if v_email is null then
    select email into v_email from auth.users where id = v_uid;
  end if;
  if v_email is null or length(trim(v_email)) = 0 then
    raise exception 'email missing';
  end if;

  -- Honor user preference in app_settings when present.
  select coalesce((payload->'security'->>'loginAlert')::boolean, true)
    into v_enabled
  from public.app_settings
  where id = 'user:' || v_uid::text;
  if not found then
    v_enabled := true;
  end if;

  if v_enabled is false then
    return null;
  end if;

  insert into public.login_alerts (user_id, email, user_agent, ip)
  values (
    v_uid,
    lower(trim(v_email)),
    nullif(trim(coalesce(p_user_agent, '')), ''),
    nullif(trim(coalesce(p_ip, '')), '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.record_login_alert(text, text) from public;
grant execute on function public.record_login_alert(text, text) to authenticated;
