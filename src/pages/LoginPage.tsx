import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { MfaChallengeForm } from '@/components/auth/MfaChallengeForm'
import { Button } from '@/components/ui/Button'
import { PasswordField } from '@/components/ui/PasswordField'
import { Switch } from '@/components/ui/Switch'
import { TextField } from '@/components/ui/TextField'
import { LeafMarkIcon, MailIcon } from '@/components/ui/icons'
import { useAuth } from '@/features/auth/AuthContext'
import { consumeLaunchPath } from '@/lib/open-app-tab'
import { isSupabaseConfigured } from '@/lib/supabase-client'
import { LoginPreview } from '@/pages/login/LoginPreview'

const showDemoHints =
  !import.meta.env.PROD && !isSupabaseConfigured()

function resolvePostLoginPath(from?: string): string {
  if (from && from.startsWith('/') && from !== '/login' && from !== '/portal') {
    return from
  }
  const launch = consumeLaunchPath()
  if (launch && launch !== '/login' && launch !== '/portal') return launch
  return '/portal'
}

export function LoginPage() {
  const {
    isAuthenticated,
    authReady,
    mfaRequired,
    login,
    verifyMfa,
    cancelMfa,
  } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from =
    typeof (location.state as { from?: unknown } | null)?.from === 'string'
      ? (location.state as { from: string }).from
      : undefined
  const [email, setEmail] = useState(showDemoHints ? 'admin@egabah.local' : '')
  const [password, setPassword] = useState(showDemoHints ? 'demo123' : '')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const errorRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (!error) return
    errorRef.current?.focus()
  }, [error])

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <span
          className="size-9 animate-spin rounded-full border-2 border-brand-200 border-t-brand-800"
          role="status"
          aria-label="Memuat sesi"
        />
        <span className="sr-only">Memuat sesi…</span>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to={resolvePostLoginPath(from)} replace />
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const needsMfa = await login({ email, password, remember })
      if (!needsMfa) {
        navigate(resolvePostLoginPath(from), { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk.')
      window.setTimeout(() => emailRef.current?.focus(), 0)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto flex min-h-screen max-w-[1120px] items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="motion-rise grid w-full overflow-hidden rounded-2xl border border-line bg-panel lg:grid-cols-[0.92fr_1.08fr]">
          <section className="flex flex-col justify-center px-6 py-9 sm:px-10 lg:px-12 lg:py-12">
            <div className="mb-8 inline-flex items-center gap-3">
              <span className="inline-flex size-11 items-center justify-center rounded-[12px] bg-brand-800 text-white">
                <LeafMarkIcon className="size-6" />
              </span>
              <span className="font-display text-[1.85rem] leading-none font-semibold tracking-tight text-ink sm:text-[2.1rem]">
                E-Gabah
              </span>
            </div>

            {mfaRequired ? (
              <div className="mt-2">
                <MfaChallengeForm
                  onVerify={async (code) => {
                    await verifyMfa(code)
                    navigate(resolvePostLoginPath(from), { replace: true })
                  }}
                  onCancel={cancelMfa}
                />
              </div>
            ) : (
              <>
                <h1 className="text-[1.15rem] leading-snug font-semibold tracking-tight text-ink sm:text-[1.25rem]">
                  Masuk ke portal mill
                </h1>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
                  Peran diambil otomatis dari akun Anda.
                </p>
                {showDemoHints ? (
                  <p className="mt-3 max-w-sm text-[12px] leading-relaxed text-muted/90">
                    Akun demo:{' '}
                    <span className="font-medium text-ink">
                      admin@egabah.local
                    </span>{' '}
                    / <span className="font-medium text-ink">demo123</span>
                  </p>
                ) : null}

                <form onSubmit={onSubmit} className="mt-8 space-y-4">
                  <TextField
                    id="login-email"
                    label="Email"
                    requiredMark
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@usaha.com…"
                    autoComplete="username"
                    spellCheck={false}
                    required
                    leading={<MailIcon />}
                    ref={emailRef}
                  />

                  <PasswordField
                    id="login-password"
                    label="Kata sandi"
                    requiredMark
                    value={password}
                    onChange={setPassword}
                    placeholder="Masukkan kata sandi…"
                    required
                  />

                  <div className="pt-1">
                    <Switch
                      id="login-remember"
                      label="Ingat sesi masuk"
                      checked={remember}
                      onChange={setRemember}
                    />
                  </div>

                  {error ? (
                    <p
                      ref={errorRef}
                      tabIndex={-1}
                      role="alert"
                      aria-live="assertive"
                      className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 outline-none"
                    >
                      {error}
                    </p>
                  ) : null}

                  <Button type="submit" loading={loading} className="mt-2">
                    Masuk
                  </Button>
                </form>
              </>
            )}

            <p className="mt-8 text-[11px] leading-relaxed text-muted/80">
              © {new Date().getFullYear()} E-Gabah · ERP Penggilingan Padi
            </p>
          </section>

          <aside className="hidden lg:block">
            <LoginPreview />
          </aside>
        </div>
      </div>
    </div>
  )
}
