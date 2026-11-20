// Fix: fix-32 — tekst met posities uit een pdf halen (pdf.js, pas geladen als het nodig is)
import type { Tekstdeel } from './training-schema'

export async function leesPdfTekst(bestand: Blob): Promise<Tekstdeel[]> {
  // De legacy-build werkt ook in oudere Safari-versies (doel: Safari 15).
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(await bestand.arrayBuffer()),
    verbosity: 0,
  }).promise
  const delen: Tekstdeel[] = []
  // Een trainingsschema is 1–2 pagina's; meer lezen is niet nodig.
  for (let p = 1; p <= Math.min(pdf.numPages, 4); p++) {
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
  await pdf.destroy()
  return delen
}
