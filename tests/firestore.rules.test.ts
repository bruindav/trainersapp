// Fix: fix-34 — trainingsvelden van het schema
// Fix: fix-32 — bijlagen bij trainingen
// Fix: fix-31 — ook de gever mag wijzigen en verwijderen
// Fix: fix-30 — training wijzigen en verwijderen door wie hem toevoegde
// Fix: fix-29 — trainingen met groepen[]
// Fix: fix-28 — demo-account: alleen de demo_*-kopie lezen
// Fix: fix-27 — demo-account: alleen lezen (en feedback sturen)
// Fix: fix-15 — regels voor ritmeWeken
// Fix: fix-12 — regels voor vaste trainers en geldigheid van momenten
// Fix: fix-11 — vrijgeven, overnemen, ruilen
// Fix: fix-10 — indeling
// Fix: fix-5 — momenten, periodes, beschikbaarheid
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
import { FieldPath, collectionGroup, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
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

  it('training met groepen: hele groep, combinatie of op inschrijving; geen onzin', async () => {
    const met = (groepen: unknown, groepId = 'g-hele') => ({ ...training(TRAINER.uid), groepId, groepen })
    await assertSucceeds(setDoc(doc(als(TRAINER), 'trainingen', 'g1'), met(['g-hele'])))
    await assertSucceeds(setDoc(doc(als(TRAINER), 'trainingen', 'g2'), met(['g-basis', 'g-wedstrijd'], 'g-basis')))
    await assertSucceeds(setDoc(doc(als(TRAINER), 'trainingen', 'g3'), met(['g-inschrijving'], 'g-inschrijving')))
    await assertFails(setDoc(doc(als(TRAINER), 'trainingen', 'g4'), met([])))
    await assertFails(setDoc(doc(als(TRAINER), 'trainingen', 'g5'), met(['g-zwemles'], 'g-zwemles')))
    await assertFails(setDoc(doc(als(TRAINER), 'trainingen', 'g6'), met(['g-basis'], 'g-wedstrijd')))
    await assertFails(setDoc(doc(als(TRAINER), 'trainingen', 'g7'), met('g-hele')))
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
  it('wie de training toevoegde of gaf mag hem wijzigen; een ander niet', async () => {
    await seed(async (db) =>
      setDoc(doc(db, 'trainingen', 't3'), { ...training(HOOFD.uid), trainerId: TRAINER.uid, aangemaaktOp: null }),
    )
    // HOOFD legde hem vast voor TRAINER: TRAINER (die hem gaf) mag hem ook wijzigen (fix-31).
    await assertSucceeds(updateDoc(doc(als(TRAINER), 'trainingen', 't3'), { titel: 'Anders', gewijzigdOp: serverTimestamp() }))
    // HOOFD wel, maar alleen met gewijzigdOp en zonder de maker of datum van aanmaken te veranderen.
    await assertSucceeds(
      updateDoc(doc(als(HOOFD), 'trainingen', 't3'), { titel: 'Anders', groepId: 'g-hele', groepen: ['g-hele'], gewijzigdOp: serverTimestamp() }),
    )
    await assertFails(updateDoc(doc(als(HOOFD), 'trainingen', 't3'), { titel: 'Zonder tijd' }))
    await assertFails(
      updateDoc(doc(als(HOOFD), 'trainingen', 't3'), { aangemaaktDoor: TRAINER.uid, gewijzigdOp: serverTimestamp() }),
    )
    await assertFails(
      updateDoc(doc(als(HOOFD), 'trainingen', 't3'), { groepen: ['g-onzin'], gewijzigdOp: serverTimestamp() }),
    )
    await assertFails(setDoc(doc(als(TRAINER), 'trainingen', 't4'), { ...training(TRAINER.uid), gewijzigdOp: serverTimestamp() }))
    // Een derde (niet maker, niet gever, geen coördinator) mag niets.
    await seed(async (db) =>
      setDoc(doc(db, 'trainingen', 't5'), { ...training(HOOFD.uid), trainerId: HOOFD.uid, aangemaaktOp: null }),
    )
    await assertFails(updateDoc(doc(als(TRAINER), 'trainingen', 't5'), { titel: 'X', gewijzigdOp: serverTimestamp() }))
    await assertFails(deleteDoc(doc(als(TRAINER), 'trainingen', 't5')))
    // Wie hem gaf mag verwijderen.
    await assertSucceeds(deleteDoc(doc(als(TRAINER), 'trainingen', 't3')))
  })
  it('bijlage: samen met de eigen training opslaan; niet bij andermans training; delen met trainers', async () => {
    const bijlage = (uid: string, data = 'data:application/pdf;base64,JVBERi0=') => ({
      naam: 'training.pdf',
      type: 'application/pdf',
      data,
      door: uid,
      op: serverTimestamp(),
    })
    const tdb = als(TRAINER)
    const batch = writeBatch(tdb)
    batch.set(doc(tdb, 'trainingen', 'b1'), training(TRAINER.uid))
    batch.set(doc(tdb, 'bijlagen', 'b1'), bijlage(TRAINER.uid))
    await assertSucceeds(batch.commit())
    await assertSucceeds(getDoc(doc(als(HOOFD), 'bijlagen', 'b1')))
    // Zonder training, bij andermans training, namens een ander of te groot: nee.
    await assertFails(setDoc(doc(als(TRAINER), 'bijlagen', 'geen'), bijlage(TRAINER.uid)))
    await seed(async (db) =>
      setDoc(doc(db, 'trainingen', 'b2'), { ...training(HOOFD.uid), trainerId: HOOFD.uid, aangemaaktOp: null }),
    )
    await assertFails(setDoc(doc(als(TRAINER), 'bijlagen', 'b2'), bijlage(TRAINER.uid)))
    await assertFails(setDoc(doc(als(TRAINER), 'bijlagen', 'b1'), bijlage(HOOFD.uid)))
    await assertFails(setDoc(doc(als(TRAINER), 'bijlagen', 'b1'), bijlage(TRAINER.uid, 'x'.repeat(1000001))))
    await assertFails(setDoc(doc(als(TRAINER), 'bijlagen', 'b1'), { ...bijlage(TRAINER.uid), extra: 1 }))
    // Verwijderen: niet door een ander, wel door de maker (samen met de training) of de coördinator.
    await seed(async (db) => setDoc(doc(db, 'bijlagen', 'b2'), { ...bijlage(HOOFD.uid), op: null }))
    await assertFails(deleteDoc(doc(als(TRAINER), 'bijlagen', 'b2')))
    await assertSucceeds(deleteDoc(doc(als(HOOFD), 'bijlagen', 'b2')))
    const weg = writeBatch(tdb)
    weg.delete(doc(tdb, 'bijlagen', 'b1'))
    weg.delete(doc(tdb, 'trainingen', 'b1'))
    await assertSucceeds(weg.commit())
  })

  it('training met de vakken van het trainingsschema; te lang of verkeerd type niet', async () => {
    const schema = {
      ...training(TRAINER.uid),
      opzet: '60 minuten • 6 banen, 25 m',
      doel: 'Fase 3, week 1: snelheid.',
      totaalToelichting: 'Circa 9 min speling.',
      perBaanToelichting: 'de 100%-set is voor iedereen 4 x 50 m',
      perBaan: [{ banen: '1-2 (snel)', aanpassing: '5 x 100 m wisselslag', totaal: 'circa 1.775 m' }],
      aandachtspunten: ['Echt 100% is voluit vanaf de start.'],
    }
    await assertSucceeds(setDoc(doc(als(TRAINER), 'trainingen', 's1'), schema))
    await assertFails(setDoc(doc(als(TRAINER), 'trainingen', 's2'), { ...schema, doel: 'x'.repeat(2001) }))
    await assertFails(setDoc(doc(als(TRAINER), 'trainingen', 's3'), { ...schema, aandachtspunten: 'los' }))
    await assertFails(setDoc(doc(als(TRAINER), 'trainingen', 's4'), { ...schema, perBaan: Array(11).fill(schema.perBaan[0]) }))
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

describe('roosterperiodes en beschikbaarheid', () => {
  beforeEach(standaardTeam)
  const moment = { dag: 1, start: '21:00', eind: '22:00', locatie: 'De Kwakel', trainersNodig: 2, actief: true, volgorde: 1 }
  const periode = (status: string) => ({
    naam: 'Deel 2', soort: 'wekelijks', van: '2027-01-04', tot: '2027-07-04', status, deadline: '2026-12-15',
    momentIds: ['m1'], losseTrainingen: [], vervallenData: [], versie: 0,
  })
  const besch = (door: string) => ({
    keuzes: { m1: 'graag' }, maxPerMaand: 3, nietKunnen: [{ van: '2027-02-14', tot: '2027-02-21' }],
    bijgewerktOp: serverTimestamp(), bijgewerktDoor: door,
  })

  it('alleen de coördinator beheert momenten en periodes', async () => {
    await assertSucceeds(setDoc(doc(als(HOOFD), 'trainingsmomenten', 'm1'), moment))
    await assertFails(setDoc(doc(als(TRAINER), 'trainingsmomenten', 'm2'), moment))
    await assertFails(setDoc(doc(als(HOOFD), 'trainingsmomenten', 'm3'), { ...moment, start: '25:00' }))
    // fix-12: vaste trainers en geldigheidsperiode
    await assertSucceeds(
      setDoc(doc(als(HOOFD), 'trainingsmomenten', 'm4'), { ...moment, vasteTrainers: ['a', 'd'], geldigVan: '2027-01-01', geldigTot: '2027-04-30' }),
    )
    await assertFails(setDoc(doc(als(HOOFD), 'trainingsmomenten', 'm5'), { ...moment, geldigVan: '2027-05-01', geldigTot: '2027-04-30' }))
    await assertFails(setDoc(doc(als(HOOFD), 'trainingsmomenten', 'm6'), { ...moment, geldigTot: 'april' }))
    await assertFails(setDoc(doc(als(HOOFD), 'trainingsmomenten', 'm7'), { ...moment, vasteTrainers: 'aaldert' }))
    // fix-15: ritme
    await assertSucceeds(setDoc(doc(als(HOOFD), 'trainingsmomenten', 'm8'), { ...moment, vasteTrainers: ['a', 'd'], ritmeWeken: 2 }))
    await assertFails(setDoc(doc(als(HOOFD), 'trainingsmomenten', 'm9'), { ...moment, ritmeWeken: 0 }))
    await assertSucceeds(setDoc(doc(als(HOOFD), 'roosterperiodes', 'p1'), periode('concept')))
    await assertFails(setDoc(doc(als(TRAINER), 'roosterperiodes', 'p2'), periode('concept')))
    await assertFails(setDoc(doc(als(HOOFD), 'roosterperiodes', 'p3'), { ...periode('concept'), status: 'klaar' }))
    await assertSucceeds(getDoc(doc(als(TRAINER), 'roosterperiodes', 'p1')))
  })
  it('alleen de coördinator deelt in en publiceert', async () => {
    await seed(async (db) => setDoc(doc(db, 'roosterperiodes', 'p'), periode('indelen')))
    const indeling = { indeling: { '2027-01-05|m1': { trainers: [TRAINER.uid] } } }
    await assertSucceeds(updateDoc(doc(als(HOOFD), 'roosterperiodes', 'p'), indeling))
    await assertFails(updateDoc(doc(als(TRAINER), 'roosterperiodes', 'p'), indeling))
    await assertFails(updateDoc(doc(als(HOOFD), 'roosterperiodes', 'p'), { indeling: 'kapot' }))
    await assertSucceeds(updateDoc(doc(als(HOOFD), 'roosterperiodes', 'p'), { status: 'gepubliceerd', versie: 1 }))
  })
  it('trainer vult alleen de eigen beschikbaarheid in, en alleen in de juiste fase', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'roosterperiodes', 'open'), periode('beschikbaarheid'))
      await setDoc(doc(db, 'roosterperiodes', 'dicht'), periode('indelen'))
    })
    await assertSucceeds(setDoc(doc(als(TRAINER), 'roosterperiodes', 'open', 'beschikbaarheid', TRAINER.uid), besch(TRAINER.uid)))
    await assertFails(setDoc(doc(als(TRAINER), 'roosterperiodes', 'open', 'beschikbaarheid', HOOFD.uid), besch(TRAINER.uid)))
    await assertFails(setDoc(doc(als(TRAINER), 'roosterperiodes', 'dicht', 'beschikbaarheid', TRAINER.uid), besch(TRAINER.uid)))
    // De coördinator mag voor een ander invullen, ook na de deadline.
    await assertSucceeds(setDoc(doc(als(HOOFD), 'roosterperiodes', 'dicht', 'beschikbaarheid', TRAINER.uid), besch(HOOFD.uid)))
    // Iedereen ziet ieders beschikbaarheid; een vreemde niet.
    await assertSucceeds(getDoc(doc(als(TRAINER), 'roosterperiodes', 'dicht', 'beschikbaarheid', TRAINER.uid)))
    await assertFails(getDoc(doc(als({ uid: 'vreemd', email: 'v@x.nl' }), 'roosterperiodes', 'dicht', 'beschikbaarheid', TRAINER.uid)))
  })
  it('ongeldige beschikbaarheid wordt geweigerd', async () => {
    await seed(async (db) => setDoc(doc(db, 'roosterperiodes', 'open'), periode('beschikbaarheid')))
    await assertFails(
      setDoc(doc(als(TRAINER), 'roosterperiodes', 'open', 'beschikbaarheid', TRAINER.uid), { ...besch(TRAINER.uid), maxPerMaand: 99 }),
    )
    await assertFails(
      setDoc(doc(als(TRAINER), 'roosterperiodes', 'open', 'beschikbaarheid', TRAINER.uid), { ...besch(TRAINER.uid), telefoon: '06' }),
    )
  })
})

