/**
 * VOORBEELDDATA — alle stub-data van de app staat in dit ene bestand.
 *
 * In een volgende mijlpaal (zie PLAN.md) wordt dit vervangen door echte
 * opslag in Netlify Database. Houd de vormen (types) hieronder aan als
 * startpunt voor het databaseschema.
 */
import { addDays, startOfWeek, todayISO } from '@/lib/dates'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TrainerRol = 'Hoofdtrainer' | 'Trainer' | 'Assistent-trainer'

export interface Trainer {
  id: string
  naam: string
  initialen: string
  kleur: string
  rol: TrainerRol
  specialiteit: string
}

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

export const TRAINERS: Trainer[] = [
  { id: 't-sanne', naam: 'Sanne de Wit', initialen: 'SW', kleur: '#e64439', rol: 'Hoofdtrainer', specialiteit: 'Jaarplanning & wedstrijdvoorbereiding' },
  { id: 't-joris', naam: 'Joris Bakker', initialen: 'JB', kleur: '#e95e29', rol: 'Trainer', specialiteit: 'Vlinderslag & starts' },
  { id: 't-mo', naam: 'Mo El Amrani', initialen: 'MA', kleur: '#c99a00', rol: 'Trainer', specialiteit: 'Uithouding & open water' },
  { id: 't-lieke', naam: 'Lieke Jansen', initialen: 'LJ', kleur: '#6f9a0c', rol: 'Trainer', specialiteit: 'Schoolslagtechniek' },
  { id: 't-daan', naam: 'Daan Visser', initialen: 'DV', kleur: '#2f8fc0', rol: 'Trainer', specialiteit: 'Sprint & keerpunten' },
  { id: 't-femke', naam: 'Femke Mulder', initialen: 'FM', kleur: '#8966a5', rol: 'Trainer', specialiteit: 'Rugslag & lijnhouding' },
  { id: 't-ravi', naam: 'Ravi Kortekaas', initialen: 'RK', kleur: '#1f9e89', rol: 'Assistent-trainer', specialiteit: 'Beginnende masters' },
  { id: 't-noor', naam: 'Noor Hendriks', initialen: 'NH', kleur: '#d6458f', rol: 'Assistent-trainer', specialiteit: 'Wisselslag & drills' },
]

/** De trainer die in deze demo "ingelogd" is. */
export const STANDAARD_TRAINER_ID = 't-sanne'

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

/** Rotatie waarmee het rooster voor elke week een voorstel krijgt. */
export function rotatieTrainer(weekStart: string, sessieId: string, groepId: string): string {
  const weekIdx = Math.round(
    (new Date(weekStart).valueOf() - new Date(SEIZOEN_START_WEEK).valueOf()) / (7 * 86400000),
  )
  const s = SESSIES.findIndex((x) => x.id === sessieId)
  const g = GROEPEN.findIndex((x) => x.id === groepId)
  const idx = (((s * GROEPEN.length + g + weekIdx * 3) % TRAINERS.length) + TRAINERS.length) % TRAINERS.length
  return TRAINERS[idx].id
}

export function sessieDatum(weekStart: string, sessie: Sessie): string {
  return addDays(weekStart, sessie.dagIndex)
}

function relatieveFixtures() {
  const vandaag = todayISO()
  const dezeWeek = startOfWeek(vandaag)
  const volgendeWeek = addDays(dezeWeek, 7)

  const afwezigheden: Afwezigheid[] = [
    { trainerId: 't-mo', van: addDays(volgendeWeek, 0), tot: addDays(volgendeWeek, 6), reden: 'Vakantie' },
    { trainerId: 't-femke', van: addDays(dezeWeek, 6), tot: addDays(dezeWeek, 6), reden: 'Eigen wedstrijd' },
  ]

  // Handmatige wijzigingen bovenop de rotatie. `null` = nog open.
  const roosterWijzigingen: Record<string, string | null> = {
    [slotKey(volgendeWeek, 's-zo', 'g-wedstrijd')]: null,
    [slotKey(addDays(volgendeWeek, 7), 's-di', 'g-basis')]: null,
  }

  return { vandaag, dezeWeek, afwezigheden, roosterWijzigingen }
}

// ---------------------------------------------------------------------------
// Trainingen — logboek van de afgelopen weken
// ---------------------------------------------------------------------------

type TrainingSjabloon = Omit<Training, 'id' | 'datum' | 'sessieId' | 'groepId' | 'trainerId'>

