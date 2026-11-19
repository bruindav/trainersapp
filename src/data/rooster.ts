// Fix: fix-15 — ritme (wisselen per zoveel weken) voor vaste trainers
// Fix: fix-13 — waarschuwing bij een verdachte periode (verkeerd jaar)
// Fix: fix-12 — vaste trainers per moment en een geldigheidsperiode per moment
// Fix: fix-10 — indeling en publicatie op de periode
// Fix: fix-7 — feestdagen markeren bij trainingen
// Fix: fix-5 — domein van het nieuwe rooster: trainingsmomenten, roosterperiodes en beschikbaarheid.
// Zie docs/rooster-ontwerp.md voor de besluiten.
import { addDays, formatShort, parseISODate } from '@/lib/dates'
import { feestdag } from '@/lib/feestdagen'
import type { IndelingMap } from './indeling'
import type { Jaarplan } from './fixtures'

/** 0 = maandag … 6 = zondag */
export const DAGEN = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'] as const
export const DAGEN_KORT = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'] as const

/** Een vaste wekelijkse training. */
export interface Trainingsmoment {
  id: string
  dag: number
  start: string
  eind: string
  locatie: string
  trainersNodig: number
  actief: boolean
  volgorde: number
  /** Trainers die deze training altijd geven; anderen zijn alleen invaller. */
  vasteTrainers?: string[]
  /** Alleen geldig vanaf / tot en met deze datum (bijv. een proef van jan t/m apr). */
  geldigVan?: string
  geldigTot?: string
  /** Meer vaste trainers dan nodig: om de hoeveel trainingen ze wisselen (standaard 2). */
  ritmeWeken?: number
}

/** Geldt dit moment op deze datum (los van de dag van de week)? */
export function momentGeldigOp(m: Pick<Trainingsmoment, 'geldigVan' | 'geldigTot'>, datum: string) {
  return (!m.geldigVan || datum >= m.geldigVan) && (!m.geldigTot || datum <= m.geldigTot)
}

/** "vanaf 4 jan t/m 30 apr" of "" als het moment altijd geldt. */
export function geldigheidTekst(m: Pick<Trainingsmoment, 'geldigVan' | 'geldigTot'>) {
  if (m.geldigVan && m.geldigTot) return `${formatShort(m.geldigVan)} t/m ${formatShort(m.geldigTot)}`
  if (m.geldigVan) return `vanaf ${formatShort(m.geldigVan)}`
  if (m.geldigTot) return `t/m ${formatShort(m.geldigTot)}`
  return ''
}

export const STANDAARD_LOCATIE = 'Zwembad De Kwakel'

/** De vier vaste momenten van Nat Utrecht (besluit 19 nov 2026). */
export const STANDAARD_MOMENTEN: Omit<Trainingsmoment, 'id'>[] = [
  { dag: 1, start: '21:00', eind: '22:00', locatie: STANDAARD_LOCATIE, trainersNodig: 2, actief: true, volgorde: 1 },
  { dag: 3, start: '21:00', eind: '22:00', locatie: STANDAARD_LOCATIE, trainersNodig: 1, actief: true, volgorde: 2 },
  { dag: 6, start: '11:00', eind: '12:00', locatie: STANDAARD_LOCATIE, trainersNodig: 2, actief: true, volgorde: 3 },
  { dag: 6, start: '12:00', eind: '13:00', locatie: STANDAARD_LOCATIE, trainersNodig: 1, actief: true, volgorde: 4 },
]

/** Een training buiten de vaste momenten (zomerzwemmen, workshop, ...). */
export interface LosseTraining {
  id: string
  datum: string
  start: string
  eind: string
  locatie: string
  trainersNodig: number
  omschrijving: string
}

export type PeriodeSoort = 'wekelijks' | 'los'
export type PeriodeStatus = 'concept' | 'beschikbaarheid' | 'indelen' | 'gepubliceerd' | 'afgesloten'

export const STATUS_STAPPEN: { status: PeriodeStatus; label: string }[] = [
  { status: 'concept', label: 'Concept' },
  { status: 'beschikbaarheid', label: 'Invullen' },
  { status: 'indelen', label: 'Indelen' },
  { status: 'gepubliceerd', label: 'Gepubli\u00ADceerd' },
]

export const STATUS_LABEL: Record<PeriodeStatus, string> = {
  concept: 'Concept',
  beschikbaarheid: 'Beschikbaarheid opgeven',
  indelen: 'Indelen',
  gepubliceerd: 'Gepubliceerd',
  afgesloten: 'Afgesloten',
}