describe('na publicatie: vrijgeven, overnemen, ruilen', () => {
  const C = { uid: 'c', email: 'c@nat.nl' }
  const A = '2027-01-05|m1'
  const B = '2027-01-07|m2'
  const basis = (status: string, indeling: Record<string, unknown>) => ({
    naam: 'Deel 2', soort: 'wekelijks', van: '2027-01-04', tot: '2027-07-04', status, deadline: null,
    momentIds: ['m1', 'm2'], losseTrainingen: [], vervallenData: [], versie: 1, indeling,
  })
  beforeEach(async () => {
    await standaardTeam()
    await seed(async (db) => {
      await setDoc(doc(db, 'trainers', C.uid), trainerDoc('C', 'Trainer', C.email))
      await setDoc(
        doc(db, 'roosterperiodes', 'p'),
        basis('gepubliceerd', {
          [A]: { trainers: [TRAINER.uid], nodig: 2 },
          [B]: { trainers: [C.uid], nodig: 1 },
        }),
      )
      await setDoc(doc(db, 'roosterperiodes', 'concept'), basis('indelen', { [A]: { trainers: [TRAINER.uid], nodig: 1 } }))
    })
  })
  const wijziging = (uid: string, soort: string, key: string, extra: Record<string, unknown> = {}) => ({
    soort, key, door: uid, op: serverTimestamp(), ...extra,
  })

  it('eigen plek vrijgeven mag, andermans niet', async () => {
    const ref = doc(als(TRAINER), 'roosterperiodes', 'p')
    await assertSucceeds(
      updateDoc(ref, new FieldPath('indeling', A), { trainers: [], nodig: 2 }, 'laatsteWijziging', wijziging(TRAINER.uid, 'vrijgeven', A)),
    )
    await assertFails(
      updateDoc(doc(als(TRAINER), 'roosterperiodes', 'p'), new FieldPath('indeling', B), { trainers: [], nodig: 1 }, 'laatsteWijziging', wijziging(TRAINER.uid, 'vrijgeven', B)),
    )
  })
  it('open plek overnemen mag; een volle niet; niet vóór publicatie', async () => {
    await assertSucceeds(
      updateDoc(doc(als(C), 'roosterperiodes', 'p'), new FieldPath('indeling', A), { trainers: [TRAINER.uid, C.uid], nodig: 2 }, 'laatsteWijziging', wijziging(C.uid, 'overnemen', A)),
    )
    await assertFails(
      updateDoc(doc(als(TRAINER), 'roosterperiodes', 'p'), new FieldPath('indeling', B), { trainers: [C.uid, TRAINER.uid], nodig: 1 }, 'laatsteWijziging', wijziging(TRAINER.uid, 'overnemen', B)),
    )
    await assertFails(
      updateDoc(doc(als(C), 'roosterperiodes', 'concept'), new FieldPath('indeling', A), { trainers: [TRAINER.uid, C.uid], nodig: 1 }, 'laatsteWijziging', wijziging(C.uid, 'overnemen', A)),
    )
    // Stiekem ook 'nodig' verhogen mag niet.
    await assertFails(
      updateDoc(doc(als(C), 'roosterperiodes', 'p'), new FieldPath('indeling', B), { trainers: [C.uid, TRAINER.uid], nodig: 2 }, 'laatsteWijziging', wijziging(TRAINER.uid, 'overnemen', B)),
    )
  })
  it('ruilen kan alleen via een geaccepteerd verzoek, door de gevraagde collega', async () => {
    const verzoek = { periodeId: 'p', van: TRAINER.uid, naar: C.uid, vanKey: A, terugKey: B, status: 'open', bericht: '', aangemaaktOp: serverTimestamp() }
    await assertSucceeds(setDoc(doc(als(TRAINER), 'ruilverzoeken', 'v1'), verzoek))
    await assertFails(setDoc(doc(als(TRAINER), 'ruilverzoeken', 'v2'), { ...verzoek, van: C.uid }))
    // Alleen status zetten zonder roosterwijziging: geweigerd.
    await assertFails(updateDoc(doc(als(C), 'ruilverzoeken', 'v1'), { status: 'geaccepteerd', afgehandeldOp: serverTimestamp() }))
    // Een ander kan niet accepteren.
    const hoofdDb = als(HOOFD)
    const anders = writeBatch(hoofdDb)
    anders.update(doc(hoofdDb, 'ruilverzoeken', 'v1'), { status: 'geaccepteerd', afgehandeldOp: serverTimestamp() })
    await assertFails(anders.commit())
    // De gevraagde collega accepteert: beide trainingen wisselen in één keer.
    const db = als(C)
    const b = writeBatch(db)
    b.update(
      doc(db, 'roosterperiodes', 'p'),
      new FieldPath('indeling', A), { trainers: [C.uid], nodig: 2 },
      new FieldPath('indeling', B), { trainers: [TRAINER.uid], nodig: 1 },
      'laatsteWijziging', wijziging(C.uid, 'ruil', A, { verzoekId: 'v1' }),
    )
    b.update(doc(db, 'ruilverzoeken', 'v1'), { status: 'geaccepteerd', afgehandeldOp: serverTimestamp() })
    await assertSucceeds(b.commit())
  })
  it('weigeren en intrekken', async () => {
    const verzoek = { periodeId: 'p', van: TRAINER.uid, naar: C.uid, vanKey: A, terugKey: null, status: 'open', bericht: 'Kun jij?', aangemaaktOp: serverTimestamp() }
    await assertSucceeds(setDoc(doc(als(TRAINER), 'ruilverzoeken', 'v3'), verzoek))
    await assertFails(updateDoc(doc(als(TRAINER), 'ruilverzoeken', 'v3'), { status: 'geweigerd', afgehandeldOp: serverTimestamp() }))
    await assertSucceeds(updateDoc(doc(als(C), 'ruilverzoeken', 'v3'), { status: 'geweigerd', afgehandeldOp: serverTimestamp() }))
    await assertSucceeds(setDoc(doc(als(TRAINER), 'ruilverzoeken', 'v4'), verzoek))
    await assertSucceeds(updateDoc(doc(als(TRAINER), 'ruilverzoeken', 'v4'), { status: 'ingetrokken', afgehandeldOp: serverTimestamp() }))
  })
  it('wijzigingslog: alleen namens jezelf', async () => {
    const regel = { soort: 'vrijgeven', tekst: 'x', door: TRAINER.uid, op: serverTimestamp() }
    await assertSucceeds(setDoc(doc(als(TRAINER), 'roosterperiodes', 'p', 'wijzigingslog', 'l1'), regel))
    await assertFails(setDoc(doc(als(TRAINER), 'roosterperiodes', 'p', 'wijzigingslog', 'l2'), { ...regel, door: C.uid }))
  })
})

