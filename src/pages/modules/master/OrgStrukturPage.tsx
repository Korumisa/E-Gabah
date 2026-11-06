import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FinanceFilterBar } from '@/components/keuangan/FinanceFilterBar'
import { FinancePager } from '@/components/keuangan/FinancePager'
import {
  FinanceEmptyRow,
  FinanceListCard,
  FinanceListEmpty,
  FinanceTable,
  FinanceTd,
  FinanceTh,
  FinanceThead,
  FinanceTr,
  rowNumber,
} from '@/components/keuangan/FinanceTable'
import { FinanceToast } from '@/components/keuangan/FinanceToast'
import { OpsSelect } from '@/components/ops/OpsChrome'
import { PageSection } from '@/components/ui/PageSection'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { TextField } from '@/components/ui/TextField'
import { sanitizeText } from '@/features/master/input-safety'
import {
  hydrateOrgStructure,
  pushOrgStructure,
} from '@/features/master/org-structure-cloud'
import {
  ORG_LIST_META,
  readOrgStructure,
  subscribeOrgStructure,
  systemRoles,
  type OrgListKind,
  type OrgStructure,
} from '@/features/master/org-structure'
import { usePageSize } from '@/features/settings/usePageSize'

type OrgRow = { kind: OrgListKind; value: string }
type KindFilter = 'all' | OrgListKind
type PendingDelete = OrgRow | null

const KIND_FILTER_OPTIONS: { value: KindFilter; label: string }[] = [
  { value: 'all', label: 'Semua jenis' },
  ...(Object.keys(ORG_LIST_META) as OrgListKind[]).map((kind) => ({
    value: kind,
    label: ORG_LIST_META[kind].label,
  })),
]

const ADD_KIND_OPTIONS = (Object.keys(ORG_LIST_META) as OrgListKind[]).map(
  (kind) => ({
    value: kind,
    label: ORG_LIST_META[kind].label,
  }),
)

function flattenOrg(data: OrgStructure): OrgRow[] {
  return (Object.keys(ORG_LIST_META) as OrgListKind[]).flatMap((kind) =>
    data[kind].map((value) => ({ kind, value })),
  )
}

