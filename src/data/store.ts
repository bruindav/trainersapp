/**
 * Fix: fix-1 — client-store bovenop Firestore.
 * Fix: fix-30 — eigen training wijzigen
 * Fix: fix-29 — trainingen met meerdere groepen
 * Fix: fix-28 — demo-account leest uit de demo_*-collecties (geanonimiseerde kopie).
 * Fix: fix-27 — demo-trainer (staat niet in Firestore) aan de lijst toevoegen.
 * Fix: fix-2 — testtrainers toevoegen/verwijderen.
 * Fix: fix-17 — naam van een teamlid wijzigen.
 * Fix: fix-21 — wedstrijden, jaarplan met opbouwen en zones (seizoensoverzicht blijft).
 * Fix: fix-15 — ritme van vaste trainers opslaan.
 * Fix: fix-12 — vaste trainers en geldigheid van trainingsmomenten.
 * Fix: fix-11 — vrijgeven, overnemen, ruilverzoeken, wijzigingslog; publiceren met volledige indeling.
 * Fix: fix-10 — indeling opslaan en publiceren.
 * Fix: fix-8 — testbeschikbaarheid voor testtrainers.
 * Fix: fix-5 — trainingsmomenten, roosterperiodes en beschikbaarheid.
 * Fix: fix-3 — rollen en taken, toezichthouders, migratie van 'Hoofdtrainer'.
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
  collectionGroup,
  deleteField,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  FieldPath,
  type DocumentData,
} from 'firebase/firestore'
import { toast } from 'sonner'

import { getDb } from '@/lib/firebase'
import {
  GEEN_TAKEN,
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
  type Opbouw,
  type Wedstrijd,
  type Zone,
  type Periode,
  geeftTraining,
  type Taken,
  type Trainer,
  type TrainerRol,
  type Training,
  type Uitnodiging,
} from './fixtures'
import {
  STANDAARD_MOMENTEN,
  trainingenInPeriode,
  type Beschikbaarheid,
  type DatumBereik,
  type Keuze,
  type LosseTraining,
  type PeriodeStatus,
  type Roosterperiode,
  type Trainingsmoment,
} from './rooster'
import { volledig, type Indeling, type IndelingMap } from './indeling'
import { normaliseerJaarplan, zonderUndefined } from './jaarplan'
import type { LogRegel, LogSoort, Ruilverzoek } from './wijzigingen'

import { DEMO_PREFIX } from './demo-anonimiseer'

/** Pad van het (ene) jaarplan-document. */
export const JAARPLAN_DOC = ['jaarplan', 'huidig'] as const

