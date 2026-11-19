<!-- Fix: fix-10 — indelen -->
<!-- Fix: fix-7 — beschikbaarheid op eigen pagina, feestdagen -->
<!-- Fix: fix-5 — roosterperiodes en beschikbaarheid -->
<!-- Fix: fix-3 — rollen en taken; nieuw roosterontwerp -->
<!-- Fix: fix-1 — bijgewerkt voor Firebase (Auth, Firestore, Hosting) -->
# AGENTS.md

<!-- Fix: fix-15 — ritme voor vaste trainers -->
<!-- Fix: fix-12 — vaste trainers en geldigheidsperiode per moment -->
<!-- Fix: fix-11 — Mijn rooster, ruilen, wijzigingslog -->

This document describes the project for developers and AI agents working on this codebase.

## Project Overview

**NatUtrecht Trainersapp**: a Dutch-language app for the ~8 trainers of swim club Nat Utrecht. It covers the trainer roster (who coaches which group at which session), the season plan (jaarplan) with publish flow, and a shared training log. The UI copy is Dutch; code identifiers in `src/data` are Dutch too (`trainer`, `sessie`, `groep`, `periode`, …).

**Current state: milestones 1–3 of [PLAN.md](PLAN.md).** The app is a static SPA on Firebase Hosting. Data lives in Firestore and is synced live into a client store (`src/data/store.ts`); login is Firebase Auth (email link + Google) with invite-only access. **Continue from PLAN.md at milestone 4.**

### Working agreements (from the project owner)

- Always start from the latest `main` of `github.com/bruindav/trainersapp`.
- Every change goes on a new branch `fix-N` (numbered upwards). Put `Fix: fix-N` in a comment in every changed file where comments are allowed.
- The owner reviews; after his approval the fix branch is merged into `main` (which deploys).
- Specialist agents live in `.claude/agents/`: `ontwerp` (functional design), `bouw` (secure code + rules), `ui` (screen design).

### Tech Stack

| Layer         | Technology                                          |
| ------------- | --------------------------------------------------- |
| Framework     | Vite SPA                                            |
| Frontend      | React 19, TanStack Router (file-based)              |
| Backend       | Firebase Auth + Firestore (rules in `firestore.rules`) |
| Build         | Vite 8                                              |
| Styling       | Tailwind CSS 4, theme variables in `src/styles.css` |
| UI Components | shadcn/ui (Radix UI + Tailwind)                     |
| Toasts        | sonner                                              |
| Icons         | lucide-react                                        |
| Language      | TypeScript 6.0 (strict mode)                        |
| Deployment    | Firebase Hosting via GitHub Actions (`.github/workflows/deploy.yml`) |

## Directory Structure

```
├── PLAN.md               # Product roadmap — read this first and continue from the next open milestone
├── public
│   ├── logo.svg          # Nat Utrecht logo (also used as favicon)
│   └── img/hero-zwembad-*.webp  # Pool photo for the home hero (800 / 1376 px)
├── src
│   ├── components
│   │   ├── app-shell.tsx     # Header (logo, nav, account menu, mobile Sheet), footer, PageHeader
│   │   ├── auth-schermen.tsx # Login, email-link confirm, first-time setup, no-access, loading screens
│   │   ├── trainer-avatar.tsx# Coloured initials avatar + chip per trainer
│   │   ├── rooster-onderdelen.tsx # Status badge/steps, who-can-when grid, reminder banner
│   │   ├── rooster-acties.tsx     # Red open-slot bar (all pages), "Ik kan niet" dialog (release / ask a colleague)
│   │   ├── error-pages.tsx   # Dutch 404 / error pages
│   │   └── ui                # shadcn/ui components
│   ├── data
│   │   ├── fixtures.ts       # Domain types, fixed club data (sessies, groepen), default jaarplan, AppData
│   │   ├── auth.ts           # Firebase Auth state, access check, invite redemption, first-time setup
│   │   ├── indeling.ts       # Scheduling logic: maakVoorstel(), controleer() warnings, tellingen(), openPlekken()
│   │   ├── wijzigingen.ts    # Published trainings, swap requests and change-log types; kanOvernemen()
│   │   ├── rooster.ts        # Roster domain: moments, periods, availability, trainingenInPeriode()
│   │   └── store.ts          # useSyncExternalStore store fed by Firestore onSnapshot; selectors + write actions
│   ├── firebase-config.ts    # Public Firebase web config (fill in per project)
│   ├── lib
│   │   ├── firebase.ts       # initializeApp, Auth, Firestore (offline cache), emulator switch
│   │   ├── feestdagen.ts     # Dutch public holidays (Easter-based); trainings on them are flagged
│   │   ├── dates.ts          # ISO-date helpers (local calendar days), nl-NL formatting, ISO week numbers
│   │   └── utils.ts          # cn()
│   ├── routes
│   │   ├── __root.tsx        # Auth gate + AppShell around <Outlet/> (HTML shell is index.html)
│   │   ├── index.tsx         # Overzicht / dashboard
│   │   ├── rooster.tsx       # Mijn rooster: own trainings, "Ik kan niet", requests for me, open slots, change log (coordinator)
│   │   ├── jaarplan.tsx      # Season timeline, periods (edit = coordinator or jaarplanBeheer), publish dialog
│   │   ├── trainingen.tsx    # Training log, filters, detail Sheet (?id=), new/upload dialog (?nieuw=true)
│   │   ├── periodes.index.tsx      # Roster periods list, fixed training moments, new-period dialog
│   │   ├── periodes.$periodeId.tsx # One period: status flow, settings (incl. holidays), call-to-action, who-can-when grid
│   │   ├── periodes.$periodeId_.beschikbaarheid.tsx # Focused 3-step availability form (?trainer= for the coordinator)
│   │   ├── periodes.$periodeId_.indelen.tsx # Scheduling (coordinator): proposal, warnings, per-training dialog, publish; read-only roster for all once published
│   │   └── team.tsx          # Team: roles + tasks, invites, supervisors group, test trainers
│   └── styles.css            # Theme variables (Nat Utrecht palette), .nat-rainbow, .nat-wave, print CSS
```

