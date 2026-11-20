// Fix: fix-35 — onderdelen verslepen (en omhoog/omlaag) om de volgorde te wijzigen
// Fix: fix-34 — training in dezelfde opbouw als het trainingsschema: invoer en weergave
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Modifier,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  ListChecks,
  Plus,
  Rows3,
  X,
} from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { PerBaan, Training, TrainingBlok } from '@/data/fixtures'
import { leesMeters, onderdeelVan } from '@/lib/training-schema'
import { cn } from '@/lib/utils'

/** "8 min" → 8; leeg of onleesbaar → 0. */
export function minutenVan(tijd: string | undefined) {
  const m = tijd?.match(/(\d+)\s*min/i)
  return m ? Number(m[1]) : 0
}

export const LEEG_ONDERDEEL: TrainingBlok = {
  onderdeel: 'Kern',
  naam: '',
  afstand: '',
  tijd: '',
  omschrijving: '',
  meters: 0,
}

/** Een onderdeel van een oudere training in de nieuwe vorm (naam, afstand, tijd). */
export function alsSchemaBlok(b: TrainingBlok): TrainingBlok {
  return {
    ...b,
    naam: b.naam ?? b.onderdeel,
    afstand: b.afstand ?? (b.meters ? `${b.meters} m` : ''),
    tijd: b.tijd ?? '',
  }
}

const getal = (n: number) => n.toLocaleString('nl-NL')

/** Alleen verticaal slepen (zonder extra pakket @dnd-kit/modifiers). */
const restrictToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
})

// ---------------------------------------------------------------------------
// Invoer
// ---------------------------------------------------------------------------

let volgnummer = 0
const nieuwId = () => `o${++volgnummer}`

