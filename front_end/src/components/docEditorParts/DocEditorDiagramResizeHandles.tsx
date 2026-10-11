import type { PointerEvent as ReactPointerEvent } from 'react'
import type { DiagramResizeEdge } from '../../lib/docEditor/diagramBlockSize'

type DocEditorDiagramResizeHandlesProps = {
  onResizeStart: (edge: DiagramResizeEdge, event: ReactPointerEvent<HTMLDivElement>) => void
}

export function DocEditorDiagramResizeHandles({ onResizeStart }: DocEditorDiagramResizeHandlesProps) {
  return (
    <>
      <div
        className="editor-diagram-preview-card__resize editor-diagram-preview-card__resize--left"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize diagram width from left"
        onPointerDown={(event) => onResizeStart('left', event)}
      />
      <div
        className="editor-diagram-preview-card__resize editor-diagram-preview-card__resize--right"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize diagram width from right"
        onPointerDown={(event) => onResizeStart('right', event)}
      />
      <div
        className="editor-diagram-preview-card__resize editor-diagram-preview-card__resize--bottom"
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize diagram height"
        onPointerDown={(event) => onResizeStart('bottom', event)}
      />
    </>
  )
}
