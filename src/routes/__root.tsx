// Fix: fix-1 — SPA-root: inloggen via Firebase en data uit Firestore
import { Outlet, createRootRoute } from '@tanstack/react-router'
import { useEffect } from 'react'

import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { NotFoundPage } from '@/components/error-pages'
import { AppShell } from '@/components/app-shell'
import { AuthSchermen, LaadScherm, SyncFoutScherm } from '@/components/auth-schermen'
import { startAuth, useAuthStatus } from '@/data/auth'
import { startSync, useSyncStatus } from '@/data/store'

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

function AuthGate() {
  const auth = useAuthStatus()
  const uid = auth.soort === 'ingelogd' ? auth.trainer.id : null
  const isHoofd = auth.soort === 'ingelogd' && auth.trainer.rol === 'Hoofdtrainer'

  useEffect(() => {
    if (!uid) return
    return startSync(uid, isHoofd)
  }, [uid, isHoofd])

  if (auth.soort !== 'ingelogd') return <AuthSchermen status={auth} />
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
