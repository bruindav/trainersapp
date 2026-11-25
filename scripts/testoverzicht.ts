// Fix: fix-38 — testoverzicht per fix uit de git-geschiedenis (voor de verborgen optie bij het fixnummer)
//
// Wordt tijdens de build aangeroepen door vite.config.ts (virtuele module
// `virtual:testoverzicht`). Per fix-N: welke testbestanden nieuw of aangepast
// zijn en welke tests daarin zijn toegevoegd of gewijzigd.
// In CI moet de checkout de geschiedenis hebben (fetch-depth: 0).
import { execFileSync } from 'node:child_process'

export type TestSoort =
  'Playwright (end-to-end)' | 'Firestore-regels' | 'Unit/component (Vitest)'

export interface TestBestand {
  pad: string
  soort: TestSoort
  status: 'nieuw' | 'aangepast' | 'verwijderd'
  /** Namen van de tests die in deze fix zijn toegevoegd of gewijzigd. */
  tests: string[]
  url: string
}

export interface FixTests {
  fix: string
  onderwerp: string
  datum: string
  bestanden: TestBestand[]
}

const REPO_URL = 'https://github.com/bruindav/trainersapp'
const IS_TEST = /(^e2e\/.*\.spec\.ts$)|(\.test\.tsx?$)/
const TEST_NAAM =
  /\b(?:it|test)(?:\.(?:only|skip))?\(\s*(['"`])((?:\\.|(?!\1).)*)\1/

const git = (...args: string[]) =>
  execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })

function soortVan(pad: string): TestSoort {
  if (pad.startsWith('e2e/')) return 'Playwright (end-to-end)'
  if (pad.includes('rules')) return 'Firestore-regels'
  return 'Unit/component (Vitest)'
}

/** Alle tests in een bestand, met hun regelnummer (1-based). */
export function testsInBron(bron: string): { regel: number; naam: string }[] {
  const uit: { regel: number; naam: string }[] = []
  bron.split('\n').forEach((r, i) => {
    const m = TEST_NAAM.exec(r)
    if (m) uit.push({ regel: i + 1, naam: m[2] })
  })
  return uit
}

/** Regelnummers (in de nieuwe versie) die een diff met -U0 toevoegt of wijzigt. */
export function gewijzigdeRegels(diff: string): number[] {
  const regels: number[] = []
  for (const m of diff.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)) {
    const start = Number(m[1])
    const aantal = m[2] === undefined ? 1 : Number(m[2])
    // Alleen verwijderde regels: tel de test waar het gebeurde mee.
    if (aantal === 0) regels.push(Math.max(start, 1))
    for (let i = 0; i < aantal; i++) regels.push(start + i)
  }
  return regels
}

/**
 * De tests waar gewijzigde regels in staan: de laatste test-aanroep op of vóór de regel,
 * tenzij er een `describe(` tussen staat. Lege regels, commentaar en losse haakjes tellen niet.
 */
export function testenBijRegels(bron: string, regels: number[]) {
  const r = bron.split('\n')
  const tests = testsInBron(bron)
  const namen = new Set<string>()
  for (const nr of regels) {
    const inhoud = (r[nr - 1] ?? '').trim()
    if (!inhoud || inhoud.startsWith('//') || /^[)}\]]+[,;)]*$/.test(inhoud))
      continue
    let gevonden: { regel: number; naam: string } | undefined
    for (const t of tests) {
      if (t.regel <= nr) gevonden = t
      else break
    }
    if (!gevonden) continue
    const tussen = r.slice(gevonden.regel, nr)
    if (tussen.some((x) => /\bdescribe\(/.test(x))) continue
    namen.add(gevonden.naam)
  }
  return [...namen]
}

export function maakTestoverzicht(maxFixes = 40): FixTests[] {
  let log: string
  try {
    log = git('log', '--format=%H%x09%cI%x09%s', '-n', '600')
  } catch {
    return []
  }
  const perFix = new Map<
    string,
    FixTests & { _bestanden: Map<string, TestBestand> }
  >()
  // Van oud naar nieuw, zodat "nieuw" bij de eerste fix blijft staan.
  const commits = log
    .trim()
    .split('\n')
    .map((r) => r.split('\t'))
    .filter((d) => d.length >= 3 && /^fix-\d+:/.test(d[2]))
    .reverse()

  for (const [sha, datum, onderwerp] of commits) {
    const fix = /^(fix-\d+):/.exec(onderwerp)![1]
    let namen: string
    try {
      namen = git(
        'diff-tree',
        '--no-commit-id',
        '-r',
        '--root',
        '--name-status',
        sha,
      )
    } catch {
      continue
    }
    const bestanden = namen
      .trim()
      .split('\n')
      .map((r) => r.split('\t'))
      .filter(([, pad]) => pad && IS_TEST.test(pad))
    if (!bestanden.length) continue

    const f =
      perFix.get(fix) ??
      ({
        fix,
        onderwerp: onderwerp.replace(/^fix-\d+:\s*/, ''),
        datum: datum.slice(0, 10),
        bestanden: [],
        _bestanden: new Map(),
      } as FixTests & { _bestanden: Map<string, TestBestand> })
    perFix.set(fix, f)

    for (const [code, pad] of bestanden) {
      const status = code.startsWith('A')
        ? 'nieuw'
        : code.startsWith('D')
          ? 'verwijderd'
          : 'aangepast'
      let tests: string[] = []
      if (status !== 'verwijderd') {
        try {
          const bron = git('show', `${sha}:${pad}`)
          tests =
            status === 'nieuw'
              ? testsInBron(bron).map((t) => t.naam)
              : testenBijRegels(
                  bron,
                  gewijzigdeRegels(
                    git('show', '--format=', '-U0', sha, '--', pad),
                  ),
                )
        } catch {
          // Bestand niet leesbaar (bv. buiten een ondiepe kloon): alleen de naam tonen.
        }
      }
      const eerder = f._bestanden.get(pad)
      f._bestanden.set(pad, {
        pad,
        soort: soortVan(pad),
        status:
          eerder?.status === 'nieuw' && status !== 'verwijderd'
            ? 'nieuw'
            : status,
        tests: [...new Set([...(eerder?.tests ?? []), ...tests])],
        url: `${REPO_URL}/blob/${sha}/${pad}`,
      })
    }
  }

  return [...perFix.values()]
    .map(({ _bestanden, ...f }) => ({
      ...f,
      bestanden: [..._bestanden.values()].sort(
        (a, b) => a.soort.localeCompare(b.soort) || a.pad.localeCompare(b.pad),
      ),
    }))
    .sort((a, b) => Number(b.fix.slice(4)) - Number(a.fix.slice(4)))
    .slice(0, maxFixes)
}

/** Vite-plugin: `import('virtual:testoverzicht')` geeft het overzicht (alleen geladen als iemand het opent). */
export function testoverzichtPlugin() {
  const id = 'virtual:testoverzicht'
  return {
    name: 'testoverzicht',
    resolveId(bron: string) {
      return bron === id ? '\0' + id : undefined
    },
    load(volledig: string) {
      return volledig === '\0' + id
        ? `export default ${JSON.stringify(maakTestoverzicht())}`
        : undefined
    },
  }
}
