// Fix: fix-20 — help, privacy en disclaimer ook zonder inloggen
// Fix: fix-3 — uitnodigingen laden voor wie het team beheert
// Fix: fix-1 — SPA-root: inloggen via Firebase en data uit Firestore
import { Outlet, createRootRoute, useLocation } from '@tanstack/react-router'
import { useEffect } from 'react'

import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { NotFoundPage } from '@/components/error-pages'
import { AppShell } from '@/components/app-shell'
import { OpenbareLayout } from '@/components/info-pagina'
import { AuthSchermen, LaadScherm, SyncFoutScherm } from '@/components/auth-schermen'
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

  useEffect(() => {
    if (!uid) return
    return startSync(uid, magTeam)
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
  return <IngelogdeApp />
}

function IngelogdeApp() {
  const sync = useSyncStatus()
  if (sync === 'laden') return <LaadScherm />
  if (sync === 'fout') return <SyncFoutScherm />
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
