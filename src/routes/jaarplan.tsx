// Fix: fix-25 — wedstrijden als speld op de startdatum, labels zonder overlap
// Fix: fix-24 — bewerken pas na 'Jaarplan bewerken'; verwijderknoppen bij fases en aandachtsgebieden; 'Nu' inklapbaar
// Fix: fix-23 — blokken inklapbaar (onthouden per apparaat); seizoensoverzicht verborgen
// Fix: fix-21 — jaarplan als trainingsopbouw: tijdlijn, inleiding, aandachtsgebieden, zones en fases in blokken
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ChevronDown,
  Flag,
  Megaphone,
  Pencil,
  Plus,
  Printer,
  Settings2,
  Trash2,
} from 'lucide-react'
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/app-shell'
import {
  RijkeTekst,
  RijkeTekstEditor,
  heeftTekst,
} from '@/components/rijke-tekst'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  FASE_KLEUREN,
  magJaarplanBewerken,
  type Aandachtsgebied,
  type Fase,
  type Jaarplan,
  type Opbouw,
  type Wedstrijd,
  type Zone,
} from '@/data/fixtures'
import {
  faseOp,
  huidigeOpbouw,
  nieuwId,
  opbouwBereik,
  opbouwenOpVolgorde,
  reces,
  tijdlijnPositie,
  volgendeWedstrijd,
} from '@/data/jaarplan'
import { OPBOUW_SEPT_DEC_2026 } from '@/data/jaarplan-voorbeeld'
import {
  bewaarOpbouw,
  bewaarZones,
  publiceerJaarplan,
  trainerById,
  useAppData,
  verwijderOpbouw,
} from '@/data/store'
import {
  addDays,
  daysBetween,
  formatRange,
  formatShort,
  todayISO,
} from '@/lib/dates'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/jaarplan')({
  head: () => ({ meta: [{ title: 'Jaarplan · NatUtrecht Trainersapp' }] }),
  component: JaarplanPagina,
})

const MAANDEN = [
  'jan',
  'feb',
  'mrt',
  'apr',
  'mei',
  'jun',
  'jul',
  'aug',
  'sep',
  'okt',
  'nov',
  'dec',
]

/** Zachte achtergrond bij een (fase- of zone)kleur. */
const zacht = (kleur: string) => `color-mix(in srgb, ${kleur} 18%, white)`

async function probeer(actie: () => Promise<unknown>, gelukt: string) {
  try {
    await actie()
    toast.success(gelukt)
    return true
  } catch (err) {
    console.error(err)
    toast.error('Opslaan lukte niet. Probeer het opnieuw.')
    return false
  }
}

