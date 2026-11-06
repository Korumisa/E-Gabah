-- Idempotent dummy seed for live production demo.
-- Safe to re-run: uses fixed ids + on conflict upserts.

-- ========== STOCK: clear sku/location collisions then upsert demo balances ==========
delete from public.stock_balances
where (sku, location) in (
  ('GBH-IR64', 'Silo 1'),
  ('GBH-CIHERANG', 'Gudang A'),
  ('BRS-PREM', 'Gudang A'),
  ('BRS-MED', 'Gudang B'),
  ('MNR-01', 'Gudang B'),
  ('DDK-01', 'Lantai Produksi'),
  ('SKM-01', 'Lantai Produksi'),
  ('BRS-PREM', 'Gudang B'),
  ('DDK-01', 'Gudang A'),
  ('MNR-01', 'Gudang A'),
  ('SKM-01', 'Gudang A')
);

insert into public.stock_balances (id, sku, name, category, location, unit, qty, min_qty, updated_at_label)
values
  ('s1', 'GBH-IR64', 'Gabah IR64', 'gabah', 'Silo 1', 'kg', 12480, 5000, '6 Nov 2026'),
  ('s2', 'GBH-CIHERANG', 'Gabah Ciherang', 'gabah', 'Gudang A', 'kg', 4200, 4500, '6 Nov 2026'),
  ('s3', 'BRS-PREM', 'Beras Premium 25kg', 'beras', 'Gudang A', 'sak', 860, 200, '6 Nov 2026'),
  ('s4', 'BRS-MED', 'Beras Medium', 'beras', 'Gudang B', 'kg', 3150, 2000, '6 Nov 2026'),
  ('s5', 'MNR-01', 'Menir', 'sampingan', 'Gudang B', 'kg', 780, 500, '6 Nov 2026'),
  ('s6', 'DDK-01', 'Dedak', 'sampingan', 'Lantai Produksi', 'kg', 420, 600, '6 Nov 2026'),
  ('s7', 'SKM-01', 'Sekam', 'sampingan', 'Lantai Produksi', 'kg', 1050, 400, '6 Nov 2026'),
  ('s8', 'BRS-PREM', 'Beras Premium 25kg', 'beras', 'Gudang B', 'sak', 120, 150, '6 Nov 2026')
on conflict (id) do update set
  sku = excluded.sku,
  name = excluded.name,
  category = excluded.category,
  location = excluded.location,
  unit = excluded.unit,
  qty = excluded.qty,
  min_qty = excluded.min_qty,
  updated_at_label = excluded.updated_at_label,
  updated_at = now();

insert into public.stock_movements (
  id, date_label, reference, type, sku, product_name,
  from_location, to_location, qty, unit, note, actor, receipt_name
)
values
  ('m1', '6 Nov 2026', 'MUT-2210', 'in', 'GBH-IR64', 'Gabah IR64', '—', 'Silo 1', 2500, 'kg', 'Penerimaan RCV-0241', 'Budi Gudang', ''),
  ('m2', '6 Nov 2026', 'MUT-2209', 'out', 'GBH-IR64', 'Gabah IR64', 'Silo 1', '—', 1800, 'kg', 'Ke batch BAT-0190', 'Andi Ops', ''),
  ('m3', '5 Nov 2026', 'MUT-2204', 'transfer', 'BRS-PREM', 'Beras Premium 25kg', 'Gudang A', 'Gudang B', 40, 'sak', 'Siapkan order DO-0881', 'Budi Gudang', ''),
  ('m4', '4 Nov 2026', 'MUT-2198', 'out', 'BRS-MED', 'Beras Medium', 'Gudang B', '—', 500, 'kg', 'Pengiriman DO-0876', 'Rina Sales', ''),
  ('m5', '3 Nov 2026', 'MUT-2191', 'in', 'MNR-01', 'Menir', '—', 'Gudang B', 180, 'kg', 'Output produksi BAT-0188', 'Andi Ops', '')
on conflict (id) do update set
  date_label = excluded.date_label,
  reference = excluded.reference,
  type = excluded.type,
  sku = excluded.sku,
  product_name = excluded.product_name,
  from_location = excluded.from_location,
  to_location = excluded.to_location,
  qty = excluded.qty,
  unit = excluded.unit,
  note = excluded.note,
  actor = excluded.actor,
  receipt_name = excluded.receipt_name,
  updated_at = now();

insert into public.stock_corrections (
  id, date_label, reference, sku, product_name, location,
  before_qty, after_qty, unit, reason, status, actor, receipt_name
)
values
  ('k1', '5 Nov 2026', 'ADJ-0077', 'DDK-01', 'Dedak', 'Lantai Produksi', 480, 420, 'kg', 'Susut timbang ulang', 'posted', 'Budi Gudang', ''),
  ('k2', '2 Nov 2026', 'ADJ-0072', 'GBH-CIHERANG', 'Gabah Ciherang', 'Gudang A', 4050, 4200, 'kg', 'Selisih penerimaan tertunda', 'posted', 'Admin', ''),
  ('k3', '30 Okt 2026', 'ADJ-0068', 'SKM-01', 'Sekam', 'Lantai Produksi', 1100, 1050, 'kg', 'Koreksi salah input (dibatalkan)', 'void', 'Admin', '')
