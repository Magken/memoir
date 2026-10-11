import { createPortal } from 'react-dom'
import { useEffect, useRef } from 'react'

export type FileExplorerContextAction =
  | 'open'
  | 'preview'
  | 'download'
  | 'cut'
  | 'create-copy'
  | 'paste'
  | 'rename'
  | 'star'
  | 'share'
  | 'move-to'
  | 'copy-to'
  | 'delete'
  | 'new-folder'
  | 'upload'
  | 'sort-name'
  | 'sort-modified'

type CtxItem = {
  id: FileExplorerContextAction
  label: string
  disabled?: boolean
  sepBefore?: boolean
}

type FileExplorerContextMenuProps = {
  open: boolean
  x: number
  y: number
  mode: 'entry' | 'empty'
  canPaste: boolean
  hasSelection: boolean
  onClose: () => void
  onAction: (id: FileExplorerContextAction) => void
}

const ENTRY_ITEMS: CtxItem[] = [
  { id: 'open', label: 'Open' },
  { id: 'preview', label: 'Preview' },
  { id: 'download', label: 'Download', sepBefore: true },
  { id: 'cut', label: 'Cut' },
  { id: 'create-copy', label: 'Create copy' },
  { id: 'paste', label: 'Paste' },
  { id: 'rename', label: 'Rename', sepBefore: true },
  { id: 'star', label: 'Star / Unstar' },
  { id: 'share', label: 'Share…' },
  { id: 'move-to', label: 'Move to…' },
  { id: 'copy-to', label: 'Copy to…' },
  { id: 'delete', label: 'Delete', sepBefore: true },
]

const EMPTY_ITEMS: CtxItem[] = [
  { id: 'new-folder', label: 'New folder' },
  { id: 'upload', label: 'Upload…' },
  { id: 'paste', label: 'Paste', sepBefore: true },
  { id: 'sort-name', label: 'Sort by name', sepBefore: true },
  { id: 'sort-modified', label: 'Sort by modified' },
]

export function FileExplorerContextMenu({
  open,
  x,
  y,
  mode,
  canPaste,
  hasSelection,
  onClose,
  onAction,
}: FileExplorerContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  const items = (mode === 'entry' ? ENTRY_ITEMS : EMPTY_ITEMS).map((item) => {
    if (item.id === 'paste') return { ...item, disabled: !canPaste }
    if (mode === 'entry' && item.id === 'download') return { ...item, disabled: !hasSelection }
    return item
  })

  const left = Math.min(x, window.innerWidth - 200)
  const top = Math.min(y, window.innerHeight - 280)

  return createPortal(
    <div
      ref={ref}
      className="theme theme-file-explorer__ctx"
      role="menu"
      style={{ top, left }}
    >
      {items.map((item) => (
        <div key={item.id}>
          {item.sepBefore ? <div className="theme-file-explorer__ctx-sep" role="separator" /> : null}
          <button
            type="button"
            role="menuitem"
            className="theme-file-explorer__ctx-item type-caption"
            disabled={item.disabled}
            onClick={() => {
              if (item.disabled) return
              onAction(item.id)
              onClose()
            }}
          >
            {item.label}
          </button>
        </div>
      ))}
    </div>,
    document.body,
  )
}
