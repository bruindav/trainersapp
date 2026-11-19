// Fix: fix-7 — eigen, rustige pagina om beschikbaarheid op te geven (ook namens iemand, door de coördinator)
import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowLeft, Check, CircleCheck, Plus, ThumbsUp, X } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { geeftTraining, type Trainer } from '@/data/fixtures'
import {
  DAGEN,
  dagVan,
  keuzeKolommen,
  trainingenInPeriode,
  type DatumBereik,
  type Keuze,
  type PeriodeTraining,
  type Roosterperiode,
} from '@/data/rooster'
import { bewaarBeschikbaarheid, trainerById, useAppData } from '@/data/store'
import { formatLong, formatRange, formatShort } from '@/lib/dates'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/periodes/$periodeId_/beschikbaarheid')({
  validateSearch: (s: Record<string, unknown>): { trainer?: string } =>
    typeof s.trainer === 'string' ? { trainer: s.trainer } : {},
  component: BeschikbaarheidPagina,
})

const KEUZE_INFO: { waarde: Keuze; label: string; uitleg: string; icoon: ReactNode; aan: string }[] = [
  {
    waarde: 'graag',
    label: 'Graag',
    uitleg: 'Hier sta ik graag ingeroosterd',
    icoon: <ThumbsUp className="size-5" aria-hidden />,
    aan: 'border-nat-green bg-nat-green/15 ring-2 ring-nat-green',
  },
  {
    waarde: 'kan',
    label: 'Als het moet',
    uitleg: 'Liever niet, maar het kan als er niemand anders is',
    icoon: <span className="text-lg leading-none font-black" aria-hidden>~</span>,
    aan: 'border-nat-yellow bg-nat-yellow/20 ring-2 ring-nat-yellow',
  },
  {
    waarde: 'nee',
    label: 'Nee',
    uitleg: 'Dan kan ik niet',
    icoon: <X className="size-5" aria-hidden />,
    aan: 'border-foreground bg-foreground text-background ring-2 ring-foreground',
  },
]

const MAX_OPTIES: (number | null)[] = [null, 1, 2, 3, 4, 6, 8]

function BeschikbaarheidPagina() {
  const { periodeId } = Route.useParams()
  const { trainer: namensId } = Route.useSearch()
  const data = useAppData()
  const ik = trainerById(data.huidigeTrainerId)!
  const periode = data.roosterperiodes.find((p) => p.id === periodeId)
  const voor = namensId && ik.coordinator ? trainerById(namensId) : ik

  if (!periode || !voor) {
    return (
      <Leeg titel="Niet gevonden" tekst="Deze periode of trainer bestaat niet (meer)." periodeId={periode?.id} />
    )
  }
  if (!geeftTraining(voor)) {
    return (
      <Leeg
        titel="Geen beschikbaarheid nodig"
        tekst={`${voor.id === ik.id ? 'Je geeft' : `${voor.naam} geeft`} geen training, dus hoeft geen beschikbaarheid op te geven.`}
        periodeId={periode.id}
      />
    )
  }

  const magBewerken = ik.coordinator || (voor.id === ik.id && periode.status === 'beschikbaarheid')
  return (
    <Formulier
      key={`${periode.id}-${voor.id}`}
      periode={periode}
      trainer={voor}
      namens={voor.id !== ik.id}
      magBewerken={magBewerken}
    />
  )
}

function Leeg({ titel, tekst, periodeId }: { titel: string; tekst: string; periodeId?: string }) {
  return (
    <div className="mx-auto max-w-reading space-y-4 px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-black">{titel}</h1>
      <p className="text-muted-foreground">{tekst}</p>
      <Button asChild variant="outline">
        {periodeId ? (
          <Link to="/periodes/$periodeId" params={{ periodeId }}>
            <ArrowLeft aria-hidden /> Terug naar de periode
          </Link>
        ) : (
          <Link to="/periodes">
            <ArrowLeft aria-hidden /> Naar roosterperiodes
          </Link>
        )}
      </Button>
    </div>
  )
}