`src/routeTree.gen.ts` is generated by the router plugin when the dev server or build runs. Don't edit it.

### Firestore data model

| Path | Contents | Who may write |
| ---- | -------- | ------------- |
| `trainers/{uid}` | naam, initialen, kleur, rol (`Trainer`/`Assistent-trainer`/`Geen training`), specialiteit, email, taken `coordinator`/`jaarplanBeheer`/`teamBeheer`/`toezichthouder` (bool), `test` | coordinator; teamBeheer (not for coordinators / heavy tasks); self only via setup or invite |
| `uitnodigingen/{email}` | email, naam, rol, kleur, specialiteit, uitgenodigdOp + the four task flags | coordinator / teamBeheer (invitee may delete own on redeem) |
| `toezichthouders/{id}` | naam, notitie — the club's separate group of supervisors (no accounts yet) | coordinator / teamBeheer |
| `trainingsmomenten/{id}` | dag (0=ma…6=zo), start, eind, locatie, trainersNodig, actief, volgorde, vasteTrainers[]?, geldigVan?, geldigTot? | coordinator |
| `roosterperiodes/{id}` | naam, soort (`wekelijks`/`los`), van, tot, status (`concept`→`beschikbaarheid`→`indelen`→`gepubliceerd`/`afgesloten`), deadline, momentIds, losseTrainingen[], vervallenData[], indeling {`datum|momentId`: {trainers[], nodig, toezicht?, extern?, externToezicht?, zelf?, schema?}}, versie, gepubliceerdOp, laatsteWijziging | coordinator; after publication a trainer may release own slot, take an open slot, or execute an accepted request (rules check exactly) |
| `roosterperiodes/{id}/wijzigingslog/{id}` | soort (vrijgeven/overnemen/ruil/overdracht/indeling), tekst, door, op — shown to the coordinator | any trainer, as self |
| `ruilverzoeken/{id}` | periodeId, van, naar, vanKey, terugKey (null = only take over), status open/geaccepteerd/geweigerd/ingetrokken, bericht | create by `van`; `naar` refuses or accepts (accept only together with the roster change); `van` withdraws |
| `roosterperiodes/{id}/beschikbaarheid/{uid}` | keuzes {sleutel: graag/kan/nee}, maxPerMaand, nietKunnen [{van,tot}] — readable by all trainers | own while status = beschikbaarheid; coordinator always |
| `config/setup` | hoofdtrainerUid (= first coordinator) — exists once the app is set up | first user, once |
| `roosterWijzigingen/{week\|sessie\|groep}` | trainerId or null (open slot) | any trainer |
| `afwezigheden/{id}` | trainerId, van, tot, reden | own or coordinator |
| `trainingen/{id}` | training + aangemaaktDoor | any trainer (as self); delete own or coordinator |
| `jaarplan/huidig` | the whole Jaarplan object | coordinator or jaarplanBeheer |

