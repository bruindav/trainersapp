// Fix: fix-1 — schermen rond inloggen (ontwerp: UI-agent)
import { useState, type FormEvent, type ReactNode } from 'react'
import { Loader2, Mail, RefreshCw, ShieldX } from 'lucide-react'
import { FirebaseError } from 'firebase/app'
import { toast } from 'sonner'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  annuleerLinkBevestigen,
  logInMetGoogle,
  logUit,
  richAppIn,
  rondEmailLinkAf,
  stuurInlogLink,
  type AuthStatus,
} from '@/data/auth'

const EMAIL_PATROON = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function foutCode(err: unknown) {
  return err instanceof FirebaseError ? err.code : ''
}

function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-nat-ink">
      <div className="nat-rainbow h-1" aria-hidden />
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
        <div className="flex items-center gap-3 text-white">
          <img src="/logo.svg" alt="" width={44} height={38} className="h-10 w-auto" />
          <span className="leading-tight">
            <span className="block text-base font-extrabold tracking-tight">Nat Utrecht</span>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-nat-yellow">
              Trainersapp
            </span>
          </span>
        </div>
        <Card className="w-full max-w-sm">{children}</Card>
      </div>
    </div>
  )
}

export function AuthSchermen({ status }: { status: Exclude<AuthStatus, { soort: 'ingelogd' }> }) {
  switch (status.soort) {
    case 'niet-geconfigureerd':
      return <NietGeconfigureerd />
    case 'laden':
      return <LaadScherm />
    case 'uitgelogd':
      return <Inloggen />
    case 'link-bevestigen':
      return <LinkBevestigen />
    case 'instellen':
      return <EersteKeerInstellen email={status.user.email ?? ''} naam={status.user.displayName ?? ''} user={status.user} />
    case 'geen-toegang':
      return <GeenToegang email={status.user.email ?? ''} />
    case 'fout':
      return <SyncFoutScherm />
  }
}

// --- 1. Inloggen --------------------------------------------------------------

