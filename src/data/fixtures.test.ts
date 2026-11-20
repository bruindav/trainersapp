// Fix: fix-29 — groepen en standaardtitel van een training
import { describe, expect, it } from 'vitest'

import {
  HELE_GROEP,
  OP_INSCHRIJVING,
  groepenLabel,
  standaardTitel,
  trainingVoorGroep,
} from './fixtures'

describe('trainingen: groepen en titel', () => {
  it('maakt een leesbare groepnaam', () => {
    expect(groepenLabel([HELE_GROEP])).toBe('Hele groep')
    expect(groepenLabel([OP_INSCHRIJVING])).toBe('Op inschrijving')
    expect(groepenLabel(['g-basis', 'g-wedstrijd'])).toBe('Basis + Wedstrijd')
    expect(groepenLabel(['g-basis', 'g-gevorderd', 'g-wedstrijd'])).toBe(
      'Hele groep',
    )
  })

  it('filter: hele groep telt voor elke groep, op inschrijving alleen voor zichzelf', () => {
    expect(trainingVoorGroep([HELE_GROEP], 'g-basis')).toBe(true)
    expect(trainingVoorGroep(['g-gevorderd'], 'g-basis')).toBe(false)
    expect(trainingVoorGroep([OP_INSCHRIJVING], OP_INSCHRIJVING)).toBe(true)
    expect(trainingVoorGroep([OP_INSCHRIJVING], 'g-basis')).toBe(false)
  })

  it('standaardtitel: Training [dag] op [datum]', () => {
    expect(standaardTitel('Zondag', '2026-11-22')).toBe(
      'Training zondag op 22 november',
    )
  })
})
