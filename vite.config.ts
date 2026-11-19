// Fix: fix-20 — versie (fix-nummer) uit de laatste commit
// Fix: fix-1 — Netlify/TanStack Start vervangen door een statische SPA voor Firebase Hosting
import { defineConfig } from 'vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'node:child_process'

/** "fix-20" uit de laatste commit ("fix-20: …"); anders "dev". */
function versie() {
  try {
    const onderwerp = execSync('git log -1 --format=%s', { encoding: 'utf8' }).trim()
    return /^(fix-\d+)/.exec(onderwerp)?.[1] ?? 'dev'
  } catch {
    return 'dev'
  }
}

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  define: { __VERSIE__: JSON.stringify(versie()) },
  // Ook oudere iPhones (iOS 15) moeten de app kunnen draaien.
  build: { target: ['es2020', 'safari15', 'chrome100', 'firefox100', 'edge100'] },
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), tailwindcss(), viteReact()],
})

export default config
