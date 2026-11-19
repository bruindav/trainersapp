/**
 * Eenvoudige client-side store bovenop de voorbeelddata.
 * Wijzigingen blijven bewaard zolang de pagina open is; na herladen start
 * de app weer met de voorbeelddata. Een volgende mijlpaal vervangt dit door
 * server functions die Netlify Database lezen en schrijven.
 */
import { useSyncExternalStore } from 'react'

import {
  GROEPEN,
  SESSIES,
  TRAINERS,
  maakStartdata,
  rotatieTrainer,
  sessieDatum,
  slotKey,
  type AppData,
  type Periode,
  type Training,
} from './fixtures'

let state: AppData = maakStartdata()
const serverState = state
const listeners = new Set<() => void>()

function setState(update: (s: AppData) => AppData) {
  state = update(state)
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useAppData(): AppData {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => serverState,
  )
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export function trainerById(id: string | null | undefined) {
  return TRAINERS.find((t) => t.id === id)
}

export function sessieById(id: string) {
  return SESSIES.find((s) => s.id === id)!
}

export function groepById(id: string) {
  return GROEPEN.find((g) => g.id === id)!
}

/** Toegewezen trainer voor een slot: handmatige wijziging, anders de rotatie. */
export function trainerVoorSlot(data: AppData, weekStart: string, sessieId: string, groepId: string) {
  const key = slotKey(weekStart, sessieId, groepId)
  if (key in data.roosterWijzigingen) return data.roosterWijzigingen[key]
  return rotatieTrainer(weekStart, sessieId, groepId)
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
// Acties
// ---------------------------------------------------------------------------

export function setHuidigeTrainer(id: string) {
  setState((s) => ({ ...s, huidigeTrainerId: id }))
}

export function wijsTrainerToe(weekStart: string, sessieId: string, groepId: string, trainerId: string | null) {
  setState((s) => ({
    ...s,
    roosterWijzigingen: { ...s.roosterWijzigingen, [slotKey(weekStart, sessieId, groepId)]: trainerId },
  }))
}

export function herstelRotatie(weekStart: string) {
  setState((s) => ({
    ...s,
    roosterWijzigingen: Object.fromEntries(
      Object.entries(s.roosterWijzigingen).filter(([k]) => !k.startsWith(`${weekStart}|`)),
    ),
  }))
}

export function voegTrainingToe(training: Omit<Training, 'id'>) {
  const id = `tr-nieuw-${Date.now()}`
  setState((s) => ({
    ...s,
    trainingen: [{ ...training, id }, ...s.trainingen].sort((a, b) => (a.datum < b.datum ? 1 : -1)),
  }))
  return id
}

export function verwijderTraining(id: string) {
  setState((s) => ({ ...s, trainingen: s.trainingen.filter((t) => t.id !== id) }))
}

export function werkPeriodeBij(periode: Periode) {
  setState((s) => ({
    ...s,
    jaarplan: {
      ...s.jaarplan,
      status: 'concept',
      periodes: s.jaarplan.periodes.map((p) => (p.id === periode.id ? periode : p)),
    },
  }))
}

export function publiceerJaarplan(datum: string) {
  setState((s) => ({
    ...s,
    jaarplan: {
      ...s.jaarplan,
      status: 'gepubliceerd',
      gepubliceerdOp: datum,
      gepubliceerdDoor: s.huidigeTrainerId,
      versie: s.jaarplan.versie + 1,
    },
  }))
}