export function OnderdelenInvoer({
  blokken,
  onChange,
  totaalToelichting,
  onTotaalToelichting,
}: {
  blokken: TrainingBlok[]
  onChange: (b: TrainingBlok[]) => void
  totaalToelichting: string
  onTotaalToelichting: (t: string) => void
}) {
  // fix-35: vaste sleutels per onderdeel, zodat slepen en invoer goed blijven gaan.
  // Ze lopen gelijk op met de blokken; komt er van buiten een hele nieuwe lijst
  // (bv. een ingelezen schema), dan krijgen alle onderdelen nieuwe sleutels.
  const [sleutels, setSleutels] = useState<string[]>(() => blokken.map(nieuwId))
  if (sleutels.length !== blokken.length) setSleutels(blokken.map(nieuwId))
  const ids =
    sleutels.length === blokken.length
      ? sleutels
      : blokken.map((_, i) => `tijdelijk-${i}`)

  const zet = (i: number, patch: Partial<TrainingBlok>) =>
    onChange(blokken.map((b, j) => (j === i ? { ...b, ...patch } : b)))
  const verplaats = (van: number, naar: number) => {
    if (naar < 0 || naar >= blokken.length || van === naar) return
    setSleutels(arrayMove(ids, van, naar))
    onChange(arrayMove(blokken, van, naar))
  }
  const verwijder = (i: number) => {
    setSleutels(ids.filter((_, j) => j !== i))
    onChange(blokken.filter((_, j) => j !== i))
  }
  const voegToe = () => {
    setSleutels([...ids, nieuwId()])
    onChange([...blokken, { ...LEEG_ONDERDEEL }])
  }

  // Slepen kan alleen aan het handvat (touch-none), dus met pointer-events werkt het
  // met muis én vinger zonder het scrollen van de pagina te hinderen.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const meters = blokken.reduce((n, b) => n + (b.meters || 0), 0)
  const minuten = blokken.reduce((n, b) => n + minutenVan(b.tijd), 0)

  return (
    <div className="space-y-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        accessibility={{
          screenReaderInstructions: {
            draggable:
              'Druk op spatie om het onderdeel op te pakken, gebruik de pijltjes om te verplaatsen en spatie om los te laten.',
          },
          announcements: {
            onDragStart: ({ active }) =>
              `Onderdeel ${ids.indexOf(String(active.id)) + 1} opgepakt.`,
            onDragOver: ({ over }) =>
              over ? `Naar plek ${ids.indexOf(String(over.id)) + 1}.` : '',
            onDragEnd: ({ over }) =>
              over
                ? `Neergezet op plek ${ids.indexOf(String(over.id)) + 1}.`
                : 'Neergezet.',
            onDragCancel: () => 'Verplaatsen geannuleerd.',
          },
        }}
        onDragEnd={({ active, over }) => {
          if (!over) return
          verplaats(
            ids.indexOf(String(active.id)),
            ids.indexOf(String(over.id)),
          )
        }}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ol className="space-y-3">
            {blokken.map((b, i) => (
              <OnderdeelKaart
                key={ids[i]}
                id={ids[i]}
                blok={b}
                nummer={i + 1}
                aantal={blokken.length}
                onZet={(patch) => zet(i, patch)}
                onVerwijder={() => verwijder(i)}
                onOmhoog={() => verplaats(i, i - 1)}
                onOmlaag={() => verplaats(i, i + 1)}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      <Button type="button" variant="outline" size="sm" onClick={voegToe}>
        <Plus /> Onderdeel toevoegen
      </Button>

      <div className="space-y-2 rounded-lg bg-muted p-3">
        <p className="flex flex-wrap items-baseline gap-x-4 text-sm font-bold">
          <span>Totaal</span>
          <span className="font-black">{getal(meters)} m</span>
          {minuten > 0 && <span>{minuten} min</span>}
        </p>
        <Input
          value={totaalToelichting}
          onChange={(e) => onTotaalToelichting(e.target.value)}
          placeholder="Toelichting bij het totaal (optioneel)"
          aria-label="Toelichting bij het totaal"
          maxLength={500}
        />
      </div>
    </div>
  )
}

function OnderdeelKaart({
  id,
  blok: b,
  nummer,
  aantal,
  onZet,
  onVerwijder,
  onOmhoog,
  onOmlaag,
}: {
  id: string
  blok: TrainingBlok
  nummer: number
  aantal: number
  onZet: (patch: Partial<TrainingBlok>) => void
  onVerwijder: () => void
  onOmhoog: () => void
  onOmlaag: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'relative space-y-2 rounded-lg border bg-card p-3',
        isDragging &&
          'z-10 shadow-lg ring-2 ring-primary motion-reduce:transition-none',
      )}
    >
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Onderdeel ${nummer} verslepen`}
          className="-ml-1 flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 active:cursor-grabbing"
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-black text-primary-foreground">
          {nummer}
        </span>
        <Input
          value={b.naam ?? ''}
          onChange={(e) =>
            onZet({
              naam: e.target.value,
              onderdeel: onderdeelVan(e.target.value),
            })
          }
          placeholder="Onderdeel, bv. Inzwemmen"
          aria-label={`Onderdeel ${nummer}`}
          className="font-semibold"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onVerwijder}
          disabled={aantal === 1}
          aria-label={`Verwijder onderdeel ${nummer}`}
        >
          <X />
        </Button>
      </div>
      <div className="grid grid-cols-[1fr_6rem] gap-2 pl-[3.75rem]">
        <div>
          <Input
            value={b.afstand ?? ''}
            onChange={(e) =>
              onZet({
                afstand: e.target.value,
                meters: leesMeters(e.target.value),
              })
            }
            placeholder="Afstand, bv. 4 x 100 m"
            aria-label={`Afstand onderdeel ${nummer}`}
          />
          <p
            className="mt-0.5 text-[11px] text-muted-foreground"
            aria-live="polite"
          >
            {b.meters
              ? `= ${getal(b.meters)} m`
              : b.afstand
                ? 'Geen meters herkend; schrijf bv. "4 x 100 m"'
                : ' '}
          </p>
        </div>
        <Input
          value={b.tijd ?? ''}
          onChange={(e) => onZet({ tijd: e.target.value })}
          placeholder="Tijd, 8 min"
          aria-label={`Tijd onderdeel ${nummer}`}
        />
      </div>
      <div className="pl-[3.75rem]">
        <Textarea
          rows={2}
          value={b.omschrijving}
          onChange={(e) => onZet({ omschrijving: e.target.value })}
          placeholder="Invulling, bv. 200 vrij, daarna 4 x 50 wisselslag. Rust 10 sec."
          aria-label={`Invulling onderdeel ${nummer}`}
        />
      </div>
      {aantal > 1 && (
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOmhoog}
            disabled={nummer === 1}
          >
            <ArrowUp /> <span className="sr-only">Onderdeel {nummer}</span>{' '}
            Omhoog
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOmlaag}
            disabled={nummer === aantal}
          >
            <ArrowDown /> <span className="sr-only">Onderdeel {nummer}</span>{' '}
            Omlaag
          </Button>
        </div>
      )}
    </li>
  )
}

export function PerBaanInvoer({
  rijen,
  onChange,
  toelichting,
  onToelichting,
}: {
  rijen: PerBaan[]
  onChange: (r: PerBaan[]) => void
  toelichting: string
  onToelichting: (t: string) => void
}) {
  const zet = (i: number, patch: Partial<PerBaan>) =>
    onChange(rijen.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  return (
    <fieldset className="space-y-2">
      <legend className="flex items-center gap-1.5 text-sm font-medium">
        <Rows3 className="size-4 text-primary" aria-hidden /> Aanpassen per baan{' '}
        <span className="font-normal text-muted-foreground">(optioneel)</span>
      </legend>
      {rijen.length > 0 && (
        <Input
          value={toelichting}
          onChange={(e) => onToelichting(e.target.value)}
          placeholder="Toelichting, bv. de 100%-set is voor iedereen 4 x 50 m"
          aria-label="Toelichting bij aanpassen per baan"
          maxLength={300}
        />
      )}
      {rijen.map((r, i) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_1fr_auto] gap-2 rounded-lg border p-2"
        >
          <Input
            value={r.banen}
            onChange={(e) => zet(i, { banen: e.target.value })}
            placeholder="Banen, bv. 1-2 (snel)"
            aria-label={`Banen ${i + 1}`}
          />
          <Input
            value={r.totaal}
            onChange={(e) => zet(i, { totaal: e.target.value })}
            placeholder="Totaal, bv. 1.775 m"
            aria-label={`Totaal ${i + 1}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onChange(rijen.filter((_, j) => j !== i))}
            aria-label={`Verwijder baanregel ${i + 1}`}
          >
            <X />
          </Button>
          <Textarea
            rows={1}
            value={r.aanpassing}
            onChange={(e) => zet(i, { aanpassing: e.target.value })}
            placeholder="Aanpassing, bv. 5 x 100 m wisselslag"
            aria-label={`Aanpassing ${i + 1}`}
            className="col-span-3 min-h-9"
          />
        </div>
      ))}
      {rijen.length < 10 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange([...rijen, { banen: '', aanpassing: '', totaal: '' }])
          }
        >
          <Plus /> Baanregel toevoegen
        </Button>
      )}
    </fieldset>
  )
}

