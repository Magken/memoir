import { useEffect, useRef, useState, type TransitionEvent } from 'react'
import { Download, Expand, Highlighter, LayoutList, Loader2, Maximize2, ZoomIn, ZoomOut } from 'lucide-react'
import { pdfDownloadName, type PdfSource } from '../lib/docs/pdfDocument'
import { pdfZoomLabel, usePdfViewer } from '../hooks/usePdfViewer'
import { usePdfFind } from '../hooks/usePdfFind'
import { usePdfHighlights } from '../hooks/usePdfHighlights'
import { PdfDocumentHeader } from './PdfDocumentHeader'
import { PdfPageToc } from './PdfPageToc'
import { Card } from './Card'
import { ExpandableSearchBar } from './ExpandableSearchBar'
import { IconButton } from './IconButton'
import { Paginator } from './Paginator'
import { ToolbarControlTray } from './ToolbarControlTray'
import { Tooltip } from './Tooltip'

type PdfViewerHeight = 'md' | 'lg' | 'xl'

type PdfViewerProps = {
  src: PdfSource
  initialPage?: number
  height?: PdfViewerHeight
  className?: string
  debug?: boolean
}

function triggerDownload(href: string, filename: string) {
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  link.click()
}

function PdfToolbarDivider() {
  return <span className="theme-pdf-viewer__toolbar-divider" role="separator" aria-hidden="true" />
}