## Key Concepts

### File-Based Routing

Route files in `src/routes/` define pages: `__root.tsx` wraps every page, `index.tsx` is `/`, `about.tsx` would be `/about`. There is no server: all data access goes through the Firebase client SDK and is secured by `firestore.rules`.

### Theme Variables

Colors and corner radius are CSS variables in `src/styles.css` (`--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--radius`, and more), with a second set under `.dark`. Tailwind exposes them as classes such as `bg-primary`, `text-muted-foreground`, and `border-border`.

Set these variables for the product before you build any page. In components, use the variable classes instead of raw colors like `bg-white` or `text-gray-600`, so the whole site changes when a variable changes.

### UI Components

Ready-made components are in `src/components/ui/`. Use them before writing your own, and restyle them through the theme variables or their variants. Add more with `npx shadcn add <name>`. Show a toast by calling `toast()` from `sonner`; the container is already mounted in `__root.tsx`. `TooltipProvider` is mounted there too, so `Tooltip` works anywhere without its own provider.

| Need               | Components                                                         |
| ------------------ | ------------------------------------------------------------------ |
| Actions and status | Button, Badge, Progress, Skeleton, Alert, Sonner                   |
| Forms              | Input, Textarea, Label, Checkbox, RadioGroup, Switch, Select, Form |
| Overlays and menus | Dialog, Sheet, Popover, DropdownMenu, Tooltip                      |
| Content and layout | Card, Tabs, Accordion, Separator, Table                            |

Use `Form` with React Hook Form and the Zod resolver. Start from `src/examples/validated-form.tsx`; it isn't mounted or connected to a backend. Its required `onSubmit` callback must reject on failure. See [the form pattern](docs/forms.md) for HTTP submission and error handling.

Use Sheet for a mobile menu and DropdownMenu for short action lists. Give Dialog and Sheet an accessible title and description. Pair Checkbox, RadioGroup, Switch, and inputs with visible labels. Reserve tables for tabular data and wrap them in their provided scroll container.

### Design Choices

Set the product's palette, heading/body fonts, and layout before building its screens. Use an explicit user design when supplied; otherwise choose defaults that fit the product.

- Set `--font-body` and `--font-heading` in `src/styles.css`. Use `font-display` for headings when the product needs a separate heading font.
- Use `max-w-content` for a page container and `max-w-reading` for long text. Keep consistent horizontal padding, such as `px-4 sm:px-6`, and a small repeated spacing scale, such as `gap-4`, `gap-6`, and `py-12`.
- Keep one main heading per page and a clear heading order. Use muted text for supporting copy, not essential low-contrast labels.
- Preserve focus rings. Give icon-only buttons an accessible name. Ensure actions work with a keyboard and on narrow screens.
- Use short color/opacity transitions. Add `motion-reduce:transition-none` or `motion-reduce:animate-none` when adding motion; don't make essential content depend on animation.
- Provide loading, empty, error, and success states for each data-driven screen. Skeletons should follow the shape of the content they replace.

### Routing and Data

Router types are registered in `src/router.tsx`, so use typed `Link` destinations and route parameters. The root route supplies the themed 404 page; the router's default error component supplies the safe retry/home page.

Pages read data synchronously via `useAppData()`; the root only renders pages once the first Firestore snapshots have arrived. Actions in `store.ts` write to Firestore and report failures with a toast; the UI updates through the listeners (Firestore applies local writes immediately). **Every permission must be enforced in `firestore.rules`** — hiding a button is not security. Add a rules test in `tests/firestore.rules.test.ts` for every rule change.

## Configuration Files

| File             | Purpose                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| `vite.config.ts` | Vite path aliases, TanStack Router plugin, Tailwind, React                                       |
| `tsconfig.json`  | Strict TypeScript, with the `@/*` alias for `src/*`                                              |
| `firebase.json`  | Hosting (`dist`, SPA rewrite, cache headers), Firestore rules, emulator ports                     |
| `firestore.rules`| Firestore security rules — the real access control                                               |

## Development Commands

Use Node 22.13+ or Node 24. Use pnpm 10 (pnpm 12 rejects the lockfile under its default minimum-release-age policy).

```bash
pnpm dev           # Vite dev server on port 3000 (real Firebase project)
pnpm dev:emulator  # Same, against local Auth + Firestore emulators (needs Java)
pnpm build         # Production build into dist/ (also generates routeTree.gen.ts)
pnpm typecheck     # Type-check with tsc; the build doesn't
pnpm lint          # Check TypeScript and React Hooks rules
pnpm test          # Unit, component and page smoke tests (run build first)
pnpm test:rules    # Firestore rules tests in the emulator (needs Java)
pnpm preview       # Preview the production build
```