function JaarplanPagina() {
  const data = useAppData()
  const plan = data.jaarplan
  const ik = trainerById(data.huidigeTrainerId)
  const magJaarplan = magJaarplanBewerken(ik)
  // Bewerken staat standaard uit, zodat een klaar jaarplan niet per ongeluk verandert.
  const [bewerkModus, setBewerkModus] = useState(false)
  const magBewerken = magJaarplan && bewerkModus
  const vandaag = todayISO()
  const opbouwen = opbouwenOpVolgorde(plan)
  const [gekozen, setGekozen] = useState<string | null>(null)
  const opbouw =
    opbouwen.find((o) => o.id === gekozen) ?? huidigeOpbouw(plan, vandaag)
  const [faseOpen, setFaseOpen] = useState<{
    opbouw: Opbouw
    fase: Fase
  } | null>(null)
  const [publiceren, setPubliceren] = useState(false)
  const [instellingen, setInstellingen] = useState<Opbouw | null>(null)

  return (
    <>
      <PageHeader
        eyebrow={`Jaarplan · seizoen ${plan.seizoen}`}
        title="Trainingsopbouw"
        description={
          <p>
            Wat trainen we wanneer: per opbouw een inleiding, aandachtsgebieden
            en fases met voorbeeldsets.{' '}
            {plan.status === 'gepubliceerd'
              ? `Gepubliceerd${plan.gepubliceerdOp ? ` op ${formatShort(plan.gepubliceerdOp)}` : ''} · versie ${plan.versie}.`
              : 'Concept: nog niet gepubliceerd.'}
          </p>
        }
        actions={
          <>
            <Button asChild variant="secondary">
              <Link to="/wedstrijden">
                <Flag /> Wedstrijden
              </Link>
            </Button>
            <Button
              variant="outline"
              className="border-white/30 bg-white/5 text-white hover:bg-white/15 hover:text-white"
              onClick={() => window.print()}
            >
              <Printer /> Afdrukken
            </Button>
            {magJaarplan && (
              <Button
                variant={bewerkModus ? 'default' : 'secondary'}
                aria-pressed={bewerkModus}
                onClick={() => setBewerkModus((b) => !b)}
              >
                <Pencil />{' '}
                {bewerkModus ? 'Klaar met bewerken' : 'Jaarplan bewerken'}
              </Button>
            )}
            {magJaarplan && (
              <Button
                onClick={() => setPubliceren(true)}
                disabled={plan.status === 'gepubliceerd'}
              >
                <Megaphone />{' '}
                {plan.status === 'gepubliceerd' ? 'Gepubliceerd' : 'Publiceren'}
              </Button>
            )}
          </>
        }
      />

      {bewerkModus && (
        <div className="sticky top-16 z-20 border-b bg-nat-yellow/90 backdrop-blur print:hidden">
          <div className="mx-auto flex max-w-content flex-wrap items-center gap-3 px-4 py-2 text-sm sm:px-6">
            <Pencil className="size-4" aria-hidden />
            <span className="flex-1">
              <strong>Bewerken staat aan.</strong> Elk blok heeft nu een potlood
              en prullenbak. Wijzigingen zetten het jaarplan op concept.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBewerkModus(false)}
            >
              Klaar
            </Button>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-content space-y-6 px-4 py-6 sm:px-6">
        <Tijdlijn
          plan={plan}
          wedstrijden={data.wedstrijden}
          vandaag={vandaag}
          onFase={(o, f) => setFaseOpen({ opbouw: o, fase: f })}
        />
        <NuKaart
          plan={plan}
          wedstrijden={data.wedstrijden}
          vandaag={vandaag}
          onFase={(o, f) => setFaseOpen({ opbouw: o, fase: f })}
        />

        <div
          className="flex flex-wrap items-center gap-2 print:hidden"
          role="tablist"
          aria-label="Opbouw"
        >
          {opbouwen.map((o) => (
            <Button
              key={o.id}
              role="tab"
              aria-selected={opbouw?.id === o.id}
              variant={opbouw?.id === o.id ? 'default' : 'outline'}
              className="rounded-full"
              onClick={() => setGekozen(o.id)}
            >
              {o.naam}
            </Button>
          ))}
          {magBewerken && (
            <Button
              variant="ghost"
              className="rounded-full"
              onClick={() =>
                setInstellingen({
                  id: nieuwId('o'),
                  naam: '',
                  inleiding: '',
                  doelWedstrijdId: null,
                  aandachtsgebieden: [],
                  fases: [],
                })
              }
            >
              <Plus /> Opbouw
            </Button>
          )}
        </div>

        {opbouw ? (
          <OpbouwBlokken
            key={opbouw.id}
            opbouw={opbouw}
            plan={plan}
            wedstrijden={data.wedstrijden}
            magBewerken={magBewerken}
            onInstellingen={() => setInstellingen(opbouw)}
            onFase={(f) => setFaseOpen({ opbouw, fase: f })}
          />
        ) : (
          <LegeOpbouw magBewerken={magBewerken} magJaarplan={magJaarplan} />
        )}

        <ZonesBlok zones={plan.zones} magBewerken={magBewerken} />
      </div>

      {faseOpen && (
        <FaseSheet
          opbouw={faseOpen.opbouw}
          fase={faseOpen.fase}
          zones={plan.zones}
          magBewerken={magBewerken}
          onClose={() => setFaseOpen(null)}
        />
      )}
      {instellingen && (
        <OpbouwDialog
          opbouw={instellingen}
          nieuw={!plan.opbouwen.some((o) => o.id === instellingen.id)}
          wedstrijden={data.wedstrijden}
          onKlaar={(id) => {
            setInstellingen(null)
            if (id) setGekozen(id)
          }}
        />
      )}
      <PubliceerDialog
        open={publiceren}
        onOpenChange={setPubliceren}
        plan={plan}
      />
    </>
  )
}

// --- Tijdlijn ------------------------------------------------------------------

function Tijdlijn({
  plan,
  wedstrijden,
  vandaag,
  onFase,
}: {
  plan: Jaarplan
  wedstrijden: Wedstrijd[]
  vandaag: string
  onFase: (o: Opbouw, f: Fase) => void
}) {
  const [open, wissel] = useInklap('tijdlijn')
  const inhoud = useId()
  const pos = (van: string, tot?: string) =>
    tijdlijnPositie(plan.van, plan.tot, van, tot)
  const maanden: { naam: string; links: number }[] = []
  for (let d = `${plan.van.slice(0, 7)}-01`; d <= plan.tot;) {
    if (d >= plan.van)
      maanden.push({
        naam: MAANDEN[Number(d.slice(5, 7)) - 1],
        links: pos(d).links,
      })
    const [j, m] = d.split('-').map(Number)
    d =
      m === 12 ? `${j + 1}-01-01` : `${j}-${String(m + 1).padStart(2, '0')}-01`
  }
  const vandaagIn = vandaag >= plan.van && vandaag <= plan.tot
  // Op een smal scherm scrolt de tijdlijn; begin dan rond vandaag.
  const scroller = useRef<HTMLDivElement>(null)
  const vandaagLinks = vandaagIn
    ? tijdlijnPositie(plan.van, plan.tot, vandaag).links
    : 0
  useEffect(() => {
    const el = scroller.current
    if (el && el.scrollWidth > el.clientWidth)
      el.scrollLeft = (vandaagLinks / 100) * el.scrollWidth - el.clientWidth / 3
  }, [vandaagLinks])
  const zichtbareWedstrijden = wedstrijden.filter(
    (w) => w.datum >= plan.van && w.datum <= plan.tot,
  )

  return (
    <section
      aria-labelledby="tijdlijn-kop"
      className="rounded-2xl border bg-card p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="tijdlijn-kop" className="m-0">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={inhoud}
            onClick={wissel}
            className="flex min-h-11 items-center gap-2 rounded-lg text-lg font-extrabold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            Tijdlijn {plan.seizoen}
            <ChevronDown
              className={cn(
                'size-5 text-muted-foreground transition-transform motion-reduce:transition-none print:hidden',
                !open && '-rotate-90',
              )}
              aria-hidden
            />
          </button>
        </h2>
        {open && (
          <p className="text-sm text-muted-foreground">
            Klik op een blok voor de inhoud van die fase
          </p>
        )}
      </div>
      <div id={inhoud} className={cn(!open && 'hidden print:block')}>
        <div ref={scroller} className="mt-4 overflow-x-auto pb-1">
          <div className="relative min-w-[760px] pt-7">
            <div
              className="relative h-5 text-xs font-bold text-muted-foreground"
              aria-hidden
            >
              {maanden.map((m) => (
                <span
                  key={`${m.naam}${m.links}`}
                  className="absolute border-l pl-1"
                  style={{ left: `${m.links}%` }}
                >
                  {m.naam}
                </span>
              ))}
            </div>
            <div className="relative mb-1 h-5" aria-hidden>
              {opbouwenOpVolgorde(plan).map((o) => {
                const b = opbouwBereik(o)
                if (!b) return null
                const p = pos(b.van, b.tot)
                return (
                  <span
                    key={o.id}
                    className="absolute truncate text-[11px] font-extrabold uppercase tracking-wide"
                    style={{ left: `${p.links}%`, width: `${p.breedte}%` }}
                  >
                    {o.naam}
                  </span>
                )
              })}
            </div>
            <div className="relative h-[72px] rounded-lg bg-muted">
              {reces(plan).map((r) => {
                const p = pos(r.datum, r.einddatum ?? r.datum)
                return (
                  <span
                    key={r.id}
                    title={r.naam}
                    className="absolute inset-y-0 flex items-end justify-center overflow-hidden rounded-md pb-1 text-[11px] font-bold text-muted-foreground"
                    style={{
                      left: `${p.links}%`,
                      width: `${p.breedte}%`,
                      background:
                        'repeating-linear-gradient(135deg, var(--border) 0 6px, transparent 6px 12px)',
                    }}
                  >
                    <span className="truncate px-1">{r.naam}</span>
                  </span>
                )
              })}
              {plan.opbouwen.flatMap((o) =>
                o.fases.map((f, i) => {
                  const p = pos(f.van, f.tot)
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => onFase(o, f)}
                      aria-label={`Fase ${i + 1}: ${f.naam}, ${formatRange(f.van, f.tot)}`}
                      className="absolute inset-y-1.5 flex flex-col gap-0.5 overflow-hidden rounded-md p-1.5 text-left text-[11px] leading-tight text-white outline-none hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-ring"
                      style={{
                        left: `${p.links}%`,
                        width: `calc(${p.breedte}% - 3px)`,
                        background: f.kleur,
                      }}
                    >
                      <span className="font-extrabold">Fase {i + 1}</span>
                      <span className="truncate opacity-95">{f.naam}</span>
                    </button>
                  )
                }),
              )}
              {vandaagIn && (
                <>
                  <span
                    className="absolute -inset-y-2.5 w-0.5 bg-foreground"
                    style={{ left: `${pos(vandaag).links}%` }}
                    aria-hidden
                  />
                  <span
                    className="absolute -top-7 -translate-x-1/2 rounded-full bg-foreground px-2 py-0.5 text-[11px] font-extrabold text-background"
                    style={{ left: `${pos(vandaag).links}%` }}
                  >
                    vandaag
                  </span>
                </>
              )}
            </div>
            <WedstrijdPinnen
              wedstrijden={zichtbareWedstrijden}
              positie={(d) => pos(d).links}
            />
          </div>
        </div>
        <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>Blok = fase</span>
          <span>Speld = wedstrijd op die datum (rood: doelwedstrijd)</span>
          <span>Gestreept = geen training</span>
        </p>
      </div>
    </section>
  )
}

