import { useEffect, useRef, type RefObject } from 'react'
import {
  ROUNDED_SCROLL_DEFAULTS,
  roundedScrollOffsetAt,
  syncRoundedScrollBar,
  readRoundedScrollProgress,
  syncScrollEdgeState,
  type RoundedScrollAxis,
  type RoundedScrollConfig,
  type RoundedScrollKeyframe,
} from '../lib/scroll/roundedScroll'

type UseRoundedScrollBarOptions = {
  enabled?: boolean
  axis?: RoundedScrollAxis
  config?: Partial<RoundedScrollConfig>
}

function scrollProgress(viewport: HTMLElement, axis: RoundedScrollAxis): number {
  return readRoundedScrollProgress(viewport, axis)
}

function scrollContentEl(viewport: HTMLElement, axis: RoundedScrollAxis): HTMLElement | null {
  if (axis === 'horizontal') {
    const wrap = viewport.querySelector('.theme-rounded-scroll__content')
    if (wrap instanceof HTMLElement) return wrap
  }
  const first = viewport.firstElementChild
  return first instanceof HTMLElement ? first : null
}

function applyThumbOffset(
  thumb: SVGPathElement,
  viewport: HTMLElement,
  axis: RoundedScrollAxis,
  keyframes: RoundedScrollKeyframe[],
): void {
  thumb.style.strokeDashoffset = String(
    roundedScrollOffsetAt(scrollProgress(viewport, axis), keyframes),
  )
}

export function useRoundedScrollBar(
  scrollerRef: RefObject<HTMLElement | null>,
  viewportRef: RefObject<HTMLElement | null>,
  barRef: RefObject<SVGSVGElement | null>,
  thumbRef: RefObject<SVGPathElement | null>,
  trackRef: RefObject<SVGPathElement | null>,
  { enabled = true, axis = 'vertical', config: configOverrides }: UseRoundedScrollBarOptions = {},
) {
  const keyframesRef = useRef<RoundedScrollKeyframe[]>([])

  useEffect(() => {
    if (!enabled) return undefined

    const scroller = scrollerRef.current
    const viewport = viewportRef.current
    const bar = barRef.current
    const thumb = thumbRef.current
    const track = trackRef.current

    if (!scroller || !viewport || !bar || !thumb || !track) return undefined

    scroller.dataset.roundedScrollOverflow = 'false'
    scroller.dataset.scrollOverflow = 'false'
    scroller.dataset.scrollAtStart = 'true'
    scroller.dataset.scrollAtEnd = 'true'

    const config: RoundedScrollConfig = { ...ROUNDED_SCROLL_DEFAULTS, ...configOverrides }
    let syncRaf = 0
    let observedContent: HTMLElement | null = null

    const sync = () => {
      bindContentObservation()
      const result = syncRoundedScrollBar({
        scrollerEl: scroller,
        viewportEl: viewport,
        barEl: bar,
        thumbEl: thumb,
        trackEl: track,
        config,
        axis,
      })
      syncScrollEdgeState(scroller, viewport, axis)
      keyframesRef.current = result.keyframes
      applyThumbOffset(thumb, viewport, axis, result.keyframes)
    }

    const scheduleSync = () => {
      if (syncRaf !== 0) return
      syncRaf = window.requestAnimationFrame(() => {
        syncRaf = 0
        sync()
      })
    }

    const observer = new ResizeObserver(scheduleSync)
    const mutationObserver = new MutationObserver(scheduleSync)

    const bindContentObservation = () => {
      const content = scrollContentEl(viewport, axis)
      if (content === observedContent) return
      if (observedContent) {
        observer.unobserve(observedContent)
        mutationObserver.disconnect()
      }
      observedContent = content
      if (observedContent) {
        observer.observe(observedContent)
        mutationObserver.observe(observedContent, {
          childList: true,
          subtree: true,
          characterData: true,
        })
      }
    }

    const onScroll = () => {
      syncScrollEdgeState(scroller, viewport, axis)
      applyThumbOffset(thumb, viewport, axis, keyframesRef.current)
    }

    observer.observe(scroller)
    observer.observe(viewport)
    bindContentObservation()

    viewport.addEventListener('scroll', onScroll, { passive: true })
    sync()

    return () => {
      if (syncRaf !== 0) window.cancelAnimationFrame(syncRaf)
      observer.disconnect()
      mutationObserver.disconnect()
      viewport.removeEventListener('scroll', onScroll)
      thumb.style.strokeDashoffset = ''
      delete scroller.dataset.roundedScrollOverflow
      delete scroller.dataset.scrollOverflow
      delete scroller.dataset.scrollAtStart
      delete scroller.dataset.scrollAtEnd
    }
  }, [enabled, axis, configOverrides, scrollerRef, viewportRef, barRef, thumbRef, trackRef])
}
