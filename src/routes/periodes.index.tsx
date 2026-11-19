// Fix: fix-13 — waarschuwing bij verkeerd jaar bij een nieuwe periode
// Fix: fix-12 — per moment vaste trainers en een geldigheidsperiode instellen
// Fix: fix-9 — trainingsmomenten inklapbaar
// Fix: fix-5 — roosterperiodes en vaste trainingsmomenten
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { CalendarPlus, ChevronRight, Clock, Lock, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/app-shell'
import { InklapbareKaart } from '@/components/inklapbare-kaart'
import { BeschikbaarheidMelding, StatusBadge } from '@/components/rooster-onderdelen'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { geeftTraining } from '@/data/fixtures'
import {
  DAGEN,
  STANDAARD_LOCATIE,
  geldigheidTekst,
  isVolledigIngevuld,
  keuzeKolommen,
  momentNaam,
  periodeDatumWaarschuwing,
  trainingenInPeriode,
  type PeriodeSoort,
  type Trainingsmoment,
} from '@/data/rooster'
import {
  bewaarMoment,
  maakPeriode,
  trainerById,
  useAppData,
  verwijderMoment,
  voegStandaardMomentenToe,
} from '@/data/store'
import { formatRange, todayISO } from '@/lib/dates'

export const Route = createFileRoute('/periodes/')({
  component: PeriodesPagina,
})

function PeriodesPagina() {
  const data = useAppData()
  const ik = trainerById(data.huidigeTrainerId)!
  const [nieuw, setNieuw] = useState(false)
  const trainersMetRooster = data.trainers.filter(geeftTraining)

  return (
    <>
      <PageHeader
        eyebrow="Rooster"
        title="Roosterperiodes"
        description="Per periode geeft iedereen op wanneer hij of zij kan. Daarna deelt de coördinator in."
        actions={
          ik.coordinator && (
            <Button size="lg" className="w-full rounded-full sm:w-auto" onClick={() => setNieuw(true)}>
              <CalendarPlus aria-hidden /> Nieuwe periode
            </Button>
          )
        }
      />
      <div className="mx-auto max-w-content space-y-6 px-4 py-8 sm:px-6">
        <BeschikbaarheidMelding />

        <section aria-labelledby="periodes-kop" className="space-y-3">
          <h2 id="periodes-kop" className="text-lg font-bold">
            Periodes
          </h2>
          {data.roosterperiodes.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {ik.coordinator
                  ? 'Nog geen periodes. Maak de eerste aan met “Nieuwe periode”.'
                  : 'Er zijn nog geen roosterperiodes.'}
              </CardContent>
            </Card>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {[...data.roosterperiodes].reverse().map((p) => {
                const sleutels = keuzeKolommen(p, data.trainingsmomenten).map((k) => k.sleutel)
                const ingevuld = trainersMetRooster.filter((t) =>
                  isVolledigIngevuld(data.beschikbaarheid[p.id]?.[t.id], sleutels),
                ).length
                const aantal = trainingenInPeriode(p, data.trainingsmomenten, data.jaarplan).length
                return (
                  <li key={p.id}>
                    <Link
                      to="/periodes/$periodeId"
                      params={{ periodeId: p.id }}
                      className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none motion-reduce:transition-none"
                    >
                      <span className="min-w-0 flex-1 space-y-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-bold">{p.naam}</span>
                          <StatusBadge status={p.status} />
                        </span>
                        <span className="block text-sm text-muted-foreground">
                          {formatRange(p.van, p.tot)} · {p.soort === 'los' ? 'Losse trainingen' : 'Wekelijks'} ·{' '}
                          {aantal} trainingen
                        </span>
                        {p.status === 'beschikbaarheid' && (
                          <span className="block text-sm">
                            {ingevuld} van {trainersMetRooster.length} trainers hebben ingevuld
                          </span>
                        )}
                      </span>
                      <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <MomentenKaart magBewerken={ik.coordinator} />
      </div>

      {ik.coordinator && <NieuwePeriodeDialog open={nieuw} onOpenChange={setNieuw} />}
    </>
  )
}

function MomentenKaart({ magBewerken }: { magBewerken: boolean }) {
  const data = useAppData()
  const [dag, setDag] = useState('1')
  const [start, setStart] = useState('21:00')
  const [eind, setEind] = useState('22:00')
  const [locatie, setLocatie] = useState(STANDAARD_LOCATIE)
  const [bezig, setBezig] = useState(false)
  const [wijzig, setWijzig] = useState<Trainingsmoment | null>(null)

  async function uitvoeren(actie: () => Promise<void>, melding: string) {
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

  function toevoegen(e: FormEvent) {
    e.preventDefault()
    if (!start || !eind || start >= eind) {
      toast.error('De eindtijd moet na de begintijd liggen.')
      return
    }
    uitvoeren(
      () =>
        bewaarMoment({
          dag: Number(dag),
          start,
          eind,
          locatie: locatie.trim() || STANDAARD_LOCATIE,
          trainersNodig: 1,
          actief: true,
          volgorde: data.trainingsmomenten.length + 1,
        }),
      'Trainingsmoment toegevoegd',
    )
  }

  return (
    <InklapbareKaart
      id="momenten"
      icoon={<Clock className="size-5" aria-hidden />}
      titel="Vaste trainingsmomenten"
      omschrijving="De trainingen die elke week terugkomen. Een nieuwe wekelijkse periode neemt de actieve momenten over."
      standaardOpen={data.trainingsmomenten.length === 0}
    >
      <div className="space-y-4">
        {data.trainingsmomenten.length === 0 ? (
          <div className="space-y-3">
            <p className="text-muted-foreground">Nog geen trainingsmomenten ingesteld.</p>
            {magBewerken && (
              <Button
                variant="outline"
                disabled={bezig}
                onClick={() => uitvoeren(voegStandaardMomentenToe, 'Standaardmomenten toegevoegd')}
              >
                <Plus aria-hidden /> Di 21, do 21, zo 11 en zo 12 toevoegen
              </Button>
            )}
          </div>
        ) : (
          <ul className="divide-y">
            {data.trainingsmomenten.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {momentNaam(m)}
                    {!m.actief && <span className="ml-2 text-sm font-normal text-muted-foreground">(niet actief)</span>}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {m.locatie}
                    {geldigheidTekst(m) && <> · alleen {geldigheidTekst(m)}</>}
                  </p>
                  {m.vasteTrainers?.length ? (
                    <p className="flex items-center gap-1 text-sm">
                      <Lock className="size-3.5 text-nat-green" aria-hidden />
                      Vast: {m.vasteTrainers.map((id) => trainerById(id)?.naam ?? 'Oud-trainer').join(', ')}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm" id={`nodig-${m.id}`}>
                    Trainers
                  </span>
                  <div role="group" aria-labelledby={`nodig-${m.id}`} className="flex rounded-full bg-muted p-1">
                    {[1, 2].map((n) => (
                      <Button
                        key={n}
                        size="sm"
                        variant={m.trainersNodig === n ? 'default' : 'ghost'}
                        aria-pressed={m.trainersNodig === n}
                        className="h-9 min-w-11 rounded-full"
                        disabled={!magBewerken || bezig}
                        onClick={() =>
                          m.trainersNodig !== n &&
                          uitvoeren(() => bewaarMoment({ ...m, trainersNodig: n }), `${momentNaam(m)}: ${n} trainer${n > 1 ? 's' : ''}`)
                        }
                      >
                        {n}
                      </Button>
                    ))}
                  </div>
                  {magBewerken && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-11"
                      aria-label={`${momentNaam(m)} wijzigen`}
                      disabled={bezig}
                      onClick={() => setWijzig(m)}
                    >
                      <Pencil aria-hidden />
                    </Button>
                  )}
                  {magBewerken && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-11"
                      aria-label={`${momentNaam(m)} verwijderen`}
                      disabled={bezig}
                      onClick={() => uitvoeren(() => verwijderMoment(m.id), 'Trainingsmoment verwijderd')}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {magBewerken && data.trainingsmomenten.length > 0 && (
          <form onSubmit={toevoegen} className="grid gap-3 rounded-lg border border-dashed p-3 sm:grid-cols-[1fr_auto_auto_1.5fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="m-dag">Dag</Label>
              <Select value={dag} onValueChange={setDag}>
                <SelectTrigger id="m-dag" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAGEN.map((d, i) => (
                    <SelectItem key={d} value={String(i)}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-start">Van</Label>
              <Input id="m-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-eind">Tot</Label>
              <Input id="m-eind" type="time" value={eind} onChange={(e) => setEind(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-locatie">Bad</Label>
              <Input id="m-locatie" value={locatie} onChange={(e) => setLocatie(e.target.value)} maxLength={80} />
            </div>
            <Button type="submit" variant="outline" disabled={bezig}>
              <Plus aria-hidden /> Moment toevoegen
            </Button>
          </form>
        )}
      </div>
      {wijzig && <MomentDialog moment={wijzig} onClose={() => setWijzig(null)} />}
    </InklapbareKaart>
  )
}

function MomentDialog({ moment: m, onClose }: { moment: Trainingsmoment; onClose: () => void }) {
  const data = useAppData()
  const [vast, setVast] = useState<string[]>(m.vasteTrainers ?? [])
  const [van, setVan] = useState(m.geldigVan ?? '')
  const [tot, setTot] = useState(m.geldigTot ?? '')
  const [bezig, setBezig] = useState(false)
  const fout = van && tot && van > tot ? 'De einddatum ligt vóór de begindatum.' : ''

  async function opslaan(e: FormEvent) {
    e.preventDefault()
    if (fout) return
    setBezig(true)
    try {
      await bewaarMoment({ ...m, vasteTrainers: vast, geldigVan: van || undefined, geldigTot: tot || undefined })
      toast.success(`${momentNaam(m)} bijgewerkt`)
      onClose()
    } catch {
      toast.error('Opslaan lukte niet. Probeer het opnieuw.')
    } finally {
      setBezig(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto">
        <form onSubmit={opslaan} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{momentNaam(m)}</DialogTitle>
            <DialogDescription>{m.locatie}</DialogDescription>
          </DialogHeader>

          <fieldset className="space-y-2">
            <legend className="font-semibold">Vaste trainers</legend>
            <p className="text-sm text-muted-foreground">
              Zij geven deze training altijd. Anderen kunnen zich alleen als invaller opgeven en worden pas ingedeeld als een
              vaste trainer niet kan.
            </p>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {data.trainers.filter(geeftTraining).map((t) => (
                <li key={t.id}>
                  <label className="flex min-h-11 items-center gap-3 rounded-lg border px-3 hover:bg-accent">
                    <Checkbox
                      checked={vast.includes(t.id)}
                      onCheckedChange={(aan) => setVast((x) => (aan === true ? [...x, t.id] : x.filter((y) => y !== t.id)))}
                    />
                    {t.naam}
                  </label>
                </li>
              ))}
            </ul>
            {vast.length > m.trainersNodig && (
              <p className="text-sm text-muted-foreground">
                Let op: er zijn meer vaste trainers ({vast.length}) dan nodig ({m.trainersNodig}); het voorstel neemt de eersten.
              </p>
            )}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="font-semibold">Alleen in een bepaalde periode?</legend>
            <p className="text-sm text-muted-foreground">
              Bijvoorbeeld een proef van januari t/m april. Leeg laten = altijd.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="g-van">Vanaf</Label>
                <Input id="g-van" type="date" value={van} onChange={(e) => setVan(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="g-tot">Tot en met</Label>
                <Input id="g-tot" type="date" value={tot} onChange={(e) => setTot(e.target.value)} />
              </div>
            </div>
            {fout && <p className="text-sm text-destructive">{fout}</p>}
          </fieldset>

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuleren
            </Button>
            <Button type="submit" disabled={bezig || !!fout}>
              Opslaan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function NieuwePeriodeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const data = useAppData()
  const navigate = useNavigate()
  const [naam, setNaam] = useState('')
  const [soort, setSoort] = useState<PeriodeSoort>('wekelijks')
  const [van, setVan] = useState('')
  const [tot, setTot] = useState('')
  const [deadline, setDeadline] = useState('')
  const [fout, setFout] = useState('')
  const [bezig, setBezig] = useState(false)

  async function maak(e: FormEvent) {
    e.preventDefault()
    if (!naam.trim() || !van || !tot) {
      setFout('Vul een naam, begin- en einddatum in.')
      return
    }
    if (van > tot) {
      setFout('De einddatum moet na de begindatum liggen.')
      return
    }
    if (soort === 'wekelijks' && data.trainingsmomenten.filter((m) => m.actief).length === 0) {
      setFout('Stel eerst de vaste trainingsmomenten in (onderaan deze pagina).')
      return
    }
    setBezig(true)
    try {
      const id = await maakPeriode({ naam: naam.trim(), soort, van, tot, deadline: deadline || null })
      toast.success(`Periode “${naam.trim()}” aangemaakt`)
      onOpenChange(false)
      setNaam('')
      setVan('')
      setTot('')
      setDeadline('')
      setFout('')
      navigate({ to: '/periodes/$periodeId', params: { periodeId: id } })
    } catch {
      setFout('Opslaan lukte niet. Probeer het opnieuw.')
    } finally {
      setBezig(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nieuwe roosterperiode</DialogTitle>
          <DialogDescription>Daarna stel je de details in en vraag je de beschikbaarheid op.</DialogDescription>
        </DialogHeader>
        <form onSubmit={maak} noValidate className="space-y-4">
          {fout && (
            <Alert variant="destructive">
              <AlertDescription>{fout}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="p-naam">Naam</Label>
            <Input
              id="p-naam"
              placeholder="Bijv. Hoofdseizoen deel 2"
              value={naam}
              onChange={(e) => setNaam(e.target.value)}
              maxLength={80}
            />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Soort</legend>
            <RadioGroup value={soort} onValueChange={(v) => setSoort(v as PeriodeSoort)} className="gap-2">
              <Label htmlFor="p-wekelijks" className="flex items-start gap-3 rounded-lg border p-3 font-normal">
                <RadioGroupItem id="p-wekelijks" value="wekelijks" className="mt-0.5" />
                <span>
                  <span className="block font-semibold">Wekelijks rooster</span>
                  <span className="block text-sm text-muted-foreground">De vaste trainingsmomenten tussen twee data</span>
                </span>
              </Label>
              <Label htmlFor="p-los" className="flex items-start gap-3 rounded-lg border p-3 font-normal">
                <RadioGroupItem id="p-los" value="los" className="mt-0.5" />
                <span>
                  <span className="block font-semibold">Losse trainingen</span>
                  <span className="block text-sm text-muted-foreground">
                    Eigen data, tijden en bad, bijv. zomerzwemmen of een workshop
                  </span>
                </span>
              </Label>
            </RadioGroup>
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-van">Van</Label>
              <Input id="p-van" type="date" value={van} onChange={(e) => setVan(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-tot">Tot en met</Label>
              <Input id="p-tot" type="date" value={tot} onChange={(e) => setTot(e.target.value)} />
            </div>
          </div>
          {periodeDatumWaarschuwing(van, tot, todayISO()) && (
            <p role="alert" className="rounded-lg bg-nat-yellow/30 px-3 py-2 text-sm font-semibold">
              {periodeDatumWaarschuwing(van, tot, todayISO())}
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="p-deadline">Beschikbaarheid invullen vóór (optioneel)</Label>
            <Input id="p-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button type="submit" disabled={bezig}>
              Periode aanmaken
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