// Fix: fix-16 — feedback
describe('feedback', () => {
  beforeEach(standaardTeam)
  const fb = (extra: Record<string, unknown> = {}) => ({
    tekst: 'De ruilknop is lastig te vinden',
    pagina: '/rooster',
    breedte: 390,
    screenshot: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==',
    door: TRAINER.uid,
    naam: 'Trainer',
    op: serverTimestamp(),
    status: 'nieuw',
    ...extra,
  })
  it('iedere trainer kan feedback sturen, als zichzelf en netjes', async () => {
    await assertSucceeds(setDoc(doc(als(TRAINER), 'feedback', 'f1'), fb()))
    await assertFails(setDoc(doc(als(TRAINER), 'feedback', 'f2'), fb({ door: HOOFD.uid })))
    await assertFails(setDoc(doc(als(TRAINER), 'feedback', 'f3'), fb({ tekst: '' })))
    await assertFails(setDoc(doc(als(TRAINER), 'feedback', 'f4'), fb({ screenshot: 'https://ergens.nl/x.png' })))
    await assertFails(setDoc(doc(als(TRAINER), 'feedback', 'f5'), fb({ pagina: 'javascript:alert(1)' })))
    await assertFails(setDoc(doc(als(TRAINER), 'feedback', 'f6'), fb({ status: 'afgehandeld' })))
    await assertFails(setDoc(doc(als({ uid: 'vreemd', email: 'x@y.nl' }), 'feedback', 'f7'), fb({ door: 'vreemd' })))
  })
  it('alleen de coördinator leest, handelt af en verwijdert', async () => {
    await assertSucceeds(setDoc(doc(als(TRAINER), 'feedback', 'f1'), fb()))
    await assertFails(getDoc(doc(als(TRAINER), 'feedback', 'f1')))
    await assertFails(updateDoc(doc(als(TRAINER), 'feedback', 'f1'), { status: 'afgehandeld' }))
    await assertSucceeds(getDoc(doc(als(HOOFD), 'feedback', 'f1')))
    await assertFails(updateDoc(doc(als(HOOFD), 'feedback', 'f1'), { tekst: 'anders' }))
    await assertSucceeds(updateDoc(doc(als(HOOFD), 'feedback', 'f1'), { status: 'afgehandeld' }))
    await assertFails(deleteDoc(doc(als(TRAINER), 'feedback', 'f1')))
    await assertSucceeds(deleteDoc(doc(als(HOOFD), 'feedback', 'f1')))
  })
})

