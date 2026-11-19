// Fix: fix-11 — openPlekken met extern en zelf
// Fix: fix-10 — tests voor het indelingsvoorstel en de waarschuwingen
import { describe, expect, it } from 'vitest'

import { GEEN_TAKEN, type Trainer } from './fixtures'
import { controleer, maakVoorstel, openPlekken, tellingen } from './indeling'
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

// Fix: fix-11 — externe trainer en zelf trainen tellen mee bij open plekken
describe('openPlekken met extern en zelf', () => {
  const t = { key: '2027-01-05|m1', datum: '2027-01-05', keuzeSleutel: 'm1', start: '21:00', eind: '22:00', locatie: '', trainersNodig: 2, omschrijving: '' }
  it('een externe trainer vult een plek', () => {
    expect(openPlekken(t, { trainers: ['a'] })).toBe(1)
    expect(openPlekken(t, { trainers: ['a'], extern: 'Kees' })).toBe(0)
  })
  it('zwemmers trainen zelf: geen open plek', () => {
    expect(openPlekken(t, { trainers: [], zelf: true })).toBe(0)
  })
})

// Fix: fix-12 — vaste trainers en invallers
describe('vaste trainers', () => {
  const vast = (datum: string): PeriodeTraining => ({ ...training(datum, 2), vasteTrainers: ['aa', 'dv'] })
  const trainers = [T('aa'), T('dv'), T('x'), T('y')]
  it('vaste trainers staan er altijd, ook zonder ingevulde beschikbaarheid en boven hun maximum', () => {
    const besch = { aa: B('aa', 'graag', 1), x: B('x', 'graag'), y: B('y', 'kan') }
    const v = maakVoorstel([vast('2027-01-10'), vast('2027-01-17')], trainers, besch)
    expect(v['2027-01-10|m1'].trainers).toEqual(['aa', 'dv'])
    expect(v['2027-01-17|m1'].trainers).toEqual(['aa', 'dv'])
  })
  it('kan een vaste trainer niet, dan valt een invaller in', () => {
    const besch = {
      aa: B('aa', 'graag', null, [{ van: '2027-01-10', tot: '2027-01-10' }]),
      x: B('x', 'nee'),
      y: B('y', 'kan'),
    }
    const v = maakVoorstel([vast('2027-01-10')], trainers, besch)
    expect(v['2027-01-10|m1'].trainers).toEqual(['dv', 'y'])
    // Een invaller ('kan') geeft bij een vast moment geen "als het moet"-waarschuwing.
    expect(controleer(vast('2027-01-10'), v['2027-01-10|m1'], trainers, besch).map((w) => w.soort)).not.toContain('alsHetMoet')
  })
})
