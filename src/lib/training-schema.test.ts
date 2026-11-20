// @vitest-environment node
// Fix: fix-32 — trainingsschema uit de pdf van 15 november inlezen
import { readFileSync } from 'node:fs'

import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { describe, expect, it } from 'vitest'

import {
  leesMeters,
  leesTrainingSchema,
  type Tekstdeel,
} from './training-schema'

async function delenUit(pad: string): Promise<Tekstdeel[]> {
  const pdf = await getDocument({
    data: new Uint8Array(readFileSync(pad)),
    verbosity: 0,
  }).promise
  const delen: Tekstdeel[] = []
  for (let p = 1; p <= pdf.numPages; p++) {
    const inhoud = await (await pdf.getPage(p)).getTextContent()
    for (const it of inhoud.items) {
      if ('str' in it)
        delen.push({
          pagina: p,
          x: it.transform[4],
          y: it.transform[5],
          tekst: it.str,
        })
    }
  }
  return delen
}

describe('trainingsschema inlezen', () => {
  it('leest meters', () => {
    expect(leesMeters('3 x 25 m')).toBe(75)
    expect(leesMeters('4 x 100 m wisselslag')).toBe(400)
    expect(leesMeters('1.675 m')).toBe(1675)
    expect(leesMeters('400 m')).toBe(400)
  })

  it('neemt de training van 15 november over', async () => {
    const s = leesTrainingSchema(
      await delenUit('tests/fixtures/training-15-november.pdf'),
    )!
    expect(s).not.toBeNull()
    expect(s.datum).toBe('2026-11-15')
    expect(s.dag).toBe('zondag')
    expect(s.blokken).toHaveLength(7)
    expect(s.blokken.map((b) => b.meters)).toEqual([
      400, 75, 400, 300, 200, 100, 200,
    ])
    expect(s.blokken.reduce((n, b) => n + b.meters, 0)).toBe(s.totaal)
    expect(s.blokken[0]).toMatchObject({ onderdeel: 'Inzwemmen' })
    expect(s.blokken[0].omschrijving).toMatch(
      /^400 m \(8 min\): 200 vrij, daarna 4 x 50 .*rust 10 sec\.$/,
    )
    expect(s.blokken[1].omschrijving).toMatch(
      /^Starts op fluitsignaal – 3 x 25 m \(5 min\): Zoals op de wedstrijd/,
    )
    expect(s.blokken[2].omschrijving).toMatch(
      /^Wisselslag – 4 x 100 m wisselslag \(11 min\)/,
    )
    expect(s.blokken[6]).toMatchObject({ onderdeel: 'Uitzwemmen', meters: 200 })
    expect(s.notities).toMatch(/^60 minuten • 6 banen/)
    expect(s.notities).toMatch(/Aanpassen per baan/)
    expect(s.notities).toMatch(
      /\n• 100%-set bij drukte: splits de baan in twee groepjes\. Groep A zwemt/,
    )
    expect(s.focus).toEqual(
      expect.arrayContaining(['Wisselslag', 'Starts', 'Snelheid', 'Herstel']),
    )
  })

  it('geeft null voor een pdf die het sjabloon niet volgt', () => {
    expect(
      leesTrainingSchema([
        { pagina: 1, x: 10, y: 700, tekst: 'Boodschappenlijst' },
      ]),
    ).toBeNull()
  })
})