function leegeData(uid = ''): AppData {
  return {
    huidigeTrainerId: uid,
    trainers: [],
    uitnodigingen: [],
    toezichthouders: [],
    trainingsmomenten: [],
    roosterperiodes: [],
    beschikbaarheid: {},
    ruilverzoeken: [],
    wijzigingslog: [],
    afwezigheden: [],
    roosterWijzigingen: {},
    trainingen: [],
    jaarplan: STANDAARD_JAARPLAN,
    wedstrijden: [],
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

const ROLLEN: readonly string[] = ['Trainer', 'Assistent-trainer', 'Geen training']

/**
 * Zet een Firestore-document om naar een Trainer. Documenten van vóór fix-3
 * met rol 'Hoofdtrainer' worden gelezen als trainer met alle taken.
 */
export function naarTrainer(id: string, d: DocumentData): Trainer {
  const oudeHoofdtrainer = d.rol === 'Hoofdtrainer'
  return {
    id,
    naam: String(d.naam ?? ''),
    initialen: String(d.initialen ?? ''),
    kleur: String(d.kleur ?? '#2b2222'),
    rol: (ROLLEN.includes(d.rol) ? d.rol : 'Trainer') as TrainerRol,
    specialiteit: String(d.specialiteit ?? ''),
    email: d.email,
    test: d.test === true,
    coordinator: d.coordinator === true || oudeHoofdtrainer,
    jaarplanBeheer: d.jaarplanBeheer === true || oudeHoofdtrainer,
    teamBeheer: d.teamBeheer === true || oudeHoofdtrainer,
    toezichthouder: d.toezichthouder === true,
    wedstrijdBeheer: d.wedstrijdBeheer === true,
  }
}

/**
 * Start de live-koppeling met Firestore voor de ingelogde trainer.
 * Geeft een functie terug die alle listeners stopt.
 */
export function startSync(uid: string, magTeam: boolean, demo?: Trainer): () => void {
  const db = getDb()
  state = leegeData(uid)
  if (demo) state = { ...state, trainers: [demo] }
  // Het demo-account leest een geanonimiseerde kopie (scripts/maak-demo-data.ts).
  const c = (naam: string) => (demo ? DEMO_PREFIX + naam : naam)
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
      collection(db, c('trainers')),
      (snap) => {
        const trainers = snap.docs
          .map((d) => naarTrainer(d.id, d.data()))
          .concat(demo && !snap.docs.some((d) => d.id === demo.id) ? [demo] : [])
          .sort((a, b) => a.naam.localeCompare(b.naam, 'nl'))
        setState((s) => ({ ...s, trainers }))
        geladen('trainers')
      },
      fout('trainers'),
    ),
    onSnapshot(
      collection(db, c('afwezigheden')),
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
      collection(db, c('roosterWijzigingen')),
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
      collection(db, c('trainingen')),
      (snap) => {
        const trainingen = snap.docs
          .map((d) => {
            const x = d.data()
            const t: Training = {
              id: d.id,
              datum: x.datum,
              sessieId: x.sessieId,
              groepId: x.groepId,
              groepen: Array.isArray(x.groepen) && x.groepen.length ? x.groepen : [x.groepId],
              trainerId: x.trainerId,
              titel: x.titel ?? '',
              focus: x.focus ?? [],
              blokken: x.blokken ?? [],
              notities: x.notities ?? '',
              bijlage: x.bijlage ?? undefined,
              aangemaaktDoor: x.aangemaaktDoor ?? undefined,
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
      doc(db, c(JAARPLAN_DOC[0]), JAARPLAN_DOC[1]),
      (snap) => {
        const jaarplan = normaliseerJaarplan(snap.exists() ? snap.data() : undefined)
        setState((s) => ({ ...s, jaarplan }))
        geladen('jaarplan')
      },
      fout('jaarplan'),
    ),
    onSnapshot(
      collection(db, c('wedstrijden')),
      (snap) => {
        const wedstrijden = snap.docs
          .map((d): Wedstrijd => {
            const x = d.data()
            return {
              id: d.id,
              naam: String(x.naam ?? ''),
              datum: String(x.datum ?? ''),
              ...(x.einddatum ? { einddatum: String(x.einddatum) } : {}),
              plaats: String(x.plaats ?? ''),
              baan: x.baan === '25' || x.baan === '50' ? x.baan : '',
              ...(x.inschrijvenVoor ? { inschrijvenVoor: String(x.inschrijvenVoor) } : {}),
              onderVoorbehoud: x.onderVoorbehoud === true,
              doel: x.doel === true,
              notitie: String(x.notitie ?? ''),
            }
          })
          .sort((a, b) => a.datum.localeCompare(b.datum))
        setState((s) => ({ ...s, wedstrijden }))
      },
      (err) => console.error('Firestore-listener wedstrijden', err),
    ),
  ]

  stops.push(
    onSnapshot(
      collection(db, c('trainingsmomenten')),
      (snap) => {
        const trainingsmomenten = snap.docs
          .map((d) => {
            const x = d.data()
            const m: Trainingsmoment = {
              id: d.id,
              dag: Number(x.dag ?? 0),
              start: String(x.start ?? ''),
              eind: String(x.eind ?? ''),
              locatie: String(x.locatie ?? ''),
              trainersNodig: Number(x.trainersNodig ?? 1),
              actief: x.actief !== false,
              volgorde: Number(x.volgorde ?? 0),
            }
            if (Array.isArray(x.vasteTrainers) && x.vasteTrainers.length) m.vasteTrainers = x.vasteTrainers.map(String)
            if (typeof x.geldigVan === 'string' && x.geldigVan) m.geldigVan = x.geldigVan
            if (typeof x.geldigTot === 'string' && x.geldigTot) m.geldigTot = x.geldigTot
            if (typeof x.ritmeWeken === 'number' && x.ritmeWeken > 0) m.ritmeWeken = x.ritmeWeken
            return m
          })
          .sort((a, b) => a.dag - b.dag || a.start.localeCompare(b.start))
        setState((s) => ({ ...s, trainingsmomenten }))
      },
      (err) => console.error('Firestore-listener trainingsmomenten', err),
    ),
    onSnapshot(
      collection(db, c('roosterperiodes')),
      (snap) => {
        const roosterperiodes = snap.docs
          .map((d) => {
            const x = d.data()
            const p: Roosterperiode = {
              id: d.id,
              naam: String(x.naam ?? ''),
              soort: x.soort === 'los' ? 'los' : 'wekelijks',
              van: String(x.van ?? ''),
              tot: String(x.tot ?? ''),
              status: (x.status ?? 'concept') as PeriodeStatus,
              deadline: x.deadline ?? null,
              momentIds: Array.isArray(x.momentIds) ? x.momentIds : [],
              losseTrainingen: Array.isArray(x.losseTrainingen) ? x.losseTrainingen : [],
              vervallenData: Array.isArray(x.vervallenData) ? x.vervallenData : [],
              indeling: x.indeling && typeof x.indeling === 'object' ? x.indeling : {},
              versie: Number(x.versie ?? 0),
            }
            return p
          })
          .sort((a, b) => a.van.localeCompare(b.van))
        setState((s) => ({ ...s, roosterperiodes }))
      },
      (err) => console.error('Firestore-listener roosterperiodes', err),
    ),
    onSnapshot(
      collectionGroup(db, c('beschikbaarheid')),
      (snap) => {
        const beschikbaarheid: Record<string, Record<string, Beschikbaarheid>> = {}
        snap.docs.forEach((d) => {
          const periodeId = d.ref.parent.parent?.id
          if (!periodeId) return
          const x = d.data()
          ;(beschikbaarheid[periodeId] ??= {})[d.id] = {
            trainerId: d.id,
            keuzes: (x.keuzes ?? {}) as Record<string, Keuze>,
            maxPerMaand: typeof x.maxPerMaand === 'number' ? x.maxPerMaand : null,
            nietKunnen: Array.isArray(x.nietKunnen) ? x.nietKunnen : [],
          }
        })
        setState((s) => ({ ...s, beschikbaarheid }))
      },
      (err) => console.error('Firestore-listener beschikbaarheid', err),
    ),
  )

  stops.push(
    onSnapshot(
      collection(db, c('ruilverzoeken')),
      (snap) => {
        const ruilverzoeken = snap.docs.map((d) => {
          const x = d.data()
          const v: Ruilverzoek = {
            id: d.id,
            periodeId: String(x.periodeId ?? ''),
            van: String(x.van ?? ''),
            naar: String(x.naar ?? ''),
            vanKey: String(x.vanKey ?? ''),
            terugKey: x.terugKey ?? null,
            status: x.status ?? 'open',
            bericht: String(x.bericht ?? ''),
            aangemaaktOp: x.aangemaaktOp?.toDate?.().toISOString?.() ?? '',
          }
          return v
        })
        setState((s) => ({ ...s, ruilverzoeken }))
      },
      (err) => console.error('Firestore-listener ruilverzoeken', err),
    ),
    onSnapshot(
      collectionGroup(db, c('wijzigingslog')),
      (snap) => {
        const wijzigingslog = snap.docs
          .map((d) => {
            const x = d.data()
            const l: LogRegel = {
              id: d.id,
              periodeId: d.ref.parent.parent?.id ?? '',
              soort: x.soort,
              tekst: String(x.tekst ?? ''),
              door: String(x.door ?? ''),
              op: x.op?.toDate?.().toISOString?.() ?? new Date().toISOString(),
            }
            return l
          })
          .sort((a, b) => (a.op < b.op ? 1 : -1))
          .slice(0, 100)
        setState((s) => ({ ...s, wijzigingslog }))
      },
      (err) => console.error('Firestore-listener wijzigingslog', err),
    ),
  )

  stops.push(
    onSnapshot(
      collection(db, c('toezichthouders')),
      (snap) => {
        const toezichthouders = snap.docs
          .map((d) => ({ id: d.id, naam: String(d.data().naam ?? ''), notitie: String(d.data().notitie ?? '') }))
          .sort((a, b) => a.naam.localeCompare(b.naam, 'nl'))
        setState((s) => ({ ...s, toezichthouders }))
      },
      (err) => console.error('Firestore-listener toezichthouders', err),
    ),
  )

  // Uitnodigingen zijn alleen leesbaar voor wie het team beheert.
  if (magTeam) {
    stops.push(
      onSnapshot(
        collection(db, 'uitnodigingen'),
        (snap) => {
          const uitnodigingen = snap.docs
            .map((d) => {
              const x = d.data()
              const u: Uitnodiging = {
                ...(x as Uitnodiging),
                email: d.id,
                coordinator: x.coordinator === true,
                jaarplanBeheer: x.jaarplanBeheer === true,
                teamBeheer: x.teamBeheer === true,
                toezichthouder: x.toezichthouder === true,
                wedstrijdBeheer: x.wedstrijdBeheer === true,
              }
              return u
            })
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
      ...GEEN_TAKEN,
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
  return data.trainers
    .filter(geeftTraining)
    .map((t) => t.id)
    .sort()
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

export type TrainingVelden = Omit<Training, 'id' | 'aangemaaktDoor'>

export function voegTrainingToe(training: TrainingVelden) {
  const ref = doc(collection(getDb(), 'trainingen'))
  setDoc(ref, {
    ...training,
    aangemaaktDoor: state.huidigeTrainerId,
    aangemaaktOp: serverTimestamp(),
  }).catch(meldFout('Training opslaan'))
  return ref.id
}

/** Wijzigt een eigen training; de regels staan dit alleen toe aan wie hem toevoegde. */
export function werkTrainingBij(id: string, training: TrainingVelden) {
  updateDoc(doc(getDb(), 'trainingen', id), {
    ...training,
    // Een weggehaalde bijlage moet ook echt uit het document.
    bijlage: training.bijlage ?? deleteField(),
    gewijzigdOp: serverTimestamp(),
  }).catch(meldFout('Training wijzigen'))
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

// --- Trainingsopbouw (fix-21) -------------------------------------------------

/** Schrijft het hele jaarplan met een wijziging; elke wijziging maakt het weer concept. */
async function schrijfJaarplan(wijziging: Partial<Jaarplan>) {
  const jaarplan: Jaarplan = { ...state.jaarplan, ...wijziging, status: 'concept' }
  await setDoc(doc(getDb(), ...JAARPLAN_DOC), zonderUndefined(jaarplan))
}

export async function bewaarOpbouw(opbouw: Opbouw) {
  const bestaat = state.jaarplan.opbouwen.some((o) => o.id === opbouw.id)
  await schrijfJaarplan({
    opbouwen: bestaat
      ? state.jaarplan.opbouwen.map((o) => (o.id === opbouw.id ? opbouw : o))
      : [...state.jaarplan.opbouwen, opbouw],
  })
}

export async function verwijderOpbouw(id: string) {
  await schrijfJaarplan({ opbouwen: state.jaarplan.opbouwen.filter((o) => o.id !== id) })
}

export async function bewaarZones(zones: Zone[]) {
  await schrijfJaarplan({ zones })
}

export async function bewaarWedstrijd(w: Wedstrijd) {
  const { id, ...rest } = w
  const ref = id ? doc(getDb(), 'wedstrijden', id) : doc(collection(getDb(), 'wedstrijden'))
  await setDoc(ref, zonderUndefined(rest))
}

export async function verwijderWedstrijd(id: string) {
  await deleteDoc(doc(getDb(), 'wedstrijden', id))
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
    coordinator: u.coordinator,
    jaarplanBeheer: u.jaarplanBeheer,
    teamBeheer: u.teamBeheer,
    toezichthouder: u.toezichthouder,
    wedstrijdBeheer: u.wedstrijdBeheer,
  })
}

export async function trekUitnodigingIn(email: string) {
  await deleteDoc(doc(getDb(), 'uitnodigingen', email))
}

/** Wijzigt rol en/of taken van een teamlid. */
export async function wijzigTrainer(
  trainerId: string,
  wijziging: Partial<Taken> & { rol?: TrainerRol; naam?: string; initialen?: string },
) {
  await updateDoc(doc(getDb(), 'trainers', trainerId), wijziging)
}

export async function voegToezichthouderToe(naam: string, notitie: string) {
  await setDoc(doc(collection(getDb(), 'toezichthouders')), { naam: naam.trim(), notitie: notitie.trim() })
}

export async function verwijderToezichthouder(id: string) {
  await deleteDoc(doc(getDb(), 'toezichthouders', id))
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
  // Een paar varianten, zodat rollen en toezicht te testen zijn.
  const assistent = new Set(['Gert Mooi', 'Daphne Kuilman'])
  const toezicht = new Set(['Aalder Mellema', 'Pim Kool', 'Marlien Wijnhof', 'David Micó Martinez', 'Jeroen Eskens'])
  TESTTRAINERS.forEach((naam, i) => {
    batch.set(doc(db, 'trainers', testTrainerId(naam)), {
      naam,
      initialen: initialenVan(naam),
      kleur: TRAINER_KLEUREN[(i + 1) % TRAINER_KLEUREN.length].waarde,
      rol: assistent.has(naam) ? 'Assistent-trainer' : 'Trainer',
      specialiteit: '',
      email: '',
      test: true,
      coordinator: false,
      jaarplanBeheer: false,
      teamBeheer: false,
      toezichthouder: toezicht.has(naam),
      wedstrijdBeheer: false,
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

// ---------------------------------------------------------------------------
// Fix: fix-5 — trainingsmomenten, roosterperiodes en beschikbaarheid
// ---------------------------------------------------------------------------

export async function voegStandaardMomentenToe() {
  const db = getDb()
  const batch = writeBatch(db)
  STANDAARD_MOMENTEN.forEach((m) => batch.set(doc(collection(db, 'trainingsmomenten')), m))
  await batch.commit()
}

export async function bewaarMoment(m: Omit<Trainingsmoment, 'id'> & { id?: string }) {
  const { id, vasteTrainers, geldigVan, geldigTot, ritmeWeken, ...data } = m
  const ref = id ? doc(getDb(), 'trainingsmomenten', id) : doc(collection(getDb(), 'trainingsmomenten'))
  // Alleen gevulde optionele velden (Firestore kent geen undefined).
  await setDoc(ref, {
    ...data,
    ...(vasteTrainers?.length ? { vasteTrainers } : {}),
    ...(geldigVan ? { geldigVan } : {}),
    ...(geldigTot ? { geldigTot } : {}),
    ...(ritmeWeken && vasteTrainers?.length ? { ritmeWeken } : {}),
  })
}

export async function verwijderMoment(id: string) {
  await deleteDoc(doc(getDb(), 'trainingsmomenten', id))
}

export type NieuwePeriode = Pick<Roosterperiode, 'naam' | 'soort' | 'van' | 'tot' | 'deadline'>

export async function maakPeriode(p: NieuwePeriode) {
  const ref = doc(collection(getDb(), 'roosterperiodes'))
  await setDoc(ref, {
    ...p,
    status: 'concept',
    momentIds: p.soort === 'wekelijks' ? state.trainingsmomenten.filter((m) => m.actief).map((m) => m.id) : [],
    losseTrainingen: [],
    vervallenData: [],
    versie: 0,
    aangemaaktOp: serverTimestamp(),
  })
  return ref.id
}

/** Werkt velden van een periode bij (alleen de coördinator). */
export async function werkPeriodeBijRooster(
  id: string,
  w: Partial<Pick<Roosterperiode, 'naam' | 'van' | 'tot' | 'deadline' | 'status' | 'momentIds' | 'vervallenData'>> & {
    losseTrainingen?: LosseTraining[]
  },
) {
  await updateDoc(doc(getDb(), 'roosterperiodes', id), w)
}

export async function verwijderPeriode(id: string) {
  await deleteDoc(doc(getDb(), 'roosterperiodes', id))
}

export async function bewaarBeschikbaarheid(
  periodeId: string,
  trainerId: string,
  b: { keuzes: Record<string, Keuze>; maxPerMaand: number | null; nietKunnen: DatumBereik[] },
) {
  await setDoc(doc(getDb(), 'roosterperiodes', periodeId, 'beschikbaarheid', trainerId), {
    keuzes: b.keuzes,
    maxPerMaand: b.maxPerMaand,
    nietKunnen: b.nietKunnen,
    bijgewerktOp: serverTimestamp(),
    bijgewerktDoor: state.huidigeTrainerId,
  })
}

// ---------------------------------------------------------------------------
// Fix: fix-8 — testbeschikbaarheid (alleen testtrainers, om het rooster te testen)
// ---------------------------------------------------------------------------

/** Eenvoudige voorspelbare toevalsgenerator, zodat dezelfde trainer steeds iets vergelijkbaars krijgt. */
function toeval(zaad: string) {
  let h = 2166136261
  for (const c of zaad) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

/** Geeft alle testtrainers een willekeurige, realistische beschikbaarheid voor deze periode. */
export async function vulTestbeschikbaarheidIn(periode: Roosterperiode, sleutels: string[]) {
  const db = getDb()
  const batch = writeBatch(db)
  const test = state.trainers.filter((t) => t.test && t.rol !== 'Geen training')
  test.forEach((t) => {
    const r = toeval(`${periode.id}|${t.id}`)
    const keuzes: Record<string, Keuze> = {}
    sleutels.forEach((s) => {
      const x = r()
      keuzes[s] = x < 0.45 ? 'graag' : x < 0.7 ? 'kan' : 'nee'
    })
    // Zorg dat iedereen minstens één keer 'graag' heeft.
    if (sleutels.length > 0 && !Object.values(keuzes).includes('graag')) {
      keuzes[sleutels[Math.floor(r() * sleutels.length)]] = 'graag'
    }
    const maxOpties = [null, 2, 3, 3, 4]
    const nietKunnen: DatumBereik[] = []
    if (r() < 0.6) {
      // Eén vakantieweek ergens in de periode.
      const dagen = Math.max(0, Math.round((Date.parse(periode.tot) - Date.parse(periode.van)) / 86400000) - 7)
      const start = new Date(Date.parse(periode.van) + Math.floor(r() * dagen) * 86400000)
      const eind = new Date(start.valueOf() + 6 * 86400000)
      nietKunnen.push({ van: start.toISOString().slice(0, 10), tot: eind.toISOString().slice(0, 10) })
    }
    batch.set(doc(db, 'roosterperiodes', periode.id, 'beschikbaarheid', t.id), {
      keuzes,
      maxPerMaand: maxOpties[Math.floor(r() * maxOpties.length)],
      nietKunnen,
      bijgewerktOp: serverTimestamp(),
      bijgewerktDoor: state.huidigeTrainerId,
    })
  })
  await batch.commit()
  return test.length
}

/** Wist de beschikbaarheid van alle testtrainers voor deze periode. */
export async function wisTestbeschikbaarheid(periodeId: string) {
  const db = getDb()
  const batch = writeBatch(db)
  state.trainers
    .filter((t) => t.test)
    .forEach((t) => batch.delete(doc(db, 'roosterperiodes', periodeId, 'beschikbaarheid', t.id)))
  await batch.commit()
}

// ---------------------------------------------------------------------------
// Fix: fix-10 — indelen
// ---------------------------------------------------------------------------

/** Wijzigt de indeling van één training. */
export async function zetIndeling(periodeId: string, key: string, indeling: Indeling) {
  // Alleen gevulde velden opslaan (Firestore kent geen undefined).
  const schoon: Indeling = { trainers: indeling.trainers }
  if (indeling.nodig !== undefined) schoon.nodig = indeling.nodig
  if (indeling.toezicht) schoon.toezicht = indeling.toezicht
  if (indeling.extern) schoon.extern = indeling.extern
  if (indeling.extern && indeling.externToezicht) schoon.externToezicht = true
  if (indeling.zelf) schoon.zelf = true
  if (indeling.zelf && indeling.schema) schoon.schema = indeling.schema
  await updateDoc(doc(getDb(), 'roosterperiodes', periodeId), new FieldPath('indeling', key), schoon)
}

/** Vervangt de hele indeling (bijv. na "Voorstel maken"). */
export async function zetHeleIndeling(periodeId: string, indeling: IndelingMap) {
  await updateDoc(doc(getDb(), 'roosterperiodes', periodeId), { indeling })
}

export async function publiceerRooster(periode: Roosterperiode) {
  // Bij publiceren krijgt elke training een volledige indeling (met 'nodig'),
  // zodat trainers daarna veilig kunnen vrijgeven en overnemen.
  const trainingen = trainingenInPeriode(periode, state.trainingsmomenten, state.jaarplan)
  const indeling: IndelingMap = {}
  trainingen.forEach((t) => (indeling[t.key] = volledig(t, periode.indeling[t.key])))
  await updateDoc(doc(getDb(), 'roosterperiodes', periode.id), {
    indeling,
    status: 'gepubliceerd',
    versie: periode.versie + 1,
    gepubliceerdOp: serverTimestamp(),
    gepubliceerdDoor: state.huidigeTrainerId,
  })
}

// ---------------------------------------------------------------------------
// Fix: fix-11 — wijzigingen na publicatie (door trainers zelf)
// ---------------------------------------------------------------------------

function voornaamVan(id: string) {
  return (trainerById(id)?.naam ?? 'Iemand').split(' ')[0]
}

function logRegel(batch: ReturnType<typeof writeBatch>, periodeId: string, soort: LogSoort, tekst: string) {
  batch.set(doc(collection(getDb(), 'roosterperiodes', periodeId, 'wijzigingslog')), {
    soort,
    tekst: tekst.slice(0, 200),
    door: state.huidigeTrainerId,
    op: serverTimestamp(),
  })
}

function huidigeIndeling(periodeId: string, key: string): Indeling {
  const p = state.roosterperiodes.find((x) => x.id === periodeId)
  const i = p?.indeling[key]
  if (!p || !i) throw new Error('Training niet gevonden in het rooster')
  return i
}

/** Ik kan niet: mijn plek wordt een open plek die iedereen kan overnemen. */
export async function geefPlekVrij(periodeId: string, key: string, omschrijving: string) {
  const db = getDb()
  const ik = state.huidigeTrainerId
  const oud = huidigeIndeling(periodeId, key)
  const batch = writeBatch(db)
  batch.update(
    doc(db, 'roosterperiodes', periodeId),
    new FieldPath('indeling', key),
    { ...oud, trainers: oud.trainers.filter((x) => x !== ik) },
    'laatsteWijziging',
    { soort: 'vrijgeven', key, door: ik, op: serverTimestamp() },
  )
  logRegel(batch, periodeId, 'vrijgeven', `${voornaamVan(ik)} kan niet op ${omschrijving}: plek vrijgegeven`)
  await batch.commit()
}

/** Een open plek overnemen. */
export async function neemPlekOver(periodeId: string, key: string, omschrijving: string) {
  const db = getDb()
  const ik = state.huidigeTrainerId
  const oud = huidigeIndeling(periodeId, key)
  const batch = writeBatch(db)
  batch.update(
    doc(db, 'roosterperiodes', periodeId),
    new FieldPath('indeling', key),
    { ...oud, trainers: [...oud.trainers, ik] },
    'laatsteWijziging',
    { soort: 'overnemen', key, door: ik, op: serverTimestamp() },
  )
  logRegel(batch, periodeId, 'overnemen', `${voornaamVan(ik)} neemt ${omschrijving} over`)
  await batch.commit()
}

export async function vraagCollega(v: { periodeId: string; naar: string; vanKey: string; terugKey: string | null; bericht: string }) {
  await setDoc(doc(collection(getDb(), 'ruilverzoeken')), {
    ...v,
    bericht: v.bericht.trim().slice(0, 300),
    van: state.huidigeTrainerId,
    status: 'open',
    aangemaaktOp: serverTimestamp(),
  })
}

export async function trekVerzoekIn(id: string) {
  await updateDoc(doc(getDb(), 'ruilverzoeken', id), { status: 'ingetrokken', afgehandeldOp: serverTimestamp() })
}

export async function weigerVerzoek(id: string) {
  await updateDoc(doc(getDb(), 'ruilverzoeken', id), { status: 'geweigerd', afgehandeldOp: serverTimestamp() })
}

/** Verzoek accepteren: rooster en verzoek worden in één keer bijgewerkt. */
export async function accepteerVerzoek(v: Ruilverzoek, omschrijving: string) {
  const db = getDb()
  const ik = state.huidigeTrainerId
  const a = huidigeIndeling(v.periodeId, v.vanKey)
  const batch = writeBatch(db)
  const velden: unknown[] = [
    new FieldPath('indeling', v.vanKey),
    { ...a, trainers: [...a.trainers.filter((x) => x !== v.van), ik] },
  ]
  if (v.terugKey) {
    const b = huidigeIndeling(v.periodeId, v.terugKey)
    velden.push(new FieldPath('indeling', v.terugKey), { ...b, trainers: [...b.trainers.filter((x) => x !== ik), v.van] })
  }
  velden.push('laatsteWijziging', {
    soort: v.terugKey ? 'ruil' : 'overdracht',
    key: v.vanKey,
    verzoekId: v.id,
    door: ik,
    op: serverTimestamp(),
  })
  const [eerste, waarde, ...rest] = velden
  batch.update(doc(db, 'roosterperiodes', v.periodeId), eerste as FieldPath, waarde, ...rest)
  batch.update(doc(db, 'ruilverzoeken', v.id), { status: 'geaccepteerd', afgehandeldOp: serverTimestamp() })
  logRegel(
    batch,
    v.periodeId,
    v.terugKey ? 'ruil' : 'overdracht',
    v.terugKey
      ? `${voornaamVan(ik)} en ${voornaamVan(v.van)} ruilen: ${omschrijving}`
      : `${voornaamVan(ik)} neemt ${omschrijving} over van ${voornaamVan(v.van)}`,
  )
  await batch.commit()
}