// Fix: fix-21 — trainingsopbouw in het jaarplan en wedstrijden
describe('trainingsopbouw en wedstrijden', () => {
  beforeEach(standaardTeam)
  const WED = { uid: 'wed', email: 'wed@nat.nl' }
  const JP = { uid: 'jp', email: 'jp@nat.nl' }
  const wedstrijd = (extra: Record<string, unknown> = {}) => ({
    naam: 'Frankfurt',
    datum: '2026-12-05',
    plaats: 'Frankfurt',
    baan: '25',
    onderVoorbehoud: false,
    doel: true,
    notitie: '',
    ...extra,
  })
  async function zetRollen() {
    await seed(async (db) => {
      await setDoc(doc(db, 'trainers', WED.uid), trainerDoc('Wed', 'Trainer', WED.email, { wedstrijdBeheer: true }))
      await setDoc(doc(db, 'trainers', JP.uid), trainerDoc('Jp', 'Trainer', JP.email, { jaarplanBeheer: true }))
    })
  }

  it('jaarplanbeheerder bewaart opbouwen en zones', async () => {
    await zetRollen()
    const opbouw = { id: 'o1', naam: 'Sept–dec', inleiding: '<p>Hoi</p>', doelWedstrijdId: null, aandachtsgebieden: [], fases: [] }
    await assertSucceeds(setDoc(doc(als(JP), 'jaarplan', 'huidig'), { ...JAARPLAN, zones: [], opbouwen: [opbouw] }))
    await assertFails(setDoc(doc(als(TRAINER), 'jaarplan', 'huidig'), { ...JAARPLAN, zones: [], opbouwen: [opbouw] }))
    await assertFails(setDoc(doc(als(WED), 'jaarplan', 'huidig'), { ...JAARPLAN, opbouwen: [] }))
  })

  it('wedstrijden: coördinator, jaarplanbeheerder en wedstrijdcoördinator; trainers lezen', async () => {
    await zetRollen()
    await assertSucceeds(setDoc(doc(als(WED), 'wedstrijden', 'w1'), wedstrijd()))
    await assertSucceeds(setDoc(doc(als(JP), 'wedstrijden', 'w2'), wedstrijd({ einddatum: '2026-12-06' })))
    await assertSucceeds(setDoc(doc(als(HOOFD), 'wedstrijden', 'w3'), wedstrijd({ inschrijvenVoor: '2026-11-20' })))
    await assertFails(setDoc(doc(als(TRAINER), 'wedstrijden', 'w4'), wedstrijd()))
    await assertSucceeds(getDoc(doc(als(TRAINER), 'wedstrijden', 'w1')))
    await assertFails(setDoc(doc(als(WED), 'wedstrijden', 'w5'), wedstrijd({ einddatum: '2026-12-01' })))
    await assertFails(setDoc(doc(als(WED), 'wedstrijden', 'w6'), wedstrijd({ baan: '33' })))
    await assertFails(setDoc(doc(als(WED), 'wedstrijden', 'w7'), wedstrijd({ naam: '' })))
    await assertFails(deleteDoc(doc(als(TRAINER), 'wedstrijden', 'w1')))
    await assertSucceeds(deleteDoc(doc(als(WED), 'wedstrijden', 'w1')))
  })
})

