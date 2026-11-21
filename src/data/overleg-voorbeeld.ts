// Fix: fix-37 — voorbeeld van een trainersoverleg, gebaseerd op de notulen van 25 oktober 2026.
//
// Alle namen zijn verzonnen (het voorbeeld staat ook in de demo, die openbaar te bekijken is).
// De echte notulen komen pas in de app als ze zijn goedgekeurd.
import type { Overleg } from './overleg'

export const OVERLEG_VOORBEELD: Overleg = {
  id: 'voorbeeld',
  datum: '2026-10-25',
  titel: 'Trainersoverleg 25 oktober (voorbeeld)',
  status: 'goedgekeurd',
  aanwezig: 'Marloes, Renske, Gijs, Dorien, Pieter, Vera, Joost, Esther',
  gasten: 'Dineke (bij het punt toezichthouders)',
  punten: [
    {
      id: 'p1',
      titel: 'Veranderde handhaving toezichthouders',
      tekst:
        'Dineke schuift aan omdat zij de meeste gesprekken heeft gevoerd. De handhaving is veranderd: toezichthouders zijn vanaf nu verplicht op de kant te staan. Overleg met de locatiebeheerder, de gemeente, andere verenigingen en de KNZB over een uitzondering voor een mastersvereniging (iedereen kan goed zwemmen) heeft niets opgeleverd. Bij andere verenigingen zijn ouders of trainers als toezichthouder ingezet.\n\nVanaf nu moet er dus altijd een toezichthouder op de kant zitten, die daarvoor speciaal naar de training komt (eventueel na een half uur wisselen). De makkelijkste oplossing is de trainers op te leiden als toezichthouder. Daan en Arend zijn al toezichthouder; Vera, Pieter en Renske waren het eerder.\n\nVera, Renske, Pieter, Joost en Marloes willen dit met gezonde tegenzin doen. Dorien en Gijs denken erover na.',
      acties: [
        {
          id: 'a1',
          wie: 'Esther',
          wat: 'Navragen bij Dorien, Gijs en Dirk hoe zij erin staan.',
          klaar: false,
        },
        {
          id: 'a2',
          wie: 'Janneke',
          wat: 'Contact opnemen met de nieuwe toezichthouders over de cursus (nu gepland in maart, misschien eerder).',
          klaar: false,
        },
        {
          id: 'a3',
          wie: 'Alle trainers',
          wat: 'Veiligheidsinstructie in De Kwakel volgen (nooduitgang, AED, portofoons). Datum volgt.',
          klaar: false,
        },
      ],
    },
    {
      id: 'p2',
      titel: 'Terugblik vlinderslagworkshop, toekomstige workshops',
      tekst:
        'Er waren zes vlinderslagworkshops na de zondagtraining, met veel enthousiasme. Zwemmers zijn in de gewone trainingen minder "bang" voor vlinderslag. Goed was dat er op dinsdag en donderdag oefeningen uit de workshop terugkwamen. Joost stelt voor om voortaan te splitsen in beginner en gevorderd.\n\nIdeeën voor nieuwe workshops: keerpunten (prioriteit), daarna schoolslag en rugslag, op dezelfde manier als de vlinderslagworkshop. De trainer van Zwemanalyse kan opnieuw een trainersworkshop met theorie en praktijk geven.',
      acties: [
        {
          id: 'a4',
          wie: 'Esther',
          wat: 'Contact opnemen met Zwemanalyse over een nieuwe trainersworkshop (school- en rugslag).',
          klaar: false,
        },
      ],
    },
    {
      id: 'p3',
      titel: 'Standaarduitrusting trainingen',
      tekst:
        'De standaarduitrusting wordt uitgebreid voor extra weerstand, bijvoorbeeld een oud (Nat-)shirt. We kijken naar het aanschaffen van peddels, met eerst een testsetje in meerdere maten. Vera, Joost en Esther hebben peddels die zwemmers kunnen uitproberen.',
      acties: [
        {
          id: 'a5',
          wie: 'Esther',
          wat: 'Zwemmers laten weten dat ze standaard een oud shirt in de zwemtas hebben (ook in de trainingsupdate).',
          klaar: false,
        },
        {
          id: 'a6',
          wie: 'Marloes, Joost',
          wat: 'Geschikte peddels zoeken voor een testset en eventueel aanschaf.',
          klaar: false,
        },
      ],
    },
    {
      id: 'p4',
      titel: 'Extra uur op zondag',
      tekst:
        'Door de drukte kijken we naar een extra uur. Alleen zondagmiddag is er nog water in De Kwakel. Voorstel: een uur huren direct na de training van 11.00–12.00. De trainer van het tweede uur zwemt dan het eerste uur mee. Het tweede uur kan ook voor workshops worden gebruikt. Vera, Renske, Joost, Daan en Dorien willen op zondag training geven.',
      acties: [
        {
          id: 'a7',
          wie: 'Esther',
          wat: 'Meenemen naar de volgende bestuursvergadering.',
          klaar: false,
        },
      ],
    },
    {
      id: 'p5',
      titel: 'Mentale coaching voor zwemmers',
      tekst:
        'Ingebracht door Renske: er is behoefte aan aandacht voor mentale coaching rond wedstrijden, als workshop voor zwemmers of via trainers die zwemmers ondersteunen voor en tijdens wedstrijden. Misschien als cursus, eventueel parallel aan de proefwedstrijd.',
      acties: [
        {
          id: 'a8',
          wie: 'Marloes, Dorien',
          wat: 'Onderzoeken wat er wordt aangeboden aan mentale coaching voor sport en sportprestaties.',
          klaar: false,
        },
      ],
    },
    {
      id: 'p6',
      titel: 'Baandiscipline, baanindeling en doorschuiven',
      tekst:
        'Zwemmers schuiven niet makkelijk door naar een andere baan. Soms zwemt iemand in een te snelle baan en blokkeert die anderen. Trainers mogen hier een grotere rol in pakken en actief schuiven als zwemmers dat zelf niet doen. Leden wordt gevraagd hun gegevens op de website bij te werken; de trainers controleren dat.',
      acties: [
        {
          id: 'a9',
          wie: 'Daan',
          wat: 'Leden vragen hun gegevens op de website bij te werken en de juiste baan te kiezen.',
          klaar: false,
        },
        {
          id: 'a10',
          wie: 'Alle trainers',
          wat: 'Bijgewerkte gegevens op de website nalopen.',
          klaar: false,
        },
        {
          id: 'a11',
          wie: 'Renske',
          wat: 'Grotere trainingsupdate schrijven voor de clubkrant of een nieuwsbrief (baanindeling, baandiscipline, hulpmiddelen, op tijd komen).',
          klaar: false,
        },
      ],
    },
    {
      id: 'p7',
      titel: 'Overig',
      tekst:
        'De waterpoloërs gaan er weer laat uit. Afspraak is dat de doelen er om 21.00 uit zijn, zodat de lijnen erin kunnen.\n\nVoorbereiding Frankfurt: de Frankfurt-zwemmers worden de week vooraf apart genomen (2 trainingen). Joost verzorgt dan een keerpuntentraining wisselslag.',
      acties: [
        {
          id: 'a12',
          wie: 'Esther',
          wat: 'Met het bestuur overleggen om de waterpolo hieraan te herinneren.',
          klaar: false,
        },
      ],
    },
  ],
  afspraken: [
    {
      id: 's1',
      onderwerp: 'Toezicht',
      tekst:
        'Bij elke training staat een toezichthouder op de kant; eventueel na een half uur wisselen.',
    },
    {
      id: 's2',
      onderwerp: 'Toezicht',
      tekst:
        'Trainers die dat willen, worden opgeleid tot toezichthouder (cursus in maart).',
    },
    {
      id: 's3',
      onderwerp: 'Workshops',
      tekst:
        'Bij een workshop vooraf het niveau (beginner of gevorderd) aankondigen.',
    },
    {
      id: 's4',
      onderwerp: 'Workshops',
      tekst:
        'Oefeningen uit een workshop komen terug in de dinsdag- en donderdagtraining.',
    },
    {
      id: 's5',
      onderwerp: 'Workshops',
      tekst: 'Volgende workshop: keerpunten. Daarna schoolslag en rugslag.',
    },
    {
      id: 's6',
      onderwerp: 'Uitrusting',
      tekst:
        'Zwemmers hebben standaard een oud shirt in de tas voor extra weerstand.',
    },
    {
      id: 's7',
      onderwerp: 'Baanindeling',
      tekst:
        'Trainers schuiven zwemmers actief door als die dat zelf niet doen.',
    },
    {
      id: 's8',
      onderwerp: 'Baanindeling',
      tekst:
        'Trainers controleren de bijgewerkte gegevens van leden op de website.',
    },
    {
      id: 's9',
      onderwerp: 'Badgebruik',
      tekst: 'Om 21.00 zijn de waterpolodoelen eruit en gaan de lijnen erin.',
    },
    {
      id: 's10',
      onderwerp: 'Wedstrijden',
      tekst:
        'De Frankfurt-zwemmers trainen de week vooraf apart, met een keerpuntentraining wisselslag.',
    },
  ],
  belangrijkeData: [
    { datum: '2026-12-05', tekst: 'Wedstrijd Frankfurt' },
    { datum: '2026-12-13', tekst: 'Kerstballenestafette' },
    { tekst: 'December/kerstvakantie: openingstijden De Kwakel nog onbekend' },
    { tekst: 'Gijs is afwezig van 1 tot 6 januari en de hele maand februari' },
    { datum: '2027-01-10', tekst: 'Trainersoverleg' },
    {
      tekst: '7 of 14 maart 2027: proefwedstrijd, ter voorbereiding op Cardiff',
    },
  ],
}