/**
 * Wedstrijden onder de tijdlijn: een speld (bolletje met steeltje) precies op de
 * startdatum, met het label in een eigen rij zodat labels elkaar niet overlappen.
 */
function WedstrijdPinnen({
  wedstrijden,
  positie,
}: {
  wedstrijden: Wedstrijd[]
  positie: (datum: string) => number
}) {
  // Een label is hoogstens ~22% van de tijdlijn breed (min. 760px breed).
  const BREED = 22
  const RIJ = 26
  const eindes: number[] = []
  const pinnen = [...wedstrijden]
    .sort((a, b) => a.datum.localeCompare(b.datum))
    .map((w) => {
      const x = positie(w.datum)
      const rechts = x > 100 - BREED
      const van = rechts ? x - BREED : x
      let rij = eindes.findIndex((e) => e < van)
      if (rij === -1) rij = eindes.length
      eindes[rij] = van + BREED
      return { w, x, rechts, rij }
    })
  const hoogte = Math.max(1, eindes.length) * RIJ + 10

  return (
    <div className="relative" style={{ height: hoogte }}>
      {pinnen.map(({ w, x, rechts, rij }) => {
        const kleur = w.doel ? 'bg-primary' : 'bg-foreground'
        const datum = w.einddatum
          ? formatRange(w.datum, w.einddatum)
          : formatShort(w.datum)
        return (
          <div key={w.id}>
            <span
              className={cn('absolute top-0 w-0.5 -translate-x-1/2', kleur)}
              style={{ left: `${x}%`, height: rij * RIJ + 12 }}
              aria-hidden
            />
            <span
              className={cn(
                'absolute -top-1.5 size-3 -translate-x-1/2 rounded-full ring-2 ring-card',
                kleur,
              )}
              style={{ left: `${x}%` }}
              aria-hidden
            />
            <Link
              to="/wedstrijden"
              title={`${w.naam} · ${datum}${w.onderVoorbehoud ? ' (onder voorbehoud)' : ''}`}
              className={cn(
                'absolute z-10 flex max-w-[22%] items-center gap-1 rounded-full px-2 py-0.5 text-[11px] leading-5 font-bold whitespace-nowrap outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                w.doel
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-muted-foreground/40 bg-card text-foreground',
                w.onderVoorbehoud && 'border-dashed',
              )}
              style={{
                top: rij * RIJ + 10,
                ...(rechts ? { right: `${100 - x}%` } : { left: `${x}%` }),
                [rechts ? 'borderTopRightRadius' : 'borderTopLeftRadius']: 0,
              }}
            >
              <span className="shrink-0">{datum}</span>
              <span className="truncate font-semibold opacity-90">
                {w.naam}
              </span>
            </Link>
          </div>
        )
      })}
    </div>
  )
}

// --- Nu --------------------------------------------------------------------------

function ZoneChip({ zone }: { zone?: Zone }) {
  if (!zone) return null
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold text-foreground"
      style={{ background: zacht(zone.kleur) }}
    >
      <span
        className="size-2.5 rounded-full"
        style={{ background: zone.kleur }}
        aria-hidden
      />
      {zone.naam}
    </span>
  )
}

function NuKaart({
  plan,
  wedstrijden,
  vandaag,
  onFase,
}: {
  plan: Jaarplan
  wedstrijden: Wedstrijd[]
  vandaag: string
  onFase: (o: Opbouw, f: Fase) => void
}) {
  const [open, wissel] = useInklap('nu')
  const inhoudId = useId()
  const nu = faseOp(plan, vandaag)
  const volgende = volgendeWedstrijd(wedstrijden, vandaag)
  if (!nu) {
    if (!volgende) return null
    return (
      <p className="rounded-2xl border bg-card p-4 text-sm">
        Er loopt nu geen fase. Volgende wedstrijd:{' '}
        <strong>{volgende.naam}</strong> op {formatShort(volgende.datum)} (nog{' '}
        {daysBetween(vandaag, volgende.datum)} dagen).
      </p>
    )
  }
  const doel =
    wedstrijden.find((w) => w.id === nu.opbouw.doelWedstrijdId) ?? volgende
  return (
    <section
      aria-labelledby="nu-kop"
      className={cn(
        'relative grid gap-5 rounded-2xl border-2 bg-card p-4 sm:p-5',
        open && 'md:grid-cols-2',
      )}
      style={{ borderColor: nu.fase.kleur }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={inhoudId}
        aria-label={open ? 'Nu inklappen' : 'Nu uitklappen'}
        onClick={wissel}
        className="absolute top-2 right-2 flex size-11 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 print:hidden"
      >
        <ChevronDown
          className={cn(
            'size-5 transition-transform motion-reduce:transition-none',
            !open && '-rotate-90',
          )}
          aria-hidden
        />
      </button>
      <div className="space-y-3 pr-10">
        <p className="text-xs font-extrabold tracking-[0.16em] uppercase text-muted-foreground">
          Nu · fase {nu.nummer} van {nu.opbouw.fases.length}
        </p>
        <h2 id="nu-kop" className="text-xl font-extrabold sm:text-2xl">
          {nu.fase.naam}
        </h2>
        <div
          id={inhoudId}
          className={cn('space-y-3', !open && 'hidden print:block')}
        >
          <p className="text-sm text-muted-foreground">
            {formatRange(nu.fase.van, nu.fase.tot)}
            {doel && doel.datum >= vandaag && (
              <>
                {' '}
                · nog {daysBetween(vandaag, doel.datum)}{' '}
                {daysBetween(vandaag, doel.datum) === 1 ? 'dag' : 'dagen'} tot{' '}
                {doel.naam}
              </>
            )}
          </p>
          {heeftTekst(nu.fase.doel) && <RijkeTekst html={nu.fase.doel} />}
          <div className="flex flex-wrap gap-1.5">
            {nu.fase.zones.map((id) => (
              <ZoneChip key={id} zone={plan.zones.find((z) => z.id === id)} />
            ))}
          </div>
        </div>
      </div>
      <div
        className={cn(
          'rounded-xl bg-muted/60 p-4',
          !open && 'hidden print:block',
        )}
      >
        <h3 className="mb-2 text-sm font-extrabold">Voorbeeldsets</h3>
        {nu.fase.sets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nog geen voorbeeldsets.
          </p>
        ) : (
          <ol className="list-decimal space-y-1.5 pl-5 text-sm">
            {nu.fase.sets.slice(0, 3).map((s, i) => (
              <li key={i}>
                <RijkeTekst html={s} />
              </li>
            ))}
          </ol>
        )}
        <Button
          variant="link"
          className="mt-1 h-auto px-0"
          onClick={() => onFase(nu.opbouw, nu.fase)}
        >
          Hele fase bekijken ›
        </Button>
      </div>
    </section>
  )
}

