# Backend / persistensi E-Gabah

Ops modul memakai **Supabase relational tables** bila `VITE_SUPABASE_*` diset; tanpa env → localStorage (dev saja). Produksi **wajib** set env Supabase (demo login ditolak di build `PROD`).

## Adapter

| Modul | Mode | File |
| --- | --- | --- |
| Master | Cloud `partners`/`products`/`profiles` atau local | `master-cloud.ts` / `master-storage.ts` |
| Persediaan | Cloud `stock_*` atau local | `persediaan-cloud.ts` / `persediaan-storage.ts` |
| Absensi | Cloud `attendance_records` atau local | `absensi-cloud.ts` / `absensi-storage.ts` |
| Cuti / leave | Cloud `leave_requests` atau local | `leave-cloud.ts` / `leave-storage.ts` |
| Ops (PO/SO/batch/kas/GL/tax/bank/period/payroll/audit) | Relational via `createRelationalBackedRepository` | `src/lib/cloud-relational.ts`, `ops-relational/mappers/*` |
| Settings / theme | Local + optional `app_settings` cloud | `app-settings.ts` / `settings-cloud.ts` |
| Organisasi (jabatan/dept/cabang) | Local + `app_settings` id `org-structure` | `org-structure.ts` / `org-structure-cloud.ts` |

Hydrate gate: `OpsCloudGate` (fail-closed di modul; `/portal*` tidak diblokir saat hydrate berjalan). Route page di-lazy; Leaflet absensi di-chunk terpisah.

## Role ↔ write matrix (setelah `20261105_14` / `15`)

| Role | Write cloud (ringkas) |
| --- | --- |
| `admin` | Semua module + master profiles |
| `pembelian` | Module `pembelian` (purchases/payments/returns) + `lot_qc` |
| `gudang` | Stock + **`lot_qc` saja** (bukan full pembelian) |
| `penjualan` | Module `penjualan` (orders/payments/returns) |
| `keuangan` | Keuangan/period/bank/tax/gl + pembelian + **`sale_returns` saja** (bukan full penjualan) + payroll |
| `produksi` | Module produksi |
| `hr` | Leave approve, absensi auditor, payroll |

**Keamanan sesi:** ganti kata sandi lewat Supabase Auth. **MFA TOTP opt-in** (Settings → Keamanan): enroll authenticator → challenge di login; RLS `mfa_aal_gate` mewajibkan JWT `aal2` bila faktor verified. **SELECT** sensitif lewat `auth_can_read_module` / `auth_can_read_stock` (payroll hanya admin|hr|keuangan). **Sesi perangkat** nyata via `list_my_auth_sessions` / revoke; admin `admin_revoke_user_sessions`. **Login alert:** `record_login_alert` + Edge Function `login-alert` (butuh `RESEND_API_KEY`). Backup restore hanya key allowlist export (`KEYS`), bukan semua `egabah.*`.

## Migrasi (urutan lexical)

1. `20261030_01_master_rbac.sql`
2. `20261030_02_ops_snapshots.sql` — `auth_can_write_module`
3. `20261030_03_persediaan.sql`
4. `20261030_04_ops_docs.sql` + `05_ops_docs_finance.sql` (staging copy)
5. `20261030_06_ops_relational.sql`
6. `20261105_07_period_unlock_role_rls.sql` — RPC unlock + trigger block `active→false`; no client UPDATE on unlock requests
7. `20261105_08_absensi.sql` — `attendance_records` + RLS
8. `20261105_09_absensi_auditor_rls.sql` — auditor absensi (diganti di 10)
9. `20261105_10_hr_leave_payroll.sql` — role `hr`, `leave_requests`, auditor admin|hr, payroll write hr
10. `20261105_11_leave_proof_override.sql` — bukti lampiran + override admin pada leave
11. `20261105_12_attendance_geo.sql` — lat/lng check-in & check-out
12. `20261105_13_app_settings_create_user.sql` — `app_settings` + `admin_create_branch_user`
13. `20261105_14_security_hardening.sql` — ketatkan module matrix, period DELETE/date gate, payroll transition trigger
14. `20261105_15_unlock_roles_metadata.sql` — `required_roles` non-empty + allowlist; hapus `role` dari `user_metadata`
15. `20261105_16_mfa_aal_gate.sql` — `auth_mfa_satisfied()` + restrictive RLS opt-in MFA
16. `20261105_17_select_sessions_login_alert.sql` — SELECT per role, session RPC, `login_alerts`
17. `20261105_18_period_read_nav_align.sql` — baca `period` selaras nav unlock (ops roles)
18. `20261106_19_org_structure_settings.sql` — RLS `app_settings` id `org-structure` (katalog jabatan/dept/cabang)
19. `supabase/manual/20261105_99_ops_relational_drop_legacy.sql` — **manual setelah smoke**; drop `ops_docs` + `app_module_snapshots`