function Inloggen() {
  const [email, setEmail] = useState('')
  const [veldFout, setVeldFout] = useState('')
  const [fout, setFout] = useState('')
  const [bezig, setBezig] = useState(false)
  const [verstuurdNaar, setVerstuurdNaar] = useState<string | null>(null)

  async function verstuur(e: FormEvent) {
    e.preventDefault()
    setFout('')
    const adres = email.trim()
    if (!EMAIL_PATROON.test(adres)) {
      setVeldFout('Vul een geldig e-mailadres in.')
      return
    }
    setVeldFout('')
    setBezig(true)
    try {
      await stuurInlogLink(adres)
      setVerstuurdNaar(adres)
    } catch {
      setFout('Versturen lukte niet. Controleer je verbinding en probeer het opnieuw.')
    } finally {
      setBezig(false)
    }
  }

  async function google() {
    setFout('')
    try {
      await logInMetGoogle()
    } catch (err) {
      const code = foutCode(err)
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return
      if (code === 'auth/popup-blocked') {
        setFout('Je browser blokkeerde het Google-venster. Sta pop-ups toe of gebruik de inloglink.')
        return
      }
      setFout('Inloggen met Google lukte niet. Probeer het opnieuw.')
    }
  }

  if (verstuurdNaar) {
    return (
      <AuthLayout>
        <CardHeader className="items-center text-center">
          <Mail className="mx-auto size-10 text-primary" aria-hidden />
          <CardTitle>
            <h1 className="text-xl font-bold">Check je mail</h1>
          </CardTitle>
          <CardDescription>
            We hebben een inloglink gestuurd naar <strong className="text-foreground">{verstuurdNaar}</strong>. Open
            de link op dit apparaat. Geen mail gezien? Kijk ook in je spam.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="ghost" className="w-full" onClick={() => setVerstuurdNaar(null)}>
            Ander e-mailadres gebruiken
          </Button>
        </CardContent>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <CardHeader>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Alleen voor trainers</p>
        <CardTitle>
          <h1 className="text-xl font-bold">Inloggen bij de Trainersapp</h1>
        </CardTitle>
        <CardDescription>Je krijgt een inloglink per mail. Een wachtwoord heb je niet nodig.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {fout && (
          <Alert variant="destructive">
            <AlertDescription>{fout}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={verstuur} noValidate className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="inlog-email">E-mailadres</Label>
            <Input
              id="inlog-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="naam@voorbeeld.nl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!veldFout}
              aria-describedby={veldFout ? 'inlog-email-fout' : undefined}
              className="h-11"
            />
            {veldFout && (
              <p id="inlog-email-fout" className="text-sm text-destructive">
                {veldFout}
              </p>
            )}
          </div>
          <Button type="submit" size="lg" className="h-11 w-full rounded-full" disabled={bezig}>
            {bezig ? (
              <>
                <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden /> Link versturen…
              </>
            ) : (
              'Stuur mij een inloglink'
            )}
          </Button>
        </form>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Separator className="flex-1" />
          of
          <Separator className="flex-1" />
        </div>
        <Button variant="outline" size="lg" className="h-11 w-full rounded-full" onClick={google}>
          <GoogleLogo /> Inloggen met Google
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Nog geen toegang? Vraag de hoofdtrainer om een uitnodiging.
        </p>
      </CardContent>
    </AuthLayout>
  )
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.55 10.55 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  )
}

// --- 2. Link op ander apparaat -------------------------------------------------

function LinkBevestigen() {
  const [email, setEmail] = useState('')
  const [fout, setFout] = useState('')
  const [verlopen, setVerlopen] = useState(false)
  const [bezig, setBezig] = useState(false)

  async function bevestig(e: FormEvent) {
    e.preventDefault()
    if (!EMAIL_PATROON.test(email.trim())) {
      setFout('Vul een geldig e-mailadres in.')
      return
    }
    setBezig(true)
    setFout('')
    try {
      await rondEmailLinkAf(email)
    } catch (err) {
      const code = foutCode(err)
      if (code === 'auth/invalid-email') {
        setFout('Dit adres hoort niet bij deze inloglink.')
      } else {
        setVerlopen(true)
        setFout('Deze inloglink is verlopen of al gebruikt. Vraag een nieuwe aan.')
      }
    } finally {
      setBezig(false)
    }
  }

  return (
    <AuthLayout>
      <CardHeader>
        <CardTitle>
          <h1 className="text-xl font-bold">Bevestig je e-mailadres</h1>
        </CardTitle>
        <CardDescription>
          Je opent de inloglink in een andere browser of op een ander apparaat. Vul ter controle het e-mailadres in
          waarop je de link kreeg.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {fout && (
          <Alert variant="destructive">
            <AlertDescription>{fout}</AlertDescription>
          </Alert>
        )}
        {verlopen ? (
          <Button className="h-11 w-full rounded-full" onClick={annuleerLinkBevestigen}>
            Nieuwe link aanvragen
          </Button>
        ) : (
          <form onSubmit={bevestig} noValidate className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="bevestig-email">E-mailadres</Label>
              <Input
                id="bevestig-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            </div>
            <Button type="submit" className="h-11 w-full rounded-full" disabled={bezig}>
              {bezig && <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden />} Inloggen
            </Button>
          </form>
        )}
      </CardContent>
    </AuthLayout>
  )
}

// --- 3. Eerste keer instellen -------------------------------------------------

function EersteKeerInstellen({ email, naam: googleNaam, user }: { email: string; naam: string; user: Parameters<typeof richAppIn>[0] }) {
  const [naam, setNaam] = useState(googleNaam)
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState('')

  async function inrichten(e: FormEvent) {
    e.preventDefault()
    if (!naam.trim()) {
      setFout('Vul je naam in.')
      return
    }
    setBezig(true)
    setFout('')
    try {
      await richAppIn(user, naam)
      toast.success('App ingericht', { description: 'Nodig nu je trainers uit via Team.' })
    } catch (err) {
      console.error('Inrichten', err)
      setFout('Inrichten lukte niet. Alleen de beoogde hoofdtrainer kan de app inrichten; vraag anders de hoofdtrainer om een uitnodiging.')
      setBezig(false)
    }
  }

  return (
    <AuthLayout>
      <CardHeader>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Welkom</p>
        <CardTitle>
          <h1 className="text-xl font-bold">De app is nog niet ingericht</h1>
        </CardTitle>
        <CardDescription>
          Er is nog geen hoofdtrainer. Ben jij dat? Dan richt je de app nu in en nodig je daarna je collega's uit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {fout && (
          <Alert variant="destructive">
            <AlertDescription>{fout}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={inrichten} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="setup-naam">Je naam</Label>
            <Input id="setup-naam" autoComplete="name" value={naam} onChange={(e) => setNaam(e.target.value)} className="h-11" />
          </div>
          <p className="text-sm text-muted-foreground">
            Je logt in als <strong className="text-foreground">{email}</strong>
          </p>
          <Button type="submit" className="h-11 w-full rounded-full" disabled={bezig}>
            {bezig ? (
              <>
                <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden /> App inrichten…
              </>
            ) : (
              'Ik ben de hoofdtrainer, richt de app in'
            )}
          </Button>
        </form>
        <Button variant="ghost" className="w-full" onClick={() => logUit()}>
          Uitloggen
        </Button>
      </CardContent>
    </AuthLayout>
  )
}

// --- 4. Geen toegang ----------------------------------------------------------

function GeenToegang({ email }: { email: string }) {
  return (
    <AuthLayout>
      <CardHeader>
        <ShieldX className="size-10 text-destructive" aria-hidden />
        <CardTitle>
          <h1 className="text-xl font-bold">Geen toegang</h1>
        </CardTitle>
        <CardDescription>
          Je bent ingelogd als <strong className="text-foreground">{email}</strong>, maar dit adres heeft geen
          uitnodiging voor de Trainersapp. Vraag de hoofdtrainer om je uit te nodigen, of log in met een ander adres.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="h-11 w-full rounded-full" onClick={() => logUit()}>
          Uitloggen en ander adres gebruiken
        </Button>
      </CardContent>
    </AuthLayout>
  )
}

// --- 5. Laden / niet geconfigureerd / fout ------------------------------------

export function LaadScherm() {
  return (
    <div aria-busy="true" className="min-h-screen">
      <span className="sr-only">Laden…</span>
      <div className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-content items-center gap-4 px-4 sm:px-6">
          <Skeleton className="h-9 w-32" />
          <div className="ml-6 hidden gap-2 md:flex">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-full" />
            ))}
          </div>
          <Skeleton className="ml-auto size-8 rounded-full" />
        </div>
        <div className="nat-rainbow h-1" aria-hidden />
      </div>
      <div className="bg-nat-ink">
        <div className="mx-auto max-w-content space-y-3 px-4 pt-10 pb-14 sm:px-6">
          <Skeleton className="h-3 w-24 bg-white/15" />
          <Skeleton className="h-9 w-72 bg-white/15" />
          <Skeleton className="h-4 w-96 max-w-full bg-white/15" />
        </div>
      </div>
    </div>
  )
}

function NietGeconfigureerd() {
  return (
    <AuthLayout>
      <CardContent className="pt-6">
        {import.meta.env.DEV ? (
          <Alert>
            <AlertTitle>Firebase is niet geconfigureerd</AlertTitle>
            <AlertDescription>
              Vul <code>src/firebase-config.ts</code> in met de web-config uit de Firebase-console, of start lokaal met{' '}
              <code>pnpm dev:emulator</code>. Zie README.
            </AlertDescription>
          </Alert>
        ) : (
          <p className="text-center text-muted-foreground">
            De app is tijdelijk niet beschikbaar. Probeer het later opnieuw.
          </p>
        )}
      </CardContent>
    </AuthLayout>
  )
}

export function SyncFoutScherm() {
  return (
    <AuthLayout>
      <CardHeader>
        <CardTitle>
          <h1 className="text-xl font-bold">De gegevens konden niet geladen worden</h1>
        </CardTitle>
        <CardDescription>Controleer je verbinding en probeer het opnieuw.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button className="h-11 w-full rounded-full" onClick={() => window.location.reload()}>
          <RefreshCw aria-hidden /> Opnieuw proberen
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => logUit()}>
          Uitloggen
        </Button>
      </CardContent>
    </AuthLayout>
  )
}
