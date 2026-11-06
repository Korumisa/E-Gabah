-- Org structure catalogs (jabatan / departemen / cabang) in app_settings.
-- Same access model as id = 'org': all authenticated can read; admin writes.

drop policy if exists app_settings_select on public.app_settings;
create policy app_settings_select on public.app_settings
  for select to authenticated
  using (
    id in ('org', 'org-structure')
    or id = 'user:' || auth.uid()::text
    or public.auth_is_admin()
  );

drop policy if exists app_settings_write on public.app_settings;
create policy app_settings_write on public.app_settings
  for all to authenticated
  using (
    (id in ('org', 'org-structure') and public.auth_is_admin())
    or id = 'user:' || auth.uid()::text
    or (public.auth_is_admin() and id like 'user:%')
  )
  with check (
    (id in ('org', 'org-structure') and public.auth_is_admin())
    or id = 'user:' || auth.uid()::text
    or (public.auth_is_admin() and id like 'user:%')
  );
