// Fix: fix-38 — e2e: het fixnummer is zichtbaar en lang drukken opent het testoverzicht
import { expect, test } from '@playwright/test'

test('de helppagina toont het fixnummer', async ({ page }) => {
  await page.goto('/help')
  // Bovenaan de helppagina staat "Je gebruikt versie fix-N" (of "dev" zonder git).
  const versie = page.getByRole('button', { name: /^Versie / }).first()
  await expect(versie).toBeVisible()
  await expect(versie).toHaveText(/^(fix-\d+|dev)$/)
})

test('lang drukken op het fixnummer opent het testoverzicht', async ({
  page,
}) => {
  await page.goto('/help')
  const versie = page.getByRole('button', { name: /^Versie / }).first()

  // Een gewone klik doet niets ...
  await versie.click()
  await expect(page.getByRole('dialog')).toBeHidden()

  // ... maar ruim een seconde ingedrukt houden opent het overzicht.
  await versie.click({ delay: 1200 })
  const overzicht = page.getByRole('dialog', { name: 'Testoverzicht' })
  await expect(overzicht).toBeVisible()
  // Per fix staan de testbestanden met een link naar GitHub.
  await expect(
    overzicht.getByRole('link', { name: /\.(test|spec)\.tsx?/ }).first(),
  ).toBeVisible()
})

test('ook met het toetsenbord: Enter ingedrukt houden', async ({ page }) => {
  await page.goto('/help')
  await page
    .getByRole('button', { name: /^Versie / })
    .first()
    .focus()
  await page.keyboard.down('Enter')
  await page.waitForTimeout(1000)
  await page.keyboard.up('Enter')
  await expect(
    page.getByRole('dialog', { name: 'Testoverzicht' }),
  ).toBeVisible()
})
