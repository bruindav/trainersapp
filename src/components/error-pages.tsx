import {
  Link,
  useRouter,
  type ErrorComponentProps,
} from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="grid min-h-[60svh] place-items-center px-6 py-16">
      <div className="max-w-md space-y-6 text-center">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Pagina niet gevonden
        </h1>
        <p className="text-muted-foreground">
          Deze pagina bestaat niet. Controleer het adres of ga terug naar het overzicht.
        </p>
        <Button asChild>
          <Link to="/">Naar overzicht</Link>
        </Button>
      </div>
    </div>
  )
}

export function RouteErrorPage({ reset }: ErrorComponentProps) {
  const router = useRouter()

  return (
    <div className="grid min-h-[60svh] place-items-center px-6 py-16">
      <div className="max-w-md space-y-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          Deze pagina kon niet laden
        </h1>
        <p role="alert" className="text-muted-foreground">
          Probeer het opnieuw, of ga terug naar het overzicht.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            onClick={() => {
              void router.invalidate()
              reset()
            }}
          >
            Opnieuw proberen
          </Button>
          <Button variant="outline" asChild>
            <a href="/">Naar overzicht</a>
          </Button>
        </div>
      </div>
    </div>
  )
}
