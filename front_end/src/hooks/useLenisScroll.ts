import Lenis, { type LenisOptions } from 'lenis'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { clampWheelDeltaPx } from '../lib/scroll/scrollSpeedCap'
import {
  registerThemeScrollLenis,
  unregisterThemeScrollLenis,
} from '../lib/scroll/themeScrollLenis'

/** Default glide — slower wheel + hyperscroll cap via virtualScroll. */
export const LENIS_SCROLL_DEFAULTS: LenisOptions = {
  autoRaf: true,
  lerp: 0.08,
  smoothWheel: true,
  // Multiplier applied in virtualScroll (clampWheelDeltaPx) — keep Lenis at 1×.
  wheelMultiplier: 1,
  touchMultiplier: 0.85,
  syncTouch: true,
  syncTouchLerp: 0.075,
}

export type UseLenisScrollResult = {
  lenisRef: RefObject<Lenis | null>
  lenis: Lenis | null
}

function attachVirtualScrollCap(
  options: LenisOptions,
): NonNullable<LenisOptions['virtualScroll']> {
  let lastWheelAt = 0
  return (data) => {
    const user = options.virtualScroll?.(data)
    if (user === false) return false

    const event = data.event
    const isWheel = typeof WheelEvent !== 'undefined' && event instanceof WheelEvent
    if (!isWheel) return true

    const now = performance.now()
    const dt = lastWheelAt === 0 ? 48 : now - lastWheelAt
    lastWheelAt = now

    data.deltaY = clampWheelDeltaPx(data.deltaY, dt)
    data.deltaX = clampWheelDeltaPx(data.deltaX, dt)
    return true
  }
}

/**
 * Lenis smooth scroll on the window. No-ops when prefers-reduced-motion.
 */
export function useLenisScroll(options: LenisOptions = {}): UseLenisScrollResult {
  const lenisRef = useRef<Lenis | null>(null)
  const [lenis, setLenis] = useState<Lenis | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) {
      setLenis(null)
      return undefined
    }

    const instance = new Lenis({
      ...LENIS_SCROLL_DEFAULTS,
      ...options,
      // Damping + max speed live in virtualScroll — do not double-scale.
      wheelMultiplier: 1,
      virtualScroll: attachVirtualScrollCap(options),
    })
    lenisRef.current = instance
    setLenis(instance)

    return () => {
      instance.destroy()
      lenisRef.current = null
      setLenis(null)
    }
    // Lenis instance is created once per mount; pass stable options from provider.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only init
  }, [])

  return { lenisRef, lenis }
}

/**
 * Lenis on a ThemeScroll viewport (page shells). Same feel as window Lenis.
 * Registers on the viewport for `animateScrollTop` / freeze helpers.
 */
export function useLenisElementScroll(
  wrapper: HTMLElement | null,
  content: HTMLElement | null,
  enabled: boolean,
): Lenis | null {
  const [lenis, setLenis] = useState<Lenis | null>(null)

  useEffect(() => {
    if (!enabled || !wrapper || !content) {
      setLenis(null)
      return undefined
    }
    if (typeof window === 'undefined') return undefined

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) {
      setLenis(null)
      return undefined
    }

    const instance = new Lenis({
      ...LENIS_SCROLL_DEFAULTS,
      wrapper,
      content,
      eventsTarget: wrapper,
      wheelMultiplier: 1,
      virtualScroll: attachVirtualScrollCap({}),
    })
    // Remount after a peel must inherit the pinned native offset (not internal 0).
    instance.scrollTo(wrapper.scrollTop, { immediate: true })
    registerThemeScrollLenis(wrapper, instance)
    setLenis(instance)

    return () => {
      unregisterThemeScrollLenis(wrapper)
      instance.destroy()
      setLenis(null)
    }
  }, [wrapper, content, enabled])

  return lenis
}

export function lenisScrollTo(
  lenisRef: RefObject<Lenis | null>,
  target: number | string | HTMLElement = 0,
  scrollOptions?: Parameters<Lenis['scrollTo']>[1],
  scrollToDuration = 1.2,
) {
  const lenis = lenisRef.current
  if (lenis) {
    lenis.scrollTo(target, { duration: scrollToDuration, ...scrollOptions })
    return
  }
  if (typeof target === 'number') {
    window.scrollTo({ top: target, behavior: 'smooth' })
  }
}

/** Re-export for callers that want the same feel as nested ThemeScroll. */
export { SCROLL_WHEEL_MULTIPLIER } from '../lib/scroll/scrollSpeedCap'
export {
  getThemeScrollLenis,
  readThemeScrollTop,
  writeThemeScrollTop,
  freezeThemeScroll,
  registerThemeScrollLenis,
  unregisterThemeScrollLenis,
} from '../lib/scroll/themeScrollLenis'
