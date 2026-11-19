// Fix: fix-1 — tests voor firestore.rules (pnpm test:rules)
import { readFileSync } from 'node:fs'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

let env: RulesTestEnvironment

const HOOFD = { uid: 'hoofd', email: 'hoofd@nat.nl' }
const JAARPLAN = {
  seizoen: '2026–2027',
  van: '2026-08-31',
  tot: '2027-08-29',
  status: 'concept',
  versie: 1,
  periodes: [],
  evenementen: [],
}
const TRAINER = { uid: 'trainer', email: 'trainer@nat.nl' }

function trainerDoc(naam: string, rol: string, email: string) {
  return { naam, initialen: 'XX', kleur: '#e64439', rol, specialiteit: '', email }
}

function als(u: { uid: string; email: string }, verified = true) {
  return env.authenticatedContext(u.uid, { email: u.email, email_verified: verified }).firestore()
}

async function seed(fn: (db: ReturnType<RulesTestEnvironment['unauthenticatedContext']>['firestore'] extends () => infer R ? R : never) => Promise<void>) {
  await env.withSecurityRulesDisabled(async (ctx) => fn(ctx.firestore() as never))
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-trainersapp',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8').replace('__HOOFDTRAINER_EMAIL__', HOOFD.email),
    },
  })
})
afterAll(async () => env?.cleanup())
beforeEach(async () => env.clearFirestore())

async function standaardTeam() {
  await seed(async (db) => {
    await setDoc(doc(db, 'config', 'setup'), { hoofdtrainerUid: HOOFD.uid })
    await setDoc(doc(db, 'trainers', HOOFD.uid), trainerDoc('Hoofd', 'Hoofdtrainer', HOOFD.email))
    await setDoc(doc(db, 'trainers', TRAINER.uid), trainerDoc('Trainer', 'Trainer', TRAINER.email))
    await setDoc(doc(db, 'jaarplan', 'huidig'), JAARPLAN)
  })
}

describe('eerste inrichting', () => {
  function inrichtBatch(db: ReturnType<typeof als>, uid: string, email: string, rol = 'Hoofdtrainer') {
    const b = writeBatch(db)
    b.set(doc(db, 'trainers', uid), { ...trainerDoc('Eerste', rol, email), sinds: serverTimestamp() })
    b.set(doc(db, 'config', 'setup'), { hoofdtrainerUid: uid, op: serverTimestamp() })
    b.set(doc(db, 'jaarplan', 'huidig'), JAARPLAN)
    return b.commit()
  }

  it('lukt voor de eerste gebruiker met geverifieerd e-mailadres', async () => {
    await assertSucceeds(inrichtBatch(als(HOOFD), HOOFD.uid, HOOFD.email))
  })
  it('lukt niet zonder geverifieerd e-mailadres', async () => {
    await assertFails(inrichtBatch(als(HOOFD, false), HOOFD.uid, HOOFD.email))
  })
  it('lukt niet voor een ander dan de beoogde hoofdtrainer', async () => {
    const x = { uid: 'indringer', email: 'x@x.nl' }
    await assertFails(inrichtBatch(als(x), x.uid, x.email))
  })
  it('lukt niet als de app al is ingericht', async () => {
    await standaardTeam()
    const x = { uid: 'indringer', email: 'x@x.nl' }
    await assertFails(inrichtBatch(als(x), x.uid, x.email))
  })
  it('zonder config/setup kun je jezelf geen trainer maken', async () => {
    const x = { uid: 'x', email: 'x@x.nl' }
    await assertFails(setDoc(doc(als(x), 'trainers', x.uid), trainerDoc('X', 'Hoofdtrainer', x.email)))
  })
})

describe('toegang', () => {
  beforeEach(standaardTeam)

  it('een willekeurig account kan niets lezen', async () => {
    const db = als({ uid: 'vreemd', email: 'vreemd@x.nl' })
    await assertFails(getDoc(doc(db, 'trainers', HOOFD.uid)))
    await assertFails(getDoc(doc(db, 'jaarplan', 'huidig')))
    await assertFails(setDoc(doc(db, 'trainingen', 't1'), { titel: 'x' }))
  })
  it('een account mag het eigen (niet-bestaande) trainerdocument opvragen', async () => {
    const x = { uid: 'vreemd', email: 'vreemd@x.nl' }
    await assertSucceeds(getDoc(doc(als(x), 'trainers', x.uid)))
  })
  it('niet ingelogd kan niets', async () => {
    const db = env.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(db, 'trainers', HOOFD.uid)))
    await assertFails(getDoc(doc(db, 'config', 'setup')))
  })
  it('een trainer kan lezen', async () => {
    await assertSucceeds(getDoc(doc(als(TRAINER), 'jaarplan', 'huidig')))
    await assertSucceeds(getDoc(doc(als(TRAINER), 'trainers', HOOFD.uid)))
  })
})

