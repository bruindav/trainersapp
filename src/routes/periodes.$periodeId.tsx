// Fix: fix-8 — knop: testbeschikbaarheid voor testtrainers
// Fix: fix-7 — beschikbaarheid via eigen pagina; feestdagen signaleren
// Fix: fix-5 — één roosterperiode: instellingen, beschikbaarheid opgeven, wie kan wanneer
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, CalendarCheck, CalendarX, CircleCheck, FlaskConical, PartyPopper, Plus, Save, Trash2 } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/app-shell'
import {
  StatusBadge,
  StatusStappen,
  WieKanWanneer,
} from '@/components/rooster-onderdelen'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { geeftTraining } from '@/data/fixtures'
import {
  DAGEN_KORT,
  STANDAARD_LOCATIE,
  dagVan,
  isReces,
  isVolledigIngevuld,
  keuzeKolommen,
  momentNaam,
  nieuwLosId,
  trainingenInPeriode,
  type PeriodeStatus,
  type PeriodeTraining,
  type Roosterperiode,
} from '@/data/rooster'
import {
  trainerById,
  useAppData,
  verwijderPeriode,
  vulTestbeschikbaarheidIn,
  werkPeriodeBijRooster,
  wisTestbeschikbaarheid,
} from '@/data/store'
import { formatLong, formatRange, formatShort } from '@/lib/dates'

export const Route = createFileRoute('/periodes/$periodeId')({
  component: PeriodePagina,
})

