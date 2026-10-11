import { useCallback, useEffect, useRef, useState } from 'react'
import { ExternalLink, Highlighter, Image, LayoutGrid, Link2, ListTree, Trash2, X } from 'lucide-react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { usePdfImageThumbnails } from '../hooks/usePdfImageThumbnails'
import { usePdfImages } from '../hooks/usePdfImages'
import { usePdfLinks } from '../hooks/usePdfLinks'
import { usePdfOutline } from '../hooks/usePdfOutline'
import { usePdfThumbnails } from '../hooks/usePdfThumbnails'
import { excerptHighlightText, compactHighlightLabel, sortHighlightsByDocumentOrder, type PdfHighlight } from '../lib/docs/pdfHighlights'
import type { PdfImageEntry } from '../lib/docs/pdfImages'
import { formatPdfLinkDisplay, type PdfLinkEntry } from '../lib/docs/pdfLinks'
import type { PdfOutlineEntry } from '../lib/docs/pdfOutline'
import { IconButton } from './IconButton'
import { ToolbarModeGroup } from './ToolbarModeGroup'

type PdfSidePanelMode = 'pages' | 'contents' | 'images' | 'links' | 'highlights'

type PdfPageTocProps = {
  pdfDocument: PDFDocumentProxy | null
  page: number
  pageCount: number
  onPageSelect: (page: number) => void
  onClose: () => void
  highlights?: readonly PdfHighlight[]
  activeHighlightId?: string | null
  onHighlightSelect?: (highlight: PdfHighlight) => void
  onHighlightRemove?: (highlightId: string) => void
}

function PdfPageTocItem({
  pageNum,
  active,
  thumbUrl,
  onVisible,
  onSelect,
}: {
  pageNum: number
  active: boolean
  thumbUrl?: string
  onVisible: (pageNum: number) => void
  onSelect: (pageNum: number) => void
}) {
  const itemRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const node = itemRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onVisible(pageNum)
        }
      },
      { rootMargin: '48px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [onVisible, pageNum])

  return (
    <button
      ref={itemRef}
      type="button"
      className={[
        'theme-pdf-viewer__toc-item',
        active ? 'theme-pdf-viewer__toc-item--active' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-current={active ? 'page' : undefined}
      aria-label={`Page ${pageNum}`}
      onClick={() => onSelect(pageNum)}
    >
      <span className="theme-pdf-viewer__toc-thumb">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt=""
            className="theme-pdf-viewer__toc-thumb-img"
            draggable={false}
          />
        ) : (
          <span className="theme-pdf-viewer__toc-thumb-placeholder" aria-hidden />
        )}
      </span>
      <span className="theme-pdf-viewer__toc-page type-caption tabular-nums">{pageNum}</span>
    </button>
  )
}

