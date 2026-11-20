// Fix: fix-27 — demo-account: demo-trainer in de store en een gele banner
// Fix: fix-20 — help, privacy en disclaimer ook zonder inloggen
// Fix: fix-3 — uitnodigingen laden voor wie het team beheert
// Fix: fix-1 — SPA-root: inloggen via Firebase en data uit Firestore
import { Outlet, createRootRoute, useLocation } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Eye } from 'lucide-react'

import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { NotFoundPage } from '@/components/error-pages'
import { AppShell } from '@/components/app-shell'
import { OpenbareLayout } from '@/components/info-pagina'
import {
  AuthSchermen,
  LaadScherm,
  SyncFoutScherm,
} from '@/components/auth-schermen'
import { startAuth, useAuthStatus } from '@/data/auth'
import { startSync, useSyncStatus } from '@/data/store'
import { magTeamBeheren } from '@/data/fixtures'

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
})

function RootLayout() {
  useEffect(() => {
    startAuth()
  }, [])

  return (
    <TooltipProvider>
      <AuthGate />
      <Toaster />
    </TooltipProvider>
  )
}

const OPENBAAR = new Set(['/help', '/privacy', '/disclaimer'])

function AuthGate() {
  const auth = useAuthStatus()
  const pad = useLocation({ select: (l) => l.pathname })
  const uid = auth.soort === 'ingelogd' ? auth.trainer.id : null
  const magTeam = auth.soort === 'ingelogd' && magTeamBeheren(auth.trainer)
  const demo =
    auth.soort === 'ingelogd' && auth.trainer.demo ? auth.trainer : undefined

  useEffect(() => {
    if (!uid) return
    return startSync(uid, magTeam, demo)
    // demo is per uid steeds hetzelfde object; uid volstaat als afhankelijkheid.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, magTeam])

  if (auth.soort !== 'ingelogd') {
    // Help, privacy en disclaimer zijn ook zonder inloggen te lezen.
    if (OPENBAAR.has(pad)) {
      return (
        <OpenbareLayout>
          <Outlet />
        </OpenbareLayout>
      )
    }
    return <AuthSchermen status={auth} />
  }
  return <IngelogdeApp demo={!!demo} />
}

function IngelogdeApp({ demo }: { demo: boolean }) {
  const sync = useSyncStatus()
  if (sync === 'laden') return <LaadScherm />
  if (sync === 'fout') return <SyncFoutScherm />
  return (
    <AppShell>
      {demo && <DemoBanner />}
      <Outlet />
    </AppShell>
  )
}

function DemoBanner() {
  return (
    <div className="mx-auto max-w-content px-4 pt-4 sm:px-6">
      <div
        role="status"
        className="flex items-start gap-2 rounded-lg border border-nat-yellow bg-nat-yellow/25 px-3 py-2 text-sm text-nat-ink"
      >
        <Eye className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          <strong>Je bekijkt de app met het demo-account.</strong> Kijk gerust
          rond; opslaan kan niet. Feedback geven kan wel. Wil je echt meedoen?
          Vraag de coördinator om een uitnodiging.
        </p>
      </div>
    </div>
  )
}
