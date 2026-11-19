// Fix: fix-21 — jaarplan: oude documenten, huidige fase, tijdlijn
import { describe, expect, it } from 'vitest'

import { maakVeilig } from '@/components/rijke-tekst'

import { STANDAARD_ZONES } from './fixtures'
import { faseOp, huidigeOpbouw, normaliseerJaarplan, opbouwBereik, tijdlijnPositie, volgendeWedstrijd } from './jaarplan'
import { OPBOUW_SEPT_DEC_2026 } from './jaarplan-voorbeeld'

describe('jaarplan', () => {
  it('een oud document (seizoensoverzicht) krijgt zones en lege opbouwen; de periodes blijven', () => {
    const j = normaliseerJaarplan({ seizoen: '2026–2027', van: '2026-08-31', tot: '2027-08-29', status: 'gepubliceerd', versie: 3, periodes: [{ id: 'p1' }], evenementen: [] })
    expect(j.zones).toEqual(STANDAARD_ZONES)
    expect(j.opbouwen).toEqual([])
    expect(j.periodes).toHaveLength(1)
    expect(j.status).toBe('gepubliceerd')
  })

  it('vindt de fase van vandaag en het bereik van een opbouw', () => {
    const j = normaliseerJaarplan({ opbouwen: [OPBOUW_SEPT_DEC_2026] })
    expect(faseOp(j, '2026-11-19')?.fase.naam).toBe('Wedstrijdspecifieke snelheid')
    expect(faseOp(j, '2026-11-19')?.nummer).toBe(3)
    expect(faseOp(j, '2026-11-09')).toBeNull()
    expect(opbouwBereik(OPBOUW_SEPT_DEC_2026)).toEqual({ van: '2026-09-01', tot: '2026-12-05' })
    expect(huidigeOpbouw(j, '2027-03-01')?.id).toBe(OPBOUW_SEPT_DEC_2026.id)
  })

  it('tijdlijnpositie en volgende wedstrijd', () => {
    expect(tijdlijnPositie('2026-01-01', '2026-01-10', '2026-01-01', '2026-01-05')).toEqual({ links: 0, breedte: 50 })
    const w = (id: string, datum: string) => ({ id, naam: id, datum, plaats: '', baan: '' as const, onderVoorbehoud: false, doel: false, notitie: '' })
    expect(volgendeWedstrijd([w('b', '2027-07-14'), w('a', '2026-12-05')], '2026-11-19')?.id).toBe('a')
  })
})

describe('opgemaakte tekst', () => {
  it('houdt opmaak en kleur, haalt scripts, links en andere stijlen weg', () => {
    const uit = maakVeilig(
      '<p onclick="x()"><strong>Vet</strong> <span style="color: #c4362b; position: fixed">rood</span></p><ul><li>a</li></ul><script>alert(1)</script><a href="javascript:x">link</a><img src=x onerror=alert(1)>',
    )
    expect(uit).toContain('<strong>Vet</strong>')
    expect(uit).toContain('<span style="color: #c4362b">rood</span>')
    expect(uit).toContain('<ul><li>a</li></ul>')
    expect(uit).not.toMatch(/script|onclick|onerror|href|<img|position/)
  })
})
