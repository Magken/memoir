import { Star } from 'lucide-react'
import type { DragEvent, KeyboardEvent, MouseEvent } from 'react'
import type { DriveEntry } from '../../lib/fileExplorer'
import {
  FILE_EXPLORER_ENTRY_MIME,
  canDropOnto,
  encodeDragEntryIds,
  formatBytes,
  formatModified,
  readDragEntryIds,
} from '../../lib/fileExplorer'
import { Input } from '../Input'
import { FileExplorerEntryActions, type FileExplorerEntryActionId } from './FileExplorerEntryActions'
import { FileExplorerEntryIcon } from './FileExplorerEntryIcon'
import { FileExplorerShareBadge } from './FileExplorerShareBadge'

type FileExplorerListViewProps = {
  entries: readonly DriveEntry[]
  allEntries: readonly DriveEntry[]
  selectedIds: ReadonlySet<string>
  cutIds: ReadonlySet<string>
  dropTargetId: string | null | undefined
  renamingId: string | null
  renameValue: string
  renameError?: string | null
  onRenameValueChange: (value: string) => void
  onRenameCommit: () => void
  onRenameCancel: () => void
  onSelect: (entry: DriveEntry, e: MouseEvent) => void
  onOpen: (entry: DriveEntry) => void
  onContextMenu: (entry: DriveEntry | null, e: MouseEvent) => void
  onEntryAction: (id: FileExplorerEntryActionId, entry: DriveEntry) => void
  onRelocateEntries: (ids: string[], targetFolderId: string | null) => void
  onDropTargetChange: (id: string | null | undefined) => void
  getDragIds: (entry: DriveEntry) => string[]
}

export function FileExplorerListView({
  entries,
  allEntries,
  selectedIds,
  cutIds,
  dropTargetId,
  renamingId,
  renameValue,
  renameError = null,
  onRenameValueChange,
  onRenameCommit,
  onRenameCancel,
  onSelect,
  onOpen,
  onContextMenu,
  onEntryAction,
  onRelocateEntries,
  onDropTargetChange,
  getDragIds,
}: FileExplorerListViewProps) {
  return (
    <div className="theme-file-explorer__list" role="listbox" aria-label="Files">
      {entries.map((entry) => {
        const selected = selectedIds.has(entry.id)
        const cut = cutIds.has(entry.id)
        const renaming = renamingId === entry.id
        const isDrop = entry.kind === 'folder' && dropTargetId === entry.id

        return (
          <div
            key={entry.id}
            role="option"
            aria-selected={selected}
            tabIndex={-1}
            draggable={!renaming}
            className={[
              'theme-file-explorer__row',
              'theme-file-explorer__row--movable',
              selected ? 'theme-file-explorer__row--selected' : '',
              cut ? 'theme-file-explorer__row--cut' : '',
              isDrop ? 'theme-file-explorer__row--drop-target' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={(e) => onSelect(entry, e)}
            onDoubleClick={() => onOpen(entry)}
            onContextMenu={(e) => onContextMenu(entry, e)}
            onDragStart={(e: DragEvent) => {
              e.dataTransfer.setData(
                FILE_EXPLORER_ENTRY_MIME,
                encodeDragEntryIds(getDragIds(entry)),
              )
              e.dataTransfer.effectAllowed = 'move'
            }}
            onDragOver={(e: DragEvent) => {
              if (entry.kind !== 'folder') return
              if (!e.dataTransfer.types.includes(FILE_EXPLORER_ENTRY_MIME)) return
              e.preventDefault()
              e.stopPropagation()
              e.dataTransfer.dropEffect = 'move'
              onDropTargetChange(entry.id)
            }}
            onDragLeave={() => {
              if (dropTargetId === entry.id) onDropTargetChange(undefined)
            }}
            onDrop={(e: DragEvent) => {
              if (entry.kind !== 'folder') return
              e.preventDefault()
              e.stopPropagation()
              const ids = readDragEntryIds(e.dataTransfer)
              onDropTargetChange(undefined)
              if (!canDropOnto(allEntries, ids, entry.id)) return
              onRelocateEntries(ids, entry.id)
            }}
          >
            <FileExplorerEntryIcon entry={entry} />
            <div className="theme-file-explorer__row-name">
              {renaming ? (
                <Input
                  className="theme-file-explorer__inline-rename"
                  size="xs"
                  shadowless
                  value={renameValue}
                  error={renameError ?? undefined}
                  aria-label="Rename"
                  autoFocus
                  onChange={(e) => onRenameValueChange(e.target.value)}
                  onBlur={onRenameCommit}
                  onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      onRenameCommit()
                    } else if (e.key === 'Escape') {
                      e.preventDefault()
                      onRenameCancel()
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="theme-file-explorer__row-label type-body-sm">{entry.name}</span>
              )}
              {entry.starred ? (
                <Star className="size-3 shrink-0 type-muted" strokeWidth={1.75} aria-hidden />
              ) : null}
              <FileExplorerShareBadge count={entry.shareCount} />
            </div>
            <span className="theme-file-explorer__row-meta type-caption type-muted">
              {formatModified(entry.modifiedAt)}
            </span>
            <span className="theme-file-explorer__row-meta type-caption type-muted">
              {entry.kind === 'folder' ? '—' : formatBytes(entry.sizeBytes)}
            </span>
            <FileExplorerEntryActions entry={entry} onAction={onEntryAction} />
          </div>
        )
      })}
    </div>
  )
}
