import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FinanceToast } from '@/components/keuangan/FinanceToast'
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

type PendingDelete = { kind: OrgListKind; value: string } | null

export function OrgStrukturPage() {
  const [data, setData] = useState<OrgStructure>(() => readOrgStructure())
  const [drafts, setDrafts] = useState<Record<OrgListKind, string>>({
    titles: '',
    departments: '',
    branches: '',
  })
  const [errors, setErrors] = useState<Partial<Record<OrgListKind, string>>>({})
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

  async function persist(next: OrgStructure, message: string) {
    setData(next)
    const err = await pushOrgStructure(next)
    setData(readOrgStructure())
    setToast(err ?? message)
  }

  function addItem(kind: OrgListKind) {
    const value = sanitizeText(drafts[kind], 80).trim()
    if (!value) {
      setErrors((e) => ({ ...e, [kind]: 'Nama wajib diisi' }))
      return
    }
    if (data[kind].some((x) => x.toLowerCase() === value.toLowerCase())) {
      setErrors((e) => ({ ...e, [kind]: 'Sudah ada di daftar' }))
      return
    }
    setErrors((e) => ({ ...e, [kind]: undefined }))
    setDrafts((d) => ({ ...d, [kind]: '' }))
    void persist(
      { ...data, [kind]: [...data[kind], value] },
      `${ORG_LIST_META[kind].label} ditambahkan`,
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
              Kelola opsi jabatan, departemen, dan cabang. Form pengguna hanya
              memilih dari daftar ini.
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

      <div className="grid gap-2.5 lg:grid-cols-3">
        {(Object.keys(ORG_LIST_META) as OrgListKind[]).map((kind) => {
          const meta = ORG_LIST_META[kind]
          return (
            <section
              key={kind}
              className="rounded-2xl border border-line bg-panel p-4 sm:p-5"
            >
              <h3 className="text-[14px] font-semibold text-ink">
                {meta.label}
              </h3>
              <p className="mt-0.5 text-[12px] text-muted">{meta.hint}</p>

              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  addItem(kind)
                }}
              >
                <div className="min-w-0 flex-1">
                  <TextField
                    id={`org-${kind}`}
                    label={`Tambah ${meta.label.toLowerCase()}`}
                    value={drafts[kind]}
                    placeholder="Nama baru…"
                    maxLength={80}
                    error={errors[kind]}
                    onChange={(e) => {
                      setDrafts((d) => ({
                        ...d,
                        [kind]: sanitizeText(e.target.value, 80),
                      }))
                      if (errors[kind]) {
                        setErrors((er) => ({ ...er, [kind]: undefined }))
                      }
                    }}
                  />
                </div>
                <button
                  type="submit"
                  className="mt-[22px] h-10 shrink-0 rounded-xl bg-brand-800 px-3 text-[12px] font-semibold text-white transition hover:bg-brand-900"
                >
                  Tambah
                </button>
              </form>

              <ul className="mt-3 divide-y divide-line/70 rounded-xl border border-line">
                {data[kind].length === 0 ? (
                  <li className="px-3 py-4 text-center text-[12px] text-muted">
                    Belum ada data
                  </li>
                ) : (
                  data[kind].map((item) => (
                    <li
                      key={item}
                      className="flex items-center justify-between gap-2 px-3 py-2.5"
                    >
                      <span className="min-w-0 truncate text-[13px] text-ink">
                        {item}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPendingDelete({ kind, value: item })}
                        className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-medium text-red-700 transition hover:bg-red-50"
                      >
                        Hapus
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </section>
          )
        })}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Hapus dari daftar?"
        description={
          pendingDelete
            ? `"${pendingDelete.value}" tidak lagi muncul di pilihan form pengguna. Akun yang sudah memakai nilai ini tidak diubah otomatis.`
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
