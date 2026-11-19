// Fix: fix-10 — indelen door de coördinator; na publicatie het rooster voor iedereen
import { Link, createFileRoute } from '@tanstack/react-router'
import { AlertTriangle, ArrowLeft, Minus, Plus, Send, ShieldCheck, Sparkles, UserPlus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { InklapbareKaart } from '@/components/inklapbare-kaart'
import { StatusBadge } from '@/components/rooster-onderdelen'
import { TrainerAvatar } from '@/components/trainer-avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { geeftTraining, type Trainer } from '@/data/fixtures'
import {
  controleer,
  maakVoorstel,
  maandVan,
  nodigVoor,
  tellingen,
  toezichtNaam,
  type Indeling,
  type Waarschuwing,
} from '@/data/indeling'
import {
  DAGEN_KORT,
  dagVan,
  kanNietOp,
  trainingenInPeriode,
  type Beschikbaarheid,
  type Keuze,
  type PeriodeTraining,
  type Roosterperiode,
} from '@/data/rooster'
import { publiceerRooster, trainerById, useAppData, zetHeleIndeling, zetIndeling } from '@/data/store'
import { formatRange, formatShort, isoWeekNumber, startOfWeek, addDays } from '@/lib/dates'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/periodes/$periodeId_/indelen')({
  component: IndelenPagina,
})

const MAAND_NAMEN = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

function IndelenPagina() {
  const { periodeId } = Route.useParams()
  const data = useAppData()
  const ik = trainerById(data.huidigeTrainerId)!
  const periode = data.roosterperiodes.find((p) => p.id === periodeId)

  if (!periode) {
    return (
      <div className="mx-auto max-w-content space-y-4 px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-black">Periode niet gevonden</h1>
        <Button asChild variant="outline">
          <Link to="/periodes">
            <ArrowLeft aria-hidden /> Naar roosterperiodes
          </Link>
        </Button>
      </div>
    )
  }

  const magBewerken = ik.coordinator && (periode.status === 'indelen' || periode.status === 'gepubliceerd')
  const zichtbaar = ik.coordinator || periode.status === 'gepubliceerd' || periode.status === 'afgesloten'

  return (
    <>
      <div className="bg-nat-ink text-white">
        <div className="mx-auto max-w-content space-y-3 px-4 pt-6 pb-8 sm:px-6">
          <Link
            to="/periodes/$periodeId"
            params={{ periodeId: periode.id }}
            className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-white/80 hover:text-white"
          >
            <ArrowLeft className="size-4" aria-hidden /> {periode.naam}
          </Link>
          <h1 className="text-3xl font-black tracking-tight">{magBewerken ? 'Indelen' : 'Rooster'}</h1>
          <p className="flex flex-wrap items-center gap-2 text-white/80">
            {periode.naam} · {formatRange(periode.van, periode.tot)} <StatusBadge status={periode.status} />
          </p>
        </div>
      </div>
      {zichtbaar ? (
        <Rooster periode={periode} magBewerken={magBewerken} />
      ) : (
        <div className="mx-auto max-w-content px-4 py-10 sm:px-6">
          <Alert>
            <AlertDescription>Het rooster wordt nog ingedeeld. Je ziet het hier zodra de coördinator het publiceert.</AlertDescription>
          </Alert>
        </div>
      )}
    </>
  )
}

