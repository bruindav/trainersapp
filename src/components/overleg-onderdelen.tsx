// Fix: fix-37 — trainersoverleg: afspraken per onderwerp, open acties en de inhoud van een overleg
import { Link } from '@tanstack/react-router'
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Handshake,
  ListTodo,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import type { Overleg } from '@/data/overleg'
import { afsprakenPerOnderwerp, openActies } from '@/data/overleg'
import { formatShort } from '@/lib/dates'
import { cn } from '@/lib/utils'

/** Klein label met de datum van het overleg waar iets vandaan komt. */
function Bron({
  overlegId,
  datum,
  concept,
}: {
  overlegId: string
  datum: string
  concept?: boolean
}) {
  return (
    <Link
      to="/overleg/$overlegId"
      params={{ overlegId }}
      className="whitespace-nowrap text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
    >
      overleg {formatShort(datum)}
      {concept && ' · concept'}
    </Link>
  )
}

/** Alle afspraken, per onderwerp. Met `alleen` beperkt tot één overleg (zonder bronlabel). */
export function AfsprakenBlok({
  overleggen,
  alleen,
}: {
  overleggen: Overleg[]
  alleen?: boolean
}) {
  const groepen = afsprakenPerOnderwerp(overleggen)
  return (
    <section
      aria-labelledby="afspraken-kop"
      className="rounded-2xl border-2 border-primary/30 bg-card p-5"
    >
      <h2
        id="afspraken-kop"
        className="flex items-center gap-2 text-lg font-black"
      >
        <Handshake className="size-5 text-primary" aria-hidden /> Afspraken
      </h2>
      {groepen.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Nog geen afspraken vastgelegd.
        </p>
      ) : (
        <div className="mt-3 space-y-4">
          {groepen.map((g) => (
            <div key={g.onderwerp}>
              <h3 className="text-xs font-extrabold tracking-wider text-primary uppercase">
                {g.onderwerp}
              </h3>
              <ul className="mt-1 divide-y">
                {g.afspraken.map((a) => (
                  <li
                    key={`${a.overlegId}-${a.id}`}
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2 text-sm"
                  >
                    <span className="min-w-0 flex-1 basis-60">{a.tekst}</span>
                    {!alleen && (
                      <Bron
                        overlegId={a.overlegId}
                        datum={a.overlegDatum}
                        concept={a.concept}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export function OpenActiesBlok({ overleggen }: { overleggen: Overleg[] }) {
  const acties = openActies(overleggen)
  return (
    <section
      aria-labelledby="acties-kop"
      className="rounded-2xl border bg-card p-5"
    >
      <h2
        id="acties-kop"
        className="flex items-center gap-2 text-lg font-black"
      >
        <ListTodo className="size-5 text-primary" aria-hidden /> Open acties
        {acties.length > 0 && (
          <Badge variant="secondary">{acties.length}</Badge>
        )}
      </h2>
      {acties.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Geen open acties.</p>
      ) : (
        <ul className="mt-2 divide-y">
          {acties.map((a) => (
            <li key={`${a.overlegId}-${a.id}`} className="py-2 text-sm">
              <p>
                <strong>{a.wie || 'Nog niemand'}:</strong> {a.wat}
              </p>
              <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                <span>{a.punt}</span>·
                <Bron overlegId={a.overlegId} datum={a.overlegDatum} />
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** De notulen van één overleg: agendapunten met acties en belangrijke data. */
export function OverlegInhoud({
  overleg: o,
  onActie,
}: {
  overleg: Overleg
  /** Als gegeven, kunnen acties worden afgevinkt. */
  onActie?: (actieId: string, klaar: boolean) => void
}) {
  return (
    <div className="space-y-5">
      {o.punten.map((p, i) => (
        <section
          key={p.id}
          aria-labelledby={`punt-${p.id}`}
          className="rounded-2xl border bg-card p-5"
        >
          <h3 id={`punt-${p.id}`} className="text-base font-black">
            <span className="mr-2 text-primary">{i + 1}.</span>
            {p.titel}
          </h3>
          {p.tekst.trim() && (
            <div className="mt-2 space-y-2 text-sm leading-relaxed">
              {p.tekst
                .split(/\n\s*\n/)
                .filter((x) => x.trim())
                .map((alinea, j) => (
                  <p key={j} className="whitespace-pre-line">
                    {alinea.trim()}
                  </p>
                ))}
            </div>
          )}
          {p.acties.length > 0 && (
            <ul
              className="mt-3 space-y-1.5 rounded-lg bg-muted/60 p-3"
              aria-label="Acties"
            >
              {p.acties.map((a) => {
                const Icoon = a.klaar ? CheckCircle2 : Circle
                const inhoud = (
                  <>
                    <Icoon
                      className={cn(
                        'mt-0.5 size-4 shrink-0',
                        a.klaar ? 'text-nat-green' : 'text-primary',
                      )}
                      aria-hidden
                    />
                    <span
                      className={cn(
                        'text-left',
                        a.klaar && 'text-muted-foreground line-through',
                      )}
                    >
                      <strong>Actie {a.wie}:</strong> {a.wat}
                    </span>
                  </>
                )
                return (
                  <li key={a.id} className="text-sm">
                    {onActie ? (
                      <button
                        type="button"
                        aria-pressed={a.klaar}
                        onClick={() => onActie(a.id, !a.klaar)}
                        className="flex w-full items-start gap-2 rounded-md p-0.5 outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        {inhoud}
                        <span className="sr-only">
                          {a.klaar
                            ? '(klaar, klik om weer open te zetten)'
                            : '(klik om af te vinken)'}
                        </span>
                      </button>
                    ) : (
                      <span className="flex items-start gap-2">{inhoud}</span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      ))}

      {o.belangrijkeData.length > 0 && (
        <section
          aria-labelledby="data-kop"
          className="rounded-2xl border bg-card p-5"
        >
          <h3
            id="data-kop"
            className="flex items-center gap-2 text-base font-black"
          >
            <CalendarDays className="size-5 text-primary" aria-hidden />{' '}
            Belangrijke data
          </h3>
          <ul className="mt-2 divide-y text-sm">
            {o.belangrijkeData.map((d, i) => (
              <li key={i} className="flex gap-3 py-1.5">
                <span className="w-20 shrink-0 font-bold">
                  {d.datum ? formatShort(d.datum) : '—'}
                </span>
                <span>{d.tekst}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
