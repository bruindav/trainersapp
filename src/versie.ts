// Fix: fix-20 — versie van de app (het fix-nummer), ingevuld tijdens de build
declare const __VERSIE__: string | undefined

export const VERSIE: string = typeof __VERSIE__ === 'string' ? __VERSIE__ : 'dev'
