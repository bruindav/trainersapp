// Fix: fix-1 — Team-pagina: rechten per rol
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TooltipProvider } from '@/components/ui/tooltip'
import { STANDAARD_JAARPLAN, type AppData } from '@/data/fixtures'
import { __zetTestData } from '@/data/store'
import { Route } from './team'

const TeamPagina = Route.options.component!

function zet(huidigeTrainerId: string) {
  const d: AppData = {
    huidigeTrainerId,
    trainers: [
      { id: 'a', naam: 'Anna de Boer', initialen: 'AB', kleur: '#e64439', rol: 'Hoofdtrainer', specialiteit: '' },
      { id: 'b', naam: 'Bram Smit', initialen: 'BS', kleur: '#2f8fc0', rol: 'Trainer', specialiteit: 'Starts' },
    ],
    uitnodigingen: [
      { email: 'cor@nat.nl', naam: 'Cor', rol: 'Trainer', kleur: '#6f9a0c', specialiteit: '', uitgenodigdOp: '2026-11-19' },
    ],
    afwezigheden: [],
    roosterWijzigingen: {},
    trainingen: [],
    jaarplan: STANDAARD_JAARPLAN,
  }
  __zetTestData(d)
}

describe('Team', () => {
  it('hoofdtrainer ziet uitnodigingen en acties', () => {
    zet('a')
    render(<TooltipProvider><TeamPagina /></TooltipProvider>)
    expect(screen.getByRole('heading', { level: 1, name: 'Team' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Trainer uitnodigen/ }).length).toBeGreaterThan(0)
    expect(screen.getByText('cor@nat.nl', { exact: false })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Acties voor Bram Smit' })).toBeInTheDocument()
  })

  it('gewone trainer ziet alleen de lijst', () => {
    zet('b')
    render(<TooltipProvider><TeamPagina /></TooltipProvider>)
    expect(screen.getByText('Alleen de hoofdtrainer kan het team wijzigen.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Trainer uitnodigen/ })).not.toBeInTheDocument()
    expect(screen.queryByText('cor@nat.nl', { exact: false })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Acties voor/ })).not.toBeInTheDocument()
  })
})
