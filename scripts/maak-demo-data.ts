// Fix: fix-37 — demo: voorbeeld-trainersoverleg (de echte overleggen gaan niet mee)
// Fix: fix-28 — demodata maken: kopieert de echte gegevens geanonimiseerd naar demo_*-collecties.
//
// Draait in GitHub Actions (workflow demo-data.yml) met het serviceaccount, dat
// de Firestore-regels omzeilt. Lokaal: FIREBASE_ADMIN_PAD=<map met node_modules>
// en GOOGLE_APPLICATION_CREDENTIALS=<sa.json>, dan `node scripts/maak-demo-data.ts`.
//
// Niet meegekopieerd: uitnodigingen, feedback, config, bijlagen en overleggen (persoonlijk of niet nodig).
import { createRequire } from 'node:module'

import {
  DEMO_PREFIX,
  anonimiseerDoc,
  kiesDemoTrainer,
  maakVertaling,
  telBeurten,
} from '../src/data/demo-anonimiseer.ts'
import { OVERLEG_VOORBEELD } from '../src/data/overleg-voorbeeld.ts'

interface Snap {
  id: string
  data(): Record<string, unknown>
  ref: DocRef
}
interface DocRef {
  id: string
  collection(naam: string): ColRef
  listCollections(): Promise<{ id: string }[]>
}
interface ColRef {
  id: string
  doc(id: string): DocRef
  get(): Promise<{ docs: Snap[] }>
}
interface Batch {
  set(ref: DocRef, data: Record<string, unknown>): void
  commit(): Promise<unknown>
}
interface Db {
  collection(pad: string): ColRef
  listCollections(): Promise<ColRef[]>
  batch(): Batch
  recursiveDelete(ref: ColRef): Promise<void>
}

const require = createRequire(process.env.FIREBASE_ADMIN_PAD ?? import.meta.url)
const admin = require('firebase-admin') as {
  initializeApp(o?: object): unknown
  firestore(): Db
}

const COLLECTIES = [
  'trainers',
  'afwezigheden',
  'roosterWijzigingen',
  'trainingen',
  'jaarplan',
  'wedstrijden',
  'trainingsmomenten',
  'roosterperiodes',
  'ruilverzoeken',
  'toezichthouders',
] as const
const SUBCOLLECTIES = ['beschikbaarheid', 'wijzigingslog'] as const

async function main() {
  admin.initializeApp()
  const db = admin.firestore()

  // 1. Alles lezen.
  const bron = new Map<string, Snap[]>()
  for (const c of COLLECTIES) bron.set(c, (await db.collection(c).get()).docs)
  const sub = new Map<string, Snap[]>() // `${periodeId}/${naam}` → docs
  for (const p of bron.get('roosterperiodes') ?? []) {
    for (const s of SUBCOLLECTIES)
      sub.set(`${p.id}/${s}`, (await p.ref.collection(s).get()).docs)
  }

  // 2. Vertaaltabel: wie wordt de demo-trainer, welke namen worden vervangen.
  const trainers = (bron.get('trainers') ?? []).map((d) => ({
    id: d.id,
    data: d.data(),
  }))
  const ids = new Set(trainers.map((t) => t.id))
  const beurten = telBeurten(
    [
      ...(bron.get('roosterperiodes') ?? []).map((d) => d.data().indeling),
      ...[...sub.entries()]
        .filter(([k]) => k.endsWith('/beschikbaarheid'))
        .flatMap(([, docs]) => docs.map((d) => d.id)),
    ],
    ids,
  )
  const demoId = kiesDemoTrainer(trainers, beurten)
  const vertaling = maakVertaling(
    trainers.map((t) => ({ id: t.id, naam: String(t.data.naam ?? '') })),
    (bron.get('toezichthouders') ?? []).map((d) => ({
      id: d.id,
      naam: String(d.data().naam ?? ''),
    })),
    demoId,
  )

  // 3. Oude demodata weg.
  for (const c of await db.listCollections()) {
    if (c.id.startsWith(DEMO_PREFIX)) await db.recursiveDelete(c)
  }

  // 4. Geanonimiseerd schrijven (in batches van max. 400).
  let batch = db.batch()
  let inBatch = 0
  let totaal = 0
  const schrijf = async (ref: DocRef, data: Record<string, unknown>) => {
    batch.set(ref, data)
    totaal++
    if (++inBatch >= 400) {
      await batch.commit()
      batch = db.batch()
      inBatch = 0
    }
  }
  for (const c of COLLECTIES) {
    for (const d of bron.get(c) ?? []) {
      const { id, data } = anonimiseerDoc(c, d.id, d.data(), vertaling)
      const ref = db.collection(DEMO_PREFIX + c).doc(id)
      await schrijf(ref, data)
      if (c === 'roosterperiodes') {
        for (const s of SUBCOLLECTIES) {
          for (const x of sub.get(`${d.id}/${s}`) ?? []) {
            const y = anonimiseerDoc(s, x.id, x.data(), vertaling)
            await schrijf(ref.collection(DEMO_PREFIX + s).doc(y.id), y.data)
          }
        }
      }
    }
  }
  // Trainersoverleg: echte notulen bevatten namen van mensen buiten het team, dus
  // de demo krijgt alleen het voorbeeld (met verzonnen namen).
  {
    const { id, ...voorbeeld } = OVERLEG_VOORBEELD
    await schrijf(db.collection(DEMO_PREFIX + 'overleggen').doc(id), JSON.parse(JSON.stringify(voorbeeld)))
  }
  if (inBatch) await batch.commit()
  console.log(
    `Demodata klaar: ${totaal} documenten, ${trainers.length} trainers geanonimiseerd.`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
