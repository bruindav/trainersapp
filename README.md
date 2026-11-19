<!-- Fix: fix-1 -->
# NatUtrecht Trainersapp

Een webapp voor het trainersteam van zwemvereniging **Nat Utrecht** (zwembad De Kwakel, Utrecht). Trainers maken er samen het rooster in: wie geeft welke groep op welk trainingsmoment. Ook publiceren ze er het jaarplan voor het seizoen, en ze leggen hun trainingen vast zodat collega's kunnen zien wat er de afgelopen week gezwommen is. De app gebruikt de kleuren en stijl van natutrecht.nl: het rood uit het logo, warm donkerbruin, Montserrat en de regenboogstreep uit het logo.

## Schermen

| Route         | Wat je er doet                                                                    |
| ------------- | --------------------------------------------------------------------------------- |
| `/`           | Overzicht: je volgende training, de bezetting van deze week, het jaarplan van nu, recente trainingen |
| `/rooster`    | Weekrooster bekijken en trainers toewijzen, afwezigheid zien, verdeling per trainer |
| `/jaarplan`   | Seizoenstijdlijn, periodes bewerken (hoofdtrainer) en publiceren, wedstrijden     |
| `/trainingen` | Logboek filteren, training bekijken of hergebruiken, nieuwe training samenstellen of uploaden |
| `/team`       | Trainers bekijken; de hoofdtrainer nodigt uit, wijzigt rollen en verwijdert trainers |

## Technologie

- Vite + React 19 + TanStack Router (statische single-page app)
- Tailwind CSS 4 met shadcn/ui-componenten (Radix UI), lucide-react, sonner
- **Firebase**: Authentication (e-maillink en Google), Firestore (data, met offline cache) en Hosting
- GitHub Actions: tests op elke branch, deploy naar Firebase vanaf `main`

## Inloggen en toegang

Er is geen open registratie. Toegang heb je alleen als er een document `trainers/{uid}` voor je bestaat:

1. **Eerste keer**: alleen het e-mailadres uit de GitHub-variabele `HOOFDTRAINER_EMAIL` kan de app inrichten en wordt daarmee hoofdtrainer. Bij het deployen wordt dit adres in `firestore.rules` ingevuld; het staat dus niet in de repo.
2. **Daarna**: de hoofdtrainer nodigt trainers uit op het scherm Team (e-mailadres, naam, rol). Wie met dat e-mailadres inlogt, krijgt toegang. De app verstuurt zelf geen uitnodigingsmail; laat je collega weten dat hij of zij kan inloggen.

Alle rechten worden afgedwongen in [`firestore.rules`](firestore.rules).

## Firebase instellen (eenmalig)

1. Maak een Firebase-project, zet **Firestore** aan (productiemodus, `eur3`) en in **Authentication** de providers *E-mail/wachtwoord* met *E-maillink* en *Google*.
2. Voeg een **web-app** toe en zet de config in [`src/firebase-config.ts`](src/firebase-config.ts) (niet geheim).
3. Maak in Google Cloud een serviceaccount met de rol *Firebase Admin*, maak een JSON-sleutel en zet die als GitHub-secret `FIREBASE_SERVICE_ACCOUNT`.
4. Zet in GitHub (Settings → Secrets and variables → Actions → **Variables**) de variabele `HOOFDTRAINER_EMAIL` op het e-mailadres van de hoofdtrainer.

Elke merge naar `main` deployt dan de app en de Firestore-regels.

### Herstel en aandachtspunten

- **Geen hoofdtrainer meer** (bijv. twee hoofdtrainers die elkaar tegelijk degraderen): zet in de Firebase-console bij `trainers/{uid}` het veld `rol` terug op `Hoofdtrainer`.
- **Opnieuw inrichten**: verwijder in de console het document `config/setup`.
- **Accounts**: de app biedt geen wachtwoord-login, maar Firebase staat het aanmaken van wachtwoord-accounts technisch toe. Kijk af en toe bij *Authentication → Users* of daar onbekende accounts staan en verwijder die.
- Bij uitloggen wist de app de lokale cache, zodat er op een gedeeld apparaat niets achterblijft.

## Lokaal draaien

```bash
pnpm install
pnpm dev            # tegen het echte Firebase-project (config in src/firebase-config.ts)
pnpm dev:emulator   # tegen lokale Firebase-emulators (vereist Java)
pnpm build && pnpm typecheck && pnpm lint && pnpm test
pnpm test:rules     # tests van firestore.rules in de emulator (vereist Java)
```

## Roadmap

Zie [PLAN.md](PLAN.md).
