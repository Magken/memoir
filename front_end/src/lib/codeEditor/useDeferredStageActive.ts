import { useEffect, useRef, useState } from 'react'

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Defer `--active` until after paint so CSS enter transitions run.
 * Uses useEffect + rAF (not useLayoutEffect) and a defer token so React Strict
 * Mode's double effect invoke does not snap active on first mount.
 */
export function useDeferredStageActive(active: boolean) {
  const [visible, setVisible] = useState(false)
  const deferTokenRef = useRef(0)

  useEffect(() => {
    if (!active) {
      setVisible(false)
      return
    }

    if (prefersReducedMotion()) {
      setVisible(true)
      return
    }

    const token = ++deferTokenRef.current
    setVisible(false)

    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        if (deferTokenRef.current !== token) return
        setVisible(true)
      })
    })

    return () => {
      deferTokenRef.current += 1
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [active])

  return visible
}