describe('uitnodigingen', () => {
  beforeEach(standaardTeam)
  const NIEUW = { uid: 'nieuw', email: 'nieuw@nat.nl' }
  const uitnodiging = {
    email: NIEUW.email,
    naam: 'Nieuw',
    rol: 'Trainer',
    kleur: '#2f8fc0',
    specialiteit: '',
    uitgenodigdOp: '2026-11-19',
  }

  it('alleen de hoofdtrainer kan uitnodigen', async () => {
    await assertFails(setDoc(doc(als(TRAINER), 'uitnodigingen', NIEUW.email), uitnodiging))
    await assertSucceeds(setDoc(doc(als(HOOFD), 'uitnodigingen', NIEUW.email), uitnodiging))
  })
  it('een gewone trainer kan uitnodigingen niet lezen', async () => {
    await assertFails(getDoc(doc(als(TRAINER), 'uitnodigingen', NIEUW.email)))
  })

  function verzilver(db: ReturnType<typeof als>, rol = 'Trainer') {
    const b = writeBatch(db)
    b.set(doc(db, 'trainers', NIEUW.uid), trainerDoc('Nieuw', rol, NIEUW.email))
    b.delete(doc(db, 'uitnodigingen', NIEUW.email))
    return b.commit()
  }

  it('genodigde met geverifieerd adres kan de uitnodiging verzilveren', async () => {
    await seed(async (db) => setDoc(doc(db, 'uitnodigingen', NIEUW.email), uitnodiging))
    await assertSucceeds(getDoc(doc(als(NIEUW), 'uitnodigingen', NIEUW.email)))
    await assertSucceeds(verzilver(als(NIEUW)))
  })
  it('kan zichzelf daarbij geen hogere rol geven', async () => {
    await seed(async (db) => setDoc(doc(db, 'uitnodigingen', NIEUW.email), uitnodiging))
    await assertFails(verzilver(als(NIEUW), 'Hoofdtrainer'))
  })
  it('niet zonder geverifieerd e-mailadres', async () => {
    await seed(async (db) => setDoc(doc(db, 'uitnodigingen', NIEUW.email), uitnodiging))
    await assertFails(verzilver(als(NIEUW, false)))
  })
  it('niet met een ander e-mailadres', async () => {
    await seed(async (db) => setDoc(doc(db, 'uitnodigingen', NIEUW.email), uitnodiging))
    const ander = { uid: NIEUW.uid, email: 'ander@nat.nl' }
    await assertFails(getDoc(doc(als(ander), 'uitnodigingen', NIEUW.email)))
    await assertFails(verzilver(als(ander)))
  })
})

describe('team beheren', () => {
  beforeEach(standaardTeam)

  it('hoofdtrainer kan rol van een ander wijzigen, trainer niet', async () => {
    await assertSucceeds(updateDoc(doc(als(HOOFD), 'trainers', TRAINER.uid), { rol: 'Assistent-trainer' }))
    await assertFails(updateDoc(doc(als(TRAINER), 'trainers', TRAINER.uid), { rol: 'Hoofdtrainer' }))
  })
  it('hoofdtrainer kan de eigen rol niet wijzigen of zichzelf verwijderen', async () => {
    await assertFails(updateDoc(doc(als(HOOFD), 'trainers', HOOFD.uid), { rol: 'Trainer' }))
    await assertFails(deleteDoc(doc(als(HOOFD), 'trainers', HOOFD.uid)))
  })
  it('hoofdtrainer kan een trainer verwijderen', async () => {
    await assertSucceeds(deleteDoc(doc(als(HOOFD), 'trainers', TRAINER.uid)))
  })
  it('config/setup kan niet worden gewijzigd', async () => {
    await assertFails(setDoc(doc(als(HOOFD), 'config', 'setup'), { hoofdtrainerUid: 'x', op: null }))
  })
})

