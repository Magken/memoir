import { FolderPlus, Upload } from 'lucide-react'
import type { DragEvent, MouseEvent, ReactNode } from 'react'
import type { DriveEntry, DriveSortDir, DriveSortKey, DriveViewMode } from '../../lib/fileExplorer'
import {
  FILE_EXPLORER_ENTRY_MIME,
  canDropOnto,
  readDragEntryIds,
} from '../../lib/fileExplorer'
import { Button } from '../Button'
import { ThemeScroll } from '../ThemeScroll'
import type { FileExplorerEntryActionId } from './FileExplorerEntryActions'
import { FileExplorerDetailsView } from './FileExplorerDetailsView'
import { FileExplorerGridView } from './FileExplorerGridView'
import { FileExplorerListView } from './FileExplorerListView'

type FileExplorerBrowserProps = {
  entries: readonly DriveEntry[]
  allEntries: readonly DriveEntry[]
  viewMode: DriveViewMode
  selectedIds: ReadonlySet<string>
  cutIds: ReadonlySet<string>
  dropTargetId: string | null | undefined
  currentFolderId: string | null
  sortKey: DriveSortKey
  sortDir: DriveSortDir
  searching: boolean
  renamingId: string | null
  renameValue: string
  renameError?: string | null
  dropActive: boolean
  onRenameValueChange: (value: string) => void
  onRenameCommit: () => void
  onRenameCancel: () => void
  onSort: (key: DriveSortKey) => void
  onSelect: (entry: DriveEntry, e: MouseEvent) => void
  onOpen: (entry: DriveEntry) => void
  onContextMenu: (entry: DriveEntry | null, e: MouseEvent) => void
  onEmptyContextMenu: (e: MouseEvent) => void
  onDropFiles: (files: File[]) => void
  onDropActiveChange: (active: boolean) => void
  onEntryAction: (id: FileExplorerEntryActionId, entry: DriveEntry) => void
  onRelocateEntries: (ids: string[], targetFolderId: string | null) => void
  onDropTargetChange: (id: string | null | undefined) => void
  getDragIds: (entry: DriveEntry) => string[]
  onUpload: () => void
  onNewFolder: () => void
}

export function FileExplorerBrowser({
  entries,
  allEntries,
  viewMode,
  selectedIds,
  cutIds,
  dropTargetId,
  currentFolderId,
  sortKey,
  sortDir,
  searching,
  renamingId,
  renameValue,
  renameError = null,
  dropActive,
  onRenameValueChange,
  onRenameCommit,
  onRenameCancel,
  onSort,
  onSelect,
  onOpen,
  onContextMenu,
  onEmptyContextMenu,
  onDropFiles,
  onDropActiveChange,
  onEntryAction,
  onRelocateEntries,
  onDropTargetChange,
  getDragIds,
  onUpload,
  onNewFolder,
}: FileExplorerBrowserProps) {
  const entryDropActive = dropTargetId === currentFolderId && dropTargetId !== undefined

  const onDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types.includes(FILE_EXPLORER_ENTRY_MIME)) {
      onDropTargetChange(currentFolderId)
      return
    }
    if (e.dataTransfer.types.includes('Files')) onDropActiveChange(true)
  }

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault()
    if (e.currentTarget === e.target) {
      onDropActiveChange(false)
      onDropTargetChange(undefined)
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    onDropActiveChange(false)
    const ids = readDragEntryIds(e.dataTransfer)
    if (ids.length) {
      onDropTargetChange(undefined)
      if (canDropOnto(allEntries, ids, currentFolderId)) {
        onRelocateEntries(ids, currentFolderId)
      }
      return
    }
    const files = Array.from(e.dataTransfer.files ?? [])
    if (files.length) onDropFiles(files)
  }

  const shared = {
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
  }

  let body: ReactNode
  if (entries.length === 0) {
    body = (
      <div className="theme-file-explorer__empty">
        <p className="type-body-sm type-muted">
          {searching ? 'No matches for this search or filter.' : 'This folder is empty.'}
        </p>
        {!searching ? (
          <div className="theme-file-explorer__empty-actions">
            <Button size="xs" variant="ghost" icon={Upload} onClick={onUpload}>
              Upload
            </Button>
            <Button size="xs" variant="ghost" icon={FolderPlus} onClick={onNewFolder}>
              New folder
            </Button>
          </div>
        ) : null}
      </div>
    )
  } else if (viewMode === 'grid') {
    body = <FileExplorerGridView {...shared} />
  } else if (viewMode === 'details') {
    body = (
      <FileExplorerDetailsView
        {...shared}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
      />
    )
  } else {
    body = (
      <FileExplorerListView
        {...shared}
        renamingId={renamingId}
        renameValue={renameValue}
        renameError={renameError}
        onRenameValueChange={onRenameValueChange}
        onRenameCommit={onRenameCommit}
        onRenameCancel={onRenameCancel}
      />
    )
  }

  return (
    <div
      className={[
        'theme-file-explorer__browser',
        dropActive ? 'theme-file-explorer__browser--drop' : '',
        entryDropActive ? 'theme-file-explorer__browser--entry-drop' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onContextMenu={(e) => {
        if ((e.target as HTMLElement).closest('[role="option"], tr.theme-file-explorer__details-row')) {
          return
        }
        onEmptyContextMenu(e)
      }}
    >
      <ThemeScroll rail="nano" className="theme-file-explorer__browser-scroll">
        {body}
      </ThemeScroll>
    </div>
  )
}
