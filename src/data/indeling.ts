// Fix: fix-10 — indelen: voorstel, waarschuwingen en tellingen (pure functies, getest)
import type { Toezichthouder, Trainer } from './fixtures'
import { kanNietOp, type Beschikbaarheid, type PeriodeTraining } from './rooster'

/** Indeling van één training. */
export interface Indeling {
  /** Ingedeelde trainers (uid's), in volgorde van de plekken. */
  trainers: string[]
  /** Afwijkend aantal benodigde trainers voor deze ene training. */
  nodig?: number
  /**
   * Toezicht: undefined/null = automatisch (een bevoegde ingedeelde trainer),
   * `trainer:<uid>` of `groep:<id>` (iemand uit de groep toezichthouders).
   */
  toezicht?: string | null
}

export type IndelingMap = Record<string, Indeling>

export function nodigVoor(t: PeriodeTraining, i: Indeling | undefined) {
  return i?.nodig ?? t.trainersNodig
}

export function maandVan(datum: string) {
  return datum.slice(0, 7)
}

/** Aantal trainingen per trainer per maand (`trainerId|YYYY-MM`) en totaal (`trainerId`). */
export function tellingen(trainingen: PeriodeTraining[], indeling: IndelingMap) {
  const per = new Map<string, number>()
  for (const t of trainingen) {
    for (const id of indeling[t.key]?.trainers ?? []) {
      per.set(id, (per.get(id) ?? 0) + 1)
      const k = `${id}|${maandVan(t.datum)}`
      per.set(k, (per.get(k) ?? 0) + 1)
    }
  }
  return per
}

/**
 * Maakt een indelingsvoorstel. Regels:
 * - alleen trainers met 'graag' of 'als het moet', niet op data dat ze niet kunnen;
 * - niet boven hun maximum per maand;
 * - 'graag' gaat voor 'als het moet', daarna wie relatief het minst staat;
 * - een assistent-trainer liefst niet alleen; liefst iemand met toezichtbevoegdheid erbij.
 * Bestaande afwijkingen in `nodig` en `toezicht` blijven behouden.
 */
export function maakVoorstel(
  trainingen: PeriodeTraining[],
  trainers: Trainer[],
  beschikbaarheid: Record<string, Beschikbaarheid>,
  huidige: IndelingMap = {},
): IndelingMap {
  const uit: IndelingMap = {}
  const totaal = new Map<string, number>()
  const perMaand = new Map<string, number>()
  const actief = trainers.filter((t) => t.rol !== 'Geen training')

  for (const t of trainingen) {
    const bestaand = huidige[t.key]
    const nodig = nodigVoor(t, bestaand)
    const gekozen: Trainer[] = []
    const maand = maandVan(t.datum)

    for (let plek = 0; plek < nodig; plek++) {
      const heeftVolwaardig = gekozen.some((g) => g.rol === 'Trainer')
      const heeftToezicht = gekozen.some((g) => g.toezichthouder)
      const kandidaten = actief
        .filter((tr) => {
          if (gekozen.includes(tr)) return false
          const b = beschikbaarheid[tr.id]
          const k = b?.keuzes[t.keuzeSleutel]
          if (k !== 'graag' && k !== 'kan') return false
          if (kanNietOp(b, t.datum)) return false
          const max = b?.maxPerMaand
          if (max != null && (perMaand.get(`${tr.id}|${maand}`) ?? 0) >= max) return false
          return true
        })
        .map((tr) => {
          const b = beschikbaarheid[tr.id]!
          const graag = b.keuzes[t.keuzeSleutel] === 'graag'
          const max = b.maxPerMaand ?? 4
          const druk = (perMaand.get(`${tr.id}|${maand}`) ?? 0) / Math.max(max, 1)
          let score = 0
          if (!graag) score += 10
          // Assistent liever niet als enige of eerste. Samen met 'geen toezicht'
          // weegt dat zwaarder dan 'als het moet' (6 + 5 > 10), los niet.
          if (tr.rol === 'Assistent-trainer' && !heeftVolwaardig) score += 6
          // Toezicht: de laatste plek liefst met een bevoegde trainer.
          if (!heeftToezicht && plek === nodig - 1 && !tr.toezichthouder) score += 5
          score += druk * 4 + (totaal.get(tr.id) ?? 0) * 0.05
          return { tr, score }
        })
        .sort((a, b) => a.score - b.score || a.tr.id.localeCompare(b.tr.id))

      const keuze = kandidaten[0]?.tr
      if (!keuze) break
      gekozen.push(keuze)
      totaal.set(keuze.id, (totaal.get(keuze.id) ?? 0) + 1)
      perMaand.set(`${keuze.id}|${maand}`, (perMaand.get(`${keuze.id}|${maand}`) ?? 0) + 1)
    }

    const entry: Indeling = { trainers: gekozen.map((g) => g.id) }
    if (bestaand?.nodig !== undefined) entry.nodig = bestaand.nodig
    if (bestaand?.toezicht) entry.toezicht = bestaand.toezicht
    uit[t.key] = entry
  }
  return uit
}

