import { ArrowDown, ArrowUp } from 'lucide-react'
import type { DragEvent, MouseEvent } from 'react'
import type { DriveEntry, DriveSortDir, DriveSortKey } from '../../lib/fileExplorer'
import {
  FILE_EXPLORER_ENTRY_MIME,
  canDropOnto,
  encodeDragEntryIds,
  formatBytes,
  formatModified,
  mimeGroupLabel,
  readDragEntryIds,
} from '../../lib/fileExplorer'
import { FileExplorerEntryActions, type FileExplorerEntryActionId } from './FileExplorerEntryActions'
import { FileExplorerEntryIcon } from './FileExplorerEntryIcon'
import { FileExplorerShareBadge } from './FileExplorerShareBadge'

type FileExplorerDetailsViewProps = {
  entries: readonly DriveEntry[]
  allEntries: readonly DriveEntry[]
  selectedIds: ReadonlySet<string>
  cutIds: ReadonlySet<string>
  dropTargetId: string | null | undefined
  sortKey: DriveSortKey
  sortDir: DriveSortDir
  onSort: (key: DriveSortKey) => void
  onSelect: (entry: DriveEntry, e: MouseEvent) => void
  onOpen: (entry: DriveEntry) => void
  onContextMenu: (entry: DriveEntry | null, e: MouseEvent) => void
  onEntryAction: (id: FileExplorerEntryActionId, entry: DriveEntry) => void
  onRelocateEntries: (ids: string[], targetFolderId: string | null) => void
  onDropTargetChange: (id: string | null | undefined) => void
  getDragIds: (entry: DriveEntry) => string[]
}

function SortHeader({
  label,
  column,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string
  column: DriveSortKey
  sortKey: DriveSortKey
  sortDir: DriveSortDir
  onSort: (key: DriveSortKey) => void
}) {
  const active = sortKey === column
  return (
    <button type="button" className="theme-file-explorer__details-sort type-label" onClick={() => onSort(column)}>
      {label}
      {active ? (
        sortDir === 'asc' ? (
          <ArrowUp className="size-3" strokeWidth={1.75} />
        ) : (
          <ArrowDown className="size-3" strokeWidth={1.75} />
        )
      ) : null}
    </button>
  )
}

export function FileExplorerDetailsView({
  entries,
  allEntries,
  selectedIds,
  cutIds,
  dropTargetId,
  sortKey,
  sortDir,
  onSort,
  onSelect,
  onOpen,
  onContextMenu,
  onEntryAction,
  onRelocateEntries,
  onDropTargetChange,
  getDragIds,
}: FileExplorerDetailsViewProps) {
  return (
    <table className="theme-file-explorer__details">
      <thead>
        <tr>
          <th>
            <SortHeader label="Name" column="name" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
          </th>
          <th>
            <SortHeader label="Modified" column="modified" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
          </th>
          <th>
            <SortHeader label="Type" column="type" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
          </th>
          <th>
            <SortHeader label="Size" column="size" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
          </th>
          <th aria-label="Actions" />
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => {
          const selected = selectedIds.has(entry.id)
          const cut = cutIds.has(entry.id)
          const isDrop = entry.kind === 'folder' && dropTargetId === entry.id
          return (
            <tr
              key={entry.id}
              draggable
              className={[
                'theme-file-explorer__details-row',
                selected ? 'theme-file-explorer__details-row--selected' : '',
                cut ? 'theme-file-explorer__row--cut' : '',
                isDrop ? 'theme-file-explorer__details-row--drop-target' : '',
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
              <td>
                <span className="theme-file-explorer__row-name">
                  <FileExplorerEntryIcon entry={entry} />
                  <span className="type-body-sm">{entry.name}</span>
                  <FileExplorerShareBadge count={entry.shareCount} />
                </span>
              </td>
              <td className="type-caption type-muted">{formatModified(entry.modifiedAt)}</td>
              <td className="type-caption type-muted">{mimeGroupLabel(entry.mimeGroup)}</td>
              <td className="type-caption type-muted">
                {entry.kind === 'folder' ? '—' : formatBytes(entry.sizeBytes)}
              </td>
              <td>
                <FileExplorerEntryActions entry={entry} onAction={onEntryAction} />
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