const SJABLONEN: Record<string, TrainingSjabloon[]> = {
  'g-basis': [
    {
      titel: 'Lange armen in de borstcrawl',
      focus: ['Techniek', 'Uithouding'],
      blokken: [
        { onderdeel: 'Inzwemmen', omschrijving: '300 vrij, 100 rug, 100 school', meters: 500 },
        { onderdeel: 'Techniek', omschrijving: '6×50 catch-up crawl, 20s rust', meters: 300 },
        { onderdeel: 'Kern', omschrijving: '4×100 vrij op 2:15, tellen per baan', meters: 400 },
        { onderdeel: 'Benen', omschrijving: '4×50 benen met plank', meters: 200 },
        { onderdeel: 'Uitzwemmen', omschrijving: '200 rustig naar keuze', meters: 200 },
      ],
      notities: 'Veel zwemmers verliezen de glijfase bij vermoeidheid — volgende keer weer catch-up erin.',
    },
    {
      titel: 'Schoolslag: timing armen en benen',
      focus: ['Schoolslag', 'Techniek'],
      blokken: [
        { onderdeel: 'Inzwemmen', omschrijving: '400 wissel vrij/school per 50', meters: 400 },
        { onderdeel: 'Techniek', omschrijving: '8×25 school 2× benen 1× armen', meters: 200 },
        { onderdeel: 'Kern', omschrijving: '6×75 school opbouwend, 30s rust', meters: 450 },
        { onderdeel: 'Benen', omschrijving: '4×50 schoolslagbenen op de rug', meters: 200 },
        { onderdeel: 'Uitzwemmen', omschrijving: '150 rustig', meters: 150 },
      ],
      notities: 'Goede sfeer, 14 zwemmers. Twee nieuwe leden van de proeftraining zwommen mee.',
    },
    {
      titel: 'Rugslag en ademhaling',
      focus: ['Rugslag', 'Herstel'],
      blokken: [
        { onderdeel: 'Inzwemmen', omschrijving: '300 vrij, 200 rug', meters: 500 },
        { onderdeel: 'Techniek', omschrijving: '6×50 rug één arm / glas water op voorhoofd', meters: 300 },
        { onderdeel: 'Kern', omschrijving: '3×200 vrij ademhaling 3-5-3 per 50', meters: 600 },
        { onderdeel: 'Uitzwemmen', omschrijving: '100 rustig', meters: 100 },
      ],
      notities: '',
    },
  ],
  'g-gevorderd': [
    {
      titel: 'Piramide vrij met pullbuoy',
      focus: ['Uithouding'],
      blokken: [
        { onderdeel: 'Inzwemmen', omschrijving: '400 vrij, 200 wissel', meters: 600 },
        { onderdeel: 'Kern', omschrijving: '100-200-300-200-100 vrij, 15s rust', meters: 900 },
        { onderdeel: 'Armen', omschrijving: '4×100 pull, ademhaling om de 3', meters: 400 },
        { onderdeel: 'Uitzwemmen', omschrijving: '200 rustig', meters: 200 },
      ],
      notities: 'Piramide liep goed, tempo op de 300 iets te hoog ingezet door baan 4.',
    },
    {
      titel: 'Keerpunten & onderwaterfase',
      focus: ['Keerpunten', 'Techniek'],
      blokken: [
        { onderdeel: 'Inzwemmen', omschrijving: '500 vrij/rug afwisselend', meters: 500 },
        { onderdeel: 'Techniek', omschrijving: '10×25 salto-keerpunt vanaf 5m, 3 dolfijnkicks', meters: 250 },
        { onderdeel: 'Kern', omschrijving: '8×75 vrij, keerpunten op snelheid', meters: 600 },
        { onderdeel: 'Benen', omschrijving: '6×50 dolfijnbenen op de rug', meters: 300 },
        { onderdeel: 'Uitzwemmen', omschrijving: '150 rustig', meters: 150 },
      ],
      notities: 'Aandachtspunt: niet ademen in de eerste slag na het keerpunt.',
    },
    {
      titel: 'Wisselslag-blokken',
      focus: ['Wisselslag', 'Uithouding'],
      blokken: [
        { onderdeel: 'Inzwemmen', omschrijving: '400 vrij, 4×50 wissel', meters: 600 },
        { onderdeel: 'Kern', omschrijving: '6×100 wissel op 2:00', meters: 600 },
        { onderdeel: 'Kern', omschrijving: '4×50 favoriete slag snel', meters: 200 },
        { onderdeel: 'Uitzwemmen', omschrijving: '200 rustig', meters: 200 },
      ],
      notities: '',
    },
  ],
  'g-wedstrijd': [
    {
      titel: 'Lactaat-sets 50m',
      focus: ['Snelheid', 'Starts'],
      blokken: [
        { onderdeel: 'Inzwemmen', omschrijving: '600 wissel, 4×25 versnellen', meters: 700 },
        { onderdeel: 'Techniek', omschrijving: '6× start vanaf blok + 15m', meters: 90 },
        { onderdeel: 'Kern', omschrijving: '2× (4×50 hoofdslag max op 1:30), 200 los tussen', meters: 600 },
        { onderdeel: 'Benen', omschrijving: '6×25 benen sprint', meters: 150 },
        { onderdeel: 'Uitzwemmen', omschrijving: '300 rustig', meters: 300 },
      ],
      notities: 'Tijden genoteerd in de groepsapp. Zuyderzee-zwemmers zitten op schema.',
    },
    {
      titel: 'Vlinderslag ritme en drempel',
      focus: ['Vlinderslag', 'Uithouding'],
      blokken: [
        { onderdeel: 'Inzwemmen', omschrijving: '500 vrij, 200 rug', meters: 700 },
        { onderdeel: 'Techniek', omschrijving: '8×25 vlinder 2 kicks 1 armslag', meters: 200 },
        { onderdeel: 'Kern', omschrijving: '10×100 vrij op drempeltempo, 1:40', meters: 1000 },
        { onderdeel: 'Uitzwemmen', omschrijving: '200 rustig', meters: 200 },
      ],
      notities: 'Drempeltempo voor de meesten rond 1:28–1:35/100.',
    },
    {
      titel: 'Race pace 100m',
      focus: ['Snelheid', 'Keerpunten'],
      blokken: [
        { onderdeel: 'Inzwemmen', omschrijving: '800 opbouwend', meters: 800 },
        { onderdeel: 'Kern', omschrijving: '3× (75 race pace + 25 los), 3 ronden', meters: 900 },
        { onderdeel: 'Armen', omschrijving: '300 pull rustig', meters: 300 },
        { onderdeel: 'Uitzwemmen', omschrijving: '200 rustig', meters: 200 },
      ],
      notities: '',
    },
  ],
}

