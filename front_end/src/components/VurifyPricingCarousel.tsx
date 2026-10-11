import {
  Children,
  useCallback,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'

type VurifyPricingCarouselProps = {
  index: number
  onIndexChange: (index: number) => void
  children: ReactNode
  label?: string
  className?: string
}

const DRAG_THRESHOLD_PX = 48
const SETTLE_MS = 320

/**
 * One-at-a-time horizontal drag gallery (no chevrons / dots).
 * Wheel left to page ThemeScroll. Bidirectional sync via controlled `index`.
 */
export function VurifyPricingCarousel({
  index,
  onIndexChange,
  children,
  label = 'Pricing plans',
  className = '',
}: VurifyPricingCarouselProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const indexRef = useRef(index)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    dragging: boolean
  } | null>(null)

  indexRef.current = index
  const slides = Children.toArray(children)
  const maxIndex = Math.max(0, slides.length - 1)

  const applyTransform = useCallback((nextIndex: number, offsetPx = 0, animate: boolean) => {
    const track = trackRef.current
    const viewport = viewportRef.current
    if (!track || !viewport) return
    const width = viewport.clientWidth || 1
    const x = -nextIndex * width + offsetPx
    track.style.transition = animate ? `transform ${SETTLE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)` : 'none'
    track.style.transform = `translate3d(${x}px, 0, 0)`
  }, [])

  useEffect(() => {
    if (dragRef.current?.dragging) return
    applyTransform(index, 0, true)
  }, [applyTransform, index])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      if (dragRef.current?.dragging) return
      applyTransform(indexRef.current, 0, false)
    })
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [applyTransform])

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const viewport = viewportRef.current
    if (!viewport) return
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      dragging: true,
    }
    viewport.setPointerCapture(event.pointerId)
    applyTransform(indexRef.current, 0, false)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || !drag.dragging || drag.pointerId !== event.pointerId) return
    const delta = event.clientX - drag.startX
    applyTransform(indexRef.current, delta, false)
  }

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const viewport = viewportRef.current
    if (viewport?.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId)
    }

    const delta = event.clientX - drag.startX
    dragRef.current = null

    let next = indexRef.current
    if (delta <= -DRAG_THRESHOLD_PX) next = Math.min(maxIndex, next + 1)
    else if (delta >= DRAG_THRESHOLD_PX) next = Math.max(0, next - 1)

    if (next !== indexRef.current) {
      onIndexChange(next)
    } else {
      applyTransform(next, 0, true)
    }
  }

  return (
    <div
      ref={viewportRef}
      className={['theme-vurify-pricing-carousel', className].filter(Boolean).join(' ')}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div ref={trackRef} className="theme-vurify-pricing-carousel__track">
        {slides.map((child, slideIndex) => (
          <div
            key={slideIndex}
            className="theme-vurify-pricing-carousel__slide"
            aria-hidden={slideIndex !== index}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  )
}
