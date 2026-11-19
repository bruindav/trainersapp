# NatUtrecht Trainersapp — roadmap

Een app voor de trainers van zwemvereniging Nat Utrecht om samen het trainersrooster te maken, het jaarplan te publiceren en trainingen met elkaar te delen. Het product wordt in mijlpalen opgebouwd: eerst een klikbare app in de huisstijl van Nat Utrecht, daarna stap voor stap echte opslag, inloggen en extra functies.

## Mijlpaal 1 — Klikbare app in de huisstijl ✅

- Overzicht (`/`): je volgende training, de bezetting van deze week, de huidige jaarplanperiode met de volgende wedstrijd, en wat er de afgelopen week getraind is.
- Rooster (`/rooster`): weekraster (di/do 21:00, zo 11:00 × Basis/Gevorderd/Wedstrijd), trainers toewijzen of een plek open laten, signalering van afwezigheid en dubbele inzet, weeknavigatie, verdeling per trainer over 4 weken.
- Jaarplan (`/jaarplan`): seizoenstijdlijn met belastingsprofiel, periodes met doel/accenten/meters, wedstrijden en evenementen, bewerken door de hoofdtrainer, concept → publiceren met versienummer, afdrukken.
- Trainingen (`/trainingen`): logboek met filters (periode, groep, trainer, focus, zoeken), detailpaneel, "gebruik als basis", training samenstellen per onderdeel of een bestand uploaden, herinnering voor trainingen die je nog niet hebt vastgelegd.
- Alle data is voorbeelddata uit `src/data/fixtures.ts`; wijzigingen blijven bewaard tot de pagina herlaadt.

## Mijlpaal 2 — Datamodel en echte opslag

- Netlify Database (Postgres + Drizzle) met tabellen voor `trainers`, `sessies`, `groepen`, `rooster_toewijzingen`, `afwezigheden`, `trainingen` + `training_blokken`, `jaarplannen`, `periodes`, `evenementen`.
- Seed-script dat de huidige voorbeelddata inlaadt (de 8 echte trainers vervangen de voorbeeldnamen).
- `src/data/store.ts` vervangen door TanStack Start server functions + route loaders; de acties (`wijsTrainerToe`, `voegTrainingToe`, `werkPeriodeBij`, `publiceerJaarplan`, …) worden server-side mutaties.
- Laden-, fout- en lege toestanden per scherm.

## Mijlpaal 3 — Inloggen en rollen

- Netlify Identity: alleen uitgenodigde trainers kunnen inloggen (geen open registratie).
- Rollen: `hoofdtrainer` (jaarplan bewerken/publiceren, rooster beheren) en `trainer`.
- De trainerkeuze rechtsboven ("Bekijk de app als…") vervalt; de ingelogde trainer bepaalt "mijn" trainingen en rechten.

## Mijlpaal 4 — Bestanden uploaden

- Geüploade trainingen (pdf, foto, Word) opslaan in Netlify Blobs en downloadbaar/preview maken in het detailpaneel.
- Foto's van trainingsbriefjes tonen via de Netlify Image CDN.

## Mijlpaal 5 — Rooster verder uitbouwen

- Afwezigheid zelf melden (en intrekken) vanuit de app.
- Ruilverzoeken: een trainer biedt een plek aan, een collega neemt hem over.
- Standaardrotatie per seizoen instellen in plaats van de vaste rotatie in code.
- Export naar agenda (iCal-feed per trainer).

## Mijlpaal 6 — Aandachtspunten en afspraken

- Aandachtspunten doorgeven aan collega's, gekoppeld aan een groep of training ("let op bij baan 3: …").
- Trainersafspraken vastleggen (besluitenlijst met datum en eigenaar).
- Overzicht van openstaande punten op de startpagina.

## Mijlpaal 7 — Meldingen

- E-mailmelding bij een nieuw gepubliceerd jaarplan, een open plek in het rooster of een ruilverzoek.
- Wekelijkse samenvatting: wat er getraind is en wie er volgende week staat.
