// Fix: fix-37 — Trainersoverleg: afspraken per onderwerp, open acties en de overleggen met notulen
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronRight, Eye, Paperclip, Plus } from 'lucide-react'
import { useState } from 'react'

import { PageHeader } from '@/components/app-shell'
import { AfsprakenBlok, OpenActiesBlok } from '@/components/overleg-onderdelen'
import { OverlegFormulier } from '@/components/overleg-formulier'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useAppData } from '@/data/store'
import { formatLong } from '@/lib/dates'

export const Route = createFileRoute('/overleg')({
  head: () => ({
    meta: [{ title: 'Trainersoverleg · NatUtrecht Trainersapp' }],
  }),
  component: OverlegPagina,
})

function OverlegPagina() {
  const data = useAppData()
  const [nieuw, setNieuw] = useState(false)
  const leeg = data.overleggen.length === 0

  return (
    <>
      <PageHeader
        eyebrow="Team"
        title="Trainersoverleg"
        description={
          <p>
            De afspraken die we samen maken, de acties die nog open staan en de
            notulen van elk overleg.
          </p>
        }
        actions={
          <Button onClick={() => setNieuw(true)}>
            <Plus /> Overleg vastleggen
          </Button>
        }
      />
      <div className="mx-auto max-w-content space-y-8 px-4 py-8 sm:px-6">
        {!leeg && (
          <section aria-labelledby="overleggen-kop">
            <h2 id="overleggen-kop" className="mb-3 text-lg font-black">
              Overleggen
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {data.overleggen.map((o) => {
                const open = o.punten.reduce(
                  (n, p) => n + p.acties.filter((a) => !a.klaar).length,
                  0,
                )
                return (
                  <li key={o.id}>
                    <Link
                      to="/overleg/$overlegId"
                      params={{ overlegId: o.id }}
                      className="flex items-center gap-3 rounded-2xl border bg-card p-4 transition-colors outline-none hover:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-muted-foreground first-letter:uppercase">
                          {formatLong(o.datum)}
                        </p>
                        <p className="truncate font-black">{o.titel}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {o.status === 'concept' ? (
                            <Badge
                              variant="outline"
                              className="border-nat-orange text-nat-orange"
                            >
                              Concept
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Goedgekeurd</Badge>
                          )}
                          <span>
                            {o.punten.length}{' '}
                            {o.punten.length === 1 ? 'punt' : 'punten'} ·{' '}
                            {o.afspraken.length}{' '}
                            {o.afspraken.length === 1
                              ? 'afspraak'
                              : 'afspraken'}
                            {open > 0 &&
                              ` · ${open} open ${open === 1 ? 'actie' : 'acties'}`}
                          </span>
                          {o.bijlage && (
                            <Paperclip
                              className="size-3.5"
                              aria-label="met notulen als bestand"
                            />
                          )}
                        </p>
                      </div>
                      <ChevronRight
                        className="size-5 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
        {leeg ? (
          <div className="rounded-2xl border-2 border-dashed p-6 text-center">
            <p className="font-bold">Nog geen overleggen vastgelegd.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Leg een overleg vast met de notulen, de acties en de afspraken.
              Benieuwd hoe dat eruitziet?
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link
                to="/overleg/$overlegId"
                params={{ overlegId: 'voorbeeld' }}
              >
                <Eye /> Bekijk een voorbeeld
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
            <AfsprakenBlok overleggen={data.overleggen} />
            <OpenActiesBlok overleggen={data.overleggen} />
          </div>
        )}
      </div>

      <Dialog open={nieuw} onOpenChange={setNieuw}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
          {nieuw && (
            <OverlegFormulier bewerk={null} onKlaar={() => setNieuw(false)} />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
