// Fix: fix-21 — jaarplan: opbouwen met fases, zones, wedstrijden; tijdlijn-hulpjes
// Fix: fix-34 — standaarddoel van een training uit de fase van het jaarplan
import {
  STANDAARD_JAARPLAN,
  STANDAARD_ZONES,
  type Evenement,
  type Fase,
  type Jaarplan,
  type Opbouw,
  type Wedstrijd,
  type Zone,
} from './fixtures'
import { daysBetween } from '@/lib/dates'

const isTekst = (v: unknown): v is string => typeof v === 'string'
const tekst = (v: unknown, standaard = '') => (isTekst(v) ? v : standaard)
const lijst = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])

function naarFase(x: Record<string, unknown>, i: number): Fase {
  return {
    id: tekst(x.id, `f${i}`),
    naam: tekst(x.naam, 'Fase'),
    van: tekst(x.van),
    tot: tekst(x.tot),
    kleur: tekst(x.kleur, '#41a8da'),
    doel: tekst(x.doel),
    zones: lijst<unknown>(x.zones).filter(isTekst),
    zonesToelichting: tekst(x.zonesToelichting),
    techniek: tekst(x.techniek),
    letOp: tekst(x.letOp),
    sets: lijst<unknown>(x.sets).filter(isTekst),
  }
}

function naarOpbouw(x: Record<string, unknown>, i: number): Opbouw {
  return {
    id: tekst(x.id, `o${i}`),
    naam: tekst(x.naam, 'Opbouw'),
    inleiding: tekst(x.inleiding),
    doelWedstrijdId: isTekst(x.doelWedstrijdId) && x.doelWedstrijdId ? x.doelWedstrijdId : null,
    aandachtsgebieden: lijst<Record<string, unknown>>(x.aandachtsgebieden).map((a, j) => ({
      id: tekst(a.id, `a${j}`),
      titel: tekst(a.titel),
      tekst: tekst(a.tekst),
    })),
    fases: lijst<Record<string, unknown>>(x.fases).map(naarFase).sort((a, b) => a.van.localeCompare(b.van)),
  }
}

/** Maakt van een (mogelijk oud of onvolledig) Firestore-document een geldig jaarplan. */
export function normaliseerJaarplan(d: Record<string, unknown> | undefined): Jaarplan {
  if (!d) return STANDAARD_JAARPLAN
  const zones = lijst<Record<string, unknown>>(d.zones).map(
    (z, i): Zone => ({
      id: tekst(z.id, `z${i}`),
      naam: tekst(z.naam),
      kleur: tekst(z.kleur, '#41a8da'),
      percentage: tekst(z.percentage),
      omschrijving: tekst(z.omschrijving),
    }),
  )
  return {
    seizoen: tekst(d.seizoen, STANDAARD_JAARPLAN.seizoen),
    van: tekst(d.van, STANDAARD_JAARPLAN.van),
    tot: tekst(d.tot, STANDAARD_JAARPLAN.tot),
    status: d.status === 'gepubliceerd' ? 'gepubliceerd' : 'concept',
    ...(isTekst(d.gepubliceerdOp) ? { gepubliceerdOp: d.gepubliceerdOp } : {}),
    ...(isTekst(d.gepubliceerdDoor) ? { gepubliceerdDoor: d.gepubliceerdDoor } : {}),
    versie: typeof d.versie === 'number' ? d.versie : 0,
    periodes: lijst(d.periodes),
    evenementen: lijst<Evenement>(d.evenementen),
    zones: 'zones' in d ? zones : STANDAARD_ZONES,
    opbouwen: lijst<Record<string, unknown>>(d.opbouwen).map(naarOpbouw),
  }
}

/** Begin en eind van een opbouw = eerste en laatste fase. */
export function opbouwBereik(o: Opbouw): { van: string; tot: string } | null {
  if (o.fases.length === 0) return null
  return {
    van: o.fases.reduce((m, f) => (f.van < m ? f.van : m), o.fases[0].van),
    tot: o.fases.reduce((m, f) => (f.tot > m ? f.tot : m), o.fases[0].tot),
  }
}

/** De opbouwen op volgorde van datum (zonder fases achteraan). */
export function opbouwenOpVolgorde(j: Jaarplan) {
  return [...j.opbouwen].sort((a, b) => (opbouwBereik(a)?.van ?? '9999').localeCompare(opbouwBereik(b)?.van ?? '9999'))
}

/** Welke fase loopt er op deze datum? */
export function faseOp(j: Jaarplan, datum: string): { opbouw: Opbouw; fase: Fase; nummer: number } | null {
  for (const opbouw of j.opbouwen) {
    const i = opbouw.fases.findIndex((f) => f.van <= datum && datum <= f.tot)
    if (i >= 0) return { opbouw, fase: opbouw.fases[i], nummer: i + 1 }
  }
  return null
}

/** De opbouw die nu loopt, anders de eerstvolgende, anders de laatste. */
export function huidigeOpbouw(j: Jaarplan, datum: string): Opbouw | null {
  const lijst = opbouwenOpVolgorde(j)
  return (
    lijst.find((o) => {
      const b = opbouwBereik(o)
      return b && b.van <= datum && datum <= b.tot
    }) ??
    lijst.find((o) => (opbouwBereik(o)?.van ?? '') > datum) ??
    lijst[lijst.length - 1] ??
    null
  )
}

export const reces = (j: Jaarplan) => j.evenementen.filter((e) => e.type === 'Reces')

export function volgendeWedstrijd(wedstrijden: Wedstrijd[], datum: string) {
  return [...wedstrijden].sort((a, b) => a.datum.localeCompare(b.datum)).find((w) => (w.einddatum ?? w.datum) >= datum)
}

export function nieuwId(prefix: string) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

/** Haalt `undefined` weg: Firestore weigert die waarden. */
export function zonderUndefined<T>(o: T): T {
  return JSON.parse(JSON.stringify(o)) as T
}

/** Positie op de tijdlijn in procent van het seizoen. */
export function tijdlijnPositie(seizoenVan: string, seizoenTot: string, van: string, tot = van) {
  const dag = (s: string) => Date.parse(`${s}T12:00:00Z`) / 86_400_000
  const totaal = dag(seizoenTot) - dag(seizoenVan) + 1
  const begin = Math.max(0, dag(van) - dag(seizoenVan))
  const eind = Math.min(totaal, dag(tot) - dag(seizoenVan) + 1)
  return { links: (begin / totaal) * 100, breedte: Math.max(0, ((eind - begin) / totaal) * 100) }
}

/** Platte tekst uit opgemaakte HTML (zonder DOM, ook bruikbaar in tests). */
export function htmlNaarTekst(html: string) {
  return html
    .replace(/<\/(p|li|h\d)>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * fix-34: standaarddoel van een training op `datum`, uit de fase van het jaarplan,
 * bv. "Fase 3, week 1: Wedstrijdspecifieke snelheid. Omslag naar snelheid …".
 */
export function standaardDoel(j: Jaarplan, datum: string): string {
  const f = faseOp(j, datum)
  if (!f) return ''
  const week = Math.floor(daysBetween(f.fase.van, datum) / 7) + 1
  const doel = htmlNaarTekst(f.fase.doel)
  return `Fase ${f.nummer}, week ${week}: ${f.fase.naam}.${doel ? ` ${doel}` : ''}`
}
