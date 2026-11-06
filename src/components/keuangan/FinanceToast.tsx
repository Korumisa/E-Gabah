import { createPortal } from 'react-dom'
import { AlertCard } from '@/components/ui/AlertCard'

type Tone = 'success' | 'danger' | 'info'

function inferTone(message: string): Tone {
  const m = message.toLowerCase()
  if (
    /gagal|error|periksa|tidak|batal|tolak|ditolak|invalid|izin/.test(m)
  ) {
    return 'danger'
  }
  if (/menunggu|diajukan|info|catatan/.test(m)) return 'info'
  return 'success'
}

/** Umpan balik aksi — AlertCard di atas drawer/overlay agar selalu terlihat. */
export function FinanceToast({
  message,
  tone,
}: {
  message: string | null
  tone?: Tone
}) {
  if (!message || typeof document === 'undefined') return null
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex justify-center px-3 sm:top-4 sm:justify-end sm:px-5">
      <div className="pointer-events-auto w-full max-w-md motion-rise">
        <AlertCard tone={tone ?? inferTone(message)}>{message}</AlertCard>
      </div>
    </div>,
    document.body,
  )
}
