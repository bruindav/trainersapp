// Fix: fix-5 — één roosterperiode: instellingen, beschikbaarheid opgeven, wie kan wanneer
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, CalendarX, Plus, Save, Trash2 } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/app-shell'
import {
  BeschikbaarheidFormulier,
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
  type Roosterperiode,
} from '@/data/rooster'
import { trainerById, useAppData, verwijderPeriode, werkPeriodeBijRooster } from '@/data/store'
import { formatLong, formatRange, formatShort } from '@/lib/dates'

export const Route = createFileRoute('/periodes/$periodeId')({
  component: PeriodePagina,
})

function PeriodePagina() {
  const { periodeId } = Route.useParams()
  const data = useAppData()
  const ik = trainerById(data.huidigeTrainerId)!
  const periode = data.roosterperiodes.find((p) => p.id === periodeId)
  const [namens, setNamens] = useState(ik.id)

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
  const voor = trainerById(namens) ?? ik
  const magZelfInvullen = periode.status === 'beschikbaarheid'

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

        {ik.coordinator && (periode.status === 'concept' || periode.status === 'beschikbaarheid') && (
          <Instellingen periode={periode} />
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
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Sectie>

        {(geeftTraining(ik) || ik.coordinator) && (
          <section id="mijn-beschikbaarheid" aria-labelledby="mb-kop" className="scroll-mt-24">
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2 id="mb-kop" className="text-lg font-bold">
                    {voor.id === ik.id ? 'Mijn beschikbaarheid' : `Beschikbaarheid van ${voor.naam}`}
                  </h2>
                </CardTitle>
                <CardDescription>
                  {magZelfInvullen
                    ? periode.deadline
                      ? `Invullen kan tot en met ${formatLong(periode.deadline)}.`
                      : 'Kies per training of je kunt.'
                    : periode.status === 'concept'
                      ? 'Invullen kan zodra de coördinator de beschikbaarheid opvraagt.'
                      : 'Invullen is gesloten. Iets veranderd? Laat het de coördinator weten.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {ik.coordinator && (
                  <div className="max-w-sm space-y-1.5">
                    <Label htmlFor="namens">Invullen voor</Label>
                    <Select value={namens} onValueChange={setNamens}>
                      <SelectTrigger id="namens" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {trainersMetRooster.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.id === ik.id ? `${t.naam} (ik)` : t.naam}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {geeftTraining(voor) ? (
                  <BeschikbaarheidFormulier
                    key={`${periode.id}-${voor.id}`}
                    periode={periode}
                    trainer={voor}
                    magBewerken={ik.coordinator || (voor.id === ik.id && magZelfInvullen)}
                  />
                ) : (
                  <p className="text-muted-foreground">Kies hierboven een trainer.</p>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        <Sectie
          titel="Wie kan wanneer"
          omschrijving={
            nogNiet.length === 0
              ? 'Iedereen heeft ingevuld.'
              : `Nog niet (volledig) ingevuld: ${nogNiet.map((t) => t.naam).join(', ')}.`
          }
        >
          <WieKanWanneer periode={periode} />
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

function Instellingen({ periode }: { periode: Roosterperiode }) {
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
          <LosseTrainingen periode={periode} bezig={bezig} bewaar={bewaar} />
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
