import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'

type MfaChallengeFormProps = {
  title?: string
  description?: string
  submitLabel?: string
  onVerify: (code: string) => Promise<void>
  onCancel?: () => void | Promise<void>
}

export function MfaChallengeForm({
  title = 'Verifikasi 2 langkah',
  description = 'Masukkan kode 6 digit dari aplikasi authenticator Anda.',
  submitLabel = 'Verifikasi',
  onVerify,
  onCancel,
}: MfaChallengeFormProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const errorRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!error) return
    errorRef.current?.focus()
  }, [error])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await onVerify(code)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verifikasi gagal')
      setCode('')
      window.setTimeout(() => inputRef.current?.focus(), 0)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
      <div>
        <h2 className="text-[1.05rem] font-semibold text-ink">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>
      </div>

      <TextField
        id="mfa-code"
        label="Kode authenticator"
        requiredMark
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="000000"
        required
        ref={inputRef}
      />

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

      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="submit" loading={loading} className="min-w-[8rem]">
          {submitLabel}
        </Button>
        {onCancel ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => void onCancel()}
            className="h-11 rounded-xl border border-line px-4 text-[13px] font-medium text-ink transition hover:bg-surface disabled:opacity-50"
          >
            Batal
          </button>
        ) : null}
      </div>
    </form>
  )
}