function genereerTrainingen(dezeWeek: string, vandaag: string, wijzigingen: Record<string, string | null>): Training[] {
  const lijst: Training[] = []
  let teller = 0
  for (const weekOffset of [-14, -7, 0]) {
    const week = addDays(dezeWeek, weekOffset)
    for (const sessie of SESSIES) {
      const datum = sessieDatum(week, sessie)
      if (datum >= vandaag) continue
      GROEPEN.forEach((groep, gi) => {
        teller++
        // Een paar trainingen zijn nog niet ingevuld.
        if (teller % 7 === 0) return
        const key = slotKey(week, sessie.id, groep.id)
        const trainerId = (key in wijzigingen ? wijzigingen[key] : null) ?? rotatieTrainer(week, sessie.id, groep.id)
        const sjablonen = SJABLONEN[groep.id]
        const sjabloon = sjablonen[(teller + gi) % sjablonen.length]
        lijst.push({
          id: `tr-${teller}`,
          datum,
          sessieId: sessie.id,
          groepId: groep.id,
          trainerId,
          ...sjabloon,
          bijlage: teller % 5 === 0 ? `training-${datum}-${groep.naam.toLowerCase()}.pdf` : undefined,
        })
      })
    }
  }
  return lijst.sort((a, b) => (a.datum < b.datum ? 1 : -1))
}

// ---------------------------------------------------------------------------
// Jaarplan seizoen 2026–2027
// ---------------------------------------------------------------------------

export const JAARPLAN: Jaarplan = {
  seizoen: '2026–2027',
  van: '2026-08-31',
  tot: '2027-08-29',
  status: 'gepubliceerd',
  gepubliceerdOp: '2026-09-02',
  gepubliceerdDoor: 't-sanne',
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
// Startdata voor de store
// ---------------------------------------------------------------------------

export function maakStartdata() {
  const { vandaag, dezeWeek, afwezigheden, roosterWijzigingen } = relatieveFixtures()
  return {
    huidigeTrainerId: STANDAARD_TRAINER_ID,
    afwezigheden,
    roosterWijzigingen,
    trainingen: genereerTrainingen(dezeWeek, vandaag, roosterWijzigingen),
    jaarplan: JAARPLAN,
  }
}

export type AppData = ReturnType<typeof maakStartdata>
