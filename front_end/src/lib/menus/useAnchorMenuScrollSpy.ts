import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { getElementScrollOffset, resolveAnchorElement } from './anchorScroll'

function useScrollRootElement(scrollRootRef?: RefObject<HTMLElement | null>) {
  const [scrollRoot, setScrollRoot] = useState<HTMLElement | null>(() => scrollRootRef?.current ?? null)

  useLayoutEffect(() => {
    const next = scrollRootRef?.current ?? null
    setScrollRoot((previous) => (previous === next ? previous : next))

    if (next || !scrollRootRef) return undefined

    let frame = 0
    let attempts = 0
    const retry = () => {
      attempts += 1
      const resolved = scrollRootRef.current
      if (resolved) {
        setScrollRoot((previous) => (previous === resolved ? previous : resolved))
        return
      }
      if (attempts < 12) frame = requestAnimationFrame(retry)
    }
    frame = requestAnimationFrame(retry)

    return () => cancelAnimationFrame(frame)
  }, [scrollRootRef])

  return scrollRoot
}

export function useAnchorMenuScrollSpy(
  targetIds: readonly string[],
  options?: {
    enabled?: boolean
    scrollRootRef?: RefObject<HTMLElement | null>
  },
) {
  const enabled = options?.enabled ?? true
  const scrollRootRef = options?.scrollRootRef
  const scrollRoot = useScrollRootElement(scrollRootRef)
  const targetKey = targetIds.join('\0')
  const targetIdsRef = useRef(targetIds)
  targetIdsRef.current = targetIds
  const [activeId, setActiveId] = useState<string | null>(targetIds[0] ?? null)

  useEffect(() => {
    const ids = targetIdsRef.current

    if (!enabled || ids.length === 0) {
      setActiveId(null)
      return undefined
    }

    const root = scrollRoot

    const pickActive = () => {
      const scrollPos = root ? root.scrollTop : window.scrollY
      const viewH = root ? root.clientHeight : window.innerHeight
      const maxScroll = Math.max(
        0,
        root
          ? root.scrollHeight - root.clientHeight
          : document.documentElement.scrollHeight - window.innerHeight,
      )

      const sortedIds = [...ids].sort((a, b) => {
        const elA = resolveAnchorElement(a, root)
        const elB = resolveAnchorElement(b, root)
        if (!elA || !elB) return 0
        return getElementScrollOffset(elA, root) - getElementScrollOffset(elB, root)
      })

      // Pin extremes without fake article padding — hit first/last TOC when scrolled to ends
      if (sortedIds.length > 0 && scrollPos <= 4) {
        setActiveId((previous) => (previous === sortedIds[0] ? previous : sortedIds[0]!))
        return
      }
      if (sortedIds.length > 0 && maxScroll > 0 && scrollPos >= maxScroll - 4) {
        const last = sortedIds[sortedIds.length - 1]!
        setActiveId((previous) => (previous === last ? previous : last))
        return
      }

      const activationLine = scrollPos + viewH * 0.22
      let current = sortedIds[0] ?? null

      for (const id of sortedIds) {
        const element = resolveAnchorElement(id, root)
        if (!element) continue
        const top = getElementScrollOffset(element, root)
        if (top <= activationLine) {
          current = id
        }
      }

      setActiveId((previous) => (previous === current ? previous : current))
    }

    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(pickActive)
    }

    const scrollTarget = root ?? window
    scrollTarget.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    pickActive()

    return () => {
      cancelAnimationFrame(frame)
      scrollTarget.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [enabled, targetKey, scrollRoot])

  return activeId
}
