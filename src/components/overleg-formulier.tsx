// Fix: fix-37 — trainersoverleg vastleggen of wijzigen: notulen-bestand, agendapunten met acties, afspraken, data
import {
  CalendarDays,
  FileUp,
  Handshake,
  ListTodo,
  Loader2,
  Paperclip,
  Plus,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  STANDAARD_ONDERWERPEN,
  nieuwId,
  type Afspraak,
  type Agendapunt,
  type BelangrijkeDatum,
  type Overleg,
  type OverlegVelden,
} from '@/data/overleg'
import { bewaarOverleg, useAppData } from '@/data/store'
import { MAX_BESTAND_KB, maakBijlage, type BijlageData } from '@/lib/bijlage'
import { todayISO } from '@/lib/dates'
import { cn } from '@/lib/utils'

/** Diepe kopie (structuredClone bestaat pas vanaf Safari 15.4). */
const kloon = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T

const leegPunt = (): Agendapunt => ({
  id: nieuwId('p'),
  titel: '',
  tekst: '',
  acties: [],
})
const leegAfspraak = (onderwerp = ''): Afspraak => ({
  id: nieuwId('s'),
  onderwerp,
  tekst: '',
})

export function OverlegFormulier({
  bewerk,
  onKlaar,
}: {
  bewerk: Overleg | null
  onKlaar: (id?: string) => void
}) {
  const data = useAppData()
  const [datum, setDatum] = useState(bewerk?.datum ?? todayISO())
  const [titel, setTitel] = useState(bewerk?.titel ?? 'Trainersoverleg')
  const [aanwezig, setAanwezig] = useState(bewerk?.aanwezig ?? '')
  const [gasten, setGasten] = useState(bewerk?.gasten ?? '')
  const [punten, setPunten] = useState<Agendapunt[]>(
    bewerk?.punten.length ? kloon(bewerk.punten) : [leegPunt()],
  )
  const [afspraken, setAfspraken] = useState<Afspraak[]>(
    bewerk ? kloon(bewerk.afspraken) : [],
  )
  const [belangrijkeData, setBelangrijkeData] = useState<BelangrijkeDatum[]>(
    bewerk ? kloon(bewerk.belangrijkeData) : [],
  )
  const [bestand, setBestand] = useState<File | null>(null)
  const [bijlageWeg, setBijlageWeg] = useState(false)
  const [bijlageFout, setBijlageFout] = useState('')
  const [poging, setPoging] = useState(false)
  const [bezig, setBezig] = useState(false)
  const bestaandeBijlage =
    bewerk?.bijlage && !bijlageWeg ? bewerk.bijlage : null
  const bijlageNaam = bestand?.name ?? bestaandeBijlage

  // Onderwerpen om uit te kiezen: de vaste lijst plus wat eerder is gebruikt.
  const onderwerpen = [
    ...new Set([
      ...STANDAARD_ONDERWERPEN,
      ...data.overleggen.flatMap((o) => o.afspraken.map((a) => a.onderwerp)),
    ]),
  ].filter(Boolean)

  const zetPunt = (i: number, patch: Partial<Agendapunt>) =>
    setPunten(punten.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  const zetActie = (
    i: number,
    k: number,
    patch: Partial<Agendapunt['acties'][number]>,
  ) =>
    zetPunt(i, {
      acties: punten[i].acties.map((a, j) =>
        j === k ? { ...a, ...patch } : a,
      ),
    })

  const fouten: string[] = []
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum))
    fouten.push('Kies de datum van het overleg.')
  if (!titel.trim()) fouten.push('Geef het overleg een titel.')
  if (!punten.some((p) => p.titel.trim()) && !bijlageNaam)
    fouten.push(
      'Vul minstens één agendapunt in, of upload de notulen als bestand.',
    )

  async function opslaan() {
    setPoging(true)
    if (fouten.length || bezig) return
    let bijlage: BijlageData | undefined
    if (bestand) {
      setBezig(true)
      const uitkomst = await maakBijlage(bestand).catch(() => ({
        fout: 'Het bestand kon niet gelezen worden.',
      }))
      setBezig(false)
      if ('fout' in uitkomst) return setBijlageFout(uitkomst.fout)
      bijlage = uitkomst
    }
    const velden: OverlegVelden = {
      datum,
      titel: titel.trim(),
      aanwezig: aanwezig.trim(),
      gasten: gasten.trim(),
      punten: punten
        .filter((p) => p.titel.trim() || p.tekst.trim())
        .map((p) => ({
          ...p,
          titel: p.titel.trim() || 'Agendapunt',
          tekst: p.tekst.trim(),
          acties: p.acties
            .filter((a) => a.wat.trim())
            .map((a) => ({ ...a, wie: a.wie.trim(), wat: a.wat.trim() })),
        })),
      afspraken: afspraken
        .filter((a) => a.tekst.trim())
        .map((a) => ({
          ...a,
          onderwerp: a.onderwerp.trim() || 'Overig',
          tekst: a.tekst.trim(),
          vervallen: a.vervallen === true,
        })),
      belangrijkeData: belangrijkeData
        .filter((d) => d.tekst.trim())
        .map((d) => ({
          tekst: d.tekst.trim(),
          ...(d.datum ? { datum: d.datum } : {}),
        })),
      bijlage: bijlage?.naam ?? bestaandeBijlage ?? undefined,
    }
    const id = bewaarOverleg(
      bewerk?.id ?? null,
      velden,
      bijlage ?? (bewerk?.bijlage && bijlageWeg ? null : undefined),
    )
    toast.success(bewerk ? 'Overleg bijgewerkt' : 'Overleg vastgelegd', {
      description: bewerk
        ? undefined
        : 'Het staat als concept klaar tot de coördinator de notulen goedkeurt.',
    })
    onKlaar(id)
  }

  return (
    <form
      className="min-w-0 space-y-6"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void opslaan()
      }}
    >
      <DialogHeader>
        <DialogTitle className="text-xl font-black">
          {bewerk ? 'Overleg wijzigen' : 'Trainersoverleg vastleggen'}
        </DialogTitle>
        <DialogDescription>
          Upload de notulen en/of zet de agendapunten, acties en afspraken erin.
          Een nieuw overleg is een concept tot de coördinator het goedkeurt.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <div className="space-y-2">
          <Label htmlFor="o-datum">Datum</Label>
          <Input
            id="o-datum"
            type="date"
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
            aria-invalid={poging && !datum}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="o-titel">Titel</Label>
          <Input
            id="o-titel"
            value={titel}
            maxLength={200}
            onChange={(e) => setTitel(e.target.value)}
            aria-invalid={poging && !titel.trim()}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="o-aanwezig">Aanwezig</Label>
          <Input
            id="o-aanwezig"
            value={aanwezig}
            maxLength={1000}
            onChange={(e) => setAanwezig(e.target.value)}
            placeholder="Namen, gescheiden door komma's"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="o-gasten">Gasten (optioneel)</Label>
          <Input
            id="o-gasten"
            value={gasten}
            maxLength={500}
            onChange={(e) => setGasten(e.target.value)}
            placeholder="Bijv. iemand van het bestuur bij één punt"
          />
        </div>
      </div>

      {/* Notulen als bestand */}
      <div className="space-y-2">
        <Label htmlFor="o-bestand">Notulen (bestand)</Label>
        {bijlageNaam ? (
          <div className="flex items-center gap-3 rounded-lg border border-dashed p-3 text-sm">
            <Paperclip className="size-4 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0 flex-1 truncate font-medium">
              {bijlageNaam}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setBestand(null)
                setBijlageFout('')
                if (!bestand && bewerk?.bijlage) setBijlageWeg(true)
              }}
            >
              <X /> Weghalen
            </Button>
          </div>
        ) : (
          <label
            htmlFor="o-bestand"
            className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed p-4 text-sm transition-colors hover:border-primary hover:bg-accent/40 motion-reduce:transition-none"
          >
            <FileUp className="size-6 text-primary" aria-hidden />
            <span>
              <span className="block font-bold">
                Kies een pdf of Word-bestand
              </span>
              <span className="text-xs text-muted-foreground">
                Max. {MAX_BESTAND_KB} kB. Collega's kunnen het openen.
              </span>
            </span>
            <input
              id="o-bestand"
              type="file"
              accept=".pdf,.doc,.docx,.odt,image/*"
              className="sr-only"
              onChange={(e) => {
                setBestand(e.target.files?.[0] ?? null)
                setBijlageFout('')
              }}
            />
          </label>
        )}
        {bijlageFout && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {bijlageFout}
          </p>
        )}
      </div>

      {/* Agendapunten */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-bold">Agendapunten</legend>
        {punten.map((p, i) => (
          <div key={p.id} className="space-y-2 rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-black text-primary-foreground">
                {i + 1}
              </span>
              <Input
                value={p.titel}
                onChange={(e) => zetPunt(i, { titel: e.target.value })}
                placeholder="Onderwerp, bijv. Toezichthouders"
                aria-label={`Agendapunt ${i + 1}`}
                maxLength={200}
                className="font-semibold"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setPunten(punten.filter((_, j) => j !== i))}
                aria-label={`Verwijder agendapunt ${i + 1}`}
              >
                <X />
              </Button>
            </div>
            <Textarea
              rows={p.tekst.length > 300 ? 6 : 3}
              value={p.tekst}
              onChange={(e) => zetPunt(i, { tekst: e.target.value })}
              placeholder="Wat is er besproken? Een witregel begint een nieuwe alinea."
              aria-label={`Bespreking agendapunt ${i + 1}`}
              maxLength={20000}
            />
            <div className="space-y-2 pl-2">
              <p className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                <ListTodo className="size-3.5" aria-hidden /> Acties
              </p>
              {p.acties.map((a, k) => (
                <div
                  key={a.id}
                  className="grid grid-cols-[7rem_1fr_auto] items-start gap-2"
                >
                  <Input
                    value={a.wie}
                    onChange={(e) => zetActie(i, k, { wie: e.target.value })}
                    placeholder="Wie"
                    aria-label={`Wie, actie ${k + 1} van punt ${i + 1}`}
                    maxLength={200}
                  />
                  <Textarea
                    rows={1}
                    value={a.wat}
                    onChange={(e) => zetActie(i, k, { wat: e.target.value })}
                    placeholder="Wat moet er gebeuren?"
                    aria-label={`Wat, actie ${k + 1} van punt ${i + 1}`}
                    className="min-h-9"
                    maxLength={1000}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      zetPunt(i, { acties: p.acties.filter((_, j) => j !== k) })
                    }
                    aria-label={`Verwijder actie ${k + 1} van punt ${i + 1}`}
                  >
                    <X />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  zetPunt(i, {
                    acties: [
                      ...p.acties,
                      { id: nieuwId('a'), wie: '', wat: '', klaar: false },
                    ],
                  })
                }
              >
                <Plus /> Actie
              </Button>
            </div>
          </div>
        ))}
        {punten.length < 30 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPunten([...punten, leegPunt()])}
          >
            <Plus /> Agendapunt toevoegen
          </Button>
        )}
      </fieldset>

      {/* Afspraken */}
      <fieldset className="space-y-3 rounded-xl border-2 border-primary/30 p-3">
        <legend className="flex items-center gap-1.5 px-1 text-sm font-bold">
          <Handshake className="size-4 text-primary" aria-hidden /> Afspraken
        </legend>
        <p className="text-xs text-muted-foreground">
          Wat hebben jullie afgesproken? Kies per afspraak een onderwerp; op de
          overlegpagina staan ze per onderwerp bij elkaar.
        </p>
        <datalist id="o-onderwerpen">
          {onderwerpen.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
        {afspraken.map((a, i) => (
          <div
            key={a.id}
            className={cn(
              'grid grid-cols-[1fr_auto] gap-2 rounded-lg border p-2',
              a.vervallen && 'opacity-60',
            )}
          >
            <Input
              value={a.onderwerp}
              list="o-onderwerpen"
              onChange={(e) =>
                setAfspraken(
                  afspraken.map((x, j) =>
                    j === i ? { ...x, onderwerp: e.target.value } : x,
                  ),
                )
              }
              placeholder="Onderwerp, bijv. Toezicht"
              aria-label={`Onderwerp afspraak ${i + 1}`}
              maxLength={60}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setAfspraken(afspraken.filter((_, j) => j !== i))}
              aria-label={`Verwijder afspraak ${i + 1}`}
            >
              <X />
            </Button>
            <Textarea
              rows={1}
              value={a.tekst}
              onChange={(e) =>
                setAfspraken(
                  afspraken.map((x, j) =>
                    j === i ? { ...x, tekst: e.target.value } : x,
                  ),
                )
              }
              placeholder="De afspraak"
              aria-label={`Afspraak ${i + 1}`}
              className="col-span-2 min-h-9"
              maxLength={1000}
            />
            {bewerk && (
              <label className="col-span-2 flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={a.vervallen === true}
                  onChange={(e) =>
                    setAfspraken(
                      afspraken.map((x, j) =>
                        j === i ? { ...x, vervallen: e.target.checked } : x,
                      ),
                    )
                  }
                />
                Vervallen (geldt niet meer)
              </label>
            )}
          </div>
        ))}
        {afspraken.length < 50 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setAfspraken([
                ...afspraken,
                leegAfspraak(afspraken[afspraken.length - 1]?.onderwerp ?? ''),
              ])
            }
          >
            <Plus /> Afspraak toevoegen
          </Button>
        )}
      </fieldset>

      {/* Belangrijke data */}
      <fieldset className="space-y-2">
        <legend className="flex items-center gap-1.5 text-sm font-bold">
          <CalendarDays className="size-4 text-primary" aria-hidden />{' '}
          Belangrijke data{' '}
          <span className="font-normal text-muted-foreground">(optioneel)</span>
        </legend>
        {belangrijkeData.map((d, i) => (
          <div key={i} className="grid grid-cols-[9.5rem_1fr_auto] gap-2">
            <Input
              type="date"
              value={d.datum ?? ''}
              onChange={(e) =>
                setBelangrijkeData(
                  belangrijkeData.map((x, j) =>
                    j === i ? { ...x, datum: e.target.value || undefined } : x,
                  ),
                )
              }
              aria-label={`Datum ${i + 1} (optioneel)`}
            />
            <Input
              value={d.tekst}
              onChange={(e) =>
                setBelangrijkeData(
                  belangrijkeData.map((x, j) =>
                    j === i ? { ...x, tekst: e.target.value } : x,
                  ),
                )
              }
              placeholder="Wat is er dan?"
              aria-label={`Omschrijving datum ${i + 1}`}
              maxLength={500}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() =>
                setBelangrijkeData(belangrijkeData.filter((_, j) => j !== i))
              }
              aria-label={`Verwijder datum ${i + 1}`}
            >
              <X />
            </Button>
          </div>
        ))}
        {belangrijkeData.length < 30 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setBelangrijkeData([...belangrijkeData, { tekst: '' }])
            }
          >
            <Plus /> Datum toevoegen
          </Button>
        )}
      </fieldset>

      {poging && fouten.length > 0 && (
        <ul
          role="alert"
          className="space-y-1 rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive"
        >
          {fouten.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}

      <DialogFooter className="gap-2 sm:gap-2">
        <Button type="button" variant="outline" onClick={() => onKlaar()}>
          Annuleren
        </Button>
        <Button type="submit" disabled={bezig}>
          {bezig && (
            <Loader2
              className="animate-spin motion-reduce:animate-none"
              aria-hidden
            />
          )}
          {bewerk ? 'Wijzigingen opslaan' : 'Overleg opslaan'}
        </Button>
      </DialogFooter>
    </form>
  )
}
