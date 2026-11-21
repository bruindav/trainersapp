// Fix: fix-37 — AppData met overleggen
// Fix: fix-36 — nogVastTeLeggen
// Fix: fix-11 — gepubliceerde trainingen en wie een open plek mag overnemen
import { describe, expect, it } from 'vitest'

import { GEEN_TAKEN, STANDAARD_JAARPLAN, type AppData, type Trainer } from './fixtures'
import { gepubliceerdeTrainingen, kanOvernemen, nogVastTeLeggen, staatIngeroosterd } from './wijzigingen'

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
  wedstrijden: [],
  overleggen: [],
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

describe('nogVastTeLeggen (fix-36)', () => {
  const training = (extra: Record<string, unknown>) =>
    ({ id: 'x', datum: '2027-01-05', sessieId: 's-di', groepId: 'g-hele', groepen: ['g-hele'], titel: '', focus: [], blokken: [], notities: '', trainerId: 'b', ...extra }) as AppData['trainingen'][number]
  const met = (trainingen: AppData['trainingen']) => ({ ...data('gepubliceerd'), trainingen })

  it('meldt een ingeroosterde training zonder logboek', () => {
    expect(nogVastTeLeggen(met([]), '2027-01-07').map((g) => g.training.datum)).toEqual(['2027-01-05'])
  })
  it('niet meer als een collega hem al vastlegde op die datum en dat tijdstip', () => {
    expect(nogVastTeLeggen(met([training({ trainerId: 'b', aangemaaktDoor: 'b' })]), '2027-01-07')).toEqual([])
  })
  it('niet meer als ik hem vastlegde, ook met een ander moment', () => {
    expect(nogVastTeLeggen(met([training({ sessieId: 's-zo', trainerId: 'b', aangemaaktDoor: 'a' })]), '2027-01-07')).toEqual([])
  })
  it('wel als er alleen op een andere datum iets staat', () => {
    expect(nogVastTeLeggen(met([training({ datum: '2027-01-04' })]), '2027-01-07')).toHaveLength(1)
  })
})
