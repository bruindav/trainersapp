// Fix: fix-38 — e2e: de echte store met vaste testgegevens; opslaan gebeurt in het geheugen
// (Playwright-tests praten nooit met de echte database).
export * from '../../src/data/store'
import * as echt from '../../src/data/store'
import {
  GEEN_TAKEN,
  STANDAARD_JAARPLAN,
  type AppData,
  type Training,
} from '../../src/data/fixtures'
import { normaliseerJaarplan } from '../../src/data/jaarplan'
import { OPBOUW_SEPT_DEC_2026 } from '../../src/data/jaarplan-voorbeeld'
import type { Overleg, OverlegVelden } from '../../src/data/overleg'
import type { BijlageData } from '../../src/lib/bijlage'

let data: AppData = {
  huidigeTrainerId: 'e2e-anna',
  trainers: [
    {
      id: 'e2e-anna',
      naam: 'Anna de Boer',
      initialen: 'AB',
      kleur: '#e64439',
      rol: 'Trainer',
      specialiteit: '',
      ...GEEN_TAKEN,
      coordinator: true,
    },
    {
      id: 'e2e-bram',
      naam: 'Bram Smit',
      initialen: 'BS',
      kleur: '#2f8fc0',
      rol: 'Trainer',
      specialiteit: '',
      ...GEEN_TAKEN,
    },
  ],
  uitnodigingen: [],
  toezichthouders: [],
  trainingsmomenten: [],
  roosterperiodes: [],
  beschikbaarheid: {},
  ruilverzoeken: [],
  wijzigingslog: [],
  afwezigheden: [],
  roosterWijzigingen: {},
  wedstrijden: [],
  overleggen: [],
  trainingen: [],
  jaarplan: normaliseerJaarplan({
    ...STANDAARD_JAARPLAN,
    opbouwen: [OPBOUW_SEPT_DEC_2026],
  }),
} as unknown as AppData

const zet = (nieuw: Partial<AppData>) => {
  data = { ...data, ...nieuw }
  echt.__zetTestData(data)
}
let teller = 0

export function startSync() {
  echt.__zetTestData(data)
  return () => {}
}

export function voegTrainingToe(t: Omit<Training, 'id' | 'aangemaaktDoor'>) {
  const id = `e2e-t${++teller}`
  zet({
    trainingen: [
      ...data.trainingen,
      { ...t, id, aangemaaktDoor: data.huidigeTrainerId },
    ],
  })
  return id
}
export function werkTrainingBij(
  id: string,
  t: Omit<Training, 'id' | 'aangemaaktDoor'>,
) {
  zet({
    trainingen: data.trainingen.map((x) => (x.id === id ? { ...x, ...t } : x)),
  })
}
export function verwijderTraining(id: string) {
  zet({ trainingen: data.trainingen.filter((x) => x.id !== id) })
}
export function bewaarOverleg(
  id: string | null,
  velden: OverlegVelden,
  _bijlage?: BijlageData | null,
) {
  void _bijlage
  if (id) {
    zet({
      overleggen: data.overleggen.map((o) =>
        o.id === id ? { ...o, ...velden } : o,
      ),
    })
    return id
  }
  const nieuw: Overleg = {
    ...velden,
    id: `e2e-o${++teller}`,
    status: 'concept',
    aangemaaktDoor: data.huidigeTrainerId,
  }
  zet({ overleggen: [nieuw, ...data.overleggen] })
  return nieuw.id
}
export function keurOverlegGoed(id: string) {
  zet({
    overleggen: data.overleggen.map((o) =>
      o.id === id ? { ...o, status: 'goedgekeurd' as const } : o,
    ),
  })
}
export function zetActieKlaar(o: Overleg, actieId: string, klaar: boolean) {
  const punten = o.punten.map((p) => ({
    ...p,
    acties: p.acties.map((a) => (a.id === actieId ? { ...a, klaar } : a)),
  }))
  zet({
    overleggen: data.overleggen.map((x) =>
      x.id === o.id ? { ...x, punten } : x,
    ),
  })
}
export function verwijderOverleg(id: string) {
  zet({ overleggen: data.overleggen.filter((o) => o.id !== id) })
}
