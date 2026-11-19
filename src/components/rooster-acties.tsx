// Fix: fix-11 — open-plek-balk en "Ik kan niet" (vrijgeven of een collega vragen)
import { Link } from '@tanstack/react-router'
import { AlertTriangle, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { TrainerAvatar } from '@/components/trainer-avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { geeftTraining } from '@/data/fixtures'
import {
  DAGEN_KORT,
  dagVan,
  kanNietOp,
  type PeriodeTraining,
} from '@/data/rooster'
import {
  geefPlekVrij,
  neemPlekOver,
  trainerById,
  useAppData,
  vraagCollega,
} from '@/data/store'
import {
  gepubliceerdeTrainingen,
  kanOvernemen,
  staatIngeroosterd,
  type GeroosterdeTraining,
} from '@/data/wijzigingen'
import { addDays, daysBetween, formatShort, todayISO } from '@/lib/dates'
import { cn } from '@/lib/utils'

/** "zo 24 jan 12:00" */
export function trainingKort(t: PeriodeTraining) {
  return `${DAGEN_KORT[dagVan(t.datum)]} ${formatShort(t.datum)} ${t.start}`
}

export function wanneer(datum: string) {
  const d = daysBetween(todayISO(), datum)
  if (d <= 0) return 'vandaag'
  if (d === 1) return 'morgen'
  return `over ${d} dagen`
}

/** Foutmelding die past bij een geweigerde roosterwijziging. */
function meldFout(err: unknown) {
  console.error(err)
  toast.error('Dat lukte niet', {
    description:
      'Misschien was iemand je net voor. Het rooster is bijgewerkt; probeer het opnieuw.',
  })
}

export async function overnemen(g: GeroosterdeTraining) {
  try {
    await neemPlekOver(g.periode.id, g.training.key, trainingKort(g.training))
    toast.success(`Top! Jij staat nu op ${trainingKort(g.training)}`)
  } catch (err) {
    meldFout(err)
  }
}

/** Rode balk bovenaan voor iedereen zolang er de komende 2 weken een plek open is. */
export function OpenPlekBalk() {
  const data = useAppData()
  const ik = trainerById(data.huidigeTrainerId)
  const vandaag = todayISO()
  const grens = addDays(vandaag, 14)
  const alle = gepubliceerdeTrainingen(data).filter(
    (g) => g.training.datum >= vandaag && g.training.datum <= grens,
  )
  const open = alle.filter((g) => g.open > 0)
  const geenToezicht = ik?.coordinator ? alle.filter((g) => !g.toezichtOk) : []
  const [bezig, setBezig] = useState(false)
  if (!ik || (open.length === 0 && geenToezicht.length === 0)) return null
  const eerste = open[0]

  return (
    <div role="region" aria-label="Open plekken">
      {eerste && (
        <div className="bg-primary text-primary-foreground">
          <div className="mx-auto flex max-w-content flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
            <UserPlus className="size-5 shrink-0" aria-hidden />
            <p className="min-w-0 flex-1 basis-[calc(100%-2.5rem)] text-sm sm:basis-auto">
              <strong className="text-base">
                Nog geen trainer: {trainingKort(eerste.training)}
              </strong>{' '}
              <span className="opacity-90">
                · {wanneer(eerste.training.datum)}
                {open.length > 1 &&
                  ` · en nog ${open.length - 1} open ${open.length === 2 ? 'plek' : 'plekken'}`}
              </span>
            </p>
            <span className="ml-9 flex gap-2 sm:ml-0">
              {kanOvernemen(eerste, ik) && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-full font-bold"
                  disabled={bezig}
                  onClick={async () => {
                    setBezig(true)
                    await overnemen(eerste)
                    setBezig(false)
                  }}
                >
                  Ik neem hem
                </Button>
              )}
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="rounded-full text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
              >
                <Link to="/rooster">Bekijk</Link>
              </Button>
            </span>
          </div>
        </div>
      )}
      {geenToezicht.length > 0 && (
        <div className="bg-nat-yellow/40">
          <div className="mx-auto flex max-w-content flex-wrap items-center gap-3 px-4 py-2 text-sm sm:px-6">
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            <span className="flex-1">
              <strong>Geen toezichthouder:</strong>{' '}
              {geenToezicht
                .slice(0, 3)
                .map((g) => trainingKort(g.training))
                .join(', ')}
              {geenToezicht.length > 3 && ` en nog ${geenToezicht.length - 3}`}
            </span>
            <Link
              to="/periodes/$periodeId/indelen"
              params={{ periodeId: geenToezicht[0].periode.id }}
              className="font-semibold underline underline-offset-2"
            >
              Regelen
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

const KEUZE_TEKST: Record<string, string> = {
  graag: 'graag',
  kan: 'als het moet',
  nee: 'nee',
  onbekend: 'niet ingevuld',
}
const KEUZE_VOLGORDE: Record<string, number> = {
  graag: 0,
  kan: 1,
  onbekend: 2,
  nee: 3,
}

/** "Ik kan niet": plek vrijgeven of een collega vragen om over te nemen / te ruilen. */
export function KanNietDialog({
  g,
  onClose,
}: {
  g: GeroosterdeTraining
  onClose: () => void
}) {
  const data = useAppData()
  const ikId = data.huidigeTrainerId
  const [keuze, setKeuze] = useState<'vrij' | 'collega'>('vrij')
  const [collega, setCollega] = useState('')
  const [terug, setTerug] = useState('geen')
  const [bericht, setBericht] = useState('')
  const [bezig, setBezig] = useState(false)
  const besch = data.beschikbaarheid[g.periode.id] ?? {}
  const t = g.training

  const collegas = data.trainers
    .filter(
      (x) => geeftTraining(x) && x.id !== ikId && !staatIngeroosterd(g, x.id),
    )
    .map((x) => {
      const b = besch[x.id]
      const k = kanNietOp(b, t.datum)
        ? 'nee'
        : (b?.keuzes[t.keuzeSleutel] ?? 'onbekend')
      return { x, k }
    })
    .sort(
      (a, b) =>
        KEUZE_VOLGORDE[a.k] - KEUZE_VOLGORDE[b.k] ||
        a.x.naam.localeCompare(b.x.naam, 'nl'),
    )

  // Trainingen van de gekozen collega waar ik niet al op sta, voor een ruil.
  const vandaag = todayISO()
  const terugOpties = collega
    ? gepubliceerdeTrainingen(data).filter(
        (x) =>
          x.periode.id === g.periode.id &&
          x.training.datum >= vandaag &&
          staatIngeroosterd(x, collega) &&
          !staatIngeroosterd(x, ikId),
      )
    : []
  const collegaNaam = trainerById(collega)?.naam.split(' ')[0] ?? 'je collega'

  async function bevestig() {
    setBezig(true)
    try {
      if (keuze === 'vrij') {
        await geefPlekVrij(g.periode.id, t.key, trainingKort(t))
        toast.success('Je plek is vrijgegeven', {
          description: 'Iedereen ziet nu de open plek en kan hem overnemen.',
        })
      } else {
        await vraagCollega({
          periodeId: g.periode.id,
          naar: collega,
          vanKey: t.key,
          terugKey: terug === 'geen' ? null : terug,
          bericht,
        })
        toast.success(`Verzoek verstuurd aan ${collegaNaam}`, {
          description: 'Het rooster verandert pas als die "ja" zegt.',
        })
      }
      onClose()
    } catch (err) {
      meldFout(err)
    } finally {
      setBezig(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Je kunt {trainingKort(t)} niet?</DialogTitle>
          <DialogDescription>
            Kies wat je wilt doen. De coördinator ziet de wijziging terug.
          </DialogDescription>
        </DialogHeader>

        <div
          role="radiogroup"
          aria-label="Wat wil je doen"
          className="grid gap-2"
        >
          {(
            [
              [
                'vrij',
                'Plek vrijgeven',
                'Iedereen ziet de open plek en kan hem overnemen.',
              ],
              [
                'collega',
                'Een collega vragen',
                'Overnemen of ruilen; het rooster verandert pas na zijn of haar "ja".',
              ],
            ] as const
          ).map(([waarde, titel, uitleg]) => (
            <button
              key={waarde}
              type="button"
              role="radio"
              aria-checked={keuze === waarde}
              onClick={() => setKeuze(waarde)}
              className={cn(
                'rounded-xl border p-3 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                keuze === waarde
                  ? 'border-primary bg-accent ring-1 ring-primary'
                  : 'hover:bg-accent',
              )}
            >
              <span className="block font-bold">{titel}</span>
              <span className="block text-sm text-muted-foreground">
                {uitleg}
              </span>
            </button>
          ))}
        </div>

        {keuze === 'collega' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-sm font-medium" id="collega-label">
                Wie wil je vragen?
              </p>
              <ul
                className="max-h-64 space-y-1 overflow-y-auto"
                role="radiogroup"
                aria-labelledby="collega-label"
              >
                {collegas.map(({ x, k }) => (
                  <li key={x.id}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={collega === x.id}
                      onClick={() => {
                        setCollega(x.id)
                        setTerug('geen')
                      }}
                      className={cn(
                        'flex min-h-11 w-full items-center gap-3 rounded-lg border px-3 py-1.5 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                        collega === x.id
                          ? 'border-primary bg-accent'
                          : 'hover:bg-accent',
                      )}
                    >
                      <TrainerAvatar trainer={x} size="sm" />
                      <span className="flex-1 font-semibold">{x.naam}</span>
                      <span className="text-xs text-muted-foreground">
                        {KEUZE_TEKST[k]}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            {collega && (
              <div className="space-y-1.5">
                <Label htmlFor="terug">Ruilen?</Label>
                <Select value={terug} onValueChange={setTerug}>
                  <SelectTrigger id="terug" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geen">
                      Nee, {collegaNaam} neemt alleen over
                    </SelectItem>
                    {terugOpties.map((x) => (
                      <SelectItem key={x.training.key} value={x.training.key}>
                        Ja, ik neem {trainingKort(x.training)} van {collegaNaam}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="bericht">Bericht (optioneel)</Label>
              <Textarea
                id="bericht"
                rows={2}
                maxLength={300}
                placeholder="Bijv. sorry, ik heb een verjaardag"
                value={bericht}
                onChange={(e) => setBericht(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" onClick={onClose}>
            Annuleren
          </Button>
          <Button
            disabled={bezig || (keuze === 'collega' && !collega)}
            onClick={bevestig}
          >
            {keuze === 'vrij'
              ? 'Plek vrijgeven'
              : `Verzoek sturen aan ${collegaNaam}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