function Rooster({ periode, magBewerken }: { periode: Roosterperiode; magBewerken: boolean }) {
  const data = useAppData()
  const ikId = data.huidigeTrainerId
  const besch = useMemo(() => data.beschikbaarheid[periode.id] ?? {}, [data.beschikbaarheid, periode.id])
  const trainingen = useMemo(
    () => trainingenInPeriode(periode, data.trainingsmomenten, data.jaarplan),
    [periode, data.trainingsmomenten, data.jaarplan],
  )
  const maanden = [...new Set(trainingen.map((t) => maandVan(t.datum)))]
  const [maand, setMaand] = useState(maanden[0] ?? '')
  const [alleenAandacht, setAlleenAandacht] = useState(false)
  const [alleenIk, setAlleenIk] = useState(false)
  const [open, setOpen] = useState<PeriodeTraining | null>(null)
  const [voorstelVragen, setVoorstelVragen] = useState(false)
  const [publiceren, setPubliceren] = useState(false)
  const [bezig, setBezig] = useState(false)

  const waarschuwingen = useMemo(() => {
    const m = new Map<string, Waarschuwing[]>()
    trainingen.forEach((t) => m.set(t.key, controleer(t, periode.indeling[t.key], data.trainers, besch)))
    return m
  }, [trainingen, periode.indeling, data.trainers, besch])

  const tel = (soort: Waarschuwing['soort']) =>
    trainingen.filter((t) => waarschuwingen.get(t.key)?.some((w) => w.soort === soort)).length
  const open_ = trainingen.reduce(
    (n, t) => n + Math.max(0, nodigVoor(t, periode.indeling[t.key]) - (periode.indeling[t.key]?.trainers.length ?? 0)),
    0,
  )
  const ingedeeld = Object.keys(periode.indeling).length > 0

  const zichtbaar = trainingen.filter(
    (t) =>
      maandVan(t.datum) === maand &&
      (!alleenAandacht || waarschuwingen.get(t.key)?.some((w) => w.ernstig)) &&
      (!alleenIk || periode.indeling[t.key]?.trainers.includes(ikId)),
  )
  const weken = new Map<string, PeriodeTraining[]>()
  zichtbaar.forEach((t) => {
    const w = startOfWeek(t.datum)
    weken.set(w, [...(weken.get(w) ?? []), t])
  })

  async function voerUit(actie: () => Promise<void>, melding: string) {
    setBezig(true)
    try {
      await actie()
      toast.success(melding)
    } catch {
      toast.error('Opslaan lukte niet. Probeer het opnieuw.')
    } finally {
      setBezig(false)
    }
  }

  function maakVoorstelNu() {
    const voorstel = maakVoorstel(trainingen, data.trainers, besch, periode.indeling)
    voerUit(() => zetHeleIndeling(periode.id, voorstel), 'Voorstel gemaakt. Pas aan waar nodig.')
    setVoorstelVragen(false)
  }

  return (
    <div className="mx-auto max-w-content space-y-6 px-4 py-6 sm:px-6">
      {magBewerken && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="lg"
            className="rounded-full"
            disabled={bezig || trainingen.length === 0}
            onClick={() => (ingedeeld ? setVoorstelVragen(true) : maakVoorstelNu())}
          >
            <Sparkles aria-hidden /> Voorstel maken
          </Button>
          {periode.status === 'indelen' && (
            <Button size="lg" className="rounded-full" disabled={bezig || !ingedeeld} onClick={() => setPubliceren(true)}>
              <Send aria-hidden /> Publiceren
            </Button>
          )}
          {periode.status === 'gepubliceerd' && (
            <p className="self-center text-sm text-muted-foreground">
              Gepubliceerd (versie {periode.versie}). Wijzigingen zijn direct zichtbaar voor iedereen.
            </p>
          )}
        </div>
      )}

      {(magBewerken || open_ > 0) && (
        <div role="status" className="flex flex-wrap gap-2">
          <Teller aantal={open_} tekst="open plekken" ernstig />
          <Teller aantal={tel('toezicht')} tekst="zonder toezichthouder" ernstig />
          <Teller aantal={tel('kanNiet')} tekst="iemand kan eigenlijk niet" ernstig />
          <Teller aantal={tel('assistent')} tekst="assistent alleen" />
          <Teller aantal={tel('feestdag')} tekst="op een feestdag" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Maand" className="flex flex-wrap gap-1.5">
          {maanden.map((m) => (
            <Button
              key={m}
              role="tab"
              aria-selected={m === maand}
              size="sm"
              variant={m === maand ? 'default' : 'outline'}
              className="h-9 min-w-12 rounded-full"
              onClick={() => setMaand(m)}
            >
              {MAAND_NAMEN[Number(m.slice(5, 7)) - 1]}
            </Button>
          ))}
        </div>
        <span className="ml-auto flex flex-wrap gap-1.5">
          {magBewerken && (
            <Button
              size="sm"
              variant={alleenAandacht ? 'default' : 'outline'}
              aria-pressed={alleenAandacht}
              className="h-9 rounded-full"
              onClick={() => setAlleenAandacht((x) => !x)}
            >
              <AlertTriangle aria-hidden /> Alleen aandachtspunten
            </Button>
          )}
          {geeftTraining(trainerById(ikId)!) && (
            <Button
              size="sm"
              variant={alleenIk ? 'default' : 'outline'}
              aria-pressed={alleenIk}
              className="h-9 rounded-full"
              onClick={() => setAlleenIk((x) => !x)}
            >
              Alleen mijn trainingen
            </Button>
          )}
        </span>
      </div>

      {weken.size === 0 && <p className="text-muted-foreground">Geen trainingen om te tonen.</p>}
      {[...weken.entries()].map(([week, lijst]) => (
        <section key={week} aria-labelledby={`wk-${week}`} className="space-y-2">
          <h2 id={`wk-${week}`} className="text-sm font-bold text-muted-foreground">
            Week {isoWeekNumber(week)} · {formatRange(week, addDays(week, 6))}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {lijst.map((t) => (
              <TrainingKaart
                key={t.key}
                training={t}
                indeling={periode.indeling[t.key]}
                waarschuwingen={waarschuwingen.get(t.key) ?? []}
                ikId={ikId}
                besch={besch}
                magBewerken={magBewerken}
                onKies={() => setOpen(t)}
              />
            ))}
          </div>
        </section>
      ))}

      {magBewerken && <Verdeling periode={periode} trainingen={trainingen} maand={maand} />}

      {open && (
        <IndelenDialog
          periode={periode}
          training={open}
          trainingen={trainingen}
          onClose={() => setOpen(null)}
        />
      )}

      <Dialog open={voorstelVragen} onOpenChange={setVoorstelVragen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuw voorstel maken?</DialogTitle>
            <DialogDescription>
              De huidige indeling wordt vervangen door een nieuw voorstel op basis van ieders beschikbaarheid. Extra
              trainers en gekozen toezichthouders blijven staan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setVoorstelVragen(false)}>
              Annuleren
            </Button>
            <Button onClick={maakVoorstelNu}>Vervangen door voorstel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={publiceren} onOpenChange={setPubliceren}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rooster publiceren?</DialogTitle>
            <DialogDescription>
              Iedereen ziet daarna zijn eigen trainingen. Je kunt daarna nog steeds wijzigen.
            </DialogDescription>
          </DialogHeader>
          {(open_ > 0 || tel('toezicht') > 0 || tel('kanNiet') > 0) && (
            <Alert variant="destructive">
              <AlertDescription>
                Nog niet alles is rond: {open_} open plekken, {tel('toezicht')} trainingen zonder toezichthouder
                {tel('kanNiet') > 0 ? `, ${tel('kanNiet')} waar iemand eigenlijk niet kan` : ''}. Open plekken worden
                straks voor iedereen zichtbaar.
              </AlertDescription>
            </Alert>
          )}
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setPubliceren(false)}>
              Nog niet
            </Button>
            <Button
              disabled={bezig}
              onClick={() => {
                setPubliceren(false)
                voerUit(() => publiceerRooster(periode), 'Rooster gepubliceerd')
              }}
            >
              <Send aria-hidden /> Publiceren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Teller({ aantal, tekst, ernstig = false }: { aantal: number; tekst: string; ernstig?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold',
        aantal === 0 ? 'bg-nat-green/15 text-foreground' : ernstig ? 'bg-destructive/15 text-foreground' : 'bg-nat-yellow/25 text-foreground',
      )}
    >
      <strong>{aantal}</strong> {tekst}
    </span>
  )
}

