// Fix: fix-38 — Vite voor de Playwright-tests: de app met nep-inlog en een store in het geheugen
import { fileURLToPath } from 'node:url'
import { defineConfig, mergeConfig } from 'vite'

import basis from './vite.config'

const pad = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default mergeConfig(
  basis,
  defineConfig({
    resolve: {
      alias: [
        { find: /^@\/data\/auth$/, replacement: pad('./e2e/mock/auth.ts') },
        { find: /^@\/data\/store$/, replacement: pad('./e2e/mock/store.ts') },
      ],
    },
  }),
)
