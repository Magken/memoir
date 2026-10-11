import { Expand, HelpCircle } from 'lucide-react'
import { IconButton } from '../IconButton'
import { Tooltip } from '../Tooltip'
import { CanvasZoomMenu } from '../rendererParts/CanvasZoomMenu'

type DrawCanvasFooterProps = {
  zoomPercent: number
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
  onZoomFit: () => void
  onExpandFullscreen: () => void
  onHelp: () => void
  zenModeEnabled: boolean
  viewModeEnabled: boolean
  onExitZen: () => void
  onExitView: () => void
}

export function DrawCanvasFooter({
  zoomPercent,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onZoomFit,
  onExpandFullscreen,
  onHelp,
  zenModeEnabled,
  viewModeEnabled,
  onExitZen,
  onExitView,
}: DrawCanvasFooterProps) {
  return (
    <div className="theme-draw-canvas__footer">
      <CanvasZoomMenu
        zoomLabel={`${zoomPercent}%`}
        onZoomOut={onZoomOut}
        onZoomReset={onZoomReset}
        onZoomIn={onZoomIn}
        onZoomFit={onZoomFit}
        onExpandFullscreen={onExpandFullscreen}
      />
      <div className="theme-draw-canvas__footer-spacer" />

      {zenModeEnabled ? (
        <Tooltip content="Exit zen mode">
          <IconButton icon={Expand} aria-label="Exit zen mode" size="xs" variant="ghost" onClick={onExitZen} />
        </Tooltip>
      ) : null}
      {viewModeEnabled ? (
        <Tooltip content="Exit view mode">
          <IconButton
            icon={Expand}
            aria-label="Exit view mode"
            size="xs"
            variant="ghost"
            onClick={onExitView}
          />
        </Tooltip>
      ) : null}

      <Tooltip content="Keyboard shortcuts">
        <IconButton icon={HelpCircle} aria-label="Help" size="xs" variant="ghost" onClick={onHelp} />
      </Tooltip>
    </div>
  )
}
