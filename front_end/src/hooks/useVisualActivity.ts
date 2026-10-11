import { useEffect, useState, type RefObject } from 'react'
import {
  elementLooksPainted,
  nearestThemeScrollRoot,
  visualActivityObserverInit,
  visualActivityShouldRun,
} from '../lib/visualActivity'

type UseVisualActivityOptions = {
  /** Parent still wants the loop (page live, peel open). Default true. */
  enabled?: boolean
  /** Re-bind observer when the host mounts (R3F canvasReady). */
  observeKey?: unknown
  /** ThemeScroll viewport; omit to use `nearestThemeScrollRoot` then the window. */
  rootRef?: RefObject<Element | null>
  /**
   * Opacity / visibility:hidden. Default true. Accordion visuals skip this —
   * GSAP `autoAlpha: 0` enter would otherwise latch `data-in-view="false"`.
   */
  checkPainted?: boolean
}

/**
 * True while the element is on-screen, painted, the tab is visible, and `enabled`.
 * Off-stage peels that still fill the viewport should pass `enabled={false}`.
 */
export function useVisualActivity(
  ref: RefObject<Element | null>,
  options: UseVisualActivityOptions = {},
): boolean {
  const { enabled = true, observeKey, rootRef, checkPainted = true } = options
  const [active, setActive] = useState(enabled)

  useEffect(() => {
    if (!enabled) {
      setActive(false)
      return
    }

    const documentVisible = () =>
      typeof document === 'undefined' || document.visibilityState !== 'hidden'

    if (typeof IntersectionObserver === 'undefined') {
      setActive(documentVisible())
      return
    }

    let cancelled = false
    let intersecting = true
    let observer: IntersectionObserver | null = null
    let frame = 0
    let el: Element | null = null

    const paint = () => {
      if (!el) return
      const style = getComputedStyle(el)
      const box = el.getBoundingClientRect()
      setActive(
        visualActivityShouldRun({
          enabled: true,
          intersecting,
          documentVisible: documentVisible(),
          painted: checkPainted
            ? elementLooksPainted(
                {
                  display: style.display,
                  visibility: style.visibility,
                  opacity: style.opacity,
                },
                { width: box.width, height: box.height },
              )
            : true,
        }),
      )
    }

    const bind = () => {
      if (cancelled) return
      el = ref.current
      if (!el) {
        frame = requestAnimationFrame(bind)
        return
      }
      if (rootRef && !rootRef.current) {
        frame = requestAnimationFrame(bind)
        return
      }

      observer = new IntersectionObserver((entries) => {
        intersecting = entries.some((entry) => entry.isIntersecting)
        paint()
      }, visualActivityObserverInit(rootRef?.current ?? nearestThemeScrollRoot(el)))
      observer.observe(el)
      document.addEventListener('visibilitychange', paint)
      paint()
    }

    bind()

    return () => {
      cancelled = true
      if (frame) cancelAnimationFrame(frame)
      observer?.disconnect()
      document.removeEventListener('visibilitychange', paint)
    }
  }, [checkPainted, enabled, observeKey, ref, rootRef])

  return active
}