// --- Blokken van een opbouw ----------------------------------------------------------

/** Open/dicht van een blok, onthouden per apparaat. */
function useInklap(sleutel: string, standaardOpen = true) {
  const k = `trainersapp:jaarplan:${sleutel}`
  const [open, setOpen] = useState(() => {
    try {
      const v = window.localStorage.getItem(k)
      if (v === '1' || v === '0') return v === '1'
    } catch {
      // geen opslag
    }
    return standaardOpen
  })
  const wissel = () =>
    setOpen((o) => {
      try {
        window.localStorage.setItem(k, o ? '0' : '1')
      } catch {
        // negeren
      }
      return !o
    })
  return [open, wissel] as const
}

function Blok({
  nr,
  titel,
  sub,
  actie,
  children,
  id,
}: {
  nr: string
  titel: string
  sub?: string
  actie?: ReactNode
  children: ReactNode
  id: string
}) {
  const [open, wissel] = useInklap(id)
  const inhoud = useId()
  return (
    <section aria-labelledby={id} className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id={id} className="m-0 min-w-0 flex-1">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={inhoud}
            onClick={wissel}
            className="flex min-h-11 w-full items-center gap-2 rounded-lg text-left text-lg font-extrabold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-extrabold"
              aria-hidden
            >
              {nr}
            </span>
            <span className="min-w-0 flex-1">
              {titel}
              {sub && (
                <span className="ml-2 text-sm font-medium text-muted-foreground">
                  {sub}
                </span>
              )}
            </span>
            <ChevronDown
              className={cn(
                'size-5 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none print:hidden',
                !open && '-rotate-90',
              )}
              aria-hidden
            />
          </button>
        </h3>
        {open && actie}
      </div>
      <div id={inhoud} className={cn(!open && 'hidden print:block')}>
        {children}
      </div>
    </section>
  )
}

function BewerkKnop({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <Button
      variant="outline"
      size="icon"
      className="size-10 print:hidden"
      aria-label={label}
      onClick={onClick}
    >
      <Pencil />
    </Button>
  )
}

function VerwijderKnop({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <Button
      variant="outline"
      size="icon"
      className="size-10 bg-card text-destructive hover:text-destructive print:hidden"
      aria-label={label}
      onClick={onClick}
    >
      <Trash2 />
    </Button>
  )
}

async function verwijderUitOpbouw(vraag: string, nieuw: Opbouw) {
  if (!window.confirm(vraag)) return
  await probeer(() => bewaarOpbouw(nieuw), 'Verwijderd')
}