function PdfOutlineBranch({
  entries,
  page,
  onSelect,
}: {
  entries: readonly PdfOutlineEntry[]
  page: number
  onSelect: (page: number) => void
}) {
  return (
    <ul className="theme-pdf-viewer__toc-outline-list" role="list">
      {entries.map((entry) => (
        <li key={entry.id} className="theme-pdf-viewer__toc-outline-node" role="listitem">
          <button
            type="button"
            className={[
              'theme-pdf-viewer__toc-outline-item type-label',
              entry.pageNumber === page ? 'theme-pdf-viewer__toc-outline-item--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            data-depth={entry.level}
            disabled={entry.pageNumber === null}
            aria-current={entry.pageNumber === page ? 'location' : undefined}
            onClick={() => {
              if (entry.pageNumber !== null) onSelect(entry.pageNumber)
            }}
          >
            <span className="theme-pdf-viewer__toc-outline-label">{entry.title}</span>
            {entry.pageNumber !== null ? (
              <span className="theme-pdf-viewer__toc-outline-page type-caption tabular-nums">
                {entry.pageNumber}
              </span>
            ) : null}
          </button>
          {entry.children.length > 0 ? (
            <PdfOutlineBranch entries={entry.children} page={page} onSelect={onSelect} />
          ) : null}
        </li>
      ))}
    </ul>
  )
}

function PdfLinkList({
  entries,
  page,
  onPageSelect,
}: {
  entries: readonly PdfLinkEntry[]
  page: number
  onPageSelect: (page: number) => void
}) {
  return (
    <ul className="theme-pdf-viewer__toc-link-list" role="list">
      {entries.map((entry) => {
        const activePage = entry.targetPageNumber ?? entry.pageNumber

        if (entry.url) {
          return (
            <li key={entry.id} className="theme-pdf-viewer__toc-link-node" role="listitem">
              <div className="theme-pdf-viewer__toc-link-item">
                {entry.title ? (
                  <span className="theme-pdf-viewer__toc-link-title type-caption">{entry.title}</span>
                ) : null}
                <div className="theme-pdf-viewer__toc-link-row">
                  <a
                    className="theme-pdf-viewer__toc-link-target type-label"
                    href={entry.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={entry.url}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <span className="theme-pdf-viewer__toc-link-url">
                      {formatPdfLinkDisplay(entry.url)}
                    </span>
                    <ExternalLink className="theme-pdf-viewer__toc-link-icon" aria-hidden />
                    <span className="sr-only">Open link</span>
                  </a>
                  <button
                    type="button"
                    className="theme-pdf-viewer__toc-link-page-btn type-caption tabular-nums"
                    aria-label={`Go to page ${entry.pageNumber}`}
                    onClick={() => onPageSelect(entry.pageNumber)}
                  >
                    {entry.pageNumber}
                  </button>
                </div>
              </div>
            </li>
          )
        }

        return (
          <li key={entry.id} className="theme-pdf-viewer__toc-link-node" role="listitem">
            <button
              type="button"
              className={[
                'theme-pdf-viewer__toc-outline-item type-label',
                activePage === page ? 'theme-pdf-viewer__toc-outline-item--active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-current={activePage === page ? 'location' : undefined}
              onClick={() => onPageSelect(activePage)}
            >
              <span className="theme-pdf-viewer__toc-outline-label">{entry.label}</span>
              <span className="theme-pdf-viewer__toc-outline-page type-caption tabular-nums">
                {entry.pageNumber}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function PdfImageTocItem({
  entry,
  active,
  thumbUrl,
  onVisible,
  onSelect,
}: {
  entry: PdfImageEntry
  active: boolean
  thumbUrl?: string
  onVisible: (entryId: string) => void
  onSelect: (entry: PdfImageEntry) => void
}) {
  const itemRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const node = itemRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((item) => item.isIntersecting)) {
          onVisible(entry.id)
        }
      },
      { rootMargin: '48px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [entry.id, onVisible])

  return (
    <button
      ref={itemRef}
      type="button"
      className={[
        'theme-pdf-viewer__toc-item',
        'theme-pdf-viewer__toc-item--media',
        active ? 'theme-pdf-viewer__toc-item--active' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-current={active ? 'true' : undefined}
      aria-label={`Image ${entry.indexOnPage + 1} on page ${entry.pageNumber}`}
      onClick={() => onSelect(entry)}
    >
      <span className="theme-pdf-viewer__toc-thumb theme-pdf-viewer__toc-thumb--media">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt=""
            className="theme-pdf-viewer__toc-thumb-img"
            draggable={false}
          />
        ) : (
          <span className="theme-pdf-viewer__toc-thumb-placeholder" aria-hidden />
        )}
      </span>
      <span className="theme-pdf-viewer__toc-page type-caption tabular-nums">{entry.pageNumber}</span>
    </button>
  )
}

function PdfImageList({
  entries,
  activeImageId,
  thumbUrls,
  onVisible,
  onSelect,
}: {
  entries: readonly PdfImageEntry[]
  activeImageId: string | null
  thumbUrls: Record<string, string>
  onVisible: (entryId: string) => void
  onSelect: (entry: PdfImageEntry) => void
}) {
  return (
    <div className="theme-pdf-viewer__toc-list" role="list">
      {entries.map((entry) => (
        <PdfImageTocItem
          key={entry.id}
          entry={entry}
          active={activeImageId === entry.id}
          thumbUrl={thumbUrls[entry.id]}
          onVisible={onVisible}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

function PdfHighlightList({
  entries,
  activeHighlightId,
  onSelect,
  onRemove,
}: {
  entries: readonly PdfHighlight[]
  activeHighlightId: string | null
  onSelect: (highlight: PdfHighlight) => void
  onRemove: (highlightId: string) => void
}) {
  return (
    <ul className="theme-pdf-viewer__toc-highlight-list" role="list">
      {entries.map((entry) => (
        <li key={entry.id} className="theme-pdf-viewer__toc-highlight-node" role="listitem">
          <button
            type="button"
            className={[
              'theme-pdf-viewer__toc-highlight-item type-label',
              entry.id === activeHighlightId ? 'theme-pdf-viewer__toc-highlight-item--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-current={entry.id === activeHighlightId ? 'true' : undefined}
            onClick={() => onSelect(entry)}
          >
            <span className="theme-pdf-viewer__toc-highlight-text" title={excerptHighlightText(entry.text)}>
              {compactHighlightLabel(entry.text) || 'Highlight'}
            </span>
            <span className="theme-pdf-viewer__toc-outline-page type-caption tabular-nums">
              {entry.pageNumber}
            </span>
          </button>
          <IconButton
            icon={Trash2}
            aria-label={`Remove highlight on page ${entry.pageNumber}`}
            size="xs"
            variant="ghost"
            className="theme-pdf-viewer__toc-highlight-remove"
            onClick={() => onRemove(entry.id)}
          />
        </li>
      ))}
    </ul>
  )
}

export function PdfPageToc({
  pdfDocument,
  page,
  pageCount,
  onPageSelect,
  onClose,
  highlights = [],
  activeHighlightId = null,
  onHighlightSelect,
  onHighlightRemove,
}: PdfPageTocProps) {
  const [mode, setMode] = useState<PdfSidePanelMode>('pages')
  const [activeImageId, setActiveImageId] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const indexScrollRef = useRef<HTMLDivElement>(null)
  const imageListRef = useRef<HTMLDivElement>(null)
  const highlightListRef = useRef<HTMLDivElement>(null)
  const { thumbUrls, requestThumbnail } = usePdfThumbnails(pdfDocument, pageCount)
  const { entries: outlineEntries, loading: outlineLoading } = usePdfOutline(pdfDocument)
  const { entries: linkEntries, loading: linksLoading } = usePdfLinks(pdfDocument)
  const { entries: imageEntries, loading: imagesLoading } = usePdfImages(pdfDocument)
  const { thumbUrls: imageThumbUrls, requestThumbnail: requestImageThumbnail } =
    usePdfImageThumbnails(pdfDocument, imageEntries)

  const hasOutline = outlineEntries.length > 0
  const hasLinks = linkEntries.length > 0
  const hasImages = imageEntries.length > 0
  const sortedHighlights = sortHighlightsByDocumentOrder(highlights)

  const scrollActiveIndexItem = useCallback(() => {
    const activeItem = indexScrollRef.current?.querySelector(
      '.theme-pdf-viewer__toc-outline-item--active',
    )
    activeItem?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (mode !== 'pages') return
    const activeItem = listRef.current?.querySelector('.theme-pdf-viewer__toc-item--active')
    activeItem?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [mode, page])

  useEffect(() => {
    if (mode !== 'contents' && mode !== 'links') return
    scrollActiveIndexItem()
  }, [mode, page, outlineEntries, linkEntries, scrollActiveIndexItem])

  useEffect(() => {
    if (mode !== 'images') return
    const activeItem =
      imageListRef.current?.querySelector('.theme-pdf-viewer__toc-item--active') ??
      imageListRef.current?.querySelector(`[aria-label*="page ${page}"]`)
    activeItem?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [mode, page, activeImageId, imageEntries])

  useEffect(() => {
    if (mode !== 'highlights') return
    const activeItem = highlightListRef.current?.querySelector(
      '.theme-pdf-viewer__toc-highlight-item--active',
    )
    activeItem?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [mode, activeHighlightId, sortedHighlights])

  useEffect(() => {
    setActiveImageId(null)
  }, [pdfDocument])

  const handleImageSelect = useCallback(
    (entry: PdfImageEntry) => {
      setActiveImageId(entry.id)
      onPageSelect(entry.pageNumber)
    },
    [onPageSelect],
  )

  const handleHighlightSelect = useCallback(
    (entry: PdfHighlight) => {
      onHighlightSelect?.(entry)
    },
    [onHighlightSelect],
  )

  useEffect(() => {
    if (outlineLoading || linksLoading || imagesLoading) return
    if (mode === 'contents' && !hasOutline) setMode('pages')
    if (mode === 'links' && !hasLinks) setMode('pages')
    if (mode === 'images' && !hasImages) setMode('pages')
  }, [
    mode,
    hasOutline,
    hasLinks,
    hasImages,
    outlineLoading,
    linksLoading,
    imagesLoading,
  ])

  if (pageCount <= 0) return null

  return (
    <aside className="theme-pdf-viewer__toc-panel" aria-label="Document navigation">
      <div className="theme-pdf-viewer__toc-header">
        <ToolbarModeGroup aria-label="Side panel views">
          <IconButton
            icon={LayoutGrid}
            aria-label="Pages"
            aria-pressed={mode === 'pages'}
            size="xs"
            active={mode === 'pages'}
            onClick={() => setMode('pages')}
          />
          <IconButton
            icon={ListTree}
            aria-label="Table of contents"
            aria-pressed={mode === 'contents'}
            size="xs"
            active={mode === 'contents'}
            disabled={!outlineLoading && !hasOutline}
            onClick={() => setMode('contents')}
          />
          <IconButton
            icon={Image}
            aria-label="Images"
            aria-pressed={mode === 'images'}
            size="xs"
            active={mode === 'images'}
            disabled={!imagesLoading && !hasImages}
            onClick={() => setMode('images')}
          />
          <IconButton
            icon={Link2}
            aria-label="Links"
            aria-pressed={mode === 'links'}
            size="xs"
            active={mode === 'links'}
            disabled={!linksLoading && !hasLinks}
            onClick={() => setMode('links')}
          />
          <IconButton
            icon={Highlighter}
            aria-label="Highlights"
            aria-pressed={mode === 'highlights'}
            size="xs"
            active={mode === 'highlights'}
            onClick={() => setMode('highlights')}
          />
        </ToolbarModeGroup>
        <IconButton
          icon={X}
          aria-label="Close panel"
          size="xs"
          variant="ghost"
          className="theme-pdf-viewer__toc-close"
          onClick={onClose}
        />
      </div>

      {mode === 'pages' ? (
        <div className="theme-pdf-viewer__toc-scroll">
          <div ref={listRef} className="theme-pdf-viewer__toc-list" role="list">
            {Array.from({ length: pageCount }, (_, index) => {
              const pageNum = index + 1
              return (
                <PdfPageTocItem
                  key={pageNum}
                  pageNum={pageNum}
                  active={pageNum === page}
                  thumbUrl={thumbUrls[pageNum]}
                  onVisible={requestThumbnail}
                  onSelect={onPageSelect}
                />
              )
            })}
          </div>
        </div>
      ) : mode === 'images' ? (
        <div ref={imageListRef} className="theme-pdf-viewer__toc-scroll">
          {imagesLoading ? (
            <p className="theme-pdf-viewer__toc-empty type-caption type-muted" role="status">
              Loading images…
            </p>
          ) : hasImages ? (
            <PdfImageList
              entries={imageEntries}
              activeImageId={activeImageId}
              thumbUrls={imageThumbUrls}
              onVisible={requestImageThumbnail}
              onSelect={handleImageSelect}
            />
          ) : (
            <p className="theme-pdf-viewer__toc-empty type-caption type-muted" role="status">
              No images in this document.
            </p>
          )}
        </div>
      ) : mode === 'highlights' ? (
        <div ref={highlightListRef} className="theme-pdf-viewer__toc-scroll">
          {sortedHighlights.length > 0 ? (
            <PdfHighlightList
              entries={sortedHighlights}
              activeHighlightId={activeHighlightId}
              onSelect={handleHighlightSelect}
              onRemove={(highlightId) => onHighlightRemove?.(highlightId)}
            />
          ) : (
            <p className="theme-pdf-viewer__toc-empty type-caption type-muted" role="status">
              No highlights yet. Turn on highlight mode in the toolbar, then select text on the page.
            </p>
          )}
        </div>
      ) : (
        <div ref={indexScrollRef} className="theme-pdf-viewer__toc-scroll">
          {mode === 'contents' ? (
            outlineLoading ? (
              <p className="theme-pdf-viewer__toc-empty type-caption type-muted" role="status">
                Loading contents…
              </p>
            ) : hasOutline ? (
              <PdfOutlineBranch entries={outlineEntries} page={page} onSelect={onPageSelect} />
            ) : (
              <p className="theme-pdf-viewer__toc-empty type-caption type-muted" role="status">
                No table of contents in this document.
              </p>
            )
          ) : null}

          {mode === 'links' ? (
            linksLoading ? (
              <p className="theme-pdf-viewer__toc-empty type-caption type-muted" role="status">
                Loading links…
              </p>
            ) : hasLinks ? (
              <PdfLinkList entries={linkEntries} page={page} onPageSelect={onPageSelect} />
            ) : (
              <p className="theme-pdf-viewer__toc-empty type-caption type-muted" role="status">
                No links in this document.
              </p>
            )
          ) : null}
        </div>
      )}
    </aside>
  )
}
