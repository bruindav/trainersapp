// Fix: fix-21 — wisselen tussen de trainingsopbouw (nieuw) en het seizoensoverzicht (de eerste werkwijze)
import { Link } from '@tanstack/react-router'

import { cn } from '@/lib/utils'

export function JaarplanWissel({ actief }: { actief: 'opbouw' | 'seizoen' }) {
  const item = (aan: boolean) =>
    cn(
      'inline-flex min-h-10 items-center rounded-full px-4 text-sm font-bold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
      aan ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
    )
  return (
    <nav aria-label="Weergave jaarplan" className="mx-auto max-w-content px-4 pt-6 sm:px-6">
      <div className="inline-flex flex-wrap gap-1 rounded-full bg-muted p-1">
        <Link to="/jaarplan" className={item(actief === 'opbouw')} aria-current={actief === 'opbouw' ? 'page' : undefined}>
          Trainingsopbouw
        </Link>
        <Link
          to="/jaarplan/seizoensoverzicht"
          className={item(actief === 'seizoen')}
          aria-current={actief === 'seizoen' ? 'page' : undefined}
        >
          Seizoensoverzicht
        </Link>
      </div>
    </nav>
  )
}
