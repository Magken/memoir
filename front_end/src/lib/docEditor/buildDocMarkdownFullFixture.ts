/**
 * Full 4-page DocEditor regression document in markdown (`:::doc-*` notation).
 * Mirrors buildDocLexicalFullFixture — used by Markdown→Doc demo + conversion tests.
 */
import { DOC_FIXTURE_EXCALIDRAW_SCENE, DOC_FIXTURE_MERMAID_SOURCE } from './docDiagramFixtures'
import type { PageSetup } from './pageSetup'

const DOC_PAGE_SETUP_FULL: PageSetup = {
  pageSize: 'Letter',
  orientation: 'portrait',
  marginInches: 1,
}

export const DOC_MARKDOWN_FULL = `# DocEditor full feature regression

## Page 1 — Typography & blocks

Inline mix: **bold**, *italic*, :::doc-underline underline ::: , ~~strike~~, \`code\`, H:::doc-sub 2 :::O & x:::doc-sup 2 :::.

:::doc-style color=#1971c2;font-size=20px
Large accent text
:::

:::doc-align center
Center-aligned paragraph for layout QA.
:::

:::doc-align right
Right-aligned closing line on page one.
:::

- Bullet alpha
- Bullet beta with nested emphasis

1. Numbered step one
2. Numbered step two

- [ ] Checklist item — open
- [x] Checklist item — done

> Blockquote: every converter path should preserve readable copy.

---

:::doc-page-break

## Page 2 — Embeds & media

:::doc-equation
latex: E = mc^2
:::

:::doc-sticky
Sticky note — drag handle regression.
:::

:::doc-poll question="Ship editor-context this quarter?" options=Yes — full matrix|Yes — doc only|Not yet

:::doc-date 2026-07-11

![Sample landscape photo](https://picsum.photos/seed/doc-editor/640/360)

:::doc-gif url=https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif alt=Sample GIF

:::doc-video title="Local video placeholder"

:::doc-youtube id=dQw4w9WgXcQ title="YouTube embed sample"

:::doc-page-break

## Page 3 — Layout & structure

:::doc-columns template=2-equal
Left column — equal split template.
---
Right column — shares row with left.
:::

:::doc-columns template=3-equal
Col A
---
Col B
---
Col C
:::

:::doc-collapsible title="Collapsible release notes"
Collapsed body copy should round-trip through native JSON and fall back to plain text in Markdown export.
:::

| Feature | Native JSON | Markdown |
| --- | --- | --- |
| Columns | Full | Fallback |
| Equation | Full | Fallback |
| Poll | Full | Fallback |

\`\`\`typescript
const envelope = createEnvelope("doc", payload)
\`\`\`

:::doc-page-break

## Page 4 — Links & diagrams

Read the [editor context spec](https://example.com/editor-context) for envelope details.

### Excalidraw scene block

\`\`\`excalidraw
${DOC_FIXTURE_EXCALIDRAW_SCENE}
\`\`\`

### Mermaid fenced block

\`\`\`mermaid
${DOC_FIXTURE_MERMAID_SOURCE}
\`\`\`

End of fixture — **4 pages** exercising the feature map.
`

export const DOC_MARKDOWN_FULL_PAYLOAD = {
  title: 'DocEditor feature regression (4 pages)',
  pageSetup: DOC_PAGE_SETUP_FULL,
  markdown: DOC_MARKDOWN_FULL,
} as const
