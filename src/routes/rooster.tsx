// Fix: fix-1 — trainers uit Firestore i.p.v. vaste lijst
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { AlertTriangle, CalendarDays, Check, ChevronLeft, ChevronRight, RotateCcw, UserX } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/app-shell'
import { TrainerAvatar } from '@/components/trainer-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GROEPEN, SESSIES } from '@/data/fixtures'
import {
  groepById,
  herstelRotatie,
  isAfwezig,
  roosterVoorWeek,
  sessieById,
  trainerById,
  useAppData,
  wijsTrainerToe,
  type RoosterSlot,
} from '@/data/store'
import { addDays, formatLong, formatRange, formatShort, isoWeekNumber, startOfWeek, todayISO } from '@/lib/dates'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/rooster')({
  validateSearch: (s: Record<string, unknown>): { week?: string } =>
    typeof s.week === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.week) ? { week: startOfWeek(s.week) } : {},
  head: () => ({ meta: [{ title: 'Rooster · NatUtrecht Trainersapp' }] }),
  component: RoosterPagina,
})

function RoosterPagina() {
  const data = useAppData()
  const navigate = useNavigate({ from: '/rooster' })
  const vandaag = todayISO()
  const dezeWeek = startOfWeek(vandaag)
  const { week = dezeWeek } = Route.useSearch()
  const [alleenIk, setAlleenIk] = useState(false)
  const [bewerk, setBewerk] = useState<RoosterSlot | null>(null)

  const slots = roosterVoorWeek(data, week)
  const heeftWijzigingen = slots.some((s) => s.gewijzigd)
  const problemen = slots.filter((s) => !s.trainerId || s.afwezig)

  const gaNaar = (w: string) => navigate({ search: w === dezeWeek ? {} : { week: w } })

  return (
    <>
      <PageHeader
        eyebrow="Trainersrooster"
        title={`Week ${isoWeekNumber(week)}`}
        description={
          <p>
            {formatRange(week, addDays(week, 6))} · dinsdag &amp; donderdag 21:00, zondag 11:00 in zwembad De Kwakel
          </p>
        }
        actions={
          <div className="flex items-center gap-1 rounded-full bg-white/10 p-1">
            <Button size="icon-sm" variant="ghost" className="rounded-full text-white hover:bg-white/15 hover:text-white" onClick={() => gaNaar(addDays(week, -7))} aria-label="Vorige week">
              <ChevronLeft />
            </Button>
            <Button size="sm" variant="ghost" className="rounded-full text-white hover:bg-white/15 hover:text-white" onClick={() => gaNaar(dezeWeek)} disabled={week === dezeWeek}>
              Deze week
            </Button>
            <Button size="icon-sm" variant="ghost" className="rounded-full text-white hover:bg-white/15 hover:text-white" onClick={() => gaNaar(addDays(week, 7))} aria-label="Volgende week">
              <ChevronRight />
            </Button>
          </div>
        }
      />

      <div className="mx-auto max-w-content px-4 py-8 sm:px-6">
        <Tabs defaultValue="week">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="week">Weekrooster</TabsTrigger>
              <TabsTrigger value="verdeling">Verdeling per trainer</TabsTrigger>
            </TabsList>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch id="alleen-ik" checked={alleenIk} onCheckedChange={setAlleenIk} />
                <Label htmlFor="alleen-ik">Markeer mijn trainingen</Label>
              </div>
              {heeftWijzigingen && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    herstelRotatie(week)
                    toast('Rotatie hersteld', { description: `Week ${isoWeekNumber(week)} volgt weer het standaardrooster.` })
                  }}
                >
                  <RotateCcw /> Herstel rotatie
                </Button>
              )}
            </div>
          </div>

          <TabsContent value="week" className="mt-6 space-y-6">
            {problemen.length > 0 && (
              <div role="status" className="flex items-start gap-3 rounded-xl border border-nat-orange/40 bg-nat-orange/10 p-4 text-sm">
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-nat-orange" aria-hidden />
                <div>
                  <p className="font-bold">
                    {problemen.length === 1 ? '1 plek' : `${problemen.length} plekken`} vragen aandacht deze week
                  </p>
                  <p className="text-muted-foreground">
                    {problemen
                      .map((p) => `${sessieById(p.sessieId).dag} ${groepById(p.groepId).naam.toLowerCase()} (${p.trainerId ? p.afwezig : 'open'})`)
                      .join(' · ')}
                  </p>
                </div>
              </div>
            )}

            {/* Desktop raster */}
            <div className="grid gap-4 md:grid-cols-[10rem_repeat(3,minmax(0,1fr))]">
              <div className="hidden md:block" />
              {SESSIES.map((sessie) => {
                const datum = addDays(week, sessie.dagIndex)
                const isVandaag = datum === vandaag
                return (
                  <div key={sessie.id} className="hidden rounded-xl bg-card px-4 py-3 text-center md:block">
                    <p className="font-extrabold">{sessie.dag}</p>
                    <p className={cn('text-sm', isVandaag ? 'font-bold text-primary' : 'text-muted-foreground')}>
                      {isVandaag ? 'Vandaag' : formatShort(datum)} · {sessie.start}–{sessie.eind}
                    </p>
                  </div>
                )
              })}

              {GROEPEN.map((groep) => (
                <RoosterRij key={groep.id} groepId={groep.id}>
                  {SESSIES.map((sessie) => {
                    const slot = slots.find((s) => s.sessieId === sessie.id && s.groepId === groep.id)!
                    return (
                      <SlotKaart
                        key={sessie.id}
                        slot={slot}
                        voorbij={slot.datum < vandaag}
                        isMijn={slot.trainerId === data.huidigeTrainerId}
                        markeer={alleenIk}
                        onClick={() => setBewerk(slot)}
                      />
                    )
                  })}
                </RoosterRij>
              ))}
            </div>

            <AfwezighedenKaart week={week} />
          </TabsContent>

          <TabsContent value="verdeling" className="mt-6">
            <Verdeling vanafWeek={week} />
          </TabsContent>
        </Tabs>
      </div>

      <ToewijzenDialog slot={bewerk} week={week} onClose={() => setBewerk(null)} />
    </>
  )
}

