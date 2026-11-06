import { useCallback, useEffect, useState } from 'react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  formatSessionDevice,
  formatSessionWhen,
  listMyAuthSessions,
  revokeMyAuthSession,
  revokeOtherAuthSessions,
  type AuthSessionRow,
} from '@/features/auth/sessions'
import { isSupabaseConfigured } from '@/lib/supabase-client'

type ActiveSessionsCardProps = {
  notify: (msg: string) => void
}

export function ActiveSessionsCard({ notify }: ActiveSessionsCardProps) {
  const cloud = isSupabaseConfigured()
  const [rows, setRows] = useState<AuthSessionRow[]>([])
  const [loading, setLoading] = useState(cloud)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revokeId, setRevokeId] = useState<string | null>(null)
  const [revokeOthers, setRevokeOthers] = useState(false)

  const refresh = useCallback(async () => {
    if (!cloud) {
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setRows(await listMyAuthSessions())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat sesi')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [cloud])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function doRevokeOne() {
    if (!revokeId) return
    const id = revokeId
    setRevokeId(null)
    setBusy(true)
    try {
      await revokeMyAuthSession(id)
      await refresh()
      notify('Sesi perangkat diakhiri')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengakhiri sesi')
    } finally {
      setBusy(false)
    }
  }

  async function doRevokeOthers() {
    setRevokeOthers(false)
    setBusy(true)
    try {
      await revokeOtherAuthSessions()
      await refresh()
      notify('Semua sesi lain diakhiri')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengakhiri sesi lain')
    } finally {
      setBusy(false)
    }
  }

  if (!cloud) {
    return (
      <section className="overflow-hidden rounded-2xl border border-line bg-panel">
        <header className="border-b border-line px-4 py-3.5 sm:px-5">
          <h2 className="text-[14px] font-semibold text-ink">Perangkat aktif</h2>
          <p className="mt-0.5 text-[12.5px] leading-snug text-muted">
            Memerlukan Supabase Auth. Mode lokal hanya satu sesi browser.
          </p>
        </header>
      </section>
    )
  }

  const others = rows.filter((r) => !r.is_current)

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-line bg-panel">
        <header className="border-b border-line px-4 py-3.5 sm:px-5">
          <h2 className="text-[14px] font-semibold text-ink">Perangkat aktif</h2>
          <p className="mt-0.5 text-[12.5px] leading-snug text-muted">
            Sesi login nyata dari Auth. Akhiri perangkat yang tidak Anda kenali.
          </p>
        </header>

        <div className="space-y-2 px-4 py-4 sm:px-5">
          {loading ? (
            <p className="text-[13px] text-muted">Memuat sesi…</p>
          ) : null}
          {!loading && rows.length === 0 ? (
            <p className="text-[13px] text-muted">Tidak ada sesi aktif.</p>
          ) : null}
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line/80 bg-surface/60 px-3.5 py-3"
            >
              <div>
                <p className="text-[13px] font-medium text-ink">
                  {formatSessionDevice(row)}
                  {row.is_current ? (
                    <span className="ml-2 text-[11px] font-semibold text-brand-700">
                      Perangkat ini
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-[12px] text-muted">
                  {row.ip ? `${row.ip} · ` : ''}
                  {formatSessionWhen(row)}
                  {row.aal ? ` · ${row.aal.toUpperCase()}` : ''}
                </p>
              </div>
              {!row.is_current ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setRevokeId(row.id)}
                  className="h-9 rounded-xl border border-line px-3 text-[12.5px] font-medium text-ink transition hover:bg-white disabled:opacity-50"
                >
                  Akhiri
                </button>
              ) : null}
            </div>
          ))}
          {error ? (
            <p role="alert" className="text-[13px] text-red-600">
              {error}
            </p>
          ) : null}
        </div>

        {others.length > 0 ? (
          <footer className="border-t border-line bg-surface/50 px-4 py-3 sm:px-5">
            <div className="flex justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={() => setRevokeOthers(true)}
                className="h-10 rounded-xl border border-red-200 px-3.5 text-[13px] font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
              >
                Akhiri semua sesi lain
              </button>
            </div>
          </footer>
        ) : null}
      </section>

      <ConfirmDialog
        open={revokeId !== null}
        title="Akhiri sesi perangkat?"
        description="Perangkat itu harus login ulang untuk masuk lagi."
        confirmLabel="Ya, akhiri"
        danger
        onClose={() => setRevokeId(null)}
        onConfirm={() => void doRevokeOne()}
      />
      <ConfirmDialog
        open={revokeOthers}
        title="Akhiri semua sesi lain?"
        description="Hanya perangkat ini yang tetap masuk. Perangkat lain harus login ulang."
        confirmLabel="Ya, akhiri semua"
        danger
        onClose={() => setRevokeOthers(false)}
        onConfirm={() => void doRevokeOthers()}
      />
    </>
  )
}
