// Fix: fix-7 — formulier verhuisd naar eigen pagina; coördinator vult in via 'Wie kan wanneer'
// Fix: fix-5 — gedeelde onderdelen voor roosterperiodes en beschikbaarheid
import { Link } from '@tanstack/react-router'
import { CalendarCheck, PencilLine, ShieldCheck } from 'lucide-react'

import { TrainerAvatar } from '@/components/trainer-avatar'
import { Badge } from '@/components/ui/badge'
import { geeftTraining } from '@/data/fixtures'
import {
  STATUS_LABEL,
  STATUS_STAPPEN,
  isVolledigIngevuld,
  keuzeKolommen,
  type Beschikbaarheid,
  type Keuze,
  type PeriodeStatus,
  type Roosterperiode,
} from '@/data/rooster'
import { trainerById, useAppData } from '@/data/store'
import { formatLong, formatRange, formatShort, todayISO } from '@/lib/dates'
import { cn } from '@/lib/utils'

export function StatusBadge({ status }: { status: PeriodeStatus }) {
  const stijl: Record<PeriodeStatus, string> = {
    concept: 'bg-muted text-muted-foreground',
    beschikbaarheid: 'bg-accent text-accent-foreground',
    indelen: 'bg-nat-yellow/30 text-foreground',
    gepubliceerd: 'bg-nat-green/25 text-foreground',
    afgesloten: 'bg-muted text-muted-foreground',
  }
  return <Badge className={cn('border-transparent', stijl[status])}>{STATUS_LABEL[status]}</Badge>
}

