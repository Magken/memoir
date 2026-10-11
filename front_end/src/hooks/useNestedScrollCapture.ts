import { useEffect, type RefObject } from 'react'
import type { RoundedScrollAxis } from '../lib/scroll/roundedScroll'
import { clampWheelDeltaPx } from '../lib/scroll/scrollSpeedCap'

function canScrollViewport(viewport: HTMLElement, delta: number, axis: RoundedScrollAxis): boolean {
  if (axis === 'horizontal') {
    const { scrollLeft, scrollWidth, clientWidth } = viewport
    const max = scrollWidth - clientWidth
    if (max <= 0) return false
    if (delta > 0) return scrollLeft < max - 1
    if (delta < 0) return scrollLeft > 0
    return false
  }

  const { scrollTop, scrollHeight, clientHeight } = viewport
  const max = scrollHeight - clientHeight
  if (max <= 0) return false
  if (delta > 0) return scrollTop < max - 1
  if (delta < 0) return scrollTop > 0
  return false
}

function readScroll(viewport: HTMLElement, axis: RoundedScrollAxis): number {
  return axis === 'horizontal' ? viewport.scrollLeft : viewport.scrollTop
}

function writeScroll(viewport: HTMLElement, value: number, axis: RoundedScrollAxis): void {
  if (axis === 'horizontal') {
    viewport.scrollLeft = value
    return
  }
  viewport.scrollTop = value
}

function clampScroll(viewport: HTMLElement, value: number, axis: RoundedScrollAxis): number {
  if (axis === 'horizontal') {
    const max = Math.max(0, viewport.scrollWidth - viewport.clientWidth)
    return Math.max(0, Math.min(max, value))
  }
  const max = Math.max(0, viewport.scrollHeight - viewport.clientHeight)
  return Math.max(0, Math.min(max, value))
}

function wheelDeltaForAxis(event: WheelEvent, axis: RoundedScrollAxis): number {
  if (axis === 'horizontal') {
    if (event.deltaX !== 0) return event.deltaX
    return event.deltaY
  }
  return event.deltaY
}

/**
 * Nested scroll on card viewports — damped + capped wheel; native touch scroll.
 * Blocks Lenis on wheel. Syncs scroll position on touch/focus so wheel stays aligned.
 * Pass `enabled={false}` when element Lenis owns the viewport (page `ThemeScroll smooth`).
 */
export function useNestedScrollCapture(
  hostRef: RefObject<HTMLElement | null>,
  viewportRef: RefObject<HTMLElement | null>,
  axis: RoundedScrollAxis = 'vertical',
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return undefined

    const host = hostRef.current
    const viewport = viewportRef.current
    if (!host || !viewport) return undefined

    let lastWheelAt = 0

    const applyWheelDelta = (rawDelta: number, event: WheelEvent) => {
      if (rawDelta === 0) return

      // Scene peel underlays own the wheel — do not drive the page viewport.
      const shell = host.closest('.theme-scene-menu-shell')
      if (
        shell?.getAttribute('data-menu-surface') === 'true' ||
        shell?.getAttribute('data-footer-surface') === 'true'
      ) {
        return
      }

      const now = performance.now()
      const dt = lastWheelAt === 0 ? 48 : now - lastWheelAt
      lastWheelAt = now

      const delta = clampWheelDeltaPx(rawDelta, dt)
      if (delta === 0) return
      if (!canScrollViewport(viewport, delta, axis)) return

      event.preventDefault()
      event.stopPropagation()

      const next = clampScroll(viewport, readScroll(viewport, axis) + delta, axis)
      writeScroll(viewport, next, axis)
    }

    const onViewportWheel = (event: WheelEvent) => {
      if (!host.matches(':hover') && !host.matches(':focus-within')) return
      applyWheelDelta(wheelDeltaForAxis(event, axis), event)
    }

    const onWindowWheel = (event: WheelEvent) => {
      if (!host.matches(':focus-within')) return
      if (host.contains(event.target as Node)) return
      // Portaled menus / selects mount outside this host. Do not steal their wheel
      // while the editor remains :focus-within — that blocks dropdown scrolling.
      const target = event.target
      if (target instanceof Element) {
        if (
          target.closest('.theme-menu__panel--portal') ||
          target.closest('.theme-vurify-select__panel') ||
          target.closest('[data-lenis-prevent-wheel]')
        ) {
          return
        }
      }
      applyWheelDelta(wheelDeltaForAxis(event, axis), event)
    }

    viewport.addEventListener('wheel', onViewportWheel, { passive: false })
    window.addEventListener('wheel', onWindowWheel, { passive: false, capture: true })

    return () => {
      viewport.removeEventListener('wheel', onViewportWheel)
      window.removeEventListener('wheel', onWindowWheel, { capture: true })
    }
  }, [hostRef, viewportRef, axis, enabled])
}
