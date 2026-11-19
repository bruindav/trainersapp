<!-- Fix: fix-1 — Netlify vervangen door Firebase -->
# NatUtrecht Trainersapp — roadmap

Een app voor de trainers van zwemvereniging Nat Utrecht om samen het trainersrooster te maken, het jaarplan te publiceren en trainingen met elkaar te delen. Het product wordt in mijlpalen opgebouwd: eerst een klikbare app in de huisstijl van Nat Utrecht, daarna stap voor stap echte opslag, inloggen en extra functies.

## Mijlpaal 1 — Klikbare app in de huisstijl ✅

- Overzicht (`/`): je volgende training, de bezetting van deze week, de huidige jaarplanperiode met de volgende wedstrijd, en wat er de afgelopen week getraind is.
- Rooster (`/rooster`): weekraster (di/do 21:00, zo 11:00 × Basis/Gevorderd/Wedstrijd), trainers toewijzen of een plek open laten, signalering van afwezigheid en dubbele inzet, weeknavigatie, verdeling per trainer over 4 weken.
- Jaarplan (`/jaarplan`): seizoenstijdlijn met belastingsprofiel, periodes met doel/accenten/meters, wedstrijden en evenementen, bewerken door de hoofdtrainer, concept → publiceren met versienummer, afdrukken.
- Trainingen (`/trainingen`): logboek met filters (periode, groep, trainer, focus, zoeken), detailpaneel, "gebruik als basis", training samenstellen per onderdeel of een bestand uploaden, herinnering voor trainingen die je nog niet hebt vastgelegd.
- Alle data is voorbeelddata uit `src/data/fixtures.ts`; wijzigingen blijven bewaard tot de pagina herlaadt.

## Mijlpaal 2 — Echte opslag in Firestore ✅ (fix-1)

- Netlify vervangen door Firebase: statische SPA op Firebase Hosting, deploy via GitHub Actions.
- Firestore-collecties `trainers`, `uitnodigingen`, `roosterWijzigingen`, `afwezigheden`, `trainingen`, `jaarplan/huidig` (zie AGENTS.md).
- `src/data/store.ts` leest live via `onSnapshot` en schrijft met Firestore-acties; offline cache voor slecht bereik in het zwembad.
- Laad- en fouttoestand voor de hele app; voorbeelddata vervalt (het standaard-jaarplan wordt bij de inrichting gezet).

## Mijlpaal 3 — Inloggen en rollen ✅ (fix-1)

- Firebase Authentication met e-maillink en Google; geen open registratie.
- Eerste gebruiker richt de app in als hoofdtrainer; daarna alleen via uitnodiging (scherm Team).
- Rollen `Hoofdtrainer`, `Trainer`, `Assistent-trainer`, afgedwongen in `firestore.rules` (met tests).
- De trainerkeuze "Bekijk de app als…" is vervangen door een accountmenu met uitloggen.

## Mijlpaal 4 — Bestanden uploaden

- Geüploade trainingen (pdf, foto, Word) opslaan en downloadbaar/preview maken in het detailpaneel.
- Let op: Cloud Storage for Firebase vereist het Blaze-abonnement (betalen naar gebruik, met gratis tegoed). Alternatieven afwegen: klein bestand als foto in Firestore (max. 1 MB per document), of een link naar Google Drive.

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

- E-mailmelding (bijv. via de Firebase-extensie *Trigger Email*, vereist Blaze) bij een nieuw gepubliceerd jaarplan, een open plek in het rooster of een ruilverzoek.
- Wekelijkse samenvatting: wat er getraind is en wie er volgende week staat.
