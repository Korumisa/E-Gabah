import {
  formatClock,
  hasGeo,
  type AttendanceRecord,
} from '@/features/absensi/absensi-data'

export type AbsensiMapPin = {
  id: string
  lat: number
  lng: number
  label: string
  sublabel?: string
  kind: 'in' | 'out'
}

export function pinsFromRecords(
  records: AttendanceRecord[],
  opts?: { userId?: string },
): AbsensiMapPin[] {
  const pins: AbsensiMapPin[] = []
  for (const r of records) {
    if (opts?.userId && r.userId !== opts.userId) continue
    if (hasGeo(r.checkInGeo)) {
      pins.push({
        id: `${r.id}-in`,
        lat: r.checkInGeo!.lat,
        lng: r.checkInGeo!.lng,
        label: r.userName,
        sublabel: `Masuk ${r.date} · ${formatClock(r.checkIn)}`,
        kind: 'in',
      })
    }
    if (hasGeo(r.checkOutGeo)) {
      pins.push({
        id: `${r.id}-out`,
        lat: r.checkOutGeo!.lat,
        lng: r.checkOutGeo!.lng,
        label: r.userName,
        sublabel: `Keluar ${r.date} · ${formatClock(r.checkOut)}`,
        kind: 'out',
      })
    }
  }
  return pins
}
