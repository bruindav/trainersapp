import { createFileRoute } from '@tanstack/react-router'
import { CalendarCheck2, Flag, Lock, Megaphone, PartyPopper, Pencil, Printer, Trophy } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/app-shell'
import { TrainerChip } from '@/components/trainer-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { TRAINERS, type Evenement, type Periode } from '@/data/fixtures'
import { huidigePeriode, publiceerJaarplan, trainerById, useAppData, werkPeriodeBij } from '@/data/store'
import { daysBetween, formatLong, formatMonth, formatRange, formatShort, todayISO } from '@/lib/dates'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/jaarplan')({
  head: () => ({ meta: [{ title: 'Jaarplan · NatUtrecht Trainersapp' }] }),
  component: JaarplanPagina,
})

const INTENSITEIT = ['', 'Rustig', 'Licht', 'Gemiddeld', 'Zwaar', 'Piek']

const EVENT_ICON: Record<Evenement['type'], typeof Trophy> = {
  Wedstrijd: Flag,
  Kampioenschap: Trophy,
  Club: PartyPopper,
  Reces: CalendarCheck2,
}

function JaarplanPagina() {
  const data = useAppData()
  const plan = data.jaarplan
  const vandaag = todayISO()
  const ik = trainerById(data.huidigeTrainerId)!
  const magBewerken = ik.rol === 'Hoofdtrainer'
  const nu = huidigePeriode(data, vandaag)
  const [bewerk, setBewerk] = useState<Periode | null>(null)
  const [publiceren, setPubliceren] = useState(false)
  const gepubliceerdDoor = trainerById(plan.gepubliceerdDoor)

  return (
    <>
      <PageHeader
        eyebrow={`Seizoen ${plan.seizoen}`}
        title="Jaarplan"
        description={
          <p>
            Van opstart in september naar de EuroGames in Cardiff (14–17 juli 2027). Elke periode heeft een doel en
            accenten waar alle trainers in hun trainingen op aansluiten.
          </p>
        }
        actions={
          <>
            <Button variant="outline" className="border-white/30 bg-white/5 text-white hover:bg-white/15 hover:text-white" onClick={() => window.print()}>
              <Printer /> Afdrukken
            </Button>
            {magBewerken && (
              <Button onClick={() => setPubliceren(true)} disabled={plan.status === 'gepubliceerd'}>
                <Megaphone /> {plan.status === 'gepubliceerd' ? 'Gepubliceerd' : 'Publiceren'}
              </Button>
            )}
          </>
        }
      />

      <div className="mx-auto max-w-content space-y-8 px-4 py-8 sm:px-6">
        {/* Status */}
        <div
          role="status"
          className={cn(
            'flex flex-col gap-3 rounded-xl border p-4 text-sm sm:flex-row sm:items-center',
            plan.status === 'concept' ? 'border-nat-yellow bg-nat-yellow/15' : 'bg-card',
          )}
        >
          <Badge className={plan.status === 'concept' ? 'bg-nat-yellow text-nat-ink' : ''}>
            {plan.status === 'concept' ? 'Concept' : `Gepubliceerd · versie ${plan.versie}`}
          </Badge>
          {plan.status === 'concept' ? (
            <p>
              Er zijn wijzigingen die nog niet gepubliceerd zijn. Andere trainers zien versie {plan.versie} tot je
              publiceert.
            </p>
          ) : (
            <p className="flex flex-wrap items-center gap-x-2">
              Zichtbaar voor alle trainers. Gepubliceerd op {plan.gepubliceerdOp ? formatLong(plan.gepubliceerdOp) : '—'} door{' '}
              {gepubliceerdDoor && <TrainerChip trainer={gepubliceerdDoor} />}
            </p>
          )}
          {!magBewerken && (
            <p className="flex items-center gap-1.5 text-muted-foreground sm:ml-auto">
              <Lock className="size-3.5" aria-hidden /> Alleen de hoofdtrainer past het jaarplan aan
            </p>
          )}
        </div>

        <Tijdlijn periodes={plan.periodes} evenementen={plan.evenementen} van={plan.van} tot={plan.tot} vandaag={vandaag} />

        <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
          {/* Periodes */}
          <section aria-labelledby="periodes-titel" className="space-y-4">
            <h2 id="periodes-titel" className="text-2xl font-black tracking-tight">
              Periodes
            </h2>
            {plan.periodes.map((p) => {
              const weken = Math.max(1, Math.round((daysBetween(p.van, p.tot) + 1) / 7))
              const actief = nu?.id === p.id
              return (
                <article
                  key={p.id}
                  className={cn('relative overflow-hidden rounded-xl border bg-card p-5 pl-7', actief && 'ring-2 ring-primary')}
                >
                  <span className="absolute inset-y-0 left-0 w-2" style={{ backgroundColor: p.kleur }} aria-hidden />
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-extrabold">{p.naam}</h3>
                        {actief && <Badge>Nu bezig</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatRange(p.van, p.tot)} · {weken} {weken === 1 ? 'week' : 'weken'}
                      </p>
                    </div>
                    {magBewerken && (
                      <Button variant="ghost" size="sm" onClick={() => setBewerk(p)} aria-label={`Bewerk ${p.naam}`}>
                        <Pencil /> Bewerken
                      </Button>
                    )}
                  </div>
                  <p className="mt-3">{p.doel}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
                    <div className="flex flex-wrap gap-1.5">
                      {p.accenten.map((a) => (
                        <Badge key={a} variant="secondary">
                          {a}
                        </Badge>
                      ))}
                    </div>
                    <span className="text-muted-foreground">
                      <span className="font-semibold text-foreground">{p.metersPerTraining}</span> per training
                    </span>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span className="flex gap-0.5" aria-hidden>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <span
                            key={i}
                            className="h-3 w-1.5 rounded-sm"
                            style={{ backgroundColor: i <= p.intensiteit ? p.kleur : 'var(--border)' }}
                          />
                        ))}
                      </span>
                      Belasting: {INTENSITEIT[p.intensiteit]}
                    </span>
                  </div>
                </article>
              )
            })}
          </section>

          {/* Evenementen */}
          <aside aria-labelledby="agenda-titel">
            <Card className="lg:sticky lg:top-24">
              <CardHeader>
                <CardTitle id="agenda-titel" className="text-lg font-extrabold">
                  Wedstrijden &amp; evenementen
                </CardTitle>
                <CardDescription>Ankerpunten waar het plan naartoe werkt.</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="relative space-y-5 border-l-2 border-border pl-5">
                  {plan.evenementen.map((e) => {
                    const Icon = EVENT_ICON[e.type]
                    const voorbij = (e.einddatum ?? e.datum) < vandaag
                    return (
                      <li key={e.id} className={cn('relative', voorbij && 'opacity-50')}>
                        <span
                          className={cn(
                            'absolute top-0.5 -left-[31px] flex size-5 items-center justify-center rounded-full ring-4 ring-card',
                            e.type === 'Kampioenschap' ? 'bg-primary text-white' : 'bg-nat-ink text-white',
                          )}
                          aria-hidden
                        >
                          <Icon className="size-3" />
                        </span>
                        <p className="text-sm font-bold leading-snug">{e.naam}</p>
                        <p className="text-xs text-muted-foreground">
                          {e.einddatum ? formatRange(e.datum, e.einddatum) : formatShort(e.datum)} · {e.type}
                          {!e.bevestigd && ' · datum onder voorbehoud'}
                        </p>
                      </li>
                    )
                  })}
                </ol>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>

      <PeriodeDialog periode={bewerk} onClose={() => setBewerk(null)} />

      <Dialog open={publiceren} onOpenChange={setPubliceren}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Jaarplan publiceren?</DialogTitle>
            <DialogDescription>
              Versie {plan.versie + 1} wordt zichtbaar voor alle {TRAINERS.length} trainers en vervangt de huidige
              versie in hun overzicht.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Annuleren</Button>
            </DialogClose>
            <Button
              onClick={() => {
                publiceerJaarplan(vandaag)
                setPubliceren(false)
                toast.success('Jaarplan gepubliceerd', { description: `Versie ${plan.versie + 1} staat live voor alle trainers.` })
              }}
            >
              <Megaphone /> Publiceren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Tijdlijn({
  periodes,
  evenementen,
  van,
  tot,
  vandaag,
}: {
  periodes: Periode[]
  evenementen: Evenement[]
  van: string
  tot: string
  vandaag: string
}) {
  const totaal = daysBetween(van, tot) + 1
  const pos = (d: string) => `${(Math.min(Math.max(daysBetween(van, d), 0), totaal) / totaal) * 100}%`
  const maanden: string[] = []
  for (let d = van.slice(0, 8) + '01'; d <= tot; ) {
    if (d >= van) maanden.push(d)
    const [y, m] = d.split('-').map(Number)
    d = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
  }
  const inSeizoen = vandaag >= van && vandaag <= tot

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-extrabold">Seizoensoverzicht</CardTitle>
        <CardDescription>Hoogte van elk blok = geplande belasting.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto pb-2">
          <div className="relative min-w-[760px]">
            {/* Evenementen */}
            <div className="relative mb-2 h-7">
              {evenementen.map((e) => (
                <span
                  key={e.id}
                  className="absolute top-1 -translate-x-1/2"
                  style={{ left: pos(e.datum) }}
                  title={`${e.naam} · ${formatShort(e.datum)}`}
                >
                  <span
                    className={cn(
                      'block size-3 rotate-45 rounded-[2px]',
                      e.type === 'Kampioenschap' ? 'size-4 bg-primary' : 'bg-nat-ink/70',
                    )}
                  />
                  <span className="sr-only">
                    {e.naam}, {formatShort(e.datum)}
                  </span>
                </span>
              ))}
            </div>
            {/* Blokken */}
            <div className="relative flex h-36 items-end gap-0.5 border-b-2 border-nat-ink/80">
              {periodes.map((p) => {
                const breedte = ((daysBetween(p.van, p.tot) + 1) / totaal) * 100
                return (
                  <div
                    key={p.id}
                    className="group relative flex flex-col justify-end overflow-hidden rounded-t-md px-1.5 pb-1.5 text-[11px] leading-tight font-bold"
                    style={{
                      width: `${breedte}%`,
                      height: `${20 + p.intensiteit * 16}%`,
                      backgroundColor: p.kleur,
                      color: p.kleur === '#ffce00' || p.kleur === '#bdb2b2' || p.kleur === '#8cbb15' ? '#2b2222' : '#fff',
                    }}
                    title={`${p.naam}: ${formatRange(p.van, p.tot)}`}
                  >
                    <span className="line-clamp-3 break-words">{p.naam}</span>
                  </div>
                )
              })}
              {inSeizoen && (
                <div className="pointer-events-none absolute inset-y-0 -mt-9" style={{ left: pos(vandaag) }}>
                  <div className="h-full w-0.5 bg-primary" />
                  <span className="absolute -top-1 left-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold whitespace-nowrap text-white">
                    Vandaag
                  </span>
                </div>
              )}
            </div>
            {/* Maanden */}
            <div className="relative mt-2 h-5 text-xs font-semibold text-muted-foreground uppercase">
              {maanden.map((m) => (
                <span key={m} className="absolute" style={{ left: pos(m) }}>
                  {formatMonth(m).replace('.', '')}
                </span>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PeriodeDialog({ periode, onClose }: { periode: Periode | null; onClose: () => void }) {
  return (
    <Dialog open={!!periode} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {periode && <PeriodeForm key={periode.id} periode={periode} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function PeriodeForm({ periode, onClose }: { periode: Periode; onClose: () => void }) {
  const [form, setForm] = useState({ ...periode, accentenTekst: periode.accenten.join(', ') })
  const fout = form.tot < form.van ? 'De einddatum ligt vóór de startdatum.' : !form.naam.trim() ? 'Geef de periode een naam.' : ''

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (fout) return
        const { accentenTekst, ...rest } = form
        werkPeriodeBij({
          ...rest,
          naam: rest.naam.trim(),
          accenten: accentenTekst.split(',').map((a) => a.trim()).filter(Boolean),
        })
        toast.success('Periode bijgewerkt', { description: 'Publiceer het jaarplan om de wijziging te delen.' })
        onClose()
      }}
    >
      <DialogHeader>
        <DialogTitle>Periode bewerken</DialogTitle>
        <DialogDescription>Wijzigingen blijven concept tot je het jaarplan publiceert.</DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        <Label htmlFor="p-naam">Naam</Label>
        <Input id="p-naam" value={form.naam} onChange={(e) => setForm({ ...form, naam: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="p-van">Van</Label>
          <Input id="p-van" type="date" value={form.van} onChange={(e) => setForm({ ...form, van: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="p-tot">Tot en met</Label>
          <Input
            id="p-tot"
            type="date"
            value={form.tot}
            min={form.van}
            onChange={(e) => setForm({ ...form, tot: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="p-doel">Doel</Label>
        <Textarea id="p-doel" rows={3} value={form.doel} onChange={(e) => setForm({ ...form, doel: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="p-acc">Accenten (komma-gescheiden)</Label>
        <Input id="p-acc" value={form.accentenTekst} onChange={(e) => setForm({ ...form, accentenTekst: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="p-m">Meters per training</Label>
          <Input
            id="p-m"
            value={form.metersPerTraining}
            onChange={(e) => setForm({ ...form, metersPerTraining: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="p-int">Belasting</Label>
          <Select value={String(form.intensiteit)} onValueChange={(v) => setForm({ ...form, intensiteit: Number(v) })}>
            <SelectTrigger id="p-int" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map((i) => (
                <SelectItem key={i} value={String(i)}>
                  {i} · {INTENSITEIT[i]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {fout && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {fout}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Annuleren
        </Button>
        <Button type="submit" disabled={!!fout}>
          Opslaan als concept
        </Button>
      </DialogFooter>
    </form>
  )
}
