import { ChevronRight, Clock, Folder, Share2, Star, Trash2 } from 'lucide-react'
import { useState, type DragEvent } from 'react'
import type { DriveEntry, DriveLocation, DriveTreeNode } from '../../lib/fileExplorer'
import {
  buildFolderTree,
  canDropOnto,
  FILE_EXPLORER_ENTRY_MIME,
  encodeDragEntryIds,
  readDragEntryIds,
} from '../../lib/fileExplorer'
import { ThemeScroll } from '../ThemeScroll'
import { FileExplorerEntryActions, type FileExplorerEntryActionId } from './FileExplorerEntryActions'
import { FileExplorerEntryIcon } from './FileExplorerEntryIcon'
import { FileExplorerSearch } from './FileExplorerSearch'
import type { FileExplorerSidebarView } from './FileExplorerToolbar'
import { FileExplorerTreeFold } from './FileExplorerTreeFold'

type FileExplorerSidebarProps = {
  entries: readonly DriveEntry[]
  location: DriveLocation
  view: FileExplorerSidebarView
  searchFocusToken?: number
  dropTargetId: string | null | undefined
  /** Show Shared / Trash quick-access (live backend mode). */
  showLiveLocations?: boolean
  liveAccountId?: string | null
  onLocationChange: (location: DriveLocation) => void
  onOpenSearchEntry: (entry: DriveEntry, opts?: { line?: number }) => void
  onRelocateEntries: (ids: string[], targetFolderId: string | null) => void
  onDropTargetChange: (id: string | null | undefined) => void
  onEntryAction: (id: FileExplorerEntryActionId, entry: DriveEntry) => void
}

