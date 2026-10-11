import { useEffect, type RefObject } from 'react'
import {
  syncScrollEdgeState,
  viewportHasScrollOverflow,
  type RoundedScrollAxis,
} from '../lib/scroll/roundedScroll'

/** Edge fade overlays — sets `data-scroll-overflow` + scroll-at-start/end on the scroller host. */
export function useScrollEdgeClouds(
  scrollerRef: RefObject<HTMLElement | null>,
  viewportRef: RefObject<HTMLElement | null>,
  axis: RoundedScrollAxis,
  enabled = false,
) {
  useEffect(() => {
    if (!enabled) return undefined

    const scroller = scrollerRef.current
    const viewport = viewportRef.current
    if (!scroller || !viewport) return undefined

    const sync = () => {
      const overflow = viewportHasScrollOverflow(viewport, axis)
      scroller.dataset.scrollOverflow = overflow ? 'true' : 'false'
      syncScrollEdgeState(scroller, viewport, axis)
    }

    const observer = new ResizeObserver(sync)
    observer.observe(scroller)
    observer.observe(viewport)
    viewport.addEventListener('scroll', sync, { passive: true })
    sync()

    return () => {
      observer.disconnect()
      viewport.removeEventListener('scroll', sync)
      delete scroller.dataset.scrollOverflow
      delete scroller.dataset.scrollAtStart
      delete scroller.dataset.scrollAtEnd
    }
  }, [enabled, axis, scrollerRef, viewportRef])
}
