import { useCallback, useEffect, useRef, type RefObject } from 'react'
import type { GlowStepDotNavItem } from '../lib/menus/glowStepDotNav'
import {
  GLOW_STEP_SCROLL_FOCUS_DEFAULT_OFFSET,
  glowStepScrollFocusPickActiveId,
  glowStepScrollFocusSections,
} from '../lib/scroll/glowStepScrollFocus'

type UseGlowStepScrollFocusOptions = {
  enabled: boolean
  items: readonly GlowStepDotNavItem[]
  selectedId: string
  onActiveId: (id: string) => void
  panelRefs: RefObject<Map<string, HTMLElement>>
  scrollContainerRef?: RefObject<HTMLElement | null>
  offset?: number
  panelRegistryVersion?: number
}

export function useGlowStepScrollFocus({
  enabled,
  items,
  selectedId,
  onActiveId,
  panelRefs,
  scrollContainerRef,
  offset = GLOW_STEP_SCROLL_FOCUS_DEFAULT_OFFSET,
  panelRegistryVersion = 0,
}: UseGlowStepScrollFocusOptions) {
  const scrollLockRef = useRef(false)
  const scrollLockTimerRef = useRef<number | undefined>(undefined)
  const selectedIdRef = useRef(selectedId)

  selectedIdRef.current = selectedId

  const releaseScrollLock = useCallback(() => {
    scrollLockRef.current = false
  }, [])

  const evaluateActiveSection = useCallback(() => {
    if (scrollLockRef.current) return

    const sections = glowStepScrollFocusSections(items, panelRefs.current ?? new Map())
    if (sections.length === 0) return

    const nextId = glowStepScrollFocusPickActiveId(
      sections,
      offset,
      scrollContainerRef?.current ?? null,
    )

    if (nextId && nextId !== selectedIdRef.current) {
      onActiveId(nextId)
    }
  }, [items, offset, onActiveId, panelRefs, scrollContainerRef])

  const scrollToSection = useCallback(
    (id: string) => {
      const el = panelRefs.current?.get(id)
      if (!el) return

      scrollLockRef.current = true
      window.clearTimeout(scrollLockTimerRef.current)
      onActiveId(id)

      const scrollRoot = scrollContainerRef?.current
      if (scrollRoot) {
        const rootRect = scrollRoot.getBoundingClientRect()
        const elRect = el.getBoundingClientRect()
        const top = scrollRoot.scrollTop + (elRect.top - rootRect.top) - offset
        scrollRoot.scrollTo({ top, behavior: 'smooth' })
      } else {
        const top = window.scrollY + el.getBoundingClientRect().top - offset
        window.scrollTo({ top, behavior: 'smooth' })
      }

      scrollLockTimerRef.current = window.setTimeout(releaseScrollLock, 900)
    },
    [offset, onActiveId, panelRefs, releaseScrollLock, scrollContainerRef],
  )

  useEffect(() => {
    if (!enabled) return undefined

    const sections = glowStepScrollFocusSections(items, panelRefs.current ?? new Map())
    if (sections.length === 0) return undefined

    const scrollRoot = scrollContainerRef?.current ?? null
    const viewportHeight = scrollRoot?.clientHeight ?? window.innerHeight
    const bottomMargin = Math.max(0, Math.round(viewportHeight - offset - 1))

    const observer = new IntersectionObserver(() => evaluateActiveSection(), {
      root: scrollRoot,
      rootMargin: `-${offset}px 0px -${bottomMargin}px 0px`,
      threshold: [0, 0.05, 0.15, 0.35, 0.5, 0.75, 1],
    })

    sections.forEach(({ element }) => observer.observe(element))
    evaluateActiveSection()

    const scrollTarget: HTMLElement | Window = scrollRoot ?? window
    scrollTarget.addEventListener('scroll', evaluateActiveSection, { passive: true })
    window.addEventListener('resize', evaluateActiveSection)

    return () => {
      observer.disconnect()
      scrollTarget.removeEventListener('scroll', evaluateActiveSection)
      window.removeEventListener('resize', evaluateActiveSection)
      window.clearTimeout(scrollLockTimerRef.current)
    }
  }, [enabled, evaluateActiveSection, items, offset, panelRefs, panelRegistryVersion, scrollContainerRef])

  return { scrollToSection }
}
