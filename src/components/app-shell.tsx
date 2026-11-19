// Fix: fix-11 — open-plek-balk onder de kop
// Fix: fix-5 — navigatie-item Periodes
// Fix: fix-3 — rol met taken tonen
// Fix: fix-1 — accountmenu (Firebase) i.p.v. trainerwisselaar; navigatie-item Team
import { Link } from '@tanstack/react-router'
import { CalendarCheck, CalendarRange, ClipboardList, LayoutDashboard, LogOut, Menu, Users, Waves } from 'lucide-react'
import { toast } from 'sonner'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { logUit } from '@/data/auth'
import { trainerById, useAppData } from '@/data/store'
import { rolLabel } from '@/data/fixtures'
import { OpenPlekBalk } from './rooster-acties'
import { TrainerAvatar } from './trainer-avatar'

const NAV = [
  { to: '/', label: 'Overzicht', icon: LayoutDashboard },
  { to: '/rooster', label: 'Mijn rooster', icon: Waves },
  { to: '/periodes', label: 'Periodes', icon: CalendarCheck },
  { to: '/jaarplan', label: 'Jaarplan', icon: CalendarRange },
  { to: '/trainingen', label: 'Trainingen', icon: ClipboardList },
  { to: '/team', label: 'Team', icon: Users },
] as const

export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-3 ${className}`} aria-label="NatUtrecht Trainersapp, naar overzicht">
      <img src="/logo.svg" alt="" width={44} height={38} className="h-9 w-auto" />
      <span className="leading-tight">
        <span className="block text-[15px] font-extrabold tracking-tight text-foreground">Nat Utrecht</span>
        <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Trainersapp</span>
      </span>
    </Link>
  )
}

async function uitloggen() {
  try {
    await logUit()
  } catch {
    toast.error('Uitloggen lukte niet')
  }
}

function useIk() {
  const data = useAppData()
  return trainerById(data.huidigeTrainerId)
}

function AccountMenu() {
  const ik = useIk()
  if (!ik) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 gap-2 px-2" aria-label={`Accountmenu van ${ik.naam}`}>
          <TrainerAvatar trainer={ik} size="sm" />
          <span className="hidden text-left text-sm leading-tight lg:block">
            <span className="block font-semibold">{ik.naam.split(' ')[0]}</span>
            <span className="block text-xs text-muted-foreground">{rolLabel(ik)}</span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-3 font-normal">
          <TrainerAvatar trainer={ik} size="md" />
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-semibold">{ik.naam}</span>
            <span className="block text-xs text-muted-foreground">{rolLabel(ik)}</span>
            {ik.email && <span className="block truncate text-xs text-muted-foreground">{ik.email}</span>}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/team">
            <Users aria-hidden /> Team
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => uitloggen()}>
          <LogOut aria-hidden /> Uitloggen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function MobielAccount() {
  const ik = useIk()
  if (!ik) return null
  return (
    <div className="mt-auto space-y-3 px-4 pb-6">
      <Separator />
      <div className="flex items-center gap-3">
        <TrainerAvatar trainer={ik} size="md" />
        <span className="min-w-0 leading-tight">
          <span className="block truncate font-semibold">{ik.naam}</span>
          {ik.email && <span className="block truncate text-xs text-muted-foreground">{ik.email}</span>}
        </span>
      </div>
      <Button variant="outline" className="h-11 w-full" onClick={() => uitloggen()}>
        <LogOut aria-hidden /> Uitloggen
      </Button>
    </div>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
        <div className="mx-auto flex h-16 max-w-content items-center gap-4 px-4 sm:px-6">
          <Logo />
          <nav aria-label="Hoofdmenu" className="ml-6 hidden items-center gap-1 md:flex">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === '/' }}
                className="flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground motion-reduce:transition-none data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <AccountMenu />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu openen">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="flex w-72 flex-col">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                  <SheetDescription>Ga naar een onderdeel van de trainersapp.</SheetDescription>
                </SheetHeader>
                <nav aria-label="Mobiel menu" className="flex flex-col gap-1 px-4">
                  {NAV.map(({ to, label, icon: Icon }) => (
                    <SheetClose asChild key={to}>
                      <Link
                        to={to}
                        activeOptions={{ exact: to === '/' }}
                        className="flex items-center gap-3 rounded-lg px-3 py-3 font-semibold hover:bg-accent data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
                      >
                        <Icon className="size-5" aria-hidden />
                        {label}
                      </Link>
                    </SheetClose>
                  ))}
                </nav>
                <MobielAccount />
              </SheetContent>
            </Sheet>
          </div>
        </div>
        <div className="nat-rainbow h-1" aria-hidden />
      </header>
      <OpenPlekBalk />

      <main className="flex-1">{children}</main>

      <footer className="mt-16 bg-nat-ink text-white/80">
        <div className="nat-rainbow h-1" aria-hidden />
        <div className="mx-auto flex max-w-content flex-col gap-2 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            <span className="font-bold text-white">Nat Utrecht</span> · trainersomgeving · zwembad De Kwakel
          </p>
          <p className="text-white/60">Alleen voor trainers van de vereniging</p>
        </div>
      </footer>
    </div>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string
  title: string
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="relative overflow-hidden bg-nat-ink text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, transparent 0 calc(16.66% - 2px), #fff calc(16.66% - 2px) 16.66%)',
        }}
      />
      <div className="relative mx-auto flex max-w-content flex-col gap-6 px-4 pt-10 pb-14 sm:px-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-nat-yellow">{eyebrow}</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
          {description && <div className="mt-3 text-white/75">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <div className="nat-wave h-3 bg-background" aria-hidden />
    </div>
  )
}
