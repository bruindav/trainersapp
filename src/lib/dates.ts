// Kleine datumhulpjes zonder externe library. Alle datums zijn lokale
// kalenderdagen in ISO-notatie (YYYY-MM-DD).

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

/** Maandag van de week waarin `iso` valt. */
export function startOfWeek(iso: string): string {
  const d = parseISODate(iso)
  const dow = (d.getDay() + 6) % 7 // ma = 0
  d.setDate(d.getDate() - dow)
  return toISODate(d)
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function isoWeekNumber(iso: string): number {
  const d = parseISODate(iso)
  const target = new Date(d.valueOf())
  const dayNr = (d.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNr + 3)
  const firstThursday = new Date(target.getFullYear(), 0, 4)
  const diff = target.valueOf() - firstThursday.valueOf()
  return 1 + Math.round((diff / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7)
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseISODate(b).valueOf() - parseISODate(a).valueOf()) / 86400000)
}

const dayFmt = new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
const shortFmt = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' })
const monthFmt = new Intl.DateTimeFormat('nl-NL', { month: 'short' })

export function formatLong(iso: string): string {
  return dayFmt.format(parseISODate(iso))
}

export function formatShort(iso: string): string {
  return shortFmt.format(parseISODate(iso))
}

export function formatMonth(iso: string): string {
  return monthFmt.format(parseISODate(iso))
}

export function formatRange(from: string, to: string): string {
  return `${formatShort(from)} – ${formatShort(to)}`
}
