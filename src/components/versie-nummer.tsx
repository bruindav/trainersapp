// Fix: fix-38 — fixnummer met verborgen testoverzicht (lang drukken, of Enter/spatie ingedrukt houden)
import { ExternalLink, FlaskConical, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { VERSIE } from '@/versie'

import type { FixTests } from '../../scripts/testoverzicht'

/** Hoe lang je moet drukken voordat het testoverzicht opengaat. */
export const LANG_DRUKKEN_MS = 800

/**
 * Het fixnummer. Lang drukken (muis, vinger, of Enter/spatie ingedrukt houden)
 * opent het testoverzicht; een gewone klik doet niets.
 */
export function VersieNummer({
  className,
  children,
}: {
  className?: string
  children?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const start = () => {
    stop()
    timer.current = setTimeout(() => setOpen(true), LANG_DRUKKEN_MS)
  }
  const stop = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }
  useEffect(() => stop, [])

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        aria-label={`Versie ${VERSIE}`}
        data-testid="versie"
        className={cn(
          'cursor-default rounded select-none [-webkit-touch-callout:none] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
          className,
        )}
        onPointerDown={start}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
            e.preventDefault()
            start()
          }
        }}
        onKeyUp={stop}
      >
        {children ?? VERSIE}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          {open && <Testoverzicht />}
        </DialogContent>
      </Dialog>
    </>
  )
}

const KLEUR: Record<FixTests['bestanden'][number]['soort'], string> = {
  'Playwright (end-to-end)': 'border-nat-green text-nat-green',
  'Firestore-regels': 'border-nat-orange text-nat-orange',
  'Unit/component (Vitest)': 'border-nat-blue text-nat-blue',
}

function Testoverzicht() {
  const [fixes, setFixes] = useState<FixTests[] | null>(null)
  const [fout, setFout] = useState(false)
  useEffect(() => {
    import('virtual:testoverzicht').then(
      (m) => setFixes(m.default),
      () => setFout(true),
    )
  }, [])

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-xl font-black">
          <FlaskConical className="size-5 text-primary" aria-hidden />{' '}
          Testoverzicht
        </DialogTitle>
        <DialogDescription>
          Per fix de tests die zijn gemaakt of aangepast. Je bekijkt nu{' '}
          <strong>{VERSIE}</strong>.
        </DialogDescription>
      </DialogHeader>
      {fout ? (
        <p role="alert" className="text-sm text-destructive">
          Het testoverzicht kon niet worden geladen.
        </p>
      ) : !fixes ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2
            className="size-4 animate-spin motion-reduce:animate-none"
            aria-hidden
          />{' '}
          Laden…
        </p>
      ) : fixes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Geen gegevens (deze versie is gebouwd zonder git-geschiedenis).
        </p>
      ) : (
        <ol className="space-y-4">
          {fixes.map((f) => (
            <li
              key={f.fix}
              className={cn(
                'rounded-xl border p-3',
                f.fix === VERSIE && 'border-2 border-primary',
              )}
            >
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-black">{f.fix}</span>
                <span className="text-xs text-muted-foreground">{f.datum}</span>
                {f.fix === VERSIE && <Badge>deze versie</Badge>}
              </p>
              <p className="text-sm text-muted-foreground">{f.onderwerp}</p>
              <ul className="mt-2 space-y-2">
                {f.bestanden.map((b) => (
                  <li key={b.pad} className="text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={KLEUR[b.soort]}>
                        {b.soort}
                      </Badge>
                      <a
                        href={b.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-xs break-all underline-offset-2 hover:underline"
                      >
                        {b.pad}
                        <ExternalLink className="size-3 shrink-0" aria-hidden />
                      </a>
                      <span className="text-xs text-muted-foreground">
                        {b.status}
                      </span>
                    </div>
                    {b.tests.length > 0 ? (
                      <ul className="mt-1 list-disc pl-5 text-xs">
                        {b.tests.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    ) : (
                      b.status !== 'verwijderd' && (
                        <p className="mt-1 pl-1 text-xs text-muted-foreground">
                          Alleen testgegevens of opzet aangepast.
                        </p>
                      )
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}
