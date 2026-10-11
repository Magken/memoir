import { useLayoutEffect, type RefObject } from 'react'

const SEGMENT_SELECTOR = '.theme-btn-group__segment'

/** Sync sliding pill to the active segment's box (content-sized columns). */
export function useContentChoiceIndicator(
  trackRef: RefObject<HTMLElement | null>,
  activeIndex: number,
  enabled: boolean,
) {
  useLayoutEffect(() => {
    if (!enabled) return

    const track = trackRef.current
    if (!track) return

    const sync = () => {
      const segments = track.querySelectorAll<HTMLElement>(SEGMENT_SELECTOR)
      const active =
        segments.item(activeIndex) ??
        track.querySelector<HTMLElement>(
          `${SEGMENT_SELECTOR}.is-active, ${SEGMENT_SELECTOR}[aria-pressed='true'], ${SEGMENT_SELECTOR}[aria-checked='true']`,
        )

      if (!active) return

      const trackRect = track.getBoundingClientRect()
      const activeRect = active.getBoundingClientRect()
      const left = activeRect.left - trackRect.left
      const width = activeRect.width

      track.style.setProperty('--choice-indicator-left', `${left}px`)
      track.style.setProperty('--choice-indicator-width', `${width}px`)
    }

    sync()

    const ro = new ResizeObserver(sync)
    ro.observe(track)
    track.querySelectorAll<HTMLElement>(SEGMENT_SELECTOR).forEach((segment) => ro.observe(segment))

    window.addEventListener('resize', sync)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', sync)
    }
  }, [trackRef, activeIndex, enabled])
}
