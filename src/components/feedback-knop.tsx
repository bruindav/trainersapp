// Fix: fix-28 — feedback staat op naam van het ingelogde account (ook bij het demo-account)
// Fix: fix-16 — feedbackknop op elk scherm: screenshot + tekst
import { useLocation } from '@tanstack/react-router'
import { Camera, MessageSquarePlus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MAX_TEKST, maakScreenshot, stuurFeedback } from '@/data/feedback'
import { trainerById, useAppData } from '@/data/store'
import { getFirebaseAuth } from '@/lib/firebase'

export function FeedbackKnop() {
  const data = useAppData()
  const ik = trainerById(data.huidigeTrainerId)
  const pagina = useLocation({ select: (l) => l.href })
  const [stap, setStap] = useState<'dicht' | 'foto' | 'open'>('dicht')
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [meesturen, setMeesturen] = useState(true)
  const [tekst, setTekst] = useState('')
  const [bezig, setBezig] = useState(false)

  async function start() {
    // Eerst de foto van het scherm zoals de gebruiker het ziet, dan het venster.
    setStap('foto')
    const url = await maakScreenshot()
    setScreenshot(url)
    setMeesturen(!!url)
    setStap('open')
  }

  function sluit() {
    setStap('dicht')
    setScreenshot(null)
    setTekst('')
  }

  async function verstuur() {
    if (!ik || !tekst.trim()) return
    setBezig(true)
    try {
      await stuurFeedback({
        tekst,
        pagina,
        screenshot: meesturen ? screenshot : null,
        // Bij het demo-account is ik.id de demo-trainer; de regels eisen de uid.
        door: getFirebaseAuth().currentUser?.uid ?? ik.id,
        naam: ik.naam,
      })
      toast.success('Bedankt voor je feedback!', { description: 'De coördinator kan hem nu lezen.' })
      sluit()
    } catch (err) {
      console.error(err)
      toast.error('Versturen lukte niet. Probeer het opnieuw.')
    } finally {
      setBezig(false)
    }
  }

  if (!ik) return null

  return (
    <>
      <Button
        data-geen-screenshot
        onClick={start}
        disabled={stap !== 'dicht'}
        className="fixed right-4 bottom-4 z-40 h-11 rounded-full px-4 shadow-lg shadow-black/20 print:hidden"
        aria-label="Feedback geven"
      >
        {stap === 'foto' ? <Camera className="animate-pulse motion-reduce:animate-none" aria-hidden /> : <MessageSquarePlus aria-hidden />}
        <span className="hidden sm:inline">{stap === 'foto' ? 'Even een foto…' : 'Feedback'}</span>
      </Button>

      <Dialog open={stap === 'open'} onOpenChange={(o) => !o && sluit()}>
        <DialogContent className="max-h-[92svh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Feedback geven</DialogTitle>
            <DialogDescription>
              Wat valt je op, wat werkt niet of wat zou je graag anders zien? Alleen de coördinator leest dit.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="feedback-tekst">Je feedback</Label>
            <Textarea
              id="feedback-tekst"
              rows={5}
              autoFocus
              maxLength={MAX_TEKST}
              placeholder="Bijv. de knop om te ruilen kon ik niet vinden"
              value={tekst}
              onChange={(e) => setTekst(e.target.value)}
            />
          </div>

          {screenshot ? (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox checked={meesturen} onCheckedChange={(v) => setMeesturen(v === true)} />
                Screenshot van dit scherm meesturen
              </label>
              {meesturen && (
                <img
                  src={screenshot}
                  alt="Screenshot van het scherm waar je was"
                  className="max-h-56 w-full rounded-lg border object-contain object-top"
                />
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Er kon geen screenshot worden gemaakt; je feedback gaat zonder.</p>
          )}

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={sluit}>
              Annuleren
            </Button>
            <Button disabled={bezig || !tekst.trim()} onClick={verstuur}>
              Versturen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