function RoosterRij({ groepId, children }: { groepId: string; children: React.ReactNode }) {
  const groep = groepById(groepId)
  return (
    <>
      <div className="flex items-center gap-3 pt-4 md:flex-col md:items-start md:justify-center md:gap-0 md:pt-0">
        <p className="text-lg font-black">{groep.naam}</p>
        <p className="text-sm text-muted-foreground">{groep.banen}</p>
        <p className="hidden text-xs text-muted-foreground md:block">{groep.omschrijving}</p>
      </div>
      {children}
    </>
  )
}

function SlotKaart({
  slot,
  voorbij,
  isMijn,
  markeer,
  onClick,
}: {
  slot: RoosterSlot
  voorbij: boolean
  isMijn: boolean
  markeer: boolean
  onClick: () => void
}) {
  const trainer = trainerById(slot.trainerId)
  const sessie = sessieById(slot.sessieId)
  const open = !trainer
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex min-h-24 w-full items-center gap-3 rounded-xl border bg-card p-4 text-left transition-all outline-none hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10 focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        open && 'border-2 border-dashed border-primary/60 bg-accent/40',
        slot.afwezig && 'border-nat-orange/60 bg-nat-orange/5',
        voorbij && 'opacity-55',
        markeer && !isMijn && 'opacity-35',
        markeer && isMijn && 'ring-2 ring-primary',
      )}
      aria-label={`${sessie.dag} ${groepById(slot.groepId).naam}: ${trainer ? trainer.naam : 'open plek'}. Wijzig trainer`}
    >
      <span className="text-xs font-bold text-muted-foreground md:hidden">{sessie.dag.slice(0, 2)}</span>
      {trainer ? (
        <TrainerAvatar trainer={trainer} size="md" />
      ) : (
        <span className="inline-flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UserX className="size-5" aria-hidden />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold">{trainer ? trainer.naam : 'Open plek'}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {slot.afwezig ? (
            <span className="font-semibold text-nat-orange">Afwezig · {slot.afwezig}</span>
          ) : trainer ? (
            trainer.specialiteit
          ) : (
            'Klik om een trainer toe te wijzen'
          )}
        </span>
      </span>
      {slot.gewijzigd && (
        <Badge variant="outline" className="absolute top-2 right-2 text-[10px]">
          gewijzigd
        </Badge>
      )}
    </button>
  )
}

