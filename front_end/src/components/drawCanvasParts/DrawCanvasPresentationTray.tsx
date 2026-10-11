import { ChevronLeft, ChevronRight } from 'lucide-react'
import { IconButton } from '../IconButton'
import { ToolbarControlTray } from '../ToolbarControlTray'

type DrawCanvasPresentationNavProps = {
  frameIndex: number
  frameCount: number
  onPrev: () => void
  onNext: () => void
}

/** Frame stepper in fullscreen header — sits next to the modal close button. */
export function DrawCanvasPresentationNav({
  frameIndex,
  frameCount,
  onPrev,
  onNext,
}: DrawCanvasPresentationNavProps) {
  const canPrev = frameIndex > 0
  const canNext = frameIndex < frameCount - 1
  const slideLabel = frameCount > 0 ? `${frameIndex + 1} / ${frameCount}` : '0 / 0'

  return (
    <ToolbarControlTray className="theme-draw-canvas__presentation-nav">
      <IconButton
        icon={ChevronLeft}
        aria-label="Previous frame"
        size="xs"
        variant="ghost"
        disabled={!canPrev}
        onClick={onPrev}
      />
      <span className="theme-draw-canvas__presentation-nav__counter type-caption tabular-nums">
        {slideLabel}
      </span>
      <IconButton
        icon={ChevronRight}
        aria-label="Next frame"
        size="xs"
        variant="ghost"
        disabled={!canNext}
        onClick={onNext}
      />
    </ToolbarControlTray>
  )
}
