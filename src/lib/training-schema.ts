// Fix: fix-34 — elk deel van het schema in een eigen vak
// Fix: fix-32 — trainingsschema (pdf volgens het vaste sjabloon) inlezen
//
// Het sjabloon (zoals gemaakt in de trainingschats):
//   Training zondag 15 november 2026
//   60 minuten • 6 banen, 25 m • circa 1.675 m (middenbanen)
//   <inleiding>
//   Onderdeel | Afstand | Tijd | Invulling
//   1. Inzwemmen | 400 m | 8 min | ...
//   ...
//   Totaal | 1.675 m | 51 min | ...
//   Aanpassen per baan ... (tabel)
//   Aandachtspunten • ...
//
// Pure functies: de tekst met posities komt uit pdf-tekst.ts (pdf.js).
import { ALLE_FOCUS, type Focus, type PerBaan, type TrainingBlok } from '@/data/fixtures'

/** Een stukje tekst uit de pdf met zijn positie (x van links, y van onder). */
export interface Tekstdeel {
  pagina: number
  x: number
  y: number
  tekst: string
}

export interface TrainingSchema {
  /** ISO-datum uit de titel, bv. 2026-11-15. */
  datum: string
  /** Dagnaam uit de titel, bv. "zondag". */
  dag: string
  opzet: string
  doel: string
  blokken: TrainingBlok[]
  /** Totaal volgens de pdf (meters), als die er staat. */
  totaal: number | null
  totaalToelichting: string
  perBaanToelichting: string
  perBaan: PerBaan[]
  aandachtspunten: string[]
  /** Wat niet in een vak past. */
  notities: string
  focus: Focus[]
}

const MAANDEN = [
  'januari',
  'februari',
  'maart',
  'april',
  'mei',
  'juni',
  'juli',
  'augustus',
  'september',
  'oktober',
  'november',
  'december',
]
const TITEL =
  /^Training\s+(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)\s+(\d{1,2})\s+([a-z]+)\s+(\d{4})/i
const KOPPEN = ['Onderdeel', 'Afstand', 'Tijd', 'Invulling'] as const
const MAX_NOTITIES = 5000

interface Regel {
  pagina: number
  y: number
  delen: Tekstdeel[]
}

/** Groepeert de tekstdelen tot regels (zelfde pagina en hoogte), van boven naar onder. */
export function naarRegels(delen: Tekstdeel[]): Regel[] {
  const regels: Regel[] = []
  const gesorteerd = delen
    .filter((d) => d.tekst.trim())
    .sort((a, b) => a.pagina - b.pagina || b.y - a.y || a.x - b.x)
  for (const d of gesorteerd) {
    const laatste = regels[regels.length - 1]
    if (laatste && laatste.pagina === d.pagina && Math.abs(laatste.y - d.y) < 2)
      laatste.delen.push(d)
    else regels.push({ pagina: d.pagina, y: d.y, delen: [d] })
  }
  for (const r of regels) r.delen.sort((a, b) => a.x - b.x)
  return regels
}

const tekstVan = (r: Regel, scheiding = ' ') =>
  r.delen
    .map((d) => d.tekst.trim())
    .filter(Boolean)
    .join(scheiding)

const plak = (a: string, b: string) =>
  (a ? `${a} ${b}` : b).replace(/\s+/g, ' ').trim()

/** "3 x 25 m" → 75, "4 x 100 m wisselslag" → 400, "1.675 m" → 1675. */
export function leesMeters(afstand: string): number {
  const keer = afstand.match(/(\d+)\s*[x×]\s*(\d+)\s*m\b/i)
  if (keer) return Number(keer[1]) * Number(keer[2])
  const los = afstand.match(/(\d{1,3}(?:\.\d{3})*|\d+)\s*m\b/i)
  return los ? Number(los[1].replace(/\./g, '')) : 0
}

export function onderdeelVan(naam: string): TrainingBlok['onderdeel'] {
  const n = naam.toLowerCase()
  if (n.includes('inzwem')) return 'Inzwemmen'
  if (n.includes('uitzwem')) return 'Uitzwemmen'
  if (n.includes('benen')) return 'Benen'
  if (n.includes('armen')) return 'Armen'
  if (n.includes('techniek') || n.includes('drill')) return 'Techniek'
  return 'Kern'
}

const FOCUS_WOORDEN: [Focus, RegExp][] = [
  ['Techniek', /techniek|drill/i],
  ['Borstcrawl', /borstcrawl/i],
  ['Rugslag', /rugslag/i],
  ['Schoolslag', /schoolslag/i],
  ['Vlinderslag', /vlinderslag/i],
  ['Wisselslag', /wisselslag/i],
  ['Ademhaling', /adem/i],
  ['Keerpunten', /keerpunt/i],
  ['Starts', /\bstarts?\b/i],
  ['Uithouding', /uithouding|aeroob 2|aeroob 3/i],
  ['Snelheid', /snelheid|sprint|100%/i],
  ['Herstel', /herstel/i],
]

/**
 * Leest een training volgens het sjabloon. Geeft null als de pdf niet het
 * sjabloon volgt (geen titel "Training <dag> <datum>" of geen tabel).
 */
