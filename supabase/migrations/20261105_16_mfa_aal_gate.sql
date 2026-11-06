-- 20261105_16: opt-in MFA — users with verified factors must present aal2 JWT.

create or replace function public.auth_mfa_satisfied()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    case
      when auth.uid() is null then false
      when not exists (
        select 1
        from auth.mfa_factors f
        where f.user_id = auth.uid()
          and f.status = 'verified'
      ) then true
      else coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
    end;
$$;

revoke all on function public.auth_mfa_satisfied() from public;
grant execute on function public.auth_mfa_satisfied() to authenticated;

-- Restrictive gate on every RLS-enabled public table (AND with existing policies).
do $$
declare
  r record;
begin
  for r in
    select c.relname as tbl
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relrowsecurity
  loop
    execute format(
      'drop policy if exists mfa_aal_gate on public.%I',
      r.tbl
    );
    execute format(
      $pol$
      create policy mfa_aal_gate on public.%I
        as restrictive
        for all
        to authenticated
        using (public.auth_mfa_satisfied())
        with check (public.auth_mfa_satisfied())
      $pol$,
      r.tbl
    );
  end loop;
end $$;