export function StatusStappen({ status }: { status: PeriodeStatus }) {
  const huidig = STATUS_STAPPEN.findIndex((s) => s.status === status)
  return (
    <ol aria-label="Stappen" className="grid grid-cols-4 gap-2">
      {STATUS_STAPPEN.map((s, i) => {
        const nu = i === huidig || (status === 'afgesloten' && i === STATUS_STAPPEN.length - 1)
        return (
          <li key={s.status} className="space-y-1.5" aria-current={nu ? 'step' : undefined}>
            <span
              className={cn(
                'block h-1.5 rounded-full',
                i < huidig || status === 'afgesloten' ? 'bg-foreground' : nu ? 'bg-primary' : 'bg-border',
              )}
            />
            <span className={cn('block text-xs hyphens-manual', nu ? 'font-bold text-accent-foreground' : 'text-muted-foreground')}>
              {s.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/** Melding voor trainers die voor een open periode nog niets hebben ingevuld. */
export function BeschikbaarheidMelding() {
  const data = useAppData()
  const ik = trainerById(data.huidigeTrainerId)
  if (!ik || !geeftTraining(ik)) return null
  const open = data.roosterperiodes.filter(
    (p) =>
      p.status === 'beschikbaarheid' &&
      !isVolledigIngevuld(
        data.beschikbaarheid[p.id]?.[ik.id],
        keuzeKolommen(p, data.trainingsmomenten).map((k) => k.sleutel),
      ),
  )
  if (open.length === 0) return null
  return (
    <div className="space-y-2">
      {open.map((p) => (
        <Link
          key={p.id}
          to="/periodes/$periodeId/beschikbaarheid"
          params={{ periodeId: p.id }}
          search={{}}
          className="flex items-center gap-3 rounded-xl bg-primary p-4 text-primary-foreground transition-opacity hover:opacity-95 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none motion-reduce:transition-none"
        >
          <CalendarCheck className="size-6 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block font-bold">Wanneer kun jij trainen? · {p.naam}</span>
            <span className="block text-sm opacity-90">
              {p.deadline ? `Vul je beschikbaarheid in vóór ${formatLong(p.deadline)}.` : 'Vul je beschikbaarheid in.'}
            </span>
          </span>
          <span className="hidden rounded-full bg-white px-4 py-2 text-sm font-bold text-accent-foreground sm:block">
            Invullen
          </span>
        </Link>
      ))}
    </div>
  )
}

const CEL: Record<Keuze | 'leeg', { tekst: string; klasse: string; label: string }> = {
  graag: { tekst: 'G', klasse: 'bg-nat-green/20', label: 'graag' },
  kan: { tekst: 'A', klasse: 'bg-nat-yellow/25', label: 'als het moet' },
  nee: { tekst: '–', klasse: 'bg-muted text-muted-foreground', label: 'nee' },
  leeg: { tekst: '?', klasse: 'border border-dashed text-muted-foreground', label: 'nog niet ingevuld' },
}

/** Overzicht van ieders beschikbaarheid voor een periode. */
export function WieKanWanneer({ periode }: { periode: Roosterperiode }) {
  const data = useAppData()
  const ik = trainerById(data.huidigeTrainerId)
  const kolommen = keuzeKolommen(periode, data.trainingsmomenten)
  const trainers = data.trainers.filter(geeftTraining)
  const alle: Record<string, Beschikbaarheid> = data.beschikbaarheid[periode.id] ?? {}
  const vandaag = todayISO()

  if (trainers.length === 0) return <p className="text-muted-foreground">Er staan nog geen trainers in het team.</p>

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-max border-separate border-spacing-1 text-sm">
          <caption className="sr-only">Beschikbaarheid per trainer voor {periode.naam}</caption>
          <thead>
            <tr>
              <th scope="col" className="px-2 py-1 text-left text-xs font-bold text-muted-foreground">
                Trainer
              </th>
              {kolommen.map((k) => (
                <th key={k.sleutel} scope="col" title={k.lang} className="px-1 py-1 text-center text-xs font-bold text-muted-foreground">
                  {k.kort}
                </th>
              ))}
              <th scope="col" className="px-2 py-1 text-center text-xs font-bold text-muted-foreground">
                Max/mnd
              </th>
              <th scope="col" className="px-2 py-1 text-left text-xs font-bold text-muted-foreground">
                Kan niet
              </th>
            </tr>
          </thead>
          <tbody>
            {trainers.map((t) => {
              const b = alle[t.id]
              const komend = (b?.nietKunnen ?? []).filter((r) => r.tot >= vandaag)
              return (
                <tr key={t.id}>
                  <th scope="row" className="px-2 py-1 text-left font-semibold">
                    <span className="flex items-center gap-2">
                      <TrainerAvatar trainer={t} size="sm" />
                      <span className="whitespace-nowrap">{t.naam}</span>
                      {t.toezichthouder && (
                        <ShieldCheck className="size-4 text-nat-blue" aria-label="Toezichthouder" />
                      )}
                      {t.rol === 'Assistent-trainer' && (
                        <span className="text-xs font-normal text-muted-foreground">assistent</span>
                      )}
                      {ik?.coordinator && (
                        <Link
                          to="/periodes/$periodeId/beschikbaarheid"
                          params={{ periodeId: periode.id }}
                          search={{ trainer: t.id }}
                          className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                          aria-label={`Beschikbaarheid invullen voor ${t.naam}`}
                          title="Invullen namens deze trainer"
                        >
                          <PencilLine className="size-4" aria-hidden />
                        </Link>
                      )}
                    </span>
                  </th>
                  {kolommen.map((k) => {
                    const c = CEL[b?.keuzes[k.sleutel] ?? 'leeg']
                    return (
                      <td key={k.sleutel} className="p-0">
                        <span
                          className={cn('flex h-9 min-w-11 items-center justify-center rounded-md font-black', c.klasse)}
                          aria-label={`${k.kort}: ${c.label}`}
                        >
                          {c.tekst}
                        </span>
                      </td>
                    )
                  })}
                  <td className="px-2 text-center font-semibold">{b ? (b.maxPerMaand ?? '–') : '?'}</td>
                  <td className="max-w-56 px-2 text-xs text-muted-foreground">
                    {komend.length === 0
                      ? ''
                      : komend.map((r) => (r.van === r.tot ? formatShort(r.van) : formatRange(r.van, r.tot))).join(', ')}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" className="px-2 py-1 text-left text-xs font-bold text-muted-foreground">
                Graag / als het moet
              </th>
              {kolommen.map((k) => {
                const graag = trainers.filter((t) => alle[t.id]?.keuzes[k.sleutel] === 'graag').length
                const kan = trainers.filter((t) => alle[t.id]?.keuzes[k.sleutel] === 'kan').length
                return (
                  <td key={k.sleutel} className="px-1 py-1 text-center text-xs font-semibold">
                    {graag} / {kan}
                  </td>
                )
              })}
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          <strong className="text-foreground">G</strong> graag
        </span>
        <span>
          <strong className="text-foreground">A</strong> als het moet
        </span>
        <span>
          <strong className="text-foreground">–</strong> nee
        </span>
        <span>
          <strong className="text-foreground">?</strong> nog niet ingevuld
        </span>
        <span className="inline-flex items-center gap-1">
          <ShieldCheck className="size-3.5 text-nat-blue" aria-hidden /> toezichthouder
        </span>
      </p>
    </div>
  )
}
