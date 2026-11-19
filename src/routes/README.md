<!-- Fix: fix-1 -->
# Routing

De app is een single-page app met file-based routing van TanStack Router in `src/routes`. De app-shell en de inlogcontrole staan in `__root.tsx`; pagina's renderen via `<Outlet />`.

| File        | URL           |
| ----------- | ------------- |
| `index.tsx` | `/`           |
| `team.tsx`  | `/team`       |

Route files gebruiken `createFileRoute`. `src/routeTree.gen.ts` wordt gegenereerd door de Vite-plugin (niet bewerken, staat in `.gitignore`). Router-types zijn geregistreerd in `src/router.tsx`. Gebruik getypeerde `Link`-bestemmingen.

Firebase Hosting stuurt elk pad naar `index.html` (zie `firebase.json`), zodat diepe links zoals `/rooster?week=…` werken.
