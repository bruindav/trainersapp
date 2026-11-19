// Fix: fix-9 — inklapbare kaart; onthoudt per apparaat of hij open of dicht stond
import { ChevronDown } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function InklapbareKaart({
  id,
  titel,
  omschrijving,
  icoon,
  standaardOpen = true,
  children,
  className,
}: {
  /** Sleutel om de open/dicht-stand te onthouden. */
  id: string
  titel: ReactNode
  omschrijving?: ReactNode
  icoon?: ReactNode
  standaardOpen?: boolean
  children: ReactNode
  className?: string
}) {
  const sleutel = `trainersapp:kaart:${id}`
  // De app is een SPA zonder server-rendering, dus browseropslag mag direct gelezen worden.
  const [open, setOpen] = useState(() => {
    try {
      const v = window.localStorage.getItem(sleutel)
      if (v === '1' || v === '0') return v === '1'
    } catch {
      // geen opslag beschikbaar
    }
    return standaardOpen
  })
  const inhoudId = useId()

  function wissel() {
    setOpen((o) => {
      try {
        window.localStorage.setItem(sleutel, o ? '0' : '1')
      } catch {
        // negeren
      }
      return !o
    })
  }

  return (
    <Card className={cn('gap-0 py-0', className)}>
      <h2 className="m-0">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={inhoudId}
          onClick={wissel}
          className="flex w-full items-start gap-3 rounded-xl px-6 py-5 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {icoon && <span className="mt-0.5 text-primary">{icoon}</span>}
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-bold">{titel}</span>
            {omschrijving && <span className="mt-1 block text-sm font-normal text-muted-foreground">{omschrijving}</span>}
          </span>
          <ChevronDown
            className={cn('mt-1 size-5 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none', open && 'rotate-180')}
            aria-hidden
          />
        </button>
      </h2>
      <div id={inhoudId} hidden={!open}>
        <CardContent className="pb-6">{children}</CardContent>
      </div>
    </Card>
  )
}
