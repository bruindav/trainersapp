// Fix: fix-36 — nogVastTeLeggen: ook vastgelegd als een collega het deed
// Fix: fix-11 — na publicatie: vrijgeven, overnemen, ruilen; gepubliceerde trainingen
import { SESSIES, type AppData, type Trainer } from './fixtures'
import { addDays, startOfWeek } from '@/lib/dates'
import { controleer, openPlekken, type Indeling } from './indeling'
import { trainingenInPeriode, type PeriodeTraining, type Roosterperiode } from './rooster'

export type VerzoekStatus = 'open' | 'geaccepteerd' | 'geweigerd' | 'ingetrokken'

/** Verzoek aan één collega om een training over te nemen (of te ruilen). */
export interface Ruilverzoek {
  id: string
  periodeId: string
  /** Aanvrager (staat nu ingeroosterd op vanKey). */
  van: string
  /** Gevraagde collega. */
  naar: string
  vanKey: string
  /** Training van de collega die de aanvrager terug overneemt (ruil); null = alleen overnemen. */
  terugKey: string | null
  status: VerzoekStatus
  bericht: string
  aangemaaktOp: string
}

export type LogSoort = 'vrijgeven' | 'overnemen' | 'ruil' | 'overdracht' | 'indeling'

export interface LogRegel {
  id: string
  periodeId: string
  soort: LogSoort
  tekst: string
  door: string
  op: string
}

export interface GeroosterdeTraining {
  periode: Roosterperiode
  training: PeriodeTraining
  indeling: Indeling | undefined
  open: number
  toezichtOk: boolean
}

/** Alle trainingen uit gepubliceerde periodes, op datum en tijd. */
export function gepubliceerdeTrainingen(data: AppData): GeroosterdeTraining[] {
  const uit: GeroosterdeTraining[] = []
  for (const p of data.roosterperiodes) {
    if (p.status !== 'gepubliceerd') continue
    const besch = data.beschikbaarheid[p.id] ?? {}
    for (const t of trainingenInPeriode(p, data.trainingsmomenten, data.jaarplan)) {
      const i = p.indeling[t.key]
      uit.push({
        periode: p,
        training: t,
        indeling: i,
        open: openPlekken(t, i),
        toezichtOk: !controleer(t, i, data.trainers, besch).some((w) => w.soort === 'toezicht'),
      })
    }
  }
  return uit.sort((a, b) => a.training.datum.localeCompare(b.training.datum) || a.training.start.localeCompare(b.training.start))
}

export function staatIngeroosterd(g: GeroosterdeTraining, trainerId: string) {
  return g.indeling?.trainers.includes(trainerId) ?? false
}

/** Kan deze trainer deze open plek overnemen? */
export function kanOvernemen(g: GeroosterdeTraining, trainer: Trainer) {
  return g.open > 0 && trainer.rol !== 'Geen training' && !staatIngeroosterd(g, trainer.id)
}

/**
 * Mijn ingeroosterde trainingen van vorige en deze week die nog niet in het logboek staan.
 * fix-36: vastgelegd = er staat een training op die datum en dat tijdstip (door wie dan
 * ook, bv. de andere trainer van die ochtend), of een die ik gaf of toevoegde.
 */
export function nogVastTeLeggen(data: AppData, vandaag: string) {
  const ik = data.huidigeTrainerId
  const isVastgelegd = (datum: string, start: string) =>
    data.trainingen.some(
      (t) =>
        t.datum === datum &&
        (SESSIES.find((s) => s.id === t.sessieId)?.start === start || t.trainerId === ik || t.aangemaaktDoor === ik),
    )
  return gepubliceerdeTrainingen(data).filter(
    (g) =>
      staatIngeroosterd(g, ik) &&
      g.training.datum < vandaag &&
      g.training.datum >= addDays(startOfWeek(vandaag), -7) &&
      !isVastgelegd(g.training.datum, g.training.start),
  )
}
