# NatUtrecht Trainersapp

Een webapp voor het trainersteam van zwemvereniging **Nat Utrecht** (zwembad De Kwakel, Utrecht). Trainers maken er samen het rooster in: wie geeft welke groep op welk trainingsmoment. Ook publiceren ze er het jaarplan voor het seizoen, en ze leggen hun trainingen vast zodat collega's kunnen zien wat er de afgelopen week gezwommen is. De app gebruikt de kleuren en stijl van natutrecht.nl: het rood uit het logo, warm donkerbruin, Montserrat en de regenboogstreep uit het logo.

## Schermen

| Route         | Wat je er doet                                                                    |
| ------------- | --------------------------------------------------------------------------------- |
| `/`           | Overzicht: je volgende training, de bezetting van deze week, het jaarplan van nu, recente trainingen |
| `/rooster`    | Weekrooster bekijken en trainers toewijzen, afwezigheid zien, verdeling per trainer |
| `/jaarplan`   | Seizoenstijdlijn, periodes bewerken (hoofdtrainer) en publiceren, wedstrijden     |
| `/trainingen` | Logboek filteren, training bekijken of hergebruiken, nieuwe training samenstellen of uploaden |

De app draait nu op **voorbeelddata** (`src/data/fixtures.ts`). Met de trainerkeuze rechtsboven kun je de app bekijken als elke trainer. Kies de hoofdtrainer (Sanne) om het jaarplan te bewerken.

## Technologie

- TanStack Start (React 19, TanStack Router, Vite)
- Tailwind CSS 4 met shadcn/ui-componenten (Radix UI)
- lucide-react iconen, sonner toasts
- Gehost op Netlify; afbeeldingen via de Netlify Image CDN

## Lokaal draaien

```bash
pnpm install
netlify dev        # of: pnpm dev  (Vite op poort 3000)
```

Met `netlify dev` werkt ook de Image CDN (`/.netlify/images`) voor de hero-afbeelding.

## Roadmap

Zie [PLAN.md](PLAN.md). Wat nog volgt:

1. Echte opslag in Netlify Database in plaats van de voorbeelddata
2. Inloggen voor trainers met rollen (hoofdtrainer/trainer) via Netlify Identity
3. Geüploade trainingsbestanden opslaan in Netlify Blobs
4. Afwezigheid melden, ruilverzoeken en agenda-export in het rooster
5. Aandachtspunten aan elkaar doorgeven en afspraken vastleggen
6. E-mailmeldingen en een wekelijkse samenvatting
