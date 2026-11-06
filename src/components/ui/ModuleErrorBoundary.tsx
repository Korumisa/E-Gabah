import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertCard } from '@/components/ui/AlertCard'

type Props = {
  children: ReactNode
  /** Reset key — change to remount children after recovery. */
  resetKey?: string
}

type State = {
  error: Error | null
}

/** Cegah layar putih — tampilkan AlertCard saat render modul gagal. */
export class ModuleErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ModuleErrorBoundary]', error, info.componentStack)
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null })
    }
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="space-y-3 p-1">
        <AlertCard tone="danger">
          Gagal menampilkan halaman atau dokumen. Data mungkin berisi tanggal
          tidak valid setelah approve — coba tutup dokumen atau muat ulang.
        </AlertCard>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="inline-flex h-9 items-center rounded-xl bg-brand-800 px-3 text-[12px] font-semibold text-white transition hover:bg-brand-900"
          >
            Coba lagi
          </button>
          <button
            type="button"
            onClick={() => {
              const url = new URL(window.location.href)
              url.searchParams.delete('dok')
              window.location.assign(url.pathname + url.search)
            }}
            className="inline-flex h-9 items-center rounded-xl border border-line px-3 text-[12px] font-medium text-ink transition hover:bg-surface"
          >
            Tutup dokumen
          </button>
        </div>
      </div>
    )
  }
}
