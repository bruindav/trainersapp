// Fix: fix-1 — aparte Vitest-config voor de Firestore-regels (draait in de emulator)
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.rules.test.ts'],
    testTimeout: 20000,
    fileParallelism: false,
  },
})