function OpbouwBlokken({
  opbouw,
  plan,
  wedstrijden,
  magBewerken,
  onInstellingen,
  onFase,
}: {
  opbouw: Opbouw
  plan: Jaarplan
  wedstrijden: Wedstrijd[]
  magBewerken: boolean
  onInstellingen: () => void
  onFase: (f: Fase) => void
}) {
  const [inleiding, setInleiding] = useState(false)
  const [aandacht, setAandacht] = useState<Aandachtsgebied | null>(null)
  const [fase, setFase] = useState<Fase | null>(null)
  const bereik = opbouwBereik(opbouw)
  const doel = wedstrijden.find((w) => w.id === opbouw.doelWedstrijdId)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-foreground px-4 py-3 text-background sm:px-5">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-extrabold">{opbouw.naam}</h2>
          <p className="text-sm opacity-80">
            {bereik ? formatRange(bereik.van, bereik.tot) : 'Nog geen fases'}
            {doel &&
              ` · doelwedstrijd: ${doel.naam} (${formatShort(doel.datum)})`}
          </p>
        </div>
        {magBewerken && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onInstellingen}
            className="print:hidden"
          >
            <Settings2 /> Instellingen
          </Button>
        )}
      </div>

      <Blok
        nr="1"
        id="blok-inleiding"
        titel="Inleiding"
        actie={
          magBewerken && (
            <BewerkKnop
              label="Inleiding bewerken"
              onClick={() => setInleiding(true)}
            />
          )
        }
      >
        <div className="rounded-2xl border bg-card p-4 sm:p-5">
          {heeftTekst(opbouw.inleiding) ? (
            <RijkeTekst html={opbouw.inleiding} className="max-w-reading" />
          ) : (
            <p className="text-muted-foreground">Nog geen inleiding.</p>
          )}
        </div>
      </Blok>

      <Blok
        nr="2"
        id="blok-aandacht"
        titel="Aandachtsgebieden"
        actie={
          magBewerken && (
            <Button
              variant="outline"
              size="sm"
              className="print:hidden"
              onClick={() =>
                setAandacht({ id: nieuwId('a'), titel: '', tekst: '' })
              }
            >
              <Plus /> Aandachtsgebied
            </Button>
          )
        }
      >
        {opbouw.aandachtsgebieden.length === 0 ? (
          <p className="text-muted-foreground">Nog geen aandachtsgebieden.</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {opbouw.aandachtsgebieden.map((a) => (
              <article
                key={a.id}
                className="space-y-2 rounded-2xl border bg-card p-4"
              >
                <div className="flex items-start gap-2">
                  <h4 className="flex-1 font-extrabold leading-snug">
                    {a.titel}
                  </h4>
                  {magBewerken && (
                    <BewerkKnop
                      label={`${a.titel} bewerken`}
                      onClick={() => setAandacht(a)}
                    />
                  )}
                  {magBewerken && (
                    <VerwijderKnop
                      label={`${a.titel} verwijderen`}
                      onClick={() =>
                        verwijderUitOpbouw(
                          `Aandachtsgebied "${a.titel}" verwijderen?`,
                          {
                            ...opbouw,
                            aandachtsgebieden: opbouw.aandachtsgebieden.filter(
                              (x) => x.id !== a.id,
                            ),
                          },
                        )
                      }
                    />
                  )}
                </div>
                <RijkeTekst html={a.tekst} className="text-sm" />
              </article>
            ))}
          </div>
        )}
      </Blok>

      <Blok
        nr="3"
        id="blok-fases"
        titel="Fases"
        actie={
          magBewerken && (
            <Button
              variant="outline"
              size="sm"
              className="print:hidden"
              onClick={() => {
                const laatste = opbouw.fases[opbouw.fases.length - 1]
                const van = laatste ? addDays(laatste.tot, 1) : todayISO()
                setFase({
                  id: nieuwId('f'),
                  naam: '',
                  van,
                  tot: addDays(van, 27),
                  kleur:
                    FASE_KLEUREN[opbouw.fases.length % FASE_KLEUREN.length]
                      .waarde,
                  doel: '',
                  zones: [],
                  zonesToelichting: '',
                  techniek: '',
                  letOp: '',
                  sets: [],
                })
              }}
            >
              <Plus /> Fase
            </Button>
          )
        }
      >
        {opbouw.fases.length === 0 ? (
          <p className="text-muted-foreground">Nog geen fases.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {opbouw.fases.map((f, i) => (
              <div key={f.id} className="relative flex">
                {magBewerken && (
                  <span className="absolute top-4 right-2 z-10 flex gap-1">
                    <BewerkKnop
                      label={`Fase ${f.naam} bewerken`}
                      onClick={() => setFase(f)}
                    />
                    <VerwijderKnop
                      label={`Fase ${f.naam} verwijderen`}
                      onClick={() =>
                        verwijderUitOpbouw(`Fase "${f.naam}" verwijderen?`, {
                          ...opbouw,
                          fases: opbouw.fases.filter((x) => x.id !== f.id),
                        })
                      }
                    />
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onFase(f)}
                  className={cn(
                    'flex flex-1 flex-col overflow-hidden rounded-2xl border bg-card text-left outline-none hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    magBewerken && 'pt-12',
                  )}
                >
                  <span
                    className="h-2"
                    style={{ background: f.kleur }}
                    aria-hidden
                  />
                  <span className="flex flex-1 flex-col gap-1.5 p-4">
                    <span className="text-xs font-extrabold tracking-wider text-muted-foreground uppercase">
                      Fase {i + 1} ·{' '}
                      {Math.max(
                        1,
                        Math.round((daysBetween(f.van, f.tot) + 1) / 7),
                      )}{' '}
                      weken
                    </span>
                    <span className="font-extrabold leading-snug">
                      {f.naam}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatRange(f.van, f.tot)}
                    </span>
                    <span className="line-clamp-3 text-sm">
                      <RijkeTekst html={f.doel} />
                    </span>
                    <span className="mt-auto flex flex-wrap gap-1 pt-1">
                      {f.zones.map((id) => (
                        <ZoneChip
                          key={id}
                          zone={plan.zones.find((z) => z.id === id)}
                        />
                      ))}
                    </span>
                    <span className="text-sm font-bold text-primary">
                      {f.sets.length} voorbeeldsets ›
                    </span>
                  </span>
                </button>
              </div>
            ))}
          </div>
        )}
      </Blok>

      {inleiding && (
        <TekstDialog
          titel="Inleiding bewerken"
          waarde={opbouw.inleiding}
          onClose={() => setInleiding(false)}
          onBewaar={(tekst) => bewaarOpbouw({ ...opbouw, inleiding: tekst })}
        />
      )}
      {aandacht && (
        <AandachtDialog
          opbouw={opbouw}
          item={aandacht}
          onClose={() => setAandacht(null)}
        />
      )}
      {fase && (
        <FaseDialog
          opbouw={opbouw}
          fase={fase}
          zones={plan.zones}
          onClose={() => setFase(null)}
        />
      )}
    </div>
  )
}

function LegeOpbouw({
  magBewerken,
  magJaarplan,
}: {
  magBewerken: boolean
  magJaarplan: boolean
}) {
  const [bezig, setBezig] = useState(false)
  return (
    <div className="space-y-3 rounded-2xl border border-dashed p-6 text-center">
      <p className="font-bold">Er is nog geen trainingsopbouw.</p>
      {magBewerken ? (
        <>
          <p className="text-sm text-muted-foreground">
            Begin met een nieuwe opbouw, of laad de trainingsopbouw sept–dec
            2026 uit het Word-document in.
          </p>
          <Button
            disabled={bezig}
            onClick={async () => {
              setBezig(true)
              await probeer(
                () => bewaarOpbouw(OPBOUW_SEPT_DEC_2026),
                'Trainingsopbouw sept–dec 2026 ingeladen',
              )
              setBezig(false)
            }}
          >
            Trainingsopbouw sept–dec 2026 inladen
          </Button>
        </>
      ) : magJaarplan ? (
        <p className="text-sm text-muted-foreground">
          Zet "Jaarplan bewerken" aan om te beginnen.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          De trainer die het jaarplan maakt, vult dit in.
        </p>
      )}
    </div>
  )
}

// --- Zones ------------------------------------------------------------------------------

function ZonesBlok({
  zones,
  magBewerken,
}: {
  zones: Zone[]
  magBewerken: boolean
}) {
  const [bewerken, setBewerken] = useState(false)
  return (
    <Blok
      nr="Z"
      id="blok-zones"
      titel="Trainingszones"
      sub="naslag voor het hele seizoen"
      actie={
        magBewerken && (
          <BewerkKnop
            label="Trainingszones bewerken"
            onClick={() => setBewerken(true)}
          />
        )
      }
    >
      <ul className="grid gap-2 rounded-2xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
        {zones.map((z) => (
          <li
            key={z.id}
            className="flex gap-3 rounded-xl p-2.5"
            style={{ background: zacht(z.kleur) }}
          >
            <span
              className="mt-1 size-3.5 shrink-0 rounded-full"
              style={{ background: z.kleur }}
              aria-hidden
            />
            <span>
              <strong>
                {z.naam}{' '}
                {z.percentage && (
                  <span className="font-semibold text-muted-foreground">
                    {z.percentage}
                  </span>
                )}
              </strong>
              <span className="block text-sm">{z.omschrijving}</span>
            </span>
          </li>
        ))}
      </ul>
      {bewerken && (
        <ZonesDialog zones={zones} onClose={() => setBewerken(false)} />
      )}
    </Blok>
  )
}

