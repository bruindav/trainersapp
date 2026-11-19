// Fix: fix-5 — gedeelde onderdelen voor roosterperiodes en beschikbaarheid
import { Link } from '@tanstack/react-router'
import { CalendarCheck, Check, Minus, Plus, ShieldCheck, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { TrainerAvatar } from '@/components/trainer-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { geeftTraining, type Trainer } from '@/data/fixtures'
import {
  KEUZES,
  STATUS_LABEL,
  STATUS_STAPPEN,
  isVolledigIngevuld,
  keuzeKolommen,
  type Beschikbaarheid,
  type DatumBereik,
  type Keuze,
  type PeriodeStatus,
  type Roosterperiode,
} from '@/data/rooster'
import { bewaarBeschikbaarheid, trainerById, useAppData } from '@/data/store'
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
            <span className={cn('block text-xs break-words hyphens-manual', nu ? 'font-bold text-accent-foreground' : 'text-muted-foreground')}>
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
          to="/periodes/$periodeId"
          params={{ periodeId: p.id }}
          hash="mijn-beschikbaarheid"
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

const KEUZE_STIJL: Record<Keuze, string> = {
  graag: 'border-nat-green bg-nat-green/15 text-foreground',
  kan: 'border-nat-yellow bg-nat-yellow/20 text-foreground',
  nee: 'border-foreground bg-foreground text-background',
}

/** Formulier waarmee een trainer (of de coördinator namens iemand) beschikbaarheid opgeeft. */
export function BeschikbaarheidFormulier({
  periode,
  trainer,
  magBewerken,
}: {
  periode: Roosterperiode
  trainer: Trainer
  magBewerken: boolean
}) {
  const data = useAppData()
  const kolommen = keuzeKolommen(periode, data.trainingsmomenten)
  const bestaand = data.beschikbaarheid[periode.id]?.[trainer.id]
  // Concept-invoer; begint bij wat al is opgeslagen (opnieuw bij wisselen van trainer via key).
  const [keuzes, setKeuzes] = useState<Record<string, Keuze>>(bestaand?.keuzes ?? {})
  const [max, setMax] = useState<number | null>(bestaand?.maxPerMaand ?? null)
  const [nietKunnen, setNietKunnen] = useState<DatumBereik[]>(bestaand?.nietKunnen ?? [])
  const [nieuwVan, setNieuwVan] = useState('')
  const [nieuwTot, setNieuwTot] = useState('')
  const [bezig, setBezig] = useState(false)
  const ingevuld = kolommen.filter((k) => keuzes[k.sleutel]).length
  const ikZelf = trainer.id === data.huidigeTrainerId

  function voegDatumToe(e: FormEvent) {
    e.preventDefault()
    if (!nieuwVan) return
    const tot = nieuwTot && nieuwTot >= nieuwVan ? nieuwTot : nieuwVan
    setNietKunnen((x) => [...x, { van: nieuwVan, tot }].sort((a, b) => a.van.localeCompare(b.van)))
    setNieuwVan('')
    setNieuwTot('')
  }

  async function opslaan() {
    setBezig(true)
    try {
      await bewaarBeschikbaarheid(periode.id, trainer.id, { keuzes, maxPerMaand: max, nietKunnen })
      toast.success(ikZelf ? 'Je beschikbaarheid is opgeslagen' : `Beschikbaarheid van ${trainer.naam} opgeslagen`)
    } catch {
      toast.error('Opslaan lukte niet. Probeer het opnieuw.')
    } finally {
      setBezig(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {kolommen.length === 0 && (
          <p className="text-muted-foreground">Deze periode heeft nog geen trainingen om te kiezen.</p>
        )}
        {kolommen.map((k) => (
          <fieldset key={k.sleutel} className="space-y-2 rounded-xl border bg-card p-3">
            <legend className="sr-only">{k.lang}</legend>
            <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
              <span className="font-bold">{k.kort}</span>
              <span className="text-muted-foreground">{k.lang}</span>
            </p>
            <div className="grid grid-cols-3 gap-2">
              {KEUZES.map((c) => {
                const aan = keuzes[k.sleutel] === c.waarde
                return (
                  <button
                    key={c.waarde}
                    type="button"
                    aria-pressed={aan}
                    disabled={!magBewerken}
                    onClick={() => setKeuzes((x) => ({ ...x, [k.sleutel]: c.waarde }))}
                    className={cn(
                      'h-11 rounded-lg border text-sm font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60 motion-reduce:transition-none',
                      aan ? KEUZE_STIJL[c.waarde] : 'border-border bg-background text-muted-foreground hover:bg-accent',
                    )}
                  >
                    {c.label}
                  </button>
                )
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3">
        <div>
          <p className="font-bold" id="max-label">
            Hoogstens per maand
          </p>
          <p className="text-sm text-muted-foreground">
            {max === null ? 'Geen voorkeur' : `Ongeveer ${max} training${max === 1 ? '' : 'en'} per maand`}
          </p>
        </div>
        <div className="flex items-center gap-1" role="group" aria-labelledby="max-label">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 rounded-full"
            aria-label="Minder"
            disabled={!magBewerken || max === null}
            onClick={() => setMax((m) => (m === null || m <= 1 ? null : m - 1))}
          >
            <Minus aria-hidden />
          </Button>
          <span className="min-w-8 text-center text-lg font-black" aria-live="polite">
            {max ?? '–'}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 rounded-full"
            aria-label="Meer"
            disabled={!magBewerken || (max ?? 0) >= 31}
            onClick={() => setMax((m) => Math.min(31, (m ?? 0) + 1))}
          >
            <Plus aria-hidden />
          </Button>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border bg-card p-3">
        <p className="font-bold">Data dat {ikZelf ? 'ik' : `${trainer.naam.split(' ')[0]}`} niet kan</p>
        {nietKunnen.length === 0 ? (
          <p className="text-sm text-muted-foreground">Geen.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {nietKunnen.map((r, i) => (
              <li key={`${r.van}-${r.tot}-${i}`}>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted py-1 pr-1 pl-3 text-sm font-semibold">
                  {r.van === r.tot ? formatShort(r.van) : formatRange(r.van, r.tot)}
                  {magBewerken && (
                    <button
                      type="button"
                      className="inline-flex size-8 items-center justify-center rounded-full hover:bg-background focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                      aria-label={`Verwijder ${r.van === r.tot ? formatShort(r.van) : formatRange(r.van, r.tot)}`}
                      onClick={() => setNietKunnen((x) => x.filter((_, j) => j !== i))}
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        {magBewerken && (
          <form onSubmit={voegDatumToe} className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor={`nk-van-${trainer.id}`} className="text-xs">
                Van
              </Label>
              <Input
                id={`nk-van-${trainer.id}`}
                type="date"
                min={periode.van}
                max={periode.tot}
                value={nieuwVan}
                onChange={(e) => setNieuwVan(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`nk-tot-${trainer.id}`} className="text-xs">
                Tot en met (optioneel)
              </Label>
              <Input
                id={`nk-tot-${trainer.id}`}
                type="date"
                min={nieuwVan || periode.van}
                max={periode.tot}
                value={nieuwTot}
                onChange={(e) => setNieuwTot(e.target.value)}
              />
            </div>
            <Button type="submit" variant="outline" disabled={!nieuwVan}>
              <Plus aria-hidden /> Toevoegen
            </Button>
          </form>
        )}
      </div>

      {magBewerken && (
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg" className="rounded-full" disabled={bezig} onClick={opslaan}>
            <Check aria-hidden /> {ikZelf ? 'Beschikbaarheid opslaan' : `Opslaan voor ${trainer.naam.split(' ')[0]}`}
          </Button>
          <span className="text-sm text-muted-foreground">
            {ingevuld} van {kolommen.length} gekozen
          </span>
        </div>
      )}
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