function PdfViewerToolbar({
  customScale,
  fitMode,
  page,
  pageCount,
  controlsDisabled,
  tocOpen,
  onTocToggle,
  onZoomOut,
  onZoomIn,
  onFitToggle,
  onPageChange,
  onDownload,
  searchQuery,
  onSearchQueryChange,
  searchMatchCount,
  searchActiveMatchIndex,
  onSearchPrevMatch,
  onSearchNextMatch,
  searchDisabled,
  highlightMode,
  onHighlightModeToggle,
}: {
  customScale: number
  fitMode: ReturnType<typeof usePdfViewer>['fitMode']
  page: number
  pageCount: number
  controlsDisabled: boolean
  tocOpen: boolean
  onTocToggle: () => void
  onZoomOut: () => void
  onZoomIn: () => void
  onFitToggle: () => void
  onPageChange: (page: number) => void
  onDownload: () => void
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  searchMatchCount: number
  searchActiveMatchIndex: number
  onSearchPrevMatch: () => void
  onSearchNextMatch: () => void
  searchDisabled: boolean
  highlightMode: boolean
  onHighlightModeToggle: () => void
}) {
  const [searchExpanded, setSearchExpanded] = useState(false)

  return (
    <div
      className={[
        'theme-pdf-viewer__toolbar',
        searchExpanded ? 'theme-pdf-viewer__toolbar--search-open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="theme-pdf-viewer__toolbar-section">
        <Tooltip content={tocOpen ? 'Hide pages' : 'Show pages'}>
          <IconButton
            icon={LayoutList}
            aria-label={tocOpen ? 'Hide page thumbnails' : 'Show page thumbnails'}
            aria-pressed={tocOpen}
            size="xs"
            variant="ghost"
            active={tocOpen}
            disabled={controlsDisabled}
            onClick={onTocToggle}
          />
        </Tooltip>
      </span>

      <PdfToolbarDivider />

      <span className="theme-pdf-viewer__toolbar-section">
        <Paginator
          variant="minimal"
          summaryFormat="slash"
          editableSummary
          navVariant="ghost"
          size="xs"
          page={page}
          totalPages={pageCount}
          onPageChange={onPageChange}
          disabled={controlsDisabled}
          aria-label="PDF pages"
          className="theme-pdf-viewer__paginator"
        />
      </span>

      <PdfToolbarDivider />

      <span className="theme-pdf-viewer__toolbar-search-host">
        <ExpandableSearchBar
          className="theme-pdf-viewer__search"
          query={searchQuery}
          onQueryChange={onSearchQueryChange}
          matchCount={searchMatchCount}
          activeMatchIndex={searchActiveMatchIndex}
          onPrevMatch={onSearchPrevMatch}
          onNextMatch={onSearchNextMatch}
          onExpandedChange={setSearchExpanded}
          disabled={searchDisabled}
          size="xs"
        />
      </span>

      <span className="theme-pdf-viewer__toolbar-trail" aria-hidden={searchExpanded}>
        <PdfToolbarDivider />

        <span className="theme-pdf-viewer__toolbar-section">
          <Tooltip content={highlightMode ? 'Exit highlight mode' : 'Highlight text'}>
            <IconButton
              icon={Highlighter}
              aria-label={highlightMode ? 'Exit highlight mode' : 'Highlight text'}
              aria-pressed={highlightMode}
              size="xs"
              variant="ghost"
              active={highlightMode}
              disabled={controlsDisabled}
              onClick={onHighlightModeToggle}
            />
          </Tooltip>
        </span>

        <PdfToolbarDivider />

        <span className="theme-pdf-viewer__toolbar-section">
          <ToolbarControlTray>
            <span className="theme-toolbar-control-tray__zoom-step">
              <Tooltip content="Zoom out">
                <IconButton
                  icon={ZoomOut}
                  aria-label="Zoom out"
                  size="xs"
                  variant="ghost"
                  disabled={controlsDisabled}
                  onClick={onZoomOut}
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
                  onClick={onZoomIn}
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
                onClick={onFitToggle}
              />
            </Tooltip>
          </ToolbarControlTray>
        </span>

        <PdfToolbarDivider />

        <span className="theme-pdf-viewer__toolbar-section">
          <Tooltip content="Download PDF">
            <IconButton
              icon={Download}
              aria-label="Download PDF"
              size="xs"
              variant="ghost"
              onClick={onDownload}
            />
          </Tooltip>
        </span>
      </span>
    </div>
  )
}

export function PdfViewer({
  src,
  initialPage,
  height = 'lg',
  className = '',
  debug = false,
}: PdfViewerProps) {
  const scrollRootRef = useRef<HTMLDivElement>(null)
  const [tocOpen, setTocOpen] = useState(false)
  const [tocMounted, setTocMounted] = useState(false)
  const [tocActive, setTocActive] = useState(false)
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
    documentInfo,
    pdfDocument,
    findBridge,
    textLayerGeneration,
    setPage,
    zoomIn,
    zoomOut,
    fitWidth,
    fitPage,
  } = usePdfViewer(src, { initialPage, scrollRootRef })

  const documentKey =
    typeof src === 'string'
      ? src
      : src instanceof File
        ? `${src.name}:${src.size}:${src.lastModified}`
        : 'pdf-buffer'

  const {
    highlights,
    highlightMode,
    setHighlightMode,
    activeHighlightId,
    removeHighlight,
    selectHighlight,
  } = usePdfHighlights({
    pageSheetRef,
    scrollRootRef,
    page,
    textLayerGeneration,
    documentKey,
    setPage,
  })

  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    matchCount: searchMatchCount,
    activeMatchIndex: searchActiveMatchIndex,
    stepMatch,
  } = usePdfFind({
    pdfDocument,
    page,
    findBridge,
    setPage,
  })

  const busy = loading || rendering
  const controlsDisabled = loading || pageCount === 0
  const downloadName = pdfDownloadName(src)
  const showToolbar = !loading && !error && pageCount > 0

  function handlePageSelect(nextPage: number) {
    setPage(nextPage)
  }

  function handleTocToggle() {
    setTocOpen((open) => !open)
  }

  useEffect(() => {
    if (tocOpen) {
      setTocMounted(true)
      return
    }
    setTocActive(false)
  }, [tocOpen])

  useEffect(() => {
    if (!tocMounted || !tocOpen) return
    const frame = requestAnimationFrame(() => setTocActive(true))
    return () => cancelAnimationFrame(frame)
  }, [tocMounted, tocOpen])

  useEffect(() => {
    if (showToolbar) return
    setTocOpen(false)
    setTocActive(false)
    setTocMounted(false)
  }, [showToolbar])

  function handleTocTransitionEnd(event: TransitionEvent<HTMLDivElement>) {
    if (event.propertyName !== 'transform' || tocOpen) return
    setTocMounted(false)
  }

  function handleDownload() {
    if (typeof src === 'string') {
      triggerDownload(src, downloadName)
      return
    }
    if (src instanceof File) {
      const url = URL.createObjectURL(src)
      triggerDownload(url, downloadName)
      URL.revokeObjectURL(url)
    }
  }

  if (debug) {
    console.debug('[PdfViewer]', { src, page, pageCount, fitMode, customScale, loading, error })
  }

  return (
    <div
      className={[
        'theme-pdf-viewer',
        `theme-pdf-viewer--${height}`,
        busy ? 'theme-pdf-viewer--busy' : '',
        tocOpen || tocMounted ? 'theme-pdf-viewer--toc-open' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Card variant="flat" shadowVariant="none" className="theme-pdf-viewer__shell">
        {!error ? (
          <div className="theme-pdf-viewer__doc-header-wrap">
            <PdfDocumentHeader src={src} info={documentInfo} loading={loading} />
          </div>
        ) : null}
        {showToolbar ? (
          <div className="theme-pdf-viewer__toolbar-wrap" role="toolbar" aria-label="PDF controls">
            <PdfViewerToolbar
              customScale={customScale}
              fitMode={fitMode}
              page={page}
              pageCount={pageCount}
              controlsDisabled={controlsDisabled}
              tocOpen={tocOpen}
              onTocToggle={handleTocToggle}
              onZoomOut={zoomOut}
              onZoomIn={zoomIn}
              onFitToggle={fitMode === 'page' ? fitWidth : fitPage}
              onPageChange={setPage}
              onDownload={handleDownload}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              searchMatchCount={searchMatchCount}
              searchActiveMatchIndex={searchActiveMatchIndex}
              onSearchPrevMatch={() => stepMatch(-1)}
              onSearchNextMatch={() => stepMatch(1)}
              searchDisabled={controlsDisabled}
              highlightMode={highlightMode}
              onHighlightModeToggle={() => setHighlightMode((active) => !active)}
            />
          </div>
        ) : null}

        <div ref={scrollRootRef} className="theme-pdf-viewer__scroll-host">
          {showToolbar && tocMounted ? (
            <div
              className={[
                'theme-pdf-viewer__toc-wrap',
                tocActive ? 'theme-pdf-viewer__toc-wrap--open' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onTransitionEnd={handleTocTransitionEnd}
            >
              <PdfPageToc
                pdfDocument={pdfDocument}
                page={page}
                pageCount={pageCount}
                onPageSelect={handlePageSelect}
                onClose={() => setTocOpen(false)}
                highlights={highlights}
                activeHighlightId={activeHighlightId}
                onHighlightSelect={selectHighlight}
                onHighlightRemove={removeHighlight}
              />
            </div>
          ) : null}
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
      </Card>
    </div>
  )
}

export type { PdfViewerHeight }