## Conventions

- Components: PascalCase. Utilities and hooks: camelCase. Route files: kebab-case.
- Import from `src` with the `@/` alias.
- TypeScript fails on unused locals and parameters, so remove what you don't use.
- Use React hooks for state.
- Run the dev server or build once to generate route types before type-checking a fresh copy.
- Run build, typecheck, lint, tests and rules tests before reporting completion. Verify changed user flows locally; a passing build doesn't prove an interaction works.

## Product decisions (non-obvious)

- **Brand**: colours taken from natutrecht.nl — logo red `#e64439` (`--primary`), ink `#2b2222`, Montserrat, and the six rainbow colours from the logo exposed as `bg-nat-*` / `text-nat-*` utilities and the `.nat-rainbow` stripe. Keep using theme variables, not raw hex, in components (trainer colours in fixtures are the exception).
- **Sessions are real**: Tue & Thu 21:00–22:00 and Sun 11:00–12:00 at Zwembad De Kwakel (from the club site). Groups/lanes (Basis 1–2, Gevorderd 3–4, Wedstrijd 5–6) and trainer names are **placeholders** to be replaced with the real team.
- **Roster model** (fix-10/11): the published `indeling` of a `roosterperiode` is the roster. The old rotation (`roosterVoorWeek`, `roosterWijzigingen`) is no longer shown anywhere and can be removed later. Swaps need no approval; the coordinator sees them in the change log on Mijn rooster. Publishing always writes `nodig` per training because the rules check it on take-over.
- **Roster rotation** runs over all trainers sorted by uid; adding or removing a trainer changes future proposals (manual overrides stay). A configurable rotation is milestone 5.
- **Jaarplan**: on first-time setup `STANDAARD_JAARPLAN` (season 2026–2027, goal EuroGames Cardiff 14–17 Jul 2027) is written to `jaarplan/huidig`; competition dates other than EuroGames are "onder voorbehoud".
- **Logged-in trainer** = Firebase uid (`huidigeTrainerId`).
- **Rol vs. taken** (fix-3): `rol` says whether someone gives training (`Geen training` = e.g. a coordinator who doesn't coach; excluded from roster and training pickers). Tasks are separate flags: `coordinator` (schedules; may do everything), `jaarplanBeheer` (edits/publishes the jaarplan), `teamBeheer` (delegated by the coordinator: invite and edit members, but never coordinators or the heavy tasks `coordinator`/`teamBeheer`), `toezichthouder` (pool-supervisor qualification). A coordinator can't remove their own coordinator flag or delete themselves, so one always remains. Legacy docs with `rol: 'Hoofdtrainer'` count as coordinator and are migrated on that user's next login.
- **Vaste trainers** (fix-12): a moment can have fixed trainers (e.g. Sunday 11:00). In the availability form they don't choose for that moment (stored as `graag`); others only choose "Ik kan invallen" (stored as `kan`) or "Nee". `maakVoorstel` places available fixed trainers first (ignoring their monthly max) and fills only the remaining slots. A moment can be limited to a date range (`geldigVan`/`geldigTot`, e.g. a trial Jan–Apr); outside it no trainings are generated and periods that never overlap don't ask for it. With more fixed trainers than places (fix-15) they alternate in blocks of `ritmeWeken` trainings (default 2); if one can't, another fixed trainer takes it and the rhythm continues. For fixed trainers only their `nietKunnen` dates count — an old choice for that moment is ignored.
- **Toezicht**: every training needs a supervisor — a qualified trainer or someone from `toezichthouders`, also when swimmers train without a trainer.
- **New roster design**: see `docs/rooster-ontwerp.md` (bouwplan there). Trainings on Dutch holidays are flagged (`feestdag`), not removed; the coordinator decides.
- **Login** uses email links and Google because both prove ownership of the address (`email_verified`); invites are matched on that verified address.
- **Removed trainers** show as "Oud-trainer" on their old trainings.
- **Uploads** only keep the file name for now; storing files is milestone 4.

## Application Name

Set the product's name and description in `src/routes/__root.tsx`:

- `siteName` is the page title and the title shown when the link is shared.
- `siteDescription` is the meta description and the description shown when the link is shared.

These are already set to "NatUtrecht Trainersapp".
