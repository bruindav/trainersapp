// Fix: fix-28 — help: demo met verzonnen namen
// Fix: fix-27 — help: demo-account
// Fix: fix-24 — help: bewerken aanzetten
// Fix: fix-23 — help: blokken inklappen
// Fix: fix-21 — help over trainingsopbouw en wedstrijden
// Fix: fix-20 — helppagina
import { createFileRoute } from '@tanstack/react-router'

import { InfoPagina } from '@/components/info-pagina'

export const Route = createFileRoute('/help')({
  head: () => ({ meta: [{ title: 'Help · NatUtrecht Trainersapp' }] }),
  component: HelpPagina,
})

const ONDERWERPEN = [
  ['inloggen', 'Inloggen'],
  ['beschikbaarheid', 'Beschikbaarheid opgeven'],
  ['rooster', 'Mijn rooster: je trainingen'],
  ['kan-niet', 'Kun je een keer niet?'],
  ['open-plek', 'Een open plek overnemen'],
  ['trainingen', 'Trainingen vastleggen'],
  ['jaarplan', 'Jaarplan en wedstrijden'],
  ['feedback', 'Feedback geven'],
  ['coordinator', 'Voor de coördinator'],
  ['installeren', 'De app op je telefoon zetten'],
] as const

function HelpPagina() {
  return (
    <InfoPagina
      eyebrow="Help"
      titel="Hoe werkt de Trainersapp?"
      intro={<p>Korte uitleg per onderwerp. Kom je er niet uit? Stuur feedback met de knop rechtsonder of vraag de coördinator.</p>}
    >
      <nav aria-label="Onderwerpen" className="rounded-xl bg-muted p-4">
        <p className="mb-2 font-bold">Onderwerpen</p>
        <ul className="grid gap-1 sm:grid-cols-2">
          {ONDERWERPEN.map(([id, titel]) => (
            <li key={id}>
              <a href={`#${id}`}>{titel}</a>
            </li>
          ))}
        </ul>
      </nav>

      <section id="inloggen" className="scroll-mt-24">
        <h2>Inloggen</h2>
        <p>
          Je logt in met <strong>Google</strong>, met het e-mailadres waarop de coördinator je heeft uitgenodigd. Een
          wachtwoord voor deze app heb je niet nodig.
        </p>
        <ul>
          <li>Heb je Gmail? Kies "Inloggen met Google" en daarna je Gmail-account.</li>
          <li>
            Geen Gmail? Maak gratis een Google-account met je eigen e-mailadres via{' '}
            <a href="https://accounts.google.com/signup" target="_blank" rel="noreferrer">
              accounts.google.com/signup
            </a>{' '}
            en kies "Mijn huidige e-mailadres gebruiken".
          </li>
          <li>Zie je "Geen toegang"? Dan klopt het e-mailadres niet met de uitnodiging. Vraag de coördinator.</li>
          <li>
            Eerst rondkijken zonder uitnodiging? Kies op het inlogscherm "Eerst rondkijken met het demo-account" en vul
            het wachtwoord in dat je van de coördinator krijgt. Met het demo-account kijk je rond als "Demo Trainer" in een
            kopie van de app met verzonnen namen. Je kunt alles bekijken, maar niets opslaan. Feedback geven kan wel.
          </li>
        </ul>
      </section>

      <section id="beschikbaarheid" className="scroll-mt-24">
        <h2>Beschikbaarheid opgeven</h2>
        <p>
          Voor elke roosterperiode vraagt de coördinator wanneer je kunt. Je ziet dan bovenaan het overzicht een rode
          melding "Wanneer kun jij trainen?". In drie stappen:
        </p>
        <ul>
          <li>
            Per training kies je <strong>Graag</strong>, <strong>Als het moet</strong> of <strong>Nee</strong>.
          </li>
          <li>Hoe vaak je hoogstens per maand wilt trainen.</li>
          <li>Data waarop je niet kunt, bijvoorbeeld een vakantie.</li>
        </ul>
        <p>
          Heeft een training <strong>vaste trainers</strong>, dan kies je daar alleen of je kunt <strong>invallen</strong>.
          Ben je zelf vaste trainer, dan hoef je alleen je afwezige data op te geven. Je kunt je keuzes aanpassen tot de
          coördinator de periode sluit.
        </p>
      </section>

      <section id="rooster" className="scroll-mt-24">
        <h2>Mijn rooster: je trainingen</h2>
        <p>
          Onder <strong>Mijn rooster</strong> zie je je komende trainingen, met wie je traint en wie het toezicht houdt.
          Via "Heel rooster" zie je de hele periode. Op het overzicht staat altijd je eerstvolgende training.
        </p>
      </section>

      <section id="kan-niet" className="scroll-mt-24">
        <h2>Kun je een keer niet?</h2>
        <p>
          Tik bij de training op <strong>Ik kan niet</strong>. Je hebt twee mogelijkheden:
        </p>
        <ul>
          <li>
            <strong>Plek vrijgeven</strong>: de training krijgt een open plek die iedereen ziet en kan overnemen.
          </li>
          <li>
            <strong>Een collega vragen</strong>: kies wie je wilt vragen (bovenaan staat wie graag kan), eventueel als ruil
            met een training van die collega. Het rooster verandert pas als je collega "ja" zegt.
          </li>
        </ul>
        <p>Goedkeuring is niet nodig; de coördinator ziet elke wijziging terug.</p>
      </section>

      <section id="open-plek" className="scroll-mt-24">
        <h2>Een open plek overnemen</h2>
        <p>
          Is er in de komende twee weken een training zonder trainer, dan staat er een <strong>rode balk</strong> bovenaan
          elk scherm. Kun jij? Tik op <strong>Ik neem hem</strong>, dan sta je direct op het rooster. Verzoeken van
          collega's vind je onder Mijn rooster bij "Verzoeken voor jou".
        </p>
      </section>

      <section id="trainingen" className="scroll-mt-24">
        <h2>Trainingen vastleggen</h2>
        <p>
          Onder <strong>Trainingen</strong> leg je vast wat je hebt getraind: onderdelen, meters en aandachtspunten. Zo
          zien collega's wat er in het water is gedaan. Een eerdere training kun je als basis voor een nieuwe gebruiken.
        </p>
      </section>

      <section id="jaarplan" className="scroll-mt-24">
        <h2>Jaarplan en wedstrijden</h2>
        <p>
          Onder <strong>Jaarplan</strong> staat de <strong>trainingsopbouw</strong>: per opbouw (bijv. sept–dec naar een
          wedstrijd) een inleiding, aandachtsgebieden en gekleurde fases op een tijdlijn. Tik op een fase voor het doel, de
          trainingszones, techniek en voorbeeldsets. Bovenaan zie je welke fase nu loopt. Blokken klap je in of uit door op
          de titel te tikken; de app onthoudt dat.
        </p>
        <ul>
          <li>
            Het jaarplan wordt ingevuld door de trainer met de taak Jaarplan (of de coördinator). Zet eerst "Jaarplan bewerken" aan; dan krijgt elk blok een potlood en prullenbak;
            teksten mogen opsommingen, inspringen, vet en kleur hebben, en plakken uit Word houdt die opmaak vast.
          </li>
          <li>
            <strong>Wedstrijden</strong> voeren de coördinator, de jaarplanbeheerder en de wedstrijdcoördinator in. Ze staan als
            vlaggetje op de tijdlijn.
          </li>
        </ul>
      </section>

      <section id="feedback" className="scroll-mt-24">
        <h2>Feedback geven</h2>
        <p>
          Rechtsonder op elk scherm staat de knop <strong>Feedback</strong>. De app maakt een screenshot van wat je op dat
          moment ziet; je typt erbij wat je opvalt of wat je anders wilt. De screenshot mag je ook weglaten. Alleen de
          coördinator leest je feedback.
        </p>
      </section>

      <section id="coordinator" className="scroll-mt-24">
        <h2>Voor de coördinator</h2>
        <ul>
          <li>
            <strong>Team</strong>: nodig trainers uit (ze krijgen meteen een mail), geef rollen en taken, en wijzig namen
            via het ⋯-menu.
          </li>
          <li>
            <strong>Periodes</strong>: stel onderaan de vaste trainingsmomenten in, met eventueel vaste trainers, een
            wisselritme en een periode waarin een moment geldt (bijv. een proef van jan t/m apr).
          </li>
          <li>
            Maak een periode, vraag de beschikbaarheid op, sluit hem en ga <strong>indelen</strong>: "Voorstel maken"
            vult het rooster, daarna pas je per training aan. Klik op een teller (bijv. "2 open plekken") om die trainingen
            te zien.
          </li>
          <li>
            Per training kun je ook een <strong>externe trainer</strong> invullen of "<strong>zwemmers trainen zelf</strong>"
            kiezen met een schema. Er is altijd een toezichthouder nodig.
          </li>
          <li>
            Na <strong>publiceren</strong> ziet iedereen het rooster. Wijzigingen van trainers zie je onder Mijn rooster bij
            "Recente wijzigingen". Feedback lees je via je accountmenu.
          </li>
        </ul>
      </section>

      <section id="installeren" className="scroll-mt-24">
        <h2>De app op je telefoon zetten</h2>
        <ul>
          <li>
            <strong>iPhone</strong>: open de app in Safari, tik op het deel-icoon (vierkant met pijl) en kies "Zet op
            beginscherm".
          </li>
          <li>
            <strong>Android</strong>: open de app in Chrome, tik op ⋮ en kies "Toevoegen aan startscherm".
          </li>
        </ul>
      </section>
    </InfoPagina>
  )
}
