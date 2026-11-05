# E-Gabah

ERP web untuk usaha penggilingan padi. Satu portal membuka E-Gabah, E-Absensi, dan E-HR. Yang terlihat di setiap modul mengikuti peran akun.

## Modul

- **Operasi:** pembelian gabah, penerimaan, produksi, stok, penjualan
- **Keuangan:** kas, utang, piutang, jurnal, pajak, periode
- **SDM:** absensi dengan lokasi, cuti, persetujuan, dan persiapan gaji

Data operasional, absensi, cuti, dan pengaturan organisasi tersimpan di Supabase.

## Menjalankan

```bash
npm install
npm run dev
```

Salin `.env.example` menjadi `.env.local`, lalu isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`.

```bash
npm run build
npm run smoketest-no-compile
```
