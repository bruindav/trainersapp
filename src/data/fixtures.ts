// Fix: fix-34 — training volgens het trainingsschema: opzet, doel, onderdelen met afstand/tijd, per baan, aandachtspunten
// Fix: fix-30 — training: wie hem toevoegde
// Fix: fix-29 — trainingen: meerdere groepen (of hele groep / op inschrijving), focus uitgebreid
// Fix: fix-28 — demo-trainer heeft een vaste id en is een gewone trainer
// Fix: fix-27 — demo-trainer (alleen kijken)
// Fix: fix-21 — taak Wedstrijdcoördinator; jaarplan met opbouwen, zones en wedstrijden
// Fix: fix-17 — namen van testtrainers bijgewerkt
// Fix: fix-11 — ruilverzoeken en wijzigingslog in AppData
// Fix: fix-5 — roosterperiodes en beschikbaarheid in AppData
// Fix: fix-3 — rollen en taken (coördinator, jaarplan, teambeheer, toezicht)
// Fix: fix-2 — testtrainers
// Fix: fix-1 — voorbeelddata vervangen door Firestore; dit bestand bevat nu
// de domeintypes, de vaste clubgegevens (sessies, groepen) en het
// standaard-jaarplan waarmee de app bij de eerste inrichting start.
import { addDays } from '@/lib/dates'
import type { Beschikbaarheid, Roosterperiode, Trainingsmoment } from './rooster'
import type { LogRegel, Ruilverzoek } from './wijzigingen'
import { DEMO_TRAINER_ID, DEMO_TRAINER_NAAM } from './demo-anonimiseer'

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
  /** Wedstrijdcoördinator: voert wedstrijden in (fix-21). */
  wedstrijdBeheer: boolean
}

export const GEEN_TAKEN: Taken = {
  coordinator: false,
  jaarplanBeheer: false,
  teamBeheer: false,
  toezichthouder: false,
  wedstrijdBeheer: false,
}

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
  /** Het demo-account (fix-27): kijkt rond, kan niets opslaan. */
  demo?: boolean
}

/** Demo-account om de app te ontdekken zonder uitnodiging (fix-27). */
export const DEMO_EMAIL = 'demotrainer@demo.nu'

/**
 * Het demo-account kijkt rond als trainer DEMO_TRAINER_ID uit de demodata;
 * deze virtuele versie is alleen een vangnet als die er (nog) niet is.
 */
export function demoTrainer(): Trainer {
  return {
    id: DEMO_TRAINER_ID,
    naam: DEMO_TRAINER_NAAM,
    initialen: 'DT',
    kleur: '#8966a5',
    rol: 'Trainer',
    specialiteit: '',
    email: DEMO_EMAIL,
    coordinator: false,
    jaarplanBeheer: false,
    teamBeheer: false,
    toezichthouder: false,
    wedstrijdBeheer: false,
    demo: true,
  }
}

export const TAAK_LABELS: Record<keyof Taken, string> = {
  coordinator: 'Coördinator',
  jaarplanBeheer: 'Jaarplan',
  teamBeheer: 'Teambeheer',
  toezichthouder: 'Toezichthouder',
  wedstrijdBeheer: 'Wedstrijden',
}

export const magTeamBeheren = (t: Taken | undefined) => !!t && (t.coordinator || t.teamBeheer)
export const magJaarplanBewerken = (t: Taken | undefined) => !!t && (t.coordinator || t.jaarplanBeheer)
export const magWedstrijdenBewerken = (t: Taken | undefined) =>
  !!t && (t.coordinator || t.jaarplanBeheer || t.wedstrijdBeheer)
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
  'Rita Jager',
  'Pim Kool',
  'Marlien Wijnhof',
  'Gert Mooi',
  'Viola X',
  'David Micó Martinez',
  'Jeroen Eskens',
  'Daphne Kuilman',
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

/** Een vaste focus uit ALLE_FOCUS, of een eigen omschrijving ("Anders…"). */
export type Focus = string

export const ALLE_FOCUS: Focus[] = [
  'Techniek',
  'Borstcrawl',
  'Rugslag',
  'Schoolslag',
  'Vlinderslag',
  'Wisselslag',
  'Ademhaling',
  'Keerpunten',
  'Starts',
  'Uithouding',
  'Snelheid',
  'Herstel',
]

