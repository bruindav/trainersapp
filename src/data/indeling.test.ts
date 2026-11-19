// Fix: fix-10 — tests voor het indelingsvoorstel en de waarschuwingen
import { describe, expect, it } from 'vitest'

import { GEEN_TAKEN, type Trainer } from './fixtures'
import { controleer, maakVoorstel, tellingen } from './indeling'
import type { Beschikbaarheid, PeriodeTraining } from './rooster'

const T = (id: string, extra: Partial<Trainer> = {}): Trainer => ({
  id, naam: `${id.toUpperCase()} Test`, initialen: id.toUpperCase(), kleur: '#e64439', rol: 'Trainer', specialiteit: '', ...GEEN_TAKEN, ...extra,
})
const training = (datum: string, nodig = 1, sleutel = 'm1'): PeriodeTraining => ({
  key: `${datum}|${sleutel}`, datum, keuzeSleutel: sleutel, start: '21:00', eind: '22:00', locatie: 'Bad', trainersNodig: nodig, omschrijving: '',
})
const B = (id: string, keuze: 'graag' | 'kan' | 'nee', max: number | null = null, nietKunnen: Beschikbaarheid['nietKunnen'] = []): Beschikbaarheid => ({
  trainerId: id, keuzes: { m1: keuze }, maxPerMaand: max, nietKunnen,
})

describe('maakVoorstel', () => {
  it('neemt alleen wie kan, "graag" eerst, en verdeelt eerlijk', () => {
    const trainers = [T('a'), T('b'), T('c')]
    const besch = { a: B('a', 'graag'), b: B('b', 'graag'), c: B('c', 'kan') }
    const tr = ['2027-01-05', '2027-01-12', '2027-01-19', '2027-01-26'].map((d) => training(d))
    const v = maakVoorstel(tr, trainers, besch)
    const n = tellingen(tr, v)
    expect(n.get('a')).toBe(2)
    expect(n.get('b')).toBe(2)
    expect(n.get('c')).toBeUndefined()
  })
  it('respecteert het maximum per maand en vakanties', () => {
    const trainers = [T('a'), T('b')]
    const besch = { a: B('a', 'graag', 1), b: B('b', 'kan', null, [{ van: '2027-01-12', tot: '2027-01-12' }]) }
    const tr = ['2027-01-05', '2027-01-12', '2027-01-19'].map((d) => training(d))
    const v = maakVoorstel(tr, trainers, besch)
    expect(v['2027-01-05|m1'].trainers).toEqual(['a'])
    expect(v['2027-01-12|m1'].trainers).toEqual([]) // a zit aan max, b kan niet
    expect(v['2027-01-19|m1'].trainers).toEqual(['b'])
  })
  it('zet een assistent niet alleen als er een trainer kan, en kiest toezicht erbij', () => {
    const trainers = [T('as', { rol: 'Assistent-trainer', toezichthouder: false }), T('tr', { toezichthouder: true })]
    const besch = { as: B('as', 'graag'), tr: B('tr', 'kan') }
    const v = maakVoorstel([training('2027-01-05', 1)], trainers, besch)
    expect(v['2027-01-05|m1'].trainers).toEqual(['tr'])
  })
  it('vult twee plekken en houdt een handmatig aantal vast', () => {
    const trainers = [T('a'), T('b'), T('c')]
    const besch = { a: B('a', 'graag'), b: B('b', 'graag'), c: B('c', 'graag') }
    const v = maakVoorstel([training('2027-01-05', 2)], trainers, besch, { '2027-01-05|m1': { trainers: [], nodig: 3 } })
    expect(v['2027-01-05|m1'].trainers).toHaveLength(3)
    expect(v['2027-01-05|m1'].nodig).toBe(3)
  })
})

describe('controleer', () => {
  it('meldt open plek, toezicht, assistent alleen en "kan niet"', () => {
    const trainers = [T('as', { rol: 'Assistent-trainer' })]
    const w = controleer(training('2027-01-05', 2), { trainers: ['as'] }, trainers, { as: B('as', 'nee') })
    expect(w.map((x) => x.soort).sort()).toEqual(['assistent', 'kanNiet', 'open', 'toezicht'])
  })
  it('toezicht is geregeld door een bevoegde trainer of een gekozen toezichthouder', () => {
    const trainers = [T('a', { toezichthouder: true }), T('b')]
    const besch = { a: B('a', 'graag'), b: B('b', 'graag') }
    expect(controleer(training('2027-01-05'), { trainers: ['a'] }, trainers, besch)).toEqual([])
    expect(controleer(training('2027-01-05'), { trainers: ['b'], toezicht: 'groep:z1' }, trainers, besch)).toEqual([])
    expect(controleer(training('2027-01-05'), { trainers: ['b'] }, trainers, besch).map((x) => x.soort)).toEqual(['toezicht'])
  })
})