export interface Roosterperiode {
  id: string
  naam: string
  soort: PeriodeSoort
  van: string
  tot: string
  status: PeriodeStatus
  /** Uiterste datum om beschikbaarheid op te geven. */
  deadline: string | null
  /** Welke vaste momenten meedoen (soort 'wekelijks'). */
  momentIds: string[]
  /** De trainingen van een periode met soort 'los'. */
  losseTrainingen: LosseTraining[]
  /** Data waarop niet getraind wordt (naast het reces uit het jaarplan). */
  vervallenData: string[]
  /** Indeling per training (sleutel = PeriodeTraining.key). */
  indeling: IndelingMap
  /** Telt op bij elke publicatie. */
  versie: number
}

export type Keuze = 'graag' | 'kan' | 'nee'

export const KEUZES: { waarde: Keuze; label: string; kort: string }[] = [
  { waarde: 'graag', label: 'Graag', kort: 'G' },
  { waarde: 'kan', label: 'Als het moet', kort: 'A' },
  { waarde: 'nee', label: 'Nee', kort: '–' },
]

export interface DatumBereik {
  van: string
  tot: string
}

/** Beschikbaarheid van één trainer voor één periode. */
export interface Beschikbaarheid {
  trainerId: string
  /** Sleutel = momentId (wekelijks) of id van een losse training. */
  keuzes: Record<string, Keuze>
  /** Hoogstens zoveel trainingen per maand; null = geen voorkeur. */
  maxPerMaand: number | null
  nietKunnen: DatumBereik[]
}

/** Eén concrete training binnen een periode. */
export interface PeriodeTraining {
  /** Uniek binnen de periode: `datum|keuzeSleutel`. */
  key: string
  datum: string
  /** momentId of id van de losse training: de sleutel voor beschikbaarheid. */
  keuzeSleutel: string
  start: string
  eind: string
  locatie: string
  trainersNodig: number
  omschrijving: string
  /** Naam van de feestdag als de training daarop valt. */
  feestdag?: string
  /** Vaste trainers van het moment; anderen vallen alleen in. */
  vasteTrainers?: string[]
  ritmeWeken?: number
}

/** Dagnummer met maandag = 0. */
export function dagVan(iso: string) {
  return (parseISODate(iso).getDay() + 6) % 7
}

export function momentLabel(m: Pick<Trainingsmoment, 'dag' | 'start'>) {
  return `${DAGEN_KORT[m.dag]} ${m.start}`
}

export function momentNaam(m: Pick<Trainingsmoment, 'dag' | 'start' | 'eind'>) {
  const dag = DAGEN[m.dag]
  return `${dag.charAt(0).toUpperCase()}${dag.slice(1)} ${m.start}–${m.eind}`
}

export function sorteerMomenten<T extends Pick<Trainingsmoment, 'dag' | 'start'>>(momenten: T[]): T[] {
  return [...momenten].sort((a, b) => a.dag - b.dag || a.start.localeCompare(b.start))
}

/** Data in het reces volgens het jaarplan (evenementen van type 'Reces'). */
export function isReces(jaarplan: Pick<Jaarplan, 'evenementen'>, datum: string) {
  return jaarplan.evenementen.some((e) => e.type === 'Reces' && e.datum <= datum && datum <= (e.einddatum ?? e.datum))
}

/**
 * Alle trainingen van een periode, op datum gesorteerd. Voor een wekelijkse
 * periode: elk gekozen moment op elke passende dag tussen van en tot, behalve
 * reces en vervallen data.
 */
