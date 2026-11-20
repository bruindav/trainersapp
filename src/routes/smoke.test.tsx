// Fix: fix-30 — eigen training wijzigen
// Fix: fix-29 — training met groepen
// Fix: fix-21 — trainingsopbouw, seizoensoverzicht, wedstrijden
// Fix: fix-20 — help, privacy, disclaimer
// Fix: fix-16 — feedbackpagina
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
      groepen: ['g-basis'],
      trainerId: 'verwijderd',
      titel: 'Lange armen',
      aangemaaktDoor: 'a',
      focus: ['Techniek'],
      blokken: [{ onderdeel: 'Kern', omschrijving: '4x100', meters: 400 }],
      notities: '',
    },
  ],
  jaarplan: STANDAARD_JAARPLAN,
  wedstrijden: [],
}

vi.mock('@/data/feedback', async (orig) => ({
  ...(await orig<typeof import('@/data/feedback')>()),
  useFeedback: () => ({ lijst: [], fout: false }),
}))

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
  ['/feedback', /^Feedback$/],
  ['/jaarplan', /^Trainingsopbouw$/],
  ['/jaarplan/seizoensoverzicht', /^Seizoensoverzicht$/],
  ['/wedstrijden', /^Wedstrijden$/],
  ['/help', /^Hoe werkt de Trainersapp\?$/],
  ['/privacy', /^Privacyverklaring$/],
  ['/disclaimer', /^Disclaimer$/],
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

// Fix: fix-29 — nieuwe training: standaardtitel, groepen en "Anders" bij focus
describe('Nieuwe training', () => {
  it('titel volgt het moment, groepen combineren tot hele groep, eigen focus', async () => {
    const { fireEvent } = await import('@testing-library/react')
    const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/trainingen?nieuw=true'] }) })
    await act(async () => {
      render(<RouterProvider router={router} />)
      await router.load()
    })
    const titel = (await screen.findByLabelText('Titel')) as HTMLInputElement
    expect(titel.value).toMatch(/^Training (dinsdag|donderdag|zondag) op \d+ \w+$/)

    const knop = (naam: RegExp) => screen.getByRole('button', { name: naam })
    expect(knop(/^Hele groep/)).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(knop(/^Basis/))
    fireEvent.click(knop(/^Wedstrijd/))
    expect(knop(/^Hele groep/)).toHaveAttribute('aria-pressed', 'false')
    expect(knop(/^Basis/)).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(knop(/^Gevorderd/))
    expect(knop(/^Hele groep/)).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(knop(/^Op inschrijving/))
    expect(knop(/^Op inschrijving/)).toHaveAttribute('aria-pressed', 'true')
    expect(knop(/^Hele groep/)).toHaveAttribute('aria-pressed', 'false')

    expect(knop(/^Borstcrawl$/)).toBeInTheDocument()
    expect(knop(/^Ademhaling$/)).toBeInTheDocument()
    fireEvent.click(knop(/^Anders/))
    expect(screen.getByLabelText('Andere focus')).toBeInTheDocument()

    fireEvent.change(titel, { target: { value: 'Keerpunten' } })
    expect(titel.value).toBe('Keerpunten')
    fireEvent.click(screen.getByRole('button', { name: 'Terug naar de standaardtitel' }))
    expect(titel.value).toMatch(/^Training /)
  })
})

// Fix: fix-30 — eigen training wijzigen; verwijderen vraagt bevestiging
describe('Training wijzigen', () => {
  it('opent de eigen training in het formulier met de bestaande gegevens', async () => {
    const { fireEvent } = await import('@testing-library/react')
    const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/trainingen?id=t1'] }) })
    await act(async () => {
      render(<RouterProvider router={router} />)
      await router.load()
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Verwijderen' }))
    expect(screen.getByRole('button', { name: 'Ja, verwijderen' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Wijzigen' }))
    expect(await screen.findByRole('heading', { name: 'Training wijzigen' })).toBeInTheDocument()
    expect((screen.getByLabelText('Titel') as HTMLInputElement).value).toBe('Lange armen')
    expect(screen.getByRole('button', { name: /Wijzigingen opslaan/ })).toBeInTheDocument()
  })
})

// Fix: fix-32 — trainingsschema-pdf uploaden vult de velden
vi.mock('@/lib/pdf-tekst', async () => ({
  leesPdfTekst: async () => (await import('../../tests/fixtures/training-15-november.tekst.json')).default,
}))

describe('Trainingsschema uploaden', () => {
  it('neemt onderdelen, notities en focus over uit de pdf', async () => {
    const { fireEvent } = await import('@testing-library/react')
    const userEvent = (await import('@testing-library/user-event')).default
    const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/trainingen?nieuw=true'] }) })
    await act(async () => {
      render(<RouterProvider router={router} />)
      await router.load()
    })
    await userEvent.click(await screen.findByRole('tab', { name: /Bestand uploaden/ }))
    const pdf = new File(['%PDF'], 'training-15-november.pdf', { type: 'application/pdf' })
    await act(async () => {
      fireEvent.change(document.getElementById('n-bestand')!, { target: { files: [pdf] } })
    })
    expect(await screen.findByText(/Overgenomen uit het trainingsschema/)).toBeInTheDocument()
    expect(screen.getAllByLabelText(/^Omschrijving onderdeel/)).toHaveLength(7)
    expect(screen.getByText('1.675 m')).toBeInTheDocument()
    expect((screen.getByLabelText(/Notities/) as HTMLTextAreaElement).value).toMatch(/Aandachtspunten/)
    expect(screen.getByRole('button', { name: /^Wisselslag$/ })).toHaveAttribute('aria-pressed', 'true')
    expect((screen.getByLabelText('Titel') as HTMLInputElement).value).toBe('Training zondag op 15 november')
    expect(screen.getByText(/Bijlage: training-15-november\.pdf/)).toBeInTheDocument()
  })
})

// Fix: fix-33 — een oudere datum kiezen bij een nieuwe training
describe('Andere datum kiezen', () => {
  // Radix Select gebruikt pointer capture en scrollIntoView; jsdom kent die niet.
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.releasePointerCapture ??= () => {}
  Element.prototype.scrollIntoView ??= () => {}
  it('voegt een oudere zondag toe aan de momenten en weigert een maandag', async () => {
    const { fireEvent } = await import('@testing-library/react')
    const userEvent = (await import('@testing-library/user-event')).default
    const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/trainingen?nieuw=true'] }) })
    await act(async () => {
      render(<RouterProvider router={router} />)
      await router.load()
    })
    await userEvent.click(await screen.findByRole('combobox', { name: 'Trainingsmoment' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Andere datum kiezen…' }))
    const datum = await screen.findByLabelText('Datum van de training')
    fireEvent.change(datum, { target: { value: '2026-09-07' } })
    expect(screen.getByText(/Op maandag is er geen training/)).toBeInTheDocument()
    fireEvent.change(datum, { target: { value: '2026-09-06' } })
    expect(screen.queryByLabelText('Datum van de training')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Trainingsmoment' })).toHaveTextContent(/Zondag .*6 sep/i)
    expect((screen.getByLabelText('Titel') as HTMLInputElement).value).toBe('Training zondag op 6 september')
  })
})
