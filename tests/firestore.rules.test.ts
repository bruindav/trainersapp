// Fix: fix-3 — coördinator, taken, toezichthouders, migratie oude hoofdtrainer
// Fix: fix-2 — testtrainers
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

function trainerDoc(naam: string, rol: string, email: string, extra: Record<string, unknown> = {}) {
  return { naam, initialen: 'XX', kleur: '#e64439', rol, specialiteit: '', email, ...extra }
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
    await setDoc(doc(db, 'trainers', HOOFD.uid), trainerDoc('Coördinator', 'Trainer', HOOFD.email, { coordinator: true }))
    await setDoc(doc(db, 'trainers', TRAINER.uid), trainerDoc('Trainer', 'Trainer', TRAINER.email))
    await setDoc(doc(db, 'jaarplan', 'huidig'), JAARPLAN)
  })
}

describe('eerste inrichting', () => {
  function inrichtBatch(db: ReturnType<typeof als>, uid: string, email: string) {
    const b = writeBatch(db)
    b.set(doc(db, 'trainers', uid), {
      ...trainerDoc('Eerste', 'Geen training', email, { coordinator: true, jaarplanBeheer: true, teamBeheer: true }),
      sinds: serverTimestamp(),
    })
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
    await assertFails(setDoc(doc(als(x), 'trainers', x.uid), trainerDoc('X', 'Trainer', x.email, { coordinator: true })))
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

  function verzilver(db: ReturnType<typeof als>, extra: Record<string, unknown> = {}) {
    const b = writeBatch(db)
    b.set(doc(db, 'trainers', NIEUW.uid), trainerDoc('Nieuw', 'Trainer', NIEUW.email, extra))
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
    await assertFails(verzilver(als(NIEUW), { coordinator: true }))
    await assertFails(verzilver(als(NIEUW), { rol: 'Geen training' }))
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

  it('coördinator kan rol van een ander wijzigen, trainer niet', async () => {
    await assertSucceeds(updateDoc(doc(als(HOOFD), 'trainers', TRAINER.uid), { rol: 'Assistent-trainer' }))
    await assertFails(updateDoc(doc(als(TRAINER), 'trainers', TRAINER.uid), { coordinator: true }))
  })
  it('coördinator kan zichzelf de coördinatortaak niet afnemen en zichzelf niet verwijderen', async () => {
    await assertFails(updateDoc(doc(als(HOOFD), 'trainers', HOOFD.uid), { coordinator: false }))
    await assertSucceeds(updateDoc(doc(als(HOOFD), 'trainers', HOOFD.uid), { rol: 'Geen training' }))
    await assertFails(deleteDoc(doc(als(HOOFD), 'trainers', HOOFD.uid)))
  })
  it('ongeldige rol of taak wordt geweigerd', async () => {
    await assertFails(updateDoc(doc(als(HOOFD), 'trainers', TRAINER.uid), { rol: 'Hoofdtrainer' }))
    await assertFails(updateDoc(doc(als(HOOFD), 'trainers', TRAINER.uid), { toezichthouder: 'ja' }))
  })
  it('alleen wie het team beheert kan testtrainers (zonder account) toevoegen', async () => {
    const test = { ...trainerDoc('Aalder Mellema', 'Trainer', ''), test: true }
    await assertFails(setDoc(doc(als(TRAINER), 'trainers', 'test-aalder-mellema'), test))
    await assertSucceeds(setDoc(doc(als(HOOFD), 'trainers', 'test-aalder-mellema'), test))
    await assertFails(setDoc(doc(als(HOOFD), 'trainers', 'test-x'), { ...test, test: 'ja' }))
    await assertSucceeds(deleteDoc(doc(als(HOOFD), 'trainers', 'test-aalder-mellema')))
  })
  it('hoofdtrainer kan een trainer verwijderen', async () => {
    await assertSucceeds(deleteDoc(doc(als(HOOFD), 'trainers', TRAINER.uid)))
  })
  it('config/setup kan niet worden gewijzigd', async () => {
    await assertFails(setDoc(doc(als(HOOFD), 'config', 'setup'), { hoofdtrainerUid: 'x', op: null }))
  })
})

describe('teambeheer (gedelegeerd)', () => {
  const TEAM = { uid: 'team', email: 'team@nat.nl' }
  beforeEach(async () => {
    await standaardTeam()
    await seed(async (db) => setDoc(doc(db, 'trainers', TEAM.uid), trainerDoc('Team', 'Trainer', TEAM.email, { teamBeheer: true })))
  })
  const uitnodiging = (extra: Record<string, unknown> = {}) => ({
    email: 'x@nat.nl', naam: 'X', rol: 'Trainer', kleur: '#2f8fc0', specialiteit: '', uitgenodigdOp: '2026-11-19', ...extra,
  })

  it('kan gewone teamleden uitnodigen, maar geen coördinator of teambeheerder', async () => {
    await assertSucceeds(setDoc(doc(als(TEAM), 'uitnodigingen', 'x@nat.nl'), uitnodiging({ toezichthouder: true })))
    await assertFails(setDoc(doc(als(TEAM), 'uitnodigingen', 'y@nat.nl'), uitnodiging({ email: 'y@nat.nl', coordinator: true })))
    await assertFails(setDoc(doc(als(TEAM), 'uitnodigingen', 'z@nat.nl'), uitnodiging({ email: 'z@nat.nl', teamBeheer: true })))
  })
  it('kan taken van een trainer wijzigen, maar geen zware taken en niet bij de coördinator', async () => {
    await assertSucceeds(updateDoc(doc(als(TEAM), 'trainers', TRAINER.uid), { toezichthouder: true, jaarplanBeheer: true }))
    await assertFails(updateDoc(doc(als(TEAM), 'trainers', TRAINER.uid), { teamBeheer: true }))
    await assertFails(updateDoc(doc(als(TEAM), 'trainers', TEAM.uid), { coordinator: true }))
    await assertFails(updateDoc(doc(als(TEAM), 'trainers', HOOFD.uid), { rol: 'Geen training' }))
    await assertFails(deleteDoc(doc(als(TEAM), 'trainers', HOOFD.uid)))
    await assertSucceeds(deleteDoc(doc(als(TEAM), 'trainers', TRAINER.uid)))
  })
  it('gewone trainer kan het team niet beheren', async () => {
    await assertFails(setDoc(doc(als(TRAINER), 'uitnodigingen', 'x@nat.nl'), uitnodiging()))
    await assertFails(updateDoc(doc(als(TRAINER), 'trainers', TEAM.uid), { toezichthouder: true }))
  })
})

describe('jaarplan, toezichthouders en oude hoofdtrainer', () => {
  beforeEach(standaardTeam)
  const JAAR = { uid: 'jaar', email: 'jaar@nat.nl' }
  const OUD = { uid: 'oud', email: 'oud@nat.nl' }

  it('jaarplanbeheerder mag het jaarplan bewerken', async () => {
    await seed(async (db) => setDoc(doc(db, 'trainers', JAAR.uid), trainerDoc('Jaar', 'Trainer', JAAR.email, { jaarplanBeheer: true })))
    await assertSucceeds(setDoc(doc(als(JAAR), 'jaarplan', 'huidig'), { ...JAARPLAN, versie: 3 }))
  })
  it('alleen teambeheer beheert de groep toezichthouders; iedere trainer leest', async () => {
    await assertSucceeds(setDoc(doc(als(HOOFD), 'toezichthouders', 'z1'), { naam: 'Toos', notitie: '' }))
    await assertSucceeds(getDoc(doc(als(TRAINER), 'toezichthouders', 'z1')))
    await assertFails(setDoc(doc(als(TRAINER), 'toezichthouders', 'z2'), { naam: 'Kees', notitie: '' }))
    await assertFails(setDoc(doc(als(HOOFD), 'toezichthouders', 'z3'), { naam: 'Kees', telefoon: '06' }))
  })
  it('een oude hoofdtrainer telt als coördinator en kan zichzelf omzetten', async () => {
    await seed(async (db) => setDoc(doc(db, 'trainers', OUD.uid), trainerDoc('Oud', 'Hoofdtrainer', OUD.email)))
    await assertSucceeds(setDoc(doc(als(OUD), 'jaarplan', 'huidig'), { ...JAARPLAN, versie: 4 }))
    await assertSucceeds(
      updateDoc(doc(als(OUD), 'trainers', OUD.uid), {
        rol: 'Trainer', coordinator: true, jaarplanBeheer: true, teamBeheer: true, toezichthouder: false,
      }),
    )
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
  it('alleen coördinator of jaarplanbeheerder wijzigt het jaarplan', async () => {
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
