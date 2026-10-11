import { FileCode, FileText } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  searchDriveContent,
  searchDriveNames,
  type DriveContentHit,
  type DriveEntry,
} from '../../lib/fileExplorer'
import { IconButton } from '../IconButton'
import { SearchInput } from '../SearchInput'
import { ThemeScroll } from '../ThemeScroll'
import { ToolbarModeGroup } from '../ToolbarModeGroup'
import { Tooltip } from '../Tooltip'
import { FileExplorerEntryIcon } from './FileExplorerEntryIcon'

export type FileExplorerSearchScope = 'name' | 'content'

type FileExplorerSearchProps = {
  entries: readonly DriveEntry[]
  focusToken?: number
  /** Live: server search via fileApi */
  liveAccountId?: string | null
  onOpenEntry: (entry: DriveEntry, opts?: { line?: number }) => void
}

export function FileExplorerSearch({
  entries,
  focusToken = 0,
  liveAccountId = null,
  onOpenEntry,
}: FileExplorerSearchProps) {
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<FileExplorerSearchScope>('name')
  const [liveHits, setLiveHits] = useState<DriveEntry[]>([])
  const inputHostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!focusToken) return
    const input = inputHostRef.current?.querySelector('input')
    input?.focus()
  }, [focusToken])

  useEffect(() => {
    if (!liveAccountId) return
    const q = query.trim()
    if (!q) {
      setLiveHits([])
      return
    }
    let cancelled = false
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const { searchFiles } = await import('../../lib/fileApi')
          const { mapNodeToDriveEntry } = await import('../../lib/fileExplorer/liveSource')
          const rows = await searchFiles(liveAccountId, q, scope)
          if (!cancelled) setLiveHits(rows.map(mapNodeToDriveEntry))
        } catch {
          if (!cancelled) setLiveHits([])
        }
      })()
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [liveAccountId, query, scope])

  const nameHits = useMemo(
    () =>
      liveAccountId
        ? []
        : scope === 'name'
          ? searchDriveNames(entries, query)
          : [],
    [entries, liveAccountId, query, scope],
  )
  const contentHits = useMemo(
    () =>
      liveAccountId
        ? []
        : scope === 'content'
          ? searchDriveContent(entries, query)
          : [],
    [entries, liveAccountId, query, scope],
  )

  const hasQuery = query.trim().length > 0
  const displayNameHits = liveAccountId ? liveHits : nameHits
  const displayContentHits: DriveContentHit[] = liveAccountId
    ? liveHits.map((entry) => ({
        entryId: entry.id,
        entryName: entry.name,
        line: 1,
        preview: entry.content?.slice(0, 120) ?? entry.tags?.join(', ') ?? '',
      }))
    : contentHits

  return (
    <div className="theme-file-explorer__search-panel">
      <div className="theme-file-explorer__search-header">
        <ToolbarModeGroup aria-label="Search scope">
          <Tooltip content="Name & tags">
            <IconButton
              icon={FileText}
              aria-label="Search by name"
              size="xs"
              variant="tray"
              active={scope === 'name'}
              onClick={() => setScope('name')}
            />
          </Tooltip>
          <Tooltip content="File contents">
            <IconButton
              icon={FileCode}
              aria-label="Search contents"
              size="xs"
              variant="tray"
              active={scope === 'content'}
              onClick={() => setScope('content')}
            />
          </Tooltip>
        </ToolbarModeGroup>
      </div>
      <div className="theme-file-explorer__search-form" ref={inputHostRef}>
        <SearchInput
          size="xs"
          shadowless
          placeholder={scope === 'name' ? 'Search names…' : 'Search contents…'}
          value={query}
          onValueChange={setQuery}
          ariaLabel="Search library"
        />
      </div>
      <ThemeScroll rail="nano" className="theme-file-explorer__search-scroll">
        {!hasQuery ? (
          <p className="theme-file-explorer__search-empty type-caption type-muted">
            {scope === 'name'
              ? 'Search file and folder names or tags.'
              : 'Search text inside library files.'}
          </p>
        ) : scope === 'name' ? (
          displayNameHits.length === 0 ? (
            <p className="theme-file-explorer__search-empty type-caption type-muted">No name matches.</p>
          ) : (
            displayNameHits.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className="theme-file-explorer__search-hit"
                onClick={() => onOpenEntry(entry)}
              >
                <span className="theme-file-explorer__row-name">
                  <FileExplorerEntryIcon entry={entry} />
                  <span className="type-body-sm">{entry.name}</span>
                </span>
                <span className="type-caption type-muted">{entry.kind}</span>
              </button>
            ))
          )
        ) : displayContentHits.length === 0 ? (
          <p className="theme-file-explorer__search-empty type-caption type-muted">No content matches.</p>
        ) : (
          displayContentHits.map((hit: DriveContentHit) => {
            const entry =
              entries.find((e) => e.id === hit.entryId) ??
              liveHits.find((e) => e.id === hit.entryId)
            if (!entry) return null
            return (
              <button
                key={`${hit.entryId}:${hit.line}`}
                type="button"
                className="theme-file-explorer__search-hit"
                onClick={() => onOpenEntry(entry, { line: hit.line })}
              >
                <span className="type-body-sm">{hit.entryName}</span>
                <span className="type-caption type-muted">
                  L{hit.line}: {hit.preview}
                </span>
              </button>
            )
          })
        )}
      </ThemeScroll>
    </div>
  )
}
