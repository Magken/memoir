export const ORBITAL_DEFAULT_SEGMENTS = 37
export const ORBITAL_DEFAULT_MAX_POLAR_DEG = 3
export const ORBITAL_DEFAULT_RADIUS = 'var(--orbital-radius)'
export const ORBITAL_DRAG_ANIM_MS = 3000
export const ORBITAL_DRAG_ANIM_MS_FOCUS = 1100
export const ORBITAL_PAN_SENSITIVITY = 20
export const ORBITAL_INERTIA_FRICTION = 0.935
export const ORBITAL_INERTIA_MIN_VELOCITY = 0.08
export const ORBITAL_INERTIA_MAX_FRAMES = 120
/** Pan window around screen-centered rest — fraction of full content arc (0–1) */
export const ORBITAL_PAN_ARC_FRACTION = 0.45
/** Drag follow smoothing (0–1) — lower = softer */
export const ORBITAL_DRAG_SMOOTHING = 0.38
/** Rubber-band overshoot scale (deg) at yaw/polar edges */
export const ORBITAL_EDGE_RUBBER_BAND = 14
export const ORBITAL_EDGE_RUBBER_BAND_POLAR = 5
export const ORBITAL_EDGE_SPRING_STIFFNESS = 210
export const ORBITAL_EDGE_SPRING_DAMPING = 24
export const ORBITAL_EDGE_INERTIA_DAMP = 0.52
export const ORBITAL_VELOCITY_SMOOTHING = 0.24
/** Concave variant — convex rig + half-turn on the horizontal arc */
export const ORBITAL_CONCAVE_YAW_OFFSET = 180

export type OrbitalViewConfig = {
  concave?: boolean
}

export function orbitalViewYawOffset(concave = false): number {
  return concave ? ORBITAL_CONCAVE_YAW_OFFSET : 0
}

/** Pan / inertia yaw delta sign — concave (+180°) reverses horizontal parallax */
export function orbitalPanYawSign(concave = false): number {
  return concave ? -1 : 1
}

export type OrbitalRotation = { x: number; y: number }

export type OrbitalGrid = { x: number; y: number }

export type OrbitalItemSpan = { w: number; h: number }

export type OrbitalGallerySourceItem = {
  src: string
  alt: string
  /** `detail` expand — optional copy */
  title?: string
  text?: string
  num?: string | number
}

export type OrbitalGalleryBuiltItem = OrbitalGallerySourceItem & {
  grid: OrbitalGrid
  size: OrbitalItemSpan
}