export function trainingenInPeriode(
  periode: Pick<Roosterperiode, 'soort' | 'van' | 'tot' | 'momentIds' | 'losseTrainingen' | 'vervallenData'>,
  momenten: Trainingsmoment[],
  jaarplan: Pick<Jaarplan, 'evenementen'>,
): PeriodeTraining[] {
  if (periode.soort === 'los') {
    return [...periode.losseTrainingen]
      .sort((a, b) => a.datum.localeCompare(b.datum) || a.start.localeCompare(b.start))
      .map((l) => ({
        key: `${l.datum}|${l.id}`,
        datum: l.datum,
        keuzeSleutel: l.id,
        start: l.start,
        eind: l.eind,
        locatie: l.locatie,
        trainersNodig: l.trainersNodig,
        omschrijving: l.omschrijving,
        feestdag: feestdag(l.datum),
      }))
  }
  const gekozen = sorteerMomenten(momenten.filter((m) => periode.momentIds.includes(m.id)))
  const vervallen = new Set(periode.vervallenData)
  const uit: PeriodeTraining[] = []
  // Veiligheidsgrens: hoogstens ~2 jaar aan dagen.
  for (let d = periode.van, n = 0; d <= periode.tot && n < 800; d = addDays(d, 1), n++) {
    if (vervallen.has(d) || isReces(jaarplan, d)) continue
    const dag = dagVan(d)
    for (const m of gekozen) {
      if (m.dag !== dag || !momentGeldigOp(m, d)) continue
      uit.push({
        key: `${d}|${m.id}`,
        datum: d,
        keuzeSleutel: m.id,
        start: m.start,
        eind: m.eind,
        locatie: m.locatie,
        trainersNodig: m.trainersNodig,
        omschrijving: '',
        feestdag: feestdag(d),
        ...(m.vasteTrainers?.length ? { vasteTrainers: m.vasteTrainers } : {}),
        ...(m.ritmeWeken ? { ritmeWeken: m.ritmeWeken } : {}),
      })
    }
  }
  return uit
}

/** De sleutels waarvoor beschikbaarheid wordt gevraagd, met een label. */
export interface KeuzeKolom {
  sleutel: string
  kort: string
  lang: string
  /** Vaste trainers: voor hen ligt de keuze vast, anderen kunnen alleen invallen. */
  vast: string[]
}

export function keuzeKolommen(
  periode: Pick<Roosterperiode, 'soort' | 'momentIds' | 'losseTrainingen'> & Partial<Pick<Roosterperiode, 'van' | 'tot'>>,
  momenten: Trainingsmoment[],
): KeuzeKolom[] {
  if (periode.soort === 'los') {
    return [...periode.losseTrainingen]
      .sort((a, b) => a.datum.localeCompare(b.datum) || a.start.localeCompare(b.start))
      .map((l) => ({
        sleutel: l.id,
        kort: `${DAGEN_KORT[dagVan(l.datum)]} ${l.datum.slice(8, 10)}-${l.datum.slice(5, 7)}`,
        lang: `${l.omschrijving || 'Training'} · ${l.start}–${l.eind} · ${l.locatie}`,
        vast: [],
      }))
  }
  return sorteerMomenten(
    momenten.filter(
      (m) =>
        periode.momentIds.includes(m.id) &&
        // Een moment dat in deze periode nooit geldt, hoeft niet gevraagd te worden.
        (!periode.tot || !m.geldigVan || m.geldigVan <= periode.tot) &&
        (!periode.van || !m.geldigTot || m.geldigTot >= periode.van),
    ),
  ).map((m) => {
    const geldig = geldigheidTekst(m)
    return {
      sleutel: m.id,
      kort: momentLabel(m),
      lang: `${momentNaam(m)} · ${m.locatie}${geldig ? ` · ${geldig}` : ''}`,
      vast: m.vasteTrainers ?? [],
    }
  })
}

/** Heeft deze trainer voor elke kolom iets gekozen? */
export function isVolledigIngevuld(b: Beschikbaarheid | undefined, sleutels: string[]) {
  return !!b && sleutels.every((s) => b.keuzes[s] !== undefined)
}

export function kanNietOp(b: Beschikbaarheid | undefined, datum: string) {
  return !!b && b.nietKunnen.some((r) => r.van <= datum && datum <= r.tot)
}

/**
 * Controle op tikfouten in de datums van een periode (bijv. het verkeerde
 * jaar): geeft een waarschuwing of null. Blokkeert niets.
 */
export function periodeDatumWaarschuwing(van: string, tot: string, vandaag: string): string | null {
  if (!van || !tot || van > tot) return null
  const maanden = Math.round(((parseISODate(tot).getTime() - parseISODate(van).getTime()) / 86_400_000 + 1) / 30.4)
  if (maanden > 8) {
    return `Deze periode duurt ongeveer ${maanden} maanden (${van.slice(0, 4)} t/m ${tot.slice(0, 4)}). Klopt het jaar?`
  }
  if (tot < vandaag) return 'Deze periode ligt helemaal in het verleden. Klopt het jaar?'
  return null
}

/** Nieuw id voor een losse training binnen een periode. */
export function nieuwLosId() {
  return `l-${Math.random().toString(36).slice(2, 10)}`
}
