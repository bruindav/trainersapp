// Fix: fix-37 — trainersoverleg: notulen, acties en afspraken (per onderwerp)
import type { Trainer } from './fixtures'

export interface OverlegActie {
  id: string
  /** Wie de actie oppakt (vrije tekst: een of meer namen, of "alle trainers"). */
  wie: string
  wat: string
  klaar: boolean
}

export interface Agendapunt {
  id: string
  titel: string
  /** De bespreking; alinea's gescheiden door een witregel. */
  tekst: string
  acties: OverlegActie[]
}

export interface Afspraak {
  id: string
  /** Onderwerp om op te groeperen, bv. "Toezicht" of "Workshops". */
  onderwerp: string
  tekst: string
  /** Een afspraak die later is vervangen of niet meer geldt. */
  vervallen?: boolean
}

export interface BelangrijkeDatum {
  /** ISO-datum als die bekend is; anders alleen tekst ("December: …"). */
  datum?: string
  tekst: string
}

export type OverlegStatus = 'concept' | 'goedgekeurd'

export interface Overleg {
  id: string
  datum: string
  titel: string
  status: OverlegStatus
  aanwezig: string
  gasten: string
  punten: Agendapunt[]
  afspraken: Afspraak[]
  belangrijkeData: BelangrijkeDatum[]
  /** Bestandsnaam van de geüploade notulen; het bestand staat in overlegBijlagen/{id}. */
  bijlage?: string
  aangemaaktDoor?: string
  goedgekeurdDoor?: string
}

export type OverlegVelden = Omit<
  Overleg,
  'id' | 'aangemaaktDoor' | 'goedgekeurdDoor' | 'status'
>

export const STANDAARD_ONDERWERPEN = [
  'Toezicht',
  'Trainingen',
  'Workshops',
  'Uitrusting',
  'Baanindeling',
  'Wedstrijden',
  'Badgebruik',
  'Communicatie',
  'Overig',
]

const tekst = (x: unknown, max = 20000) =>
  typeof x === 'string' ? x.slice(0, max) : ''
const lijst = (x: unknown) =>
  Array.isArray(x) ? (x as Record<string, unknown>[]) : []

/** Firestore-document → Overleg; tolerant voor ontbrekende velden. */
export function naarOverleg(id: string, x: Record<string, unknown>): Overleg {
  return {
    id,
    datum: tekst(x.datum, 10),
    titel: tekst(x.titel, 200) || 'Trainersoverleg',
    status: x.status === 'goedgekeurd' ? 'goedgekeurd' : 'concept',
    aanwezig: tekst(x.aanwezig, 1000),
    gasten: tekst(x.gasten, 500),
    punten: lijst(x.punten).map((p, i) => ({
      id: tekst(p.id, 40) || `p${i}`,
      titel: tekst(p.titel, 200),
      tekst: tekst(p.tekst),
      acties: lijst(p.acties).map((a, j) => ({
        id: tekst(a.id, 40) || `a${j}`,
        wie: tekst(a.wie, 200),
        wat: tekst(a.wat, 1000),
        klaar: a.klaar === true,
      })),
    })),
    afspraken: lijst(x.afspraken).map((a, i) => ({
      id: tekst(a.id, 40) || `s${i}`,
      onderwerp: tekst(a.onderwerp, 60) || 'Overig',
      tekst: tekst(a.tekst, 1000),
      vervallen: a.vervallen === true,
    })),
    belangrijkeData: lijst(x.belangrijkeData).map((d) => ({
      datum: tekst(d.datum, 10) || undefined,
      tekst: tekst(d.tekst, 500),
    })),
    bijlage: tekst(x.bijlage, 255) || undefined,
    aangemaaktDoor: tekst(x.aangemaaktDoor, 128) || undefined,
    goedgekeurdDoor: tekst(x.goedgekeurdDoor, 128) || undefined,
  }
}

/** Wijzigen: wie het overleg vastlegde (zolang het concept is) of de coördinator. */
export function magOverlegBewerken(o: Overleg, ik: Trainer | undefined) {
  if (!ik) return false
  if (ik.coordinator) return true
  return o.status === 'concept' && o.aangemaaktDoor === ik.id
}

export interface AfspraakMetBron extends Afspraak {
  overlegId: string
  overlegDatum: string
  concept: boolean
}

/**
 * Alle afspraken uit alle overleggen, per onderwerp (A–Z, "Overig" achteraan),
 * nieuwste overleg eerst binnen een onderwerp.
 */
export function afsprakenPerOnderwerp(
  overleggen: Overleg[],
  { metVervallen = false } = {},
) {
  const groepen = new Map<string, AfspraakMetBron[]>()
  const gesorteerd = [...overleggen].sort((a, b) =>
    b.datum.localeCompare(a.datum),
  )
  for (const o of gesorteerd) {
    for (const a of o.afspraken) {
      if (!a.tekst.trim() || (a.vervallen && !metVervallen)) continue
      const sleutel = a.onderwerp.trim() || 'Overig'
      const lijst = groepen.get(sleutel) ?? []
      lijst.push({
        ...a,
        onderwerp: sleutel,
        overlegId: o.id,
        overlegDatum: o.datum,
        concept: o.status === 'concept',
      })
      groepen.set(sleutel, lijst)
    }
  }
  return [...groepen.entries()]
    .sort(([a], [b]) =>
      a === 'Overig' ? 1 : b === 'Overig' ? -1 : a.localeCompare(b, 'nl'),
    )
    .map(([onderwerp, afspraken]) => ({ onderwerp, afspraken }))
}

export interface ActieMetBron extends OverlegActie {
  overlegId: string
  overlegDatum: string
  punt: string
}

/** Openstaande acties uit alle overleggen, oudste overleg eerst. */
export function openActies(overleggen: Overleg[]): ActieMetBron[] {
  return [...overleggen]
    .sort((a, b) => a.datum.localeCompare(b.datum))
    .flatMap((o) =>
      o.punten.flatMap((p) =>
        p.acties
          .filter((a) => !a.klaar && a.wat.trim())
          .map((a) => ({
            ...a,
            overlegId: o.id,
            overlegDatum: o.datum,
            punt: p.titel,
          })),
      ),
    )
}

/** Unieke id voor een nieuw punt, actie of afspraak. */
export function nieuwId(voorvoegsel: string) {
  return `${voorvoegsel}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}
