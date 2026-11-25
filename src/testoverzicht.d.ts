// Fix: fix-38 — type van de virtuele module met het testoverzicht (zie scripts/testoverzicht.ts)
declare module 'virtual:testoverzicht' {
  const overzicht: import('../scripts/testoverzicht').FixTests[]
  export default overzicht
}
