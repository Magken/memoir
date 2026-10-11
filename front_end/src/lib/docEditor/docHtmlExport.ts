import { $generateHtmlFromNodes } from '@lexical/html'
import type { LexicalEditor } from 'lexical'
import { DOC_EXPORT_INLINE_CSS } from './docExportStyles'
import type { PageSetup } from './pageSetup'
import { PAGE_SIZES, resolvePageDimensions } from './pageSetup'
import { applyResolvedEmbedsToHtml, resolveExportEmbeds } from './resolveExportEmbeds'

export type DocExportOptions = {
  editor: LexicalEditor
  pageSetup: PageSetup
  title: string
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildPageStyleBlock(pageSetup: PageSetup): string {
  const dims = resolvePageDimensions(pageSetup)
  const rules: string[] = []

  if (pageSetup.pageSize !== 'pageless' && dims) {
    const sizeLabel = pageSetup.pageSize
    const spec = PAGE_SIZES[sizeLabel]
    const widthIn = (spec.width / 96).toFixed(2)
    const heightIn = (spec.height / 96).toFixed(2)
    const pageWidth = pageSetup.orientation === 'landscape' ? heightIn : widthIn
    const pageHeight = pageSetup.orientation === 'landscape' ? widthIn : heightIn
    const marginIn = pageSetup.marginInches.toFixed(2)

    rules.push(`@page { size: ${pageWidth}in ${pageHeight}in; margin: ${marginIn}in; }`)
    rules.push(`:root { --doc-export-page-width: ${dims.width}px; --doc-export-page-min-height: ${dims.height}px; --doc-export-margin: ${dims.margin}px; }`)
  } else {
    rules.push(`:root { --doc-export-page-width: 48rem; --doc-export-margin: 2rem; }`)
  }

  return rules.join('\n')
}

export async function buildDocExportHtml(opts: DocExportOptions): Promise<string> {
  const { editor, pageSetup, title } = opts
  const resolved = await resolveExportEmbeds(editor)

  const bodyHtml = editor.getEditorState().read(() => $generateHtmlFromNodes(editor, null))
  const contentHtml = applyResolvedEmbedsToHtml(bodyHtml, resolved)
  const safeTitle = escapeHtml(title.trim() || 'Untitled document')
  const pageStyle = buildPageStyleBlock(pageSetup)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" crossorigin="anonymous" />
  <style>
${DOC_EXPORT_INLINE_CSS}
${pageStyle}
  </style>
</head>
<body>
  <article class="doc-export-body">
${contentHtml}
  </article>
</body>
</html>
`
}