export function leesTrainingSchema(delen: Tekstdeel[]): TrainingSchema | null {
  const regels = naarRegels(delen)
  if (!regels.length) return null
  const titel = tekstVan(regels[0]).match(TITEL)
  if (!titel) return null
  const maand = MAANDEN.indexOf(titel[3].toLowerCase())
  if (maand < 0) return null
  const datum = `${titel[4]}-${String(maand + 1).padStart(2, '0')}-${titel[2].padStart(2, '0')}`

  const kopIndex = regels.findIndex((r) =>
    KOPPEN.every((k) => r.delen.some((d) => d.tekst.trim() === k)),
  )
  if (kopIndex < 0) return null
  const kolomX = KOPPEN.map(
    (k) => regels[kopIndex].delen.find((d) => d.tekst.trim() === k)!.x,
  )
  const kolomVan = (x: number) => {
    let k = 0
    kolomX.forEach((kx, i) => {
      if (x >= kx - 3) k = i
    })
    return k
  }

  // Inleiding: alles tussen titel en tabel.
  const inleiding = regels.slice(1, kopIndex).map((r) => tekstVan(r))

  // Tabelrijen: een rij begint met "1. Naam" in de eerste kolom; volgende regels vullen aan.
  const rijen: string[][] = []
  let totaal: number | null = null
  let totaalNoot = ''
  let i = kopIndex + 1
  for (; i < regels.length; i++) {
    const r = regels[i]
    const cellen = ['', '', '', '']
    for (const d of r.delen)
      cellen[kolomVan(d.x)] = plak(cellen[kolomVan(d.x)], d.tekst)
    if (/^totaal\b/i.test(cellen[0])) {
      totaal = leesMeters(cellen[1]) || null
      totaalNoot = cellen[3]
      // Een vervolgregel van de toelichting bij het totaal.
      while (
        i + 1 < regels.length &&
        regels[i + 1].delen.every((d) => kolomVan(d.x) === 3)
      ) {
        totaalNoot = plak(totaalNoot, tekstVan(regels[++i]))
      }
      i++
      break
    }
    if (/^\d+\.\s*/.test(cellen[0]))
      rijen.push(
        cellen.map((c, k) => (k === 0 ? c.replace(/^\d+\.\s*/, '') : c)),
      )
    else if (rijen.length) {
      const rij = rijen[rijen.length - 1]
      cellen.forEach((c, k) => c && (rij[k] = plak(rij[k], c)))
    }
  }
  if (!rijen.length) return null

  const blokken: TrainingBlok[] = rijen.map(([naam, afstand, tijd, invulling]) => ({
    onderdeel: onderdeelVan(naam),
    naam,
    afstand,
    tijd,
    omschrijving: invulling,
    meters: leesMeters(afstand),
  }))

  // Na de tabel: "Aanpassen per baan" (tabel) en "Aandachtspunten" (opsomming).
  let perBaanToelichting = ''
  const perBaan: PerBaan[] = []
  const aandachtspunten: string[] = []
  const overig: string[] = []
  let sectie: 'geen' | 'perBaan' | 'aandacht' = 'geen'
  let baanKoppen: { x: number; tekst: string }[] = []
  for (; i < regels.length; i++) {
    const r = regels[i]
    const tekst = tekstVan(r)
    if (/^aanpassen per baan/i.test(tekst)) {
      sectie = 'perBaan'
      perBaanToelichting = tekst.match(/\((.*)\)/)?.[1] ?? ''
      baanKoppen = []
      continue
    }
    if (/^aandachtspunten\b/i.test(tekst)) {
      sectie = 'aandacht'
      continue
    }
    if (sectie === 'perBaan' && r.delen.length > 1) {
      if (!baanKoppen.length) {
        baanKoppen = r.delen.map((d) => ({ x: d.x, tekst: d.tekst.trim() }))
        continue
      }
      const cellen = baanKoppen.map(() => '')
      for (const d of r.delen) {
        let k = 0
        baanKoppen.forEach((kop, j) => {
          if (d.x >= kop.x - 3) k = j
        })
        cellen[k] = plak(cellen[k], d.tekst)
      }
      const midden = baanKoppen.slice(1, -1).map((kop, j) => `${kop.tekst}: ${cellen[j + 1]}`)
      perBaan.push({
        banen: cellen[0],
        aanpassing: midden.filter((m) => !/:\s*$/.test(m)).join(' · '),
        totaal: baanKoppen.length > 1 ? cellen[cellen.length - 1] : '',
      })
      continue
    }
    if (sectie === 'aandacht') {
      if (tekst.startsWith('•')) aandachtspunten.push(tekst.replace(/^•\s*/, ''))
      else if (aandachtspunten.length) aandachtspunten[aandachtspunten.length - 1] = plak(aandachtspunten[aandachtspunten.length - 1], tekst)
      else overig.push(tekst)
      continue
    }
    overig.push(tekst)
  }

  // Inleiding: eerste regel met "minuten" of "•" is de opzet, de rest is het doel.
  const opzetIndex = inleiding.findIndex((r) => /minuten|•|banen/i.test(r))
  const opzet = opzetIndex === 0 ? inleiding[0] : ''
  const doel = inleiding.slice(opzet ? 1 : 0).join(' ')

  const focusTekst = [doel, ...rijen.map((r) => `${r[0]} ${r[1]}`)].join(' ')
  const focus = FOCUS_WOORDEN.filter(([, re]) => re.test(focusTekst))
    .map(([f]) => f)
    .filter((f) => ALLE_FOCUS.includes(f))

  return {
    datum,
    dag: titel[1].toLowerCase(),
    opzet,
    doel,
    blokken,
    totaal,
    totaalToelichting: totaalNoot,
    perBaanToelichting,
    perBaan,
    aandachtspunten,
    notities: overig.join('\n').slice(0, MAX_NOTITIES),
    focus,
  }
}