function ZonesDialog({
  zones,
  onClose,
}: {
  zones: Zone[]
  onClose: () => void
}) {
  const [lijst, setLijst] = useState<Zone[]>(zones)
  const [bezig, setBezig] = useState(false)
  const zet = (i: number, w: Partial<Zone>) =>
    setLijst((l) => l.map((z, j) => (j === i ? { ...z, ...w } : z)))
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Trainingszones bewerken</DialogTitle>
          <DialogDescription>
            Fases verwijzen naar deze zones. Een zone verwijderen haalt hem ook
            uit de fases.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-3">
          {lijst.map((z, i) => (
            <li
              key={z.id}
              className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_7rem_auto]"
            >
              <div className="space-y-1">
                <Label htmlFor={`zn-${z.id}`}>Naam</Label>
                <Input
                  id={`zn-${z.id}`}
                  value={z.naam}
                  maxLength={40}
                  onChange={(e) => zet(i, { naam: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`zp-${z.id}`}>Percentage</Label>
                <Input
                  id={`zp-${z.id}`}
                  value={z.percentage}
                  maxLength={20}
                  onChange={(e) => zet(i, { percentage: e.target.value })}
                />
              </div>
              <div className="flex items-end gap-1">
                <KleurKiezer
                  waarde={z.kleur}
                  onChange={(k) => zet(i, { kleur: k })}
                  label={`Kleur ${z.naam}`}
                  extra={['#9fd3ec']}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`${z.naam || 'Zone'} verwijderen`}
                  onClick={() => setLijst((l) => l.filter((_, j) => j !== i))}
                >
                  <Trash2 />
                </Button>
              </div>
              <div className="space-y-1 sm:col-span-3">
                <Label htmlFor={`zo-${z.id}`}>Omschrijving</Label>
                <Input
                  id={`zo-${z.id}`}
                  value={z.omschrijving}
                  maxLength={200}
                  onChange={(e) => zet(i, { omschrijving: e.target.value })}
                />
              </div>
            </li>
          ))}
        </ul>
        <Button
          variant="outline"
          onClick={() =>
            setLijst((l) => [
              ...l,
              {
                id: nieuwId('z'),
                naam: '',
                kleur: '#41a8da',
                percentage: '',
                omschrijving: '',
              },
            ])
          }
        >
          <Plus /> Zone
        </Button>
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" onClick={onClose}>
            Annuleren
          </Button>
          <Button
            disabled={bezig || lijst.some((z) => !z.naam.trim())}
            onClick={async () => {
              setBezig(true)
              if (
                await probeer(
                  () =>
                    bewaarZones(
                      lijst.map((z) => ({ ...z, naam: z.naam.trim() })),
                    ),
                  'Zones opgeslagen',
                )
              )
                onClose()
              setBezig(false)
            }}
          >
            Opslaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function KleurKiezer({
  waarde,
  onChange,
  label,
  extra = [],
}: {
  waarde: string
  onChange: (k: string) => void
  label: string
  extra?: string[]
}) {
  const kleuren = [...extra, ...FASE_KLEUREN.map((k) => k.waarde)]
  return (
    <Select value={waarde} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="w-20">
        <span
          className="size-5 rounded-full"
          style={{ background: waarde }}
          aria-hidden
        />
      </SelectTrigger>
      <SelectContent>
        {kleuren.map((k) => (
          <SelectItem key={k} value={k}>
            <span className="inline-flex items-center gap-2">
              <span
                className="size-4 rounded-full"
                style={{ background: k }}
                aria-hidden
              />
              {FASE_KLEUREN.find((f) => f.waarde === k)?.naam ?? 'Lichtblauw'}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// --- Fase bekijken ------------------------------------------------------------------------

function FaseSheet({
  opbouw,
  fase,
  zones,
  magBewerken,
  onClose,
}: {
  opbouw: Opbouw
  fase: Fase
  zones: Zone[]
  magBewerken: boolean
  onClose: () => void
}) {
  const [bewerken, setBewerken] = useState(false)
  const nr = opbouw.fases.findIndex((f) => f.id === fase.id) + 1
  // Na bewerken de nieuwste versie tonen.
  const actueel =
    useAppData()
      .jaarplan.opbouwen.find((o) => o.id === opbouw.id)
      ?.fases.find((f) => f.id === fase.id) ?? fase
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-lg">
        <div
          className="space-y-1 p-5 pr-12 text-white"
          style={{ background: actueel.kleur }}
        >
          <SheetHeader className="p-0">
            <p className="text-xs font-extrabold tracking-[0.16em] uppercase">
              Fase {nr} van {opbouw.fases.length} · {opbouw.naam}
            </p>
            <SheetTitle className="text-2xl font-extrabold text-white">
              {actueel.naam}
            </SheetTitle>
            <SheetDescription className="font-semibold text-white/90">
              {formatRange(actueel.van, actueel.tot)}
            </SheetDescription>
          </SheetHeader>
          {magBewerken && (
            <Button
              size="sm"
              variant="secondary"
              className="mt-2"
              onClick={() => setBewerken(true)}
            >
              <Pencil /> Bewerken
            </Button>
          )}
        </div>
        <div className="space-y-4 p-5">
          <FaseOnderdeel titel="Doel" html={actueel.doel} />
          <section className="space-y-2 rounded-xl border p-4">
            <h3 className="text-xs font-extrabold tracking-wider text-muted-foreground uppercase">
              Trainingszones
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {actueel.zones.map((id) => (
                <ZoneChip key={id} zone={zones.find((z) => z.id === id)} />
              ))}
            </div>
            {actueel.zonesToelichting && (
              <p className="text-sm">{actueel.zonesToelichting}</p>
            )}
          </section>
          <FaseOnderdeel
            titel="Techniek, keerpunten & starts"
            html={actueel.techniek}
          />
          {heeftTekst(actueel.letOp) && (
            <section className="rounded-xl border border-nat-yellow bg-nat-yellow/20 p-4">
              <h3 className="mb-1 text-xs font-extrabold tracking-wider uppercase">
                Let op
              </h3>
              <RijkeTekst html={actueel.letOp} />
            </section>
          )}
          <section className="space-y-2">
            <h3 className="text-lg font-extrabold">Voorbeeldsets</h3>
            <p className="text-sm text-muted-foreground">
              Illustraties: geef er je eigen draai aan.
            </p>
            {actueel.sets.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nog geen voorbeeldsets.
              </p>
            )}
            <ol className="space-y-2">
              {actueel.sets.map((s, i) => (
                <li key={i} className="flex gap-3 rounded-xl border p-3">
                  <span
                    className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold"
                    style={{ background: zacht(actueel.kleur) }}
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <RijkeTekst html={s} className="text-sm" />
                </li>
              ))}
            </ol>
          </section>
        </div>
        {bewerken && (
          <FaseDialog
            opbouw={opbouw}
            fase={actueel}
            zones={zones}
            onClose={() => setBewerken(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

function FaseOnderdeel({ titel, html }: { titel: string; html: string }) {
  if (!heeftTekst(html)) return null
  return (
    <section className="rounded-xl border p-4">
      <h3 className="mb-1 text-xs font-extrabold tracking-wider text-muted-foreground uppercase">
        {titel}
      </h3>
      <RijkeTekst html={html} />
    </section>
  )
}

// --- Bewerken -----------------------------------------------------------------------------

function TekstDialog({
  titel,
  waarde,
  onClose,
  onBewaar,
}: {
  titel: string
  waarde: string
  onClose: () => void
  onBewaar: (html: string) => Promise<void>
}) {
  const [tekst, setTekst] = useState(waarde)
  const [bezig, setBezig] = useState(false)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{titel}</DialogTitle>
          <DialogDescription>
            Plakken uit Word houdt opsommingen, vet en kleuren vast.
          </DialogDescription>
        </DialogHeader>
        <RijkeTekstEditor
          id="tekst"
          label={titel}
          waarde={tekst}
          onChange={setTekst}
          minHoogte="min-h-56"
        />
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" onClick={onClose}>
            Annuleren
          </Button>
          <Button
            disabled={bezig}
            onClick={async () => {
              setBezig(true)
              if (await probeer(() => onBewaar(tekst), 'Opgeslagen')) onClose()
              setBezig(false)
            }}
          >
            Opslaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AandachtDialog({
  opbouw,
  item,
  onClose,
}: {
  opbouw: Opbouw
  item: Aandachtsgebied
  onClose: () => void
}) {
  const [titel, setTitel] = useState(item.titel)
  const [tekst, setTekst] = useState(item.tekst)
  const [bezig, setBezig] = useState(false)
  const bestaat = opbouw.aandachtsgebieden.some((a) => a.id === item.id)

  async function bewaar(e: FormEvent) {
    e.preventDefault()
    setBezig(true)
    const nieuw = { ...item, titel: titel.trim(), tekst }
    const lijst = bestaat
      ? opbouw.aandachtsgebieden.map((a) => (a.id === item.id ? nieuw : a))
      : [...opbouw.aandachtsgebieden, nieuw]
    if (
      await probeer(
        () => bewaarOpbouw({ ...opbouw, aandachtsgebieden: lijst }),
        'Aandachtsgebied opgeslagen',
      )
    )
      onClose()
    setBezig(false)
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={bewaar} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {bestaat ? 'Aandachtsgebied bewerken' : 'Nieuw aandachtsgebied'}
            </DialogTitle>
            <DialogDescription>
              Bijv. een rode draad door het seizoen of hoe je differentieert
              naar niveau.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="ag-titel">Titel</Label>
            <Input
              id="ag-titel"
              value={titel}
              maxLength={120}
              required
              onChange={(e) => setTitel(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ag-tekst">Tekst</Label>
            <RijkeTekstEditor
              id="ag-tekst"
              label="Tekst aandachtsgebied"
              waarde={tekst}
              onChange={setTekst}
              minHoogte="min-h-48"
            />
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            {bestaat ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive"
                onClick={async () => {
                  if (!window.confirm(`"${item.titel}" verwijderen?`)) return
                  if (
                    await probeer(
                      () =>
                        bewaarOpbouw({
                          ...opbouw,
                          aandachtsgebieden: opbouw.aandachtsgebieden.filter(
                            (a) => a.id !== item.id,
                          ),
                        }),
                      'Verwijderd',
                    )
                  )
                    onClose()
                }}
              >
                <Trash2 /> Verwijderen
              </Button>
            ) : (
              <span />
            )}
            <span className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={onClose}>
                Annuleren
              </Button>
              <Button type="submit" disabled={bezig || !titel.trim()}>
                Opslaan
              </Button>
            </span>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FaseDialog({
  opbouw,
  fase,
  zones,
  onClose,
}: {
  opbouw: Opbouw
  fase: Fase
  zones: Zone[]
  onClose: () => void
}) {
  const [f, setF] = useState<Fase>(fase)
  // Sleutels voor de voorbeeldsets, zodat editors bij verwijderen niet verspringen.
  const [setSleutels, setSetSleutels] = useState(() =>
    fase.sets.map(() => nieuwId('s')),
  )
  const [bezig, setBezig] = useState(false)
  const bestaat = opbouw.fases.some((x) => x.id === fase.id)
  const zet = (w: Partial<Fase>) => setF((x) => ({ ...x, ...w }))
  const fout = !f.naam.trim()
    ? 'Geef de fase een naam.'
    : f.van > f.tot
      ? 'De einddatum ligt vóór de begindatum.'
      : ''

  async function bewaar(e: FormEvent) {
    e.preventDefault()
    if (fout) return
    setBezig(true)
    const nieuw = { ...f, naam: f.naam.trim(), sets: f.sets.filter(heeftTekst) }
    const fases = bestaat
      ? opbouw.fases.map((x) => (x.id === f.id ? nieuw : x))
      : [...opbouw.fases, nieuw]
    if (
      await probeer(
        () =>
          bewaarOpbouw({
            ...opbouw,
            fases: fases.sort((a, b) => a.van.localeCompare(b.van)),
          }),
        'Fase opgeslagen',
      )
    )
      onClose()
    setBezig(false)
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={bewaar} className="space-y-5">
          <DialogHeader>
            <DialogTitle>
              {bestaat ? 'Fase bewerken' : 'Nieuwe fase'}
            </DialogTitle>
            <DialogDescription>{opbouw.naam}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="space-y-1.5">
              <Label htmlFor="f-naam">Naam van de fase</Label>
              <Input
                id="f-naam"
                value={f.naam}
                maxLength={80}
                onChange={(e) => zet({ naam: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label id="f-kleur-label">Kleur</Label>
              <KleurKiezer
                waarde={f.kleur}
                onChange={(k) => zet({ kleur: k })}
                label="Kleur op de tijdlijn"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="f-van">Van</Label>
              <Input
                id="f-van"
                type="date"
                value={f.van}
                onChange={(e) => zet({ van: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-tot">Tot en met</Label>
              <Input
                id="f-tot"
                type="date"
                value={f.tot}
                onChange={(e) => zet({ tot: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-doel">Doel</Label>
            <RijkeTekstEditor
              id="f-doel"
              label="Doel"
              waarde={f.doel}
              onChange={(doel) => zet({ doel })}
            />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Trainingszones</legend>
            <div className="flex flex-wrap gap-1.5">
              {zones.map((z) => {
                const aan = f.zones.includes(z.id)
                return (
                  <button
                    key={z.id}
                    type="button"
                    aria-pressed={aan}
                    onClick={() =>
                      zet({
                        zones: aan
                          ? f.zones.filter((x) => x !== z.id)
                          : [...f.zones, z.id],
                      })
                    }
                    className={cn(
                      'inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-sm font-bold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                      aan
                        ? 'border-foreground bg-foreground text-background'
                        : 'bg-background',
                    )}
                  >
                    <span
                      className="size-2.5 rounded-full"
                      style={{ background: z.kleur }}
                      aria-hidden
                    />
                    {z.naam}
                  </button>
                )
              })}
            </div>
            <Label
              htmlFor="f-zt"
              className="pt-1 text-xs text-muted-foreground"
            >
              Toelichting (optioneel)
            </Label>
            <Input
              id="f-zt"
              value={f.zonesToelichting}
              maxLength={300}
              onChange={(e) => zet({ zonesToelichting: e.target.value })}
            />
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor="f-tech">Techniek, keerpunten &amp; starts</Label>
            <RijkeTekstEditor
              id="f-tech"
              label="Techniek, keerpunten en starts"
              waarde={f.techniek}
              onChange={(techniek) => zet({ techniek })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-letop">Let op (optioneel)</Label>
            <RijkeTekstEditor
              id="f-letop"
              label="Let op"
              waarde={f.letOp}
              onChange={(letOp) => zet({ letOp })}
              minHoogte="min-h-16"
            />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Voorbeeldsets</legend>
            {f.sets.map((s, i) => (
              <div key={setSleutels[i]} className="flex items-start gap-2">
                <span
                  className="mt-12 w-5 text-sm font-extrabold text-muted-foreground"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <RijkeTekstEditor
                    id={`set-${setSleutels[i]}`}
                    label={`Voorbeeldset ${i + 1}`}
                    waarde={s}
                    minHoogte="min-h-14"
                    onChange={(html) =>
                      zet({ sets: f.sets.map((x, j) => (j === i ? html : x)) })
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mt-10"
                  aria-label={`Voorbeeldset ${i + 1} verwijderen`}
                  onClick={() => {
                    zet({ sets: f.sets.filter((_, j) => j !== i) })
                    setSetSleutels((k) => k.filter((_, j) => j !== i))
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                zet({ sets: [...f.sets, ''] })
                setSetSleutels((k) => [...k, nieuwId('s')])
              }}
            >
              <Plus /> Voorbeeldset
            </Button>
          </fieldset>
          {fout && <p className="text-sm text-destructive">{fout}</p>}
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            {bestaat ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive"
                onClick={async () => {
                  if (!window.confirm(`Fase "${fase.naam}" verwijderen?`))
                    return
                  if (
                    await probeer(
                      () =>
                        bewaarOpbouw({
                          ...opbouw,
                          fases: opbouw.fases.filter((x) => x.id !== fase.id),
                        }),
                      'Fase verwijderd',
                    )
                  )
                    onClose()
                }}
              >
                <Trash2 /> Verwijderen
              </Button>
            ) : (
              <span />
            )}
            <span className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={onClose}>
                Annuleren
              </Button>
              <Button type="submit" disabled={bezig || !!fout}>
                Opslaan
              </Button>
            </span>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function OpbouwDialog({
  opbouw,
  nieuw,
  wedstrijden,
  onKlaar,
}: {
  opbouw: Opbouw
  nieuw: boolean
  wedstrijden: Wedstrijd[]
  onKlaar: (id?: string) => void
}) {
  const [naam, setNaam] = useState(opbouw.naam)
  const [doel, setDoel] = useState(opbouw.doelWedstrijdId ?? 'geen')
  const [bezig, setBezig] = useState(false)
  return (
    <Dialog open onOpenChange={(o) => !o && onKlaar()}>
      <DialogContent>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault()
            setBezig(true)
            const ok = await probeer(
              () =>
                bewaarOpbouw({
                  ...opbouw,
                  naam: naam.trim(),
                  doelWedstrijdId: doel === 'geen' ? null : doel,
                }),
              nieuw ? 'Opbouw aangemaakt' : 'Opgeslagen',
            )
            setBezig(false)
            if (ok) onKlaar(opbouw.id)
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {nieuw ? 'Nieuwe opbouw' : 'Opbouw instellen'}
            </DialogTitle>
            <DialogDescription>
              Een opbouw werkt toe naar een doelwedstrijd, bijv. sept–dec naar
              Frankfurt of na het kerstreces naar de EuroGames. Begin en eind
              volgen uit de fases.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="o-naam">Naam</Label>
            <Input
              id="o-naam"
              value={naam}
              maxLength={60}
              required
              placeholder="Bijv. Jan–jul 2027 · naar Cardiff"
              onChange={(e) => setNaam(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="o-doel">Doelwedstrijd</Label>
            <Select value={doel} onValueChange={setDoel}>
              <SelectTrigger id="o-doel" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="geen">Geen</SelectItem>
                {wedstrijden.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.naam} · {formatShort(w.datum)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {wedstrijden.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Voeg eerst wedstrijden toe via de knop Wedstrijden.
              </p>
            )}
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            {!nieuw ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive"
                onClick={async () => {
                  if (
                    !window.confirm(
                      `Opbouw "${opbouw.naam}" met alle fases verwijderen?`,
                    )
                  )
                    return
                  if (
                    await probeer(
                      () => verwijderOpbouw(opbouw.id),
                      'Opbouw verwijderd',
                    )
                  )
                    onKlaar()
                }}
              >
                <Trash2 /> Verwijderen
              </Button>
            ) : (
              <span />
            )}
            <span className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => onKlaar()}>
                Annuleren
              </Button>
              <Button type="submit" disabled={bezig || !naam.trim()}>
                Opslaan
              </Button>
            </span>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PubliceerDialog({
  open,
  onOpenChange,
  plan,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  plan: Jaarplan
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Jaarplan publiceren?</DialogTitle>
          <DialogDescription>
            Alle trainers zien dan versie {plan.versie + 1} als de geldende
            versie. Daarna kun je verder bewerken; het plan staat dan weer op
            concept tot je opnieuw publiceert.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button
            onClick={() => {
              publiceerJaarplan(todayISO())
              toast.success('Jaarplan gepubliceerd')
              onOpenChange(false)
            }}
          >
            <Megaphone /> Publiceren
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
