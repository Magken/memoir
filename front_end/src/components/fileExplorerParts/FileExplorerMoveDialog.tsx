import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { buildFolderTree, type DriveEntry, type DriveTreeNode } from '../../lib/fileExplorer'
import { Modal } from '../Modal'
import { ThemeScroll } from '../ThemeScroll'
import { FileExplorerEntryIcon } from './FileExplorerEntryIcon'
import { FileExplorerTreeFold } from './FileExplorerTreeFold'

type FileExplorerMoveDialogProps = {
  open: boolean
  mode: 'move' | 'copy'
  entries: readonly DriveEntry[]
  error?: string | null
  onClose: () => void
  onConfirm: (folderId: string | null) => void
}

function FolderPickNode({
  node,
  depth,
  selectedId,
  onSelect,
}: {
  node: DriveTreeNode
  depth: number
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const [open, setOpen] = useState(depth < 1)
  const hasChildren = node.children.length > 0
  const active = selectedId === node.entry.id

  return (
    <div>
      <div className="theme-file-explorer__tree-row" data-depth={Math.min(depth, 6)}>
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
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => onSelect(node.entry.id)}
        >
          <FileExplorerEntryIcon entry={node.entry} />
          <span className="theme-file-explorer__tree-label">{node.entry.name}</span>
        </button>
      </div>
      {hasChildren ? (
        <FileExplorerTreeFold open={open}>
          {node.children.map((child) => (
            <FolderPickNode
              key={child.entry.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </FileExplorerTreeFold>
      ) : null}
    </div>
  )
}

export function FileExplorerMoveDialog({
  open,
  mode,
  entries,
  error = null,
  onClose,
  onConfirm,
}: FileExplorerMoveDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const tree = buildFolderTree(entries, null)

  useEffect(() => {
    if (open) setSelectedId(null)
  }, [open])

  return (
    <Modal
      open={open}
      title={mode === 'move' ? 'Move to…' : 'Copy to…'}
      onClose={onClose}
      placement="container"
      size="sm"
      confirmLabel={mode === 'move' ? 'Move' : 'Copy'}
      onConfirm={() => onConfirm(selectedId)}
    >
      <ThemeScroll rail="mini" className="theme-file-explorer__move-tree">
        <div className="theme-file-explorer__move-tree-inner">
          <button
            type="button"
            className={[
              'theme-file-explorer__qa-btn',
              'type-caption',
              selectedId === null ? 'theme-file-explorer__qa-btn--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => setSelectedId(null)}
          >
            My files (root)
          </button>
          {tree.map((node) => (
            <FolderPickNode
              key={node.entry.id}
              node={node}
              depth={0}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ))}
        </div>
      </ThemeScroll>
      {error ? (
        <p className="theme-field__message theme-field__message--error type-caption mt-2" role="alert">
          {error}
        </p>
      ) : null}
    </Modal>
  )
}
