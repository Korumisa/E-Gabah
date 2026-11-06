import { getSupabase } from '@/lib/supabase-client'
import { mapSupabaseError } from '@/features/master/master-cloud'
import type { PersediaanSnapshot } from '@/features/persediaan/persediaan-storage'
import {
  correctionFromRow,
  correctionToRow,
  movementFromRow,
  movementToRow,
  stockFromRow,
  stockToRow,
  type StockBalanceRow,
  type StockCorrectionDbRow,
  type StockMovementDbRow,
} from '@/features/persediaan/persediaan-db-map'

export { mapSupabaseError }

export async function loadPersediaanCloud(): Promise<PersediaanSnapshot> {
  const sb = getSupabase()
  if (!sb) throw new Error('Supabase belum dikonfigurasi.')

  const [stocksRes, movementsRes, correctionsRes] = await Promise.all([
    sb.from('stock_balances').select('*'),
    sb.from('stock_movements').select('*'),
    sb.from('stock_corrections').select('*'),
  ])

  if (stocksRes.error) throw stocksRes.error
  if (movementsRes.error) throw movementsRes.error
  if (correctionsRes.error) throw correctionsRes.error

  return {
    version: 1,
    stocks: (stocksRes.data as StockBalanceRow[]).map(stockFromRow),
    movements: (movementsRes.data as StockMovementDbRow[]).map(movementFromRow),
    corrections: (correctionsRes.data as StockCorrectionDbRow[]).map(
      correctionFromRow,
    ),
    updatedAt: new Date().toISOString(),
  }
}

/** Postgres rejects upsert payloads that target the same PK twice. */
export function dedupeById<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const row of rows) {
    const id = String(row.id ?? '').trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push({ ...row, id })
  }
  return out
}

/**
 * stock_balances also has UNIQUE(sku, location). Two different ids for the same
 * pair make upsert fail with 23505 even after PK dedupe.
 */
export function dedupeStocksBySkuLocation<T extends { id: string; sku: string; location: string }>(
  rows: T[],
): T[] {
  const bySkuLoc = new Map<string, T>()
  for (const row of dedupeById(rows)) {
    bySkuLoc.set(`${row.sku}::${row.location}`, row)
  }
  return [...bySkuLoc.values()]
}

function dedupeStockBalances(rows: StockBalanceRow[]): StockBalanceRow[] {
  return dedupeStocksBySkuLocation(rows)
}

async function syncCollection<T extends { id: string }>(
  table: 'stock_balances' | 'stock_movements' | 'stock_corrections',
  rows: T[],
): Promise<void> {
  const sb = getSupabase()
  if (!sb) throw new Error('Supabase belum dikonfigurasi.')

  const unique = dedupeById(rows)

  if (unique.length) {
    const { error } = await sb.from(table).upsert(unique)
    if (error) throw error
  }

  const { data: existing, error: listErr } = await sb.from(table).select('id')
  if (listErr) throw listErr
  const existingIds = (existing ?? []).map((r) => r.id as string)
  if (unique.length === 0 && existingIds.length > 0) {
    throw new Error(
      `Menolak hapus semua baris ${table} — payload kosong sementara remote masih berisi data.`,
    )
  }
  const keep = new Set(unique.map((r) => r.id))
  const drop = existingIds.filter((id) => !keep.has(id))
  if (drop.length) {
    const { error } = await sb.from(table).delete().in('id', drop)
    if (error) throw error
  }
}

export async function savePersediaanCloud(
  snap: PersediaanSnapshot,
): Promise<void> {
  await syncCollection(
    'stock_balances',
    dedupeStockBalances(snap.stocks.map(stockToRow)),
  )
  await syncCollection(
    'stock_movements',
    dedupeById(snap.movements.map(movementToRow)),
  )
  await syncCollection(
    'stock_corrections',
    dedupeById(snap.corrections.map(correctionToRow)),
  )
}