function ToewijzenDialog({ slot, week, onClose }: { slot: RoosterSlot | null; week: string; onClose: () => void }) {
  const data = useAppData()
  const weekSlots = roosterVoorWeek(data, week)

  return (
    <Dialog open={!!slot} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {slot && (
          <>
            <DialogHeader>
              <DialogTitle>
                {sessieById(slot.sessieId).dag} · {groepById(slot.groepId).naam}
              </DialogTitle>
              <DialogDescription className="capitalize">
                {formatLong(slot.datum)}, {sessieById(slot.sessieId).start} uur · {groepById(slot.groepId).banen}
              </DialogDescription>
            </DialogHeader>
            <ul className="-mx-2 max-h-[55vh] space-y-1 overflow-y-auto px-2" aria-label="Kies een trainer">
              {data.trainers.map((t) => {
                const afw = isAfwezig(data, t.id, slot.datum)
                const aantal = weekSlots.filter((s) => s.trainerId === t.id).length
                const zelfdeMoment = weekSlots.find(
                  (s) => s.trainerId === t.id && s.sessieId === slot.sessieId && s.groepId !== slot.groepId,
                )
                const gekozen = slot.trainerId === t.id
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg border border-transparent p-2.5 text-left transition-colors outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50',
                        gekozen && 'border-primary bg-accent',
                      )}
                      onClick={() => {
                        wijsTrainerToe(week, slot.sessieId, slot.groepId, t.id)
                        toast.success(`${t.naam.split(' ')[0]} staat ingeroosterd`, {
                          description: `${sessieById(slot.sessieId).dag} ${formatShort(slot.datum)} · ${groepById(slot.groepId).naam}`,
                        })
                        onClose()
                      }}
                    >
                      <TrainerAvatar trainer={t} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{t.naam}</span>
                        <span className="block text-xs text-muted-foreground">
                          {aantal}× deze week{t.rol !== 'Trainer' ? ` · ${t.rol}` : ''}
                        </span>
                      </span>
                      {afw && <Badge className="bg-nat-orange text-white">Afwezig</Badge>}
                      {zelfdeMoment && !afw && <Badge variant="outline">Al op {groepById(zelfdeMoment.groepId).naam}</Badge>}
                      {gekozen && <Check className="size-4 text-primary" aria-label="Huidige keuze" />}
                    </button>
                  </li>
                )
              })}
            </ul>
            <Button
              variant="outline"
              onClick={() => {
                wijsTrainerToe(week, slot.sessieId, slot.groepId, null)
                toast('Plek staat open', { description: 'Collega’s zien deze plek als open in het rooster.' })
                onClose()
              }}
            >
              <UserX /> Plek open laten
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function AfwezighedenKaart({ week }: { week: string }) {
  const data = useAppData()
  const eind = addDays(week, 6)
  const lijst = data.afwezigheden.filter((a) => a.van <= addDays(eind, 21) && a.tot >= week)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-extrabold">
          <CalendarDays className="size-5 text-primary" aria-hidden /> Afwezigheid
        </CardTitle>
        <CardDescription>Gemelde afwezigheid deze week en de drie weken erna.</CardDescription>
      </CardHeader>
      <CardContent>
        {lijst.length === 0 ? (
          <p className="text-sm text-muted-foreground">Iedereen is beschikbaar.</p>
        ) : (
          <ul className="divide-y">
            {lijst.map((a) => {
              const t = trainerById(a.trainerId)!
              return (
                <li key={`${a.trainerId}-${a.van}`} className="flex items-center gap-3 py-3 text-sm">
                  <TrainerAvatar trainer={t} size="sm" />
                  <span className="font-semibold">{t.naam}</span>
                  <span className="text-muted-foreground">{a.reden}</span>
                  <span className="ml-auto font-medium">
                    {a.van === a.tot ? formatShort(a.van) : formatRange(a.van, a.tot)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function Verdeling({ vanafWeek }: { vanafWeek: string }) {
  const data = useAppData()
  const weken = [0, 7, 14, 21].map((d) => addDays(vanafWeek, d))
  const perWeek = weken.map((w) => roosterVoorWeek(data, w))
  const open = perWeek.flat().filter((s) => !s.trainerId).length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-extrabold">Verdeling over 4 weken</CardTitle>
        <CardDescription>
          Week {isoWeekNumber(weken[0])} t/m {isoWeekNumber(weken[3])} · {open} open {open === 1 ? 'plek' : 'plekken'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trainer</TableHead>
                {weken.map((w) => (
                  <TableHead key={w} className="text-center">
                    <Link to="/rooster" search={{ week: w }} className="hover:text-primary">
                      Wk {isoWeekNumber(w)}
                    </Link>
                  </TableHead>
                ))}
                <TableHead className="text-right">Totaal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.trainers.map((t) => {
                const counts = perWeek.map((slots) => slots.filter((s) => s.trainerId === t.id))
                const totaal = counts.reduce((n, c) => n + c.length, 0)
                return (
                  <TableRow key={t.id} className={t.id === data.huidigeTrainerId ? 'bg-accent/50' : ''}>
                    <TableCell>
                      <span className="flex items-center gap-2 font-semibold">
                        <TrainerAvatar trainer={t} size="xs" /> {t.naam}
                      </span>
                    </TableCell>
                    {counts.map((c, i) => (
                      <TableCell key={weken[i]} className="text-center">
                        <span className="inline-flex gap-1" title={c.map((s) => `${sessieById(s.sessieId).dag} ${groepById(s.groepId).naam}`).join(', ')}>
                          {c.length === 0 ? (
                            <span className="text-muted-foreground">–</span>
                          ) : (
                            c.map((s) => (
                              <span
                                key={s.sessieId + s.groepId}
                                className="inline-flex size-6 items-center justify-center rounded-md text-[10px] font-bold text-white"
                                style={{ backgroundColor: t.kleur }}
                              >
                                {sessieById(s.sessieId).dag.slice(0, 2)}
                              </span>
                            ))
                          )}
                        </span>
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-black">{totaal}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
