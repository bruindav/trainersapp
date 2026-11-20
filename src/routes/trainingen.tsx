// Fix: fix-32 — bijlage echt bewaren en openen; trainingsschema-pdf inlezen in de velden
// Fix: fix-31 — ook wie de training gaf mag wijzigen/verwijderen; coördinator verwijdert
// Fix: fix-30 — eigen training wijzigen en (met bevestiging) verwijderen
// Fix: fix-29 — standaardtitel, meerdere groepen, focus Borstcrawl/Ademhaling/Anders
// Fix: fix-11 — herinnering en standaardmoment uit het gepubliceerde rooster
// Fix: fix-3 — alleen wie training geeft is kiesbaar
// Fix: fix-1 — trainers uit Firestore i.p.v. vaste lijst
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ClipboardPlus,
  Copy,
  FileUp,
  Loader2,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/app-shell'
import { TrainerAvatar, TrainerChip } from '@/components/trainer-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { geeftTraining,
  ALLE_FOCUS,
  GROEPEN,
  HELE_GROEP,
  OP_INSCHRIJVING,
  groepenLabel,
  standaardTitel,
  trainingVoorGroep,
  ONDERDELEN,
  SESSIES,
  sessieDatum,
  type Focus,
  type Training,
  type TrainingBlok,
} from '@/data/fixtures'
import {
  sessieById,
  totaalMeters,
  trainerById,
  useAppData,
  verwijderTraining,
  voegTrainingToe,
  werkTrainingBij,
  type TrainingVelden,
} from '@/data/store'
import { DAGEN, dagVan } from '@/data/rooster'
import { gepubliceerdeTrainingen, staatIngeroosterd } from '@/data/wijzigingen'
import { addDays, formatLong, formatShort, startOfWeek, todayISO } from '@/lib/dates'
import { MAX_BESTAND_KB, maakBijlage, openBijlage, type BijlageData } from '@/lib/bijlage'
import { cn } from '@/lib/utils'

interface Zoek {
  id?: string
  nieuw?: boolean
  /** Id van een eigen training die gewijzigd wordt (fix-30). */
  bewerk?: string
}

export const Route = createFileRoute('/trainingen')({
  validateSearch: (s: Record<string, unknown>): Zoek => ({
    id: typeof s.id === 'string' ? s.id : undefined,
    nieuw: s.nieuw === true || s.nieuw === 'true' ? true : undefined,
    bewerk: typeof s.bewerk === 'string' ? s.bewerk : undefined,
  }),
  head: () => ({ meta: [{ title: 'Trainingen · NatUtrecht Trainersapp' }] }),
  component: TrainingenPagina,
})

type Periodefilter = '7' | '30' | 'alles'

