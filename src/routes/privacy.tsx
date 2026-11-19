// Fix: fix-20 — privacyverklaring
import { createFileRoute } from '@tanstack/react-router'

import { InfoPagina } from '@/components/info-pagina'

export const Route = createFileRoute('/privacy')({
  head: () => ({ meta: [{ title: 'Privacy · NatUtrecht Trainersapp' }] }),
  component: PrivacyPagina,
})

function PrivacyPagina() {
  return (
    <InfoPagina
      eyebrow="Privacy"
      titel="Privacyverklaring"
      bijgewerkt="19 november 2026"
      intro={<p>Welke gegevens de Trainersapp bewaart, waarom, wie ze ziet en wat je rechten zijn.</p>}
    >
      <section>
        <h2>Wie zijn wij?</h2>
        <p>
          De Trainersapp is een hulpmiddel voor de trainers van zwemvereniging Nat Utrecht. De app is gemaakt en wordt
          beheerd door Dave de Bruin (digidave), als vrijwilliger voor de vereniging. Vragen over je gegevens stel je aan
          de trainingscoördinator of via de feedbackknop in de app.
        </p>
      </section>

      <section>
        <h2>Welke gegevens?</h2>
        <ul>
          <li>
            <strong>Over jou als teamlid</strong>: naam, e-mailadres, je rol (trainer, assistent-trainer) en taken
            (bijv. coördinator of toezichthouder), en de kleur van je avatar.
          </li>
          <li>
            <strong>Beschikbaarheid</strong>: welke trainingen je graag, als het moet of niet geeft, je maximum per maand
            en data waarop je niet kunt. Een reden vragen we niet.
          </li>
          <li>
            <strong>Rooster</strong>: op welke trainingen je staat, verzoeken om te ruilen of over te nemen (met een
            eventueel berichtje) en een logboek van wijzigingen.
          </li>
          <li>
            <strong>Trainingslogboek</strong>: de trainingen die je vastlegt.
          </li>
          <li>
            <strong>Feedback</strong>: je tekst, het scherm waar je was en, als je dat wilt, een screenshot. Let op: op
            een screenshot staat wat je op dat moment zag, dus soms ook namen van collega's.
          </li>
        </ul>
        <p>We vragen geen adres, telefoonnummer, geboortedatum of gezondheidsgegevens.</p>
      </section>

      <section>
        <h2>Waarvoor?</h2>
        <p>
          Alleen om de trainingen te organiseren: het rooster maken, open plekken vullen, ruilen en bijhouden wat er
          getraind is. De gegevens worden niet verkocht, niet voor reclame gebruikt en niet gedeeld buiten de
          diensten hieronder. De app gebruikt geen advertenties, geen analytics en geen tracking.
        </p>
      </section>

      <section>
        <h2>Wie ziet wat?</h2>
        <ul>
          <li>
            Alle trainers met toegang zien het team, het rooster, ieders beschikbaarheid en het trainingslogboek. Dat is
            zo afgesproken, zodat je zelf kunt zien wie je kunt vragen om te ruilen.
          </li>
          <li>De coördinator ziet daarnaast de openstaande uitnodigingen en de feedback.</li>
          <li>Zonder uitnodiging kan niemand inloggen of gegevens zien.</li>
        </ul>
      </section>

      <section>
        <h2>Welke diensten gebruiken we?</h2>
        <ul>
          <li>
            <strong>Google Firebase</strong> (Google): inloggen met je Google-account, het bewaren van de gegevens en het
            hosten van de app. Zie{' '}
            <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noreferrer">
              Firebase en privacy
            </a>
            .
          </li>
          <li>
            <strong>Google Fonts</strong>: het lettertype van de app. Daarbij ziet Google je IP-adres.
          </li>
          <li>
            <strong>EmailJS</strong>: het versturen van de uitnodigingsmail (naam en e-mailadres). Zie{' '}
            <a href="https://www.emailjs.com/legal/privacy-policy/" target="_blank" rel="noreferrer">
              privacybeleid EmailJS
            </a>
            .
          </li>
        </ul>
      </section>

      <section>
        <h2>Opslag op je apparaat</h2>
        <p>
          De app gebruikt geen trackingcookies. Om ingelogd te blijven en ook met slecht bereik te werken, bewaart je
          browser je inlogsessie en een kopie van de gegevens. Bij uitloggen wordt die kopie gewist. Daarnaast onthoudt de
          app een paar instellingen, zoals welke blokken je hebt ingeklapt.
        </p>
      </section>

      <section>
        <h2>Hoe lang?</h2>
        <ul>
          <li>
            Zolang je in het team zit. Word je uit het team gehaald, dan wordt je teamprofiel verwijderd en kun je niet
            meer inloggen. Je beschikbaarheid en plekken in oude roosters blijven bewaard zolang die periodes bestaan.
          </li>
          <li>
            Trainingen die je hebt vastgelegd blijven bewaard voor het logboek; ze staan dan op naam van "Oud-trainer".
          </li>
          <li>Feedback blijft bewaard tot de coördinator hem verwijdert.</li>
          <li>Wil je dat ook je inlogaccount bij de app wordt verwijderd, vraag dat dan aan de beheerder.</li>
        </ul>
      </section>

      <section>
        <h2>Je rechten</h2>
        <p>
          Je mag vragen welke gegevens er over je zijn bewaard, ze laten verbeteren of laten verwijderen. Vraag het de
          coördinator of stuur feedback via de app. Ben je het niet eens met hoe we met je gegevens omgaan, dan kun je een
          klacht indienen bij de{' '}
          <a href="https://www.autoriteitpersoonsgegevens.nl" target="_blank" rel="noreferrer">
            Autoriteit Persoonsgegevens
          </a>
          .
        </p>
      </section>
    </InfoPagina>
  )
}
