-- 20261105_15: period unlock required_roles must be non-empty + allowlisted;
-- do not store app role in auth.users.raw_user_meta_data (user-editable).

-- ========== 1. Unlock request INSERT: require ≥1 allowlisted ops role ==========
create or replace function public.enforce_period_unlock_request_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_roles jsonb := coalesce(new.required_roles, '[]'::jsonb);
  v_role text;
  v_allowed text[] := array[
    'pembelian',
    'produksi',
    'gudang',
    'penjualan',
    'keuangan',
    'hr'
  ];
  v_seen text[] := array[]::text[];
  v_clean jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(v_roles) is distinct from 'array' then
    raise exception 'required_roles must be a JSON array';
  end if;

  for v_role in select jsonb_array_elements_text(v_roles)
  loop
    if v_role = any (v_allowed) and not (v_role = any (v_seen)) then
      v_seen := v_seen || v_role;
      v_clean := v_clean || jsonb_build_array(v_role);
    end if;
  end loop;

  if jsonb_array_length(v_clean) = 0 then
    raise exception
      'required_roles must include at least one of: pembelian, produksi, gudang, penjualan, keuangan, hr';
  end if;

  new.required_roles := v_clean;
  new.status := 'pending';
  new.approvals := '[]'::jsonb;
  new.admin_approval := null;
  new.rejected_by := null;
  new.reject_reason := null;
  return new;
end;
$$;

-- ========== 2. Admin unlock: refuse empty required_roles (defense in depth) ==========
create or replace function public.approve_period_unlock_admin(
  p_request_id text,
  p_by text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_req public.period_unlock_requests%rowtype;
  v_required jsonb;
  v_approvals jsonb;
  v_stamp jsonb;
  v_history jsonb;
  r text;
  found_role boolean;
begin
  select p.role::text into v_role
  from public.profiles p
  where p.id = auth.uid() and p.active = true;

  if v_role is distinct from 'admin' then
    raise exception 'admin only';
  end if;

  select * into v_req
  from public.period_unlock_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'request not found';
  end if;
  if v_req.status <> 'pending' then
    raise exception 'request not pending';
  end if;

  v_required := coalesce(v_req.required_roles, '[]'::jsonb);
  if jsonb_typeof(v_required) is distinct from 'array'
     or jsonb_array_length(v_required) = 0 then
    raise exception 'required_roles must be non-empty before admin unlock';
  end if;

  v_approvals := coalesce(v_req.approvals, '[]'::jsonb);

  for r in select jsonb_array_elements_text(v_required)
  loop
    found_role := false;
    if exists (
      select 1
      from jsonb_array_elements(v_approvals) elem
      where elem->>'role' = r
    ) then
      found_role := true;
    end if;
    if not found_role then
      raise exception 'missing role approval: %', r;
    end if;
  end loop;

  v_stamp := jsonb_build_object(
    'role', 'admin',
    'by', coalesce(nullif(trim(p_by), ''), 'admin'),
    'at', to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );

  update public.period_unlock_requests
  set status = 'approved',
      admin_approval = v_stamp,
      updated_at = now()
  where id = p_request_id;

  select coalesce(unlock_history, '[]'::jsonb) into v_history
  from public.period_locks
  where id = v_req.period_lock_id
  for update;

  v_history := coalesce(v_history, '[]'::jsonb) || jsonb_build_array(
    jsonb_build_object(
      'at', v_stamp->>'at',
      'by', v_stamp->>'by',
      'reason', v_req.reason,
      'requestId', v_req.id
    )
  );

  perform set_config('app.allow_period_unlock', 'on', true);

  update public.period_locks
  set active = false,
      pending_unlock_request_id = null,
      unlock_history = v_history,
      updated_at = now()
  where id = v_req.period_lock_id;
end;
$$;

revoke all on function public.approve_period_unlock_admin(text, text) from public;
grant execute on function public.approve_period_unlock_admin(text, text) to authenticated;

-- ========== 3. Create user: role lives in profiles only ==========
create or replace function public.admin_create_branch_user(
  p_email text,
  p_password text,
  p_name text,
  p_role public.user_role,
  p_title text,
  p_phone text,
  p_branch text,
  p_department text
) returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  uid uuid := gen_random_uuid();
  clean_email text := lower(trim(p_email));
begin
  if not public.auth_is_admin() then
    raise exception 'Hanya admin yang dapat membuat akun';
  end if;
  if clean_email = '' or position('@' in clean_email) = 0 then
    raise exception 'Email tidak valid';
  end if;
  if length(trim(p_password)) < 8 then
    raise exception 'Kata sandi minimal 8 karakter';
  end if;
  if length(trim(p_name)) = 0 then
    raise exception 'Nama wajib diisi';
  end if;
  if length(trim(p_branch)) = 0 then
    raise exception 'Cabang wajib diisi';
  end if;
  if exists (select 1 from auth.users where lower(email) = clean_email) then
    raise exception 'Email sudah terpakai';
  end if;

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    is_super_admin,
    is_sso_user,
    is_anonymous
  ) values (
    '00000000-0000-0000-0000-000000000000',
    uid,
    'authenticated',
    'authenticated',
    clean_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', trim(p_name)),
    now(),
    now(),
    '',
    '',
    '',
    '',
    false,
    false,
    false
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    gen_random_uuid(),
    uid,
    jsonb_build_object(
      'sub', uid::text,
      'email', clean_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    uid::text,
    now(),
    now(),
    now()
  );

  insert into public.profiles (
    id, email, name, role, title, phone, branch, department, active
  ) values (
    uid,
    clean_email,
    trim(p_name),
    p_role,
    coalesce(nullif(trim(p_title), ''), p_role::text),
    coalesce(trim(p_phone), ''),
    trim(p_branch),
    coalesce(nullif(trim(p_department), ''), p_role::text),
    true
  );

  return uid;
end;
$$;

revoke all on function public.admin_create_branch_user(
  text, text, text, public.user_role, text, text, text, text
) from public;
grant execute on function public.admin_create_branch_user(
  text, text, text, public.user_role, text, text, text, text
) to authenticated;

-- Scrub legacy role claims from user_metadata (authorization stays on profiles.role).
update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) - 'role',
    updated_at = now()
where raw_user_meta_data ? 'role';
