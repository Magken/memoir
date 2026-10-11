/** Horizontal cylinder bend — the card face is the curved TV panel, not a set in a room. */

export const CURVED_MONITOR_HEIGHT = 1.72
export const CURVED_MONITOR_ASPECT = 16 / 9
/** Sagitta / width when `curve` is 1. */
export const CURVED_MONITOR_CURVE_MAX = 0.22
/** Rest bowl (`curve` 0–1). Hover flexes to `CURVED_MONITOR_CURVE_HOVER`. */
export const CURVED_MONITOR_CURVE_DEFAULT = 0.7
/** Hover / expanded bowl. */
export const CURVED_MONITOR_CURVE_HOVER = 1
export const CURVED_MONITOR_SAGITTA_RATIO =
  CURVED_MONITOR_CURVE_MAX * CURVED_MONITOR_CURVE_DEFAULT
/** Home offer leave (~accordion 0.72s in). */
export const CURVED_MONITOR_CHROME_OUT_MS = 360
export const CURVED_MONITOR_CHROME_IN_MS = 720
/** On-screen still swap — opacity only, the bowl does not move. */
export const CURVED_MONITOR_MEDIA_FADE_MS = 450
export const CURVED_MONITOR_FOV = 28
/**
 * Extra frustum over the mesh height. `1` + sagitta already keeps hover edges
 * in frame; values near `1.22` left a letterbox so side tags sat far from the
 * painted screen.
 */
export const CURVED_MONITOR_CAMERA_FIT = 1.1
export const CURVED_MONITOR_WIDTH_SEGS = 48
export const CURVED_MONITOR_HEIGHT_SEGS = 12
export const CURVED_MONITOR_THICKNESS = 0.034
/** ~`theme-card--corner-soft` (1rem squircle), not a long circular stadium. */
export const CURVED_MONITOR_CORNER_RATIO = 0.05
/** Superellipse exponent — 2 is a circular fillet, 4 is Vurify `corner-shape: squircle`. */
export const CURVED_MONITOR_CORNER_N = 4
export const CURVED_MONITOR_FLEX_STIFFNESS = 3.1
export const CURVED_MONITOR_CONCAVE = -1
export const CURVED_MONITOR_CONVEX = 1
export const CURVED_MONITOR_MEDIA_INTERVAL_MS = 4200
/** Hover (no tag under the pointer) steps through edge tags. */
export const CURVED_MONITOR_FEATURE_CYCLE_MS = 3000

export type CurvedMonitorLayout = {
  width: number
  height: number
  aspect: number
  curve: number
  sagitta: number
  radius: number
  thickness: number
  corner: number
  widthSegs: number
  heightSegs: number
  fov: number
  cameraZ: number
}

export type CurvedMonitorTilt = {
  x: number
  y: number
  hover: boolean
}

export const CURVED_MONITOR_TILT_REST: CurvedMonitorTilt = { x: 0, y: 0, hover: false }

export function clampCurveDegree(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

/** Rest curve, or max bowl while the card is hovered / pinned. */
export function hoverCurveDegree(rest: number, expanded: boolean): number {
  const base = clampCurveDegree(rest)
  return expanded ? CURVED_MONITOR_CURVE_HOVER : base
}

/** Signed: -1 concave (TV), +1 convex (barrel). Magnitude is ignored — use `curve` for amount. */
export function clampCurvature(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(-1, value))
}

export function curvatureFromBowl(bowl: 'concave' | 'convex'): number {
  return bowl === 'convex' ? CURVED_MONITOR_CONVEX : CURVED_MONITOR_CONCAVE
}

/** Edge-forward dish: center at z=0, |x| larger → z closer to a +Z camera. */
export function curvedCardZ(x: number, radius: number): number {
  const r = Math.max(1e-4, radius)
  const clamped = Math.min(Math.abs(x), r - 1e-4)
  return r - Math.sqrt(r * r - clamped * clamped)
}

/**
 * Apply signed curvature to the dish.
 * Negative curvature = concave (edges toward camera). Positive = convex (center toward camera).
 */
