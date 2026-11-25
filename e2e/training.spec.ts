// Fix: fix-38 — e2e: een training vastleggen (zelf invullen en met een trainingsschema-pdf)
import { expect, test } from '@playwright/test'

test('een training samenstellen en opslaan', async ({ page }) => {
  await page.goto('/trainingen?nieuw=true')
  const formulier = page.getByRole('dialog')
  await expect(
    formulier.getByRole('heading', { name: 'Nieuwe training' }),
  ).toBeVisible()

  // De titel volgt het gekozen moment, bv. "Training zondag op 22 november".
  await expect(formulier.getByLabel('Titel')).toHaveValue(
    /^Training (dinsdag|donderdag|zondag) op \d+ \w+$/,
  )

  // Het middelste onderdeel invullen: de meters worden uit de afstand berekend.
  await formulier
    .getByLabel('Onderdeel 2', { exact: true })
    .fill('Kern wisselslag')
  await formulier.getByLabel('Afstand onderdeel 2').fill('4 x 100 m')
  // Inzwemmen 400 m + Kern 400 m + Uitzwemmen 200 m: het totaal telt mee.
  await expect(formulier.getByText('1.000 m', { exact: true })).toBeVisible()

  await formulier.getByRole('button', { name: 'Training opslaan' }).click()

  // Na opslaan staat de training in het logboek (hier: in het geheugen van de test-app).
  await expect(page.getByText('Training vastgelegd')).toBeVisible()
})

test('een trainingsschema-pdf vult alle vakken', async ({ page }) => {
  await page.goto('/trainingen?nieuw=true')
  const formulier = page.getByRole('dialog')
  await formulier.getByRole('tab', { name: /Bestand uploaden/ }).click()

  // Kies de pdf; de app leest hem in en springt naar "Samenstellen".
  await formulier
    .locator('#n-bestand')
    .setInputFiles('e2e/bestanden/training-15-november.pdf')
  await expect(
    formulier.getByText(/Overgenomen uit het trainingsschema/),
  ).toBeVisible()

  await expect(formulier.getByLabel('Opzet')).toHaveValue(
    /^60 minuten • 6 banen/,
  )
  await expect(formulier.getByLabel('Doel')).toHaveValue(/^Fase 3, week 1/)
  await expect(
    formulier.getByLabel('Onderdeel 2', { exact: true }),
  ).toHaveValue('Starts op fluitsignaal')
  await expect(formulier.getByText('1.675 m')).toBeVisible()
  await expect(formulier.getByLabel(/^Aandachtspunt \d/)).toHaveCount(6)
  // De pdf blijft als bijlage bewaard.
  await expect(
    formulier.getByText('Bijlage: training-15-november.pdf'),
  ).toBeVisible()
})

test('onderdelen in een andere volgorde zetten', async ({ page }) => {
  await page.goto('/trainingen?nieuw=true')
  const formulier = page.getByRole('dialog')
  const naam = (n: number) =>
    formulier.getByLabel(`Onderdeel ${n}`, { exact: true })

  await naam(2).fill('Kern')
  // Met de knop: Uitzwemmen (3) één plek omhoog.
  await formulier.getByRole('button', { name: /Onderdeel 3 Omhoog/ }).click()
  await expect(naam(2)).toHaveValue('Uitzwemmen')
  await expect(naam(3)).toHaveValue('Kern')

  // Met het toetsenbord aan het handvat: spatie, pijl omhoog, spatie.
  // (Korte pauzes: de sleepbibliotheek meet tussen de stappen de posities.)
  await formulier.getByRole('button', { name: 'Onderdeel 3 verslepen' }).focus()
  await page.keyboard.press('Space')
  await page.waitForTimeout(200)
  await page.keyboard.press('ArrowUp')
  await page.waitForTimeout(300)
  await page.keyboard.press('Space')
  await expect(naam(2)).toHaveValue('Kern')
})
