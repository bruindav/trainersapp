// Fix: fix-11 — Mijn rooster: eigen trainingen, "Ik kan niet", verzoeken, open plekken, wijzigingen
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowRightLeft,
  CalendarCheck,
  Check,
  History,
  Inbox,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/app-shell'
import {
  KanNietDialog,
  overnemen,
  trainingKort,
  wanneer,
} from '@/components/rooster-acties'
import { TrainerAvatar } from '@/components/trainer-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { Toezichthouder, Trainer } from '@/data/fixtures'
import { toezichtNaam } from '@/data/indeling'
import { DAGEN_KORT, dagVan } from '@/data/rooster'
import {
  accepteerVerzoek,
  trainerById,
  trekVerzoekIn,
  useAppData,
  weigerVerzoek,
} from '@/data/store'
import {
  gepubliceerdeTrainingen,
  kanOvernemen,
  staatIngeroosterd,
  type GeroosterdeTraining,
  type Ruilverzoek,
} from '@/data/wijzigingen'
import { formatShort, todayISO, toISODate } from '@/lib/dates'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/rooster')({
  head: () => ({ meta: [{ title: 'Mijn rooster · NatUtrecht Trainersapp' }] }),
  component: RoosterPagina,
})

function voornaam(id: string) {
  return trainerById(id)?.naam.split(' ')[0] ?? 'Oud-trainer'
}

/** Wie houdt toezicht? Expliciet gekozen, anders een bevoegde trainer of externe. */
export function toezichtTekst(
  g: GeroosterdeTraining,
  trainers: Trainer[],
  groep: Toezichthouder[],
) {
  const i = g.indeling
  const gekozen = toezichtNaam(i?.toezicht, trainers, groep)
  if (gekozen) return gekozen
  const bevoegd = i?.trainers
    .map((id) => trainers.find((t) => t.id === id))
    .find((t) => t?.toezichthouder)
  if (bevoegd) return bevoegd.naam
  if (i?.extern && i.externToezicht) return `${i.extern} (extern)`
  return null
}

