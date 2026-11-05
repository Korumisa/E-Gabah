import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  FinanceModal,
  ModalActions,
} from '@/components/keuangan/FinanceModal'

const OUTPUT_SIZE = 512
const MAX_BYTES = 2 * 1024 * 1024

type CropState = {
  src: string
  zoom: number
  offsetX: number
  offsetY: number
}

type AvatarEditorProps = {
  avatarUrl: string
  initials: string
  onChange: (avatarUrl: string) => void
  onNotify: (msg: string) => void
}

export function AvatarEditor({
  avatarUrl,
  initials,
  onChange,
  onNotify,
}: AvatarEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [crop, setCrop] = useState<CropState | null>(null)

  function openPicker() {
    fileRef.current?.click()
  }

  function onFile(file: File | undefined) {
    if (!file) return
    if (file.size > MAX_BYTES) {
      onNotify('Foto maksimal 2 MB')
      return
    }
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      onNotify('Format harus PNG, JPEG, atau WebP')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const src = typeof reader.result === 'string' ? reader.result : ''
      if (!src) return
      setDetailOpen(false)
      setCrop({ src, zoom: 1, offsetX: 0, offsetY: 0 })
    }
    reader.readAsDataURL(file)
  }

  async function applyCrop() {
    if (!crop) return
    try {
      const dataUrl = await renderCroppedAvatar(crop)
      onChange(dataUrl)
      setCrop(null)
      onNotify('Foto profil diperbarui')
    } catch {
      onNotify('Gagal memotong foto')
    }
  }

  function removeAvatar() {
    onChange('')
    setDetailOpen(false)
    onNotify('Foto profil dihapus')
  }

  return (
    <>
      <div className="relative">
        <button
          type="button"
          title={avatarUrl ? 'Lihat foto profil' : 'Tambah foto profil'}
          aria-label={avatarUrl ? 'Lihat foto profil' : 'Tambah foto profil'}
          onClick={() => {
            if (avatarUrl) setDetailOpen(true)
            else openPicker()
          }}
          className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-100 text-[18px] font-semibold text-brand-800 ring-offset-2 transition hover:ring-2 hover:ring-brand-300"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Foto profil"
              className="size-full object-cover"
            />
          ) : (
            initials || 'U'
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            onFile(file)
          }}
        />
        <button
          type="button"
          title="Ganti foto profil"
          aria-label="Ganti foto profil"
          onClick={(e) => {
            e.stopPropagation()
            openPicker()
          }}
          className="absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full border border-line bg-brand-800 text-white shadow-sm transition hover:bg-brand-900"
        >
          <CameraGlyph />
        </button>
      </div>

      {detailOpen && avatarUrl ? (
        <FinanceModal
          title="Foto profil"
          subtitle="Detail"
          wide
          onClose={() => setDetailOpen(false)}
          footer={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={removeAvatar}
                className="h-11 flex-1 rounded-xl border border-red-200 bg-red-50 text-[14px] font-medium text-red-700 transition hover:bg-red-100"
              >
                Hapus
              </button>
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="h-11 flex-1 rounded-xl border border-line text-[14px] font-medium text-ink transition hover:bg-surface"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={openPicker}
                className="h-11 flex-1 rounded-xl bg-brand-800 text-[14px] font-semibold text-white transition hover:bg-brand-900"
              >
                Ganti foto
              </button>
            </div>
          }
        >
          <div className="mx-auto overflow-hidden rounded-2xl border border-line bg-surface">
            <img
              src={avatarUrl}
              alt="Foto profil"
              className="mx-auto max-h-[min(70vh,520px)] w-full object-contain"
            />
          </div>
        </FinanceModal>
      ) : null}

      {crop ? (
        <AvatarCropModal
          crop={crop}
          onChange={setCrop}
          onCancel={() => setCrop(null)}
          onApply={() => void applyCrop()}
          onPickAnother={openPicker}
        />
      ) : null}
    </>
  )
}

