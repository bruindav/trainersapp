/**
 * Fix: fix-1 — client-store bovenop Firestore.
 * Fix: fix-2 — testtrainers toevoegen/verwijderen.
 *
 * De vorm van de store (useAppData + selectors + acties) is gelijk gebleven
 * aan mijlpaal 1, zodat de schermen nauwelijks hoefden te veranderen. De data
 * komt nu live uit Firestore (onSnapshot) en acties schrijven naar Firestore.
 * Dankzij de lokale cache van Firestore zijn wijzigingen direct zichtbaar,
 * ook als het netwerk even wegvalt.
 */
import { useSyncExternalStore } from 'react'
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore'
import { toast } from 'sonner'

import { getDb } from '@/lib/firebase'
import {
  GROEPEN,
  SESSIES,
  STANDAARD_JAARPLAN,
  TESTTRAINERS,
  TRAINER_KLEUREN,
  rotatieTrainer,
  sessieDatum,
  slotKey,
  type Afwezigheid,
  type AppData,
  type Jaarplan,
  type Periode,
  type Trainer,
  type TrainerRol,
  type Training,
  type Uitnodiging,
} from './fixtures'

/** Pad van het (ene) jaarplan-document. */
export const JAARPLAN_DOC = ['jaarplan', 'huidig'] as const

function leegeData(uid = ''): AppData {
  return {
    huidigeTrainerId: uid,
    trainers: [],
    uitnodigingen: [],
    afwezigheden: [],
    roosterWijzigingen: {},
    trainingen: [],
    jaarplan: STANDAARD_JAARPLAN,
  }
}

export type SyncStatus = 'laden' | 'klaar' | 'fout'

let state: AppData = leegeData()
let syncStatus: SyncStatus = 'laden'
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

function setState(update: (s: AppData) => AppData) {
  state = update(state)
  emit()
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useAppData(): AppData {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  )
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    subscribe,
    () => syncStatus,
    () => syncStatus,
  )
}

/** Alleen voor tests. */
export function __zetTestData(data: AppData) {
  state = data
  syncStatus = 'klaar'
  emit()
}

// ---------------------------------------------------------------------------
// Synchronisatie met Firestore
// ---------------------------------------------------------------------------

function meldFout(actie: string) {
  return (err: unknown) => {
    console.error(actie, err)
    toast.error(`${actie} is niet gelukt`, {
      description: 'Controleer je verbinding en probeer het opnieuw.',
    })
  }
}

function naarTrainer(id: string, d: DocumentData): Trainer {
  return {
    id,
    naam: String(d.naam ?? ''),
    initialen: String(d.initialen ?? ''),
    kleur: String(d.kleur ?? '#2b2222'),
    rol: (d.rol ?? 'Trainer') as TrainerRol,
    specialiteit: String(d.specialiteit ?? ''),
    email: d.email,
    test: d.test === true,
  }
}

/**
 * Start de live-koppeling met Firestore voor de ingelogde trainer.
 * Geeft een functie terug die alle listeners stopt.
 */
