// Fix: fix-28 — demodata: echte gegevens anonimiseren voor het demo-account.
//
// Pure functies (zonder Firebase), gebruikt door scripts/maak-demo-data.ts en
// door de tests. Alleen "erasable" TypeScript, zodat Node het script direct kan draaien.

/** Vaste id van de trainer waarmee het demo-account rondkijkt. */
export const DEMO_TRAINER_ID = 'demo-trainer'
export const DEMO_TRAINER_NAAM = 'Demo Trainer'
/** Voorvoegsel van de collecties met demodata. */
export const DEMO_PREFIX = 'demo_'

const VOORNAMEN = [
  'Anouk',
  'Bram',
  'Charlotte',
  'Daan',
  'Eva',
  'Floris',
  'Gijs',
  'Hanna',
  'Ivo',
  'Julia',
  'Koen',
  'Lotte',
  'Milan',
  'Noor',
  'Olaf',
  'Pien',
  'Quinten',
  'Roos',
  'Sem',
  'Tess',
  'Uri',
  'Vera',
  'Wout',
  'Xandra',
  'Yara',
  'Zep',
  'Ilse',
  'Joris',
  'Merel',
  'Thijs',
]
const ACHTERNAMEN = [
  'Akkerman',
  'Bosman',
  'Claassen',
  'Dijkstra',
  'Evers',
  'Fokkema',
  'Groen',
  'Hoekstra',
  'Israëls',
  'Jonker',
  'Kramer',
  'Lammers',
  'Mulder',
  'Nijland',
  'Oosterhuis',
  'Postma',
  'Quist',
  'Ridder',
  'Smit',
  'Terpstra',
  'Uiterwijk',
  'Visser',
  'Wolters',
  'Zwart',
  'Brouwer',
  'Kuipers',
  'Meijer',
  'Schouten',
  'Vos',
  'Willems',
]
const TOEZICHT_NAMEN = [
  'Badmeester Jansen',
  'Badmeester Pieters',
  'Badmeester De Wit',
  'Badmeester Bakker',
]
const TUSSENVOEGSELS = new Set([
  'van',
  'de',
  'der',
  'den',
  'het',
  'ten',
  'ter',
  'te',
  'la',
  'el',
  'del',
  'da',
  'di',
  'op',
  "'t",
])
const EMAIL = /[^\s@<>"']+@[^\s@<>"']+\.[A-Za-z]{2,}/g

export interface Persoon {
  id: string
  naam: string
}

export interface Vertaling {
  /** Oude id → nieuwe id. */
  ids: Map<string, string>
  /** Oude naam (of naamdeel) → nieuwe naam, langste eerst. */
  namen: [string, string][]
  /** Nieuwe id → nieuwe naam. */
  nieuweNamen: Map<string, string>
}

export function initialen(naam: string) {
  const delen = naam
    .split(/\s+/)
    .filter((d) => d && !TUSSENVOEGSELS.has(d.toLowerCase()))
  const eerste = delen[0]?.[0] ?? '?'
  const laatste = delen.length > 1 ? delen[delen.length - 1][0] : ''
  return (eerste + laatste).toUpperCase()
}

/**
 * Bouwt de vertaaltabel. De trainer met id `demoId` wordt "Demo Trainer" met
 * id DEMO_TRAINER_ID; de anderen krijgen een verzonnen naam en een id demo-tNN.
 */
export function maakVertaling(
  trainers: Persoon[],
  toezicht: Persoon[],
  demoId: string | null,
): Vertaling {
  const ids = new Map<string, string>()
  const namen: [string, string][] = []
  const nieuweNamen = new Map<string, string>()

  const voegNaamToe = (oud: string, nieuw: string) => {
    const oudeDelen = oud
      .split(/\s+/)
      .filter((d) => d.length >= 3 && !TUSSENVOEGSELS.has(d.toLowerCase()))
    const nieuweDelen = nieuw.split(/\s+/)
    if (oud.trim()) namen.push([oud.trim(), nieuw])
    oudeDelen.forEach((deel, i) => {
      namen.push([
        deel,
        i === 0 ? nieuweDelen[0] : nieuweDelen[nieuweDelen.length - 1],
      ])
    })
  }

  const gesorteerd = [...trainers].sort((a, b) => a.id.localeCompare(b.id))
  let n = 0
  gesorteerd.forEach((t) => {
    const isDemo = t.id === demoId
    const nieuwId = isDemo
      ? DEMO_TRAINER_ID
      : `demo-t${String(++n).padStart(2, '0')}`
    const nieuweNaam = isDemo
      ? DEMO_TRAINER_NAAM
      : `${VOORNAMEN[(n - 1) % VOORNAMEN.length]} ${ACHTERNAMEN[(n * 7 - 1) % ACHTERNAMEN.length]}`
    ids.set(t.id, nieuwId)
    nieuweNamen.set(nieuwId, nieuweNaam)
    voegNaamToe(t.naam, nieuweNaam)
  })
  ;[...toezicht]
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach((p, i) => {
      const nieuw =
        TOEZICHT_NAMEN[i % TOEZICHT_NAMEN.length] +
        (i >= TOEZICHT_NAMEN.length ? ` ${i + 1}` : '')
      voegNaamToe(p.naam, nieuw)
    })

  // Langste eerst, zodat "Dave de Bruin" vóór "Dave" wordt vervangen.
  namen.sort((a, b) => b[0].length - a[0].length)
  return { ids, namen, nieuweNamen }
}

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Vervangt ids, namen en e-mailadressen in een tekst. */
export function vertaalTekst(tekst: string, v: Vertaling): string {
  const exact = v.ids.get(tekst)
  if (exact) return exact
  let uit = tekst.replace(EMAIL, 'iemand@voorbeeld.nl')
  v.ids.forEach((nieuw, oud) => {
    // Firebase-uid's zijn lang en uniek genoeg om ook binnen een tekst te vervangen.
    if (oud.length >= 12) uit = uit.split(oud).join(nieuw)
  })
  for (const [oud, nieuw] of v.namen) {
    uit = uit.replace(
      new RegExp(`(?<![\\p{L}\\p{N}])${escape(oud)}(?![\\p{L}\\p{N}])`, 'giu'),
      nieuw,
    )
  }
  return uit
}

function isGewoonObject(x: unknown): x is Record<string, unknown> {
  return (
    typeof x === 'object' &&
    x !== null &&
    Object.getPrototypeOf(x) === Object.prototype
  )
}

/**
 * Loopt door een Firestore-waarde en vertaalt alle teksten en sleutels.
 * Andere objecten (Timestamp, GeoPoint, ...) blijven ongemoeid.
 */
export function vertaalWaarde(x: unknown, v: Vertaling): unknown {
  if (typeof x === 'string') return vertaalTekst(x, v)
  if (Array.isArray(x)) return x.map((y) => vertaalWaarde(y, v))
  if (isGewoonObject(x)) {
    const uit: Record<string, unknown> = {}
    for (const [k, w] of Object.entries(x))
      uit[vertaalTekst(k, v)] = vertaalWaarde(w, v)
    return uit
  }
  return x
}

/** Vertaalt een document per collectie, met extra regels voor persoonlijke velden. */
export function anonimiseerDoc(
  collectie: string,
  id: string,
  data: Record<string, unknown>,
  v: Vertaling,
) {
  const nieuwId = vertaalTekst(id, v)
  const d = vertaalWaarde(data, v) as Record<string, unknown>
  if (collectie === 'trainers') {
    const naam = v.nieuweNamen.get(nieuwId) ?? String(d.naam ?? '')
    d.naam = naam
    d.initialen = initialen(naam)
    delete d.email
    if (nieuwId === DEMO_TRAINER_ID) {
      // Het demo-account kijkt rond als gewone trainer.
      for (const taak of [
        'coordinator',
        'jaarplanBeheer',
        'teamBeheer',
        'toezichthouder',
        'wedstrijdBeheer',
      ])
        d[taak] = false
      if (d.rol === 'Hoofdtrainer' || d.rol === 'Geen training')
        d.rol = 'Trainer'
    }
  }
  if (collectie === 'afwezigheden') d.reden = 'Afwezig'
  if (collectie === 'toezichthouders') d.notitie = ''
  return { id: nieuwId, data: d }
}

/** Kiest de trainer die het demo-account wordt: een gewone trainer met de meeste beurten. */
export function kiesDemoTrainer(
  trainers: { id: string; data: Record<string, unknown> }[],
  beurten: Map<string, number>,
): string | null {
  const gewoon = trainers.filter(({ data: d }) => {
    const taak = [
      'coordinator',
      'jaarplanBeheer',
      'teamBeheer',
      'toezichthouder',
      'wedstrijdBeheer',
    ].some((k) => d[k] === true)
    return (
      !taak &&
      d.test !== true &&
      d.rol !== 'Geen training' &&
      d.rol !== 'Hoofdtrainer'
    )
  })
  const kandidaten = gewoon.length
    ? gewoon
    : trainers.filter(({ data: d }) => d.test !== true)
  if (!kandidaten.length) return null
  return [...kandidaten].sort(
    (a, b) =>
      (beurten.get(b.id) ?? 0) - (beurten.get(a.id) ?? 0) ||
      a.id.localeCompare(b.id),
  )[0].id
}

/** Telt hoe vaak elke trainer in een indeling of rooster voorkomt. */
export function telBeurten(waarden: unknown[], ids: Set<string>) {
  const tel = new Map<string, number>()
  const loop = (x: unknown) => {
    if (typeof x === 'string') {
      if (ids.has(x)) tel.set(x, (tel.get(x) ?? 0) + 1)
    } else if (Array.isArray(x)) x.forEach(loop)
    else if (isGewoonObject(x)) Object.values(x).forEach(loop)
  }
  waarden.forEach(loop)
  return tel
}