// Fix: fix-27 — demo-account
describe('demo-account', () => {
  beforeEach(standaardTeam)
  const DEMO = { uid: 'demo', email: 'DemoTrainer@demo.nu' }
  const alsDemo = (provider = 'password', email = DEMO.email) =>
    env
      .authenticatedContext(DEMO.uid, { email, email_verified: false, firebase: { sign_in_provider: provider } } as never)
      .firestore()

  async function demoData() {
    await seed(async (db) => {
      await setDoc(doc(db, 'demo_jaarplan', 'huidig'), JAARPLAN)
      await setDoc(doc(db, 'demo_trainers', 'demo-trainer'), trainerDoc('Demo Trainer', 'Trainer', ''))
      await setDoc(doc(db, 'demo_roosterperiodes', 'p1', 'demo_beschikbaarheid', 'demo-trainer'), { keuzes: {} })
      await setDoc(doc(db, 'demo_roosterperiodes', 'p1', 'demo_wijzigingslog', 'l1'), { tekst: 'x' })
    })
  }

  it('leest de demodata, zonder geverifieerd e-mailadres', async () => {
    await demoData()
    await assertSucceeds(getDoc(doc(alsDemo(), 'demo_jaarplan', 'huidig')))
    await assertSucceeds(getDoc(doc(alsDemo(), 'demo_trainers', 'demo-trainer')))
    await assertSucceeds(getDocs(collectionGroup(alsDemo(), 'demo_beschikbaarheid')))
    await assertSucceeds(getDocs(collectionGroup(alsDemo(), 'demo_wijzigingslog')))
  })
  it('leest de echte gegevens niet', async () => {
    await assertFails(getDoc(doc(alsDemo(), 'jaarplan', 'huidig')))
    await assertFails(getDoc(doc(alsDemo(), 'trainers', HOOFD.uid)))
    await assertFails(getDocs(collectionGroup(alsDemo(), 'beschikbaarheid')))
  })
  it('demodata: coördinator mag meekijken, een gewone trainer en een vreemde niet; niemand schrijft', async () => {
    await demoData()
    await assertSucceeds(getDoc(doc(als(HOOFD), 'demo_trainers', 'demo-trainer')))
    await assertFails(getDoc(doc(als(TRAINER), 'demo_trainers', 'demo-trainer')))
    await assertFails(getDoc(doc(als({ uid: 'vreemd', email: 'vreemd@x.nl' }), 'demo_trainers', 'demo-trainer')))
    await assertFails(setDoc(doc(alsDemo(), 'demo_trainers', 'x'), { naam: 'x' }))
    await assertFails(setDoc(doc(als(HOOFD), 'demo_trainers', 'x'), { naam: 'x' }))
  })
  it('kan niets opslaan', async () => {
    const db = alsDemo()
    await assertFails(setDoc(doc(db, 'trainingen', 't1'), { titel: 'x' }))
    await assertFails(setDoc(doc(db, 'trainers', DEMO.uid), trainerDoc('Demo', 'Trainer', DEMO.email)))
    await assertFails(updateDoc(doc(db, 'jaarplan', 'huidig'), { status: 'definitief' }))
    await assertFails(deleteDoc(doc(db, 'trainers', TRAINER.uid)))
  })
  it('kan feedback sturen', async () => {
    await assertSucceeds(
      setDoc(doc(alsDemo(), 'feedback', 'd1'), {
        tekst: 'Mooi!',
        pagina: '/',
        breedte: 390,
        door: DEMO.uid,
        naam: 'Demo-trainer',
        op: serverTimestamp(),
        status: 'nieuw',
      }),
    )
    await assertFails(getDoc(doc(alsDemo(), 'feedback', 'd1')))
  })
  it('alleen met wachtwoord en het demo-adres', async () => {
    await demoData()
    await assertFails(getDoc(doc(alsDemo('google.com'), 'demo_jaarplan', 'huidig')))
    await assertFails(getDoc(doc(alsDemo('password', 'ander@demo.nu'), 'demo_jaarplan', 'huidig')))
  })
})
