import { useCallback, useEffect, useState } from 'react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { TextField } from '@/components/ui/TextField'
import {
  cancelPendingTotpEnrollment,
  enrollTotpFactor,
  listVerifiedTotpFactors,
  unenrollTotpFactor,
  verifyTotpEnrollment,
  type MfaTotpFactor,
} from '@/features/auth/mfa'
import { isSupabaseConfigured } from '@/lib/supabase-client'

type MfaSettingsCardProps = {
  notify: (msg: string) => void
}

export function MfaSettingsCard({ notify }: MfaSettingsCardProps) {
  const cloud = isSupabaseConfigured()
  const [factors, setFactors] = useState<MfaTotpFactor[]>([])
  const [loading, setLoading] = useState(cloud)
  const [enrolling, setEnrolling] = useState(false)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [unenrollId, setUnenrollId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!cloud) {
      setFactors([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      setFactors(await listVerifiedTotpFactors())
    } catch {
      setFactors([])
    } finally {
      setLoading(false)
    }
  }, [cloud])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function startEnroll() {
    setError(null)
    setBusy(true)
    try {
      const enrolled = await enrollTotpFactor('E-Gabah')
      setFactorId(enrolled.factorId)
      setQrCode(enrolled.qrCode)
      setSecret(enrolled.secret)
      setCode('')
      setEnrolling(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memulai MFA')
    } finally {
      setBusy(false)
    }
  }

  async function confirmEnroll() {
    if (!factorId) return
    setError(null)
    setBusy(true)
    try {
      await verifyTotpEnrollment(factorId, code)
      setEnrolling(false)
      setFactorId(null)
      setQrCode(null)
      setSecret(null)
      setCode('')
      await refresh()
      notify('Verifikasi 2 langkah diaktifkan')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kode tidak valid')
    } finally {
      setBusy(false)
    }
  }

  async function cancelEnroll() {
    if (factorId) await cancelPendingTotpEnrollment(factorId)
    setEnrolling(false)
    setFactorId(null)
    setQrCode(null)
    setSecret(null)
    setCode('')
    setError(null)
  }

  async function confirmUnenroll() {
    if (!unenrollId) return
    const id = unenrollId
    setUnenrollId(null)
    setBusy(true)
    setError(null)
    try {
      await unenrollTotpFactor(id)
      await refresh()
      notify('Verifikasi 2 langkah dinonaktifkan')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menonaktifkan MFA')
    } finally {
      setBusy(false)
    }
  }

  if (!cloud) {
    return (
      <section className="overflow-hidden rounded-2xl border border-line bg-panel">
        <header className="border-b border-line px-4 py-3.5 sm:px-5">
          <h2 className="text-[14px] font-semibold text-ink">
            Verifikasi 2 langkah (MFA)
          </h2>
          <p className="mt-0.5 text-[12.5px] leading-snug text-muted">
            Memerlukan Supabase Auth. Mode lokal tidak mendukung MFA.
          </p>
        </header>
      </section>
    )
  }

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-line bg-panel">
        <header className="border-b border-line px-4 py-3.5 sm:px-5">
          <h2 className="text-[14px] font-semibold text-ink">
            Verifikasi 2 langkah (MFA)
          </h2>
          <p className="mt-0.5 text-[12.5px] leading-snug text-muted">
            Kode dari aplikasi authenticator (Google Authenticator, 1Password,
            dll.) setelah kata sandi.
          </p>
        </header>

        <div className="space-y-4 px-4 py-4 sm:px-5">
          {loading ? (
            <p className="text-[13px] text-muted">Memuat status MFA…</p>
          ) : null}

          {!loading && factors.length > 0 && !enrolling ? (
            <ul className="space-y-2">
              {factors.map((factor) => (
                <li
                  key={factor.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface/60 px-3.5 py-3"
                >
                  <div>
                    <p className="text-[13px] font-medium text-ink">
                      {factor.friendlyName}
                    </p>
                    <p className="text-[12px] text-muted">TOTP · aktif</p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setUnenrollId(factor.id)}
                    className="h-9 rounded-xl border border-red-200 px-3 text-[12.5px] font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    Nonaktifkan
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {!loading && factors.length === 0 && !enrolling ? (
            <p className="text-[13px] leading-relaxed text-muted">
              Belum aktif. Setelah diaktifkan, login akan meminta kode 6 digit.
            </p>
          ) : null}

          {enrolling ? (
            <div className="space-y-3">
              {qrCode ? (
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                  <img
                    src={qrCode}
                    alt="QR code MFA"
                    width={180}
                    height={180}
                    className="rounded-xl border border-line bg-white p-2"
                  />
                  <div className="min-w-0 space-y-2 text-[12.5px] text-muted">
                    <p>Pindai QR dengan aplikasi authenticator.</p>
                    {secret ? (
                      <p className="break-all">
                        Atau masukkan manual:{' '}
                        <span className="font-mono text-ink">{secret}</span>
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <TextField
                id="mfa-enroll-code"
                label="Kode konfirmasi"
                requiredMark
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                placeholder="000000"
              />
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="text-[13px] text-red-600">
              {error}
            </p>
          ) : null}
        </div>

        <footer className="border-t border-line bg-surface/50 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap justify-end gap-2">
            {enrolling ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void cancelEnroll()}
                  className="h-10 rounded-xl border border-line px-3.5 text-[13px] font-medium text-ink transition hover:bg-white disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={busy || code.length !== 6}
                  onClick={() => void confirmEnroll()}
                  className="h-10 rounded-xl bg-brand-800 px-3.5 text-[13px] font-semibold text-white transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? 'Memverifikasi…' : 'Aktifkan MFA'}
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={busy || loading || factors.length > 0}
                onClick={() => void startEnroll()}
                className="h-10 rounded-xl bg-brand-800 px-3.5 text-[13px] font-semibold text-white transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? 'Menyiapkan…' : 'Aktifkan authenticator'}
              </button>
            )}
          </div>
        </footer>
      </section>

      <ConfirmDialog
        open={unenrollId !== null}
        title="Nonaktifkan MFA?"
        description="Login berikutnya hanya memakai kata sandi. Anda bisa mengaktifkan lagi kapan saja."
        confirmLabel="Ya, nonaktifkan"
        danger
        onClose={() => setUnenrollId(null)}
        onConfirm={() => void confirmUnenroll()}
      />
    </>
  )
}