export function OrgStrukturPage() {
  const PAGE_SIZE = usePageSize()
  const [data, setData] = useState<OrgStructure>(() => readOrgStructure())
  const [search, setSearch] = useState('')
  const [kindFilter, setKindFilter] = useState<KindFilter>('all')
  const [page, setPage] = useState(1)
  const [addKind, setAddKind] = useState<OrgListKind>('titles')
  const [draft, setDraft] = useState('')
  const [formError, setFormError] = useState<string | undefined>()
  const [toast, setToast] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null)

  useEffect(() => subscribeOrgStructure(() => setData(readOrgStructure())), [])

  useEffect(() => {
    void hydrateOrgStructure()
      .then(() => setData(readOrgStructure()))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2800)
    return () => window.clearTimeout(t)
  }, [toast])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return flattenOrg(data)
      .filter((row) => (kindFilter === 'all' ? true : row.kind === kindFilter))
      .filter((row) => {
        if (!q) return true
        return (
          row.value.toLowerCase().includes(q) ||
          ORG_LIST_META[row.kind].label.toLowerCase().includes(q)
        )
      })
      .toSorted((a, b) => {
        const byKind = a.kind.localeCompare(b.kind)
        if (byKind !== 0) return byKind
        return a.value.localeCompare(b.value, 'id')
      })
  }, [data, search, kindFilter])

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  async function persist(next: OrgStructure, message: string) {
    setData(next)
    const err = await pushOrgStructure(next)
    setData(readOrgStructure())
    setToast(err ?? message)
  }

  function addItem() {
    const value = sanitizeText(draft, 80).trim()
    if (!value) {
      setFormError('Nama wajib diisi')
      return
    }
    if (data[addKind].some((x) => x.toLowerCase() === value.toLowerCase())) {
      setFormError('Sudah ada di daftar jenis ini')
      return
    }
    setFormError(undefined)
    setDraft('')
    void persist(
      { ...data, [addKind]: [...data[addKind], value] },
      `${ORG_LIST_META[addKind].label} ditambahkan`,
    )
  }

  function removeItem(kind: OrgListKind, value: string) {
    void persist(
      { ...data, [kind]: data[kind].filter((x) => x !== value) },
      `${ORG_LIST_META[kind].label} dihapus`,
    )
  }

  const roles = systemRoles()

  return (
    <div className="space-y-2.5">
      <FinanceToast message={toast} />

      <section className="rounded-2xl border border-line bg-panel p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-[14px] font-semibold text-ink">
              Organisasi & lokasi
            </h2>
            <p className="mt-0.5 text-[12px] text-muted">
              Satu daftar jabatan, departemen, dan cabang. Filter atau cari
              jenisnya; form pengguna memilih dari sini.
            </p>
          </div>
          <Link
            to="/app/master-data/pengguna"
            className="inline-flex h-9 items-center rounded-xl border border-line px-3 text-[12px] font-medium text-ink transition hover:bg-brand-50"
          >
            Ke Pengguna & Peran
          </Link>
        </div>

        <div className="rounded-2xl border border-line bg-surface px-3.5 py-3">
          <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">
            Peran sistem
          </p>
          <p className="mt-1 text-[12px] text-muted">
            Peran login bersifat tetap (RBAC). Tidak ditambah dari sini.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {roles.map((r) => (
              <li
                key={r.value}
                className="rounded-xl border border-line bg-panel px-2.5 py-1.5 text-[12px] font-medium text-ink"
              >
                {r.label}
                <span className="ml-1.5 text-[11px] font-normal text-muted">
                  {r.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <PageSection
        title="Katalog organisasi"
        subtitle="Cari nama atau filter jabatan / departemen / cabang."
      >
        <FinanceFilterBar
          search={search}
          onSearchChange={(value) => {
            setSearch(value)
            setPage(1)
          }}
          searchPlaceholder="Cari nama atau jenis…"
          filter={kindFilter}
          filterOptions={KIND_FILTER_OPTIONS}
          onFilterChange={(value) => {
            setKindFilter(value)
            setPage(1)
          }}
          filterLabel="Jenis"
        />

        <form
          className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault()
            addItem()
          }}
        >
          <div className="w-full sm:w-44">
            <OpsSelect
              label="Jenis"
              value={addKind}
              options={ADD_KIND_OPTIONS}
              onChange={setAddKind}
            />
          </div>
          <div className="min-w-0 flex-1">
            <TextField
              id="org-add-name"
              label="Nama baru"
              value={draft}
              placeholder="Contoh: Kepala Gudang…"
              maxLength={80}
              error={formError}
              onChange={(e) => {
                setDraft(sanitizeText(e.target.value, 80))
                if (formError) setFormError(undefined)
              }}
            />
          </div>
          <button
            type="submit"
            className="h-10 shrink-0 rounded-xl bg-brand-800 px-4 text-[12px] font-semibold text-white transition hover:bg-brand-900 sm:mb-0"
          >
            Tambah
          </button>
        </form>

        <FinanceTable
          mobileCards={
            pageRows.length === 0 ? (
              <FinanceListEmpty message="Tidak ada data yang cocok." />
            ) : (
              pageRows.map((row) => (
                <FinanceListCard
                  key={`${row.kind}:${row.value}`}
                  title={row.value}
                  badges={
                    <span className="rounded-lg bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-800">
                      {ORG_LIST_META[row.kind].label}
                    </span>
                  }
                  action={
                    <button
                      type="button"
                      onClick={() => setPendingDelete(row)}
                      className="rounded-lg px-2 py-1 text-[11px] font-medium text-red-700 transition hover:bg-red-50"
                    >
                      Hapus
                    </button>
                  }
                />
              ))
            )
          }
        >
          <FinanceThead>
            <FinanceTh className="w-12">No</FinanceTh>
            <FinanceTh>Nama</FinanceTh>
            <FinanceTh className="w-40">Jenis</FinanceTh>
            <FinanceTh className="w-24 text-right">Aksi</FinanceTh>
          </FinanceThead>
          <tbody>
            {pageRows.length === 0 ? (
              <FinanceEmptyRow colSpan={4} message="Tidak ada data yang cocok." />
            ) : (
              pageRows.map((row, index) => (
                <FinanceTr key={`${row.kind}:${row.value}`}>
                  <FinanceTd mono muted>
                    {rowNumber(safePage, PAGE_SIZE, index)}
                  </FinanceTd>
                  <FinanceTd>{row.value}</FinanceTd>
                  <FinanceTd>
                    <span className="inline-flex rounded-lg bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-800">
                      {ORG_LIST_META[row.kind].label}
                    </span>
                  </FinanceTd>
                  <FinanceTd className="text-right">
                    <button
                      type="button"
                      onClick={() => setPendingDelete(row)}
                      className="rounded-lg px-2 py-1 text-[11px] font-medium text-red-700 transition hover:bg-red-50"
                    >
                      Hapus
                    </button>
                  </FinanceTd>
                </FinanceTr>
              ))
            )}
          </tbody>
        </FinanceTable>

        <FinancePager
          page={safePage}
          pageCount={pageCount}
          total={rows.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </PageSection>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Hapus dari daftar?"
        description={
          pendingDelete
            ? `"${pendingDelete.value}" (${ORG_LIST_META[pendingDelete.kind].label}) tidak lagi muncul di pilihan form pengguna. Akun yang sudah memakai nilai ini tidak diubah otomatis.`
            : undefined
        }
        confirmLabel="Ya, hapus"
        danger
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return
          removeItem(pendingDelete.kind, pendingDelete.value)
          setPendingDelete(null)
        }}
      />
    </div>
  )
}
