// Fix: fix-37 — AppData met overleggen
// Fix: fix-5 — nieuwe velden in testdata
// Fix: fix-3 — rollen en taken in testdata
// Fix: fix-2 — testtrainer-id's
// Fix: fix-1 — logica van rooster-rotatie en hulpfuncties
import { describe, expect, it } from 'vitest'

import { GEEN_TAKEN, STANDAARD_JAARPLAN, rotatieTrainer, type AppData } from './fixtures'
import { initialenVan, roosterVoorWeek, testTrainerId, trainerById, __zetTestData } from './store'

function data(over: Partial<AppData> = {}): AppData {
  return {
    huidigeTrainerId: 'a',
    trainers: [
      { id: 'a', naam: 'Anna de Boer', initialen: 'AB', kleur: '#e64439', rol: 'Trainer', specialiteit: '', ...GEEN_TAKEN, coordinator: true },
      { id: 'b', naam: 'Bram Smit', initialen: 'BS', kleur: '#2f8fc0', rol: 'Trainer', specialiteit: '', ...GEEN_TAKEN },
    ],
    uitnodigingen: [],
    toezichthouders: [],
    trainingsmomenten: [],
    roosterperiodes: [],
    beschikbaarheid: {},
    ruilverzoeken: [],
    wijzigingslog: [],
    afwezigheden: [],
    roosterWijzigingen: {},
    trainingen: [],
    jaarplan: STANDAARD_JAARPLAN,
    wedstrijden: [],
    overleggen: [],
    ...over,
  }
}

describe('rotatie', () => {
  it('geeft geen voorstel zonder trainers', () => {
    expect(rotatieTrainer('2026-11-16', 's-di', 'g-basis', [])).toBeNull()
  })
  it('kiest altijd een bestaande trainer', () => {
    const ids = ['a', 'b', 'c']
    for (const w of ['2026-08-31', '2026-11-16', '2027-03-01']) {
      expect(ids).toContain(rotatieTrainer(w, 's-zo', 'g-wedstrijd', ids))
    }
  })
  it('een handmatige wijziging (ook open plek) gaat voor de rotatie', () => {
    const d = data({ roosterWijzigingen: { '2026-11-16|s-di|g-basis': null } })
    const slot = roosterVoorWeek(d, '2026-11-16').find((s) => s.sessieId === 's-di' && s.groepId === 'g-basis')!
    expect(slot.trainerId).toBeNull()
    expect(slot.gewijzigd).toBe(true)
  })
})

describe('hulpfuncties', () => {
  it('maakt testtrainer-id\'s', () => {
    expect(testTrainerId('Aalder Mellema')).toBe('test-aalder-mellema')
    expect(testTrainerId('Viola X')).toBe('test-viola-x')
  })
  it('maakt initialen', () => {
    expect(initialenVan('Sanne de Wit')).toBe('SW')
    expect(initialenVan('Mo')).toBe('MO')
    expect(initialenVan('  ')).toBe('?')
  })
  it('geeft een vervanger voor een verwijderde trainer', () => {
    __zetTestData(data())
    expect(trainerById('a')?.naam).toBe('Anna de Boer')
    expect(trainerById('weg')?.naam).toBe('Oud-trainer')
    expect(trainerById(null)).toBeUndefined()
  })
})
