import {
  readOrgStructure,
  writeOrgStructure,
  type OrgStructure,
} from '@/features/master/org-structure'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase-client'

const ROW_ID = 'org-structure'

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function parsePayload(raw: unknown): Partial<OrgStructure> | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const out: Partial<OrgStructure> = {}
  if (isStringArray(obj.titles)) out.titles = obj.titles
  if (isStringArray(obj.departments)) out.departments = obj.departments
  if (isStringArray(obj.branches)) out.branches = obj.branches
  return out.titles || out.departments || out.branches ? out : null
}

/** Tarik katalog organisasi dari cloud ke localStorage. */
export async function hydrateOrgStructure(): Promise<void> {
  if (!isSupabaseConfigured()) return
  const sb = getSupabase()
  if (!sb) return
  const { data: sessionData } = await sb.auth.getSession()
  if (!sessionData.session?.user.id) return

  const { data, error } = await sb
    .from('app_settings')
    .select('payload')
    .eq('id', ROW_ID)
    .maybeSingle()
  if (error || !data) return

  const parsed = parsePayload(data.payload)
  if (!parsed) return

  const local = readOrgStructure()
  writeOrgStructure({
    titles: [...(parsed.titles ?? local.titles)],
    departments: [...(parsed.departments ?? local.departments)],
    branches: [...(parsed.branches ?? local.branches)],
  })
}

/** Simpan katalog organisasi ke cloud (admin). Local tetap di-update dulu. */
export async function pushOrgStructure(
  next: OrgStructure,
): Promise<string | null> {
  const saved = writeOrgStructure(next)
  if (!isSupabaseConfigured()) return null
  const sb = getSupabase()
  if (!sb) return null

  const { data: sessionData } = await sb.auth.getSession()
  if (!sessionData.session?.user.id) {
    return 'Sesi tidak aktif — perubahan hanya tersimpan di perangkat ini'
  }

  const { error } = await sb.from('app_settings').upsert({
    id: ROW_ID,
    payload: {
      titles: saved.titles,
      departments: saved.departments,
      branches: saved.branches,
    },
    updated_at: new Date().toISOString(),
  })
  if (error) {
    return error.message || 'Gagal menyimpan ke cloud'
  }
  return null
}
