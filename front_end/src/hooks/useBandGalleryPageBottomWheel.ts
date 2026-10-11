import type Lenis from 'lenis'
import { useEffect, type RefObject } from 'react'
import type { BandGalleryEngine } from '../lib/galleries/bandGallery'

const PAGE_BOTTOM_EPS_PX = 12

function readWheelDelta(event: WheelEvent): number {
  return Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX
}

function isPageAtBottom(lenis: Lenis | null): boolean {
  if (lenis) {
    return lenis.scroll >= lenis.limit - PAGE_BOTTOM_EPS_PX
  }
  const root = document.documentElement
  return root.scrollHeight - window.scrollY - window.innerHeight <= PAGE_BOTTOM_EPS_PX
}

type UseBandGalleryPageBottomWheelOptions = {
  enabled: boolean
  engineRef: RefObject<BandGalleryEngine | null>
  lenis: Lenis | null
  isInteractionPaused: () => boolean
}

/**
 * At page bottom: wheel down pans the band gallery only; wheel up always scrolls the page.
 */
export function useBandGalleryPageBottomWheel({
  enabled,
  engineRef,
  lenis,
  isInteractionPaused,
}: UseBandGalleryPageBottomWheelOptions) {
  useEffect(() => {
    if (!enabled) return undefined

    const onWheel = (event: WheelEvent) => {
      if (isInteractionPaused()) return

      const delta = readWheelDelta(event)
      if (delta <= 0) return
      if (!isPageAtBottom(lenis)) return

      const engine = engineRef.current
      if (!engine) return

      event.preventDefault()
      event.stopPropagation()
      engine.applyWheelDelta(delta)
    }

    window.addEventListener('wheel', onWheel, { passive: false, capture: true })
    return () => window.removeEventListener('wheel', onWheel, { capture: true })
  }, [enabled, engineRef, isInteractionPaused, lenis])
}
