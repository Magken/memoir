import { useEffect, useState } from 'react'

/** Match `.theme-interview-flow-section__fold--preview` grid-template-rows duration. */
export const INTERVIEW_FLOW_PREVIEW_FOLD_MS = 320

/**
 * Keep fold content mounted through the CSS 0fr↔1fr transition, then unmount when closed.
 * Opening: mount → double rAF → `shown` (applies `is-open`). Closing: clear `shown` → delay → unmount.
 */
export function useAnimatedFoldMount(
  open: boolean,
  durationMs = INTERVIEW_FLOW_PREVIEW_FOLD_MS,
): { mounted: boolean; shown: boolean } {
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(open)

  useEffect(() => {
    if (open) {
      setMounted(true)
      let inner = 0
      const outer = window.requestAnimationFrame(() => {
        inner = window.requestAnimationFrame(() => setShown(true))
      })
      return () => {
        window.cancelAnimationFrame(outer)
        window.cancelAnimationFrame(inner)
      }
    }

    setShown(false)
    const t = window.setTimeout(() => setMounted(false), durationMs)
    return () => window.clearTimeout(t)
  }, [open, durationMs])

  return { mounted, shown }
}
