// Fix: fix-21 — taak Wedstrijden (wedstrijdcoördinator)
// Fix: fix-19 — uitnodigingsmail via EmailJS; inloggen met Google
// Fix: fix-18 — uitnodiging mailen (inloglink), opnieuw mailen of zelf mailen
// Fix: fix-17 — naam van een teamlid wijzigen
// Fix: fix-4 — rol direct in het menu (submenu viel op mobiel buiten beeld)
// Fix: fix-3 — rollen en taken (coördinator, jaarplan, teambeheer, toezicht), groep toezichthouders
// Fix: fix-2 — testtrainers toevoegen en verwijderen
// Fix: fix-1 — Team: trainers bekijken; hoofdtrainer nodigt uit en beheert rollen
import { createFileRoute } from '@tanstack/react-router'
import { Check, FlaskConical, Loader2, Mail, MoreHorizontal, Send, ShieldCheck, Trash2, UserPlus } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'

import { PageHeader } from '@/components/app-shell'
import { TrainerAvatar } from '@/components/trainer-avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ALLE_ROLLEN,
  GEEN_TAKEN,
  TAAK_LABELS,
  TESTTRAINERS,
  TRAINER_KLEUREN,
  magTeamBeheren,
  type Taken,
  type Trainer,
  type TrainerRol,
  type Uitnodiging,
} from '@/data/fixtures'
import { stuurMail } from '@/lib/mail'
import {
  initialenVan,
  nodigTrainerUit,
  trainerById,
  trekUitnodigingIn,
  useAppData,
  verwijderTesttrainers,
  verwijderToezichthouder,
  verwijderTrainer,
  voegTesttrainersToe,
  voegToezichthouderToe,
  wijzigTrainer,
} from '@/data/store'
import { formatShort } from '@/lib/dates'

export const Route = createFileRoute('/team')({
  component: TeamPagina,
})

const TAKEN: (keyof Taken)[] = ['coordinator', 'jaarplanBeheer', 'wedstrijdBeheer', 'teamBeheer', 'toezichthouder']
/** Taken die alleen de coördinator mag toekennen. */
const ALLEEN_COORDINATOR: (keyof Taken)[] = ['coordinator', 'teamBeheer']

function voornaam(naam: string) {
  return naam.split(' ')[0]
}

function RolEnTaken({ t }: { t: Trainer | Uitnodiging }) {
  return (
    <>
      <Badge variant={t.rol === 'Geen training' ? 'secondary' : 'outline'}>{t.rol}</Badge>
      {t.coordinator && <Badge>Coördinator</Badge>}
      {t.jaarplanBeheer && <Badge variant="outline">Jaarplan</Badge>}
      {t.wedstrijdBeheer && <Badge variant="outline">Wedstrijden</Badge>}
      {t.teamBeheer && !t.coordinator && <Badge variant="outline">Teambeheer</Badge>}
      {t.toezichthouder && (
        <Badge variant="outline" className="gap-1">
          <ShieldCheck className="size-3" aria-hidden /> Toezicht
        </Badge>
      )}
    </>
  )
}

