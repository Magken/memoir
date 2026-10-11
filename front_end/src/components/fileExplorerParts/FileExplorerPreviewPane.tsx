import { Star, UserMinus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { DriveEntry } from '../../lib/fileExplorer'
import {
  childrenOf,
  formatBytes,
  formatModified,
  mimeGroupLabel,
  pathString,
  previewKindForEntry,
} from '../../lib/fileExplorer'
import type { FilesShareRow } from '../../lib/fileApi'
import { useDeferredStageActive } from '../../lib/codeEditor/useDeferredStageActive'
import { ContentLoadOverlay } from '../Loader'
import { ThemeScroll } from '../ThemeScroll'
import { IconButton } from '../IconButton'
import { Tooltip } from '../Tooltip'
import { PdfViewerHeadless } from '../PdfViewerHeadless'
import { MarkdownRendererEmbed } from '../MarkdownRenderer'
import { MermaidRendererEmbed } from '../MermaidRenderer'
import { ForceGraphRendererEmbed } from '../ForceGraphRenderer'
import { DrawCanvasHeadless } from '../drawCanvasParts/DrawCanvasHeadless'
import { FileExplorerEntryIcon } from './FileExplorerEntryIcon'
import { FileExplorerShareBadge } from './FileExplorerShareBadge'

type FileExplorerPreviewPaneProps = {
  entry: DriveEntry | null
  allEntries: readonly DriveEntry[]
  onToggleStar: (id: string) => void
  /** Live shares for the selected node (manager view). */
  shares?: readonly FilesShareRow[] | null
  sharesLoading?: boolean
  onRevokeShare?: (shareId: string) => void
  onOpenShare?: () => void
}

function CsvTable({ text }: { text: string }) {
  const rows = useMemo(() => {
    return text
      .trim()
      .split(/\r?\n/)
      .slice(0, 40)
      .map((line) => line.split(','))
  }, [text])

  if (rows.length === 0) {
    return <p className="type-caption type-muted p-2">Empty CSV</p>
  }

  return (
    <ThemeScroll rail="nano" className="h-full">
      <table className="theme-file-explorer__details">
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className="type-caption">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </ThemeScroll>
  )
}

function PreviewStage({ entry, allEntries }: { entry: DriveEntry; allEntries: readonly DriveEntry[] }) {
  const kind = previewKindForEntry(entry)
  const [loading, setLoading] = useState(kind === 'pdf' || kind === 'image')

  useEffect(() => {
    setLoading(kind === 'pdf' || kind === 'image')
    if (kind === 'image') {
      const t = window.setTimeout(() => setLoading(false), 120)
      return () => window.clearTimeout(t)
    }
    if (kind !== 'pdf') setLoading(false)
  }, [entry.id, kind])

  if (kind === 'folder') {
    const count = childrenOf(allEntries, entry.id).length
    return (
      <div className="theme-file-explorer__preview-empty">
        <FileExplorerEntryIcon entry={entry} size="lg" />
        <p className="type-caption type-muted">{count} item{count === 1 ? '' : 's'}</p>
      </div>
    )
  }

  if (kind === 'image') {
    const src = entry.objectUrl ?? entry.content
    return (
      <div className="theme-file-explorer__preview-stage">
        <ContentLoadOverlay loading={loading} label="Loading image…" />
        {src ? <img src={src} alt={entry.name} onLoad={() => setLoading(false)} /> : null}
      </div>
    )
  }

  if (kind === 'pdf') {
    const src = entry.objectUrl ?? entry.content
    return (
      <div className="theme-file-explorer__preview-stage theme-file-explorer__preview-embed">
        <ContentLoadOverlay loading={loading} label="Loading PDF…" />
        {src ? (
          <PdfViewerHeadless
            src={src}
            className="h-full"
            onSearchHostReady={(host) => {
              if (host && !host.disabled) setLoading(false)
            }}
          />
        ) : null}
      </div>
    )
  }

  if (kind === 'markdown' && entry.content != null) {
    return (
      <div className="theme-file-explorer__preview-embed">
        <MarkdownRendererEmbed source={entry.content} className="h-full" />
      </div>
    )
  }

  if (kind === 'mermaid' && entry.content != null) {
    return (
      <div className="theme-file-explorer__preview-embed">
        <MermaidRendererEmbed source={entry.content} className="h-full" />
      </div>
    )
  }

  if (kind === 'force' && entry.content != null) {
    return (
      <div className="theme-file-explorer__preview-embed">
        <ForceGraphRendererEmbed source={entry.content} className="h-full" />
      </div>
    )
  }

  if (kind === 'draw' && entry.content != null) {
    return (
      <div className="theme-file-explorer__preview-embed">
        <DrawCanvasHeadless
          sceneJson={entry.content}
          className="h-full"
          showZoomOverlay={false}
          allowFullscreenExpand={false}
        />
      </div>
    )
  }

  if (kind === 'csv' && entry.content != null) {
    return <CsvTable text={entry.content} />
  }

  if (
    (kind === 'text' || kind === 'code' || kind === 'json' || kind === 'unknown') &&
    entry.content != null
  ) {
    return (
      <ThemeScroll rail="nano" className="h-full">
        <pre className="theme-file-explorer__preview-text type-caption">{entry.content}</pre>
      </ThemeScroll>
    )
  }

  return (
    <div className="theme-file-explorer__preview-empty">
      <FileExplorerEntryIcon entry={entry} size="lg" />
      <p className="type-caption type-muted">No preview available</p>
    </div>
  )
}

function PreviewPaneLayer({
  entry,
  allEntries,
  active,
}: {
  entry: DriveEntry
  allEntries: readonly DriveEntry[]
  active: boolean
}) {
  const deferredActive = useDeferredStageActive(active)
  return (
    <div
      className={[
        'theme-file-explorer__preview-stage-pane',
        deferredActive ? 'theme-file-explorer__preview-stage-pane--active' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <PreviewStage entry={entry} allEntries={allEntries} />
    </div>
  )
}

export function FileExplorerPreviewPane({
  entry,
  allEntries,
  onToggleStar,
  shares,
  sharesLoading,
  onRevokeShare,
  onOpenShare,
}: FileExplorerPreviewPaneProps) {
  const [stack, setStack] = useState<DriveEntry[]>([])

  useEffect(() => {
    if (!entry) {
      setStack([])
      return
    }
    setStack((prev) => {
      const without = prev.filter((e) => e.id !== entry.id)
      return [...without.slice(-1), entry]
    })
  }, [entry])

  const showShares = shares != null || sharesLoading || onOpenShare

  return (
    <aside className="theme-file-explorer__preview" aria-label="Preview">
      <div className="theme-file-explorer__preview-host">
        <div className="theme-file-explorer__preview-head">
          <span className="type-label">Preview</span>
          {entry ? (
            <div className="flex items-center gap-1">
              <FileExplorerShareBadge count={entry.shareCount} />
              <Tooltip content={entry.starred ? 'Unstar' : 'Star'}>
                <IconButton
                  icon={Star}
                  aria-label={entry.starred ? 'Unstar' : 'Star'}
                  size="xs"
                  variant="ghost"
                  active={Boolean(entry.starred)}
                  onClick={() => onToggleStar(entry.id)}
                />
              </Tooltip>
            </div>
          ) : null}
        </div>
        <div className="theme-file-explorer__preview-body">
          {entry ? (
            <>
              <div className="theme-file-explorer__preview-stage-stack">
                {stack.map((stacked) => (
                  <PreviewPaneLayer
                    key={stacked.id}
                    entry={stacked}
                    allEntries={allEntries}
                    active={stacked.id === entry.id}
                  />
                ))}
              </div>
              <div className="theme-file-explorer__details-meta">
                <p className="type-label">Details</p>
                <div className="theme-file-explorer__meta-row">
                  <span className="type-caption type-muted">Name</span>
                  <span className="theme-file-explorer__meta-value type-caption">{entry.name}</span>
                </div>
                <div className="theme-file-explorer__meta-row">
                  <span className="type-caption type-muted">Type</span>
                  <span className="theme-file-explorer__meta-value type-caption">
                    {mimeGroupLabel(entry.mimeGroup)}
                  </span>
                </div>
                <div className="theme-file-explorer__meta-row">
                  <span className="type-caption type-muted">Size</span>
                  <span className="theme-file-explorer__meta-value type-caption">
                    {entry.kind === 'folder' ? '—' : formatBytes(entry.sizeBytes)}
                  </span>
                </div>
                <div className="theme-file-explorer__meta-row">
                  <span className="type-caption type-muted">Modified</span>
                  <span className="theme-file-explorer__meta-value type-caption">
                    {formatModified(entry.modifiedAt)}
                  </span>
                </div>
                <div className="theme-file-explorer__meta-row">
                  <span className="type-caption type-muted">Path</span>
                  <span className="theme-file-explorer__meta-value type-caption">
                    {pathString(allEntries, entry.id)}
                  </span>
                </div>
                {entry.tags?.length ? (
                  <div className="theme-file-explorer__meta-row">
                    <span className="type-caption type-muted">Tags</span>
                    <span className="theme-file-explorer__meta-value type-caption">
                      {entry.tags.join(', ')}
                    </span>
                  </div>
                ) : null}

                {showShares ? (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="type-label">Shared with</p>
                      {onOpenShare ? (
                        <button
                          type="button"
                          className="type-caption text-[var(--theme-accent)]"
                          onClick={onOpenShare}
                        >
                          Share…
                        </button>
                      ) : null}
                    </div>
                    {sharesLoading ? (
                      <p className="type-caption type-muted">Loading…</p>
                    ) : shares && shares.length > 0 ? (
                      <div className="theme-file-explorer__share-people">
                        {shares.map((s) => (
                          <div key={s.id} className="theme-file-explorer__share-person">
                            <div className="theme-file-explorer__share-person-meta">
                              <span className="type-caption">
                                {s.displayName ?? s.email ?? s.accountName ?? 'Unknown'}
                              </span>
                              <span className="type-caption type-muted">
                                {[s.role, s.email ?? s.username].filter(Boolean).join(' · ')}
                              </span>
                            </div>
                            {onRevokeShare ? (
                              <Tooltip content="Revoke share">
                                <IconButton
                                  icon={UserMinus}
                                  aria-label="Revoke share"
                                  size="xs"
                                  variant="ghost"
                                  onClick={() => onRevokeShare(s.id)}
                                />
                              </Tooltip>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="type-caption type-muted">Not shared with anyone</p>
                    )}
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="theme-file-explorer__preview-empty">
              <p className="type-caption type-muted">Select a file to preview</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
