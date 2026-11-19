// Fix: fix-21 — wedstrijden apart invoeren (coördinator, jaarplan-beheer, wedstrijdcoördinator)
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Flag, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/app-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Textarea } from '@/components/ui/textarea'
import { magWedstrijdenBewerken, type Wedstrijd } from '@/data/fixtures'
import { bewaarWedstrijd, trainerById, useAppData, verwijderWedstrijd } from '@/data/store'
import { daysBetween, formatRange, formatShort, todayISO } from '@/lib/dates'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/wedstrijden')({
  head: () => ({ meta: [{ title: 'Wedstrijden · NatUtrecht Trainersapp' }] }),
  component: WedstrijdenPagina,
})

const MAAND = ['JAN', 'FEB', 'MRT', 'APR', 'MEI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEC']

const LEEG: Wedstrijd = { id: '', naam: '', datum: '', plaats: '', baan: '', onderVoorbehoud: false, doel: false, notitie: '' }

function WedstrijdenPagina() {
  const data = useAppData()
  const magBewerken = magWedstrijdenBewerken(trainerById(data.huidigeTrainerId))
  const vandaag = todayISO()
  const [bewerk, setBewerk] = useState<Wedstrijd | null>(null)
  const komend = data.wedstrijden.filter((w) => (w.einddatum ?? w.datum) >= vandaag)
  const geweest = data.wedstrijden.filter((w) => (w.einddatum ?? w.datum) < vandaag).reverse()
  // Wedstrijden uit het seizoensoverzicht (vóór fix-21) die nog niet in de lijst staan.
  const oud = data.jaarplan.evenementen.filter(
    (e) => (e.type === 'Wedstrijd' || e.type === 'Kampioenschap') && !data.wedstrijden.some((w) => w.naam === e.naam && w.datum === e.datum),
  )
  const [bezig, setBezig] = useState(false)

  return (
    <>
      <PageHeader
        eyebrow="Jaarplan"
        title="Wedstrijden"
        description={<p>Alle wedstrijden van het seizoen. Ze staan als vlaggetje op de tijdlijn van de trainingsopbouw.</p>}
        actions={
          <>
            <Button asChild variant="secondary">
              <Link to="/jaarplan">
                <ArrowLeft /> Jaarplan
              </Link>
            </Button>
            {magBewerken && (
              <Button onClick={() => setBewerk(LEEG)}>
                <Plus /> Wedstrijd
              </Button>
            )}
          </>
        }
      />
      <div className="mx-auto max-w-content space-y-8 px-4 py-8 sm:px-6">
        {magBewerken && oud.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-muted/50 p-4 text-sm">
            <p className="flex-1">
              In het seizoensoverzicht staan nog {oud.length} {oud.length === 1 ? 'wedstrijd' : 'wedstrijden'} die hier niet in de
              lijst staan.
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={bezig}
              onClick={async () => {
                setBezig(true)
                try {
                  for (const e of oud) {
                    await bewaarWedstrijd({
                      ...LEEG,
                      naam: e.naam,
                      datum: e.datum,
                      einddatum: e.einddatum,
                      onderVoorbehoud: !e.bevestigd,
                    })
                  }
                  toast.success(`${oud.length} wedstrijden overgenomen`)
                } catch (err) {
                  console.error(err)
                  toast.error('Overnemen lukte niet')
                } finally {
                  setBezig(false)
                }
              }}
            >
              Overnemen
            </Button>
          </div>
        )}

        <Lijst titel="Komend" lijst={komend} vandaag={vandaag} magBewerken={magBewerken} onBewerk={setBewerk} leeg="Nog geen wedstrijden gepland." />
        {geweest.length > 0 && (
          <Lijst titel="Geweest" lijst={geweest} vandaag={vandaag} magBewerken={magBewerken} onBewerk={setBewerk} />
        )}
        {!magBewerken && (
          <p className="text-sm text-muted-foreground">
            Wedstrijden worden ingevoerd door de coördinator, de jaarplanbeheerder of de wedstrijdcoördinator.
          </p>
        )}
      </div>
      {bewerk && <WedstrijdDialog wedstrijd={bewerk} onClose={() => setBewerk(null)} />}
    </>
  )
}

