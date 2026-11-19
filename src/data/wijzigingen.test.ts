// Fix: fix-11 — gepubliceerde trainingen en wie een open plek mag overnemen
import { describe, expect, it } from 'vitest'

import { GEEN_TAKEN, STANDAARD_JAARPLAN, type AppData, type Trainer } from './fixtures'
import { gepubliceerdeTrainingen, kanOvernemen, staatIngeroosterd } from './wijzigingen'

const tr = (id: string, extra: Partial<Trainer> = {}): Trainer => ({
  id, naam: id, initialen: id, kleur: '#000', rol: 'Trainer', specialiteit: '', ...GEEN_TAKEN, ...extra,
})

const data = (status: 'indelen' | 'gepubliceerd'): AppData => ({
  huidigeTrainerId: 'a',
  trainers: [tr('a', { toezichthouder: true }), tr('b'), tr('c', { rol: 'Geen training' })],
  uitnodigingen: [],
  toezichthouders: [],
  trainingsmomenten: [{ id: 'm1', dag: 1, start: '21:00', eind: '22:00', locatie: 'K', trainersNodig: 2, actief: true, volgorde: 1 }],
  roosterperiodes: [
    {
      id: 'p', naam: 'P', soort: 'wekelijks', van: '2027-01-04', tot: '2027-01-17', status, deadline: '2026-12-01',
      momentIds: ['m1'], losseTrainingen: [], vervallenData: [],
      indeling: { '2027-01-05|m1': { trainers: ['a'], nodig: 2 }, '2027-01-12|m1': { trainers: ['b'], nodig: 1 } },
      versie: 1,
    },
  ],
  beschikbaarheid: {},
  ruilverzoeken: [],
  wijzigingslog: [],
  afwezigheden: [],
  roosterWijzigingen: {},
  trainingen: [],
  jaarplan: { ...STANDAARD_JAARPLAN, evenementen: [] },
})

describe('gepubliceerdeTrainingen', () => {
  it('alleen uit gepubliceerde periodes, met open plekken en toezicht', () => {
    expect(gepubliceerdeTrainingen(data('indelen'))).toHaveLength(0)
    const [eerste, tweede] = gepubliceerdeTrainingen(data('gepubliceerd'))
    expect(eerste.training.datum).toBe('2027-01-05')
    expect(eerste.open).toBe(1)
    expect(eerste.toezichtOk).toBe(true)
    expect(tweede.open).toBe(0)
    expect(tweede.toezichtOk).toBe(false)
  })
  it('wie mag een open plek overnemen', () => {
    const [eerste, tweede] = gepubliceerdeTrainingen(data('gepubliceerd'))
    expect(staatIngeroosterd(eerste, 'a')).toBe(true)
    expect(kanOvernemen(eerste, tr('a'))).toBe(false) // staat er al op
    expect(kanOvernemen(eerste, tr('b'))).toBe(true)
    expect(kanOvernemen(eerste, tr('c', { rol: 'Geen training' }))).toBe(false)
    expect(kanOvernemen(tweede, tr('a'))).toBe(false) // geen plek open
  })
})