export function AandachtspuntenInvoer({
  punten,
  onChange,
}: {
  punten: string[]
  onChange: (p: string[]) => void
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="flex items-center gap-1.5 text-sm font-medium">
        <ListChecks className="size-4 text-primary" aria-hidden />{' '}
        Aandachtspunten{' '}
        <span className="font-normal text-muted-foreground">(optioneel)</span>
      </legend>
      {punten.map((p, i) => (
        <div key={i} className="flex items-start gap-2">
          <span aria-hidden className="mt-2 text-primary">
            •
          </span>
          <Textarea
            rows={p.length > 90 ? 3 : 1}
            value={p}
            onChange={(e) =>
              onChange(punten.map((x, j) => (j === i ? e.target.value : x)))
            }
            aria-label={`Aandachtspunt ${i + 1}`}
            className="min-h-9"
            maxLength={500}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onChange(punten.filter((_, j) => j !== i))}
            aria-label={`Verwijder aandachtspunt ${i + 1}`}
          >
            <X />
          </Button>
        </div>
      ))}
      {punten.length < 20 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...punten, ''])}
        >
          <Plus /> Aandachtspunt toevoegen
        </Button>
      )}
    </fieldset>
  )
}

// ---------------------------------------------------------------------------
// Weergave (zoals het trainingsschema)
// ---------------------------------------------------------------------------

export function TrainingInhoud({ training: t }: { training: Training }) {
  const blokken = t.blokken
  const meters = blokken.reduce((n, b) => n + (b.meters || 0), 0)
  const minuten = blokken.reduce((n, b) => n + minutenVan(b.tijd), 0)
  return (
    <div className="space-y-5">
      {(t.opzet || t.doel) && (
        <div className="space-y-1.5">
          {t.opzet && <p className="text-sm font-bold">{t.opzet}</p>}
          {t.doel && <p className="text-sm text-muted-foreground">{t.doel}</p>}
        </div>
      )}

      {blokken.length > 0 && (
        <section aria-label="Onderdelen">
          <ol className="divide-y rounded-lg border">
            {blokken.map((b, i) => (
              <li key={i} className="space-y-1 p-3">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="text-xs font-black text-primary">
                    {i + 1}.
                  </span>
                  <span className="font-bold">{b.naam ?? b.onderdeel}</span>
                  <span className="ml-auto text-sm font-bold whitespace-nowrap">
                    {b.afstand && b.afstand !== `${b.meters} m`
                      ? b.afstand
                      : `${getal(b.meters)} m`}
                    {b.tijd && (
                      <span className="ml-2 font-normal text-muted-foreground">
                        {b.tijd}
                      </span>
                    )}
                  </span>
                </div>
                {b.omschrijving && <p className="text-sm">{b.omschrijving}</p>}
              </li>
            ))}
            <li className="flex flex-wrap items-baseline gap-x-3 bg-muted p-3">
              <span className="font-black">Totaal</span>
              <span className="ml-auto font-black whitespace-nowrap">
                {getal(meters)} m
                {minuten > 0 && (
                  <span className="ml-2 font-normal">{minuten} min</span>
                )}
              </span>
              {t.totaalToelichting && (
                <p className="w-full text-sm text-muted-foreground">
                  {t.totaalToelichting}
                </p>
              )}
            </li>
          </ol>
        </section>
      )}

      {t.perBaan && t.perBaan.length > 0 && (
        <section>
          <h3 className="mb-1 text-sm font-extrabold">
            Aanpassen per baan
            {t.perBaanToelichting && (
              <span className="font-normal text-muted-foreground">
                {' '}
                ({t.perBaanToelichting})
              </span>
            )}
          </h3>
          <ul className="divide-y rounded-lg border text-sm">
            {t.perBaan.map((r, i) => (
              <li
                key={i}
                className="grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-0.5 p-2.5"
              >
                <span className="font-bold">{r.banen}</span>
                <span>{r.aanpassing}</span>
                {r.totaal && (
                  <span className={cn('col-start-2 text-muted-foreground')}>
                    {r.totaal}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {t.aandachtspunten && t.aandachtspunten.length > 0 && (
        <section>
          <h3 className="mb-1 text-sm font-extrabold">Aandachtspunten</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm marker:text-primary">
            {t.aandachtspunten.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
