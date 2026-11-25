// Fix: fix-38 — Playwright: end-to-end-tests van de belangrijkste gebruikersstromen
//
// `pnpm test:e2e` start de app (vite.e2e.config.ts: nep-inlog, gegevens in het
// geheugen) en draait de tests in e2e/ op een telefoon- en een desktopscherm.
// Rapport bekijken: `pnpm exec playwright show-report` (of het artefact in GitHub Actions).
import { defineConfig, devices } from '@playwright/test'

const POORT = 3200

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${POORT}`,
    locale: 'nl-NL',
    timezoneId: 'Europe/Amsterdam',
    // Bij een mislukte test: een "trace" om stap voor stap terug te kijken.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Lokaal kan een eigen Chrome worden gebruikt (PW_CHROME=/pad/naar/chrome).
    launchOptions: process.env.PW_CHROME
      ? { executablePath: process.env.PW_CHROME }
      : undefined,
  },
  projects: [
    { name: 'telefoon', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `pnpm exec vite --config vite.e2e.config.ts --port ${POORT} --strictPort`,
    url: `http://localhost:${POORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
