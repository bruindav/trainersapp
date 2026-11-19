// Fix: fix-1 — Team: trainers bekijken; hoofdtrainer nodigt uit en beheert rollen
import { createFileRoute } from '@tanstack/react-router'
import { Mail, MoreHorizontal, UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'

import { PageHeader } from '@/components/app-shell'
import { TrainerAvatar } from '@/components/trainer-avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ALLE_ROLLEN,
  TRAINER_KLEUREN,
  type Trainer,
  type TrainerRol,
  type Uitnodiging,
} from '@/data/fixtures'
import {
  initialenVan,
  nodigTrainerUit,
  trainerById,
  trekUitnodigingIn,
  useAppData,
  verwijderTrainer,
  wijzigRol,
} from '@/data/store'
import { formatShort } from '@/lib/dates'

export const Route = createFileRoute('/team')({
  component: TeamPagina,
})

function voornaam(naam: string) {
  return naam.split(' ')[0]
}

function RolBadge({ rol }: { rol: TrainerRol }) {
  return <Badge variant={rol === 'Hoofdtrainer' ? 'default' : 'outline'}>{rol}</Badge>
}

function TeamPagina() {
  const data = useAppData()
  const ik = trainerById(data.huidigeTrainerId)!
  const isHoofd = ik.rol === 'Hoofdtrainer'
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
          isHoofd
            ? `${data.trainers.length} trainers · ${aantalUitnodigingen} openstaande ${aantalUitnodigingen === 1 ? 'uitnodiging' : 'uitnodigingen'}`
            : `${data.trainers.length} trainers`
        }
        actions={
          isHoofd && (
            <Button size="lg" className="w-full rounded-full sm:w-auto" onClick={() => setUitnodigen(true)}>
              <UserPlus aria-hidden /> Trainer uitnodigen
            </Button>
          )
        }
      />

      <div className="mx-auto max-w-content space-y-6 px-4 py-8 sm:px-6">
        {!isHoofd && (
          <Alert>
            <AlertDescription>Alleen de hoofdtrainer kan het team wijzigen.</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>
              <h2 className="text-lg font-bold">Trainers</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {data.trainers.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <TrainerAvatar trainer={t} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {t.naam}
                      {t.id === ik.id && <span className="text-sm font-normal text-muted-foreground">(jij)</span>}
                      <RolBadge rol={t.rol} />
                    </p>
                    {t.specialiteit && <p className="truncate text-sm text-muted-foreground">{t.specialiteit}</p>}
                  </div>
                  {isHoofd && (
                    <TrainerActies trainer={t} isIk={t.id === ik.id} onVerwijder={() => setTeVerwijderen(t)} />
                  )}
                </li>
              ))}
            </ul>
            {isHoofd && data.trainers.length <= 1 && (
              <div className="mt-4 rounded-lg border border-dashed p-6 text-center">
                <p className="text-muted-foreground">Je bent nog de enige. Nodig je eerste collega uit.</p>
                <Button className="mt-3" onClick={() => setUitnodigen(true)}>
                  <UserPlus aria-hidden /> Trainer uitnodigen
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {isHoofd && (
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
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 font-semibold">
                          {u.naam} <RolBadge rol={u.rol} />
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {u.email} · uitgenodigd op {formatShort(u.uitgenodigdOp)}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setInTeTrekken(u)}>
                        Intrekken
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {isHoofd && <UitnodigenDialog open={uitnodigen} onOpenChange={setUitnodigen} />}

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

function TrainerActies({ trainer, isIk, onVerwijder }: { trainer: Trainer; isIk: boolean; onVerwijder: () => void }) {
  async function zetRol(rol: string) {
    if (rol === trainer.rol) return
    try {
      await wijzigRol(trainer.id, rol as TrainerRol)
      toast.success(`${voornaam(trainer.naam)} is nu ${rol}`)
    } catch {
      toast.error('Rol wijzigen lukte niet. Probeer het opnieuw.')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Acties voor ${trainer.naam}`}>
          <MoreHorizontal aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isIk ? (
          <DropdownMenuItem disabled>Je kunt je eigen rol niet wijzigen.</DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Rol wijzigen</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup value={trainer.rol} onValueChange={zetRol}>
                  {ALLE_ROLLEN.map((r) => (
                    <DropdownMenuRadioItem key={r} value={r}>
                      {r}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onVerwijder}>
              Verwijderen uit team
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const uitnodigingSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email({ error: 'Vul een geldig e-mailadres in.' })),
  naam: z.string().trim().min(1, { error: 'Vul een naam in.' }).max(80),
  rol: z.enum(ALLE_ROLLEN as [TrainerRol, ...TrainerRol[]]),
  specialiteit: z.string().trim().max(120),
  kleur: z.string().regex(/^#[0-9a-fA-F]{6}$/),
})

function UitnodigenDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const data = useAppData()
  const [email, setEmail] = useState('')
  const [naam, setNaam] = useState('')
  const [rol, setRol] = useState<TrainerRol>('Trainer')
  const [specialiteit, setSpecialiteit] = useState('')
  const [kleur, setKleur] = useState<string>(TRAINER_KLEUREN[1].waarde)
  const [fouten, setFouten] = useState<Record<string, string>>({})
  const [bezig, setBezig] = useState(false)

  function reset() {
    setEmail('')
    setNaam('')
    setRol('Trainer')
    setSpecialiteit('')
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
      setFouten({ email: 'Dit adres hoort al bij een trainer.' })
      return
    }
    if (data.uitnodigingen.some((x) => x.email === u.email)) {
      setFouten({ email: 'Voor dit adres staat al een uitnodiging open.' })
      return
    }
    setBezig(true)
    try {
      await nodigTrainerUit(u)
      toast.success(`Uitnodiging klaargezet voor ${u.naam}`, {
        description: `${voornaam(u.naam)} kan nu inloggen op ${window.location.host} met ${u.email}.`,
      })
      reset()
      onOpenChange(false)
    } catch {
      setFouten({ algemeen: 'Opslaan lukte niet. Probeer het opnieuw.' })
    } finally {
      setBezig(false)
    }
  }

  const voorbeeld: Trainer = {
    id: 'voorbeeld',
    naam: naam || 'Nieuwe trainer',
    initialen: initialenVan(naam || 'Nieuwe trainer'),
    kleur,
    rol,
    specialiteit,
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Trainer uitnodigen</DialogTitle>
          <DialogDescription>
            Alleen dit e-mailadres kan straks inloggen. De app verstuurt zelf geen mail: laat je collega weten dat
            hij of zij kan inloggen op {window.location.host}.
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
      </DialogContent>
    </Dialog>
  )
}

function Veld({ id, label, fout, children }: { id: string; label: string; fout?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {fout && <p className="text-sm text-destructive">{fout}</p>}
    </div>
  )
}
