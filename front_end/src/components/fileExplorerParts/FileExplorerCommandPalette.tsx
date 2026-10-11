import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import {
  filterDriveCommands,
  type DriveCommand,
  type DriveCommandId,
  type DriveEntry,
} from '../../lib/fileExplorer'

type FileExplorerCommandPaletteProps = {
  open: boolean
  entries: readonly DriveEntry[]
  hostRef: RefObject<HTMLElement | null>
  onClose: () => void
  onCommand: (id: DriveCommandId) => void
  onJumpTo: (entry: DriveEntry) => void
}

type PaletteRow =
  | { kind: 'command'; command: DriveCommand }
  | { kind: 'file'; entry: DriveEntry }

export function FileExplorerCommandPalette({
  open,
  entries,
  hostRef,
  onClose,
  onCommand,
  onJumpTo,
}: FileExplorerCommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
    const t = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [open])

  const rows = useMemo<PaletteRow[]>(() => {
    const commands = filterDriveCommands(query).map((command) => ({ kind: 'command' as const, command }))
    const q = query.trim().toLowerCase()
    const files = entries
      .filter((e) => e.kind === 'file' && (!q || e.name.toLowerCase().includes(q)))
      .slice(0, 12)
      .map((entry) => ({ kind: 'file' as const, entry }))
    return [...commands, ...files]
  }, [entries, query])

  useEffect(() => {
    setActive(0)
  }, [query])

  const host = hostRef.current
  if (!open || !host) return null

  const run = (row: PaletteRow) => {
    if (row.kind === 'command') onCommand(row.command.id)
    else onJumpTo(row.entry)
    onClose()
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, rows.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Enter' && rows[active]) {
      e.preventDefault()
      run(rows[active])
    }
  }

  return createPortal(
    <div
      className="theme-file-explorer__palette"
      role="dialog"
      aria-label="Command palette"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="theme-file-explorer__palette-panel">
        <div className="theme-file-explorer__palette-input">
          <input
            ref={inputRef}
            className="w-full bg-transparent type-body-sm outline-none"
            placeholder="Type a command or file name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            aria-label="Command palette search"
          />
        </div>
        <div className="theme-file-explorer__palette-list" role="listbox">
          {rows.length === 0 ? (
            <p className="type-caption type-muted p-2">No results</p>
          ) : (
            rows.map((row, i) => (
              <button
                key={row.kind === 'command' ? row.command.id : row.entry.id}
                type="button"
                role="option"
                aria-selected={i === active}
                className={[
                  'theme-file-explorer__palette-item',
                  i === active ? 'theme-file-explorer__palette-item--active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onMouseEnter={() => setActive(i)}
                onClick={() => run(row)}
              >
                {row.kind === 'command' ? (
                  <>
                    <span className="type-body-sm">{row.command.label}</span>
                    <span className="type-caption type-muted">{row.command.group}</span>
                  </>
                ) : (
                  <>
                    <span className="type-body-sm">{row.entry.name}</span>
                    <span className="type-caption type-muted">Jump to file</span>
                  </>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>,
    host,
  )
}
