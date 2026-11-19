// Fix: fix-11 — Mijn rooster, open-plek-balk en verzoeken
// Fix: fix-10 — pagina indelen
// Fix: fix-7 — pagina beschikbaarheid
// Fix: fix-5 — nieuwe velden in testdata
// Fix: fix-3 — rollen en taken in testdata
// Fix: fix-1 — rooktest: elke pagina rendert met data uit de (gemockte) store
import { act, render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { describe, expect, it, vi } from 'vitest'

import { GEEN_TAKEN, STANDAARD_JAARPLAN, type AppData } from '@/data/fixtures'
import { dagVan } from '@/data/rooster'
import { addDays, todayISO } from '@/lib/dates'
import { routeTree } from '@/routeTree.gen'

// Een gepubliceerde periode vanaf vandaag: over 3 dagen staat Anna op het
// rooster (met een open tweede plek), een week later staat Bram er alleen op.
const D1 = addDays(todayISO(), 3)
const D2 = addDays(D1, 7)

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
    { id: 'm2', dag: dagVan(D1), start: '11:00', eind: '12:00', locatie: 'De Kwakel', trainersNodig: 2, actief: true, volgorde: 2 },
  ],
  roosterperiodes: [
    {
      id: 'p1', naam: 'Hoofdseizoen deel 2', soort: 'wekelijks', van: '2027-01-04', tot: '2027-01-31',
      status: 'beschikbaarheid', deadline: '2026-12-15', momentIds: ['m1'], losseTrainingen: [], vervallenData: [],
      indeling: { '2027-01-05|m1': { trainers: ['b'] } }, versie: 0,
    },
    {
      id: 'p2', naam: 'Nu', soort: 'wekelijks', van: todayISO(), tot: addDays(todayISO(), 13),
      status: 'gepubliceerd', deadline: todayISO(), momentIds: ['m2'], losseTrainingen: [], vervallenData: [],
      indeling: { [`${D1}|m2`]: { trainers: ['a'], nodig: 2 }, [`${D2}|m2`]: { trainers: ['b'], nodig: 1 } }, versie: 1,
    },
  ],
  beschikbaarheid: { p1: { b: { trainerId: 'b', keuzes: { m1: 'graag' }, maxPerMaand: 2, nietKunnen: [] } } },
  ruilverzoeken: [
    { id: 'v1', periodeId: 'p2', van: 'b', naar: 'a', vanKey: `${D2}|m2`, terugKey: null, status: 'open', bericht: 'Kun jij?', aangemaaktOp: '' },
  ],
  wijzigingslog: [
    { id: 'l1', periodeId: 'p2', soort: 'vrijgeven', tekst: 'Bram kan niet op di 1 dec: plek vrijgegeven', door: 'b', op: new Date().toISOString() },
  ],
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
  ['/rooster', /^Mijn rooster$/],
  ['/jaarplan', /Jaarplan|Seizoen/],
  ['/trainingen', /getraind/],
  ['/team', /^Team$/],
  ['/periodes', /^Roosterperiodes$/],
  ['/periodes/p1', /^Hoofdseizoen deel 2$/],
  ['/periodes/bestaat-niet', /^Periode niet gevonden$/],
  ['/periodes/p1/indelen', /^Rooster$/],
  ['/periodes/p1/beschikbaarheid', /^Wanneer kun jij trainen\?$/],
  ['/periodes/p1/beschikbaarheid?trainer=b', /^Wanneer kan Bram trainen\?$/],
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

describe('Mijn rooster', () => {
  it('toont open plek, verzoek, eigen training en wijzigingen', async () => {
    const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/rooster'] }) })
    await act(async () => {
      render(<RouterProvider router={router} />)
      await router.load()
    })
    await screen.findByRole('heading', { level: 1 })
    // Open-plek-balk bovenaan (Anna staat er zelf al op, dus geen "Ik neem hem").
    expect(screen.getByRole('region', { name: 'Open plekken' })).toHaveTextContent('Nog geen trainer')
    expect(screen.getByText('Verzoeken voor jou')).toBeInTheDocument()
    expect(screen.getByText(/Bram vraagt: wil jij/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ik kan niet' })).toBeInTheDocument()
    expect(screen.getByText('Recente wijzigingen')).toBeInTheDocument()
    expect(screen.getByText(/plek vrijgegeven/)).toBeInTheDocument()
  })
})
