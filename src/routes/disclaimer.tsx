// Fix: fix-20 — disclaimer
import { createFileRoute } from '@tanstack/react-router'

import { InfoPagina } from '@/components/info-pagina'

export const Route = createFileRoute('/disclaimer')({
  head: () => ({ meta: [{ title: 'Disclaimer · NatUtrecht Trainersapp' }] }),
  component: DisclaimerPagina,
})

function DisclaimerPagina() {
  return (
    <InfoPagina eyebrow="Disclaimer" titel="Disclaimer" bijgewerkt="19 november 2026">
      <section>
        <h2>Een hulpmiddel van vrijwilligers</h2>
        <p>
          De Trainersapp is door een vrijwilliger (digidave) gemaakt om de trainers van Nat Utrecht te helpen met het
          rooster, de beschikbaarheid en het trainingslogboek. De app wordt met zorg gemaakt en onderhouden, maar is geen
          professioneel product en wordt aangeboden zoals hij is.
        </p>
      </section>

      <section>
        <h2>Geen garanties</h2>
        <ul>
          <li>
            We doen ons best om de app goed te laten werken en de gegevens juist te houden, maar kunnen niet garanderen
            dat hij altijd bereikbaar is of foutloos werkt.
          </li>
          <li>
            Controleer bij twijfel over het rooster altijd even bij de coördinator, zeker vlak voor een training. Bij een
            fout in de app blijven de afspraken tussen trainers en coördinator leidend.
          </li>
          <li>
            Het voorstel voor het rooster is een hulpmiddel; de coördinator beslist. Ook feestdagen worden alleen
            gesignaleerd: of er die dag getraind wordt, bepaalt de vereniging.
          </li>
        </ul>
      </section>

      <section>
        <h2>Trainingsinhoud</h2>
        <p>
          Trainingen en schema's in het logboek zijn geschreven door trainers zelf. Iedere trainer blijft verantwoordelijk
          voor een veilige training die past bij de zwemmers, en er is altijd een toezichthouder aanwezig.
        </p>
      </section>

      <section>
        <h2>Aansprakelijkheid</h2>
        <p>
          De makers en de vereniging zijn niet aansprakelijk voor schade die ontstaat door het gebruik van de app, door
          fouten in de app of doordat de app tijdelijk niet beschikbaar is, voor zover de wet dat toestaat.
        </p>
      </section>

      <section>
        <h2>Naam en logo</h2>
        <p>
          De naam, het logo en de kleuren van Nat Utrecht zijn van de vereniging en worden alleen gebruikt voor deze app
          voor de eigen trainers.
        </p>
      </section>
    </InfoPagina>
  )
}
