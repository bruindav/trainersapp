// Fix: fix-16 — feedback lezen en afhandelen (alleen coördinator)
import { createFileRoute } from '@tanstack/react-router'
import { Check, ExternalLink, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/app-shell'
import { TrainerAvatar } from '@/components/trainer-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useFeedback, verwijderFeedback, zetFeedbackStatus, type Feedback } from '@/data/feedback'
import { trainerById, useAppData } from '@/data/store'
import { formatShort, toISODate } from '@/lib/dates'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/feedback')({
  head: () => ({ meta: [{ title: 'Feedback · NatUtrecht Trainersapp' }] }),
  component: FeedbackPagina,
})

function wanneer(iso: string) {
  const d = new Date(iso)
  return `${formatShort(toISODate(d))} ${d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`
}

function FeedbackPagina() {
  const data = useAppData()
  const ik = trainerById(data.huidigeTrainerId)
  const magLezen = !!ik?.coordinator
  const { lijst, fout } = useFeedback(magLezen)
  const [toon, setToon] = useState<'nieuw' | 'afgehandeld'>('nieuw')
  const [groot, setGroot] = useState<Feedback | null>(null)

  if (!magLezen) {
    return (
      <>
        <PageHeader eyebrow="Feedback" title="Feedback" />
        <div className="mx-auto max-w-content px-4 py-8 sm:px-6">
          <p className="text-muted-foreground">Alleen de coördinator kan de feedback lezen. Zelf feedback geven kan met de knop rechtsonder.</p>
        </div>
      </>
    )
  }

  const nieuw = lijst?.filter((f) => f.status === 'nieuw') ?? []
  const zichtbaar = lijst?.filter((f) => f.status === toon) ?? []

  async function actie(f: () => Promise<void>, melding: string) {
    try {
      await f()
      toast.success(melding)
    } catch {
      toast.error('Dat lukte niet. Probeer het opnieuw.')
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Feedback"
        title="Feedback"
        description={<p>Wat trainers via de feedbackknop hebben gestuurd, met een screenshot van het scherm waar ze waren.</p>}
      />
      <div className="mx-auto max-w-content space-y-4 px-4 py-8 sm:px-6">
        <div role="tablist" aria-label="Status" className="inline-flex rounded-full bg-muted p-1">
          {(
            [
              ['nieuw', `Nieuw (${nieuw.length})`],
              ['afgehandeld', `Afgehandeld (${(lijst?.length ?? 0) - nieuw.length})`],
            ] as const
          ).map(([w, label]) => (
            <Button
              key={w}
              role="tab"
              aria-selected={toon === w}
              size="sm"
              variant={toon === w ? 'default' : 'ghost'}
              className="h-9 rounded-full"
              onClick={() => setToon(w)}
            >
              {label}
            </Button>
          ))}
        </div>

        {fout && <p className="text-destructive">De feedback kon niet worden geladen.</p>}
        {!lijst && !fout && (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}
        {lijst && zichtbaar.length === 0 && (
          <p className="text-muted-foreground">{toon === 'nieuw' ? 'Geen nieuwe feedback.' : 'Nog niets afgehandeld.'}</p>
        )}

        <ul className="space-y-3">
          {zichtbaar.map((f) => {
            const tr = trainerById(f.door)
            return (
              <li key={f.id}>
                <Card>
                  <CardContent className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {tr && <TrainerAvatar trainer={tr} size="sm" />}
                        <span className="font-semibold">{tr?.naam ?? f.naam}</span>
                        <span className="text-sm text-muted-foreground">{wanneer(f.op)}</span>
                        {f.status === 'nieuw' && <Badge>nieuw</Badge>}
                      </div>
                      <p className="whitespace-pre-wrap">{f.tekst}</p>
                      <p className="text-xs text-muted-foreground">
                        Scherm:{' '}
                        {/^\/(?!\/)/.test(f.pagina) ? (
                          <a href={f.pagina} className="underline underline-offset-2">
                            {f.pagina}
                          </a>
                        ) : (
                          f.pagina
                        )}
                        {f.breedte > 0 && ` · ${f.breedte < 640 ? 'mobiel' : 'groot scherm'} (${f.breedte}px)`}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {f.status === 'nieuw' ? (
                          <Button size="sm" onClick={() => actie(() => zetFeedbackStatus(f.id, 'afgehandeld'), 'Afgehandeld')}>
                            <Check aria-hidden /> Afgehandeld
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => actie(() => zetFeedbackStatus(f.id, 'nieuw'), 'Weer op nieuw gezet')}>
                            <RotateCcw aria-hidden /> Terug naar nieuw
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.confirm('Deze feedback verwijderen?') && actie(() => verwijderFeedback(f.id), 'Verwijderd')}
                        >
                          <Trash2 aria-hidden /> Verwijderen
                        </Button>
                      </div>
                    </div>
                    {f.screenshot ? (
                      <button
                        type="button"
                        onClick={() => setGroot(f)}
                        className="group relative overflow-hidden rounded-lg border outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        aria-label="Screenshot groot bekijken"
                      >
                        <img src={f.screenshot} alt="" className="max-h-48 w-full object-cover object-top" />
                        <span className="absolute right-1 bottom-1 rounded-full bg-background/90 p-1">
                          <ExternalLink className="size-3.5" aria-hidden />
                        </span>
                      </button>
                    ) : (
                      <p className={cn('self-center text-sm text-muted-foreground')}>Geen screenshot</p>
                    )}
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      </div>

      <Dialog open={!!groot} onOpenChange={(o) => !o && setGroot(null)}>
        <DialogContent className="max-h-[95svh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Screenshot</DialogTitle>
            <DialogDescription>{groot && `${groot.naam} · ${wanneer(groot.op)} · ${groot.pagina}`}</DialogDescription>
          </DialogHeader>
          {groot && <img src={groot.screenshot} alt={`Screenshot van ${groot.pagina}`} className="w-full rounded-lg border" />}
        </DialogContent>
      </Dialog>
    </>
  )
}