describe('rooster, trainingen en jaarplan', () => {
  beforeEach(standaardTeam)

  const slot = '2026-11-16|s-di|g-basis'
  function wijziging(uid: string, trainerId: string | null) {
    return {
      weekStart: '2026-11-16',
      sessieId: 's-di',
      groepId: 'g-basis',
      trainerId,
      gewijzigdDoor: uid,
      gewijzigdOp: serverTimestamp(),
    }
  }

  it('trainer kan het rooster aanpassen', async () => {
    await assertSucceeds(setDoc(doc(als(TRAINER), 'roosterWijzigingen', slot), wijziging(TRAINER.uid, HOOFD.uid)))
    await assertSucceeds(setDoc(doc(als(TRAINER), 'roosterWijzigingen', slot), wijziging(TRAINER.uid, null)))
  })
  it('rooster: geen onbekende trainer, geen verkeerd id, niet namens een ander', async () => {
    await assertFails(setDoc(doc(als(TRAINER), 'roosterWijzigingen', slot), wijziging(TRAINER.uid, 'bestaat-niet')))
    await assertFails(
      setDoc(doc(als(TRAINER), 'roosterWijzigingen', '2026-11-23|s-di|g-basis'), wijziging(TRAINER.uid, null)),
    )
    await assertFails(setDoc(doc(als(TRAINER), 'roosterWijzigingen', slot), wijziging(HOOFD.uid, null)))
  })

  const training = (door: string) => ({
    datum: '2026-11-17',
    sessieId: 's-di',
    groepId: 'g-basis',
    trainerId: TRAINER.uid,
    titel: 'Test',
    focus: ['Techniek'],
    blokken: [{ onderdeel: 'Kern', omschrijving: '4x100', meters: 400 }],
    notities: '',
    aangemaaktDoor: door,
    aangemaaktOp: serverTimestamp(),
  })

  it('trainer kan een training vastleggen en de eigen training verwijderen', async () => {
    await assertSucceeds(setDoc(doc(als(TRAINER), 'trainingen', 't1'), training(TRAINER.uid)))
    await assertSucceeds(deleteDoc(doc(als(TRAINER), 'trainingen', 't1')))
  })
  it('training niet namens een ander vastleggen; andermans training niet verwijderen', async () => {
    await assertFails(setDoc(doc(als(TRAINER), 'trainingen', 't1'), training(HOOFD.uid)))
    await seed(async (db) =>
      setDoc(doc(db, 'trainingen', 't2'), { ...training(HOOFD.uid), trainerId: HOOFD.uid, aangemaaktOp: null }),
    )
    await assertFails(deleteDoc(doc(als(TRAINER), 'trainingen', 't2')))
    await assertSucceeds(deleteDoc(doc(als(HOOFD), 'trainingen', 't2')))
  })
  it('alleen de hoofdtrainer wijzigt het jaarplan', async () => {
    await assertFails(setDoc(doc(als(TRAINER), 'jaarplan', 'huidig'), { ...JAARPLAN, versie: 2 }))
    await assertSucceeds(setDoc(doc(als(HOOFD), 'jaarplan', 'huidig'), { ...JAARPLAN, versie: 2 }))
    await assertFails(setDoc(doc(als(HOOFD), 'jaarplan', 'anders'), { ...JAARPLAN, versie: 2 }))
    await assertFails(setDoc(doc(als(HOOFD), 'jaarplan', 'huidig'), { versie: 'x' }))
    await assertFails(deleteDoc(doc(als(HOOFD), 'jaarplan', 'huidig')))
  })
  it('afwezigheid van een ander kun je niet overnemen', async () => {
    await seed(async (db) =>
      setDoc(doc(db, 'afwezigheden', 'a1'), { trainerId: HOOFD.uid, van: '2026-12-01', tot: '2026-12-02', reden: 'Ziek' }),
    )
    await assertFails(
      setDoc(doc(als(TRAINER), 'afwezigheden', 'a1'), { trainerId: TRAINER.uid, van: '2026-12-01', tot: '2026-12-02', reden: 'x' }),
    )
    await assertSucceeds(
      setDoc(doc(als(TRAINER), 'afwezigheden', 'a2'), { trainerId: TRAINER.uid, van: '2026-12-01', tot: '2026-12-02', reden: 'Vakantie' }),
    )
  })
})
