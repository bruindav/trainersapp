// @vitest-environment node
// Fix: fix-38 — welke tests horen bij de gewijzigde regels van een fix
import { describe, expect, it } from 'vitest'

import { gewijzigdeRegels, testenBijRegels, testsInBron } from '../../scripts/testoverzicht'

const BRON = [
  "describe('a', () => {", // 1
  "  it('eerste', () => {", // 2
  '    expect(1).toBe(1)', // 3
  '  })', // 4
  "  test('tweede', async () => {", // 5
  '    expect(2).toBe(2)', // 6
  '  })', // 7
  '})', // 8
  '', // 9
  '// Fix: fix-9 — nieuw blok', // 10
  "describe('b', () => {", // 11
  "  it(`derde`, () => {})", // 12
  '})', // 13
].join('\n')

describe('testoverzicht', () => {
  it('vindt alle tests met hun regel', () => {
    expect(testsInBron(BRON)).toEqual([
      { regel: 2, naam: 'eerste' },
      { regel: 5, naam: 'tweede' },
      { regel: 12, naam: 'derde' },
    ])
  })

  it('leest de gewijzigde regels uit een diff', () => {
    expect(gewijzigdeRegels('@@ -3 +3 @@\n-a\n+b\n@@ -10,0 +11,3 @@\n+x')).toEqual([3, 11, 12, 13])
  })

  it('koppelt gewijzigde regels aan de test eromheen, niet aan een vorig describe-blok', () => {
    expect(testenBijRegels(BRON, [6])).toEqual(['tweede'])
    // Commentaar, lege regels en de nieuwe describe horen niet bij "tweede".
    expect(testenBijRegels(BRON, [9, 10, 11, 12, 13])).toEqual(['derde'])
  })
})