function TrainingKaart({
  training: t,
  indeling,
  waarschuwingen,
  ikId,
  besch,
  magBewerken,
  onKies,
}: {
  training: PeriodeTraining
  indeling: Indeling | undefined
  waarschuwingen: Waarschuwing[]
  ikId: string
  besch: Record<string, Beschikbaarheid>
  magBewerken: boolean
  onKies: () => void
}) {
  const data = useAppData()
  const ids = indeling?.trainers ?? []
  const nodig = nodigVoor(t, indeling)
  const ernstig = waarschuwingen.some((w) => w.ernstig && w.soort !== 'feestdag')
  const mijn = ids.includes(ikId)
  const toezicht = toezichtNaam(indeling?.toezicht, data.trainers, data.toezichthouders)

  const inhoud = (
    <>
      <span className="flex items-baseline justify-between gap-2">
        <span className="font-bold">
          {DAGEN_KORT[dagVan(t.datum)]} {formatShort(t.datum)}
        </span>
        <span className="text-sm text-muted-foreground">
          {t.start}–{t.eind}
        </span>
      </span>
      {(t.omschrijving || t.feestdag) && (
        <span className="flex flex-wrap gap-1 text-xs">
          {t.omschrijving && <span className="text-muted-foreground">{t.omschrijving}</span>}
          {t.feestdag && <span className="rounded bg-nat-yellow/30 px-1 font-semibold">{t.feestdag}</span>}
        </span>
      )}
      <span className="flex flex-col gap-1">
        {ids.map((id) => {
          const tr = trainerById(id)
          const b = besch[id]
          const k: Keuze | undefined = b?.keuzes[t.keuzeSleutel]
          const kanNiet = k === 'nee' || kanNietOp(b, t.datum)
          return (
            <span
              key={id}
              className={cn(
                'flex min-h-8 items-center gap-2 rounded-md border px-2 text-sm',
                kanNiet ? 'border-destructive bg-destructive/10' : k === 'kan' ? 'border-nat-yellow bg-nat-yellow/15' : 'bg-background',
                id === ikId && 'font-bold',
              )}
            >
              {tr && <TrainerAvatar trainer={tr} size="sm" />}
              <span className="min-w-0 flex-1 truncate">{id === ikId ? `${tr?.naam ?? ''} (jij)` : tr?.naam}</span>
              {tr?.toezichthouder && <ShieldCheck className="size-3.5 shrink-0 text-nat-blue" aria-label="Toezichthouder" />}
            </span>
          )
        })}
        {Array.from({ length: Math.max(0, nodig - ids.length) }).map((_, i) => (
          <span
            key={`open-${i}`}
            className="flex min-h-8 items-center gap-2 rounded-md border border-dashed border-destructive px-2 text-sm font-semibold text-destructive"
          >
            <UserPlus className="size-4" aria-hidden /> Open plek
          </span>
        ))}
      </span>
      {toezicht && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 text-nat-blue" aria-hidden /> Toezicht: {toezicht}
        </span>
      )}
      {waarschuwingen.filter((w) => w.soort !== 'feestdag' && w.soort !== 'open').length > 0 && (
        <span className="flex flex-col gap-0.5 text-xs">
          {waarschuwingen
            .filter((w) => w.soort !== 'feestdag' && w.soort !== 'open')
            .map((w, i) => (
              <span key={i} className={cn('flex items-center gap-1', w.ernstig ? 'text-destructive' : 'text-muted-foreground')}>
                <AlertTriangle className="size-3" aria-hidden /> {w.tekst}
              </span>
            ))}
        </span>
      )}
    </>
  )

  const klasse = cn(
    'flex w-full flex-col gap-2 rounded-xl border bg-card p-3 text-left',
    ernstig && magBewerken && 'border-destructive/60',
    mijn && !magBewerken && 'ring-2 ring-nat-blue',
  )
  return magBewerken ? (
    <button
      type="button"
      onClick={onKies}
      className={cn(klasse, 'transition-colors outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none')}
      aria-label={`${DAGEN_KORT[dagVan(t.datum)]} ${formatShort(t.datum)} ${t.start} indelen`}
    >
      {inhoud}
    </button>
  ) : (
    <div className={klasse}>{inhoud}</div>
  )
}

