import type { DragEvent, MouseEvent } from 'react'
import type { DriveEntry } from '../../lib/fileExplorer'
import {
  FILE_EXPLORER_ENTRY_MIME,
  canDropOnto,
  encodeDragEntryIds,
  readDragEntryIds,
} from '../../lib/fileExplorer'
import { FileExplorerEntryActions, type FileExplorerEntryActionId } from './FileExplorerEntryActions'
import { FileExplorerEntryIcon } from './FileExplorerEntryIcon'
import { FileExplorerShareBadge } from './FileExplorerShareBadge'

type FileExplorerGridViewProps = {
  entries: readonly DriveEntry[]
  allEntries: readonly DriveEntry[]
  selectedIds: ReadonlySet<string>
  cutIds: ReadonlySet<string>
  dropTargetId: string | null | undefined
  onSelect: (entry: DriveEntry, e: MouseEvent) => void
  onOpen: (entry: DriveEntry) => void
  onContextMenu: (entry: DriveEntry | null, e: MouseEvent) => void
  onEntryAction: (id: FileExplorerEntryActionId, entry: DriveEntry) => void
  onRelocateEntries: (ids: string[], targetFolderId: string | null) => void
  onDropTargetChange: (id: string | null | undefined) => void
  getDragIds: (entry: DriveEntry) => string[]
}

export function FileExplorerGridView({
  entries,
  allEntries,
  selectedIds,
  cutIds,
  dropTargetId,
  onSelect,
  onOpen,
  onContextMenu,
  onEntryAction,
  onRelocateEntries,
  onDropTargetChange,
  getDragIds,
}: FileExplorerGridViewProps) {
  return (
    <div className="theme-file-explorer__grid" role="listbox" aria-label="Files grid">
      {entries.map((entry) => {
        const selected = selectedIds.has(entry.id)
        const cut = cutIds.has(entry.id)
        const isDrop = entry.kind === 'folder' && dropTargetId === entry.id
        const thumb =
          entry.mimeGroup === 'image' ? entry.objectUrl ?? entry.content : undefined

        return (
          <button
            key={entry.id}
            type="button"
            role="option"
            aria-selected={selected}
            draggable
            className={[
              'theme-file-explorer__tile',
              'theme-file-explorer__tile--movable',
              selected ? 'theme-file-explorer__tile--selected' : '',
              cut ? 'theme-file-explorer__row--cut' : '',
              isDrop ? 'theme-file-explorer__tile--drop-target' : '',
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
              onDropTargetChange(entry.id)
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
            <FileExplorerEntryActions
              entry={entry}
              className="theme-file-explorer__tile-actions"
              onAction={onEntryAction}
            />
            <div className="theme-file-explorer__tile-thumb">
              {thumb ? (
                <img src={thumb} alt="" />
              ) : (
                <FileExplorerEntryIcon entry={entry} size="lg" />
              )}
            </div>
            <span className="theme-file-explorer__tile-name type-caption">{entry.name}</span>
            <FileExplorerShareBadge
              count={entry.shareCount}
              className="theme-file-explorer__share-badge--tile"
            />
          </button>
        )
      })}
    </div>
  )
}
