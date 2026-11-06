-- Link finished batches to purchase lots + seed LotCost (cost/kg > 0)
-- so Penjualan → Pengiriman "Lot costing (COGS)" dropdown is usable.

update public.production_batches
set
  input_lot_id = 'LOT-202610-010',
  note = case
    when note ilike '%LOT-202610-010%' then note
    else trim(both from coalesce(note, '') || ' · LOT-202610-010')
  end,
  updated_at = now()
where id = 'BAT-202610-001';

update public.production_batches
set
  input_lot_id = 'LOT-202610-009',
  note = case
    when note ilike '%LOT-202610-009%' then note
    else trim(both from coalesce(note, '') || ' · LOT-202610-009')
  end,
  updated_at = now()
where id = 'BAT-202610-002';

-- BAT-001: gabah 5000 kg × ~6500 + ops → cost/kg beras ≈ 10.462
insert into public.lot_costs (
  id, lot_id, batch_id, grain_value, allocated_ops, beras_qty,
  cost_per_kg_beras, method, at
)
values (
  'LOT-202610-010',
  'LOT-202610-010',
  'BAT-202610-001',
  32500000,
  1500000,
  3250,
  round((32500000 + 1500000)::numeric / 3250, 2),
  'proportional',
  now()::text
)
on conflict (id) do update set
  lot_id = excluded.lot_id,
  batch_id = excluded.batch_id,
  grain_value = excluded.grain_value,
  allocated_ops = excluded.allocated_ops,
  beras_qty = excluded.beras_qty,
  cost_per_kg_beras = excluded.cost_per_kg_beras,
  method = excluded.method,
  at = excluded.at,
  updated_at = now();

-- BAT-002: premium small output — still cost/kg > 0 for dropdown
insert into public.lot_costs (
  id, lot_id, batch_id, grain_value, allocated_ops, beras_qty,
  cost_per_kg_beras, method, at
)
values (
  'LOT-202610-009',
  'LOT-202610-009',
  'BAT-202610-002',
  24000000,
  800000,
  1850,
  round((24000000 + 800000)::numeric / 1850, 2),
  'manual',
  now()::text
)
on conflict (id) do update set
  lot_id = excluded.lot_id,
  batch_id = excluded.batch_id,
  grain_value = excluded.grain_value,
  allocated_ops = excluded.allocated_ops,
  beras_qty = excluded.beras_qty,
  cost_per_kg_beras = excluded.cost_per_kg_beras,
  method = excluded.method,
  at = excluded.at,
  updated_at = now();
