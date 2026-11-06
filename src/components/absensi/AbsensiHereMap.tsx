import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import type { AbsensiMapPin } from '@/components/absensi/absensi-map-pins'
import type { GeoPoint } from '@/features/absensi/absensi-data'

const AbsensiGeoMap = lazy(() =>
  import('@/components/absensi/AbsensiGeoMap').then((m) => ({
    default: m.AbsensiGeoMap,
  })),
)

type HereState =
  | { status: 'wait' }
  | { status: 'ok'; geo: GeoPoint }
  | { status: 'denied' }

function MapFallback({ hint }: { hint: string }) {
  return (
    <div className="flex h-[240px] w-full items-center justify-center rounded-2xl border border-line bg-panel text-[13px] text-muted sm:h-[280px]">
      {hint}
    </div>
  )
}

/** Pratinjau lokasi perangkat — titik yang akan tersimpan saat check-in/out. */
export function AbsensiHereMap() {
  const [state, setState] = useState<HereState>({ status: 'wait' })

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState({ status: 'denied' })
      return
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setState({
          status: 'ok',
          geo: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy:
              Number.isFinite(pos.coords.accuracy) && pos.coords.accuracy > 0
                ? pos.coords.accuracy
                : undefined,
          },
        })
      },
      () => setState({ status: 'denied' }),
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  const pins = useMemo((): AbsensiMapPin[] => {
    if (state.status !== 'ok') return []
    const acc =
      state.geo.accuracy != null
        ? ` · ±${Math.round(state.geo.accuracy)} m`
        : ''
    return [
      {
        id: 'here',
        lat: state.geo.lat,
        lng: state.geo.lng,
        label: 'Lokasi Anda sekarang',
        sublabel: `Titik ini yang tercatat saat check-in atau check-out${acc}`,
        kind: 'in',
      },
    ]
  }, [state])

  const subtitle =
    state.status === 'ok'
      ? `${state.geo.lat.toFixed(5)}, ${state.geo.lng.toFixed(5)}${
          state.geo.accuracy != null
            ? ` · akurasi ±${Math.round(state.geo.accuracy)} m`
            : ''
        }`
      : state.status === 'denied'
        ? 'Izin lokasi ditolak. Check-in tidak bisa disimpan tanpa titik ini.'
        : 'Mencari lokasi perangkat…'

  const emptyHint =
    state.status === 'denied'
      ? 'Izinkan lokasi di browser, lalu muat ulang halaman.'
      : 'Menunggu sinyal GPS…'

  return (
    <Suspense fallback={<MapFallback hint="Memuat peta…" />}>
      <AbsensiGeoMap
        title="Akan tercatat di sini"
        subtitle={subtitle}
        pins={pins}
        showLegend={false}
        mapClassName="h-[240px] w-full sm:h-[280px]"
        emptyHint={emptyHint}
      />
    </Suspense>
  )
}
