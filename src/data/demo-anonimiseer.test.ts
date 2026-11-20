// Fix: fix-28 — tests voor het anonimiseren van de demodata
import { describe, expect, it } from 'vitest'

import {
  DEMO_TRAINER_ID,
  anonimiseerDoc,
  kiesDemoTrainer,
  maakVertaling,
  telBeurten,
  vertaalTekst,
} from './demo-anonimiseer'

const UID_DAVE = 'aB3dE5fG7hI9jK1lM3nO5pQ7rS9t'
const UID_AALDERT = 'zY8xW6vU4tS2rQ0pO8nM6lK4jI2h'
const trainers = [
  { id: UID_DAVE, naam: 'Dave de Bruin' },
  { id: UID_AALDERT, naam: 'Aaldert Micó Martinez' },
]
const v = maakVertaling(
  trainers,
  [{ id: 't1', naam: 'Henk Badje' }],
  UID_AALDERT,
)

describe('demodata anonimiseren', () => {
  it('geeft de gekozen trainer de demo-identiteit en de rest een verzonnen naam', () => {
    expect(v.ids.get(UID_AALDERT)).toBe(DEMO_TRAINER_ID)
    expect(v.ids.get(UID_DAVE)).toBe('demo-t01')
    const dave = anonimiseerDoc(
      'trainers',
      UID_DAVE,
      {
        naam: 'Dave de Bruin',
        email: 'dave@x.nl',
        initialen: 'DB',
        coordinator: true,
      },
      v,
    )
    expect(dave.id).toBe('demo-t01')
    expect(dave.data.naam).not.toMatch(/Dave|Bruin/)
    expect(dave.data).not.toHaveProperty('email')
    expect(dave.data.coordinator).toBe(true)
  })

  it('de demo-trainer is een gewone trainer zonder taken', () => {
    const d = anonimiseerDoc(
      'trainers',
      UID_AALDERT,
      { naam: 'Aaldert', rol: 'Geen training', coordinator: true },
      v,
    )
    expect(d.data).toMatchObject({
      naam: 'Demo Trainer',
      initialen: 'DT',
      rol: 'Trainer',
      coordinator: false,
    })
  })

  it('vervangt namen, ids en e-mailadressen in teksten, ook in sleutels en lijsten', () => {
    expect(
      vertaalTekst('Dave ruilt met aaldert, mail dave@x.nl', v),
    ).not.toMatch(/Dave|aaldert|dave@x\.nl/i)
    expect(vertaalTekst('Davey en Bruinsma blijven', v)).toBe(
      'Davey en Bruinsma blijven',
    )
    expect(vertaalTekst('Henk Badje houdt toezicht', v)).toBe(
      'Badmeester Jansen houdt toezicht',
    )
    const p = anonimiseerDoc(
      'roosterperiodes',
      'p1',
      {
        indeling: { '2026-11-22|m1': { trainers: [UID_DAVE, UID_AALDERT] } },
        vasteTrainers: [UID_DAVE],
      },
      v,
    )
    expect(p.data).toEqual({
      indeling: {
        '2026-11-22|m1': { trainers: ['demo-t01', DEMO_TRAINER_ID] },
      },
      vasteTrainers: ['demo-t01'],
    })
    expect(
      anonimiseerDoc('beschikbaarheid', UID_DAVE, { keuzes: {} }, v).id,
    ).toBe('demo-t01')
  })

  it('laat datums en andere objecten heel en wist redenen van afwezigheid', () => {
    const tijd = new Date('2026-11-20')
    const a = anonimiseerDoc(
      'afwezigheden',
      'a1',
      { trainerId: UID_DAVE, reden: 'Bij de tandarts', op: tijd },
      v,
    )
    expect(a.data).toEqual({
      trainerId: 'demo-t01',
      reden: 'Afwezig',
      op: tijd,
    })
  })

  it('kiest als demo-trainer een gewone trainer met de meeste beurten', () => {
    const lijst = [
      { id: 'a', data: { rol: 'Trainer', coordinator: true } },
      { id: 'b', data: { rol: 'Trainer' } },
      { id: 'c', data: { rol: 'Trainer' } },
      { id: 'd', data: { rol: 'Trainer', test: true } },
    ]
    const beurten = telBeurten(
      [{ x: { trainers: ['a', 'c', 'c', 'd'] } }],
      new Set(['a', 'b', 'c', 'd']),
    )
    expect(kiesDemoTrainer(lijst, beurten)).toBe('c')
    expect(kiesDemoTrainer([], beurten)).toBeNull()
  })
})
