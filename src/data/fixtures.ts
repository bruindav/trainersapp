// Fix: fix-3 — rollen en taken (coördinator, jaarplan, teambeheer, toezicht)
// Fix: fix-2 — testtrainers
// Fix: fix-1 — voorbeelddata vervangen door Firestore; dit bestand bevat nu
// de domeintypes, de vaste clubgegevens (sessies, groepen) en het
// standaard-jaarplan waarmee de app bij de eerste inrichting start.
import { addDays } from '@/lib/dates'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Of en hoe iemand training geeft. */
export type TrainerRol = 'Trainer' | 'Assistent-trainer' | 'Geen training'

/** Taken die los van de rol aan iemand worden gegeven. */
export interface Taken {
  /** Deelt het rooster in; mag alles, ook team en jaarplan. */
  coordinator: boolean
  /** Maakt en beheert het jaarplan. */
  jaarplanBeheer: boolean
  /** Nodigt uit en beheert rollen/taken (door de coördinator gedelegeerd). */
  teamBeheer: boolean
  /** Heeft de toezichthouder-bevoegdheid. */
  toezichthouder: boolean
}

export const GEEN_TAKEN: Taken = { coordinator: false, jaarplanBeheer: false, teamBeheer: false, toezichthouder: false }

export interface Trainer extends Taken {
  id: string
  naam: string
  initialen: string
  kleur: string
  rol: TrainerRol
  specialiteit: string
  email?: string
  /** Testtrainer zonder account (alleen om de app uit te proberen). */
  test?: boolean
}

export const TAAK_LABELS: Record<keyof Taken, string> = {
  coordinator: 'Coördinator',
  jaarplanBeheer: 'Jaarplan',
  teamBeheer: 'Teambeheer',
  toezichthouder: 'Toezichthouder',
}

export const magTeamBeheren = (t: Taken | undefined) => !!t && (t.coordinator || t.teamBeheer)
export const magJaarplanBewerken = (t: Taken | undefined) => !!t && (t.coordinator || t.jaarplanBeheer)
export const geeftTraining = (t: Pick<Trainer, 'rol'>) => t.rol !== 'Geen training'

/** Korte omschrijving, bijv. "Trainer · Coördinator". */
export function rolLabel(t: Pick<Trainer, 'rol' | 'coordinator'>) {
  return t.coordinator ? `${t.rol === 'Geen training' ? 'Coördinator' : `${t.rol} · Coördinator`}` : t.rol
}

/** Een toezichthouder uit de aparte groep van de club (nog zonder account). */
export interface Toezichthouder {
  id: string
  naam: string
  notitie: string
}

/** Testtrainers die de hoofdtrainer met één knop kan toevoegen en verwijderen. */
export const TESTTRAINERS = [
  'Aalder Mellema',
  'Elke Rovers',
  'Pim Kool',
  'Marlien Wijnhof',
  'Gert Mooi',
  'Viola X',
  'David Y',
  'Jeroen Eskens',
  'Daphne Z',
] as const

export const ALLE_ROLLEN: TrainerRol[] = ['Trainer', 'Assistent-trainer', 'Geen training']

/** Een uitnodiging; het document-id is het e-mailadres in kleine letters. */
export interface Uitnodiging extends Taken {
  email: string
  naam: string
  rol: TrainerRol
  kleur: string
  specialiteit: string
  uitgenodigdOp: string
}

/** Vaste kleuren voor trainer-avatars (uitzondering op "geen losse hex"). */
export const TRAINER_KLEUREN = [
  { naam: 'Rood', waarde: '#e64439' },
  { naam: 'Oranje', waarde: '#e95e29' },
  { naam: 'Oker', waarde: '#c99a00' },
  { naam: 'Groen', waarde: '#6f9a0c' },
  { naam: 'Blauw', waarde: '#2f8fc0' },
  { naam: 'Paars', waarde: '#8966a5' },
  { naam: 'Zeegroen', waarde: '#1f9e89' },
  { naam: 'Roze', waarde: '#d6458f' },
] as const

export interface Sessie {
  id: string
  dag: string
  /** 0 = maandag … 6 = zondag */
  dagIndex: number
  start: string
  eind: string
  locatie: string
}

export interface Groep {
  id: string
  naam: string
  banen: string
  omschrijving: string
}

export interface Afwezigheid {
  trainerId: string
  van: string
  tot: string
  reden: string
}

export type Focus =
  | 'Techniek'
  | 'Uithouding'
  | 'Snelheid'
  | 'Keerpunten'
  | 'Starts'
  | 'Vlinderslag'
  | 'Rugslag'
  | 'Schoolslag'
  | 'Wisselslag'
  | 'Herstel'

export const ALLE_FOCUS: Focus[] = [
  'Techniek',
  'Uithouding',
  'Snelheid',
  'Keerpunten',
  'Starts',
  'Vlinderslag',
  'Rugslag',
  'Schoolslag',
  'Wisselslag',
  'Herstel',
]

