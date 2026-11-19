// Fix: fix-7 — feestdagen
import { describe, expect, it } from 'vitest'

import { feestdag, paaszondag } from './feestdagen'

describe('feestdagen', () => {
  it('berekent paaszondag', () => {
    expect(paaszondag(2026)).toBe('2026-04-05')
    expect(paaszondag(2027)).toBe('2027-03-28')
  })
  it('vindt feestdagen in 2027', () => {
    expect(feestdag('2027-04-27')).toBe('Koningsdag')
    expect(feestdag('2027-05-06')).toBe('Hemelvaartsdag')
    expect(feestdag('2027-05-16')).toBe('Eerste pinksterdag')
    expect(feestdag('2027-05-17')).toBe('Tweede pinksterdag')
    expect(feestdag('2026-12-24')).toBe('Kerstavond')
    expect(feestdag('2027-01-05')).toBeUndefined()
  })
  it('Koningsdag op zaterdag als 27 april op zondag valt', () => {
    expect(feestdag('2025-04-26')).toBe('Koningsdag')
    expect(feestdag('2025-04-27')).toBeUndefined()
  })
})
