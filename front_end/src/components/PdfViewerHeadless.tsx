import { useEffect, useRef } from 'react'
import { Expand, Loader2, Maximize2, ZoomIn, ZoomOut } from 'lucide-react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { PdfSource } from '../lib/docs/pdfDocument'
import type { PdfFindBridge } from '../lib/docs/pdfFindBridge'
import { pdfZoomLabel, usePdfViewer } from '../hooks/usePdfViewer'
import { Card } from './Card'
import { IconButton } from './IconButton'
import { Paginator } from './Paginator'
import { ToolbarControlTray } from './ToolbarControlTray'
import { Tooltip } from './Tooltip'

type PdfViewerHeadlessProps = {
  src: PdfSource
  className?: string
  onSearchHostReady?: (host: {
    pdfDocument: PDFDocumentProxy | null
    page: number
    setPage: (page: number) => void
    findBridge: PdfFindBridge
    disabled: boolean
  } | null) => void
}

export function PdfViewerHeadless({
  src,
  className = '',
  onSearchHostReady,
}: PdfViewerHeadlessProps) {
  const scrollRootRef = useRef<HTMLDivElement>(null)
  const {
    canvasRef,
    pageSheetRef,
    stageRef,
    loading,
    error,
    page,
    pageCount,
    customScale,
    fitMode,
    rendering,
    pdfDocument,
    findBridge,
    setPage,
    zoomIn,
    zoomOut,
    fitWidth,
    fitPage,
  } = usePdfViewer(src, { scrollRootRef })

  const busy = loading || rendering
  const controlsDisabled = loading || pageCount === 0
  const showControls = !loading && !error && pageCount > 0

  useEffect(() => {
    if (!onSearchHostReady) return
    onSearchHostReady({
      pdfDocument,
      page,
      setPage,
      findBridge,
      disabled: controlsDisabled,
    })
    return () => {
      onSearchHostReady(null)
    }
  }, [controlsDisabled, findBridge, onSearchHostReady, page, pdfDocument, setPage])

  return (
    <div
      className={['theme-pdf-viewer', 'theme-pdf-viewer--headless', className].filter(Boolean).join(' ')}
    >
      {showControls ? (
        <div className="theme-pdf-viewer__headless-toolbar" role="toolbar" aria-label="PDF preview controls">
          <Paginator
            variant="minimal"
            summaryFormat="slash"
            editableSummary
            navVariant="ghost"
            size="xs"
            page={page}
            totalPages={pageCount}
            onPageChange={setPage}
            disabled={controlsDisabled}
            aria-label="PDF pages"
            className="theme-pdf-viewer__paginator"
          />
          <ToolbarControlTray>
            <span className="theme-toolbar-control-tray__zoom-step">
              <Tooltip content="Zoom out">
                <IconButton
                  icon={ZoomOut}
                  aria-label="Zoom out"
                  size="xs"
                  variant="ghost"
                  disabled={controlsDisabled}
                  onClick={zoomOut}
                />
              </Tooltip>
              <span className="theme-toolbar-control-tray__value type-caption tabular-nums">
                {pdfZoomLabel(fitMode, customScale)}
              </span>
              <Tooltip content="Zoom in">
                <IconButton
                  icon={ZoomIn}
                  aria-label="Zoom in"
                  size="xs"
                  variant="ghost"
                  disabled={controlsDisabled}
                  onClick={zoomIn}
                />
              </Tooltip>
            </span>
            <Tooltip content={fitMode === 'page' ? 'Fit width' : 'Fit page'}>
              <IconButton
                icon={fitMode === 'page' ? Maximize2 : Expand}
                aria-label={fitMode === 'page' ? 'Fit width' : 'Fit page'}
                size="xs"
                variant="ghost"
                active={fitMode === 'page'}
                disabled={controlsDisabled}
                onClick={fitMode === 'page' ? fitWidth : fitPage}
              />
            </Tooltip>
          </ToolbarControlTray>
        </div>
      ) : null}
      <div ref={scrollRootRef} className="theme-pdf-viewer__scroll-host">
        <Card
          variant="flat"
          shadowVariant="none"
          scroll="mini"
          scrollClouds={false}
          className="theme-pdf-viewer__scroll-card"
        >
          <div
            ref={stageRef}
            className="theme-pdf-viewer__stage"
            aria-busy={busy || undefined}
            aria-label="PDF page preview"
          >
            {loading ? (
              <span className="theme-pdf-viewer__state" role="status">
                <Loader2 className="theme-pdf-viewer__spinner" aria-hidden strokeWidth={2} />
                <span className="type-caption type-muted">Loading document…</span>
              </span>
            ) : null}
            {!loading && error ? (
              <span className="theme-pdf-viewer__state" role="alert">
                <span className="type-caption">{error}</span>
              </span>
            ) : null}
            {!loading && !error ? (
              <div className="theme-pdf-viewer__canvas-wrap">
                <div ref={pageSheetRef} className="theme-pdf-viewer__page-sheet">
                  <canvas ref={canvasRef} className="theme-pdf-viewer__canvas" />
                </div>
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  )
}
