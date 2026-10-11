import { Expand, Maximize2, ZoomIn, ZoomOut } from 'lucide-react'
import type { ReactNode } from 'react'
import { IconButton } from '../IconButton'
import { ToolbarControlTray } from '../ToolbarControlTray'
import { Tooltip } from '../Tooltip'

type CanvasZoomMenuProps = {
  zoomLabel: string
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
  onZoomFit: () => void
  onExpandFullscreen?: () => void
  expandLabel?: string
  /** Extra controls after zoom/fit (e.g. FlowEditor auto-layout). */
  trailing?: ReactNode
}

export function CanvasZoomMenu({
  zoomLabel,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onZoomFit,
  onExpandFullscreen,
  expandLabel = 'Open fullscreen',
  trailing,
}: CanvasZoomMenuProps) {
  return (
    <ToolbarControlTray>
      <span className="theme-toolbar-control-tray__zoom-step">
        <Tooltip content="Zoom out">
          <IconButton icon={ZoomOut} aria-label="Zoom out" size="xs" variant="ghost" onClick={onZoomOut} />
        </Tooltip>
        <button
          type="button"
          className="theme-toolbar-control-tray__value type-caption tabular-nums"
          onClick={onZoomReset}
          aria-label="Reset zoom"
        >
          {zoomLabel}
        </button>
        <Tooltip content="Zoom in">
          <IconButton icon={ZoomIn} aria-label="Zoom in" size="xs" variant="ghost" onClick={onZoomIn} />
        </Tooltip>
      </span>
      <Tooltip content="Zoom to fit">
        <IconButton icon={Maximize2} aria-label="Zoom to fit" size="xs" variant="ghost" onClick={onZoomFit} />
      </Tooltip>
      {onExpandFullscreen ? (
        <Tooltip content={expandLabel}>
          <IconButton
            icon={Expand}
            aria-label={expandLabel}
            size="xs"
            variant="ghost"
            onClick={onExpandFullscreen}
          />
        </Tooltip>
      ) : null}
      {trailing}
    </ToolbarControlTray>
  )
}