export interface TrainingBlok {
  onderdeel: 'Inzwemmen' | 'Techniek' | 'Kern' | 'Benen' | 'Armen' | 'Uitzwemmen'
  omschrijving: string
  meters: number
}

export const ONDERDELEN: TrainingBlok['onderdeel'][] = [
  'Inzwemmen',
  'Techniek',
  'Kern',
  'Benen',
  'Armen',
  'Uitzwemmen',
]

export interface Training {
  id: string
  datum: string
  sessieId: string
  groepId: string
  trainerId: string
  titel: string
  focus: Focus[]
  blokken: TrainingBlok[]
  notities: string
  /** Bestandsnaam van een geüploade training (pdf/foto), indien aanwezig. */
  bijlage?: string
}

export interface Periode {
  id: string
  naam: string
  van: string
  tot: string
  kleur: string
  doel: string
  accenten: string[]
  metersPerTraining: string
  /** 1 (rustig) – 5 (zwaar) */
  intensiteit: number
}

export interface Evenement {
  id: string
  naam: string
  datum: string
  einddatum?: string
  type: 'Wedstrijd' | 'Kampioenschap' | 'Club' | 'Reces'
  bevestigd: boolean
}

export interface Jaarplan {
  seizoen: string
  van: string
  tot: string
  status: 'concept' | 'gepubliceerd'
  gepubliceerdOp?: string
  gepubliceerdDoor?: string
  versie: number
  periodes: Periode[]
  evenementen: Evenement[]
}

// ---------------------------------------------------------------------------
// Club & trainers
// ---------------------------------------------------------------------------

export const LOCATIE = 'Zwembad De Kwakel, Utrecht'


export const SESSIES: Sessie[] = [
  { id: 's-di', dag: 'Dinsdag', dagIndex: 1, start: '21:00', eind: '22:00', locatie: LOCATIE },
  { id: 's-do', dag: 'Donderdag', dagIndex: 3, start: '21:00', eind: '22:00', locatie: LOCATIE },
  { id: 's-zo', dag: 'Zondag', dagIndex: 6, start: '11:00', eind: '12:00', locatie: LOCATIE },
]

export const GROEPEN: Groep[] = [
  { id: 'g-basis', naam: 'Basis', banen: 'Baan 1–2', omschrijving: 'Techniek en conditie opbouwen' },
  { id: 'g-gevorderd', naam: 'Gevorderd', banen: 'Baan 3–4', omschrijving: 'Alle slagen, hogere omvang' },
  { id: 'g-wedstrijd', naam: 'Wedstrijd', banen: 'Baan 5–6', omschrijving: 'Wedstrijdgerichte sets' },
]

// ---------------------------------------------------------------------------
// Rooster — een vaste rotatie, aangevuld met handmatige wijzigingen.
// ---------------------------------------------------------------------------

const SEIZOEN_START_WEEK = '2026-08-31'

export function slotKey(weekStart: string, sessieId: string, groepId: string) {
  return `${weekStart}|${sessieId}|${groepId}`
}

/**
 * Rotatie waarmee het rooster voor elke week een voorstel krijgt.
 * `trainerIds` is de (gesorteerde) lijst trainers; leeg = geen voorstel.
 */
export function rotatieTrainer(
  weekStart: string,
  sessieId: string,
  groepId: string,
  trainerIds: readonly string[],
): string | null {
  if (trainerIds.length === 0) return null
  const weekIdx = Math.round(
    (new Date(weekStart).valueOf() - new Date(SEIZOEN_START_WEEK).valueOf()) / (7 * 86400000),
  )
  const s = SESSIES.findIndex((x) => x.id === sessieId)
  const g = GROEPEN.findIndex((x) => x.id === groepId)
  const n = trainerIds.length
  const idx = (((s * GROEPEN.length + g + weekIdx * 3) % n) + n) % n
  return trainerIds[idx]
}

export function sessieDatum(weekStart: string, sessie: Sessie): string {
  return addDays(weekStart, sessie.dagIndex)
}

// ---------------------------------------------------------------------------
// Jaarplan seizoen 2026–2027
// ---------------------------------------------------------------------------

