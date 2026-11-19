// Fix: fix-7 — Nederlandse feestdagen (dan is er vaak geen training)
import { addDays, toISODate } from './dates'

/** Paaszondag (Gregoriaanse kalender, anonieme algoritme). */
export function paaszondag(jaar: number): string {
  const a = jaar % 19
  const b = Math.floor(jaar / 100)
  const c = jaar % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const maand = Math.floor((h + l - 7 * m + 114) / 31)
  const dag = ((h + l - 7 * m + 114) % 31) + 1
  return toISODate(new Date(jaar, maand - 1, dag))
}

export interface Feestdag {
  datum: string
  naam: string
}

/** Feestdagen en avonden waarop vaak niet getraind wordt. */
export function feestdagenIn(jaar: number): Feestdag[] {
  const pasen = paaszondag(jaar)
  const koningsdag = new Date(jaar, 3, 27).getDay() === 0 ? `${jaar}-04-26` : `${jaar}-04-27`
  return [
    { datum: `${jaar}-01-01`, naam: 'Nieuwjaarsdag' },
    { datum: addDays(pasen, -2), naam: 'Goede Vrijdag' },
    { datum: pasen, naam: 'Eerste paasdag' },
    { datum: addDays(pasen, 1), naam: 'Tweede paasdag' },
    { datum: koningsdag, naam: 'Koningsdag' },
    { datum: `${jaar}-05-05`, naam: 'Bevrijdingsdag' },
    { datum: addDays(pasen, 39), naam: 'Hemelvaartsdag' },
    { datum: addDays(pasen, 49), naam: 'Eerste pinksterdag' },
    { datum: addDays(pasen, 50), naam: 'Tweede pinksterdag' },
    { datum: `${jaar}-12-24`, naam: 'Kerstavond' },
    { datum: `${jaar}-12-25`, naam: 'Eerste kerstdag' },
    { datum: `${jaar}-12-26`, naam: 'Tweede kerstdag' },
    { datum: `${jaar}-12-31`, naam: 'Oudejaarsdag' },
  ]
}

const cache = new Map<number, Map<string, string>>()

/** Naam van de feestdag op deze datum, of undefined. */
export function feestdag(datum: string): string | undefined {
  const jaar = Number(datum.slice(0, 4))
  let perJaar = cache.get(jaar)
  if (!perJaar) {
    perJaar = new Map(feestdagenIn(jaar).map((f) => [f.datum, f.naam]))
    cache.set(jaar, perJaar)
  }
  return perJaar.get(datum)
}
