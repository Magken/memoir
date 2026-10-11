import { createPortal } from 'react-dom'
import { useEffect } from 'react'

export type DrawContextItem =
  | { type: 'item'; id: string; label: string; disabled?: boolean }
  | { type: 'sep' }

type DrawCanvasContextMenuProps = {
  open: boolean
  x: number
  y: number
  items: readonly DrawContextItem[]
  onSelect: (id: string) => void
  onClose: () => void
}

export function DrawCanvasContextMenu({
  open,
  x,
  y,
  items,
  onSelect,
  onClose,
}: DrawCanvasContextMenuProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const onDown = () => onClose()
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="theme-draw-canvas__context-menu"
      style={{ top: y, left: x }}
      role="menu"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {items.map((item, i) =>
        item.type === 'sep' ? (
          <div key={`sep-${i}`} className="theme-draw-canvas__context-sep" role="separator" />
        ) : (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            className="theme-draw-canvas__context-item"
            disabled={item.disabled}
            onClick={() => {
              onSelect(item.id)
              onClose()
            }}
          >
            {item.label}
          </button>
        ),
      )}
    </div>,
    document.body,
  )
}
