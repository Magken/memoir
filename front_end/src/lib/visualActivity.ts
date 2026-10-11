export type R3fFrameloop = 'always' | 'demand' | 'never'

export type VisualActivityInput = {
  /** Parent still wants the loop (page live, peel open, not parked). */
  enabled: boolean
  /** Element intersects the viewport. */
  intersecting: boolean
  /** Tab / document is visible. */
  documentVisible: boolean
  /** Not `display:none` / `visibility:hidden` / opacity 0 / zero box. */
  painted?: boolean
}

export type MotionLoopInput = {
  visuallyActive: boolean
  spinning: boolean
  tweening: boolean
  dragging: boolean
}

export type ComputedPaintStyle = {
  display: string
  visibility: string
  opacity: string
}

export type ElementBox = {
  width: number
  height: number
}

/** True when a loop should keep spending frames. */
export function visualActivityShouldRun({
  enabled,
  intersecting,
  documentVisible,
  painted = true,
}: VisualActivityInput): boolean {
  return enabled && intersecting && documentVisible && painted
}

/** Last frame stays on screen — no rAF while idle or off-stage. */
export function motionLoopShouldRun({
  visuallyActive,
  spinning,
  tweening,
  dragging,
}: MotionLoopInput): boolean {
  if (!visuallyActive) return false
  return spinning || tweening || dragging
}

/** Parked / off-screen / hidden tab → `never`. Visible but idle → `demand`. */
export function resolveR3fFrameloop(
  requested: R3fFrameloop,
  shouldRun: boolean,
  needsFrames = true,
): R3fFrameloop {
  if (requested === 'never' || !shouldRun) return 'never'
  if (requested === 'demand' || !needsFrames) return 'demand'
  return requested
}

/** Dual-GPU hint — same picture, prefer the discrete GPU when Chrome can. */
export const WEBGL_POWER_PREFERENCE = 'high-performance' as const

/** Browser viewport when `root` is omitted; ThemeScroll passes the scene scroller. */
export function visualActivityObserverInit(
  root?: Element | null,
): IntersectionObserverInit {
  const init: IntersectionObserverInit = { threshold: 0 }
  if (root) init.root = root
  return init
}

/** One viewport of lookahead so the next Home scene mounts before it is on screen. */
export const DEFERRED_SCENE_ROOT_MARGIN = '100% 0px'
/** Scene 04b extras — two viewports so the bent card can compile before arrival. */
export const DEFERRED_EXTRAS_SCENE_ROOT_MARGIN = '200% 0px'
/** Off-screen Home WebGL compiles once, then `frameloop` follows visual activity. */
export const HOME_WEBGL_WARM_MS = 1600

export function deferredSceneObserverInit(
  root?: Element | null,
  rootMargin: string = DEFERRED_SCENE_ROOT_MARGIN,
): IntersectionObserverInit {
  const init: IntersectionObserverInit = {
    threshold: 0,
    rootMargin,
  }
  if (root) init.root = root
  return init
}

export function elementLooksPainted(style: ComputedPaintStyle, box: ElementBox): boolean {
  if (style.display === 'none' || style.visibility === 'hidden') return false
  const opacity = Number.parseFloat(style.opacity)
  if (Number.isFinite(opacity) && opacity <= 0) return false
  return box.width > 0 && box.height > 0
}

export const THEME_SCROLL_VIEWPORT_SELECTOR = '.theme-scroll__viewport'

/** Nested ThemeScroll (Home stage, Theme lab cards) — else the observer uses the window. */
export function nearestThemeScrollRoot(el: Element | null | undefined): Element | null {
  if (!el || typeof el.closest !== 'function') return null
  return el.closest(THEME_SCROLL_VIEWPORT_SELECTOR)
}
