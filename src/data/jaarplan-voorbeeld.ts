// Fix: fix-21 — de trainingsopbouw sept–dec 2026 (uit het Word-document) om in te laden
import type { Opbouw } from './fixtures'

export const OPBOUW_SEPT_DEC_2026: Opbouw = {
  id: 'o-2026-najaar',
  naam: 'Sept–dec 2026 · naar Frankfurt',
  doelWedstrijdId: null,
  inleiding:
    '<p>Deze opbouw begint bij de start van het nieuwe seizoen op 1 september 2026 en werkt toe naar de wedstrijd in Frankfurt van zaterdag 5 december 2026. Waar we het afgelopen seizoen (feb–juni) vooral op extra inhoud en later op snelheid trainden, ligt dit seizoen vanaf het begin meer nadruk op <strong>techniek</strong>, en dan met name ook specifieke aandacht voor <strong>keerpunten en starts</strong>.</p><p>Per fase staat aangegeven waar de nadruk ligt, welke trainingszones daarbij passen en hoe techniek, keerpunten en starts erin terugkomen. De concrete trainingen en sets kunnen per week verder ingevuld worden.</p>',
  aandachtsgebieden: [
    {
      id: 'ag-techniek',
      titel: 'Techniek, keerpunten en starts: rode draad door het hele seizoen',
      tekst:
        '<p>Techniek, keerpunten en starts komen in elke fase terug, met steeds meer intensiteit en toewerken naar een wedstrijd. Dit pakken we op twee manieren aan: geïntegreerd in de reguliere trainingen én, waar mogelijk, in aparte techniektrainingen.</p><ul><li><p><strong>In de reguliere trainingen:</strong> een vast technisch blok (10–15 min), bijvoorbeeld als opwarmer of juist als herstelblok na een intensieve set. De inhoud verschuift per fase: van basistechniek (fase 1) naar keerpunten (incl. OWF en breakout) en starts op snelheid (fase 2–3) naar wedstrijdspecifiek onder vermoeidheid (fase 4).</p></li><li><p><strong>Los van de 3 vaste trainingen:</strong> overweeg 1× per 6 weken een aparte techniektraining (net als vlinderslagclinics) van circa 45–60 minuten, volledig gewijd aan starts, keerpunten en finishen. Moeilijk te organiseren? Dan 1× per maand/6 weken een deel van een reguliere training hiervoor gebruiken.</p></li><li><p><strong>Middelen:</strong> OWF- en breakout-oefeningen, drilloefeningen per slag, startblok met fluitsignaal. Zoomers / paddles / pull buoy / plankje / t-shirt om de techniekfocus te versterken.</p></li></ul>',
    },
    {
      id: 'ag-niveau',
      titel: 'Differentiëren naar niveau: keerpunten',
      tekst:
        '<p>Niet iedereen die wedstrijden zwemt, beheerst de keerpunttechniek al even goed. Om hier gericht aandacht aan te besteden zonder steeds de hele groep mee te hoeven nemen, kunnen we ook differentiëren binnen de reguliere trainingen, naar niveau.</p><ul><li><p><strong>Tijdens het technische blok:</strong> groep opsplitsen als we met meerdere trainers zijn. Zwemmers die een keerpunt nog niet beheersen werken aan de losse onderdelen (aanzwemmen/afstand inschatten, wel of niet aantikken afhankelijk van de slag, draai, afzet, glijfase), in kleine, geïsoleerde herhalingen bij de wand. Zwemmers die het al kunnen, gaan in diezelfde tijd verder met finetunen: snelheid van de draai, timing van de onderwaterfase, aantal slagen na de wand, symmetrie. Zelfde blok, ander doel per zwemmer/baan.</p></li><li><p><strong>Binnen de hoofdset:</strong> geef bij dezelfde set een ander accent per zwemmer/baan. Bijvoorbeeld bij 8×50 m: zwemmers zonder keerpunt pauzeren bewust even bij elke wand om de beweging op te bouwen, terwijl de rest doorzwemt op tempo. Iedereen zwemt dezelfde set, alleen het accent verschilt.</p></li><li><p><strong>Aparte techniektraining:</strong> mooi moment om er echt tijd voor te nemen. Beginners bouwen stap voor stap op, terwijl gevorderden in diezelfde sessie een eigen finetuning-opdracht krijgen, zodat niemand op elkaar hoeft te wachten.</p></li></ul>',
    },
    {
      id: 'ag-afstand',
      titel: 'Opbouw in afstand, intensiteit en 100%-gevoel',
      tekst:
        '<p>Door het seizoen heen verschuiven de afstanden: van langere sets in de basisfases (200–400 m, opbouwend duurwerk) naar kortere, snellere sets richting de wedstrijden (voornamelijk 100 m en 50 m, met veel aandacht voor snelheid en techniek). De voorbeeldsetjes bij elke fase laten zien wat qua afstand en opbouw logisch is; het zijn illustraties, dus geef er vooral ook een eigen draai aan, waarin de verschillende (wedstrijd)slagen voor iedere zwemmer voldoende aan bod komen.</p><ul><li><p><strong>100%-gevoel:</strong> vanaf fase 3 bouwen we sets in waarin echt op 100% gezwommen wordt, met ruim voldoende rust ertussen (bijvoorbeeld 2–3 minuten bij 50 m, volledig hersteld). Zo is elke herhaling een maximale poging vanuit rust, in plaats van een nog vermoeide ‘harde’ poging. Dat is nodig om zwemmers echt te leren voelen wat 100% is, want wat velen ‘100%’ noemen is in de praktijk vaak nog 85–90%.</p></li></ul>',
    },
  ],
  fases: [
    {
      id: 'f-2026-1',
      naam: 'Inhoud, basis & techniek (herstart seizoen)',
      van: '2026-09-01',
      tot: '2026-10-11',
      kleur: '#41a8da',
      doel: '<p>(Rustig) opbouwen na de zomerstop, aerobe basis leggen, techniek zwemslagen, keerpunten en starts weer op niveau brengen. Langere afstanden, niet te hoog tempo, weinig rust.</p>',
      zones: ['a0', 'a1', 'a2'],
      zonesToelichting: 'Overwegend aeroob 0 en aeroob 1; richting het einde van de fase geleidelijk aeroob 2 toevoegen.',
      techniek: '<p>Nadruk op de basisbewegingen in rustig tempo, herhaling. Vorm boven snelheid.</p>',
      letOp: '<p>Losse vlinderslagclinics worden gegeven.</p>',
      sets: [
        '<p>3 × (300 m + 200 m + 100 m) / 70% / één slag / rust 15 sec, tussen elke set 30 sec rust</p>',
        '<p>4 × 150 m / 70% / één slag / rust 10–15 sec, alle 4 op gelijke tijd zwemmen</p>',
        '<p>8 × 50 m techniekopdracht (bijv. na de wand 3 slagen extra glijden) / rustig tempo / rust 15 sec</p>',
      ],
    },
    {
      id: 'f-2026-2',
      naam: 'Opbouw duurvermogen & kracht',
      van: '2026-10-13',
      tot: '2026-11-08',
      kleur: '#8cbb15',
      doel: '<p>Volume en inhoud verder opbouwen, kracht toevoegen (bijv. weerstand met t-shirt-oefeningen, plankje rechtop in het water), keerpunten en starts met meer snelheid oefenen.</p>',
      zones: ['a1', 'a2', 'a3', 'lp'],
      zonesToelichting: 'Aeroob 1/2 als basis, aeroob 3 geleidelijk introduceren, eerste elementen lactaatproductie.',
      techniek:
        '<p>Keerpunten op snelheid inbouwen binnen aerobe sets (bijv. laatste meters voor de wand en eerste meters erna versnellen); starts vaker herhalen, maar beperkt houden (2–3× per training) i.v.m. de belasting.</p>',
      letOp: '<p>Techniek vast blijven houden in versnellingen. Techniek blijft basis.</p>',
      sets: [
        '<p>6 × 100 m / 2× 70% – 2× 70–80% – 2× 80% / één slag / T. 1.50 (baan 1)</p>',
        '<p>8 × 50 m met t-shirt / 80% / laatste 5 m voor de wand en eerste 5 m erna versnellen (keerpuntfocus) / rust 20 sec</p>',
        '<p>4 × 100 m opbouwend van 80% naar 95% (eerste lactaatproductie-prikkel) / rust 1–2 min</p>',
      ],
    },
    {
      id: 'f-2026-3',
      naam: 'Wedstrijdspecifieke snelheid',
      van: '2026-11-10',
      tot: '2026-11-22',
      kleur: '#e95e29',
      doel: '<p>Omslag naar snelheid en wedstrijdtempo; techniek onder hogere intensiteit vast blijven houden.</p>',
      zones: ['lp', 'lt', 'sp', 'a1'],
      zonesToelichting: 'Lactaatproductie en lactaattolerantie, kortere sprintsets; aeroob 1 voor herstel tussen intensieve sets door.',
      techniek:
        '<p>Starts met fluitsignaal (reactiesnelheid), keerpunten op wedstrijdsnelheid, finish-oefeningen (laatste meters voluit), OWF, breakout.</p>',
      letOp: '',
      sets: [
        '<p>6 × 75 m: 1e keer 1e baan MAX, 2e keer 2e baan MAX, 3e keer 3e baan MAX enz., rest easy tempo / vaste starttijd</p>',
        '<p>4 × 50 m MAX, echt 100% / rust 2–3 min, volledig hersteld / wedstrijdslag: dit is de <strong>100%-gevoel-set</strong></p>',
        '<p>Starts oefenen met fluitsignaal + 25 m MAX (aan)zwemmen / rust ruim (2 min) / max. 4×</p>',
        '<p>Overnames oefenen, wisselende slagen. Liefst met eigen estafettegroepje.</p>',
      ],
    },
    {
      id: 'f-2026-4',
      naam: 'Taper: wedstrijdklaar',
      van: '2026-11-24',
      tot: '2026-12-05',
      kleur: '#8966a5',
      doel: '<p>Belasting afbouwen, frisheid opbouwen richting de wedstrijd.</p>',
      zones: ['a0', 'a1', 'sp', 'lt'],
      zonesToelichting:
        'Overwegend aeroob 0/1 voor herstel, met korte scherpe pieken sprint/lactaattolerantie ter activatie. Geen lange lactaatproductiesets meer.',
      techniek:
        '<p>Keerpunten & starts (en overnames): kort en scherp herhalen, gericht op zelfvertrouwen, niet op het opbouwen van extra vermoeidheid.</p>',
      letOp: '<p>Techniek steeds vasthouden.</p>',
      sets: [
        '<p>3 × 50 m MAX, echt 100% / rust 2–3 min / wedstrijdslag</p>',
        '<p>4 × 25 m vanaf startblok, MAX / ruim rust (1,5–2 min)</p>',
        '<p>Kort en fris: geen lange sets meer, wel korte keerpuntherhalingen op snelheid, bijv. 4 × 25 m vanaf de wand, MAX</p>',
      ],
    },
  ],
}
