import { Link, createFileRoute } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CalendarRange,
  ClipboardPlus,
  MapPin,
  MessageSquareHeart,
  Paperclip,
  Trophy,
  Users,
  Waves,
} from 'lucide-react'

import { TrainerAvatar } from '@/components/trainer-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { GROEPEN, SESSIES } from '@/data/fixtures'
import {
  groepById,
  huidigePeriode,
  roosterVoorWeek,
  sessieById,
  totaalMeters,
  trainerById,
  useAppData,
} from '@/data/store'
import { addDays, daysBetween, formatLong, formatShort, isoWeekNumber, startOfWeek, todayISO } from '@/lib/dates'

export const Route = createFileRoute('/')({
  component: Overzicht,
})

function Overzicht() {
  const data = useAppData()
  const vandaag = todayISO()
  const week = startOfWeek(vandaag)
  const ik = trainerById(data.huidigeTrainerId)!
  const voornaam = ik.naam.split(' ')[0]

  const rooster = roosterVoorWeek(data, week)
  const komende = [0, 7, 14, 21, 28].flatMap((d) => roosterVoorWeek(data, addDays(week, d)))
  const mijnVolgende = komende.find((s) => s.trainerId === ik.id && s.datum >= vandaag)
  const openPlekken = [0, 7].flatMap((d) => roosterVoorWeek(data, addDays(week, d))).filter(
    (s) => s.datum >= vandaag && (!s.trainerId || s.afwezig),
  )

  const weekGeleden = addDays(vandaag, -7)
  const recent = data.trainingen.filter((t) => t.datum >= weekGeleden && t.datum <= vandaag)
  const meters = recent.reduce((sum, t) => sum + totaalMeters(t), 0)

  const periode = huidigePeriode(data, vandaag)
  const periodeVoortgang = periode
    ? Math.round((daysBetween(periode.van, vandaag) / Math.max(1, daysBetween(periode.van, periode.tot))) * 100)
    : 0
  const volgendEvenement = data.jaarplan.evenementen.find((e) => e.datum >= vandaag)

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-nat-ink text-white">
        <img
          src="/.netlify/images?url=/img/hero-zwembad.png&w=1600&fm=webp&q=70"
          srcSet="/.netlify/images?url=/img/hero-zwembad.png&w=800&fm=webp&q=70 800w, /.netlify/images?url=/img/hero-zwembad.png&w=1600&fm=webp&q=70 1600w"
          sizes="100vw"
          alt=""
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-45"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-nat-ink via-nat-ink/85 to-nat-ink/30" aria-hidden />
        <div className="mx-auto grid max-w-content gap-10 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:items-end lg:pt-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-nat-yellow">
              <Waves className="size-3.5" aria-hidden /> Week {isoWeekNumber(vandaag)} · seizoen {data.jaarplan.seizoen}
            </p>
            <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Hoi {voornaam}, <br />
              <span className="text-primary">klaar voor het bad?</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/80">
              Het rooster, het jaarplan en het trainingslogboek van de Nat Utrecht-trainers op één plek. Zie wie welke
              baan geeft en wat er deze week al gezwommen is.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full font-bold">
                <Link to="/rooster">
                  Bekijk het rooster <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full border-white/30 bg-white/5 font-bold text-white hover:bg-white/15 hover:text-white">
                <Link to="/trainingen" search={{ nieuw: true }}>
                  <ClipboardPlus /> Training vastleggen
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 text-foreground shadow-2xl shadow-black/30">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Jouw volgende training</p>
            {mijnVolgende ? (
              <>
                <p className="mt-2 text-2xl font-extrabold capitalize">{formatLong(mijnVolgende.datum)}</p>
                <div className="mt-4 space-y-2 text-sm">
                  <p className="flex items-center gap-2">
                    <CalendarClock className="size-4 text-primary" aria-hidden />
                    {sessieById(mijnVolgende.sessieId).start}–{sessieById(mijnVolgende.sessieId).eind} uur
                  </p>
                  <p className="flex items-center gap-2">
                    <Users className="size-4 text-primary" aria-hidden />
                    {groepById(mijnVolgende.groepId).naam} · {groepById(mijnVolgende.groepId).banen}
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="size-4 text-primary" aria-hidden />
                    {sessieById(mijnVolgende.sessieId).locatie}
                  </p>
                </div>
                {periode && (
                  <div className="mt-5 rounded-xl border-l-4 bg-muted p-3 text-sm" style={{ borderColor: periode.kleur }}>
                    <span className="font-bold">Focus uit het jaarplan:</span> {periode.accenten.join(', ')}
                  </div>
                )}
              </>
            ) : (
              <p className="mt-3 text-muted-foreground">
                Je staat de komende vijf weken niet ingeroosterd. Neem een open plek in het rooster.
              </p>
            )}
          </div>
        </div>
        <div className="nat-rainbow h-1.5" aria-hidden />
      </section>

      <div className="mx-auto max-w-content space-y-10 px-4 py-10 sm:px-6">
        {/* Kerncijfers */}
        <section aria-label="Kerncijfers" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Trainingen deze week" value={`${SESSIES.length * GROEPEN.length}`} sub={`${SESSIES.length} momenten × ${GROEPEN.length} groepen`} />
          <Stat
            label="Open plekken"
            value={String(openPlekken.length)}
            sub="komende 2 weken"
            tone={openPlekken.length ? 'warn' : 'ok'}
          />
          <Stat label="Gezwommen afgelopen 7 dagen" value={`${(meters / 1000).toLocaleString('nl-NL', { maximumFractionDigits: 1 })} km`} sub={`${recent.length} trainingen gelogd`} />
          <Stat label="Periode" value={periode?.naam ?? '—'} sub={periode ? `t/m ${formatShort(periode.tot)}` : ''} small />
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* Deze week */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-extrabold">Deze week in het bad</CardTitle>
                <CardDescription>Wie geeft welke groep, week {isoWeekNumber(week)}</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/rooster">
                  Rooster <ArrowRight />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              {SESSIES.map((sessie) => {
                const slots = rooster.filter((s) => s.sessieId === sessie.id)
                const voorbij = slots[0].datum < vandaag
                return (
                  <div key={sessie.id} className={`rounded-xl border p-4 ${voorbij ? 'opacity-60' : ''}`}>
                    <p className="text-sm font-extrabold">{sessie.dag}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatShort(slots[0].datum)} · {sessie.start}
                    </p>
                    <ul className="mt-3 space-y-2.5">
                      {slots.map((slot) => {
                        const t = trainerById(slot.trainerId)
                        return (
                          <li key={slot.groepId} className="flex items-center gap-2 text-sm">
                            {t ? (
                              <TrainerAvatar trainer={t} size="sm" />
                            ) : (
                              <span className="inline-flex size-8 items-center justify-center rounded-full border-2 border-dashed border-primary text-xs font-bold text-primary">
                                ?
                              </span>
                            )}
                            <span className="min-w-0 leading-tight">
                              <span className="block truncate font-semibold">{t ? t.naam.split(' ')[0] : 'Open'}</span>
                              <span className="block text-xs text-muted-foreground">{groepById(slot.groepId).naam}</span>
                            </span>
                            {slot.afwezig && (
                              <AlertTriangle className="ml-auto size-4 text-nat-orange" aria-label={`Afwezig: ${slot.afwezig}`} />
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Jaarplan nu */}
          <Card className="overflow-hidden">
            <div className="h-2" style={{ background: periode?.kleur }} aria-hidden />
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-xl font-extrabold">Jaarplan: nu</CardTitle>
                <Badge variant={data.jaarplan.status === 'gepubliceerd' ? 'default' : 'outline'}>
                  {data.jaarplan.status === 'gepubliceerd' ? `Gepubliceerd · v${data.jaarplan.versie}` : 'Concept'}
                </Badge>
              </div>
              <CardDescription>{periode ? formatShort(periode.van) + ' – ' + formatShort(periode.tot) : ''}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {periode && (
                <>
                  <div>
                    <p className="text-lg font-extrabold">{periode.naam}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{periode.doel}</p>
                  </div>
                  <div>
                    <div className="mb-1.5 flex justify-between text-xs font-semibold text-muted-foreground">
                      <span>Voortgang periode</span>
                      <span>{periodeVoortgang}%</span>
                    </div>
                    <Progress value={periodeVoortgang} aria-label="Voortgang huidige periode" />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {periode.accenten.map((a) => (
                      <Badge key={a} variant="secondary">
                        {a}
                      </Badge>
                    ))}
                  </div>
                </>
              )}
              {volgendEvenement && (
                <div className="flex items-center gap-3 rounded-xl bg-nat-ink p-4 text-white">
                  <Trophy className="size-8 shrink-0 text-nat-yellow" aria-hidden />
                  <div className="min-w-0">
                    <p className="truncate font-bold">{volgendEvenement.naam}</p>
                    <p className="text-sm text-white/70">
                      {formatLong(volgendEvenement.datum)} · nog {daysBetween(vandaag, volgendEvenement.datum)} dagen
                    </p>
                  </div>
                </div>
              )}
              <Button asChild variant="outline" className="w-full">
                <Link to="/jaarplan">
                  <CalendarRange /> Volledig jaarplan
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Afgelopen week */}
        <section aria-labelledby="recent-titel">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 id="recent-titel" className="text-2xl font-black tracking-tight">
                Afgelopen week getraind
              </h2>
              <p className="text-sm text-muted-foreground">Wat je collega's in het water hebben gelegd.</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/trainingen">
                Alle trainingen <ArrowRight />
              </Link>
            </Button>
          </div>
          {recent.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Nog geen trainingen vastgelegd deze week.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recent.slice(0, 6).map((t) => {
                const trainer = trainerById(t.trainerId)!
                return (
                  <Link
                    key={t.id}
                    to="/trainingen"
                    search={{ id: t.id }}
                    className="group rounded-xl border bg-card p-5 transition-shadow hover:shadow-lg hover:shadow-primary/10 focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none"
                  >
                    <div className="flex items-center gap-3">
                      <TrainerAvatar trainer={trainer} size="sm" />
                      <div className="min-w-0 text-xs text-muted-foreground">
                        <p className="font-semibold text-foreground">{trainer.naam}</p>
                        <p className="capitalize">
                          {formatLong(t.datum)} · {groepById(t.groepId).naam}
                        </p>
                      </div>
                    </div>
                    <p className="mt-4 font-extrabold group-hover:text-primary">{t.titel}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {t.focus.map((f) => (
                        <Badge key={f} variant="secondary">
                          {f}
                        </Badge>
                      ))}
                      <span className="ml-auto flex items-center gap-2 text-sm font-bold">
                        {t.bijlage && <Paperclip className="size-3.5 text-muted-foreground" aria-label="Met bijlage" />}
                        {totaalMeters(t).toLocaleString('nl-NL')} m
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* Binnenkort */}
        <section className="flex flex-col gap-4 rounded-2xl border-2 border-dashed border-primary/30 bg-accent/40 p-6 sm:flex-row sm:items-center">
          <MessageSquareHeart className="size-10 shrink-0 text-primary" aria-hidden />
          <div>
            <h2 className="font-extrabold">Binnenkort: aandachtspunten &amp; afspraken</h2>
            <p className="text-sm text-muted-foreground">
              Geef elkaar aandachtspunten door over zwemmers of groepen, en leg trainersafspraken vast zodat iedereen
              hetzelfde weet.
            </p>
          </div>
        </section>
      </div>
    </>
  )
}

function Stat({
  label,
  value,
  sub,
  tone,
  small,
}: {
  label: string
  value: string
  sub: string
  tone?: 'warn' | 'ok'
  small?: boolean
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={`mt-2 font-black tracking-tight ${small ? 'text-xl' : 'text-3xl'} ${
          tone === 'warn' ? 'text-primary' : ''
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  )
}
