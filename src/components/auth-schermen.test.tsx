// Fix: fix-1 — inlogscherm
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { AuthSchermen } from './auth-schermen'

describe('inloggen', () => {
  it('toont het inlogscherm en valideert het e-mailadres', async () => {
    const user = userEvent.setup()
    render(<AuthSchermen status={{ soort: 'uitgelogd' }} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Inloggen bij de Trainersapp' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('E-mailadres'), 'geen-adres')
    await user.click(screen.getByRole('button', { name: 'Stuur mij een inloglink' }))
    expect(screen.getByText('Vul een geldig e-mailadres in.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Inloggen met Google/ })).toBeInTheDocument()
  })

  it('toont "geen toegang" met het e-mailadres', () => {
    render(<AuthSchermen status={{ soort: 'geen-toegang', user: { email: 'x@y.nl' } as never }} />)
    expect(screen.getByRole('heading', { name: 'Geen toegang' })).toBeInTheDocument()
    expect(screen.getByText('x@y.nl')).toBeInTheDocument()
  })
})