export interface TrainingBlok {
  /** Soort onderdeel (voor oudere trainingen en statistiek); bij nieuwe afgeleid uit de naam. */
  onderdeel: 'Inzwemmen' | 'Techniek' | 'Kern' | 'Benen' | 'Armen' | 'Uitzwemmen'
  /** De invulling: wat er gezwommen wordt. */
  omschrijving: string
  meters: number
  /** fix-34: naam zoals in het schema, bv. "Starts op fluitsignaal". */
  naam?: string
  /** fix-34: afstand als tekst, bv. "4 x 100 m wisselslag"; meters worden hieruit berekend. */
  afstand?: string
  /** fix-34: tijd als tekst, bv. "8 min". */
  tijd?: string
}

/** fix-34: aanpassing voor een paar banen, bv. 1-2 (snel): 5 x 100 m wisselslag, circa 1.775 m. */
export interface PerBaan {
  banen: string
  aanpassing: string
  totaal: string
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
  /** Eerste groep uit `groepen` (voor oudere versies van de app). */
  groepId: string
  /** Hele groep, op inschrijving, of een of meer van de GROEPEN (fix-29). */
  groepen: string[]
  trainerId: string
  titel: string
  focus: Focus[]
  blokken: TrainingBlok[]
  notities: string
  /** Bestandsnaam van een geüploade training (pdf/foto), indien aanwezig. */
  bijlage?: string
  /** Wie de training heeft toegevoegd; alleen die mag hem wijzigen (fix-30). */
  aangemaaktDoor?: string
  // fix-34: dezelfde opbouw als het trainingsschema (allemaal optioneel voor oudere trainingen).
  /** Eén regel, bv. "60 minuten • 6 banen, 25 m". */
  opzet?: string
  /** Doel van de training; standaard uit de fase van het jaarplan. */
  doel?: string
  /** Toelichting bij het totaal. */
  totaalToelichting?: string
  /** Toelichting bij "Aanpassen per baan", bv. "de 100%-set is voor iedereen 4 x 50 m". */
  perBaanToelichting?: string
  perBaan?: PerBaan[]
  aandachtspunten?: string[]
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

/** Trainingszone (naslag voor het hele seizoen). */
export interface Zone {
  id: string
  naam: string
  kleur: string
  /** Bijv. "~70%" of "75–85%". */
  percentage: string
  omschrijving: string
}

/** Fase binnen een opbouw (gekleurd blok op de tijdlijn). Teksten zijn opgemaakte HTML. */
export interface Fase {
  id: string
  naam: string
  van: string
  tot: string
  kleur: string
  doel: string
  zones: string[]
  zonesToelichting: string
  techniek: string
  letOp: string
  sets: string[]
}

export interface Aandachtsgebied {
  id: string
  titel: string
  /** Opgemaakte HTML. */
  tekst: string
}

/** Een opbouw naar een doelwedstrijd (bijv. sept–dec naar Frankfurt). */
export interface Opbouw {
  id: string
  naam: string
  /** Opgemaakte HTML. */
  inleiding: string
  doelWedstrijdId: string | null
  aandachtsgebieden: Aandachtsgebied[]
  fases: Fase[]
}

/** Wedstrijd (eigen collectie `wedstrijden`). */
export interface Wedstrijd {
  id: string
  naam: string
  datum: string
  einddatum?: string
  plaats: string
  baan: '' | '25' | '50'
  inschrijvenVoor?: string
  onderVoorbehoud: boolean
  /** Doelwedstrijd: een opbouw werkt hiernaartoe. */
  doel: boolean
  notitie: string
}

export interface Jaarplan {
  seizoen: string
  van: string
  tot: string
  status: 'concept' | 'gepubliceerd'
  gepubliceerdOp?: string
  gepubliceerdDoor?: string
  versie: number
  /** Seizoensoverzicht in blokken (de eerste werkwijze; blijft als alternatief). */
  periodes: Periode[]
  /** Evenementen van het seizoensoverzicht; type 'Reces' = geen training. */
  evenementen: Evenement[]
  zones: Zone[]
  opbouwen: Opbouw[]
}

export const FASE_KLEUREN = [
  { naam: 'Blauw', waarde: '#41a8da' },
  { naam: 'Groen', waarde: '#8cbb15' },
  { naam: 'Geel', waarde: '#ffce00' },
  { naam: 'Oranje', waarde: '#e95e29' },
  { naam: 'Rood', waarde: '#e64439' },
  { naam: 'Paars', waarde: '#8966a5' },
] as const

/** Zones uit de trainingsopbouw van 2026. */
export const STANDAARD_ZONES: Zone[] = [
  { id: 'a0', naam: 'Aeroob 0', kleur: '#9fd3ec', percentage: '< 65%', omschrijving: 'Herstel. Rustige techniekopdrachten, laag tempo.' },
  { id: 'a1', naam: 'Aeroob 1', kleur: '#41a8da', percentage: '~70%', omschrijving: 'Opbouw aerobe capaciteit (VO2max), rustig duurtempo.' },
  { id: 'a2', naam: 'Aeroob 2', kleur: '#8cbb15', percentage: '75–85%', omschrijving: 'Opbouw aerobe capaciteit, pittig duurtempo.' },
  { id: 'a3', naam: 'Aeroob 3', kleur: '#ffce00', percentage: '85–90%', omschrijving: 'Opbouw aeroob vermogen, intensief duurtempo.' },
  { id: 'lp', naam: 'Lactaatproductie', kleur: '#e95e29', percentage: '90–100%', omschrijving: 'Opbouw anaerobe capaciteit en snelheid.' },
  { id: 'lt', naam: 'Lactaattolerantie', kleur: '#e64439', percentage: '', omschrijving: 'Opbouw anaeroob vermogen, tolerantie voor verzuring, racesimulatie.' },
  { id: 'sp', naam: 'Sprint', kleur: '#8966a5', percentage: 'max', omschrijving: 'Maximale snelheid, kracht en coördinatie.' },
]

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

/** Groepkeuzes bij een training (fix-29), naast de losse GROEPEN. */
export const HELE_GROEP = 'g-hele'
export const OP_INSCHRIJVING = 'g-inschrijving'

/** Leesbare naam voor de groepen van een training, bv. "Basis + Gevorderd". */
export function groepenLabel(groepen: string[]): string {
  if (groepen.includes(HELE_GROEP)) return 'Hele groep'
  if (groepen.includes(OP_INSCHRIJVING)) return 'Op inschrijving'
  const namen = GROEPEN.filter((g) => groepen.includes(g.id)).map((g) => g.naam)
  if (namen.length === GROEPEN.length) return 'Hele groep'
  return namen.join(' + ') || 'Onbekende groep'
}

/** Hoort een training bij groep `groepId` (voor het filter)? Hele groep telt voor iedereen. */
export function trainingVoorGroep(groepen: string[], groepId: string) {
  return groepen.includes(groepId) || groepen.includes(HELE_GROEP)
}

/** Standaardtitel van een training, bv. "Training zondag op 22 november". */
export function standaardTitel(dag: string, datum: string) {
  const [j, m, d] = datum.split('-').map(Number)
  const datumTekst = new Date(j, m - 1, d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })
  return `Training ${dag.toLowerCase()} op ${datumTekst}`
}

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
  zones: STANDAARD_ZONES,
  opbouwen: [],
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
  trainingsmomenten: Trainingsmoment[]
  roosterperiodes: Roosterperiode[]
  /** periodeId → trainerId → beschikbaarheid */
  beschikbaarheid: Record<string, Record<string, Beschikbaarheid>>
  ruilverzoeken: Ruilverzoek[]
  /** Wijzigingen na publicatie, nieuwste eerst. */
  wijzigingslog: LogRegel[]
  afwezigheden: Afwezigheid[]
  /** Handmatige wijzigingen bovenop de rotatie. `null` = open plek. */
  roosterWijzigingen: Record<string, string | null>
  trainingen: Training[]
  jaarplan: Jaarplan
  wedstrijden: Wedstrijd[]
}
