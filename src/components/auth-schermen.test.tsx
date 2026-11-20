// Fix: fix-27 — demo-account op het inlogscherm
// Fix: fix-19 — inlogscherm alleen met Google
// Fix: fix-1 — inlogscherm
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AuthSchermen } from './auth-schermen'

describe('inloggen', () => {
  it('toont het inlogscherm met alleen Google', () => {
    render(<AuthSchermen status={{ soort: 'uitgelogd' }} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Inloggen bij de Trainersapp' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Inloggen met Google/ })).toBeInTheDocument()
    expect(screen.queryByLabelText('E-mailadres')).not.toBeInTheDocument()
  })

  it('toont het demo-account pas na een klik, zonder wachtwoord in de app', () => {
    render(<AuthSchermen status={{ soort: 'uitgelogd' }} />)
    fireEvent.click(screen.getByRole('button', { name: /demo-account/ }))
    expect(screen.getByLabelText('E-mailadres')).toHaveValue('DemoTrainer@demo.nu')
    expect(screen.getByLabelText('Wachtwoord')).toHaveValue('')
    expect(screen.getByRole('button', { name: /Inloggen als demo/ })).toBeDisabled()
  })

  it('toont "geen toegang" met het e-mailadres', () => {
    render(<AuthSchermen status={{ soort: 'geen-toegang', user: { email: 'x@y.nl' } as never }} />)
    expect(screen.getByRole('heading', { name: 'Geen toegang' })).toBeInTheDocument()
    expect(screen.getByText('x@y.nl')).toBeInTheDocument()
  })
})
