import { useEffect, useState, type RefObject } from 'react'
import { deferredSceneObserverInit } from '../lib/visualActivity'

/**
 * Mount a below-fold Home scene when `eager`, or when it is within one scroller viewport.
 * Stays mounted after the first reveal so ScrollTrigger / ids stay stable.
 */
export function useDeferredSceneMount(
  hostRef: RefObject<Element | null>,
  rootRef: RefObject<Element | null>,
  rootMargin?: string,
  eager = false,
): boolean {
  const [mounted, setMounted] = useState(eager)

  useEffect(() => {
    if (eager) {
      setMounted(true)
      return
    }
    if (mounted) return

    if (typeof IntersectionObserver === 'undefined') {
      setMounted(true)
      return
    }

    let cancelled = false
    let observer: IntersectionObserver | null = null
    let frame = 0

    const bind = () => {
      if (cancelled) return
      const el = hostRef.current
      const root = rootRef.current
      if (!el || !root) {
        frame = requestAnimationFrame(bind)
        return
      }

      observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        setMounted(true)
        observer?.disconnect()
      }, deferredSceneObserverInit(root, rootMargin))
      observer.observe(el)
    }

    bind()

    return () => {
      cancelled = true
      if (frame) cancelAnimationFrame(frame)
      observer?.disconnect()
    }
  }, [eager, hostRef, mounted, rootMargin, rootRef])

  return mounted
}
