// Fix: fix-5 — nieuwe velden in testdata
// Fix: fix-3 — rollen en taken in testdata
// Fix: fix-1 — rooktest: elke pagina rendert met data uit de (gemockte) store
import { act, render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { describe, expect, it, vi } from 'vitest'

import { GEEN_TAKEN, STANDAARD_JAARPLAN, type AppData } from '@/data/fixtures'
import { routeTree } from '@/routeTree.gen'

const DATA: AppData = {
  huidigeTrainerId: 'a',
  trainers: [
    { id: 'a', naam: 'Anna de Boer', initialen: 'AB', kleur: '#e64439', rol: 'Trainer', specialiteit: '', ...GEEN_TAKEN, coordinator: true, email: 'anna@nat.nl' },
    { id: 'b', naam: 'Bram Smit', initialen: 'BS', kleur: '#2f8fc0', rol: 'Trainer', specialiteit: 'Starts', ...GEEN_TAKEN },
  ],
  uitnodigingen: [],
  toezichthouders: [],
  trainingsmomenten: [
    { id: 'm1', dag: 1, start: '21:00', eind: '22:00', locatie: 'De Kwakel', trainersNodig: 2, actief: true, volgorde: 1 },
  ],
  roosterperiodes: [
    {
      id: 'p1', naam: 'Hoofdseizoen deel 2', soort: 'wekelijks', van: '2027-01-04', tot: '2027-01-31',
      status: 'beschikbaarheid', deadline: '2026-12-15', momentIds: ['m1'], losseTrainingen: [], vervallenData: [],
    },
  ],
  beschikbaarheid: { p1: { b: { trainerId: 'b', keuzes: { m1: 'graag' }, maxPerMaand: 2, nietKunnen: [] } } },
  afwezigheden: [],
  roosterWijzigingen: {},
  trainingen: [
    {
      id: 't1',
      datum: '2026-11-17',
      sessieId: 's-di',
      groepId: 'g-basis',
      trainerId: 'verwijderd',
      titel: 'Lange armen',
      focus: ['Techniek'],
      blokken: [{ onderdeel: 'Kern', omschrijving: '4x100', meters: 400 }],
      notities: '',
    },
  ],
  jaarplan: STANDAARD_JAARPLAN,
}

vi.mock('@/data/auth', () => ({
  startAuth: () => {},
  logUit: async () => {},
  useAuthStatus: () => ({
    soort: 'ingelogd',
    user: {},
    trainer: { id: 'a', naam: 'Anna de Boer', initialen: 'AB', kleur: '#e64439', rol: 'Trainer', specialiteit: '', ...GEEN_TAKEN, coordinator: true },
  }),
}))

vi.mock('@/data/store', async (orig) => {
  const echt = await orig<typeof import('@/data/store')>()
  return {
    ...echt,
    startSync: () => {
      echt.__zetTestData(DATA)
      return () => {}
    },
  }
})

const PAGINAS: [string, RegExp][] = [
  ['/', /Anna/],
  ['/rooster', /Week \d+/],
  ['/jaarplan', /Jaarplan|Seizoen/],
  ['/trainingen', /getraind/],
  ['/team', /^Team$/],
  ['/periodes', /^Roosterperiodes$/],
  ['/periodes/p1', /^Hoofdseizoen deel 2$/],
  ['/periodes/bestaat-niet', /^Periode niet gevonden$/],
]

describe('pagina’s renderen', () => {
  it.each(PAGINAS)('%s', async (pad, kop) => {
    const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [pad] }) })
    await act(async () => {
      render(<RouterProvider router={router} />)
      await router.load()
    })
    const h1 = await screen.findByRole('heading', { level: 1 })
    expect(h1.textContent).toMatch(kop)
    expect(screen.queryByText('Deze pagina kon niet laden')).not.toBeInTheDocument()
  })
})