function TreeNode({
  node,
  depth,
  entries,
  activeFolderId,
  dropTargetId,
  onSelect,
  onRelocateEntries,
  onDropTargetChange,
  onEntryAction,
}: {
  node: DriveTreeNode
  depth: number
  entries: readonly DriveEntry[]
  activeFolderId: string | null
  dropTargetId: string | null | undefined
  onSelect: (id: string) => void
  onRelocateEntries: (ids: string[], targetFolderId: string | null) => void
  onDropTargetChange: (id: string | null | undefined) => void
  onEntryAction: (id: FileExplorerEntryActionId, entry: DriveEntry) => void
}) {
  const [open, setOpen] = useState(depth < 1)
  const hasChildren = node.children.length > 0
  const active = activeFolderId === node.entry.id
  const isDrop = dropTargetId === node.entry.id

  const onDragStart = (e: DragEvent) => {
    e.dataTransfer.setData(FILE_EXPLORER_ENTRY_MIME, encodeDragEntryIds([node.entry.id]))
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDragOver = (e: DragEvent) => {
    const ids = readDragEntryIds(e.dataTransfer)
    if (ids.length === 0 && !e.dataTransfer.types.includes(FILE_EXPLORER_ENTRY_MIME)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    onDropTargetChange(node.entry.id)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const ids = readDragEntryIds(e.dataTransfer)
    onDropTargetChange(undefined)
    if (!canDropOnto(entries, ids, node.entry.id)) return
    onRelocateEntries(ids, node.entry.id)
  }

  return (
    <div>
      <div
        className="theme-file-explorer__tree-row"
        data-depth={Math.min(depth, 6)}
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={() => {
          if (dropTargetId === node.entry.id) onDropTargetChange(undefined)
        }}
        onDrop={onDrop}
      >
        {hasChildren ? (
          <button
            type="button"
            className="theme-file-explorer__tree-toggle"
            aria-label={open ? 'Collapse' : 'Expand'}
            onClick={() => setOpen((v) => !v)}
          >
            <ChevronRight
              className={[
                'theme-file-explorer__tree-chevron',
                open ? 'theme-file-explorer__tree-chevron--open' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              strokeWidth={1.75}
            />
          </button>
        ) : (
          <span className="theme-file-explorer__tree-toggle" aria-hidden />
        )}
        <button
          type="button"
          className={[
            'theme-file-explorer__tree-btn',
            'type-caption',
            active ? 'theme-file-explorer__tree-btn--active' : '',
            isDrop ? 'theme-file-explorer__tree-btn--drop-target' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => onSelect(node.entry.id)}
        >
          <FileExplorerEntryIcon entry={node.entry} />
          <span className="theme-file-explorer__tree-label">{node.entry.name}</span>
        </button>
        <FileExplorerEntryActions entry={node.entry} onAction={onEntryAction} />
      </div>
      {hasChildren ? (
        <FileExplorerTreeFold open={open}>
          {node.children.map((child) => (
            <TreeNode
              key={child.entry.id}
              node={child}
              depth={depth + 1}
              entries={entries}
              activeFolderId={activeFolderId}
              dropTargetId={dropTargetId}
              onSelect={onSelect}
              onRelocateEntries={onRelocateEntries}
              onDropTargetChange={onDropTargetChange}
              onEntryAction={onEntryAction}
            />
          ))}
        </FileExplorerTreeFold>
      ) : null}
    </div>
  )
}

export function FileExplorerSidebar({
  entries,
  location,
  view,
  searchFocusToken = 0,
  dropTargetId,
  showLiveLocations = false,
  liveAccountId = null,
  onLocationChange,
  onOpenSearchEntry,
  onRelocateEntries,
  onDropTargetChange,
  onEntryAction,
}: FileExplorerSidebarProps) {
  const tree = buildFolderTree(entries, null)
  const activeFolderId = location.type === 'folder' ? location.folderId : null

  return (
    <aside className="theme-file-explorer__sidebar" aria-label="Locations">
      <div className="theme-file-explorer__sidebar-host">
        {view === 'search' ? (
          <FileExplorerSearch
            entries={entries}
            focusToken={searchFocusToken}
            liveAccountId={liveAccountId}
            onOpenEntry={onOpenSearchEntry}
          />
        ) : (
          <ThemeScroll rail="nano" className="theme-file-explorer__sidebar-scroll">
            <div className="theme-file-explorer__sidebar-inner">
              <div>
                <p className="theme-file-explorer__sidebar-section-label type-label type-muted">
                  Quick access
                </p>
                <button
                  type="button"
                  className={[
                    'theme-file-explorer__qa-btn',
                    'type-caption',
                    location.type === 'folder' && location.folderId === null
                      ? 'theme-file-explorer__qa-btn--active'
                      : '',
                    dropTargetId === null ? 'theme-file-explorer__qa-btn--drop-target' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => onLocationChange({ type: 'folder', folderId: null })}
                  onDragOver={(e) => {
                    if (!e.dataTransfer.types.includes(FILE_EXPLORER_ENTRY_MIME)) return
                    e.preventDefault()
                    onDropTargetChange(null)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    const ids = readDragEntryIds(e.dataTransfer)
                    onDropTargetChange(undefined)
                    if (!canDropOnto(entries, ids, null)) return
                    onRelocateEntries(ids, null)
                  }}
                >
                  <Folder className="size-3.5 shrink-0" strokeWidth={1.75} />
                  My files
                </button>
                <button
                  type="button"
                  className={[
                    'theme-file-explorer__qa-btn',
                    'type-caption',
                    location.type === 'starred' ? 'theme-file-explorer__qa-btn--active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => onLocationChange({ type: 'starred' })}
                >
                  <Star className="size-3.5 shrink-0" strokeWidth={1.75} />
                  Starred
                </button>
                <button
                  type="button"
                  className={[
                    'theme-file-explorer__qa-btn',
                    'type-caption',
                    location.type === 'recent' ? 'theme-file-explorer__qa-btn--active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => onLocationChange({ type: 'recent' })}
                >
                  <Clock className="size-3.5 shrink-0" strokeWidth={1.75} />
                  Recent
                </button>
                {showLiveLocations ? (
                  <>
                    <button
                      type="button"
                      className={[
                        'theme-file-explorer__qa-btn',
                        'type-caption',
                        location.type === 'shared' ? 'theme-file-explorer__qa-btn--active' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => onLocationChange({ type: 'shared' })}
                    >
                      <Share2 className="size-3.5 shrink-0" strokeWidth={1.75} />
                      Shared
                    </button>
                    <button
                      type="button"
                      className={[
                        'theme-file-explorer__qa-btn',
                        'type-caption',
                        location.type === 'trash' ? 'theme-file-explorer__qa-btn--active' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => onLocationChange({ type: 'trash' })}
                    >
                      <Trash2 className="size-3.5 shrink-0" strokeWidth={1.75} />
                      Trash
                    </button>
                  </>
                ) : null}
              </div>

              <div>
                <p className="theme-file-explorer__sidebar-section-label type-label type-muted">
                  Folders
                </p>
                {tree.map((node) => (
                  <TreeNode
                    key={node.entry.id}
                    node={node}
                    depth={0}
                    entries={entries}
                    activeFolderId={activeFolderId}
                    dropTargetId={dropTargetId}
                    onSelect={(id) => onLocationChange({ type: 'folder', folderId: id })}
                    onRelocateEntries={onRelocateEntries}
                    onDropTargetChange={onDropTargetChange}
                    onEntryAction={onEntryAction}
                  />
                ))}
              </div>
            </div>
          </ThemeScroll>
        )}
      </div>
    </aside>
  )
}
