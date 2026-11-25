// Fix: fix-38 — e2e: trainersoverleg bekijken en vastleggen
import { expect, test } from '@playwright/test'

test('het voorbeeld toont de afspraken per onderwerp', async ({ page }) => {
  await page.goto('/overleg')
  // Zonder overleggen verwijst de pagina naar het voorbeeld.
  await page.getByRole('link', { name: /Bekijk een voorbeeld/ }).click()
  await expect(page).toHaveURL(/\/overleg\/voorbeeld$/)

  const afspraken = page.getByRole('region', { name: 'Afspraken' })
  await expect(
    afspraken.getByRole('heading', { name: 'Toezicht' }),
  ).toBeVisible()
  await expect(
    afspraken.getByRole('heading', { name: 'Workshops' }),
  ).toBeVisible()
  // Het voorbeeld is alleen om te bekijken.
  await expect(page.getByRole('button', { name: 'Wijzigen' })).toHaveCount(0)
})

test('een overleg vastleggen als concept en goedkeuren', async ({ page }) => {
  await page.goto('/overleg')
  await page.getByRole('button', { name: 'Overleg vastleggen' }).click()

  const formulier = page.getByRole('dialog')
  await formulier.getByLabel('Titel').fill('Overleg januari')
  await formulier.getByLabel('Agendapunt 1', { exact: true }).fill('Toezicht')
  await formulier.getByRole('button', { name: 'Afspraak toevoegen' }).click()
  await formulier
    .getByLabel('Onderwerp afspraak 1', { exact: true })
    .fill('Toezicht')
  await formulier
    .getByLabel('Afspraak 1', { exact: true })
    .fill('Altijd iemand op de kant.')
  await formulier.getByRole('button', { name: 'Overleg opslaan' }).click()

  // Het nieuwe overleg staat in de lijst, als concept, met de afspraak in het blok Afspraken.
  await expect(
    page.getByRole('link', { name: /Overleg januari/ }),
  ).toContainText('Concept')
  await expect(page.getByRole('region', { name: 'Afspraken' })).toContainText(
    'Altijd iemand op de kant.',
  )

  // De testtrainer is coördinator en mag de notulen goedkeuren.
  await page.getByRole('link', { name: /Overleg januari/ }).click()
  await page.getByRole('button', { name: 'Notulen goedkeuren' }).click()
  await expect(page.getByText('Goedgekeurd.')).toBeVisible()
})
