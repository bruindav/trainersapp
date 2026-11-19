// Fix: fix-7 — feestdag op training
// Fix: fix-5 — trainingen in een periode, kolommen en invulstatus
import { describe, expect, it } from 'vitest'

import {
  STANDAARD_MOMENTEN,
  dagVan,
  isVolledigIngevuld,
  kanNietOp,
  keuzeKolommen,
  trainingenInPeriode,
  type Roosterperiode,
  type Trainingsmoment,
} from './rooster'

const momenten: Trainingsmoment[] = STANDAARD_MOMENTEN.map((m, i) => ({ ...m, id: `m${i + 1}` }))
const jaarplan = {
  evenementen: [{ id: 'r', naam: 'Voorjaarsvakantie', datum: '2027-02-15', einddatum: '2027-02-21', type: 'Reces' as const, bevestigd: true }],
}
const periode: Roosterperiode = {
  id: 'p',
  naam: 'Deel 2',
  soort: 'wekelijks',
  van: '2027-01-04',
  tot: '2027-02-28',
  status: 'beschikbaarheid',
  deadline: null,
  momentIds: ['m1', 'm2', 'm3', 'm4'],
  losseTrainingen: [],
  vervallenData: ['2027-01-07'],
}

describe('trainingenInPeriode', () => {
  it('maandag is dag 0, zondag dag 6', () => {
    expect(dagVan('2027-01-04')).toBe(0)
    expect(dagVan('2027-01-10')).toBe(6)
  })
  it('maakt per week 4 trainingen en slaat reces en vervallen data over', () => {
    const t = trainingenInPeriode(periode, momenten, jaarplan)
    // 8 weken × 4 momenten = 32, min 1 reces-week (4) en 1 vervallen donderdag = 27
    expect(t).toHaveLength(27)
    expect(t.some((x) => x.datum === '2027-01-07')).toBe(false)
    expect(t.some((x) => x.datum >= '2027-02-15' && x.datum <= '2027-02-21')).toBe(false)
    expect(t[0]).toMatchObject({ datum: '2027-01-05', start: '21:00', trainersNodig: 2 })
    // Zondag twee trainingen achter elkaar
    expect(t.filter((x) => x.datum === '2027-01-10').map((x) => x.start)).toEqual(['11:00', '12:00'])
  })
  it('markeert een training op een feestdag', () => {
    const p = { ...periode, van: '2027-04-26', tot: '2027-05-02' }
    const t = trainingenInPeriode(p, momenten, jaarplan)
    expect(t.find((x) => x.datum === '2027-04-27')?.feestdag).toBe('Koningsdag')
    expect(t.find((x) => x.datum === '2027-04-29')?.feestdag).toBeUndefined()
  })
  it('losse trainingen: precies de opgegeven trainingen', () => {
    const los: Roosterperiode = {
      ...periode,
      soort: 'los',
      losseTrainingen: [
        { id: 'b', datum: '2027-07-20', start: '19:00', eind: '20:00', locatie: 'Bad X', trainersNodig: 2, omschrijving: 'Zomer' },
        { id: 'a', datum: '2027-07-13', start: '19:00', eind: '20:00', locatie: 'Bad X', trainersNodig: 1, omschrijving: 'Zomer' },
      ],
    }
    expect(trainingenInPeriode(los, momenten, jaarplan).map((x) => x.keuzeSleutel)).toEqual(['a', 'b'])
    expect(keuzeKolommen(los, momenten).map((k) => k.sleutel)).toEqual(['a', 'b'])
  })
})

describe('beschikbaarheid', () => {
  const b = { trainerId: 't', keuzes: { m1: 'graag' as const, m2: 'nee' as const }, maxPerMaand: 3, nietKunnen: [{ van: '2027-02-01', tot: '2027-02-03' }] }
  it('volledig ingevuld als elke kolom een keuze heeft', () => {
    expect(isVolledigIngevuld(b, ['m1', 'm2'])).toBe(true)
    expect(isVolledigIngevuld(b, ['m1', 'm2', 'm3'])).toBe(false)
    expect(isVolledigIngevuld(undefined, [])).toBe(false)
  })
  it('kan niet op data in een opgegeven bereik', () => {
    expect(kanNietOp(b, '2027-02-02')).toBe(true)
    expect(kanNietOp(b, '2027-02-04')).toBe(false)
  })
})
