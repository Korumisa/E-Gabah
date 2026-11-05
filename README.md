# E-Gabah

ERP web untuk usaha penggilingan padi. Setelah masuk, pengguna membuka portal dan memilih aplikasi. Menu di dalam tiap aplikasi mengikuti peran akun.

Demo: [e-gabah.vercel.app](https://e-gabah.vercel.app)

## Aplikasi

| Aplikasi | Isi | Siapa yang melihat |
| --- | --- | --- |
| E-Gabah | Pembelian, persediaan, produksi, penjualan, keuangan, laporan, dan master data | Semua peran operasional |
| E-Absensi | Check-in / check-out dengan lokasi, dan pengajuan cuti | Semua akun |
| E-HR | Persetujuan cuti, rekap kehadiran, karyawan, dan persiapan gaji | Admin dan HR |

Pengaturan akun yang dibuka dari portal tetap di portal. Pengaturan yang dibuka dari dalam E-Gabah memakai shell E-Gabah.

## Peran

`admin`, `pembelian`, `produksi`, `gudang`, `penjualan`, `keuangan`, `hr`.

Admin mengelola pengguna dan cabang di Master Data. Akun login baru dibuat di Supabase Auth. Cabang, jabatan, dan departemen bisa ditambah dari formulir pengguna.

## Modul E-Gabah

- Pembelian: pencatatan, penerimaan, pembayaran, retur, QC lot
- Persediaan: saldo, mutasi, koreksi
- Produksi: batch giling, input–output, rendemen, packing
- Penjualan: order, pengiriman, tagihan, retur
- Keuangan: kas, utang, piutang, biaya, payroll, bagan akun, jurnal, e-Faktur, periode, rekon bank
- Laporan ringkas dan aging
- Master data: pemasok, pelanggan, produk, pengguna, audit log

## Stack

Vite, React, TypeScript, React Router, Tailwind CSS, Supabase, dan Leaflet untuk peta absensi. Bukti unggahan memakai Cloudinary.

## Menjalankan

```bash
npm install
cp .env.example .env.local
npm run dev
```

Isi `.env.local`:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_public_key
```

`VITE_SUPABASE_URL` adalah alamat proyek saja, tanpa `/rest/v1`. Jangan memakai nama `NEXT_PUBLIC_` dan jangan menaruh service role key di variabel `VITE_`.

Skema ada di `supabase/migrations`. Jalankan berurutan pada database Supabase yang kosong.

Tanpa Supabase, `npm run dev` memakai akun demo lokal. Build produksi menolak masuk jika kedua variabel di atas tidak ada saat build.

```bash
npm run build
npm run smoketest-no-compile
```
