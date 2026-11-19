// Fix: fix-16 — feedback met screenshot; alleen de coördinator kan het lezen
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { useEffect, useState } from 'react'

import { getDb } from '@/lib/firebase'

export type FeedbackStatus = 'nieuw' | 'afgehandeld'

export interface Feedback {
  id: string
  tekst: string
  pagina: string
  breedte: number
  /** JPEG als data-URL, of leeg als de gebruiker hem niet meestuurde. */
  screenshot: string
  door: string
  naam: string
  op: string
  status: FeedbackStatus
}

/** Firestore-documenten zijn hoogstens 1 MiB; de screenshot blijft hier ruim onder. */
export const MAX_SCREENSHOT = 900_000
export const MAX_TEKST = 2000

export function isVeiligeScreenshot(s: string) {
  return s.startsWith('data:image/jpeg;base64,') && s.length <= MAX_SCREENSHOT
}

/**
 * Maakt een JPEG van wat de gebruiker nu op het scherm ziet (het zichtbare
 * deel van de pagina). Elementen met `data-geen-screenshot` blijven weg.
 */
export async function maakScreenshot(): Promise<string | null> {
  try {
    const { domToCanvas } = await import('modern-screenshot')
    const breedte = document.documentElement.clientWidth
    const schaal = Math.min(1, 1000 / breedte)
    const canvas = await domToCanvas(document.body, {
      scale: schaal,
      backgroundColor: '#ffffff',
      filter: (n) => !(n instanceof HTMLElement && n.dataset.geenScreenshot !== undefined),
    })
    // Alleen het zichtbare stuk uitsnijden.
    const uit = document.createElement('canvas')
    uit.width = Math.round(breedte * schaal)
    uit.height = Math.round(window.innerHeight * schaal)
    const ctx = uit.getContext('2d')
    if (!ctx) return null
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, uit.width, uit.height)
    ctx.drawImage(canvas, 0, -Math.round(window.scrollY * schaal))
    for (const kwaliteit of [0.7, 0.5, 0.35]) {
      const url = uit.toDataURL('image/jpeg', kwaliteit)
      if (isVeiligeScreenshot(url)) return url
    }
    return null
  } catch (err) {
    console.error('Screenshot maken lukte niet', err)
    return null
  }
}

export async function stuurFeedback(f: {
  tekst: string
  pagina: string
  screenshot: string | null
  door: string
  naam: string
}) {
  const ref = doc(collection(getDb(), 'feedback'))
  await setDoc(ref, {
    tekst: f.tekst.trim().slice(0, MAX_TEKST),
    pagina: f.pagina.slice(0, 300),
    breedte: Math.round(window.innerWidth),
    ...(f.screenshot && isVeiligeScreenshot(f.screenshot) ? { screenshot: f.screenshot } : {}),
    door: f.door,
    naam: f.naam.slice(0, 80),
    op: serverTimestamp(),
    status: 'nieuw',
  })
}

export async function zetFeedbackStatus(id: string, status: FeedbackStatus) {
  await updateDoc(doc(getDb(), 'feedback', id), { status })
}

export async function verwijderFeedback(id: string) {
  await deleteDoc(doc(getDb(), 'feedback', id))
}

/** Live lijst met feedback (alleen voor de coördinator; de regels weigeren anderen). */
export function useFeedback(actief: boolean) {
  const [lijst, setLijst] = useState<Feedback[] | null>(null)
  const [fout, setFout] = useState(false)
  useEffect(() => {
    if (!actief) return
    return onSnapshot(
      query(collection(getDb(), 'feedback'), orderBy('op', 'desc')),
      (snap) => {
        setLijst(
          snap.docs.map((d) => {
            const x = d.data()
            return {
              id: d.id,
              tekst: String(x.tekst ?? ''),
              pagina: String(x.pagina ?? ''),
              breedte: Number(x.breedte ?? 0),
              screenshot: typeof x.screenshot === 'string' && isVeiligeScreenshot(x.screenshot) ? x.screenshot : '',
              door: String(x.door ?? ''),
              naam: String(x.naam ?? ''),
              op: x.op?.toDate?.().toISOString?.() ?? new Date().toISOString(),
              status: x.status === 'afgehandeld' ? 'afgehandeld' : 'nieuw',
            }
          }),
        )
      },
      (err) => {
        console.error('Firestore-listener feedback', err)
        setFout(true)
      },
    )
  }, [actief])
  return { lijst, fout }
}