function TeamPagina() {
  const data = useAppData()
  const ik = trainerById(data.huidigeTrainerId)!
  const magBeheren = magTeamBeheren(ik)
  const [uitnodigen, setUitnodigen] = useState(false)
  const [teVerwijderen, setTeVerwijderen] = useState<Trainer | null>(null)
  const [inTeTrekken, setInTeTrekken] = useState<Uitnodiging | null>(null)

  const aantalUitnodigingen = data.uitnodigingen.length

  return (
    <>
      <PageHeader
        eyebrow="Trainersteam"
        title="Team"
        description={
          magBeheren
            ? `${data.trainers.length} teamleden · ${aantalUitnodigingen} openstaande ${aantalUitnodigingen === 1 ? 'uitnodiging' : 'uitnodigingen'}`
            : `${data.trainers.length} teamleden`
        }
        actions={
          magBeheren && (
            <Button size="lg" className="w-full rounded-full sm:w-auto" onClick={() => setUitnodigen(true)}>
              <UserPlus aria-hidden /> Teamlid uitnodigen
            </Button>
          )
        }
      />

      <div className="mx-auto max-w-content space-y-6 px-4 py-8 sm:px-6">
        {!magBeheren && (
          <Alert>
            <AlertDescription>Alleen de coördinator (of wie teambeheer heeft) kan het team wijzigen.</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>
              <h2 className="text-lg font-bold">Teamleden</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {data.trainers.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <TrainerAvatar trainer={t} size="md" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-semibold">
                      {t.naam}
                      {t.id === ik.id && <span className="ml-1 text-sm font-normal text-muted-foreground">(jij)</span>}
                    </p>
                    <p className="flex flex-wrap gap-1.5">
                      <RolEnTaken t={t} />
                      {t.test && <Badge variant="secondary">Test</Badge>}
                    </p>
                    {t.specialiteit && <p className="truncate text-sm text-muted-foreground">{t.specialiteit}</p>}
                  </div>
                  {magBeheren && (ik.coordinator || !t.coordinator) && (
                    <TeamlidActies trainer={t} ik={ik} onVerwijder={() => setTeVerwijderen(t)} />
                  )}
                </li>
              ))}
            </ul>
            {magBeheren && data.trainers.length <= 1 && (
              <div className="mt-4 rounded-lg border border-dashed p-6 text-center">
                <p className="text-muted-foreground">Je bent nog de enige. Nodig je eerste collega uit.</p>
                <Button className="mt-3" onClick={() => setUitnodigen(true)}>
                  <UserPlus aria-hidden /> Teamlid uitnodigen
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <ToezichthoudersKaart magBeheren={magBeheren} />

        {magBeheren && (
          <Card>
            <CardHeader>
              <CardTitle>
                <h2 className="text-lg font-bold">Openstaande uitnodigingen</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.uitnodigingen.length === 0 ? (
                <p className="text-muted-foreground">Geen openstaande uitnodigingen.</p>
              ) : (
                <ul className="divide-y">
                  {data.uitnodigingen.map((u) => (
                    <li key={u.email} className="flex flex-wrap items-center gap-3 py-3">
                      <Mail className="size-5 text-muted-foreground" aria-hidden />
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="font-semibold">{u.naam}</p>
                        <p className="flex flex-wrap gap-1.5">
                          <RolEnTaken t={u} />
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {u.email} · uitgenodigd op {formatShort(u.uitgenodigdOp)}
                        </p>
                      </div>
                      <span className="flex flex-wrap gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            mailUitnodiging(u).then(
                              () => toast.success(`Uitnodiging opnieuw gemaild naar ${u.email}`),
                              (err) => {
                                console.error(err)
                                toast.error('Versturen lukte niet. Gebruik "Zelf mailen".')
                              },
                            )
                          }
                        >
                          <Send aria-hidden /> Opnieuw mailen
                        </Button>
                        <Button asChild variant="ghost" size="sm">
                          <a href={uitnodigingMailto(u)}>
                            <Mail aria-hidden /> Zelf mailen
                          </a>
                        </Button>
                        {(ik.coordinator || !u.coordinator) && (
                          <Button variant="ghost" size="sm" onClick={() => setInTeTrekken(u)}>
                            Intrekken
                          </Button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {magBeheren && <TesttrainersKaart />}
      </div>

      {magBeheren && <UitnodigenDialog open={uitnodigen} onOpenChange={setUitnodigen} ikBenCoordinator={ik.coordinator} />}

      <Dialog open={!!teVerwijderen} onOpenChange={(o) => !o && setTeVerwijderen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{teVerwijderen?.naam} verwijderen?</DialogTitle>
            <DialogDescription>
              {teVerwijderen && voornaam(teVerwijderen.naam)} verliest direct toegang tot de app. Ingevulde trainingen
              en roosterplekken blijven bewaard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setTeVerwijderen(null)}>
              Annuleren
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                const t = teVerwijderen!
                setTeVerwijderen(null)
                try {
                  await verwijderTrainer(t.id)
                  toast.success(`${voornaam(t.naam)} is verwijderd uit het team`)
                } catch {
                  toast.error('Verwijderen lukte niet. Probeer het opnieuw.')
                }
              }}
            >
              Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!inTeTrekken} onOpenChange={(o) => !o && setInTeTrekken(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Uitnodiging voor {inTeTrekken?.email} intrekken?</DialogTitle>
            <DialogDescription>Met dit adres kan daarna niet meer worden ingelogd.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setInTeTrekken(null)}>
              Annuleren
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                const u = inTeTrekken!
                setInTeTrekken(null)
                try {
                  await trekUitnodigingIn(u.email)
                  toast.success('Uitnodiging ingetrokken')
                } catch {
                  toast.error('Intrekken lukte niet. Probeer het opnieuw.')
                }
              }}
            >
              Intrekken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function TeamlidActies({ trainer, ik, onVerwijder }: { trainer: Trainer; ik: Trainer; onVerwijder: () => void }) {
  const isIk = trainer.id === ik.id
  const [naamWijzigen, setNaamWijzigen] = useState(false)

  async function wijzig(w: Partial<Taken> & { rol?: TrainerRol }, melding: string) {
    try {
      await wijzigTrainer(trainer.id, w)
      toast.success(melding)
    } catch {
      toast.error('Wijzigen lukte niet. Probeer het opnieuw.')
    }
  }

  function taakUitgeschakeld(taak: keyof Taken) {
    if (ALLEEN_COORDINATOR.includes(taak) && !ik.coordinator) return true
    // Een coördinator kan zichzelf niet de coördinatortaak afnemen: er blijft er altijd één.
    if (isIk && taak === 'coordinator') return true
    return false
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-11" aria-label={`Acties voor ${trainer.naam}`}>
          <MoreHorizontal aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" collisionPadding={8} className="max-h-[var(--radix-dropdown-menu-content-available-height)] w-60 overflow-y-auto">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Rol</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={trainer.rol}
          onValueChange={(rol) =>
            rol !== trainer.rol && wijzig({ rol: rol as TrainerRol }, `${voornaam(trainer.naam)}: ${rol.toLowerCase()}`)
          }
        >
          {ALLE_ROLLEN.map((r) => (
            <DropdownMenuRadioItem key={r} value={r} onSelect={(e) => e.preventDefault()}>
              {r}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">Taken</DropdownMenuLabel>
        {TAKEN.map((taak) => (
          <DropdownMenuCheckboxItem
            key={taak}
            checked={trainer[taak]}
            disabled={taakUitgeschakeld(taak)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={(aan) =>
              wijzig(
                { [taak]: aan === true },
                `${voornaam(trainer.naam)}: ${TAAK_LABELS[taak].toLowerCase()} ${aan ? 'aan' : 'uit'}`,
              )
            }
          >
            {TAAK_LABELS[taak]}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setNaamWijzigen(true)}>Naam wijzigen</DropdownMenuItem>
        {!isIk && (
          <>
            <DropdownMenuItem variant="destructive" onSelect={onVerwijder}>
              Verwijderen uit team
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
      {naamWijzigen && <NaamDialog trainer={trainer} onClose={() => setNaamWijzigen(false)} />}
    </DropdownMenu>
  )
}

function NaamDialog({ trainer, onClose }: { trainer: Trainer; onClose: () => void }) {
  const [naam, setNaam] = useState(trainer.naam)
  const [bezig, setBezig] = useState(false)
  const nieuw = naam.trim().replace(/\s+/g, ' ')

  async function opslaan(e: FormEvent) {
    e.preventDefault()
    if (!nieuw || nieuw === trainer.naam) return onClose()
    setBezig(true)
    try {
      await wijzigTrainer(trainer.id, { naam: nieuw, initialen: initialenVan(nieuw) })
      toast.success(`Naam gewijzigd in ${nieuw}`)
      onClose()
    } catch {
      toast.error('Wijzigen lukte niet. Probeer het opnieuw.')
    } finally {
      setBezig(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form onSubmit={opslaan} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Naam wijzigen</DialogTitle>
            <DialogDescription>Rooster, beschikbaarheid en trainingen blijven bij deze persoon horen.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="nieuwe-naam">Voor- en achternaam</Label>
            <Input id="nieuwe-naam" value={naam} onChange={(e) => setNaam(e.target.value)} maxLength={80} autoFocus />
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuleren
            </Button>
            <Button type="submit" disabled={bezig || !nieuw}>
              Opslaan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ToezichthoudersKaart({ magBeheren }: { magBeheren: boolean }) {
  const data = useAppData()
  const [naam, setNaam] = useState('')
  const [notitie, setNotitie] = useState('')
  const [bezig, setBezig] = useState(false)

  async function toevoegen(e: FormEvent) {
    e.preventDefault()
    if (!naam.trim()) return
    setBezig(true)
    try {
      await voegToezichthouderToe(naam, notitie)
      toast.success(`${naam.trim()} toegevoegd aan de toezichthouders`)
      setNaam('')
      setNotitie('')
    } catch {
      toast.error('Toevoegen lukte niet. Probeer het opnieuw.')
    } finally {
      setBezig(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <ShieldCheck className="size-5 text-primary" aria-hidden /> Toezichthouders
          </h2>
        </CardTitle>
        <CardDescription>
          De aparte groep toezichthouders van de club. Bij elke training moet een toezichthouder zijn: een bevoegde
          trainer of iemand uit deze groep.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.toezichthouders.length === 0 ? (
          <p className="text-muted-foreground">Nog geen toezichthouders toegevoegd.</p>
        ) : (
          <ul className="divide-y">
            {data.toezichthouders.map((z) => (
              <li key={z.id} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{z.naam}</p>
                  {z.notitie && <p className="truncate text-sm text-muted-foreground">{z.notitie}</p>}
                </div>
                {magBeheren && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11"
                    aria-label={`${z.naam} verwijderen`}
                    onClick={async () => {
                      try {
                        await verwijderToezichthouder(z.id)
                        toast.success(`${z.naam} verwijderd`)
                      } catch {
                        toast.error('Verwijderen lukte niet. Probeer het opnieuw.')
                      }
                    }}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {magBeheren && (
          <form onSubmit={toevoegen} className="flex flex-wrap items-end gap-3">
            <div className="min-w-48 flex-1 space-y-1.5">
              <Label htmlFor="tz-naam">Naam</Label>
              <Input id="tz-naam" value={naam} onChange={(e) => setNaam(e.target.value)} maxLength={80} />
            </div>
            <div className="min-w-48 flex-1 space-y-1.5">
              <Label htmlFor="tz-notitie">Notitie (optioneel)</Label>
              <Input
                id="tz-notitie"
                placeholder="Bijv. alleen op zondag"
                value={notitie}
                onChange={(e) => setNotitie(e.target.value)}
                maxLength={200}
              />
            </div>
            <Button type="submit" disabled={bezig || !naam.trim()}>
              Toevoegen
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

/** Tekst van de uitnodigingsmail (zelfde tekst via EmailJS of je eigen mailprogramma). */
function uitnodigingTekst(u: { naam: string; email: string }) {
  const adres = window.location.origin
  return {
    onderwerp: 'Uitnodiging Trainersapp Nat Utrecht',
    tekst: [
      `Hoi ${voornaam(u.naam)},`,
      '',
      'Je bent uitgenodigd voor de Trainersapp van Nat Utrecht: het rooster, je beschikbaarheid en het trainingslogboek op één plek.',
      '',
      `Ga naar ${adres} en kies "Inloggen met Google", met het Google-account van dit e-mailadres (${u.email}).`,
      '',
      'Geen Gmail? Je kunt gratis een Google-account maken met je eigen e-mailadres via https://accounts.google.com/signup (kies "Mijn huidige e-mailadres gebruiken").',
      '',
      'Groet,',
    ].join('\n'),
  }
}

async function mailUitnodiging(u: { naam: string; email: string }) {
  const { onderwerp, tekst } = uitnodigingTekst(u)
  await stuurMail({ aan: u.email, naam: u.naam, onderwerp, tekst })
}

/** Dezelfde mail vanuit je eigen mailprogramma (als EmailJS niet lukt). */
function uitnodigingMailto(u: { naam: string; email: string }) {
  const { onderwerp, tekst } = uitnodigingTekst(u)
  return `mailto:${encodeURIComponent(u.email)}?subject=${encodeURIComponent(onderwerp)}&body=${encodeURIComponent(tekst)}`
}

/** Na het uitnodigen: de mail gaat meteen via EmailJS; lukt dat niet, dan via je eigen mail. */
function UitnodigingVersturen({ u, onKlaar }: { u: { naam: string; email: string }; onKlaar: () => void }) {
  const [status, setStatus] = useState<'bezig' | 'verstuurd' | 'mislukt'>('bezig')
  useEffect(() => {
    let actueel = true
    mailUitnodiging(u).then(
      () => actueel && setStatus('verstuurd'),
      (err) => {
        console.error('Uitnodigingsmail mislukt', err)
        if (actueel) setStatus('mislukt')
      },
    )
    return () => {
      actueel = false
    }
  }, [u])

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>Uitnodiging klaargezet</DialogTitle>
        <DialogDescription>
          {voornaam(u.naam)} kan nu inloggen met het Google-account van {u.email}.
        </DialogDescription>
      </DialogHeader>
      <p role="status" className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm">
        {status === 'bezig' && (
          <>
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> Uitnodigingsmail versturen…
          </>
        )}
        {status === 'verstuurd' && (
          <>
            <Check className="size-4 text-nat-green" aria-hidden /> Uitnodigingsmail verstuurd naar {u.email}.
          </>
        )}
        {status === 'mislukt' && <>De mail kon niet automatisch worden verstuurd. Stuur hem vanuit je eigen mail.</>}
      </p>
      {status === 'mislukt' && (
        <Button asChild size="lg" className="w-full">
          <a href={uitnodigingMailto(u)} onClick={() => setTimeout(onKlaar, 300)}>
            <Mail aria-hidden /> Mail openen in je mailprogramma
          </a>
        </Button>
      )}
      <DialogFooter>
        <Button variant={status === 'verstuurd' ? 'default' : 'ghost'} onClick={onKlaar}>
          Sluiten
        </Button>
      </DialogFooter>
    </div>
  )
}

/** Oude namen van testtrainers → nieuwe namen (wens van 19 nov 2026). */
const NIEUWE_TESTNAMEN: Record<string, string> = {
  'Elke Rovers': 'Rita Jager',
  'Daphne Z': 'Daphne Kuilman',
  'David Y': 'David Micó Martinez',
}

function TesttrainersKaart() {
  const data = useAppData()
  const aantal = data.trainers.filter((t) => t.test).length
  const oud = data.trainers.filter((t) => t.test && NIEUWE_TESTNAMEN[t.naam])
  const [bezig, setBezig] = useState(false)

  async function uitvoeren(actie: () => Promise<void>, gelukt: string) {
    setBezig(true)
    try {
      await actie()
      toast.success(gelukt)
    } catch {
      toast.error('Dat lukte niet. Probeer het opnieuw.')
    } finally {
      setBezig(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <FlaskConical className="size-5 text-primary" aria-hidden /> Testtrainers
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Om de app uit te proberen: {TESTTRAINERS.length} testtrainers zonder account. Ze verschijnen in het team, het
          rooster en bij trainingen, maar kunnen niet inloggen.
        </p>
        {aantal === 0 ? (
          <Button
            variant="outline"
            disabled={bezig}
            onClick={() => uitvoeren(voegTesttrainersToe, `${TESTTRAINERS.length} testtrainers toegevoegd`)}
          >
            <FlaskConical aria-hidden /> Testtrainers toevoegen
          </Button>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm">{aantal} testtrainers in het team</span>
            {oud.length > 0 && (
              <Button
                disabled={bezig}
                onClick={() =>
                  uitvoeren(async () => {
                    for (const t of oud) {
                      const naam = NIEUWE_TESTNAMEN[t.naam]
                      await wijzigTrainer(t.id, { naam, initialen: initialenVan(naam) })
                    }
                  }, `${oud.length} namen bijgewerkt`)
                }
              >
                Namen bijwerken ({oud.map((t) => NIEUWE_TESTNAMEN[t.naam].split(' ')[0]).join(', ')})
              </Button>
            )}
            <Button
              variant="outline"
              disabled={bezig}
              onClick={() => uitvoeren(verwijderTesttrainers, 'Testtrainers verwijderd')}
            >
              Alle testtrainers verwijderen
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const uitnodigingSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email({ error: 'Vul een geldig e-mailadres in.' })),
  naam: z.string().trim().min(1, { error: 'Vul een naam in.' }).max(80),
  rol: z.enum(ALLE_ROLLEN as [TrainerRol, ...TrainerRol[]]),
  specialiteit: z.string().trim().max(120),
  kleur: z.string().regex(/^#[0-9a-fA-F]{6}$/),
})

function UitnodigenDialog({
  open,
  onOpenChange,
  ikBenCoordinator,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  ikBenCoordinator: boolean
}) {
  const data = useAppData()
  const [email, setEmail] = useState('')
  const [naam, setNaam] = useState('')
  const [rol, setRol] = useState<TrainerRol>('Trainer')
  const [specialiteit, setSpecialiteit] = useState('')
  const [kleur, setKleur] = useState<string>(TRAINER_KLEUREN[1].waarde)
  const [taken, setTaken] = useState<Taken>(GEEN_TAKEN)
  const [fouten, setFouten] = useState<Record<string, string>>({})
  const [bezig, setBezig] = useState(false)
  const [klaar, setKlaar] = useState<{ naam: string; email: string } | null>(null)

  function reset() {
    setEmail('')
    setNaam('')
    setRol('Trainer')
    setSpecialiteit('')
    setTaken(GEEN_TAKEN)
    setFouten({})
  }

  async function verstuur(e: FormEvent) {
    e.preventDefault()
    const res = uitnodigingSchema.safeParse({ email, naam, rol, specialiteit, kleur })
    if (!res.success) {
      const f: Record<string, string> = {}
      res.error.issues.forEach((i) => (f[String(i.path[0])] ??= i.message))
      setFouten(f)
      return
    }
    const u = res.data
    if (data.trainers.some((t) => t.email?.toLowerCase() === u.email)) {
      setFouten({ email: 'Dit adres hoort al bij een teamlid.' })
      return
    }
    if (data.uitnodigingen.some((x) => x.email === u.email)) {
      setFouten({ email: 'Voor dit adres staat al een uitnodiging open.' })
      return
    }
    setBezig(true)
    try {
      await nodigTrainerUit({ ...u, ...taken })
      // Toegang staat klaar; nu nog de mail (vanuit je eigen mailprogramma).
      setKlaar({ naam: u.naam, email: u.email })
      reset()
    } catch {
      setFouten({ algemeen: 'Opslaan lukte niet. Probeer het opnieuw.' })
    } finally {
      setBezig(false)
    }
  }

  const voorbeeld: Trainer = {
    id: 'voorbeeld',
    naam: naam || 'Nieuw teamlid',
    initialen: initialenVan(naam || 'Nieuw teamlid'),
    kleur,
    rol,
    specialiteit,
    ...taken,
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset()
          setKlaar(null)
        }
        onOpenChange(o)
      }}
    >
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        {klaar ? (
          <UitnodigingVersturen
            u={klaar}
            onKlaar={() => {
              setKlaar(null)
              onOpenChange(false)
            }}
          />
        ) : (
        <>
        <DialogHeader>
          <DialogTitle>Teamlid uitnodigen</DialogTitle>
          <DialogDescription>
            Alleen dit e-mailadres kan straks inloggen (met Google). Je collega krijgt meteen een uitnodigingsmail.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={verstuur} noValidate className="space-y-4">
          {fouten.algemeen && (
            <Alert variant="destructive">
              <AlertDescription>{fouten.algemeen}</AlertDescription>
            </Alert>
          )}
          <Veld id="u-email" label="E-mailadres" fout={fouten.email}>
            <Input
              id="u-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!fouten.email}
            />
          </Veld>
          <Veld id="u-naam" label="Naam" fout={fouten.naam}>
            <Input id="u-naam" value={naam} onChange={(e) => setNaam(e.target.value)} aria-invalid={!!fouten.naam} />
          </Veld>
          <Veld id="u-rol" label="Rol">
            <Select value={rol} onValueChange={(v) => setRol(v as TrainerRol)}>
              <SelectTrigger id="u-rol" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALLE_ROLLEN.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Veld>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Taken</legend>
            {TAKEN.filter((t) => ikBenCoordinator || !ALLEEN_COORDINATOR.includes(t)).map((taak) => (
              <div key={taak} className="flex min-h-11 items-center gap-3">
                <Checkbox
                  id={`u-${taak}`}
                  checked={taken[taak]}
                  onCheckedChange={(v) => setTaken((x) => ({ ...x, [taak]: v === true }))}
                />
                <Label htmlFor={`u-${taak}`}>{TAAK_LABELS[taak]}</Label>
              </div>
            ))}
          </fieldset>
          <Veld id="u-spec" label="Specialiteit (optioneel)">
            <Input
              id="u-spec"
              placeholder="Bijv. vlinderslag & starts"
              value={specialiteit}
              onChange={(e) => setSpecialiteit(e.target.value)}
            />
          </Veld>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Kleur</legend>
            <div className="flex items-center gap-4">
              <RadioGroup value={kleur} onValueChange={setKleur} className="flex flex-wrap gap-2" aria-label="Kleur">
                {TRAINER_KLEUREN.map((k) => (
                  <label key={k.waarde} className="cursor-pointer">
                    <RadioGroupItem value={k.waarde} className="peer sr-only" aria-label={k.naam} />
                    <span
                      aria-hidden
                      className={`block size-7 rounded-full ring-offset-2 ring-offset-background peer-focus-visible:ring-2 peer-focus-visible:ring-ring ${kleur === k.waarde ? 'ring-2 ring-foreground' : ''}`}
                      style={{ backgroundColor: k.waarde }}
                    />
                  </label>
                ))}
              </RadioGroup>
              <TrainerAvatar trainer={voorbeeld} size="md" />
            </div>
          </fieldset>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button type="submit" disabled={bezig}>
              Uitnodiging klaarzetten
            </Button>
          </DialogFooter>
        </form>
        </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Veld({ id, label, fout, children }: { id: string; label: string; fout?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {fout && <p className="text-sm text-destructive">{fout}</p>}
    </div>
  )
}
