// Fix: fix-19 — mail versturen via EmailJS (zelfde dienst als HornetApp en VvE e-learning)
//
// We gebruiken het algemene sjabloon van de VvE e-learning: onderwerp en tekst
// worden per mail meegegeven. De public key is bedoeld om in de browser te
// staan; beperk in EmailJS (Account → Security) de toegestane domeinen.
export const EMAILJS_SERVICE_ID = 'service_am7yhzo'
export const EMAILJS_PUBLIC_KEY = 'grly1relpuAh_73z7'
export const EMAILJS_TEMPLATE_ID = 'template_mss670k'

export async function stuurMail(m: { aan: string; naam: string; onderwerp: string; tekst: string }) {
  const emailjs = (await import('@emailjs/browser')).default
  await emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
    { email: m.aan, to_name: m.naam, email_subject: m.onderwerp, email_body: m.tekst },
    { publicKey: EMAILJS_PUBLIC_KEY },
  )
}