export function bentCardZAt(x: number, radius: number, curvature: number, sagitta: number): number {
  if (sagitta < 1e-5) return 0
  const bowl = clampCurvature(curvature)
  if (bowl === 0) return 0
  return -bowl * curvedCardZ(x, radius)
}

export function flexToward(
  current: number,
  target: number,
  dt: number,
  stiffness = CURVED_MONITOR_FLEX_STIFFNESS,
  snap = false,
): number {
  if (snap) return target
  const step = 1 - Math.exp(-stiffness * Math.max(0, dt))
  return current + (target - current) * step
}

export function flexCurvature(
  current: number,
  target: number,
  dt: number,
  stiffness = CURVED_MONITOR_FLEX_STIFFNESS,
  snap = false,
): number {
  return flexToward(clampCurvature(current), clampCurvature(target), dt, stiffness, snap)
}

/** Signed distance to a Vurify-soft card outline (short squircle corners, not a long circular fillet). */
export function roundedRectSDF(
  x: number,
  y: number,
  halfW: number,
  halfH: number,
  radius: number,
  n = CURVED_MONITOR_CORNER_N,
): number {
  const r = Math.min(Math.max(0, radius), halfW, halfH)
  const qx = Math.abs(x) - (halfW - r)
  const qy = Math.abs(y) - (halfH - r)
  const ox = Math.max(qx, 0)
  const oy = Math.max(qy, 0)
  const p = Math.max(2, n)
  const d = (ox ** p + oy ** p) ** (1 / p)
  return d + Math.min(Math.max(qx, qy), 0) - r
}

export function curvedMonitorLayout(
  height = CURVED_MONITOR_HEIGHT,
  aspect = CURVED_MONITOR_ASPECT,
  curve = CURVED_MONITOR_CURVE_DEFAULT,
): CurvedMonitorLayout {
  const h = Math.max(0.4, height)
  const a = Math.max(1, aspect)
  const width = h * a
  const degree = clampCurveDegree(curve)
  const sagitta = width * CURVED_MONITOR_CURVE_MAX * degree
  const half = width / 2
  const radius =
    sagitta < 1e-5 ? 1e6 : (half * half + sagitta * sagitta) / (2 * sagitta)
  const fovRad = (CURVED_MONITOR_FOV * Math.PI) / 180
  const fit = h / 2 / Math.tan(fovRad / 2)
  const corner = Math.min(width, h) * CURVED_MONITOR_CORNER_RATIO
  return {
    width,
    height: h,
    aspect: a,
    curve: degree,
    sagitta,
    radius,
    thickness: CURVED_MONITOR_THICKNESS,
    corner,
    widthSegs: CURVED_MONITOR_WIDTH_SEGS,
    heightSegs: CURVED_MONITOR_HEIGHT_SEGS,
    fov: CURVED_MONITOR_FOV,
    cameraZ: fit * CURVED_MONITOR_CAMERA_FIT + sagitta,
  }
}

/** Caption for a known tag id — unknown ids fall back to the first feature. */
export function focusedFeature<T extends { id: string }>(
  features: readonly T[],
  focusId: string | null,
): T | undefined {
  if (!features.length) return undefined
  if (focusId) {
    const hit = features.find((item) => item.id === focusId)
    if (hit) return hit
  }
  return features[0]
}

/** Next tag in the hover cycle. Count ≤ 1 stays on 0. */
export function nextFeatureCycleIndex(current: number, count: number): number {
  if (!Number.isFinite(count) || count <= 1) return 0
  const n = Math.floor(count)
  if (!Number.isFinite(current)) return 0
  const i = ((Math.floor(current) % n) + n) % n
  return (i + 1) % n
}

/** Wrap a stack index. Count ≤ 0 stays on 0. */
export function wrapGroupIndex(index: number, count: number, delta = 0): number {
  if (!Number.isFinite(count) || count <= 0) return 0
  const n = Math.floor(count)
  if (!Number.isFinite(index) || !Number.isFinite(delta)) return 0
  return (((Math.floor(index) + Math.floor(delta)) % n) + n) % n
}