const KEUZE_VOLGORDE: Record<string, number> = { graag: 0, kan: 1, onbekend: 2, nee: 3 }
const KEUZE_TEKST: Record<string, string> = { graag: 'Graag', kan: 'Als het moet', nee: 'Nee', onbekend: 'Niet ingevuld' }

function IndelenDialog({
  periode,
  training: t,
  trainingen,
  onClose,
}: {
  periode: Roosterperiode
  training: PeriodeTraining
  trainingen: PeriodeTraining[]
  onClose: () => void
}) {
  const data = useAppData()
  const besch = data.beschikbaarheid[periode.id] ?? {}
  const huidig = periode.indeling[t.key]
  const [gekozen, setGekozen] = useState<string[]>(huidig?.trainers ?? [])
  const [nodig, setNodig] = useState(nodigVoor(t, huidig))
  const [toezicht, setToezicht] = useState(huidig?.toezicht ?? 'auto')
  const [bezig, setBezig] = useState(false)
  const tel = tellingen(trainingen, periode.indeling)
  const maand = maandVan(t.datum)

  const kandidaten = data.trainers
    .filter(geeftTraining)
    .map((tr) => {
      const b = besch[tr.id]
      const keuze = b?.keuzes[t.keuzeSleutel] ?? 'onbekend'
      const kanNiet = kanNietOp(b, t.datum)
      const inMaand = tel.get(`${tr.id}|${maand}`) ?? 0
      return { tr, keuze: kanNiet ? 'nee' : keuze, kanNiet, inMaand, max: b?.maxPerMaand ?? null }
    })
    .sort(
      (a, b) =>
        KEUZE_VOLGORDE[a.keuze] - KEUZE_VOLGORDE[b.keuze] || a.inMaand - b.inMaand || a.tr.naam.localeCompare(b.tr.naam, 'nl'),
    )

  function wissel(id: string) {
    setGekozen((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]))
  }

  async function opslaan() {
    setBezig(true)
    try {
      await zetIndeling(periode.id, t.key, {
        trainers: gekozen,
        nodig: nodig !== t.trainersNodig ? nodig : undefined,
        toezicht: toezicht === 'auto' ? null : toezicht,
      })
      toast.success('Indeling opgeslagen')
      onClose()
    } catch {
      toast.error('Opslaan lukte niet. Probeer het opnieuw.')
    } finally {
      setBezig(false)
    }
  }

  const bevoegdIngedeeld = gekozen.some((id) => trainerById(id)?.toezichthouder)

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {DAGEN_KORT[dagVan(t.datum)]} {formatShort(t.datum)} · {t.start}–{t.eind}
          </DialogTitle>
          <DialogDescription>
            {t.feestdag ? `${t.feestdag} · ` : ''}Kies {nodig === 1 ? 'een trainer' : `${nodig} trainers`}. Bovenaan staan
            wie graag wil en het minst staat.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3 rounded-lg bg-muted p-2 pl-3">
          <span className="text-sm font-semibold" id="nodig-label">
            Trainers nodig bij deze training
          </span>
          <span className="flex items-center gap-1" role="group" aria-labelledby="nodig-label">
            <Button
              variant="outline"
              size="icon"
              className="size-9 rounded-full"
              aria-label="Eén minder"
              disabled={nodig <= 1}
              onClick={() => setNodig((n) => n - 1)}
            >
              <Minus aria-hidden />
            </Button>
            <span className="min-w-6 text-center font-black" aria-live="polite">
              {nodig}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-9 rounded-full"
              aria-label="Eén extra"
              disabled={nodig >= 6}
              onClick={() => setNodig((n) => n + 1)}
            >
              <Plus aria-hidden />
            </Button>
          </span>
        </div>

        <ul className="space-y-1.5" aria-label="Trainers">
          {kandidaten.map(({ tr, keuze, kanNiet, inMaand, max }) => {
            const aan = gekozen.includes(tr.id)
            const boven = max !== null && inMaand >= max && !huidig?.trainers.includes(tr.id)
            return (
              <li key={tr.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={aan}
                  onClick={() => wissel(tr.id)}
                  className={cn(
                    'flex min-h-12 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none',
                    aan ? 'border-primary bg-accent' : 'hover:bg-accent',
                  )}
                >
                  <TrainerAvatar trainer={tr} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 font-semibold">
                      {tr.naam}
                      {tr.toezichthouder && <ShieldCheck className="size-3.5 text-nat-blue" aria-label="Toezichthouder" />}
                      {tr.rol === 'Assistent-trainer' && <span className="text-xs font-normal text-muted-foreground">assistent</span>}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {kanNiet ? 'Kan niet op deze datum' : KEUZE_TEKST[keuze]} · {inMaand}× in {MAAND_NAMEN[Number(maand.slice(5, 7)) - 1]}
                      {max !== null ? ` (max ${max})` : ''}
                    </span>
                  </span>
                  {(keuze === 'nee' || boven) && (
                    <Badge variant="outline" className="border-destructive text-destructive">
                      {keuze === 'nee' ? 'kan niet' : 'boven max'}
                    </Badge>
                  )}
                  <span
                    aria-hidden
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-md border text-sm',
                      aan ? 'border-primary bg-primary text-primary-foreground' : 'bg-background',
                    )}
                  >
                    {aan ? '✓' : ''}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        <div className="space-y-1.5">
          <Label htmlFor="toezicht">Toezichthouder</Label>
          <Select value={toezicht} onValueChange={setToezicht}>
            <SelectTrigger id="toezicht" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">
                {bevoegdIngedeeld ? 'Een ingedeelde trainer (bevoegd)' : 'Automatisch: nog niemand bevoegd!'}
              </SelectItem>
              <SelectGroup>
                <SelectLabel>Groep toezichthouders</SelectLabel>
                {data.toezichthouders.map((z) => (
                  <SelectItem key={z.id} value={`groep:${z.id}`}>
                    {z.naam}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Bevoegde trainers</SelectLabel>
                {data.trainers
                  .filter((x) => x.toezichthouder)
                  .map((x) => (
                    <SelectItem key={x.id} value={`trainer:${x.id}`}>
                      {x.naam}
                    </SelectItem>
                  ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {data.toezichthouders.length === 0 && (
            <p className="text-xs text-muted-foreground">Tip: voeg de groep toezichthouders toe op de pagina Team.</p>
          )}
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" onClick={onClose}>
            Annuleren
          </Button>
          <Button disabled={bezig} onClick={opslaan}>
            Opslaan ({gekozen.length} van {nodig})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Verdeling({ periode, trainingen, maand }: { periode: Roosterperiode; trainingen: PeriodeTraining[]; maand: string }) {
  const data = useAppData()
  const besch = data.beschikbaarheid[periode.id] ?? {}
  const tel = tellingen(trainingen, periode.indeling)
  const rijen = data.trainers
    .filter(geeftTraining)
    .map((t: Trainer) => ({
      t,
      totaal: tel.get(t.id) ?? 0,
      inMaand: tel.get(`${t.id}|${maand}`) ?? 0,
      max: besch[t.id]?.maxPerMaand ?? null,
      ingevuld: !!besch[t.id],
    }))
    .sort((a, b) => b.totaal - a.totaal || a.t.naam.localeCompare(b.t.naam, 'nl'))
  const hoogste = Math.max(1, ...rijen.map((r) => r.totaal))

  return (
    <InklapbareKaart
      id="indelen-verdeling"
      titel="Verdeling per trainer"
      omschrijving={`Aantal trainingen in de hele periode, en in ${MAAND_NAMEN[Number(maand.slice(5, 7)) - 1] ?? 'deze maand'} tegenover het opgegeven maximum.`}
    >
      <ul className="space-y-2">
        {rijen.map((r) => (
          <li key={r.t.id} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <TrainerAvatar trainer={r.t} size="sm" />
              <span className="truncate">{r.t.naam}</span>
            </span>
            <span className="h-2 overflow-hidden rounded-full bg-muted">
              <span className="block h-2 rounded-full bg-primary" style={{ width: `${(r.totaal / hoogste) * 100}%` }} />
            </span>
            <span className={cn('text-right whitespace-nowrap', r.max !== null && r.inMaand > r.max && 'font-bold text-destructive')}>
              {r.totaal} · {r.inMaand}
              {r.max !== null ? `/${r.max}` : ''} {!r.ingevuld && <span className="text-xs text-muted-foreground">(niet ingevuld)</span>}
            </span>
          </li>
        ))}
      </ul>
    </InklapbareKaart>
  )
}
