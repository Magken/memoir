import { getThemeScrollLenis } from './themeScrollLenis'

/**
 * Shared wheel damping + hyperscroll guard for ThemeScroll / Lenis.
 * Keeps GSAP scrub tracks from being skipped by a single fast flick.
 */

/** Scale on raw wheel deltas (lower = slower). */
export const SCROLL_WHEEL_MULTIPLIER = 0.6

/** Max px applied from one wheel event after multiplier. */
export const SCROLL_MAX_DELTA_PX = 56

/** Burst ceiling — ~1600 px/s across rapid-fire wheel/trackpad events. */
export const SCROLL_MAX_PX_PER_MS = 1.6

/**
 * Programmatic menu / footer / CTA scroll.
 * Below the wheel burst ceiling — link nav is a sustained glide, while wheel only
 * hits the burst briefly per event. ~1100 px/s is snappy without matching the burst.
 */
export const SCROLL_LINK_MAX_PX_PER_MS = 1.1

const linkScrollFrames = new WeakMap<HTMLElement, number>()

/**
 * Clamp a raw wheel delta to the app scroll budget.
 * `dtMs` is ms since the previous wheel event on the same host (large after idle).
 */
export function clampWheelDeltaPx(rawDelta: number, dtMs: number): number {
  const sign = Math.sign(rawDelta)
  if (sign === 0) return 0

  let mag = Math.abs(rawDelta) * SCROLL_WHEEL_MULTIPLIER
  mag = Math.min(mag, SCROLL_MAX_DELTA_PX)

  // Idle gaps leave room for a full step; rapid bursts hit the rate ceiling.
  const rateBudget = Math.max(
    SCROLL_MAX_DELTA_PX * 0.2,
    SCROLL_MAX_PX_PER_MS * Math.min(Math.max(dtMs, 0), 48),
  )
  mag = Math.min(mag, rateBudget)

  return sign * mag
}

/** Scroll offset of `target` inside `scroller` (viewport), not offsetParent. */
export function scrollTopForElement(scroller: HTMLElement, target: HTMLElement): number {
  const scrollerBox = scroller.getBoundingClientRect()
  const targetBox = target.getBoundingClientRect()
  return Math.max(0, scroller.scrollTop + (targetBox.top - scrollerBox.top))
}

export type AnimateScrollTopOptions = {
  /** Skip animation (reduced motion / instant). */
  immediate?: boolean
  /** Override speed ceiling (px/ms). Defaults to `SCROLL_LINK_MAX_PX_PER_MS`. */
  maxPxPerMs?: number
  onComplete?: () => void
}

/**
 * Animate `scroller.scrollTop` to `top` at a capped px/ms rate.
 * Uses element Lenis when the viewport is a smooth ThemeScroll page shell.
 * Cancels any prior capped scroll on the same element. Returns a cancel fn.
 * Forces `scroll-behavior: auto` for the glide so CSS smooth cannot race it.
 */
export function animateScrollTop(
  scroller: HTMLElement,
  top: number,
  options: AnimateScrollTopOptions = {},
): () => void {
  const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight)
  const target = Math.max(0, Math.min(top, maxScroll))

  const prior = linkScrollFrames.get(scroller)
  if (prior != null) cancelAnimationFrame(prior)
  linkScrollFrames.delete(scroller)

  const reduceMotion =
    options.immediate === true ||
    (typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  const lenis = getThemeScrollLenis(scroller)
  if (lenis) {
    if (reduceMotion || Math.abs(target - lenis.scroll) < 0.5) {
      lenis.scrollTo(target, { immediate: true })
      options.onComplete?.()
      return () => {}
    }
    const speed = options.maxPxPerMs ?? SCROLL_LINK_MAX_PX_PER_MS
    const distance = Math.abs(target - lenis.scroll)
    const duration = Math.min(2.4, Math.max(0.35, distance / (speed * 1000)))
    let cancelled = false
    lenis.scrollTo(target, {
      duration,
      onComplete: () => {
        if (!cancelled) options.onComplete?.()
      },
    })
    return () => {
      cancelled = true
      lenis.scrollTo(lenis.scroll, { immediate: true })
    }
  }

  if (reduceMotion || Math.abs(target - scroller.scrollTop) < 0.5) {
    scroller.scrollTop = target
    options.onComplete?.()
    return () => {}
  }

  const speed = options.maxPxPerMs ?? SCROLL_LINK_MAX_PX_PER_MS
  const prevBehavior = scroller.style.scrollBehavior
  scroller.style.scrollBehavior = 'auto'

  let last = performance.now()
  let raf = 0
  let cancelled = false

  const finish = (completed: boolean) => {
    scroller.style.scrollBehavior = prevBehavior
    linkScrollFrames.delete(scroller)
    if (completed) options.onComplete?.()
  }

  const tick = (now: number) => {
    if (cancelled) return
    const dt = Math.min(32, Math.max(0, now - last))
    last = now
    const current = scroller.scrollTop
    const remaining = target - current
    if (Math.abs(remaining) < 0.5) {
      scroller.scrollTop = target
      finish(true)
      return
    }
    const step = Math.sign(remaining) * Math.min(Math.abs(remaining), speed * dt)
    scroller.scrollTop = current + step
    raf = requestAnimationFrame(tick)
    linkScrollFrames.set(scroller, raf)
  }

  raf = requestAnimationFrame(tick)
  linkScrollFrames.set(scroller, raf)

  return () => {
    cancelled = true
    cancelAnimationFrame(raf)
    finish(false)
  }
}