export function clampOrbital(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export type OrbitalContentArc = {
  minItemYaw: number
  maxItemYaw: number
  centerItemYaw: number
  seedSphereY: number
  absoluteMinSphereY: number
  absoluteMaxSphereY: number
}

export type OrbitalYawBounds = OrbitalContentArc & {
  initialSphereY: number
  minSphereY: number
  maxSphereY: number
}

/** Horizontal pan limits — screen inset, arc fraction, optional hard sphere-Y overrides */
export type OrbitalPanClamp = {
  /** Stage-edge inset as fraction of stage width (0–0.5) before pan stops */
  inset?: number
  /** Pan window as fraction of filled content arc (0–1) */
  arcFraction?: number
  /** Hard minimum sphere rotateY (degrees) */
  minSphereY?: number
  /** Hard maximum sphere rotateY (degrees) */
  maxSphereY?: number
}

/** Vertical tilt limits — sphere rotateX range in degrees */
export type OrbitalPolarClamp = {
  min?: number
  max?: number
}

/** Combined edge clamps for varied layouts (sparse tiles, tighter scroll, etc.) */
export type OrbitalEdgeClamp = {
  /** Horizontal pan — object or arc-fraction shorthand (0–1) */
  horizontal?: OrbitalPanClamp | number
  /** Vertical tilt — symmetric ±deg shorthand or explicit min/max rotateX */
  vertical?: OrbitalPolarClamp | number
}

export type OrbitalPanClampConfig = {
  inset: number
  arcFraction: number
  minSphereY?: number
  maxSphereY?: number
}

export type OrbitalPolarClampConfig = {
  min: number
  max: number
}

/** Default edge clamps — tight horizontal arc + ±3° polar tilt */
export const ORBITAL_DEFAULT_EDGE_CLAMP: OrbitalEdgeClamp = {
  horizontal: ORBITAL_PAN_ARC_FRACTION,
  vertical: ORBITAL_DEFAULT_MAX_POLAR_DEG,
}

export function resolveOrbitalPanClampConfig(
  panArcFraction?: number,
  edgeClamp?: OrbitalEdgeClamp
): OrbitalPanClampConfig {
  const horizontal = edgeClamp?.horizontal
  if (typeof horizontal === 'number') {
    const arcFraction = horizontal
    return {
      inset: (1 - arcFraction) * 0.08 + 0.02,
      arcFraction,
    }
  }

  const arcFraction =
    horizontal?.arcFraction ?? panArcFraction ?? ORBITAL_PAN_ARC_FRACTION
  return {
    inset: horizontal?.inset ?? (1 - arcFraction) * 0.08 + 0.02,
    arcFraction,
    minSphereY: horizontal?.minSphereY,
    maxSphereY: horizontal?.maxSphereY,
  }
}

export function resolveOrbitalPolarClampConfig(
  maxPolarDeg: number = ORBITAL_DEFAULT_MAX_POLAR_DEG,
  edgeClamp?: OrbitalEdgeClamp
): OrbitalPolarClampConfig {
  const vertical = edgeClamp?.vertical
  if (typeof vertical === 'number') {
    return { min: -vertical, max: vertical }
  }
  return {
    min: vertical?.min ?? -maxPolarDeg,
    max: vertical?.max ?? maxPolarDeg,
  }
}

function resolveOrbitalPolarInput(
  polar: OrbitalPolarClampConfig | number
): OrbitalPolarClampConfig {
  if (typeof polar === 'number') {
    return { min: -polar, max: polar }
  }
  return polar
}

/** Horizontal arc of placed tiles — absolute sphere Y at each content edge */
export function orbitalContentArcFromItems(
  items: readonly { grid: OrbitalGrid; size?: OrbitalItemSpan }[],
  segments: number = ORBITAL_DEFAULT_SEGMENTS
): OrbitalContentArc | null {
  if (items.length === 0) return null

  const step = orbitalSegmentStepDeg(segments)
  let minItemYaw = Infinity
  let maxItemYaw = -Infinity

  for (const item of items) {
    const span = item.size ?? { w: 2, h: 2 }
    const yaw = step * (item.grid.x + (span.w - 1) / 2)
    minItemYaw = Math.min(minItemYaw, yaw)
    maxItemYaw = Math.max(maxItemYaw, yaw)
  }

  const centerItemYaw = (minItemYaw + maxItemYaw) / 2

  return {
    minItemYaw,
    maxItemYaw,
    centerItemYaw,
    seedSphereY: -centerItemYaw,
    absoluteMinSphereY: -maxItemYaw,
    absoluteMaxSphereY: -minItemYaw,
  }
}

/** @deprecated alias — use orbitalContentArcFromItems + resolveOrbitalYawBounds */
export function orbitalYawBoundsFromItems(
  items: readonly { grid: OrbitalGrid; size?: OrbitalItemSpan }[],
  segments: number = ORBITAL_DEFAULT_SEGMENTS
): OrbitalYawBounds | null {
  const arc = orbitalContentArcFromItems(items, segments)
  if (!arc) return null
  return resolveOrbitalPanLimits(arc.seedSphereY, arc, ORBITAL_PAN_ARC_FRACTION)
}

export function measureOrbitalStageCenterX(root: HTMLElement): number {
  const stage = root.querySelector<HTMLElement>('.theme-orbital-gallery__stage') ?? root
  const rect = stage.getBoundingClientRect()
  return rect.left + rect.width / 2
}

/** Projected content span on screen */
export function measureOrbitalContentSpanX(root: HTMLElement): {
  minLeft: number
  maxRight: number
  center: number
} | null {
  const items = root.querySelectorAll<HTMLElement>('.theme-orbital-gallery__item')
  if (items.length === 0) return null

  let minLeft = Infinity
  let maxRight = -Infinity

  for (const item of items) {
    const rect = item.getBoundingClientRect()
    if (rect.width < 2 || rect.height < 2) continue
    minLeft = Math.min(minLeft, rect.left)
    maxRight = Math.max(maxRight, rect.right)
  }

  if (!Number.isFinite(minLeft) || !Number.isFinite(maxRight)) return null
  return { minLeft, maxRight, center: (minLeft + maxRight) / 2 }
}

/** @deprecated — use measureOrbitalContentSpanX */
export function measureOrbitalContentCenterX(root: HTMLElement): number | null {
  return measureOrbitalContentSpanX(root)?.center ?? null
}

export function resolveOrbitalPanLimits(
  centerY: number,
  arc: OrbitalContentArc,
  arcFraction: number = ORBITAL_PAN_ARC_FRACTION
): OrbitalYawBounds {
  const span = arc.absoluteMaxSphereY - arc.absoluteMinSphereY
  const panHalf = (span * arcFraction) / 2

  return {
    ...arc,
    initialSphereY: centerY,
    minSphereY: clampOrbital(centerY - panHalf, arc.absoluteMinSphereY, arc.absoluteMaxSphereY),
    maxSphereY: clampOrbital(centerY + panHalf, arc.absoluteMinSphereY, arc.absoluteMaxSphereY),
  }
}

function orbitalStageFilledSpan(
  span: { minLeft: number; maxRight: number },
  stageRect: DOMRect,
  insetPx: number
): boolean {
  return (
    span.minLeft <= stageRect.left + insetPx &&
    span.maxRight >= stageRect.right - insetPx
  )
}

/** Screen-space pan stops — block when content would leave a gap on either stage edge */
export function resolveOrbitalPanLimitsFromScreen(
  root: HTMLElement,
  sphere: HTMLElement,
  arc: OrbitalContentArc,
  centerY: number,
  polarOffset = 0,
  edgeInset = 0.04,
  viewYawOffset = 0
): { minSphereY: number; maxSphereY: number } {
  const stage = root.querySelector<HTMLElement>('.theme-orbital-gallery__stage') ?? root
  const stageRect = stage.getBoundingClientRect()
  const insetPx = stageRect.width * edgeInset

  let minSphereY = centerY
  for (let y = centerY; y >= arc.absoluteMinSphereY; y -= 0.35) {
    sphere.style.transform = orbitalSphereTransform(
      { x: polarOffset, y },
      ORBITAL_DEFAULT_RADIUS,
      viewYawOffset
    )
    const span = measureOrbitalContentSpanX(root)
    if (!span || !orbitalStageFilledSpan(span, stageRect, insetPx)) break
    minSphereY = y
  }

  let maxSphereY = centerY
  for (let y = centerY; y <= arc.absoluteMaxSphereY; y += 0.35) {
    sphere.style.transform = orbitalSphereTransform(
      { x: polarOffset, y },
      ORBITAL_DEFAULT_RADIUS,
      viewYawOffset
    )
    const span = measureOrbitalContentSpanX(root)
    if (!span || !orbitalStageFilledSpan(span, stageRect, insetPx)) break
    maxSphereY = y
  }

  return {
    minSphereY: clampOrbital(minSphereY, arc.absoluteMinSphereY, arc.absoluteMaxSphereY),
    maxSphereY: clampOrbital(maxSphereY, arc.absoluteMinSphereY, arc.absoluteMaxSphereY),
  }
}

/** Screen-space search — align projected content bbox to stage center */
export function resolveOrbitalCenteredSphereY(
  root: HTMLElement,
  sphere: HTMLElement,
  arc: OrbitalContentArc,
  _maxPolarDeg: number = ORBITAL_DEFAULT_MAX_POLAR_DEG,
  polarOffset = 0,
  viewYawOffset = 0
): number {
  const targetX = measureOrbitalStageCenterX(root)
  const coarseStep = 0.4
  let bestY = arc.seedSphereY
  let bestError = Infinity

  const score = (y: number): number => {
    sphere.style.transform = orbitalSphereTransform(
      { x: polarOffset, y },
      ORBITAL_DEFAULT_RADIUS,
      viewYawOffset
    )
    const span = measureOrbitalContentSpanX(root)
    if (!span) return Infinity
    return Math.abs(span.center - targetX)
  }

  for (let y = arc.absoluteMinSphereY; y <= arc.absoluteMaxSphereY; y += coarseStep) {
    const error = score(y)
    if (error < bestError) {
      bestError = error
      bestY = y
    }
  }

  for (let y = bestY - coarseStep; y <= bestY + coarseStep; y += 0.05) {
    const clamped = clampOrbital(y, arc.absoluteMinSphereY, arc.absoluteMaxSphereY)
    const error = score(clamped)
    if (error < bestError) {
      bestError = error
      bestY = clamped
    }
  }

  return bestY
}

export function resolveOrbitalYawBounds(
  root: HTMLElement,
  sphere: HTMLElement,
  arc: OrbitalContentArc,
  maxPolarDeg: number = ORBITAL_DEFAULT_MAX_POLAR_DEG,
  panArcFraction?: number,
  panClampInput?: OrbitalPanClampConfig,
  viewYawOffset = 0
): OrbitalYawBounds {
  const panClamp = panClampInput ?? resolveOrbitalPanClampConfig(panArcFraction)
  const centeredY = resolveOrbitalCenteredSphereY(
    root,
    sphere,
    arc,
    maxPolarDeg,
    0,
    viewYawOffset
  )
  sphere.style.transform = orbitalSphereTransform(
    { x: 0, y: centeredY },
    ORBITAL_DEFAULT_RADIUS,
    viewYawOffset
  )

  let minSphereY: number
  let maxSphereY: number

  if (panClamp.minSphereY !== undefined && panClamp.maxSphereY !== undefined) {
    minSphereY = clampOrbital(
      Math.min(panClamp.minSphereY, panClamp.maxSphereY),
      arc.absoluteMinSphereY,
      arc.absoluteMaxSphereY
    )
    maxSphereY = clampOrbital(
      Math.max(panClamp.minSphereY, panClamp.maxSphereY),
      arc.absoluteMinSphereY,
      arc.absoluteMaxSphereY
    )
  } else {
    const screenPan = resolveOrbitalPanLimitsFromScreen(
      root,
      sphere,
      arc,
      centeredY,
      0,
      panClamp.inset,
      viewYawOffset
    )
    const arcPan = resolveOrbitalPanLimits(centeredY, arc, panClamp.arcFraction)

    minSphereY = Math.max(screenPan.minSphereY, arcPan.minSphereY)
    maxSphereY = Math.min(screenPan.maxSphereY, arcPan.maxSphereY)

    if (minSphereY > maxSphereY) {
      const mid = (minSphereY + maxSphereY) / 2
      minSphereY = mid
      maxSphereY = mid
    }

    if (panClamp.minSphereY !== undefined) {
      minSphereY = clampOrbital(panClamp.minSphereY, arc.absoluteMinSphereY, arc.absoluteMaxSphereY)
    }
    if (panClamp.maxSphereY !== undefined) {
      maxSphereY = clampOrbital(panClamp.maxSphereY, arc.absoluteMinSphereY, arc.absoluteMaxSphereY)
    }
  }

  sphere.style.transform = orbitalSphereTransform(
    { x: 0, y: centeredY },
    ORBITAL_DEFAULT_RADIUS,
    viewYawOffset
  )

  return {
    ...arc,
    initialSphereY: centeredY,
    minSphereY,
    maxSphereY,
  }
}

export function clampOrbitalRotation(
  rotation: OrbitalRotation,
  bounds: OrbitalYawBounds,
  polar: OrbitalPolarClampConfig | number = ORBITAL_DEFAULT_MAX_POLAR_DEG
): OrbitalRotation {
  const { min, max } = resolveOrbitalPolarInput(polar)
  return {
    x: clampOrbital(rotation.x, min, max),
    y: clampOrbital(rotation.y, bounds.minSphereY, bounds.maxSphereY),
  }
}

export function orbitalRubberBandScalar(
  value: number,
  min: number,
  max: number,
  band = ORBITAL_EDGE_RUBBER_BAND
): number {
  if (value >= min && value <= max) return value
  if (value > max) {
    const overshoot = value - max
    return max + (1 - Math.exp(-overshoot / band)) * band
  }
  const overshoot = min - value
  return min - (1 - Math.exp(-overshoot / band)) * band
}

/** Soft edge resistance while dragging / coasting */
export function applyOrbitalRubberBandRotation(
  rotation: OrbitalRotation,
  bounds: OrbitalYawBounds,
  polar: OrbitalPolarClampConfig | number = ORBITAL_DEFAULT_MAX_POLAR_DEG
): OrbitalRotation {
  const { min, max } = resolveOrbitalPolarInput(polar)
  return {
    x: orbitalRubberBandScalar(rotation.x, min, max, ORBITAL_EDGE_RUBBER_BAND_POLAR),
    y: orbitalRubberBandScalar(rotation.y, bounds.minSphereY, bounds.maxSphereY),
  }
}

export function smoothOrbitalRotation(
  current: OrbitalRotation,
  target: OrbitalRotation,
  factor = ORBITAL_DRAG_SMOOTHING
): OrbitalRotation {
  return {
    x: current.x + (target.x - current.x) * factor,
    y: current.y + (target.y - current.y) * factor,
  }
}

export function orbitalRotationOvershoot(
  rotation: OrbitalRotation,
  bounds: OrbitalYawBounds,
  polar: OrbitalPolarClampConfig | number = ORBITAL_DEFAULT_MAX_POLAR_DEG,
  epsilon = 0.04
): boolean {
  const hard = clampOrbitalRotation(rotation, bounds, polar)
  return (
    Math.abs(rotation.x - hard.x) > epsilon || Math.abs(rotation.y - hard.y) > epsilon
  )
}

export type OrbitalEdgeSpring = {
  position: OrbitalRotation
  velocity: OrbitalRotation
  target: OrbitalRotation
}

export function createOrbitalEdgeSpring(
  from: OrbitalRotation,
  bounds: OrbitalYawBounds,
  polar: OrbitalPolarClampConfig | number = ORBITAL_DEFAULT_MAX_POLAR_DEG,
  releaseVelocity?: OrbitalRotation
): OrbitalEdgeSpring {
  return {
    position: { ...from },
    velocity: releaseVelocity ?? { x: 0, y: 0 },
    target: clampOrbitalRotation(from, bounds, polar),
  }
}

export function stepOrbitalEdgeSpring(
  spring: OrbitalEdgeSpring,
  dt = 1 / 60
): { spring: OrbitalEdgeSpring; settled: boolean } {
  const { target } = spring
  let { x: px, y: py } = spring.position
  let { x: vx, y: vy } = spring.velocity

  const ax = (target.x - px) * ORBITAL_EDGE_SPRING_STIFFNESS
  const ay = (target.y - py) * ORBITAL_EDGE_SPRING_STIFFNESS
  const damp = Math.exp(-ORBITAL_EDGE_SPRING_DAMPING * dt)

  vx = (vx + ax * dt) * damp
  vy = (vy + ay * dt) * damp
  px += vx * dt
  py += vy * dt

  const settled =
    Math.hypot(target.x - px, target.y - py) < 0.035 &&
    Math.hypot(vx, vy) < 0.035

  if (settled) {
    return {
      spring: { position: { ...target }, velocity: { x: 0, y: 0 }, target },
      settled: true,
    }
  }

  return {
    spring: { position: { x: px, y: py }, velocity: { x: vx, y: vy }, target },
    settled: false,
  }
}

/** Ref parity: segment step = (360 / segments) / 2 */
export function orbitalSegmentStepDeg(segments: number): number {
  return 360 / segments / 2
}

/** Item placement transform — ref `.item` rotateY / rotateX / translateZ */
export function orbitalItemTransform(
  grid: OrbitalGrid,
  span: OrbitalItemSpan,
  segments: number,
  radius: string = ORBITAL_DEFAULT_RADIUS
): string {
  const rotYStep = orbitalSegmentStepDeg(segments)
  const rotXStep = orbitalSegmentStepDeg(segments)
  const rotateY = rotYStep * (grid.x + (span.w - 1) / 2)
  const rotateX = rotXStep * (grid.y - (span.h - 1) / 2)
  return `rotateY(${rotateY}deg) rotateX(${rotateX}deg) translateZ(${radius})`
}

/** Sphere rig transform — ref `applyTransform`; concave adds half-turn yaw offset */
export function orbitalSphereTransform(
  rotation: OrbitalRotation,
  radius: string = ORBITAL_DEFAULT_RADIUS,
  viewYawOffset = 0
): string {
  return `translateZ(calc(${radius} * -1)) rotateX(${rotation.x}deg) rotateY(${rotation.y + viewYawOffset}deg)`
}

/** Grid-derived rotation that faces an item toward the camera (starting guess for center-on-click) */
export function orbitalAnalyticalRotationForItem(
  item: { grid: OrbitalGrid; size?: OrbitalItemSpan },
  segments: number = ORBITAL_DEFAULT_SEGMENTS
): OrbitalRotation {
  const step = orbitalSegmentStepDeg(segments)
  const span = item.size ?? { w: 2, h: 2 }
  return {
    y: -step * (item.grid.x + (span.w - 1) / 2),
    x: -step * (item.grid.y - (span.h - 1) / 2),
  }
}

/** Screen-space refine — align one tile bbox center to stage center */
export function resolveOrbitalRotationToCenterItem(
  root: HTMLElement,
  sphere: HTMLElement,
  itemEl: HTMLElement,
  bounds: OrbitalYawBounds,
  polar: OrbitalPolarClampConfig,
  guess: OrbitalRotation,
  viewYawOffset = 0
): OrbitalRotation {
  const stage = root.querySelector<HTMLElement>('.theme-orbital-gallery__stage') ?? root
  const stageRect = stage.getBoundingClientRect()
  const targetX = stageRect.left + stageRect.width / 2
  const targetY = stageRect.top + stageRect.height / 2

  const scoreAt = (rot: OrbitalRotation): number => {
    sphere.style.transform = orbitalSphereTransform(
      clampOrbitalRotation(rot, bounds, polar),
      ORBITAL_DEFAULT_RADIUS,
      viewYawOffset
    )
    const rect = itemEl.getBoundingClientRect()
    if (rect.width < 2 || rect.height < 2) return Infinity
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    return Math.hypot(cx - targetX, cy - targetY)
  }

  let best = clampOrbitalRotation(guess, bounds, polar)
  let bestError = scoreAt(best)

  for (let y = best.y - 2.5; y <= best.y + 2.5; y += 0.12) {
    for (let x = best.x - 1.8; x <= best.x + 1.8; x += 0.1) {
      const candidate = clampOrbitalRotation({ x, y }, bounds, polar)
      const error = scoreAt(candidate)
      if (error < bestError) {
        bestError = error
        best = candidate
      }
    }
  }

  return best
}

function orbitalTileFocusScore(rect: DOMRect, centerX: number, centerY: number): number {
  const itemCenterX = rect.left + rect.width / 2
  const itemCenterY = rect.top + rect.height / 2
  const distance = Math.hypot(itemCenterX - centerX, itemCenterY - centerY)
  const radius = Math.max(Math.max(rect.width, rect.height) * 1.35, 1)
  return Math.max(0, 1 - distance / radius)
}

/** Ref `image-carousel-4` segment lattice — x steps by 2, alternating y bands */
export function buildOrbitalRefGrid(maxItems?: number): OrbitalGrid[] {
  const grids: OrbitalGrid[] = []
  const yBands: readonly (readonly number[])[] = [
    [-4, -2, 0, 2, 4],
    [-3, -1, 1, 3, 5],
  ]

  for (let x = -37; x <= 35; x += 2) {
    const band = yBands[((x + 37) / 2) % 2]
    for (const y of band) {
      grids.push({ x, y })
      if (maxItems !== undefined && grids.length >= maxItems) {
        return grids
      }
    }
  }

  return grids
}

/** Fill ref grid by cycling source images — no empty slots */
export function buildOrbitalItemsFromImages(
  images: readonly OrbitalGallerySourceItem[],
  maxItems = 100,
  size: OrbitalItemSpan = { w: 2, h: 2 }
): OrbitalGalleryBuiltItem[] {
  if (images.length === 0) return []

  const grid = buildOrbitalRefGrid(maxItems)
  return grid.map((gridPos, index) => ({
    ...images[index % images.length],
    grid: gridPos,
    size,
  }))
}

let activeSphere: HTMLElement | null = null

/** Read sphere orbit from inline transform (after commitStyles or applyRotation). */
export function parseOrbitalSphereRotation(element: HTMLElement): OrbitalRotation {
  const str = element.style.transform
  if (!str) return { x: 0, y: 0 }
  const matchX = str.match(/rotateX\((-?\d+(\.\d+)?)deg\)/)
  const matchY = str.match(/rotateY\((-?\d+(\.\d+)?)deg\)/)
  return {
    x: matchX ? Number.parseFloat(matchX[1]) : 0,
    y: matchY ? Number.parseFloat(matchY[1]) : 0,
  }
}

export function cancelOrbitalSphereAnimation(sphere?: HTMLElement | null): void {
  const target = sphere ?? activeSphere
  if (!target) return
  for (const animation of target.getAnimations()) {
    animation.cancel()
  }
}

/** Freeze WAAPI at current frame into inline style — avoids cancel snap / target mismatch jitter */
export function commitOrbitalSphereVisual(sphere: HTMLElement | null | undefined): OrbitalRotation | null {
  if (!sphere) return null
  activeSphere = sphere
  for (const animation of sphere.getAnimations()) {
    animation.commitStyles()
    animation.cancel()
  }
  return parseOrbitalSphereRotation(sphere)
}

/** WAAPI orbit — same smooth follow feel as ImageDragCarousel `animateToPercentage` (no cancel per frame) */
export function animateOrbitalSphere(
  sphere: HTMLElement,
  rotation: OrbitalRotation,
  duration = ORBITAL_DRAG_ANIM_MS,
  viewYawOffset = 0,
  onComplete?: () => void
): void {
  activeSphere = sphere
  const transform = orbitalSphereTransform(rotation, ORBITAL_DEFAULT_RADIUS, viewYawOffset)
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const ms = reducedMotion ? 0 : duration

  if (ms === 0) {
    sphere.style.transform = transform
    onComplete?.()
    return
  }

  const animation = sphere.animate({ transform }, { duration: ms, fill: 'forwards' })
  animation.onfinish = () => onComplete?.()
}

/** Center-weighted focus — off-center tiles grey + shrink (`ImageDragCarousel` focusThin parity) */
export function syncOrbitalTileFocus(root: HTMLElement, log = false): void {
  const stage =
    root.querySelector<HTMLElement>('.theme-orbital-gallery__stage') ?? root
  const { left, top, width, height } = stage.getBoundingClientRect()
  const centerX = left + width / 2
  const centerY = top + height / 2
  const items = root.querySelectorAll<HTMLElement>('.theme-orbital-gallery__item')

  let peak = 0
  const readings: { tile: HTMLElement; focus: number }[] = []

  for (const item of items) {
    const tile = item.querySelector<HTMLElement>('.theme-orbital-gallery__tile')
    if (!tile) continue

    const rect = item.getBoundingClientRect()
    const focus = orbitalTileFocusScore(rect, centerX, centerY)
    readings.push({ tile, focus })
    peak = Math.max(peak, focus)
  }

  const scale = peak > 0.001 ? 1 / peak : 1

  for (const { tile, focus } of readings) {
    const normalized = Math.min(1, focus * scale)
    tile.style.setProperty('--theme-orbital-focus', normalized.toFixed(3))
    if (log) {
      tile.dataset.orbitalFocus = normalized.toFixed(3)
    }
  }

  if (log) {
    console.debug('[OrbitalGallery] focusThin', {
      peak,
      values: readings.map(({ focus }) => Number((focus * scale).toFixed(3))),
    })
  }
}

export function runOrbitalFocusDuringAnimation(
  root: HTMLElement,
  durationMs: number,
  log = false
): void {
  if (durationMs <= 0) {
    syncOrbitalTileFocus(root, log)
    return
  }

  const start = performance.now()
  const tick = (now: number) => {
    syncOrbitalTileFocus(root, log)
    if (now - start < durationMs) {
      requestAnimationFrame(tick)
    } else {
      syncOrbitalTileFocus(root, log)
    }
  }
  requestAnimationFrame(tick)
}

export function clearOrbitalTileFocus(root: HTMLElement): void {
  for (const tile of root.querySelectorAll<HTMLElement>('.theme-orbital-gallery__tile')) {
    tile.style.removeProperty('--theme-orbital-focus')
    delete tile.dataset.orbitalFocus
  }
}

/** Paint-order hint — front projected tiles win ambiguous pointer hits */
export function syncOrbitalTileStackOrder(root: HTMLElement): void {
  const stage =
    root.querySelector<HTMLElement>('.theme-orbital-gallery__stage') ?? root
  const { left, top, width, height } = stage.getBoundingClientRect()
  const centerX = left + width / 2
  const centerY = top + height / 2
  const items = root.querySelectorAll<HTMLElement>('.theme-orbital-gallery__item')

  for (const item of items) {
    const rect = item.getBoundingClientRect()
    if (rect.width < 2 || rect.height < 2) {
      item.style.removeProperty('z-index')
      continue
    }

    const focus = orbitalTileFocusScore(rect, centerX, centerY)
    item.style.zIndex = String(Math.round(focus * 1000))
  }
}

export function clearOrbitalTileStackOrder(root: HTMLElement): void {
  for (const item of root.querySelectorAll<HTMLElement>('.theme-orbital-gallery__item')) {
    item.style.removeProperty('z-index')
  }
}

/** Resolve tapped tile from pointer — any visible card, not only the center one */
export function resolveOrbitalTapIndex(
  root: HTMLElement,
  clientX: number,
  clientY: number
): number | null {
  for (const el of document.elementsFromPoint(clientX, clientY)) {
    if (!root.contains(el)) continue
    const btn = el.closest('[data-orbital-index]')
    if (!btn || !root.contains(btn)) continue
    const index = Number.parseInt(btn.getAttribute('data-orbital-index') ?? '', 10)
    if (!Number.isNaN(index)) return index
  }

  const buttons = root.querySelectorAll<HTMLElement>('[data-orbital-index]')
  let bestIndex: number | null = null
  let bestScore = Infinity

  for (const btn of buttons) {
    const rect = btn.getBoundingClientRect()
    if (rect.width < 4 || rect.height < 4) continue
    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      continue
    }

    const tile = btn.querySelector<HTMLElement>('.theme-orbital-gallery__tile')
    const focusRaw = tile?.style.getPropertyValue('--theme-orbital-focus')
    const focus = focusRaw ? Number.parseFloat(focusRaw) : 1
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dist = Math.hypot(clientX - cx, clientY - cy)
    const score = dist / Math.max(focus, 0.12)

    if (score < bestScore) {
      bestScore = score
      bestIndex = Number.parseInt(btn.getAttribute('data-orbital-index') ?? '', 10)
    }
  }

  return bestIndex !== null && !Number.isNaN(bestIndex) ? bestIndex : null
}
