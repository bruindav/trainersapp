// Fix: fix-37 — één trainersoverleg: notulen, acties, afspraken, belangrijke data; goedkeuren door de coördinator
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  BadgeCheck,
  FileText,
  Loader2,
  Pencil,
  Trash2,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/app-shell'
import { AfsprakenBlok, OverlegInhoud } from '@/components/overleg-onderdelen'
import { OverlegFormulier } from '@/components/overleg-formulier'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { magOverlegBewerken } from '@/data/overleg'
import { OVERLEG_VOORBEELD } from '@/data/overleg-voorbeeld'
import {
  keurOverlegGoed,
  trainerById,
  useAppData,
  verwijderOverleg,
  zetActieKlaar,
} from '@/data/store'
import { openBijlage } from '@/lib/bijlage'
import { formatLong } from '@/lib/dates'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/overleg_/$overlegId')({
  head: () => ({
    meta: [{ title: 'Trainersoverleg · NatUtrecht Trainersapp' }],
  }),
  component: OverlegDetail,
})

function OverlegDetail() {
  const { overlegId } = Route.useParams()
  const data = useAppData()
  const navigate = useNavigate()
  const [bewerken, setBewerken] = useState(false)
  const [zeker, setZeker] = useState(false)
  const [openen, setOpenen] = useState(false)

  const isVoorbeeld =
    overlegId === 'voorbeeld' &&
    !data.overleggen.some((o) => o.id === 'voorbeeld')
  const o = isVoorbeeld
    ? OVERLEG_VOORBEELD
    : data.overleggen.find((x) => x.id === overlegId)
  const ik = trainerById(data.huidigeTrainerId)

  if (!o) {
    return (
      <div className="mx-auto max-w-content px-4 py-16 text-center sm:px-6">
        <p className="font-bold">Dit overleg bestaat niet (meer).</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/overleg">
            <ArrowLeft /> Naar trainersoverleg
          </Link>
        </Button>
      </div>
    )
  }

  const magBewerken = !isVoorbeeld && magOverlegBewerken(o, ik)
  const magGoedkeuren =
    !isVoorbeeld && o.status === 'concept' && !!ik?.coordinator

  return (
    <>
      <PageHeader
        eyebrow={
          isVoorbeeld ? 'Trainersoverleg · voorbeeld' : 'Trainersoverleg'
        }
        title={o.titel}
        description={
          <p className="first-letter:uppercase">{formatLong(o.datum)}</p>
        }
        actions={
          <>
            <Button asChild variant="secondary">
              <Link to="/overleg">
                <ArrowLeft /> Overleg
              </Link>
            </Button>
            {magBewerken && (
              <Button onClick={() => setBewerken(true)}>
                <Pencil /> Wijzigen
              </Button>
            )}
          </>
        }
      />
      <div className="mx-auto max-w-reading space-y-6 px-4 py-8 sm:px-6">
        {isVoorbeeld && (
          <p role="note" className="rounded-xl bg-nat-yellow/25 p-4 text-sm">
            <strong>Dit is een voorbeeld</strong> op basis van echte notulen,
            met verzonnen namen. Het wordt niet opgeslagen.
          </p>
        )}

        <div
          className={cn(
            'flex flex-wrap items-center gap-3 rounded-xl p-4 text-sm',
            o.status === 'concept'
              ? 'border-2 border-nat-orange/60 bg-nat-orange/10'
              : 'bg-muted',
          )}
        >
          <BadgeCheck
            className={cn(
              'size-5 shrink-0',
              o.status === 'concept' ? 'text-nat-orange' : 'text-nat-green',
            )}
            aria-hidden
          />
          <p className="min-w-0 flex-1">
            {o.status === 'concept' ? (
              <>
                <strong>Concept.</strong> Deze notulen zijn nog niet
                goedgekeurd.
              </>
            ) : (
              <>
                <strong>Goedgekeurd.</strong> De afspraken gelden.
              </>
            )}
          </p>
          {magGoedkeuren && (
            <Button
              size="sm"
              onClick={() => {
                keurOverlegGoed(o.id)
                toast.success('Notulen goedgekeurd')
              }}
            >
              Notulen goedkeuren
            </Button>
          )}
        </div>

        {(o.aanwezig || o.gasten) && (
          <div className="flex gap-3 text-sm">
            <Users
              className="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden
            />
            <div>
              {o.aanwezig && (
                <p>
                  <strong>Aanwezig:</strong> {o.aanwezig}
                </p>
              )}
              {o.gasten && (
                <p>
                  <strong>Gast:</strong> {o.gasten}
                </p>
              )}
            </div>
          </div>
        )}

        {o.bijlage && (
          <div className="flex items-center gap-3 rounded-lg border border-dashed p-3 text-sm">
            <FileText className="size-4 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0 flex-1 truncate font-medium">
              {o.bijlage}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={openen}
              onClick={async () => {
                setOpenen(true)
                try {
                  if (!(await openBijlage(o.id, 'overlegBijlagen')))
                    toast('Het bestand is niet (meer) bewaard.')
                } catch {
                  toast.error(
                    'Het bestand kon niet worden geopend. Controleer je verbinding.',
                  )
                } finally {
                  setOpenen(false)
                }
              }}
            >
              {openen && (
                <Loader2
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden
                />
              )}{' '}
              Openen
            </Button>
          </div>
        )}

        {o.afspraken.length > 0 && <AfsprakenBlok overleggen={[o]} alleen />}

        <OverlegInhoud
          overleg={o}
          onActie={
            magBewerken ? (id, klaar) => zetActieKlaar(o, id, klaar) : undefined
          }
        />

        {!isVoorbeeld &&
          (ik?.coordinator ||
            (o.status === 'concept' && o.aangemaaktDoor === ik?.id)) && (
            <div className="space-y-2 border-t pt-6">
              <Button
                variant={zeker ? 'destructive' : 'outline'}
                className={cn(!zeker && 'text-destructive')}
                onClick={() => {
                  if (!zeker) return setZeker(true)
                  verwijderOverleg(o.id)
                  toast('Overleg verwijderd')
                  void navigate({ to: '/overleg' })
                }}
              >
                <Trash2 />{' '}
                {zeker ? 'Ja, overleg verwijderen' : 'Overleg verwijderen'}
              </Button>
              {zeker && (
                <p role="alert" className="text-sm text-destructive">
                  Weet je het zeker? De notulen, acties en afspraken van dit
                  overleg verdwijnen.
                </p>
              )}
            </div>
          )}
      </div>

      <Dialog open={bewerken} onOpenChange={setBewerken}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
          {bewerken && (
            <OverlegFormulier bewerk={o} onKlaar={() => setBewerken(false)} />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
