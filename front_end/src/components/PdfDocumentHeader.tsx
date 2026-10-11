import type { PdfDocumentInfo } from '../lib/docs/pdfDocumentInfo'
import { formatPdfDocumentInfoRows, pdfDisplayTitle, resolvePdfSourceStats, truncateDisplayTitle } from '../lib/docs/pdfDocumentInfo'
import type { PdfSource } from '../lib/docs/pdfDocument'
import { InfoTooltip } from './InfoTooltip'

type PdfDocumentHeaderProps = {
  src: PdfSource
  info: PdfDocumentInfo | null
  loading?: boolean
}

function PdfDocumentStatsPanel({ info, loading }: { info: PdfDocumentInfo | null; loading?: boolean }) {
  if (loading && !info) {
    return <span className="type-caption type-muted">Loading document metadata…</span>
  }
  if (!info) {
    return <span className="type-caption type-muted">No metadata available.</span>
  }

  const rows = formatPdfDocumentInfoRows(info)

  return (
    <dl className="theme-pdf-viewer__doc-stats">
      {rows.map((row) => (
        <div key={row.label} className="theme-pdf-viewer__doc-stats-row">
          <dt className="type-caption type-muted">{row.label}</dt>
          <dd className="type-caption mb-0">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function PdfDocumentHeader({ src, info, loading = false }: PdfDocumentHeaderProps) {
  const sourceStats = resolvePdfSourceStats(src)
  const title = info?.displayTitle ?? pdfDisplayTitle(src, null)
  const shortTitle = truncateDisplayTitle(title)

  return (
    <div className="theme-pdf-viewer__doc-header">
      <h3
        className="theme-pdf-viewer__doc-title type-label mb-0"
        title={shortTitle !== title ? title : undefined}
      >
        {shortTitle}
      </h3>
      <InfoTooltip
        size="xs"
        trigger="hover"
        placement="bottom"
        interactive
        aria-label={`Document details for ${sourceStats.fileName}`}
        content={<PdfDocumentStatsPanel info={info} loading={loading} />}
      />
    </div>
  )
}
