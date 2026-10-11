import { useMemo, useState } from 'react'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { Input } from '../Input'
import { Modal } from '../Modal'

type DrawCanvasSearchProps = {
  open: boolean
  onClose: () => void
  api: ExcalidrawImperativeAPI | null
}

export function DrawCanvasSearch({ open, onClose, api }: DrawCanvasSearchProps) {
  const [query, setQuery] = useState('')

  const hits = useMemo(() => {
    if (!api || !query.trim()) return []
    const q = query.trim().toLowerCase()
    return api
      .getSceneElements()
      .filter((el) => {
        if (el.isDeleted) return false
        if (el.type === 'text' && 'text' in el) {
          return String((el as { text?: string }).text ?? '')
            .toLowerCase()
            .includes(q)
        }
        if (el.type === 'frame' && 'name' in el) {
          return String((el as { name?: string }).name ?? '')
            .toLowerCase()
            .includes(q)
        }
        return false
      })
      .slice(0, 40)
  }, [api, query])

  return (
    <Modal open={open} title="Find on canvas" onClose={onClose} size="sm" placement="container">
      <div className="theme-draw-canvas__search-panel">
        <Input
          size="xs"
          shadowless
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search text and frames…"
          aria-label="Search canvas"
        />
        {hits.map((el) => {
          const label =
            el.type === 'text' && 'text' in el
              ? String((el as { text?: string }).text ?? 'Text')
              : el.type === 'frame' && 'name' in el
                ? String((el as { name?: string }).name ?? 'Frame')
                : el.type
          return (
            <button
              key={el.id}
              type="button"
              className="theme-draw-canvas__search-hit"
              onClick={() => {
                api?.scrollToContent(el, { fitToContent: true })
                api?.updateScene({
                  appState: {
                    selectedElementIds: { [el.id]: true },
                  },
                })
                onClose()
              }}
            >
              <span className="type-caption type-muted">{el.type}</span>
              <span>{label}</span>
            </button>
          )
        })}
        {query.trim() && hits.length === 0 ? (
          <p className="type-body-sm type-muted">No matches.</p>
        ) : null}
      </div>
    </Modal>
  )
}
