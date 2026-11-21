// Fix: fix-37 — AppData met overleggen
// Fix: fix-5 — nieuwe velden in testdata
// Fix: fix-3 — rollen, taken en gedelegeerd teambeheer
// Fix: fix-2 — testtrainers
// Fix: fix-1 — Team-pagina: rechten per rol
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TooltipProvider } from '@/components/ui/tooltip'
import { GEEN_TAKEN, STANDAARD_JAARPLAN, type AppData } from '@/data/fixtures'
import { __zetTestData } from '@/data/store'
import { Route } from './team'

const TeamPagina = Route.options.component!

function zet(huidigeTrainerId: string) {
  const d: AppData = {
    huidigeTrainerId,
    trainers: [
      { id: 'a', naam: 'Anna de Boer', initialen: 'AB', kleur: '#e64439', rol: 'Trainer', specialiteit: '', ...GEEN_TAKEN, coordinator: true },
      { id: 'b', naam: 'Bram Smit', initialen: 'BS', kleur: '#2f8fc0', rol: 'Trainer', specialiteit: 'Starts', ...GEEN_TAKEN },
      { id: 'c', naam: 'Carla Dijk', initialen: 'CD', kleur: '#8966a5', rol: 'Assistent-trainer', specialiteit: '', ...GEEN_TAKEN, teamBeheer: true, toezichthouder: true },
    ],
    uitnodigingen: [
      { email: 'cor@nat.nl', naam: 'Cor', rol: 'Trainer', kleur: '#6f9a0c', specialiteit: '', uitgenodigdOp: '2026-11-19', ...GEEN_TAKEN },
    ],
    toezichthouders: [{ id: 'z1', naam: 'Toos Toezicht', notitie: 'Alleen zondag' }],
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
  }
  __zetTestData(d)
}

describe('Team', () => {
  it('coördinator ziet uitnodigingen, acties en taken', () => {
    zet('a')
    render(<TooltipProvider><TeamPagina /></TooltipProvider>)
    expect(screen.getByRole('heading', { level: 1, name: 'Team' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Teamlid uitnodigen/ }).length).toBeGreaterThan(0)
    expect(screen.getByText('cor@nat.nl', { exact: false })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Acties voor Bram Smit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Testtrainers toevoegen/ })).toBeInTheDocument()
    expect(screen.getByText('Coördinator')).toBeInTheDocument()
    expect(screen.getByText('Toos Toezicht')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Toos Toezicht verwijderen' })).toBeInTheDocument()
  })

  it('teambeheerder beheert het team, maar niet de coördinator', () => {
    zet('c')
    render(<TooltipProvider><TeamPagina /></TooltipProvider>)
    expect(screen.getAllByRole('button', { name: /Teamlid uitnodigen/ }).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Acties voor Bram Smit' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Acties voor Anna de Boer' })).not.toBeInTheDocument()
  })

  it('gewone trainer ziet alleen de lijst', () => {
    zet('b')
    render(<TooltipProvider><TeamPagina /></TooltipProvider>)
    expect(screen.getByText(/Alleen de coördinator/)).toBeInTheDocument()
    expect(screen.getByText('Toos Toezicht')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Toos Toezicht verwijderen' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Teamlid uitnodigen/ })).not.toBeInTheDocument()
    expect(screen.queryByText('cor@nat.nl', { exact: false })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Acties voor/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Testtrainers/ })).not.toBeInTheDocument()
  })
})