function Lijst({
  titel,
  lijst,
  vandaag,
  magBewerken,
  onBewerk,
  leeg,
}: {
  titel: string
  lijst: Wedstrijd[]
  vandaag: string
  magBewerken: boolean
  onBewerk: (w: Wedstrijd) => void
  leeg?: string
}) {
  return (
    <section aria-labelledby={`lijst-${titel}`} className="space-y-3">
      <h2 id={`lijst-${titel}`} className="text-lg font-extrabold">
        {titel}
      </h2>
      {lijst.length === 0 && leeg && <p className="text-muted-foreground">{leeg}</p>}
      <ul className="grid gap-3 md:grid-cols-2">
        {lijst.map((w) => (
          <li key={w.id} className="flex gap-3 rounded-2xl border bg-card p-3">
            <span
              className={cn(
                'flex w-14 shrink-0 flex-col items-center justify-center rounded-xl py-2',
                w.doel ? 'bg-primary text-primary-foreground' : 'bg-muted',
              )}
            >
              <span className="text-xl font-extrabold leading-none">{Number(w.datum.slice(8, 10))}</span>
              <span className="text-[11px] font-bold">{MAAND[Number(w.datum.slice(5, 7)) - 1]}</span>
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <strong className="leading-snug">{w.naam}</strong>
              <span className="text-sm text-muted-foreground">
                {w.einddatum ? formatRange(w.datum, w.einddatum) : formatShort(w.datum)}
                {w.plaats && ` · ${w.plaats}`}
                {w.baan && ` · ${w.baan} m`}
                {w.datum >= vandaag && ` · over ${daysBetween(vandaag, w.datum)} dagen`}
              </span>
              <span className="flex flex-wrap gap-1.5">
                {w.doel && <Badge>Doelwedstrijd</Badge>}
                <Badge variant={w.onderVoorbehoud ? 'outline' : 'secondary'}>{w.onderVoorbehoud ? 'Onder voorbehoud' : 'Bevestigd'}</Badge>
                {w.inschrijvenVoor && w.inschrijvenVoor >= vandaag && (
                  <Badge variant="outline">Inschrijven vóór {formatShort(w.inschrijvenVoor)}</Badge>
                )}
              </span>
              {w.notitie && <span className="text-sm whitespace-pre-wrap">{w.notitie}</span>}
            </span>
            {magBewerken && (
              <Button variant="ghost" size="icon" aria-label={`${w.naam} bewerken`} onClick={() => onBewerk(w)}>
                <Pencil />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function WedstrijdDialog({ wedstrijd, onClose }: { wedstrijd: Wedstrijd; onClose: () => void }) {
  const [w, setW] = useState<Wedstrijd>(wedstrijd)
  const [bezig, setBezig] = useState(false)
  const zet = (x: Partial<Wedstrijd>) => setW((o) => ({ ...o, ...x }))
  const fout = w.einddatum && w.datum && w.einddatum < w.datum ? 'De einddatum ligt vóór de begindatum.' : ''

  async function bewaar(e: FormEvent) {
    e.preventDefault()
    if (fout) return
    setBezig(true)
    try {
      await bewaarWedstrijd({
        ...w,
        naam: w.naam.trim(),
        plaats: w.plaats.trim(),
        notitie: w.notitie.trim(),
        einddatum: w.einddatum || undefined,
        inschrijvenVoor: w.inschrijvenVoor || undefined,
      })
      toast.success('Wedstrijd opgeslagen')
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Opslaan lukte niet. Probeer het opnieuw.')
    } finally {
      setBezig(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto">
        <form onSubmit={bewaar} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{wedstrijd.id ? 'Wedstrijd bewerken' : 'Wedstrijd toevoegen'}</DialogTitle>
            <DialogDescription>Komt als vlaggetje op de tijdlijn van het jaarplan.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="w-naam">Naam</Label>
            <Input id="w-naam" required maxLength={120} value={w.naam} onChange={(e) => zet({ naam: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="w-datum">Datum</Label>
              <Input id="w-datum" type="date" required value={w.datum} onChange={(e) => zet({ datum: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-eind">Tot en met (meerdaags)</Label>
              <Input id="w-eind" type="date" value={w.einddatum ?? ''} onChange={(e) => zet({ einddatum: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="w-plaats">Plaats / zwembad</Label>
              <Input id="w-plaats" maxLength={120} value={w.plaats} onChange={(e) => zet({ plaats: e.target.value })} />
            </div>
            <fieldset className="space-y-1.5">
              <legend className="mb-1.5 text-sm font-medium">Baan</legend>
              <div className="flex gap-1">
                {(['25', '50'] as const).map((b) => (
                  <Button
                    key={b}
                    type="button"
                    aria-pressed={w.baan === b}
                    variant={w.baan === b ? 'default' : 'outline'}
                    onClick={() => zet({ baan: w.baan === b ? '' : b })}
                  >
                    {b} m
                  </Button>
                ))}
              </div>
            </fieldset>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="w-inschr">Inschrijven vóór (optioneel)</Label>
            <Input id="w-inschr" type="date" value={w.inschrijvenVoor ?? ''} onChange={(e) => zet({ inschrijvenVoor: e.target.value })} />
          </div>
          <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
            <Checkbox checked={w.onderVoorbehoud} onCheckedChange={(v) => zet({ onderVoorbehoud: v === true })} />
            Nog onder voorbehoud
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
            <Checkbox checked={w.doel} onCheckedChange={(v) => zet({ doel: v === true })} />
            <span>
              Doelwedstrijd <span className="text-muted-foreground">(een opbouw werkt hiernaartoe)</span>
            </span>
          </label>
          <div className="space-y-1.5">
            <Label htmlFor="w-notitie">Notitie (optioneel)</Label>
            <Textarea id="w-notitie" rows={2} maxLength={1000} value={w.notitie} onChange={(e) => zet({ notitie: e.target.value })} />
          </div>
          {fout && <p className="text-sm text-destructive">{fout}</p>}
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            {wedstrijd.id ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive"
                onClick={async () => {
                  if (!window.confirm(`"${wedstrijd.naam}" verwijderen?`)) return
                  try {
                    await verwijderWedstrijd(wedstrijd.id)
                    toast.success('Wedstrijd verwijderd')
                    onClose()
                  } catch {
                    toast.error('Verwijderen lukte niet')
                  }
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
              <Button type="submit" disabled={bezig || !w.naam.trim() || !w.datum || !!fout}>
                <Flag /> Opslaan
              </Button>
            </span>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
