import { ROLE_LABELS, type UserRole } from '@/types/auth'

const STORAGE_KEY = 'egabah.org-structure.v1'
const EVENT = 'egabah-org-structure'

export type OrgStructure = {
  titles: string[]
  departments: string[]
  branches: string[]
}

const DEFAULTS: OrgStructure = {
  titles: Object.values(ROLE_LABELS),
  departments: Object.values(ROLE_LABELS),
  branches: ['Mill Klaten', 'Kantor Pusat'],
}

function uniqSorted(items: string[]): string[] {
  const set = new Set<string>()
  for (const raw of items) {
    const text = raw.trim()
    if (text) set.add(text)
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'id'))
}

function normalize(raw: Partial<OrgStructure> | null): OrgStructure {
  return {
    titles: uniqSorted([...(raw?.titles ?? []), ...DEFAULTS.titles]),
    departments: uniqSorted([
      ...(raw?.departments ?? []),
      ...DEFAULTS.departments,
    ]),
    branches: uniqSorted([...(raw?.branches ?? []), ...DEFAULTS.branches]),
  }
}

export function readOrgStructure(): OrgStructure {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS, titles: [...DEFAULTS.titles], departments: [...DEFAULTS.departments], branches: [...DEFAULTS.branches] }
    return normalize(JSON.parse(raw) as Partial<OrgStructure>)
  } catch {
    return {
      titles: [...DEFAULTS.titles],
      departments: [...DEFAULTS.departments],
      branches: [...DEFAULTS.branches],
    }
  }
}

export function writeOrgStructure(next: OrgStructure): OrgStructure {
  const normalized = {
    titles: uniqSorted(next.titles),
    departments: uniqSorted(next.departments),
    branches: uniqSorted(next.branches),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  window.dispatchEvent(new Event(EVENT))
  return normalized
}

export function subscribeOrgStructure(onChange: () => void): () => void {
  const handler = () => onChange()
  window.addEventListener(EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}

export function systemRoles(): { value: UserRole; label: string }[] {
  return (Object.keys(ROLE_LABELS) as UserRole[]).map((value) => ({
    value,
    label: ROLE_LABELS[value],
  }))
}

export type OrgListKind = 'titles' | 'departments' | 'branches'

export const ORG_LIST_META: Record<
  OrgListKind,
  { label: string; hint: string }
> = {
  titles: {
    label: 'Jabatan',
    hint: 'Dipakai saat membuat / mengedit akun pengguna',
  },
  departments: {
    label: 'Departemen',
    hint: 'Pengelompokan organisasi di kartu pegawai',
  },
  branches: {
    label: 'Cabang / lokasi',
    hint: 'Lokasi kerja mill atau kantor',
  },
}
