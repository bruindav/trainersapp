// Fix: fix-37 — ook notulen (overlegBijlagen) openen
// Fix: fix-32 — bijlagen van trainingen bewaren in Firestore (bijlagen/{trainingId})
//
// Cloud Storage vraagt het betaalde Blaze-abonnement; daarom bewaren we het
// bestand als data-URL in een eigen document (max. 1 MiB per document).
// Foto's worden verkleind; andere bestanden mogen maximaal ~700 kB zijn.
import { doc, getDoc } from 'firebase/firestore'

import { getDb } from './firebase'

/** Grootste data-URL die nog ruim in een Firestore-document past. */
export const MAX_DATA_URL = 950_000
export const MAX_BESTAND_KB = Math.floor((MAX_DATA_URL * 3) / 4 / 1024) - 10

export interface BijlageData {
  naam: string
  type: string
  data: string
}

function leesAlsDataUrl(b: Blob): Promise<string> {
  return new Promise((ok, fout) => {
    const r = new FileReader()
    r.onload = () => ok(String(r.result))
    r.onerror = () => fout(r.error)
    r.readAsDataURL(b)
  })
}

async function verkleinFoto(bestand: File): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(bestand)
    for (const maat of [1800, 1400, 1000]) {
      const schaal = Math.min(1, maat / Math.max(bitmap.width, bitmap.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(bitmap.width * schaal)
      canvas.height = Math.round(bitmap.height * schaal)
      canvas
        .getContext('2d')!
        .drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      const url = canvas.toDataURL('image/jpeg', 0.8)
      if (url.length <= MAX_DATA_URL) return url
    }
  } catch {
    // Bijv. HEIC buiten Safari: valt terug op het originele bestand.
  }
  return null
}

/** Maakt een bijlage klaar om op te slaan, of geeft een foutmelding. */
export async function maakBijlage(
  bestand: File,
): Promise<BijlageData | { fout: string }> {
  const isFoto =
    bestand.type.startsWith('image/') && bestand.type !== 'image/heic'
  if (isFoto) {
    const url = await verkleinFoto(bestand)
    if (url)
      return {
        naam: bestand.name.replace(/\.\w+$/, '') + '.jpg',
        type: 'image/jpeg',
        data: url,
      }
  }
  const data = await leesAlsDataUrl(bestand)
  if (data.length > MAX_DATA_URL)
    return {
      fout: `Dit bestand is te groot (${Math.round(bestand.size / 1024)} kB). Het kan maximaal ${MAX_BESTAND_KB} kB zijn.`,
    }
  return {
    naam: bestand.name,
    type: bestand.type || 'application/octet-stream',
    data,
  }
}

function naarBlob(dataUrl: string) {
  const [kop, inhoud] = dataUrl.split(',', 2)
  const type = kop.match(/^data:([^;]+)/)?.[1] ?? 'application/octet-stream'
  const bytes = Uint8Array.from(atob(inhoud), (c) => c.charCodeAt(0))
  return new Blob([bytes], { type })
}

/** Haalt de bijlage op en opent/downloadt hem. Geeft false als hij niet bewaard is. */
export async function openBijlage(
  id: string,
  collectie: 'bijlagen' | 'overlegBijlagen' = 'bijlagen',
): Promise<boolean> {
  const snap = await getDoc(doc(getDb(), collectie, id))
  if (!snap.exists()) return false
  const b = snap.data() as BijlageData
  const url = URL.createObjectURL(naarBlob(b.data))
  const a = document.createElement('a')
  a.href = url
  a.download = b.naam
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return true
}
