// Fix: fix-38 — e2e: altijd ingelogd als testtrainer, zonder Firebase
export * from '../../src/data/auth'
import { GEEN_TAKEN, type Trainer } from '../../src/data/fixtures'

export const E2E_TRAINER: Trainer = {
  id: 'e2e-anna',
  naam: 'Anna de Boer',
  initialen: 'AB',
  kleur: '#e64439',
  rol: 'Trainer',
  specialiteit: '',
  ...GEEN_TAKEN,
  coordinator: true,
}

export function startAuth() {}
export function useAuthStatus() {
  return {
    soort: 'ingelogd',
    user: { uid: E2E_TRAINER.id },
    trainer: E2E_TRAINER,
  } as never
}