function Formulier({
  periode,
  trainer,
  namens,
  magBewerken,
}: {
  periode: Roosterperiode
  trainer: Trainer
  namens: boolean
  magBewerken: boolean
}) {
  const data = useAppData()
  const kolommen = keuzeKolommen(periode, data.trainingsmomenten)
  const trainingen = trainingenInPeriode(periode, data.trainingsmomenten, data.jaarplan)
  const bestaand = data.beschikbaarheid[periode.id]?.[trainer.id]
  const [keuzes, setKeuzes] = useState<Record<string, Keuze>>(bestaand?.keuzes ?? {})
  const [max, setMax] = useState<number | null>(bestaand?.maxPerMaand ?? null)
  const [nietKunnen, setNietKunnen] = useState<DatumBereik[]>(bestaand?.nietKunnen ?? [])
  const [nieuwVan, setNieuwVan] = useState('')
  const [nieuwTot, setNieuwTot] = useState('')
  const [bezig, setBezig] = useState(false)
  const [opgeslagen, setOpgeslagen] = useState(false)

  const voornaam = trainer.naam.split(' ')[0]
  const open = kolommen.filter((k) => !keuzes[k.sleutel])
  const klaar = open.length === 0 && kolommen.length > 0

  function voegDatumToe(e: FormEvent) {
    e.preventDefault()
    if (!nieuwVan) return
    const tot = nieuwTot && nieuwTot >= nieuwVan ? nieuwTot : nieuwVan
    setNietKunnen((x) => [...x, { van: nieuwVan, tot }].sort((a, b) => a.van.localeCompare(b.van)))
    setNieuwVan('')
    setNieuwTot('')
  }

  async function opslaan() {
    if (!klaar) return
    setBezig(true)
    try {
      await bewaarBeschikbaarheid(periode.id, trainer.id, { keuzes, maxPerMaand: max, nietKunnen })
      setOpgeslagen(true)
      window.scrollTo({ top: 0 })
    } catch {
      toast.error('Opslaan lukte niet. Controleer je verbinding en probeer het opnieuw.')
    } finally {
      setBezig(false)
    }
  }

  if (opgeslagen) {
    return (
      <div className="mx-auto max-w-reading space-y-6 px-4 py-10 sm:px-6">
        <div className="space-y-3 rounded-2xl bg-nat-green/15 p-6">
          <CircleCheck className="size-10 text-nat-green" aria-hidden />
          <h1 className="text-2xl font-black">{namens ? `Opgeslagen voor ${voornaam}` : 'Dank je, je beschikbaarheid is opgeslagen'}</h1>
          <p>
            {namens ? `${voornaam}s` : 'Je'} keuzes voor <strong>{periode.naam}</strong> staan nu in het overzicht “Wie kan
            wanneer”. {namens ? '' : 'Je kunt ze tot de deadline nog wijzigen.'}
          </p>
        </div>
        <Samenvatting kolommen={kolommen} keuzes={keuzes} max={max} nietKunnen={nietKunnen} />
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg" className="rounded-full">
            <Link to="/periodes/$periodeId" params={{ periodeId: periode.id }}>
              Naar de periode
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="rounded-full" onClick={() => setOpgeslagen(false)}>
            Wijzigen
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-32">
      <div className="bg-nat-ink text-white">
        <div className="mx-auto max-w-reading space-y-3 px-4 pt-6 pb-8 sm:px-6">
          <Link
            to="/periodes/$periodeId"
            params={{ periodeId: periode.id }}
            className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-white/80 hover:text-white"
          >
            <ArrowLeft className="size-4" aria-hidden /> {periode.naam}
          </Link>
          <h1 className="text-3xl font-black tracking-tight">
            {namens ? `Wanneer kan ${voornaam} trainen?` : 'Wanneer kun jij trainen?'}
          </h1>
          <p className="text-white/80">
            {periode.naam} · {formatRange(periode.van, periode.tot)}
            {periode.deadline && (
              <>
                <br />
                Graag invullen vóór <strong className="text-white">{formatLong(periode.deadline)}</strong>.
              </>
            )}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-reading space-y-8 px-4 py-6 sm:px-6">
        {!magBewerken && (
          <Alert>
            <AlertDescription>
              Invullen is gesloten. Is er iets veranderd? Laat het de coördinator weten, die kan het nog aanpassen.
            </AlertDescription>
          </Alert>
        )}
        {namens && (
          <Alert>
            <AlertDescription>Je vult dit in namens {trainer.naam}.</AlertDescription>
          </Alert>
        )}

        <section aria-labelledby="stap1" className="space-y-4">
          <StapKop nr={1} id="stap1" titel="Welke trainingen kun je geven?">
            Kies bij elke training één van de drie mogelijkheden. De coördinator deelt je in op wat je kiest.
          </StapKop>
          <ul className="grid gap-2 rounded-xl bg-muted p-3 text-sm">
            {KEUZE_INFO.map((k) => (
              <li key={k.waarde} className="flex items-center gap-2">
                <span className="inline-flex size-7 items-center justify-center rounded-full bg-background">{k.icoon}</span>
                <span>
                  <strong>{k.label}</strong> — {k.uitleg.toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
          {kolommen.length === 0 && <p className="text-muted-foreground">Deze periode heeft nog geen trainingen.</p>}
          {kolommen.map((k) => {
            const vanDit = trainingen.filter((t) => t.keuzeSleutel === k.sleutel)
            return (
              <fieldset key={k.sleutel} className="space-y-3 rounded-2xl border bg-card p-4">
                <legend className="sr-only">{k.lang}</legend>
                <KolomKop sleutel={k.sleutel} periode={periode} trainingen={vanDit} />
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={k.lang}>
                  {KEUZE_INFO.map((c) => {
                    const aan = keuzes[k.sleutel] === c.waarde
                    return (
                      <button
                        key={c.waarde}
                        type="button"
                        role="radio"
                        aria-checked={aan}
                        disabled={!magBewerken}
                        onClick={() => setKeuzes((x) => ({ ...x, [k.sleutel]: c.waarde }))}
                        className={cn(
                          'flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 text-center text-sm leading-tight transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60 motion-reduce:transition-none',
                          aan ? c.aan : 'border-border bg-background hover:bg-accent',
                        )}
                      >
                        {c.icoon}
                        <span className="font-bold">{c.label}</span>
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            )
          })}
        </section>

        <section aria-labelledby="stap2" className="space-y-4">
          <StapKop nr={2} id="stap2" titel="Hoe vaak wil je hoogstens trainen?">
            Zo voorkomt de coördinator dat je te vaak staat. Geen voorkeur mag ook.
          </StapKop>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="stap2">
            {MAX_OPTIES.map((m) => {
              const aan = max === m
              return (
                <button
                  key={String(m)}
                  type="button"
                  role="radio"
                  aria-checked={aan}
                  disabled={!magBewerken}
                  onClick={() => setMax(m)}
                  className={cn(
                    'min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60 motion-reduce:transition-none',
                    aan ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-accent',
                  )}
                >
                  {m === null ? 'Geen voorkeur' : `${m}× per maand`}
                </button>
              )
            })}
          </div>
        </section>

        <section aria-labelledby="stap3" className="space-y-4">
          <StapKop nr={3} id="stap3" titel="Wanneer kun je in elk geval niet?">
            Bijvoorbeeld je vakantie. Eén dag of een paar dagen achter elkaar. Niets? Dan sla je deze stap over.
          </StapKop>
          {nietKunnen.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {nietKunnen.map((r, i) => (
                <li key={`${r.van}-${r.tot}-${i}`}>
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted py-1 pr-1 pl-3 text-sm font-semibold">
                    {r.van === r.tot ? formatShort(r.van) : formatRange(r.van, r.tot)}
                    {magBewerken && (
                      <button
                        type="button"
                        className="inline-flex size-9 items-center justify-center rounded-full hover:bg-background focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
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
            <form onSubmit={voegDatumToe} className="grid gap-3 rounded-2xl border border-dashed p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="nk-van">Vanaf</Label>
                <Input
                  id="nk-van"
                  type="date"
                  min={periode.van}
                  max={periode.tot}
                  value={nieuwVan}
                  onChange={(e) => setNieuwVan(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nk-tot">Tot en met (leeg = één dag)</Label>
                <Input
                  id="nk-tot"
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
        </section>
      </div>

      {magBewerken && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex max-w-reading flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
            <p className="min-w-0 flex-1 text-sm" aria-live="polite">
              {klaar ? (
                <span className="font-semibold text-foreground">Alles gekozen. Klaar om op te slaan.</span>
              ) : (
                <span className="text-muted-foreground">
                  Nog te kiezen bij stap 1: <strong className="text-foreground">{open.map((k) => k.kort).join(', ')}</strong>
                </span>
              )}
            </p>
            <Button size="lg" className="rounded-full" disabled={!klaar || bezig} onClick={opslaan}>
              <Check aria-hidden /> Opslaan
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function StapKop({ nr, id, titel, children }: { nr: number; id: string; titel: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-primary-foreground"
      >
        {nr}
      </span>
      <div className="space-y-1">
        <h2 id={id} className="text-lg font-bold">
          <span className="sr-only">Stap {nr}: </span>
          {titel}
        </h2>
        <p className="text-sm text-muted-foreground">{children}</p>
      </div>
    </div>
  )
}

function KolomKop({ sleutel, periode, trainingen }: { sleutel: string; periode: Roosterperiode; trainingen: PeriodeTraining[] }) {
  const data = useAppData()
  const feestdagen = trainingen.filter((t) => t.feestdag)
  if (periode.soort === 'los') {
    const t = trainingen[0]
    if (!t) return null
    return (
      <div>
        <p className="font-bold">
          {DAGEN[dagVan(t.datum)]} {formatShort(t.datum)} · {t.start}–{t.eind}
        </p>
        <p className="text-sm text-muted-foreground">
          {t.omschrijving ? `${t.omschrijving} · ` : ''}
          {t.locatie}
        </p>
      </div>
    )
  }
  const m = data.trainingsmomenten.find((x) => x.id === sleutel)
  if (!m) return null
  return (
    <div>
      <p className="font-bold capitalize">
        {DAGEN[m.dag]} {m.start}–{m.eind}
      </p>
      <p className="text-sm text-muted-foreground">
        {trainingen.length} trainingen
        {trainingen.length > 0 && `, van ${formatShort(trainingen[0].datum)} tot ${formatShort(trainingen[trainingen.length - 1].datum)}`}
        {m.trainersNodig > 1 && ` · ${m.trainersNodig} trainers per keer`}
      </p>
      {feestdagen.length > 0 && (
        <p className="mt-1 text-sm text-muted-foreground">
          Waarschijnlijk geen training op {feestdagen.map((t) => `${t.feestdag} (${formatShort(t.datum)})`).join(', ')}.
        </p>
      )}
    </div>
  )
}

function Samenvatting({
  kolommen,
  keuzes,
  max,
  nietKunnen,
}: {
  kolommen: { sleutel: string; kort: string; lang: string }[]
  keuzes: Record<string, Keuze>
  max: number | null
  nietKunnen: DatumBereik[]
}) {
  const label = Object.fromEntries(KEUZE_INFO.map((k) => [k.waarde, k.label]))
  return (
    <dl className="divide-y rounded-2xl border bg-card">
      {kolommen.map((k) => (
        <div key={k.sleutel} className="flex justify-between gap-4 px-4 py-3">
          <dt className="text-muted-foreground">{k.lang}</dt>
          <dd className="font-semibold">{label[keuzes[k.sleutel]] ?? '–'}</dd>
        </div>
      ))}
      <div className="flex justify-between gap-4 px-4 py-3">
        <dt className="text-muted-foreground">Hoogstens</dt>
        <dd className="font-semibold">{max === null ? 'Geen voorkeur' : `${max}× per maand`}</dd>
      </div>
      <div className="flex justify-between gap-4 px-4 py-3">
        <dt className="text-muted-foreground">Kan niet</dt>
        <dd className="text-right font-semibold">
          {nietKunnen.length === 0
            ? 'Geen data'
            : nietKunnen.map((r) => (r.van === r.tot ? formatShort(r.van) : formatRange(r.van, r.tot))).join(', ')}
        </dd>
      </div>
    </dl>
  )
}