function TrainingenPagina() {
  const data = useAppData()
  const navigate = useNavigate({ from: '/trainingen' })
  const zoek = Route.useSearch()
  const vandaag = todayISO()

  const [periode, setPeriode] = useState<Periodefilter>('7')
  const [groep, setGroep] = useState('alle')
  const [trainer, setTrainer] = useState('alle')
  const [focus, setFocus] = useState<Focus[]>([])
  const [tekst, setTekst] = useState('')
  const [basis, setBasis] = useState<Training | null>(null)

  const gefilterd = useMemo(() => {
    const grens = periode === 'alles' ? '0000-00-00' : addDays(vandaag, -Number(periode))
    const q = tekst.trim().toLowerCase()
    return data.trainingen.filter(
      (t) =>
        t.datum >= grens &&
        (groep === 'alle' || trainingVoorGroep(t.groepen, groep)) &&
        (trainer === 'alle' || t.trainerId === trainer) &&
        focus.every((f) => t.focus.includes(f)) &&
        (!q ||
          t.titel.toLowerCase().includes(q) ||
          t.notities.toLowerCase().includes(q) ||
          t.blokken.some((b) => b.omschrijving.toLowerCase().includes(q))),
    )
  }, [data.trainingen, periode, groep, trainer, focus, tekst, vandaag])

  const perDag = useMemo(() => {
    const map = new Map<string, Training[]>()
    for (const t of gefilterd) map.set(t.datum, [...(map.get(t.datum) ?? []), t])
    return [...map.entries()]
  }, [gefilterd])

  // Mijn trainingen van de afgelopen 2 weken die nog niet zijn vastgelegd
  const ontbrekend = gepubliceerdeTrainingen(data).filter(
    (g) =>
      staatIngeroosterd(g, data.huidigeTrainerId) &&
      g.training.datum < vandaag &&
      g.training.datum >= addDays(startOfWeek(vandaag), -7) &&
      !data.trainingen.some((t) => t.datum === g.training.datum && t.trainerId === data.huidigeTrainerId),
  )

  const geselecteerd = data.trainingen.find((t) => t.id === zoek.id) ?? null
  // Wijzigen en verwijderen: wie de training toevoegde of gaf (fix-31); de coördinator mag verwijderen.
  const isEigen = (t: Training | null | undefined) =>
    !!t && (t.aangemaaktDoor === data.huidigeTrainerId || t.trainerId === data.huidigeTrainerId)
  const magVerwijderen = (t: Training | null | undefined) => isEigen(t) || !!trainerById(data.huidigeTrainerId)?.coordinator
  const teBewerken = data.trainingen.find((t) => t.id === zoek.bewerk)
  const bewerk = isEigen(teBewerken) ? teBewerken! : null
  const formOpen = !!zoek.nieuw || !!bewerk
  const filtersActief = groep !== 'alle' || trainer !== 'alle' || focus.length > 0 || tekst !== ''
  const km = gefilterd.reduce((n, t) => n + totaalMeters(t), 0) / 1000

  const openNieuw = (b: Training | null = null) => {
    setBasis(b)
    navigate({ search: { nieuw: true } })
  }

  return (
    <>
      <PageHeader
        eyebrow="Trainingslogboek"
        title="Wat is er getraind?"
        description={<p>Leg je training vast of upload je trainingsbriefje, en zie wat collega's in alle banen hebben gedaan.</p>}
        actions={
          <Button size="lg" className="rounded-full font-bold" onClick={() => openNieuw()}>
            <ClipboardPlus /> Nieuwe training
          </Button>
        }
      />

      <div className="mx-auto max-w-content space-y-6 px-4 py-8 sm:px-6">
        {ontbrekend.length > 0 && (
          <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-accent/60 p-4 sm:flex-row sm:items-center">
            <p className="text-sm">
              <span className="font-bold">Nog vast te leggen:</span>{' '}
              {ontbrekend
                .map((g) => `${DAGEN[dagVan(g.training.datum)]} ${formatShort(g.training.datum)} ${g.training.start}`)
                .join(', ')}
            </p>
            <Button size="sm" className="sm:ml-auto" onClick={() => openNieuw()}>
              <Plus /> Nu invullen
            </Button>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="inline-flex rounded-full bg-muted p-1" role="group" aria-label="Periode">
                {(
                  [
                    ['7', 'Afgelopen week'],
                    ['30', '30 dagen'],
                    ['alles', 'Alles'],
                  ] as const
                ).map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={periode === v}
                    onClick={() => setPeriode(v)}
                    className={cn(
                      'rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                      periode === v ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <Select value={groep} onValueChange={setGroep}>
                <SelectTrigger className="w-40" aria-label="Filter op groep">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle groepen</SelectItem>
                  {GROEPEN.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.naam}
                    </SelectItem>
                  ))}
                  <SelectItem value={OP_INSCHRIJVING}>Op inschrijving</SelectItem>
                </SelectContent>
              </Select>
              <Select value={trainer} onValueChange={setTrainer}>
                <SelectTrigger className="w-48" aria-label="Filter op trainer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle trainers</SelectItem>
                  {data.trainers.filter(geeftTraining).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.naam}
                      {t.id === data.huidigeTrainerId ? ' (jij)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative min-w-48 flex-1">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  value={tekst}
                  onChange={(e) => setTekst(e.target.value)}
                  placeholder="Zoek op set, drill of notitie…"
                  className="pl-9"
                  aria-label="Zoek in trainingen"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter op focus">
              {ALLE_FOCUS.map((f) => {
                const aan = focus.includes(f)
                return (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={aan}
                    onClick={() => setFocus(aan ? focus.filter((x) => x !== f) : [...focus, f])}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                      aan ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-accent',
                    )}
                  >
                    {f}
                  </button>
                )
              })}
              {filtersActief && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    setGroep('alle')
                    setTrainer('alle')
                    setFocus([])
                    setTekst('')
                  }}
                >
                  <X /> Wis filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground" aria-live="polite">
          <span className="font-bold text-foreground">{gefilterd.length}</span> trainingen ·{' '}
          <span className="font-bold text-foreground">{km.toLocaleString('nl-NL', { maximumFractionDigits: 1 })} km</span>{' '}
          gezwommen
        </p>

        {perDag.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
              <Search className="size-8 text-muted-foreground" aria-hidden />
              <p className="font-bold">Geen trainingen gevonden</p>
              <p className="max-w-sm text-sm text-muted-foreground">Pas de filters aan of kies een langere periode.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {perDag.map(([datum, lijst]) => (
              <section key={datum} aria-label={formatLong(datum)}>
                <h2 className="mb-3 text-sm font-extrabold tracking-wide text-muted-foreground uppercase">
                  {formatLong(datum)}
                </h2>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {lijst.map((t) => (
                    <TrainingKaart key={t.id} training={t} onOpen={() => navigate({ search: { id: t.id } })} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <TrainingDetail
        training={geselecteerd}
        eigen={isEigen(geselecteerd)}
        magVerwijderen={magVerwijderen(geselecteerd)}
        onClose={() => navigate({ search: {} })}
        onHergebruik={(t) => openNieuw(t)}
        onWijzig={(t) => navigate({ search: { bewerk: t.id } })}
      />

      <Dialog
        open={formOpen}
        onOpenChange={(o) => {
          if (!o) {
            navigate({ search: {} })
            setBasis(null)
          }
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          {formOpen && (
            <NieuweTraining
              key={bewerk?.id ?? 'nieuw'}
              basis={basis}
              bewerk={bewerk}
              onKlaar={(id) => {
                setBasis(null)
                navigate({ search: id ? { id } : {} })
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function TrainingKaart({ training: t, onOpen }: { training: Training; onOpen: () => void }) {
  const trainer = trainerById(t.trainerId)!
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex h-full flex-col rounded-xl border bg-card p-5 text-left transition-shadow outline-none hover:shadow-lg hover:shadow-primary/10 focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none"
    >
      <div className="flex w-full items-center gap-3">
        <TrainerAvatar trainer={trainer} size="sm" />
        <div className="min-w-0 flex-1 text-xs text-muted-foreground">
          <p className="truncate font-semibold text-foreground">{trainer.naam}</p>
          <p>
            {sessieById(t.sessieId).dag} {sessieById(t.sessieId).start} · {groepenLabel(t.groepen)}
          </p>
        </div>
        <span className="text-right">
          <span className="block text-lg leading-none font-black">{totaalMeters(t).toLocaleString('nl-NL')}</span>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase">meter</span>
        </span>
      </div>
      <p className="mt-4 font-extrabold group-hover:text-primary">{t.titel}</p>
      {t.blokken.length > 0 && (
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {t.blokken
            .filter((b) => b.onderdeel !== 'Inzwemmen' && b.onderdeel !== 'Uitzwemmen')
            .map((b) => b.omschrijving)
            .join(' · ')}
        </p>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
        {t.focus.map((f) => (
          <Badge key={f} variant="secondary">
            {f}
          </Badge>
        ))}
        {t.bijlage && (
          <Badge variant="outline" className="ml-auto">
            <Paperclip /> Bijlage
          </Badge>
        )}
      </div>
    </button>
  )
}

function TrainingDetail({
  training: t,
  eigen,
  magVerwijderen,
  onClose,
  onHergebruik,
  onWijzig,
}: {
  training: Training | null
  eigen: boolean
  magVerwijderen: boolean
  onClose: () => void
  onHergebruik: (t: Training) => void
  onWijzig: (t: Training) => void
}) {
  // Verwijderen vraagt een tweede klik ter bevestiging.
  const [zeker, setZeker] = useState(false)
  return (
    <Sheet
      open={!!t}
      onOpenChange={(o) => {
        if (!o) {
          setZeker(false)
          onClose()
        }
      }}
    >
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {t && (
          <>
            <SheetHeader>
              <SheetTitle className="text-xl font-black">{t.titel}</SheetTitle>
              <SheetDescription className="capitalize">
                {formatLong(t.datum)} · {sessieById(t.sessieId).start} · {groepenLabel(t.groepen)}
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-6 px-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <TrainerChip trainer={trainerById(t.trainerId)!} />
                <span className="rounded-full bg-nat-ink px-3 py-1 text-sm font-bold text-white">
                  {totaalMeters(t).toLocaleString('nl-NL')} m totaal
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {t.focus.map((f) => (
                  <Badge key={f} variant="secondary">
                    {f}
                  </Badge>
                ))}
              </div>

              {t.blokken.length > 0 && (
                <ol className="space-y-2">
                  {t.blokken.map((b, i) => (
                    <li key={i} className="flex gap-3 rounded-lg border p-3">
                      <span className="w-20 shrink-0 text-xs font-bold tracking-wide text-primary uppercase">{b.onderdeel}</span>
                      <span className="flex-1 text-sm">{b.omschrijving}</span>
                      <span className="text-sm font-bold whitespace-nowrap">{b.meters} m</span>
                    </li>
                  ))}
                </ol>
              )}

              {t.bijlage && <BijlageOpenen trainingId={t.id} naam={t.bijlage} />}

              {t.notities && (
                <div>
                  <h3 className="mb-1 text-sm font-extrabold">Notities van de trainer</h3>
                  <p className="rounded-lg bg-muted p-3 text-sm">{t.notities}</p>
                </div>
              )}
            </div>
            <SheetFooter className="flex-row flex-wrap">
              {eigen && (
                <Button onClick={() => onWijzig(t)}>
                  <Pencil /> Wijzigen
                </Button>
              )}
              <Button variant={eigen ? 'outline' : 'default'} onClick={() => onHergebruik(t)}>
                <Copy /> Gebruik als basis
              </Button>
              {magVerwijderen && (
                <Button
                  variant={zeker ? 'destructive' : 'outline'}
                  className={cn(!zeker && 'text-destructive')}
                  onClick={() => {
                    if (!zeker) return setZeker(true)
                    verwijderTraining(t.id)
                    setZeker(false)
                    onClose()
                    toast('Training verwijderd')
                  }}
                >
                  <Trash2 /> {zeker ? 'Ja, verwijderen' : 'Verwijderen'}
                </Button>
              )}
            </SheetFooter>
            {magVerwijderen && zeker && (
              <p role="alert" className="px-4 pb-4 text-sm text-destructive">
                Weet je het zeker? Klik nog een keer om de training definitief te verwijderen.
              </p>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// Nieuwe training (samenstellen of uploaden)
// ---------------------------------------------------------------------------

const LEEG_BLOK: TrainingBlok = { onderdeel: 'Kern', omschrijving: '', meters: 0 }

function NieuweTraining({
  basis: kopie,
  bewerk,
  onKlaar,
}: {
  basis: Training | null
  /** Eigen training die gewijzigd wordt (fix-30); anders een nieuwe, eventueel op basis van `basis`. */
  bewerk?: Training | null
  onKlaar: (id?: string) => void
}) {
  const basis = bewerk ?? kopie
  const data = useAppData()
  const vandaag = todayISO()
  const week = startOfWeek(vandaag)

  // Trainingsmomenten van 2 weken terug t/m deze week, nieuwste eerst
  const recent = [-14, -7, 0]
    .flatMap((d) => SESSIES.map((s) => ({ sessie: s, datum: sessieDatum(addDays(week, d), s) })))
    .filter((m) => m.datum <= vandaag)
    .reverse()
  // Bij wijzigen staat het eigen moment van de training er altijd in, ook als het ouder is.
  const eigenSessie = bewerk ? SESSIES.find((s) => s.id === bewerk.sessieId) : undefined
  // Een moment uit een ingelezen trainingsschema (fix-32) kan ook ouder zijn.
  const [extraMoment, setExtraMoment] = useState<{ sessie: (typeof SESSIES)[number]; datum: string } | null>(null)
  const extra = [
    ...(bewerk && eigenSessie ? [{ sessie: eigenSessie, datum: bewerk.datum }] : []),
    ...(extraMoment ? [extraMoment] : []),
  ].filter((m, i, lijst) => lijst.findIndex((x) => x.datum === m.datum && x.sessie.id === m.sessie.id) === i)
  const momenten = [...extra.filter((m) => !recent.some((r) => r.datum === m.datum && r.sessie.id === m.sessie.id)), ...recent]

  // Het laatste moment waarop ik volgens het gepubliceerde rooster training gaf.
  const mijnGeroosterd = gepubliceerdeTrainingen(data).filter((g) => staatIngeroosterd(g, data.huidigeTrainerId))
  const mijnMoment = momenten.find((m) =>
    mijnGeroosterd.some((g) => g.training.datum === m.datum && g.training.start === m.sessie.start),
  )

  const [modus, setModus] = useState<'samenstellen' | 'uploaden'>(basis?.bijlage && !basis.blokken.length ? 'uploaden' : 'samenstellen')
  const [moment, setMoment] = useState(bewerk ? `${bewerk.datum}|${bewerk.sessieId}` : mijnMoment ? `${mijnMoment.datum}|${mijnMoment.sessie.id}` : (momenten[0] ? `${momenten[0].datum}|${momenten[0].sessie.id}` : ''))
  const [groepen, setGroepen] = useState<string[]>(basis?.groepen ?? [HELE_GROEP])
  const [trainerId, setTrainerId] = useState(bewerk?.trainerId ?? data.huidigeTrainerId)
  // De titel volgt het gekozen moment ("Training zondag op 22 november") tot de trainer hem zelf aanpast.
  const basisTitelEigen = !!basis && !/^Training \S+ op /.test(basis.titel)
  const [eigenTitel, setEigenTitel] = useState<string | null>(basisTitelEigen ? basis!.titel : null)
  const [focus, setFocus] = useState<Focus[]>((basis?.focus ?? []).filter((f) => ALLE_FOCUS.includes(f)))
  const basisAnders = (basis?.focus ?? []).filter((f) => !ALLE_FOCUS.includes(f)).join(', ')
  const [anders, setAnders] = useState(!!basisAnders)
  const [andersTekst, setAndersTekst] = useState(basisAnders)
  const [blokken, setBlokken] = useState<TrainingBlok[]>(
    basis?.blokken.length
      ? basis.blokken.map((b) => ({ ...b }))
      : [
          { onderdeel: 'Inzwemmen', omschrijving: '', meters: 400 },
          { ...LEEG_BLOK },
          { onderdeel: 'Uitzwemmen', omschrijving: 'Rustig naar keuze', meters: 200 },
        ],
  )
  const [notities, setNotities] = useState(bewerk?.notities ?? '')
  const [bestand, setBestand] = useState<File | null>(null)
  // Bij wijzigen: de al bewaarde bijlage weghalen.
  const [bijlageWeg, setBijlageWeg] = useState(false)
  const [bijlageFout, setBijlageFout] = useState('')
  const [inlezen, setInlezen] = useState(false)
  const [overgenomen, setOvergenomen] = useState(false)
  const [bezig, setBezig] = useState(false)
  const [uploadMeters, setUploadMeters] = useState('')
  const [poging, setPoging] = useState(false)
  const bestaandeBijlage = bewerk?.bijlage && !bijlageWeg ? bewerk.bijlage : null
  const bijlageNaam = bestand?.name ?? bestaandeBijlage

  /** Nieuw bestand gekozen: bewaren als bijlage, en een trainingsschema-pdf meteen inlezen. */
  async function kiesBestand(f: File | null) {
    setBestand(f)
    setBijlageFout('')
    setOvergenomen(false)
    if (!f || !(f.type === 'application/pdf' || /\.pdf$/i.test(f.name))) return
    setInlezen(true)
    try {
      const [{ leesPdfTekst }, { leesTrainingSchema }] = await Promise.all([
        import('@/lib/pdf-tekst'),
        import('@/lib/training-schema'),
      ])
      const schema = leesTrainingSchema(await leesPdfTekst(f))
      if (!schema) return
      setBlokken(schema.blokken)
      setNotities(schema.notities)
      setFocus(schema.focus)
      setAnders(false)
      setAndersTekst('')
      setEigenTitel(null)
      const s = SESSIES.find((x) => x.dag.toLowerCase() === schema.dag)
      if (s) {
        setExtraMoment({ sessie: s, datum: schema.datum })
        setMoment(`${schema.datum}|${s.id}`)
      }
      setModus('samenstellen')
      setOvergenomen(true)
    } catch {
      // Geen leesbare pdf: dan wordt hij alleen als bijlage bewaard.
    } finally {
      setInlezen(false)
    }
  }

  const [momentDatum, momentSessie] = moment.split('|')
  const sessie = SESSIES.find((s) => s.id === momentSessie)
  const titel = eigenTitel ?? (sessie && momentDatum ? standaardTitel(sessie.dag, momentDatum) : '')

  /** Hele groep en Op inschrijving staan alleen; drie losse groepen samen = hele groep. */
  const kiesGroep = (id: string) => {
    if (id === HELE_GROEP || id === OP_INSCHRIJVING) return setGroepen([id])
    const los = groepen.filter((g) => g !== HELE_GROEP && g !== OP_INSCHRIJVING)
    const nieuw = los.includes(id) ? los.filter((g) => g !== id) : [...los, id]
    setGroepen(nieuw.length === GROEPEN.length ? [HELE_GROEP] : nieuw)
  }

  const totaal = blokken.reduce((n, b) => n + (b.meters || 0), 0)
  const fouten: string[] = []
  if (!titel.trim()) fouten.push('Geef de training een titel.')
  if (!moment) fouten.push('Kies een trainingsmoment.')
  if (!groepen.length) fouten.push('Kies de groep: hele groep, een of meer groepen, of op inschrijving.')
  if (anders && !andersTekst.trim()) fouten.push('Vul in wat de andere focus is, of zet "Anders" uit.')
  if (modus === 'samenstellen' && !blokken.some((b) => b.omschrijving.trim() && b.meters > 0))
    fouten.push('Voeg minstens één onderdeel met omschrijving en meters toe.')
  if (modus === 'uploaden' && !bijlageNaam) fouten.push('Kies een bestand om te uploaden.')

  const updateBlok = (i: number, patch: Partial<TrainingBlok>) =>
    setBlokken(blokken.map((b, j) => (j === i ? { ...b, ...patch } : b)))

  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault()
        setPoging(true)
        if (fouten.length || bezig || inlezen) return
        // Het bestand zelf bewaren (fix-32); te groot = melding, niets opgeslagen.
        let bijlage: BijlageData | undefined
        if (bestand) {
          setBezig(true)
          const uitkomst = await maakBijlage(bestand).catch(() => ({ fout: 'Het bestand kon niet gelezen worden.' }))
          setBezig(false)
          if ('fout' in uitkomst) return setBijlageFout(uitkomst.fout)
          bijlage = uitkomst
        }
        const [datum, sessieId] = moment.split('|')
        const meters = Number(uploadMeters)
        const velden: TrainingVelden = {
          datum,
          sessieId,
          groepId: groepen[0],
          groepen,
          trainerId,
          titel: titel.trim(),
          focus: anders ? [...focus, andersTekst.trim()] : focus,
          notities: notities.trim(),
          blokken:
            modus === 'samenstellen'
              ? blokken.filter((b) => b.omschrijving.trim() || b.meters > 0)
              : meters > 0
                ? [{ onderdeel: 'Kern', omschrijving: 'Zie bijlage', meters }]
                : [],
          bijlage: bijlage?.naam ?? bestaandeBijlage ?? undefined,
        }
        if (bewerk) {
          werkTrainingBij(bewerk.id, velden, bijlage ?? (bewerk.bijlage && bijlageWeg ? null : undefined))
          toast.success('Training gewijzigd')
          return onKlaar(bewerk.id)
        }
        const id = voegTrainingToe(velden, bijlage)
        toast.success('Training vastgelegd', { description: 'Je collega’s zien hem nu in het logboek.' })
        onKlaar(id)
      }}
    >
      <DialogHeader>
        <DialogTitle className="text-xl font-black">
          {bewerk ? 'Training wijzigen' : basis ? 'Training op basis van bestaande' : 'Nieuwe training'}
        </DialogTitle>
        <DialogDescription>
          {bewerk
            ? 'Pas aan wat je hebt vastgelegd. Collega’s zien meteen de nieuwe versie.'
            : 'Leg vast wat je hebt gegeven, zodat het hele trainersteam kan meekijken.'}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="n-titel">Titel</Label>
          <Input
            id="n-titel"
            value={titel}
            onChange={(e) => setEigenTitel(e.target.value)}
            maxLength={200}
            aria-invalid={poging && !titel.trim()}
            aria-describedby="n-titel-hulp"
          />
          <p id="n-titel-hulp" className="text-xs text-muted-foreground">
            {eigenTitel === null ? (
              'Volgt het gekozen moment. Typ gerust een eigen titel, bijv. "Keerpunten & onderwaterfase".'
            ) : (
              <button
                type="button"
                className="font-semibold text-primary underline-offset-2 hover:underline"
                onClick={() => setEigenTitel(null)}
              >
                Terug naar de standaardtitel
              </button>
            )}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="n-moment">Trainingsmoment</Label>
          <Select value={moment} onValueChange={setMoment}>
            <SelectTrigger id="n-moment" className="w-full">
              <SelectValue placeholder="Kies moment" />
            </SelectTrigger>
            <SelectContent>
              {momenten.map((m) => (
                <SelectItem key={`${m.datum}|${m.sessie.id}`} value={`${m.datum}|${m.sessie.id}`}>
                  {m.sessie.dag} {formatShort(m.datum)} · {m.sessie.start}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="n-trainer">Gegeven door</Label>
          <Select value={trainerId} onValueChange={setTrainerId}>
            <SelectTrigger id="n-trainer" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {data.trainers.filter(geeftTraining).map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.naam}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Groep</legend>
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: HELE_GROEP, naam: 'Hele groep', hint: '' },
            ...GROEPEN.map((g) => ({ id: g.id, naam: g.naam, hint: g.banen })),
            { id: OP_INSCHRIJVING, naam: 'Op inschrijving', hint: 'bijv. workshop' },
          ].map((g) => (
            <KeuzeChip key={g.id} aan={groepen.includes(g.id)} onClick={() => kiesGroep(g.id)}>
              {g.naam}
              {g.hint && <span className="font-normal opacity-75"> · {g.hint}</span>}
            </KeuzeChip>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Kies de hele groep, een of meer groepen samen, of op inschrijving.</p>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Focus</legend>
        <div className="flex flex-wrap gap-1.5">
          {ALLE_FOCUS.map((f) => {
            const aan = focus.includes(f)
            return (
              <button
                key={f}
                type="button"
                aria-pressed={aan}
                onClick={() => setFocus(aan ? focus.filter((x) => x !== f) : [...focus, f])}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                  aan ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-accent',
                )}
              >
                {f}
              </button>
            )
          })}
          <KeuzeChip aan={anders} onClick={() => setAnders(!anders)}>
            Anders…
          </KeuzeChip>
        </div>
        {anders && (
          <Input
            value={andersTekst}
            onChange={(e) => setAndersTekst(e.target.value)}
            maxLength={40}
            placeholder="Bijv. Onderwaterfase"
            aria-label="Andere focus"
            aria-invalid={poging && !andersTekst.trim()}
            autoFocus={!basisAnders}
          />
        )}
      </fieldset>

      <Tabs value={modus} onValueChange={(v) => setModus(v as typeof modus)}>
        <TabsList className="w-full">
          <TabsTrigger value="samenstellen">
            <ClipboardPlus /> Samenstellen
          </TabsTrigger>
          <TabsTrigger value="uploaden">
            <Upload /> Bestand uploaden
          </TabsTrigger>
        </TabsList>

        <TabsContent value="samenstellen" className="mt-4 space-y-3">
          {overgenomen && (
            <p role="status" className="rounded-lg bg-accent/60 p-3 text-sm">
              <strong>Overgenomen uit het trainingsschema.</strong> Onderdelen, notities, focus en moment zijn ingevuld;
              controleer ze even. De pdf wordt als bijlage bewaard.
            </p>
          )}
          {blokken.map((b, i) => (
            <div key={i} className="grid grid-cols-[7.5rem_1fr_5.5rem_auto] items-center gap-2">
              <Select value={b.onderdeel} onValueChange={(v) => updateBlok(i, { onderdeel: v as TrainingBlok['onderdeel'] })}>
                <SelectTrigger className="w-full" aria-label={`Onderdeel ${i + 1}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ONDERDELEN.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={b.omschrijving}
                onChange={(e) => updateBlok(i, { omschrijving: e.target.value })}
                placeholder="Bijv. 8×50 vrij op 1:00"
                aria-label={`Omschrijving onderdeel ${i + 1}`}
              />
              <div className="relative">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={25}
                  value={b.meters || ''}
                  onChange={(e) => updateBlok(i, { meters: Math.max(0, Number(e.target.value) || 0) })}
                  className="pr-6"
                  aria-label={`Meters onderdeel ${i + 1}`}
                />
                <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-muted-foreground">m</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setBlokken(blokken.filter((_, j) => j !== i))}
                disabled={blokken.length === 1}
                aria-label={`Verwijder onderdeel ${i + 1}`}
              >
                <X />
              </Button>
            </div>
          ))}
          <div className="flex items-center justify-between">
            <Button type="button" variant="outline" size="sm" onClick={() => setBlokken([...blokken, { ...LEEG_BLOK }])}>
              <Plus /> Onderdeel toevoegen
            </Button>
            <p className="text-sm">
              Totaal: <span className="font-black">{totaal.toLocaleString('nl-NL')} m</span>
            </p>
          </div>
        </TabsContent>

        <TabsContent value="uploaden" className="mt-4 space-y-4">
          <label
            htmlFor="n-bestand"
            className={cn(
              'flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors hover:border-primary hover:bg-accent/40',
              bijlageNaam && 'border-primary bg-accent/40',
              poging && modus === 'uploaden' && !bijlageNaam && 'border-destructive',
            )}
          >
            <FileUp className="size-8 text-primary" aria-hidden />
            <span className="font-bold">{bijlageNaam ?? 'Kies een pdf, foto of Word-bestand'}</span>
            <span className="text-xs text-muted-foreground">
              {bestand
                ? `${Math.max(1, Math.round(bestand.size / 1024))} kB · klik om te vervangen`
                : bijlageNaam
                  ? 'Klik om te vervangen'
                  : `Bijvoorbeeld een foto van je trainingsbriefje (max. ${MAX_BESTAND_KB} kB; foto's worden verkleind)`}
            </span>
            <span className="text-xs text-muted-foreground">
              Een trainingsschema-pdf uit de trainingschats wordt meteen ingelezen.
            </span>
            <input
              id="n-bestand"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.heic,.doc,.docx"
              className="sr-only"
              onChange={(e) => kiesBestand(e.target.files?.[0] ?? null)}
            />
          </label>
          {inlezen && (
            <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> Trainingsschema inlezen…
            </p>
          )}
          <div className="max-w-48 space-y-2">
            <Label htmlFor="n-um">Totaal aantal meters (optioneel)</Label>
            <Input id="n-um" type="number" min={0} step={50} value={uploadMeters} onChange={(e) => setUploadMeters(e.target.value)} />
          </div>
        </TabsContent>
      </Tabs>

      {bijlageNaam && (
        <div className="flex items-center gap-3 rounded-lg border border-dashed p-3 text-sm">
          <Paperclip className="size-4 shrink-0 text-primary" aria-hidden />
          <span className="min-w-0 flex-1 truncate font-medium">Bijlage: {bijlageNaam}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setBestand(null)
              setBijlageFout('')
              if (!bestand && bewerk?.bijlage) setBijlageWeg(true)
            }}
          >
            <X /> Weghalen
          </Button>
        </div>
      )}
      {bijlageFout && (
        <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">
          {bijlageFout}
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="n-notities">Notities voor collega's</Label>
        <Textarea
          id="n-notities"
          rows={notities.length > 300 ? 8 : 3}
          value={notities}
          onChange={(e) => setNotities(e.target.value)}
          placeholder="Wat ging goed, waar moet de volgende trainer op letten?"
        />
      </div>

      {poging && fouten.length > 0 && (
        <ul role="alert" className="space-y-1 rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">
          {fouten.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onKlaar()}>
          Annuleren
        </Button>
        <Button type="submit" disabled={bezig || inlezen}>
          {bezig ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden /> : <ClipboardPlus />}{' '}
          {bewerk ? 'Wijzigingen opslaan' : 'Training opslaan'}
        </Button>
      </DialogFooter>
    </form>
  )
}

function KeuzeChip({ aan, onClick, children }: { aan: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={aan}
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none',
        aan ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-accent',
      )}
    >
      {children}
    </button>
  )
}

/** Opent (downloadt) het bewaarde bestand bij een training (fix-32). */
function BijlageOpenen({ trainingId, naam }: { trainingId: string; naam: string }) {
  const [bezig, setBezig] = useState(false)
  return (
    <div className="flex items-center gap-3 rounded-lg border border-dashed p-3 text-sm">
      <Paperclip className="size-4 shrink-0 text-primary" aria-hidden />
      <span className="min-w-0 flex-1 truncate font-medium">{naam}</span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={bezig}
        onClick={async () => {
          setBezig(true)
          try {
            const gelukt = await openBijlage(trainingId)
            if (!gelukt)
              toast('Dit bestand is niet bewaard', {
                description: 'Het is toegevoegd voordat de app bestanden kon opslaan. Upload het opnieuw via Wijzigen.',
              })
          } catch {
            toast.error('Het bestand kon niet worden geopend. Controleer je verbinding.')
          } finally {
            setBezig(false)
          }
        }}
      >
        {bezig ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden /> : <FileUp />} Openen
      </Button>
    </div>
  )
}