export type WaarschuwingSoort = 'open' | 'toezicht' | 'assistent' | 'alsHetMoet' | 'kanNiet' | 'feestdag'

export interface Waarschuwing {
  soort: WaarschuwingSoort
  tekst: string
  /** Ernstig = moet opgelost; anders ter info. */
  ernstig: boolean
}

/** Waarschuwingen voor één training. */
export function controleer(
  t: PeriodeTraining,
  i: Indeling | undefined,
  trainers: Trainer[],
  beschikbaarheid: Record<string, Beschikbaarheid>,
): Waarschuwing[] {
  const uit: Waarschuwing[] = []
  const ids = i?.trainers ?? []
  const ingedeeld = ids.map((id) => trainers.find((x) => x.id === id)).filter((x): x is Trainer => !!x)
  const nodig = nodigVoor(t, i)
  if (ids.length < nodig) {
    uit.push({ soort: 'open', tekst: nodig - ids.length === 1 ? '1 open plek' : `${nodig - ids.length} open plekken`, ernstig: true })
  }
  const toezichtGeregeld = !!i?.toezicht || ingedeeld.some((x) => x.toezichthouder)
  if (!toezichtGeregeld) uit.push({ soort: 'toezicht', tekst: 'Geen toezichthouder', ernstig: true })
  if (ingedeeld.length > 0 && ingedeeld.every((x) => x.rol === 'Assistent-trainer')) {
    uit.push({ soort: 'assistent', tekst: 'Assistent-trainer alleen', ernstig: false })
  }
  for (const x of ingedeeld) {
    const b = beschikbaarheid[x.id]
    const k = b?.keuzes[t.keuzeSleutel]
    if (k === 'nee' || kanNietOp(b, t.datum)) {
      uit.push({ soort: 'kanNiet', tekst: `${x.naam.split(' ')[0]} kan eigenlijk niet`, ernstig: true })
    } else if (k === 'kan') {
      uit.push({ soort: 'alsHetMoet', tekst: `${x.naam.split(' ')[0]}: als het moet`, ernstig: false })
    }
  }
  if (t.feestdag) uit.push({ soort: 'feestdag', tekst: t.feestdag, ernstig: false })
  return uit
}

/** Leesbare naam voor de toezichtkeuze. */
export function toezichtNaam(
  waarde: string | null | undefined,
  trainers: Trainer[],
  groep: Toezichthouder[],
): string | null {
  if (!waarde) return null
  const [soort, id] = waarde.split(':')
  if (soort === 'trainer') return trainers.find((t) => t.id === id)?.naam ?? 'Oud-trainer'
  if (soort === 'groep') return groep.find((g) => g.id === id)?.naam ?? 'Onbekende toezichthouder'
  return null
}
