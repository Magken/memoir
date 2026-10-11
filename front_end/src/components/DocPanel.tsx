import { type PdfSource } from '../lib/docs/pdfDocument'
import { PdfViewer, type PdfViewerHeight } from './PdfViewer'

type DocPanelProps = {
  src: PdfSource
  height?: PdfViewerHeight
  className?: string
  debug?: boolean
}

/** Bordered shell around [PdfViewer](PdfViewer.md) — controls live in the bottom dock. */
export function DocPanel({ src, height = 'lg', className = '', debug = false }: DocPanelProps) {
  if (debug) {
    console.debug('[DocPanel]', { src, height })
  }

  return (
    <figure
      className={['theme-doc-panel', className].filter(Boolean).join(' ')}
    >
      <PdfViewer src={src} height={height} debug={debug} />
    </figure>
  )
}