## Deploy checklist (Vercel)

### Env wajib di Vercel (Production + Preview)

Tambahkan di **Project → Settings → Environment Variables** (centang Production & Preview):

| Key | Wajib | Contoh / sumber |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | **Ya** | `https://xxxx.supabase.co` (Supabase → Settings → API → Project URL) |
| `VITE_SUPABASE_ANON_KEY` | **Ya** | anon `public` key (Settings → API) |
| `VITE_CLOUDINARY_CLOUD_NAME` | **Ya** (upload bukti) | Cloudinary dashboard → Cloud name |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | **Ya** (upload bukti) | Unsigned upload preset |
| `VITE_CLOUDINARY_FOLDER` | Opsional | Default `egabah` |

Setelah mengubah env → **Redeploy** (Vite bake env saat build).

**Jangan** masukkan ke Vercel: `DATABASE_URL`, `CLOUDINARY_API_SECRET`, `service_role` key, `CLOUDINARY_URL` / API key (server-only). Hanya `VITE_*`.

Tanpa `VITE_SUPABASE_*` di production build, login ditolak (demo auth mati).

### Langkah cutover

1. Set env di Vercel (`VITE_SUPABASE_*`, `VITE_CLOUDINARY_*`) → Redeploy (`vercel.json` SPA rewrite sudah ada).
2. Apply migrasi **01→19** ke project Supabase target (`psql -f …` atau SQL editor). Termasuk `20261106_19_org_structure_settings.sql`.
3. Deploy Edge Function login alert:
   - `supabase functions deploy login-alert`
   - `supabase secrets set RESEND_API_KEY=re_…`
   - **Domain email (produksi):** di [Resend](https://resend.com/domains) verifikasi domain (DNS SPF/DKIM), lalu set pengirim:
     `supabase secrets set LOGIN_ALERT_FROM="E-Gabah <noreply@domain-anda.com>"`
   - Default tanpa secret: `E-Gabah <onboarding@resend.dev>` — hanya cocok uji ke alamat akun Resend.
   - Tanpa `RESEND_API_KEY`: alert tetap tercatat di `login_alerts`, email dilewati.
4. Smoke live (atau `npm run smoketest` + `npm run e2e:need-live` dengan `SMOKE_BASE`):
   - Login → **Portal** → E-Gabah / E-Absensi / E-HR (role non-HR tidak lihat E-HR)
   - Master → Organisasi & lokasi: tambah jabatan, reload device lain → opsi muncul
   - Check-in cloud (GPS); ajukan cuti; payroll HR→admin→keuangan→cair
   - Ganti password; MFA opt-in; sesi perangkat revoke
   - Restore backup tidak boleh inject `egabah.auth.*`
   - Gudang tidak bisa upsert `purchases`
5. Deploy frontend (`npm run build` / Vercel).
6. **Baru** jalankan `supabase/manual/20261105_99_ops_relational_drop_legacy.sql` setelah cutover OK.

Seed master: `docs/supabase-seed-master.md` + `supabase/seed/20261030_master_data.sql`.

### CI

GitHub Actions (`.github/workflows/ci.yml`): `npm ci` → `npm run build` → `npm run smoketest-no-compile` pada push/PR.