function RoosterPagina() {
  const data = useAppData()
  const ikId = data.huidigeTrainerId
  const ik = trainerById(ikId)
  const vandaag = todayISO()
  const [kanNiet, setKanNiet] = useState<GeroosterdeTraining | null>(null)

  const gepubliceerd = data.roosterperiodes.filter(
    (p) => p.status === 'gepubliceerd',
  )
  const komend = gepubliceerdeTrainingen(data).filter(
    (g) => g.training.datum >= vandaag,
  )
  const mijn = komend.filter((g) => staatIngeroosterd(g, ikId))
  const open = komend.filter((g) => g.open > 0)
  const verzoekenVoorMij = data.ruilverzoeken.filter(
    (v) => v.naar === ikId && v.status === 'open',
  )
  const mijnVerzoeken = data.ruilverzoeken.filter(
    (v) => v.van === ikId && v.status === 'open',
  )
  const zoek = (periodeId: string, key: string) =>
    komend.find((g) => g.periode.id === periodeId && g.training.key === key)

  return (
    <>
      <PageHeader
        eyebrow="Rooster"
        title="Mijn rooster"
        description={
          <p>
            Je trainingen, open plekken en ruilverzoeken. Kun je een keer niet?
            Geef je plek vrij of vraag een collega.
          </p>
        }
        actions={
          gepubliceerd.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {gepubliceerd.map((p) => (
                <Button
                  key={p.id}
                  asChild
                  size="sm"
                  variant="secondary"
                  className="rounded-full"
                >
                  <Link
                    to="/periodes/$periodeId/indelen"
                    params={{ periodeId: p.id }}
                  >
                    <CalendarCheck /> Heel rooster {p.naam}
                  </Link>
                </Button>
              ))}
            </div>
          )
        }
      />

      <div className="mx-auto grid max-w-content gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          {verzoekenVoorMij.length > 0 && (
            <Card className="border-primary ring-1 ring-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Inbox className="size-5 text-primary" aria-hidden />{' '}
                  Verzoeken voor jou
                </CardTitle>
                <CardDescription>
                  Een collega vraagt of jij een training wilt overnemen.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {verzoekenVoorMij.map((v) => (
                  <VerzoekVoorMij
                    key={v.id}
                    v={v}
                    van={zoek(v.periodeId, v.vanKey)}
                    terug={
                      v.terugKey ? zoek(v.periodeId, v.terugKey) : undefined
                    }
                  />
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Jouw trainingen</CardTitle>
              <CardDescription>
                {ik?.rol === 'Geen training'
                  ? 'Je geeft zelf geen training.'
                  : mijn.length === 0
                    ? 'Je staat (nog) niet op het gepubliceerde rooster.'
                    : `${mijn.length} ${mijn.length === 1 ? 'training' : 'trainingen'} vanaf vandaag.`}
              </CardDescription>
            </CardHeader>
            {mijn.length > 0 && (
              <CardContent>
                <ul className="divide-y">
                  {mijn.map((g) => {
                    const lopend = mijnVerzoeken.find(
                      (v) =>
                        v.periodeId === g.periode.id &&
                        v.vanKey === g.training.key,
                    )
                    const collegas = (g.indeling?.trainers ?? []).filter(
                      (x) => x !== ikId,
                    )
                    const toezicht = toezichtTekst(
                      g,
                      data.trainers,
                      data.toezichthouders,
                    )
                    return (
                      <li
                        key={`${g.periode.id}|${g.training.key}`}
                        className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 py-3 sm:grid-cols-[6rem_minmax(0,1fr)_auto]"
                      >
                        <div className="row-span-2 self-start text-center sm:row-span-1 sm:self-center">
                          <span className="block text-lg font-extrabold leading-tight">
                            {formatShort(g.training.datum)}
                          </span>
                          <span className="block text-[11px] font-semibold uppercase text-muted-foreground">
                            {wanneer(g.training.datum)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold">
                            {DAGEN_KORT[dagVan(g.training.datum)]} {g.training.start}–
                            {g.training.eind}
                            {g.training.feestdag && (
                              <Badge variant="outline" className="ml-2">
                                {g.training.feestdag}
                              </Badge>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {g.training.omschrijving || g.training.locatie}
                            {collegas.length > 0 && (
                              <> · met {collegas.map(voornaam).join(', ')}</>
                            )}
                            {g.indeling?.extern && (
                              <> · met {g.indeling.extern} (extern)</>
                            )}
                          </p>
                          <p
                            className={cn(
                              'text-xs',
                              toezicht
                                ? 'text-muted-foreground'
                                : 'font-semibold text-destructive',
                            )}
                          >
                            <ShieldCheck
                              className="mr-1 inline size-3.5 align-[-2px]"
                              aria-hidden
                            />
                            {toezicht
                              ? `Toezicht: ${toezicht === ik?.naam ? 'jij' : toezicht}`
                              : 'Nog geen toezichthouder'}
                          </p>
                          {lopend && (
                            <p className="mt-1 text-sm">
                              <ArrowRightLeft
                                className="mr-1 inline size-3.5 align-[-2px]"
                                aria-hidden
                              />
                              Gevraagd aan {voornaam(lopend.naar)}, wacht op
                              antwoord ·{' '}
                              <button
                                type="button"
                                className="font-semibold text-primary underline underline-offset-2"
                                onClick={() =>
                                  trekVerzoekIn(lopend.id).then(
                                    () => toast('Verzoek ingetrokken'),
                                    () => toast.error('Intrekken lukte niet'),
                                  )
                                }
                              >
                                intrekken
                              </button>
                            </p>
                          )}
                        </div>
                        {!lopend && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="justify-self-start sm:justify-self-end"
                            onClick={() => setKanNiet(g)}
                          >
                            Ik kan niet
                          </Button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </CardContent>
            )}
          </Card>

          {gepubliceerd.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Er is nog geen gepubliceerd rooster. De coördinator maakt het
                rooster via{' '}
                <Link
                  to="/periodes"
                  className="font-semibold text-primary underline underline-offset-2"
                >
                  Periodes
                </Link>
                .
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className={cn(open.length > 0 && 'border-primary')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="size-5 text-primary" aria-hidden /> Open
                plekken
              </CardTitle>
              <CardDescription>
                {open.length === 0
                  ? 'Alle trainingen hebben een trainer.'
                  : 'Kun jij? Neem hem over.'}
              </CardDescription>
            </CardHeader>
            {open.length > 0 && (
              <CardContent>
                <ul className="space-y-2">
                  {open.slice(0, 12).map((g) => (
                    <li
                      key={`${g.periode.id}|${g.training.key}`}
                      className="flex items-center gap-3 rounded-lg border p-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">
                          {trainingKort(g.training)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {wanneer(g.training.datum)} · {g.open}{' '}
                          {g.open === 1 ? 'plek' : 'plekken'} open
                        </p>
                      </div>
                      {ik && kanOvernemen(g, ik) && (
                        <Button size="sm" onClick={() => overnemen(g)}>
                          Ik neem hem
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
                {open.length > 12 && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    En nog {open.length - 12} verder weg.
                  </p>
                )}
              </CardContent>
            )}
          </Card>

          {ik?.coordinator && <WijzigingenKaart />}
        </div>
      </div>

      {kanNiet && (
        <KanNietDialog g={kanNiet} onClose={() => setKanNiet(null)} />
      )}
    </>
  )
}

function VerzoekVoorMij({
  v,
  van,
  terug,
}: {
  v: Ruilverzoek
  van?: GeroosterdeTraining
  terug?: GeroosterdeTraining
}) {
  const [bezig, setBezig] = useState(false)
  const verlopen = !van || (v.terugKey !== null && !terug)

  async function ja() {
    if (!van) return
    setBezig(true)
    try {
      await accepteerVerzoek(
        v,
        terug
          ? `${trainingKort(van.training)} ⇄ ${trainingKort(terug.training)}`
          : trainingKort(van.training),
      )
      toast.success('Geregeld! Het rooster is bijgewerkt.')
    } catch (err) {
      console.error(err)
      toast.error('Dat lukte niet', {
        description: 'Misschien is het rooster intussen veranderd.',
      })
    } finally {
      setBezig(false)
    }
  }

  return (
    <div className="rounded-xl border bg-accent/40 p-3">
      <div className="flex items-start gap-3">
        {trainerById(v.van) && (
          <TrainerAvatar trainer={trainerById(v.van)!} size="sm" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {voornaam(v.van)} vraagt: wil jij{' '}
            {van ? trainingKort(van.training) : 'een training'} overnemen?
          </p>
          {terug && (
            <p className="text-sm">
              In ruil neemt {voornaam(v.van)} jouw training van{' '}
              {trainingKort(terug.training)}.
            </p>
          )}
          {v.bericht && (
            <p className="mt-1 text-sm italic text-muted-foreground">
              "{v.bericht}"
            </p>
          )}
          {verlopen && (
            <p className="mt-1 text-sm text-destructive">
              Deze training ligt in het verleden of bestaat niet meer.
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={bezig}
          onClick={() =>
            weigerVerzoek(v.id).then(
              () => toast('Verzoek afgewezen'),
              () => toast.error('Afwijzen lukte niet'),
            )
          }
        >
          <X /> Nee
        </Button>
        <Button size="sm" disabled={bezig || verlopen} onClick={ja}>
          <Check /> Ja, doe ik
        </Button>
      </div>
    </div>
  )
}

const LOG_ICOON = {
  vrijgeven: UserPlus,
  overnemen: Check,
  ruil: ArrowRightLeft,
  overdracht: ArrowRightLeft,
  indeling: Users,
}

function WijzigingenKaart() {
  const data = useAppData()
  const regels = data.wijzigingslog.slice(0, 15)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-5" aria-hidden /> Recente wijzigingen
        </CardTitle>
        <CardDescription>
          Wat trainers na publicatie zelf hebben geregeld.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {regels.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nog geen wijzigingen.</p>
        ) : (
          <ul className="space-y-2.5">
            {regels.map((r) => {
              const Icoon = LOG_ICOON[r.soort] ?? History
              return (
                <li key={r.id} className="flex gap-2 text-sm">
                  <Icoon
                    className={cn(
                      'mt-0.5 size-4 shrink-0',
                      r.soort === 'vrijgeven'
                        ? 'text-primary'
                        : 'text-muted-foreground',
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    {r.tekst}
                    {r.op && (
                      <span className="block text-xs text-muted-foreground">{`${formatShort(toISODate(new Date(r.op)))} ${new Date(r.op).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`}</span>
                    )}
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
