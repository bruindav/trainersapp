// Fix: fix-20 — opmaak voor help, privacy en disclaimer; ook te lezen zonder in te loggen
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { PageHeader } from '@/components/app-shell'
import { VERSIE } from '@/versie'

export function InfoPagina({
  eyebrow,
  titel,
  intro,
  bijgewerkt,
  children,
}: {
  eyebrow: string
  titel: string
  intro?: ReactNode
  bijgewerkt?: string
  children: ReactNode
}) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={titel} description={intro} />
      <article className="mx-auto max-w-reading space-y-8 px-4 py-10 sm:px-6 [&_a]:font-semibold [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_h2]:text-xl [&_h2]:font-extrabold [&_li]:ml-5 [&_li]:list-disc [&_p]:leading-relaxed [&_section]:space-y-3 [&_ul]:space-y-1.5">
        {children}
        <p className="border-t pt-6 text-sm text-muted-foreground">
          {bijgewerkt && <>Laatst bijgewerkt: {bijgewerkt} · </>}
          Versie van de app: <strong className="text-foreground">{VERSIE}</strong>
        </p>
      </article>
    </>
  )
}

/** Links naar help, privacy en disclaimer (footer en inlogscherm). */
export function InfoLinks({ className = '', gewoneLinks = false }: { className?: string; gewoneLinks?: boolean }) {
  const items = [
    ['/help', 'Help'],
    ['/privacy', 'Privacy'],
    ['/disclaimer', 'Disclaimer'],
  ] as const
  return (
    <nav aria-label="Informatie" className={`flex flex-wrap gap-x-4 gap-y-1 ${className}`}>
      {items.map(([to, label]) =>
        // Buiten de router (bijv. in tests van het inlogscherm) gewone links.
        gewoneLinks ? (
          <a key={to} href={to} className="underline-offset-2 hover:underline">
            {label}
          </a>
        ) : (
          <Link key={to} to={to} className="underline-offset-2 hover:underline">
            {label}
          </Link>
        ),
      )}
    </nav>
  )
}

/** Het digidave-merkje: wie de app maakt, met het fix-nummer. */
export function GemaaktDoor({ className = '' }: { className?: string }) {
  return (
    <a
      href="https://bruindav.github.io/DigidaveStore/"
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-2 underline-offset-2 hover:underline ${className}`}
    >
      <img src="/img/digidave.png" alt="" width={24} height={24} className="size-6" />
      <span>
        gemaakt door <span className="font-semibold">digidave</span> · {VERSIE}
      </span>
    </a>
  )
}

/** Eenvoudige omlijsting voor wie (nog) niet is ingelogd. */
export function OpenbareLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-content items-center justify-between gap-4 px-4 sm:px-6">
          <a href="/" className="flex items-center gap-3">
            <img src="/logo.svg" alt="" width={44} height={38} className="h-9 w-auto" />
            <span className="leading-tight">
              <span className="block text-[15px] font-extrabold tracking-tight">Nat Utrecht</span>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Trainersapp</span>
            </span>
          </a>
          <a href="/" className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
            Inloggen
          </a>
        </div>
        <div className="nat-rainbow h-1" aria-hidden />
      </header>
      <main className="flex-1">{children}</main>
      <footer className="bg-nat-ink text-white/80">
        <div className="mx-auto flex max-w-content flex-col gap-3 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <InfoLinks />
          <GemaaktDoor />
        </div>
      </footer>
    </div>
  )
}
