// Fix: fix-38 — testoverzicht-plugin ook in tests
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { testoverzichtPlugin } from './scripts/testoverzicht.ts'

export default defineConfig({
  plugins: [react(), testoverzichtPlugin()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