/** Linear opacity for a still swap that stays on the bent face. */
export function mediaCrossfadeOpacity(progress: number): { outgoing: number; incoming: number } {
  if (!Number.isFinite(progress) || progress <= 0) return { outgoing: 1, incoming: 0 }
  if (progress >= 1) return { outgoing: 0, incoming: 1 }
  return { outgoing: 1 - progress, incoming: progress }
}

/** Shortest wrap direction for prev/next / dots. Equal distance prefers next. */
export function groupNavDirection(from: number, to: number, count: number): 1 | -1 {
  if (!Number.isFinite(count) || count <= 1) return 1
  const n = Math.floor(count)
  const a = wrapGroupIndex(from, n)
  const b = wrapGroupIndex(to, n)
  if (a === b) return 1
  const forward = ((b - a) % n + n) % n
  const backward = n - forward
  return forward <= backward ? 1 : -1
}

/**
 * Which tag is selected: none while collapsed, the hovered/tapped tag, otherwise
 * the hover-cycle index. Collapsed never pretends the first tag is focused.
 */
export function activeFeatureId(
  features: readonly { id: string }[],
  explicitId: string | null,
  cycleIndex: number,
  expanded: boolean,
): string | null {
  if (!expanded || !features.length) return null
  if (explicitId) {
    const hit = features.find((item) => item.id === explicitId)
    if (hit) return hit.id
  }
  const n = features.length
  const i = ((Math.floor(cycleIndex) % n) + n) % n
  return features[i]?.id ?? null
}

export type CurvedMonitorOverview = {
  id: string
  label: string
}

export type CurvedMonitorDetail = {
  id: string
  title: string
  body: string
}

export type CurvedMonitorSlide = {
  src: string
  alt: string
}

/** First (or indexed) timestamp still from an offer `frames` list. */
export function pickOfferFrame(
  frames: readonly string[] | undefined,
  alt: string,
  index = 0,
): CurvedMonitorSlide {
  const src = frames?.[index]
  if (!src) throw new Error(`missing offer frame ${index}`)
  return { src, alt }
}

/** Cap so Home `%`→V cannot stall on a missing still. */
export const DECODE_IMAGE_SRC_TIMEOUT_MS = 4000

function decodeImageSrc(src: string): Promise<void> {
  const img = new Image()
  img.decoding = 'async'
  img.src = src
  if (typeof img.decode === 'function') {
    return img.decode().then(
      () => undefined,
      () => undefined,
    )
  }
  return new Promise((resolve) => {
    img.onload = () => resolve()
    img.onerror = () => resolve()
  })
}

function raceTimeout(task: Promise<void>, ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    void task.finally(() => {
      clearTimeout(timer)
      resolve()
    })
  })
}

/** Browser-decode public stills. No-op when `Image` is missing (unit / SSR). */
export function decodeImageSrcs(srcs: readonly string[]): Promise<void> {
  if (typeof Image === 'undefined') return Promise.resolve()
  return Promise.all(
    srcs.map((src) => raceTimeout(decodeImageSrc(src), DECODE_IMAGE_SRC_TIMEOUT_MS)),
  ).then(() => undefined)
}

export type CurvedMonitorFeatureGroup = {
  id: string
  title: string
  overviews: readonly CurvedMonitorOverview[]
  details: readonly CurvedMonitorDetail[]
  slides: readonly CurvedMonitorSlide[]
  mediaIntervalMs?: number
}

/** Next still in a feature-group cycle. Frozen (expanded) keeps the current frame. */
export function mediaSlideIndex(
  elapsedMs: number,
  count: number,
  intervalMs = CURVED_MONITOR_MEDIA_INTERVAL_MS,
  frozen = false,
  frozenAt = 0,
): number {
  if (!Number.isFinite(count) || count <= 1) return 0
  const n = Math.floor(count)
  if (frozen) {
    const i = Math.floor(frozenAt)
    return ((i % n) + n) % n
  }
  const step = Math.max(1, intervalMs)
  return Math.floor(Math.max(0, elapsedMs) / step) % n
}