export function startSync(uid: string, isHoofdtrainer: boolean): () => void {
  const db = getDb()
  state = leegeData(uid)
  syncStatus = 'laden'
  emit()

  const nodig = new Set(['trainers', 'afwezigheden', 'rooster', 'trainingen', 'jaarplan'])
  const geladen = (naam: string) => {
    nodig.delete(naam)
    if (nodig.size === 0 && syncStatus === 'laden') {
      syncStatus = 'klaar'
      emit()
    }
  }
  const fout = (naam: string) => (err: unknown) => {
    console.error(`Firestore-listener ${naam}`, err)
    syncStatus = 'fout'
    emit()
  }

  const stops = [
    onSnapshot(
      collection(db, 'trainers'),
      (snap) => {
        const trainers = snap.docs
          .map((d) => naarTrainer(d.id, d.data()))
          .sort((a, b) => a.naam.localeCompare(b.naam, 'nl'))
        setState((s) => ({ ...s, trainers }))
        geladen('trainers')
      },
      fout('trainers'),
    ),
    onSnapshot(
      collection(db, 'afwezigheden'),
      (snap) => {
        const afwezigheden = snap.docs.map((d) => {
          const x = d.data()
          return { trainerId: x.trainerId, van: x.van, tot: x.tot, reden: x.reden } as Afwezigheid
        })
        setState((s) => ({ ...s, afwezigheden }))
        geladen('afwezigheden')
      },
      fout('afwezigheden'),
    ),
    onSnapshot(
      collection(db, 'roosterWijzigingen'),
      (snap) => {
        const roosterWijzigingen: Record<string, string | null> = {}
        snap.docs.forEach((d) => {
          const x = d.data()
          roosterWijzigingen[slotKey(x.weekStart, x.sessieId, x.groepId)] = x.trainerId ?? null
        })
        setState((s) => ({ ...s, roosterWijzigingen }))
        geladen('rooster')
      },
      fout('rooster'),
    ),
    onSnapshot(
      collection(db, 'trainingen'),
      (snap) => {
        const trainingen = snap.docs
          .map((d) => {
            const x = d.data()
            const t: Training = {
              id: d.id,
              datum: x.datum,
              sessieId: x.sessieId,
              groepId: x.groepId,
              trainerId: x.trainerId,
              titel: x.titel ?? '',
              focus: x.focus ?? [],
              blokken: x.blokken ?? [],
              notities: x.notities ?? '',
              bijlage: x.bijlage ?? undefined,
            }
            return t
          })
          .sort((a, b) => (a.datum < b.datum ? 1 : -1))
        setState((s) => ({ ...s, trainingen }))
        geladen('trainingen')
      },
      fout('trainingen'),
    ),
    onSnapshot(
      doc(db, ...JAARPLAN_DOC),
      (snap) => {
        const jaarplan = snap.exists() ? (snap.data() as Jaarplan) : STANDAARD_JAARPLAN
        setState((s) => ({ ...s, jaarplan }))
        geladen('jaarplan')
      },
      fout('jaarplan'),
    ),
  ]

  // Uitnodigingen zijn alleen leesbaar voor de hoofdtrainer.
  if (isHoofdtrainer) {
    stops.push(
      onSnapshot(
        collection(db, 'uitnodigingen'),
        (snap) => {
          const uitnodigingen = snap.docs
            .map((d) => ({ ...(d.data() as Uitnodiging), email: d.id }))
            .sort((a, b) => a.naam.localeCompare(b.naam, 'nl'))
          setState((s) => ({ ...s, uitnodigingen }))
        },
        (err) => console.error('Firestore-listener uitnodigingen', err),
      ),
    )
  }

  return () => {
    stops.forEach((stop) => stop())
    state = leegeData()
    syncStatus = 'laden'
    emit()
  }
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/** Trainer bij id; voor een verwijderde trainer een neutrale vervanger. */
export function trainerById(id: string | null | undefined): Trainer | undefined {
  if (!id) return undefined
  return (
    state.trainers.find((t) => t.id === id) ?? {
      id,
      naam: 'Oud-trainer',
      initialen: '–',
      kleur: '#9a8f8f',
      rol: 'Trainer',
      specialiteit: '',
    }
  )
}

export function sessieById(id: string) {
  return SESSIES.find((s) => s.id === id)!
}

export function groepById(id: string) {
  return GROEPEN.find((g) => g.id === id)!
}

/** Trainer-id's in vaste volgorde voor de rotatie. */
function rotatieVolgorde(data: AppData) {
  return data.trainers.map((t) => t.id).sort()
}

/** Toegewezen trainer voor een slot: handmatige wijziging, anders de rotatie. */
export function trainerVoorSlot(data: AppData, weekStart: string, sessieId: string, groepId: string) {
  const key = slotKey(weekStart, sessieId, groepId)
  if (key in data.roosterWijzigingen) return data.roosterWijzigingen[key]
  return rotatieTrainer(weekStart, sessieId, groepId, rotatieVolgorde(data))
}

export function isAfwezig(data: AppData, trainerId: string, datum: string) {
  return data.afwezigheden.find((a) => a.trainerId === trainerId && a.van <= datum && datum <= a.tot)
}

export interface RoosterSlot {
  sessieId: string
  groepId: string
  datum: string
  trainerId: string | null
  afwezig?: string
  gewijzigd: boolean
}

export function roosterVoorWeek(data: AppData, weekStart: string): RoosterSlot[] {
  return SESSIES.flatMap((sessie) =>
    GROEPEN.map((groep) => {
      const datum = sessieDatum(weekStart, sessie)
      const trainerId = trainerVoorSlot(data, weekStart, sessie.id, groep.id)
      const afw = trainerId ? isAfwezig(data, trainerId, datum) : undefined
      return {
        sessieId: sessie.id,
        groepId: groep.id,
        datum,
        trainerId,
        afwezig: afw?.reden,
        gewijzigd: slotKey(weekStart, sessie.id, groep.id) in data.roosterWijzigingen,
      }
    }),
  )
}

export function totaalMeters(t: Pick<Training, 'blokken'>) {
  return t.blokken.reduce((sum, b) => sum + (Number.isFinite(b.meters) ? b.meters : 0), 0)
}

export function huidigePeriode(data: AppData, datum: string) {
  return data.jaarplan.periodes.find((p) => p.van <= datum && datum <= p.tot)
}

// ---------------------------------------------------------------------------
// Acties — schrijven naar Firestore. De UI wordt bijgewerkt via onSnapshot
// (Firestore meldt lokale wijzigingen direct, nog vóór de server bevestigt).
// ---------------------------------------------------------------------------

/** Document-id voor een roosterwijziging (geen '/' toegestaan in id's). */
export function roosterDocId(weekStart: string, sessieId: string, groepId: string) {
  return slotKey(weekStart, sessieId, groepId)
}

export function wijsTrainerToe(weekStart: string, sessieId: string, groepId: string, trainerId: string | null) {
  setDoc(doc(getDb(), 'roosterWijzigingen', roosterDocId(weekStart, sessieId, groepId)), {
    weekStart,
    sessieId,
    groepId,
    trainerId,
    gewijzigdDoor: state.huidigeTrainerId,
    gewijzigdOp: serverTimestamp(),
  }).catch(meldFout('Rooster aanpassen'))
}

export function herstelRotatie(weekStart: string) {
  const db = getDb()
  const batch = writeBatch(db)
  Object.keys(state.roosterWijzigingen)
    .filter((k) => k.startsWith(`${weekStart}|`))
    .forEach((k) => batch.delete(doc(db, 'roosterWijzigingen', k)))
  batch.commit().catch(meldFout('Rotatie herstellen'))
}

export function voegTrainingToe(training: Omit<Training, 'id'>) {
  const ref = doc(collection(getDb(), 'trainingen'))
  setDoc(ref, {
    ...training,
    aangemaaktDoor: state.huidigeTrainerId,
    aangemaaktOp: serverTimestamp(),
  }).catch(meldFout('Training opslaan'))
  return ref.id
}

export function verwijderTraining(id: string) {
  deleteDoc(doc(getDb(), 'trainingen', id)).catch(meldFout('Training verwijderen'))
}

export function werkPeriodeBij(periode: Periode) {
  const jaarplan: Jaarplan = {
    ...state.jaarplan,
    status: 'concept',
    periodes: state.jaarplan.periodes.map((p) => (p.id === periode.id ? periode : p)),
  }
  setDoc(doc(getDb(), ...JAARPLAN_DOC), jaarplan).catch(meldFout('Periode opslaan'))
}

export function publiceerJaarplan(datum: string) {
  const jaarplan: Jaarplan = {
    ...state.jaarplan,
    status: 'gepubliceerd',
    gepubliceerdOp: datum,
    gepubliceerdDoor: state.huidigeTrainerId,
    versie: state.jaarplan.versie + 1,
  }
  setDoc(doc(getDb(), ...JAARPLAN_DOC), jaarplan).catch(meldFout('Jaarplan publiceren'))
}

// --- Team (alleen hoofdtrainer) --------------------------------------------

export function initialenVan(naam: string) {
  const delen = naam.trim().split(/\s+/).filter(Boolean)
  if (delen.length === 0) return '?'
  const eerste = delen[0][0]
  const laatste = delen.length > 1 ? delen[delen.length - 1][0] : (delen[0][1] ?? '')
  return (eerste + laatste).toUpperCase()
}

export async function nodigTrainerUit(u: Omit<Uitnodiging, 'uitgenodigdOp'>) {
  const email = u.email.trim().toLowerCase()
  await setDoc(doc(getDb(), 'uitnodigingen', email), {
    email,
    naam: u.naam.trim(),
    rol: u.rol,
    kleur: u.kleur,
    specialiteit: u.specialiteit.trim(),
    uitgenodigdOp: new Date().toISOString().slice(0, 10),
  })
}

export async function trekUitnodigingIn(email: string) {
  await deleteDoc(doc(getDb(), 'uitnodigingen', email))
}

export async function wijzigRol(trainerId: string, rol: TrainerRol) {
  await updateDoc(doc(getDb(), 'trainers', trainerId), { rol })
}

export async function verwijderTrainer(trainerId: string) {
  await deleteDoc(doc(getDb(), 'trainers', trainerId))
}

/** Id voor een testtrainer, bijv. "test-aalder-mellema". */
export function testTrainerId(naam: string) {
  return (
    'test-' +
    naam
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  )
}

/** Voegt de testtrainers toe (zonder account; ze kunnen niet inloggen). */
export async function voegTesttrainersToe() {
  const db = getDb()
  const batch = writeBatch(db)
  TESTTRAINERS.forEach((naam, i) => {
    batch.set(doc(db, 'trainers', testTrainerId(naam)), {
      naam,
      initialen: initialenVan(naam),
      kleur: TRAINER_KLEUREN[(i + 1) % TRAINER_KLEUREN.length].waarde,
      rol: 'Trainer',
      specialiteit: '',
      email: '',
      test: true,
    })
  })
  await batch.commit()
}

/** Verwijdert alle testtrainers weer. */
export async function verwijderTesttrainers() {
  const db = getDb()
  const batch = writeBatch(db)
  state.trainers.filter((t) => t.test).forEach((t) => batch.delete(doc(db, 'trainers', t.id)))
  await batch.commit()
}
