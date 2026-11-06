/** Parse date-only (`YYYY-MM-DD`) or full ISO datetime without Invalid Date. */
export function parseDisplayDate(iso: string): Date {
  const trimmed = iso.trim()
  if (!trimmed) return new Date(NaN)
  if (
    /T\d|[+\-]\d{2}:\d{2}$|Z$/i.test(trimmed) ||
    /\s\d{2}:\d{2}/.test(trimmed)
  ) {
    return new Date(trimmed)
  }
  return new Date(`${trimmed.slice(0, 10)}T00:00:00`)
}

/** Format for UI — never throws on bad / ISO datetime stamps. */
export function formatDisplayDate(
  iso: string,
  opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' },
): string {
  if (!iso) return '—'
  const d = parseDisplayDate(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('id-ID', opts).format(d)
}

/** Calendar day key `YYYY-MM-DD` from date-only or ISO datetime. */
export function dateKeyFromIso(iso: string): string {
  const trimmed = iso.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10)
  const d = parseDisplayDate(trimmed)
  if (Number.isNaN(d.getTime())) return trimmed.slice(0, 10)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