on conflict (id) do update set
  date_label = excluded.date_label,
  reference = excluded.reference,
  sku = excluded.sku,
  product_name = excluded.product_name,
  location = excluded.location,
  before_qty = excluded.before_qty,
  after_qty = excluded.after_qty,
  unit = excluded.unit,
  reason = excluded.reason,
  status = excluded.status,
  actor = excluded.actor,
  receipt_name = excluded.receipt_name,
  updated_at = now();

-- ========== ORG STRUCTURE (app_settings) ==========
insert into public.app_settings (id, payload, updated_at)
values (
  'org-structure',
  jsonb_build_object(
    'titles', jsonb_build_array(
      'Pemilik / Admin',
      'Petugas Pembelian',
      'Operator Produksi',
      'Petugas Gudang',
      'Petugas Penjualan',
      'Petugas Keuangan',
      'Human Resources',
      'Supervisor Mill',
      'Kepala Gudang'
    ),
    'departments', jsonb_build_array(
      'Pemilik / Admin',
      'Petugas Pembelian',
      'Operator Produksi',
      'Petugas Gudang',
      'Petugas Penjualan',
      'Petugas Keuangan',
      'Human Resources',
      'Operasional Mill',
      'Administrasi'
    ),
    'branches', jsonb_build_array(
      'Mill Klaten',
      'Kantor Pusat',
      'Gudang Karanganyar'
    )
  ),
  now()
)
on conflict (id) do update set
  payload = excluded.payload,
  updated_at = now();

-- ========== ATTENDANCE (last 5 workdays × active profiles) ==========
insert into public.attendance_records (
  id, user_id, user_name, work_date, check_in, check_out, status, note
)
select
  'att-' || p.id::text || '-' || to_char(d.work_date, 'YYYYMMDD'),
  p.id,
  coalesce(nullif(p.name, ''), split_part(p.email, '@', 1)),
  d.work_date,
  (d.work_date + time '07:55') at time zone 'Asia/Jakarta',
  (d.work_date + time '16:35') at time zone 'Asia/Jakarta',
  case
    when extract(dow from d.work_date) = 1 and p.role::text = 'produksi' then 'terlambat'::public.attendance_status
    when extract(dow from d.work_date) = 3 and p.role::text = 'gudang' then 'izin'::public.attendance_status
    else 'hadir'::public.attendance_status
  end,
  case
    when extract(dow from d.work_date) = 1 and p.role::text = 'produksi' then 'Datang 08:20 — macet'
    when extract(dow from d.work_date) = 3 and p.role::text = 'gudang' then 'Izin urusan keluarga'
    else ''
  end
from public.profiles p
cross join (
  select (current_date - offs)::date as work_date
  from generate_series(0, 6) as offs
  where extract(dow from current_date - offs) between 1 and 5
) d
where p.active = true
on conflict (id) do update set
  user_name = excluded.user_name,
  check_in = excluded.check_in,
  check_out = excluded.check_out,
  status = excluded.status,
  note = excluded.note,
  updated_at = now();

-- ========== LEAVE REQUESTS ==========
insert into public.leave_requests (
  id, user_id, user_name, leave_type, start_date, end_date, days, reason, status,
  reviewed_by, reviewed_at, review_note
)
values
  (
    'leave-demo-01',
    '6d2dd4a5-c1ea-4550-97fe-469f48581429',
    'Gudang',
    'cuti',
    current_date + 7,
    current_date + 8,
    2,
    'Cuti keluarga — demo',
    'pending',
    '',
    null,
    ''
  ),
  (
    'leave-demo-02',
    '2834ae5b-1567-46c3-92a3-24288f34c9b5',
    'Produksi',
    'sakit',
    current_date - 2,
    current_date - 1,
    2,
    'Demam — demo',
    'approved',
    'HR Demo',
    now() - interval '1 day',
    'Disetujui dengan surat dokter'
  ),
  (
    'leave-demo-03',
    '58df32ff-04a9-4f2b-985e-941c18acf6cc',
    'Penjualan',
    'izin',
    current_date + 14,
    current_date + 14,
    1,
    'Urusan dinas luar — demo',
    'pending',
    '',
    null,
    ''
  ),
  (
    'leave-demo-04',
    '91611322-ab8f-4c87-9016-1d5cb488e58f',
    'Pembelian',
    'dinas',
    current_date - 10,
    current_date - 9,
    2,
    'Survey petani Ngawen — demo',
    'approved',
    'Admin',
    now() - interval '8 days',
    'OK'
  ),
  (
    'leave-demo-05',
    'f63b22a3-2875-4138-9b52-72921e57bbcb',
    'Keuangan',
    'cuti',
    current_date - 20,
    current_date - 18,
    3,
    'Cuti tahunan — demo',
    'rejected',
    'HR Demo',
    now() - interval '19 days',
    'Periode tutup buku'
  )
on conflict (id) do update set
  user_name = excluded.user_name,
  leave_type = excluded.leave_type,
  start_date = excluded.start_date,
  end_date = excluded.end_date,
  days = excluded.days,
  reason = excluded.reason,
  status = excluded.status,
  reviewed_by = excluded.reviewed_by,
  reviewed_at = excluded.reviewed_at,
  review_note = excluded.review_note,
  updated_at = now();
