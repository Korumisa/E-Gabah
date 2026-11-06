-- Align period SELECT with nav: unlock flow needs ops roles to see locks/requests.
-- Writes remain keuangan|admin via auth_can_write_module('period').

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
        or (
          p_key = 'period'
          and p.role in (
            'keuangan',
            'pembelian',
            'penjualan',
            'produksi',
            'gudang'
          )
        )
        or (p_key in ('keuangan', 'bank', 'tax', 'gl') and p.role = 'keuangan')
        or (p_key = 'payroll' and p.role in ('keuangan', 'hr'))
        or (p_key = 'audit' and p.role in ('keuangan', 'hr'))
      )
  );
$$;