function PeriodePagina() {
  const { periodeId } = Route.useParams()
  const data = useAppData()
  const ik = trainerById(data.huidigeTrainerId)!
  const periode = data.roosterperiodes.find((p) => p.id === periodeId)

  if (!periode) {
    return (
      <div className="mx-auto max-w-content space-y-4 px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-black">Periode niet gevonden</h1>
        <p className="text-muted-foreground">Deze roosterperiode bestaat niet (meer).</p>
        <Button asChild variant="outline">
          <Link to="/periodes">
            <ArrowLeft aria-hidden /> Naar roosterperiodes
          </Link>
        </Button>
      </div>
    )
  }

  const trainingen = trainingenInPeriode(periode, data.trainingsmomenten, data.jaarplan)
  const sleutels = keuzeKolommen(periode, data.trainingsmomenten).map((k) => k.sleutel)
  const trainersMetRooster = data.trainers.filter(geeftTraining)
  const ingevuld = trainersMetRooster.filter((t) => isVolledigIngevuld(data.beschikbaarheid[periode.id]?.[t.id], sleutels))
  const nogNiet = trainersMetRooster.filter((t) => !ingevuld.includes(t))
  const mijnB = data.beschikbaarheid[periode.id]?.[ik.id]
  const ikIngevuld = isVolledigIngevuld(mijnB, sleutels)

  return (
    <>
      <PageHeader
        eyebrow={periode.soort === 'los' ? 'Losse trainingen' : 'Wekelijks rooster'}
        title={periode.naam}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {formatRange(periode.van, periode.tot)} · {trainingen.length} trainingen
            <StatusBadge status={periode.status} />
          </span>
        }
        actions={
          <Button asChild variant="secondary" className="rounded-full">
            <Link to="/periodes">
              <ArrowLeft aria-hidden /> Alle periodes
            </Link>
          </Button>
        }
      />

      <div className="mx-auto max-w-content space-y-6 px-4 py-8 sm:px-6">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <StatusStappen status={periode.status} />
            <p className="text-sm">
              {periode.status === 'concept' && 'De coördinator stelt de periode in. Daarna wordt de beschikbaarheid opgevraagd.'}
              {periode.status === 'beschikbaarheid' &&
                `Iedereen geeft op wanneer hij of zij kan${periode.deadline ? `, vóór ${formatLong(periode.deadline)}` : ''}. ${ingevuld.length} van ${trainersMetRooster.length} trainers hebben ingevuld.`}
              {periode.status === 'indelen' && 'De coördinator deelt nu in. Beschikbaarheid wijzigen kan alleen nog via de coördinator.'}
              {periode.status === 'gepubliceerd' && 'Het rooster is gepubliceerd.'}
              {periode.status === 'afgesloten' && 'Deze periode is afgelopen.'}
            </p>
            {ik.coordinator && <StatusActies periode={periode} aantalTrainingen={trainingen.length} />}
          </CardContent>
        </Card>

        {geeftTraining(ik) && periode.status === 'beschikbaarheid' && (
          <Link
            to="/periodes/$periodeId/beschikbaarheid"
            params={{ periodeId: periode.id }}
            search={{}}
            className={
              ikIngevuld
                ? 'flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none motion-reduce:transition-none'
                : 'flex items-center gap-3 rounded-xl bg-primary p-4 text-primary-foreground transition-opacity hover:opacity-95 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none motion-reduce:transition-none'
            }
          >
            {ikIngevuld ? (
              <CircleCheck className="size-6 shrink-0 text-nat-green" aria-hidden />
            ) : (
              <CalendarCheck className="size-6 shrink-0" aria-hidden />
            )}
            <span className="min-w-0 flex-1">
              <span className="block font-bold">
                {ikIngevuld ? 'Je hebt je beschikbaarheid ingevuld' : 'Vul je beschikbaarheid in'}
              </span>
              <span className={ikIngevuld ? 'block text-sm text-muted-foreground' : 'block text-sm opacity-90'}>
                {ikIngevuld
                  ? 'Iets veranderd? Je kunt het nog aanpassen.'
                  : periode.deadline
                    ? `Graag vóór ${formatLong(periode.deadline)}. Duurt ongeveer een minuut.`
                    : 'Duurt ongeveer een minuut.'}
              </span>
            </span>
            <span className="hidden rounded-full bg-background px-4 py-2 text-sm font-bold text-accent-foreground sm:block">
              {ikIngevuld ? 'Wijzigen' : 'Invullen'}
            </span>
          </Link>
        )}

        {ik.coordinator && (periode.status === 'concept' || periode.status === 'beschikbaarheid') && (
          <Instellingen periode={periode} trainingen={trainingen} />
        )}

        <Sectie
          titel="Trainingen in deze periode"
          omschrijving={
            periode.soort === 'wekelijks'
              ? 'Reces uit het jaarplan en vervallen data zijn al weggelaten.'
              : 'De losse trainingen van deze periode.'
          }
        >
          {trainingen.length === 0 ? (
            <p className="text-muted-foreground">Nog geen trainingen.</p>
          ) : (
            <details className="group">
              <summary className="cursor-pointer text-sm font-semibold text-accent-foreground">
                Toon alle {trainingen.length} trainingen
              </summary>
              <ul className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
                {trainingen.map((t) => (
                  <li key={t.key}>
                    <span className="font-semibold">
                      {DAGEN_KORT[dagVan(t.datum)]} {formatShort(t.datum)}
                    </span>{' '}
                    {t.start}–{t.eind}
                    {t.omschrijving && ` · ${t.omschrijving}`}
                    {t.locatie !== STANDAARD_LOCATIE && ` · ${t.locatie}`} · {t.trainersNodig}×
                    {t.feestdag && (
                      <span className="ml-1 rounded bg-nat-yellow/30 px-1 text-xs font-semibold">{t.feestdag}</span>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Sectie>

        <Sectie
          titel="Wie kan wanneer"
          omschrijving={
            nogNiet.length === 0
              ? 'Iedereen heeft ingevuld.'
              : `Nog niet (volledig) ingevuld: ${nogNiet.map((t) => t.naam).join(', ')}.${ik.coordinator ? ' Met het potloodje vul je in namens iemand.' : ''}`
          }
        >
          <WieKanWanneer periode={periode} />
          {ik.coordinator && data.trainers.some((t) => t.test) && (
            <TestKnoppen periode={periode} sleutels={sleutels} />
          )}
        </Sectie>
      </div>
    </>
  )
}

function Sectie({ titel, omschrijving, children }: { titel: string; omschrijving?: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-lg font-bold">{titel}</h2>
        </CardTitle>
        {omschrijving && <CardDescription>{omschrijving}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function StatusActies({ periode, aantalTrainingen }: { periode: Roosterperiode; aantalTrainingen: number }) {
  const navigate = useNavigate()
  const [bezig, setBezig] = useState(false)

  async function zet(status: PeriodeStatus, melding: string) {
    setBezig(true)
    try {
      await werkPeriodeBijRooster(periode.id, { status })
      toast.success(melding)
    } catch {
      toast.error('Dat lukte niet. Probeer het opnieuw.')
    } finally {
      setBezig(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {periode.status === 'concept' && (
        <>
          <Button
            disabled={bezig || aantalTrainingen === 0}
            onClick={() => zet('beschikbaarheid', 'Beschikbaarheid opgevraagd: trainers zien nu een melding')}
          >
            Beschikbaarheid opvragen
          </Button>
          <Button
            variant="ghost"
            className="text-destructive"
            disabled={bezig}
            onClick={async () => {
              if (!window.confirm(`Periode “${periode.naam}” verwijderen?`)) return
              try {
                await verwijderPeriode(periode.id)
                toast.success('Periode verwijderd')
                navigate({ to: '/periodes' })
              } catch {
                toast.error('Verwijderen lukte niet.')
              }
            }}
          >
            <Trash2 aria-hidden /> Verwijderen
          </Button>
        </>
      )}
      {periode.status === 'beschikbaarheid' && (
        <>
          <Button disabled={bezig} onClick={() => zet('indelen', 'Beschikbaarheid gesloten: je kunt gaan indelen')}>
            Sluiten en gaan indelen
          </Button>
          <Button variant="outline" disabled={bezig} onClick={() => zet('concept', 'Terug naar concept')}>
            Terug naar concept
          </Button>
        </>
      )}
      {periode.status === 'indelen' && (
        <>
          <Alert className="w-full">
            <AlertDescription>Het indelen zelf komt in de volgende versie van de app.</AlertDescription>
          </Alert>
          <Button variant="outline" disabled={bezig} onClick={() => zet('beschikbaarheid', 'Beschikbaarheid weer geopend')}>
            Beschikbaarheid heropenen
          </Button>
        </>
      )}
    </div>
  )
}

function Instellingen({ periode, trainingen }: { periode: Roosterperiode; trainingen: PeriodeTraining[] }) {
  const data = useAppData()
  const [naam, setNaam] = useState(periode.naam)
  const [van, setVan] = useState(periode.van)
  const [tot, setTot] = useState(periode.tot)
  const [deadline, setDeadline] = useState(periode.deadline ?? '')
  const [vervallen, setVervallen] = useState('')
  const [bezig, setBezig] = useState(false)

  async function bewaar(w: Parameters<typeof werkPeriodeBijRooster>[1], melding: string) {
    setBezig(true)
    try {
      await werkPeriodeBijRooster(periode.id, w)
      toast.success(melding)
    } catch {
      toast.error('Opslaan lukte niet. Controleer de invoer en probeer het opnieuw.')
    } finally {
      setBezig(false)
    }
  }

  function bewaarBasis(e: FormEvent) {
    e.preventDefault()
    if (!naam.trim() || !van || !tot || van > tot) {
      toast.error('Vul een naam in en een einddatum na de begindatum.')
      return
    }
    bewaar({ naam: naam.trim(), van, tot, deadline: deadline || null }, 'Periode bijgewerkt')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-lg font-bold">Instellingen</h2>
        </CardTitle>
        <CardDescription>Alleen zichtbaar voor de coördinator.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={bewaarBasis} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="i-naam">Naam</Label>
            <Input id="i-naam" value={naam} onChange={(e) => setNaam(e.target.value)} maxLength={80} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="i-van">Van</Label>
            <Input id="i-van" type="date" value={van} onChange={(e) => setVan(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="i-tot">Tot en met</Label>
            <Input id="i-tot" type="date" value={tot} onChange={(e) => setTot(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="i-deadline">Invullen vóór</Label>
            <Input id="i-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <Button type="submit" variant="outline" disabled={bezig}>
            <Save aria-hidden /> Opslaan
          </Button>
        </form>

        {periode.soort === 'wekelijks' ? (
          <>
            <fieldset className="space-y-2">
              <legend className="text-sm font-bold">Trainingsmomenten in deze periode</legend>
              {data.trainingsmomenten.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Stel eerst de vaste trainingsmomenten in op de pagina <Link to="/periodes" className="underline">Roosterperiodes</Link>.
                </p>
              )}
              <div className="grid gap-1 sm:grid-cols-2">
                {data.trainingsmomenten.map((m) => (
                  <div key={m.id} className="flex min-h-11 items-center gap-3">
                    <Checkbox
                      id={`pm-${m.id}`}
                      checked={periode.momentIds.includes(m.id)}
                      disabled={bezig}
                      onCheckedChange={(v) =>
                        bewaar(
                          {
                            momentIds: v
                              ? [...periode.momentIds, m.id]
                              : periode.momentIds.filter((x) => x !== m.id),
                          },
                          'Trainingsmomenten bijgewerkt',
                        )
                      }
                    />
                    <Label htmlFor={`pm-${m.id}`} className="font-normal">
                      {momentNaam(m)} · {m.trainersNodig} trainer{m.trainersNodig > 1 ? 's' : ''}
                    </Label>
                  </div>
                ))}
              </div>
            </fieldset>

            <Feestdagen periode={periode} trainingen={trainingen} bezig={bezig} bewaar={bewaar} />

            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm font-bold">
                <CalendarX className="size-4" aria-hidden /> Vervallen data
              </p>
              <p className="text-sm text-muted-foreground">
                Reces uit het jaarplan gaat automatisch. Voeg hier losse data toe waarop niet getraind wordt.
              </p>
              {periode.vervallenData.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {[...periode.vervallenData].sort().map((d) => (
                    <li key={d}>
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted py-1 pr-1 pl-3 text-sm font-semibold">
                        {DAGEN_KORT[dagVan(d)]} {formatShort(d)}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-full"
                          aria-label={`${formatShort(d)} weer meetellen`}
                          disabled={bezig}
                          onClick={() =>
                            bewaar({ vervallenData: periode.vervallenData.filter((x) => x !== d) }, 'Datum telt weer mee')
                          }
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <form
                className="flex flex-wrap items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!vervallen || periode.vervallenData.includes(vervallen)) return
                  if (isReces(data.jaarplan, vervallen)) {
                    toast('Die datum valt al in het reces')
                    return
                  }
                  bewaar({ vervallenData: [...periode.vervallenData, vervallen] }, 'Datum vervalt')
                  setVervallen('')
                }}
              >
                <div className="space-y-1">
                  <Label htmlFor="i-vervallen" className="text-xs">
                    Datum
                  </Label>
                  <Input
                    id="i-vervallen"
                    type="date"
                    min={periode.van}
                    max={periode.tot}
                    value={vervallen}
                    onChange={(e) => setVervallen(e.target.value)}
                  />
                </div>
                <Button type="submit" variant="outline" disabled={bezig || !vervallen}>
                  <Plus aria-hidden /> Laten vervallen
                </Button>
              </form>
            </div>
          </>
        ) : (
          <>
            <LosseTrainingen periode={periode} bezig={bezig} bewaar={bewaar} />
            {trainingen.some((t) => t.feestdag) && (
              <Alert>
                <AlertDescription>
                  Let op, feestdag:{' '}
                  {trainingen
                    .filter((t) => t.feestdag)
                    .map((t) => `${t.feestdag} (${formatShort(t.datum)})`)
                    .join(', ')}
                  .
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function LosseTrainingen({
  periode,
  bezig,
  bewaar,
}: {
  periode: Roosterperiode
  bezig: boolean
  bewaar: (w: Parameters<typeof werkPeriodeBijRooster>[1], melding: string) => Promise<void>
}) {
  const [datum, setDatum] = useState('')
  const [start, setStart] = useState('')
  const [eind, setEind] = useState('')
  const [locatie, setLocatie] = useState('')
  const [omschrijving, setOmschrijving] = useState('')
  const [nodig, setNodig] = useState('1')

  function toevoegen(e: FormEvent) {
    e.preventDefault()
    if (!datum || !start || !eind || start >= eind || !locatie.trim()) {
      toast.error('Vul datum, tijden (eind na begin) en bad in.')
      return
    }
    bewaar(
      {
        losseTrainingen: [
          ...periode.losseTrainingen,
          {
            id: nieuwLosId(),
            datum,
            start,
            eind,
            locatie: locatie.trim(),
            trainersNodig: Number(nodig),
            omschrijving: omschrijving.trim(),
          },
        ],
      },
      'Training toegevoegd',
    )
    setDatum('')
    setOmschrijving('')
  }

  const lijst = [...periode.losseTrainingen].sort((a, b) => a.datum.localeCompare(b.datum) || a.start.localeCompare(b.start))

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold">Trainingen</p>
      {lijst.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nog geen trainingen. Voeg ze hieronder toe.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {lijst.map((l) => (
            <li key={l.id} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold">
                  {DAGEN_KORT[dagVan(l.datum)]} {formatShort(l.datum)} · {l.start}–{l.eind}
                  {l.omschrijving && ` · ${l.omschrijving}`}
                </p>
                <p className="text-muted-foreground">
                  {l.locatie} · {l.trainersNodig} trainer{l.trainersNodig > 1 ? 's' : ''}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label={`Training ${formatShort(l.datum)} verwijderen`}
                disabled={bezig}
                onClick={() =>
                  bewaar({ losseTrainingen: periode.losseTrainingen.filter((x) => x.id !== l.id) }, 'Training verwijderd')
                }
              >
                <Trash2 aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={toevoegen} className="grid gap-3 rounded-lg border border-dashed p-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="l-datum">Datum</Label>
          <Input id="l-datum" type="date" min={periode.van} max={periode.tot} value={datum} onChange={(e) => setDatum(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="l-start">Van</Label>
            <Input id="l-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="l-eind">Tot</Label>
            <Input id="l-eind" type="time" value={eind} onChange={(e) => setEind(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="l-locatie">Bad</Label>
          <Input id="l-locatie" value={locatie} onChange={(e) => setLocatie(e.target.value)} maxLength={80} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="l-omschrijving">Omschrijving (optioneel)</Label>
          <Input
            id="l-omschrijving"
            placeholder="Bijv. workshop starten"
            value={omschrijving}
            onChange={(e) => setOmschrijving(e.target.value)}
            maxLength={80}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="l-nodig">Trainers nodig</Label>
          <Select value={nodig} onValueChange={setNodig}>
            <SelectTrigger id="l-nodig" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['1', '2', '3', '4'].map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" variant="outline" className="self-end" disabled={bezig}>
          <Plus aria-hidden /> Training toevoegen
        </Button>
      </form>
    </div>
  )
}

function Feestdagen({
  periode,
  trainingen,
  bezig,
  bewaar,
}: {
  periode: Roosterperiode
  trainingen: PeriodeTraining[]
  bezig: boolean
  bewaar: (w: Parameters<typeof werkPeriodeBijRooster>[1], melding: string) => Promise<void>
}) {
  // Eén regel per datum (op zondag kunnen er twee trainingen zijn).
  const perDatum = new Map<string, { naam: string; aantal: number }>()
  trainingen.forEach((t) => {
    if (!t.feestdag) return
    const x = perDatum.get(t.datum)
    perDatum.set(t.datum, { naam: t.feestdag, aantal: (x?.aantal ?? 0) + 1 })
  })
  const data = [...perDatum.entries()].sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="space-y-2 rounded-xl bg-nat-yellow/15 p-4">
      <p className="flex items-center gap-2 text-sm font-bold">
        <PartyPopper className="size-4" aria-hidden /> Feestdagen in deze periode
      </p>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Geen trainingen op een feestdag.</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Op deze dagen is er grote kans dat er geen training is. Laat ze vervallen als het bad dicht is.
          </p>
          <ul className="space-y-1">
            {data.map(([datum, f]) => (
              <li key={datum} className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm">
                  <strong>
                    {DAGEN_KORT[dagVan(datum)]} {formatShort(datum)}
                  </strong>{' '}
                  · {f.naam}
                  {f.aantal > 1 && ` · ${f.aantal} trainingen`}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={bezig}
                  onClick={() => bewaar({ vervallenData: [...periode.vervallenData, datum] }, `${f.naam} vervalt`)}
                >
                  Laten vervallen
                </Button>
              </li>
            ))}
          </ul>
          {data.length > 1 && (
            <Button
              size="sm"
              variant="ghost"
              disabled={bezig}
              onClick={() =>
                bewaar(
                  { vervallenData: [...new Set([...periode.vervallenData, ...data.map(([d]) => d)])] },
                  'Alle feestdagen vervallen',
                )
              }
            >
              Alle feestdagen laten vervallen
            </Button>
          )}
        </>
      )}
    </div>
  )
}

function TestKnoppen({ periode, sleutels }: { periode: Roosterperiode; sleutels: string[] }) {
  const [bezig, setBezig] = useState(false)

  async function uitvoeren(actie: () => Promise<unknown>, melding: string) {
    setBezig(true)
    try {
      await actie()
      toast.success(melding)
    } catch {
      toast.error('Dat lukte niet. Probeer het opnieuw.')
    } finally {
      setBezig(false)
    }
  }

  return (
    <div className="mt-4 space-y-2 rounded-xl border border-dashed p-4">
      <p className="flex items-center gap-2 text-sm font-bold">
        <FlaskConical className="size-4 text-primary" aria-hidden /> Testen
      </p>
      <p className="text-sm text-muted-foreground">
        Geef alle testtrainers in één keer een willekeurige beschikbaarheid, om het indelen te kunnen uitproberen.
        Echte trainers blijven ongemoeid.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={bezig || sleutels.length === 0}
          onClick={() =>
            uitvoeren(
              () => vulTestbeschikbaarheidIn(periode, sleutels),
              'Testtrainers hebben een beschikbaarheid gekregen',
            )
          }
        >
          <FlaskConical aria-hidden /> Testbeschikbaarheid invullen
        </Button>
        <Button
          variant="ghost"
          disabled={bezig}
          onClick={() => uitvoeren(() => wisTestbeschikbaarheid(periode.id), 'Testbeschikbaarheid gewist')}
        >
          Testbeschikbaarheid wissen
        </Button>
      </div>
    </div>
  )
}