/** Standaard-jaarplan; wordt bij de eerste inrichting in Firestore gezet. */
export const STANDAARD_JAARPLAN: Jaarplan = {
  seizoen: '2026–2027',
  van: '2026-08-31',
  tot: '2027-08-29',
  status: 'gepubliceerd',
  gepubliceerdOp: '2026-09-02',
  versie: 3,
  periodes: [
    {
      id: 'p1',
      naam: 'Opstart & techniek',
      van: '2026-08-31',
      tot: '2026-10-11',
      kleur: '#41a8da',
      doel: 'Na de zomer rustig opbouwen; slagtechniek en ligging centraal.',
      accenten: ['Ligging & stroomlijn', 'Ademhaling', 'Lange slagen'],
      metersPerTraining: '1.600–2.000 m',
      intensiteit: 2,
    },
    {
      id: 'p2',
      naam: 'Basisuithouding',
      van: '2026-10-12',
      tot: '2026-12-20',
      kleur: '#8cbb15',
      doel: 'Aerobe basis vergroten en keerpunten automatiseren voor het Zuyderzee-circuit.',
      accenten: ['Drempeltraining', 'Keerpunten', 'Wisselslag'],
      metersPerTraining: '2.000–2.600 m',
      intensiteit: 3,
    },
    {
      id: 'p3',
      naam: 'Kerstreces',
      van: '2026-12-21',
      tot: '2027-01-03',
      kleur: '#bdb2b2',
      doel: 'Geen clubtrainingen; zelf in beweging blijven.',
      accenten: ['Rust'],
      metersPerTraining: '—',
      intensiteit: 1,
    },
    {
      id: 'p4',
      naam: 'Wedstrijdblok winter',
      van: '2027-01-04',
      tot: '2027-02-28',
      kleur: '#e95e29',
      doel: 'Snelheid en race pace; wedstrijden in het Zuyderzee Masterscircuit.',
      accenten: ['Starts', 'Race pace', 'Sprint 50 m'],
      metersPerTraining: '2.200–2.800 m',
      intensiteit: 4,
    },
    {
      id: 'p5',
      naam: 'Ontwikkeling',
      van: '2027-03-01',
      tot: '2027-04-25',
      kleur: '#8966a5',
      doel: 'Zwakke slagen bijwerken en omvang verhogen richting de zomer.',
      accenten: ['Vlinderslag', 'Rugslag', 'Benenwerk'],
      metersPerTraining: '2.400–3.000 m',
      intensiteit: 3,
    },
    {
      id: 'p6',
      naam: 'Voorbereiding EuroGames',
      van: '2027-04-26',
      tot: '2027-06-27',
      kleur: '#e64439',
      doel: 'Specifieke voorbereiding op de afstanden van iedere EuroGames-deelnemer.',
      accenten: ['Wedstrijdafstanden', 'Estafettewissels', 'Race pace'],
      metersPerTraining: '2.600–3.200 m',
      intensiteit: 5,
    },
    {
      id: 'p7',
      naam: 'Taper',
      van: '2027-06-28',
      tot: '2027-07-13',
      kleur: '#ffce00',
      doel: 'Omvang afbouwen, scherpte behouden, fris naar Cardiff.',
      accenten: ['Korte snelle sets', 'Starts & keerpunten', 'Herstel'],
      metersPerTraining: '1.400–1.800 m',
      intensiteit: 2,
    },
    {
      id: 'p8',
      naam: 'Zomerreces',
      van: '2027-07-14',
      tot: '2027-08-29',
      kleur: '#bdb2b2',
      doel: 'EuroGames en daarna zomerstop.',
      accenten: ['Genieten', 'Open water (optioneel)'],
      metersPerTraining: '—',
      intensiteit: 1,
    },
  ],
  evenementen: [
    { id: 'e1', naam: 'Zuyderzee Masterscircuit — wedstrijd 1', datum: '2026-10-17', type: 'Wedstrijd', bevestigd: false },
    { id: 'e2', naam: 'Zuyderzee Masterscircuit — wedstrijd 2', datum: '2026-11-21', type: 'Wedstrijd', bevestigd: false },
    { id: 'e3', naam: 'Kerstzwemmen & borrel', datum: '2026-12-20', type: 'Club', bevestigd: true },
    { id: 'e4', naam: 'Zuyderzee Masterscircuit — wedstrijd 3', datum: '2027-01-23', type: 'Wedstrijd', bevestigd: false },
    { id: 'e5', naam: 'Zuyderzee Masterscircuit — wedstrijd 4', datum: '2027-02-20', type: 'Wedstrijd', bevestigd: false },
    { id: 'e6', naam: 'Clubkampioenschappen', datum: '2027-04-11', type: 'Club', bevestigd: false },
    { id: 'e7', naam: 'EuroGames Cardiff', datum: '2027-07-14', einddatum: '2027-07-17', type: 'Kampioenschap', bevestigd: true },
  ],
}

// ---------------------------------------------------------------------------
// Toestand van de app (gevuld vanuit Firestore)
// ---------------------------------------------------------------------------

export interface AppData {
  /** Firebase-uid van de ingelogde trainer. */
  huidigeTrainerId: string
  trainers: Trainer[]
  uitnodigingen: Uitnodiging[]
  toezichthouders: Toezichthouder[]
  afwezigheden: Afwezigheid[]
  /** Handmatige wijzigingen bovenop de rotatie. `null` = open plek. */
  roosterWijzigingen: Record<string, string | null>
  trainingen: Training[]
  jaarplan: Jaarplan
}