function AvatarCropModal({
  crop,
  onChange,
  onCancel,
  onApply,
  onPickAnother,
}: {
  crop: CropState
  onChange: (next: CropState) => void
  onCancel: () => void
  onApply: () => void
  onPickAnother: () => void
}) {
  const stageRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    x: number
    y: number
    ox: number
    oy: number
  } | null>(null)
  const [natural, setNatural] = useState({ w: 1, h: 1 })

  useEffect(() => {
    const img = new Image()
    img.onload = () => setNatural({ w: img.naturalWidth, h: img.naturalHeight })
    img.src = crop.src
  }, [crop.src])

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      dragRef.current = {
        x: e.clientX,
        y: e.clientY,
        ox: crop.offsetX,
        oy: crop.offsetY,
      }
    },
    [crop.offsetX, crop.offsetY],
  )

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const d = dragRef.current
      if (!d) return
      onChange({
        ...crop,
        offsetX: d.ox + (e.clientX - d.x),
        offsetY: d.oy + (e.clientY - d.y),
      })
    },
    [crop, onChange],
  )

  const onPointerUp = useCallback(() => {
    dragRef.current = null
  }, [])

  const frame = 260
  const baseScale =
    Math.max(frame / natural.w, frame / natural.h) * crop.zoom
  const drawW = natural.w * baseScale
  const drawH = natural.h * baseScale

  return (
    <FinanceModal
      title="Potong foto"
      subtitle="Seret untuk geser · geser zoom"
      wide
      onClose={onCancel}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onPickAnother}
            className="rounded-xl border border-line px-3.5 py-2 text-[13px] font-medium text-ink transition hover:bg-brand-50"
          >
            Pilih lain
          </button>
          <div className="min-w-[200px] flex-1">
            <ModalActions
              onCancel={onCancel}
              onConfirm={onApply}
              confirmLabel="Terapkan"
            />
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div
          ref={stageRef}
          className="relative mx-auto overflow-hidden rounded-2xl border border-line bg-ink/90 touch-none select-none"
          style={{ width: frame, height: frame }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <img
            src={crop.src}
            alt=""
            draggable={false}
            className="pointer-events-none absolute max-w-none"
            style={{
              width: drawW,
              height: drawH,
              left: (frame - drawW) / 2 + crop.offsetX,
              top: (frame - drawH) / 2 + crop.offsetY,
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-white/80 ring-inset"
            aria-hidden
          />
        </div>

        <label className="block space-y-1.5">
          <span className="text-[12px] font-medium text-muted">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={crop.zoom}
            onChange={(e) =>
              onChange({ ...crop, zoom: Number(e.target.value) })
            }
            className="w-full accent-brand-700"
          />
        </label>
        <p className="text-center text-[12px] text-muted">
          Area kotak akan dipakai sebagai foto profil.
        </p>
      </div>
    </FinanceModal>
  )
}

function renderCroppedAvatar(crop: CropState): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      try {
        const frame = 260
        const baseScale =
          Math.max(frame / img.naturalWidth, frame / img.naturalHeight) *
          crop.zoom
        const drawW = img.naturalWidth * baseScale
        const drawH = img.naturalHeight * baseScale
        const left = (frame - drawW) / 2 + crop.offsetX
        const top = (frame - drawH) / 2 + crop.offsetY

        const canvas = document.createElement('canvas')
        canvas.width = OUTPUT_SIZE
        canvas.height = OUTPUT_SIZE
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('canvas'))
          return
        }
        const scale = OUTPUT_SIZE / frame
        ctx.fillStyle = '#0f172a'
        ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
        ctx.drawImage(
          img,
          left * scale,
          top * scale,
          drawW * scale,
          drawH * scale,
        )
        resolve(canvas.toDataURL('image/jpeg', 0.9))
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = () => reject(new Error('image'))
    img.src = crop.src
  })
}

function CameraGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M4 8h3l2-2h6l2 2h3v11H4V8z" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}
