// Fix: fix-21 — opgemaakte tekst (zoals in het Word-document): bewerken met Tiptap, veilig tonen met DOMPurify
import { Color, TextStyle } from '@tiptap/extension-text-style'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import DOMPurify from 'dompurify'
import { Bold, IndentDecrease, IndentIncrease, Italic, List, ListOrdered, RemoveFormatting, Underline } from 'lucide-react'
import { useMemo } from 'react'

import { cn } from '@/lib/utils'

/** Tekstkleuren in de huisstijl (+ standaard). */
export const TEKST_KLEUREN = [
  { naam: 'Standaard', waarde: '' },
  { naam: 'Rood', waarde: '#c4362b' },
  { naam: 'Oranje', waarde: '#c24d17' },
  { naam: 'Groen', waarde: '#4d7a0a' },
  { naam: 'Blauw', waarde: '#1f78a8' },
  { naam: 'Paars', waarde: '#6e4f8a' },
] as const

const TOEGESTANE_TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'span', 'h3', 'h4', 'blockquote']
const KLEUR = /^\s*color\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([\d\s.,%]+\))\s*;?\s*$/

let hookGezet = false
/** Alleen opmaak-tags; van `style` blijft alleen een tekstkleur over. Geen links, scripts of afbeeldingen. */
export function maakVeilig(html: string) {
  if (!hookGezet) {
    DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
      if (data.attrName !== 'style') return
      const kleur = data.attrValue
        .split(';')
        .map((d) => d.trim())
        .find((d) => KLEUR.test(d))
      if (kleur) data.attrValue = kleur
      else data.keepAttr = false
    })
    hookGezet = true
  }
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: TOEGESTANE_TAGS, ALLOWED_ATTR: ['style'] })
}

/** Is er echte tekst (niet alleen lege alinea's)? */
export function heeftTekst(html: string) {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0
}

const OPMAAK =
  'space-y-2 leading-relaxed [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6 [&_ul_ul]:list-[circle] [&_li>p]:my-0 [&_h3]:text-base [&_h3]:font-extrabold [&_h4]:font-bold [&_blockquote]:border-l-4 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground'

/** Toont opgemaakte tekst veilig. */
export function RijkeTekst({ html, className }: { html: string; className?: string }) {
  const veilig = useMemo(() => maakVeilig(html), [html])
  return <div className={cn(OPMAAK, className)} dangerouslySetInnerHTML={{ __html: veilig }} />
}

function KnopIcoon({
  label,
  actief,
  onClick,
  disabled,
  children,
}: {
  label: string
  actief?: boolean
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={actief}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-md text-foreground outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-40',
        actief && 'bg-foreground text-background hover:bg-foreground',
      )}
    >
      {children}
    </button>
  )
}

/**
 * Teksteditor met vet, cursief, onderstrepen, opsommingen, inspringen en kleur.
 * Plakken uit Word houdt deze opmaak vast. Bewaart (veilige) HTML.
 */
export function RijkeTekstEditor({
  id,
  waarde,
  onChange,
  label,
  minHoogte = 'min-h-28',
}: {
  id: string
  waarde: string
  onChange: (html: string) => void
  label: string
  minHoogte?: string
}) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ link: false, heading: { levels: [3, 4] } }), TextStyle, Color],
    content: maakVeilig(waarde),
    immediatelyRender: true,
    editorProps: {
      attributes: {
        id,
        'aria-label': label,
        'aria-multiline': 'true',
        role: 'textbox',
        class: cn(OPMAAK, minHoogte, 'px-3 py-2 text-base outline-none md:text-sm'),
      },
    },
    onUpdate: ({ editor: e }) => onChange(heeftTekst(e.getHTML()) ? maakVeilig(e.getHTML()) : ''),
  })

  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      vet: e.isActive('bold'),
      cursief: e.isActive('italic'),
      onder: e.isActive('underline'),
      bullets: e.isActive('bulletList'),
      nummers: e.isActive('orderedList'),
      inspringen: e.can().sinkListItem('listItem'),
      uitspringen: e.can().liftListItem('listItem'),
      kleur: (e.getAttributes('textStyle').color as string | undefined) ?? '',
    }),
  })

  return (
    <div className="rounded-md border border-input bg-background shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
      <div role="toolbar" aria-label={`Opmaak ${label}`} className="flex flex-wrap items-center gap-0.5 border-b p-1">
        <KnopIcoon label="Vet" actief={s.vet} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="size-4" />
        </KnopIcoon>
        <KnopIcoon label="Cursief" actief={s.cursief} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="size-4" />
        </KnopIcoon>
        <KnopIcoon label="Onderstrepen" actief={s.onder} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <Underline className="size-4" />
        </KnopIcoon>
        <span className="mx-1 h-6 w-px bg-border" aria-hidden />
        <KnopIcoon label="Opsomming" actief={s.bullets} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="size-4" />
        </KnopIcoon>
        <KnopIcoon label="Genummerde lijst" actief={s.nummers} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="size-4" />
        </KnopIcoon>
        <KnopIcoon
          label="Inspringen"
          disabled={!s.inspringen}
          onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
        >
          <IndentIncrease className="size-4" />
        </KnopIcoon>
        <KnopIcoon
          label="Uitspringen"
          disabled={!s.uitspringen}
          onClick={() => editor.chain().focus().liftListItem('listItem').run()}
        >
          <IndentDecrease className="size-4" />
        </KnopIcoon>
        <span className="mx-1 h-6 w-px bg-border" aria-hidden />
        {TEKST_KLEUREN.map((k) => (
          <button
            key={k.naam}
            type="button"
            aria-label={`Tekstkleur ${k.naam.toLowerCase()}`}
            title={`Tekstkleur ${k.naam.toLowerCase()}`}
            aria-pressed={s.kleur.toLowerCase() === k.waarde}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              k.waarde
                ? editor.chain().focus().setColor(k.waarde).run()
                : editor.chain().focus().unsetColor().run()
            }
            className={cn(
              'inline-flex size-9 items-center justify-center rounded-md outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50',
              s.kleur.toLowerCase() === k.waarde && 'bg-accent',
            )}
          >
            <span
              className="size-4 rounded-full border border-border"
              style={{ background: k.waarde || 'var(--foreground)' }}
              aria-hidden
            />
          </button>
        ))}
        <KnopIcoon label="Opmaak wissen" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
          <RemoveFormatting className="size-4" />
        </KnopIcoon>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
