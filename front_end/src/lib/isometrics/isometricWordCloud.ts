/**
 * Isometric word cloud — ref isometric4 depth/lights/fog, Wordle/d3-cloud arrangement.
 *
 * Layout (Wordle / jason davies d3-cloud):
 * - largest words first (hero V at center)
 * - Archimedean spiral search until AABB fits
 * - mixed rotations (0° / ±30° / ±60° / 90°)
 * - tight padding so words sit close
 */

export function isometricWordCloudDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)
}

export function isometricWordCloudMap(
  value: number,
  start1: number,
  stop1: number,
  start2: number,
  stop2: number,
): number {
  return ((value - start1) / (stop1 - start1)) * (stop2 - start2) + start2
}

/** Raw reference pointer-distance → Z curve. */
export function isometricWordCloudLiftZ(mouseDistance: number): number {
  return isometricWordCloudMap(mouseDistance / 4, 0.3, 0, 0, 1) - 5
}

/** Exact ref: `mouseDistance / 3`, clamped .5–1.5. */
export function isometricWordCloudDuration(mouseDistance: number): number {
  return Math.min(1.5, Math.max(0.5, mouseDistance / 3))
}

export function isometricWordCloudMouseNdc(
  x: number,
  y: number,
  viewportWidth: number,
  viewportHeight: number,
): { x: number; y: number } {
  if (viewportWidth <= 0 || viewportHeight <= 0) return { x: 0, y: 0 }
  return {
    x: (x / viewportWidth) * 2 - 1,
    y: -(y / viewportHeight) * 2 + 1,
  }
}

export type IsometricWordCloudEntry = {
  readonly word: string
  /** Relative weight — drives font size (V is largest). */
  readonly weight: number
  /** Audience lane used by the interactive Hire / Apply focus. */
  readonly audience: IsometricWordCloudAudience
}

export type IsometricWordCloudCameraView = 'front' | 'oblique'
export type IsometricWordCloudAudience = 'shared' | 'hire' | 'apply'
export type IsometricWordCloudFocus = 'all' | Exclude<IsometricWordCloudAudience, 'shared'>

/**
 * Weighted lexicon — V is the hero; others spiral around it.
 * Hire / apply counts stay even so filtered views keep a balanced silhouette.
 * Weights map to TextGeometry `size` in world units.
 */
export const ISOMETRIC_WORD_CLOUD_ENTRIES: readonly IsometricWordCloudEntry[] = [
  { word: 'V', weight: 100, audience: 'shared' },
  /** Brand lockup stays all-caps; intent phrases use Title Case. */
  { word: 'VURIFY', weight: 58, audience: 'shared' },
  { word: 'Hire Talent', weight: 52, audience: 'hire' },
  { word: 'Get Hired', weight: 52, audience: 'apply' },
  { word: 'Find People', weight: 48, audience: 'hire' },
  { word: 'Be Seen', weight: 48, audience: 'apply' },
  { word: 'See Skills', weight: 44, audience: 'hire' },
  { word: 'Show Skills', weight: 44, audience: 'apply' },
  { word: 'Fair Hiring', weight: 40, audience: 'hire' },
  { word: 'No Ghosting', weight: 40, audience: 'apply' },
  { word: 'Clear Signals', weight: 36, audience: 'hire' },
  { word: 'Fair Chance', weight: 36, audience: 'apply' },
  { word: 'Real People', weight: 32, audience: 'hire' },
  { word: 'Your Story', weight: 32, audience: 'apply' },
  { word: 'Shortlist', weight: 28, audience: 'hire' },
  { word: 'Apply Once', weight: 28, audience: 'apply' },
  { word: 'Build Teams', weight: 26, audience: 'hire' },
  { word: 'Move Forward', weight: 26, audience: 'apply' },
  { word: 'Meet Talent', weight: 24, audience: 'hire' },
  { word: 'Find Your Fit', weight: 24, audience: 'apply' },
  { word: 'Grow Teams', weight: 22, audience: 'hire' },
  { word: 'Own Your Work', weight: 22, audience: 'apply' },
  { word: 'Right Fit', weight: 20, audience: 'hire' },
  { word: 'Stay Ready', weight: 20, audience: 'apply' },
  { word: 'Know Why', weight: 18, audience: 'shared' },
  { word: 'One Profile', weight: 18, audience: 'shared' },
  { word: 'Build Trust', weight: 16, audience: 'shared' },
  { word: 'Get Notified', weight: 16, audience: 'shared' },
  { word: 'Connect', weight: 14, audience: 'shared' },
  { word: 'Belong', weight: 14, audience: 'shared' },
  { word: 'Opportunity', weight: 12, audience: 'shared' },
  { word: 'Career', weight: 12, audience: 'shared' },
  { word: 'Progress', weight: 10, audience: 'shared' },
  { word: 'Yes', weight: 10, audience: 'shared' },
] as const

/** Golden-angle step — fans each audience around the origin instead of clustering. */
const WORD_CLOUD_AUDIENCE_PHASE = Math.PI * (3 - Math.sqrt(5))

export function isometricWordCloudEntryMatchesFocus(
  audience: IsometricWordCloudAudience,
  focus: IsometricWordCloudFocus,
): boolean {
  return focus === 'all' || audience === 'shared' || audience === focus
}

export const ISOMETRIC_WORD_CLOUD_TYPEFACE: Record<string, string> = {
  /** Cosmic display (Bricolage Grotesque semibold) — matches theme `vurify` stack. */
  vurify: '/fonts/bricolage_grotesque_semibold.typeface.json',
  brand: '/fonts/helvetiker_regular.typeface.json',
  editorial: '/fonts/helvetiker_regular.typeface.json',
}

export function isometricWordCloudTypefaceUrl(stackId: string): string {
  return ISOMETRIC_WORD_CLOUD_TYPEFACE[stackId] ?? ISOMETRIC_WORD_CLOUD_TYPEFACE.vurify!
}

/** Scene camera / fog / lights / extrusion — ref isometric4. */
export const ISOMETRIC_WORD_CLOUD_SCENE = {
  /** Hero V TextGeometry size (world units). */
  heroSize: 9.5,
  /** VURIFY brand satellite size — kept large; other satellites are smaller. */
  brandSize: 3.4,
  /**
   * Smallest satellite size. Below ~1.4, fixed bevel eats thin strokes and
   * TextGeometry fills self-intersect.
   */
  minSize: 1.55,
  /** Max size for intent satellites (below VURIFY). */
  midSize: 2.45,
  /** Glyph size at which scene bevelThickness/bevelSize apply at full strength. */
  bevelFullSize: 3.2,
  /** Tight Wordle spacing; conservative rotated bounds still prevent overlap. */
  packPadding: 0.2,
  /** Helvetiker advance estimate — between the overlapping .62 and sparse .72 passes. */
  charWidthFactor: 0.67,
  /** Slightly above ref 13; bevel supplies most of the extra visual weight. */
  extrudeDepth: 15,
  /** Curve subdivisions per glyph arc — >1 rounds letterforms (ref used 1 = faceted). */
  curveSegments: 8,
  /**
   * Light bevel only — heavy bevel/negative offset fattened strokes and hid Cosmic.
   * Camera / extrudeDepth / pack stay unchanged.
   */
  bevelThickness: 0.1,
  bevelSize: 0.04,
  bevelOffset: 0,
  bevelSegments: 5,
  camera: {
    /** ~2× the previous front framing width (58° → 96°). */
    frontFov: 96,
    /** Oblique retains more perspective weight. */
    obliqueFov: 42,
    /** Exact 2× zoom-out for both views; preserves camera/fog world distances. */
    zoom: 0.65,
    near: 1,
    /** Front camera nudged right with the off-center cloud framing. */
    frontPosition: [-3, 0, 48] as [number, number, number],
    /** Less upward tilt (Y -8→-4), slightly stronger left-facing angle (X 7→10). */
    position: [10, -4, 40] as [number, number, number],
    lookAt: [-5, 0, 0] as [number, number, number],
    introDuration: 2.4,
  },
  /** Cloud shifted right of lookAt; positive Y lifts the cluster in frame. */
  group: [-2, 6, 0] as [number, number, number],
  floorSize: 100,
  fog: { near: 32, far: 45 },
  depth: {
    returnDuration: 0.8,
    /** Full pointer response inside this world-space radius. */
    pointerInfluenceRadius: 5,
    /** Smoothly blend back to pointerless rest across this additional distance. */
    pointerInfluenceFade: 5,
    /** Maximum rest→focused travel before radial edge damping. */
    pointerMaxLift: 14.5,
    /** Radial distance from cloud center where lift reaches edgeLiftMin. */
    edgeLiftRadius: 14,
    /** Edge words receive at least this fraction of the capped pointer lift. */
    edgeLiftMin: 0.55,
    /**
     * Extra lift for words left of the cloud center — they sit farther from the
     * oblique camera and need more travel to read through fog.
     */
    leftLiftBoost: 0.55,
    /** World-space span left of group X where leftLiftBoost reaches full strength. */
    leftLiftSpan: 12,
  },
  wave: {
    frontZ: -1,
    /** Soft idle swell — a bit more travel than the first pass, still far from a rush. */
    strength: 0.3,
    riseDuration: 1.55,
    returnDuration: 1.75,
    stagger: 0.08,
    repeatDelay: 0.55,
    /** After glyph leave — start the swell immediately, do not wait for rest settle. */
    resumeDelay: 0.06,
    settleDuration: 0.2,
  },
  focus: {
    hiddenZ: -34,
    duration: 0.65,
    stagger: 0.025,
  },
  /**
   * Screen-space radial shade from V → edges (postprocessing).
   * `intensity` 0 hides the pass; higher values fog-tint and softly blur outward.
   */
  edgeShade: {
    intensity: 0.00,
    softness: 0.9,
    blurScale: 2,
  },
  loading: {
    countDuration: 2.8,
    /** Hero exits past fog — snappy so V can enter soon after. */
    exitDuration: 0.5,
    /** V / satellites rise into rest — short travel from enterZ, not from exitZ. */
    revealDuration: 0.85,
    revealStagger: 0.028,
    holdAtHundred: 0.2,
    /** Satellite park + V re-entry start (near fog, not deep past it). */
    farZ: -28,
    /** Where V snaps after the counter swap — avoids a long invisible crawl from exitZ. */
    enterZ: -20,
    /** Counter exits farther than fog so it fully disappears. */
    exitZ: -58,
  },
  lightTweenDuration: 2.5,
  material: {
    metalness: 0.9,
    roughness: 0.2,
    emissiveIntensity: 0.35,
  },
  lights: {
    intensity: 5,
    distance: 1000,
    angle: 1,
    decay: 0,
    penumbra: 0,
    blue: { start: [10, -5, 3] as [number, number, number], x: -20, yMul: 10 },
    white: { start: [0, 0, 3] as [number, number, number], x: 20, yMul: 20 },
    target: [-5, 0, 0] as [number, number, number],
  },
} as const

/**
 * Landing mobile framing:
 * - `mobileLoading` — desktop zoom/FOV, centered aim (same 3/4 host as settle)
 * - `mobileLanding` — zoomed fill for the settled pack
 * Desktop stays `default` (off-center for the left copy rail).
 */
export type IsometricWordCloudFraming =
  | 'default'
  | 'mobileLoading'
  | 'mobileLanding'

export function isometricWordCloudResolvedCamera(
  framing: IsometricWordCloudFraming = 'default',
): {
  zoom: number
  lookAt: [number, number, number]
  frontPosition: [number, number, number]
  position: [number, number, number]
  frontFov: number
  obliqueFov: number
  introDuration: number
  near: number
} {
  const camera = ISOMETRIC_WORD_CLOUD_SCENE.camera
  if (framing === 'default') {
    return {
      zoom: camera.zoom,
      lookAt: [...camera.lookAt] as [number, number, number],
      frontPosition: [...camera.frontPosition] as [number, number, number],
      position: [...camera.position] as [number, number, number],
      frontFov: camera.frontFov,
      obliqueFov: camera.obliqueFov,
      introDuration: camera.introDuration,
      near: camera.near,
    }
  }

  /** Shared aim for the mobile 3/4 host — pack sits lower toward the statement. */
  const mobileLookAt: [number, number, number] = [-1, 5.2, 0]
  const mobileFront: [number, number, number] = [0, 1.5, 36]
  const mobileOblique: [number, number, number] = [3, -0.5, 34]

  if (framing === 'mobileLoading') {
    return {
      /** Same scale as desktop `%` intro — host size alone is already portrait. */
      zoom: camera.zoom,
      lookAt: mobileLookAt,
      frontPosition: mobileFront,
      position: mobileOblique,
      frontFov: camera.frontFov,
      obliqueFov: camera.obliqueFov,
      introDuration: camera.introDuration,
      near: camera.near,
    }
  }

  return {
    /**
     * Settled mobile pack — ~¾ of the way from desktop toward the hard fill
     * (zoom 1.2 / FOV 68), so it reads larger without crowding.
     */
    zoom: camera.zoom + 0.75 * (1.2 - camera.zoom),
    lookAt: mobileLookAt,
    frontPosition: mobileFront,
    position: mobileOblique,
    frontFov: camera.frontFov + 0.75 * (68 - camera.frontFov),
    obliqueFov: 48,
    introDuration: camera.introDuration,
    near: camera.near,
  }
}

/**
 * Mobile hosts keep a lighter lexicon — hero + brand + stronger pairs only.
 * Desktop `default` keeps the full pack.
 */
export function isometricWordCloudEntriesForFraming(
  framing: IsometricWordCloudFraming = 'default',
): readonly IsometricWordCloudEntry[] {
  if (framing === 'default') return ISOMETRIC_WORD_CLOUD_ENTRIES

  const keepShared = new Set(['V', 'VURIFY', 'Know Why', 'Connect', 'Belong'])
  return ISOMETRIC_WORD_CLOUD_ENTRIES.filter((entry) => {
    if (keepShared.has(entry.word)) return true
    if (entry.audience === 'shared') return false
    /** Drop weaker hire/apply satellites (weight < 40). */
    return entry.weight >= 40
  })
}

/** Looser spiral padding on mobile so the thinner set still breathes. */
export function isometricWordCloudPackPaddingForFraming(
  framing: IsometricWordCloudFraming = 'default',
): number {
  if (framing === 'default') return ISOMETRIC_WORD_CLOUD_SCENE.packPadding
  return ISOMETRIC_WORD_CLOUD_SCENE.packPadding * 2.1
}

/** Resolve eye pose for a camera view. */
export function isometricWordCloudCameraPose(
  view: IsometricWordCloudCameraView,
  framing: IsometricWordCloudFraming = 'default',
): {
  position: [number, number, number]
  fov: number
  duration: number
} {
  const camera = isometricWordCloudResolvedCamera(framing)
  if (view === 'front') {
    return {
      position: [...camera.frontPosition],
      fov: camera.frontFov,
      duration: camera.introDuration,
    }
  }
  return {
    position: [...camera.position],
    fov: camera.obliqueFov,
    duration: camera.introDuration,
  }
}

export type IsometricWordCloudMode = 'cloud' | 'loading'

/** Clamp + format loading counter for extruded hero glyph (e.g. `42%`). */
export function isometricWordCloudLoadingLabel(progress: number): string {
  const n = Math.min(100, Math.max(0, Math.round(progress)))
  return `${n}%`
}

/** Idle pose = the existing hover response with an imaginary pointer centered on V. */
export function isometricWordCloudRestZ(
  coverX: number,
  coverY: number,
): number {
  const [centerX, centerY] = ISOMETRIC_WORD_CLOUD_SCENE.group
  const centerDistance = isometricWordCloudDistance(centerX, centerY, coverX, coverY)
  return isometricWordCloudLiftZ(centerDistance)
}

/** Mesh-shaped stand-in so park/reveal can run in units without THREE. */
export type WordCloudMeshLike = {
  visible: boolean
  position: { x: number; y: number; z: number }
}

/** Hide every glyph behind fog — last WebGL frame must not read as the idle cloud. */
export function parkWordCloudBehindFog(
  words: ReadonlyArray<{ localX: number; localY: number }>,
  meshes: ReadonlyArray<WordCloudMeshLike | null | undefined>,
  farZ: number = ISOMETRIC_WORD_CLOUD_SCENE.loading.farZ,
): void {
  words.forEach((word, index) => {
    const mesh = meshes[index]
    if (!mesh) return
    mesh.visible = false
    mesh.position.x = word.localX
    mesh.position.y = word.localY
    mesh.position.z = farZ
  })
}

export type WordCloudEntranceStep = {
  index: number
  fromZ: number
  toZ: number
  at: number
}

/** Left-to-right satellite stagger from fog — same timings as the `%`→V reveal. */
export function wordCloudEntranceSteps(
  words: ReadonlyArray<{ coverX: number; coverY: number }>,
  options?: { farZ?: number; stagger?: number },
): WordCloudEntranceStep[] {
  const farZ = options?.farZ ?? ISOMETRIC_WORD_CLOUD_SCENE.loading.farZ
  const stagger = options?.stagger ?? ISOMETRIC_WORD_CLOUD_SCENE.loading.revealStagger
  return words
    .map((word, index) => ({ word, index }))
    .sort((a, b) => a.word.coverX - b.word.coverX)
    .map(({ word, index }, order) => ({
      index,
      fromZ: farZ,
      toZ: isometricWordCloudRestZ(word.coverX, word.coverY),
      at: order * stagger,
    }))
}

/**
 * Page-bg veil over the Home canvas. `%` stays visible; parked / incoming Home
 * and the one-frame park after land stay covered so a stale framebuffer cannot flash.
 */
export function homeWordCloudHostHidden(input: {
  homeOwnsBootstrap: boolean
  homeLive: boolean
  entrancePending: boolean
}): boolean {
  if (input.homeOwnsBootstrap) return false
  if (!input.homeLive) return true
  return input.entrancePending
}

export type IsometricWordCloudCell = {
  readonly id: string
  readonly word: string
  readonly weight: number
  readonly audience: IsometricWordCloudAudience
  readonly size: number
  /** Z rotation in degrees (Wordle / d3-cloud style). */
  readonly rotateDeg: number
  readonly localX: number
  readonly localY: number
  readonly coverX: number
  readonly coverY: number
  readonly width: number
  readonly height: number
}

type PlacedBox = {
  x: number
  y: number
  w: number
  h: number
}

export function isometricWordCloudSize(weight: number): number {
  const { heroSize, brandSize, minSize, midSize } = ISOMETRIC_WORD_CLOUD_SCENE
  if (weight >= 100) return heroSize
  if (weight >= 58) return brandSize
  const t = Math.min(1, Math.max(0, (weight - 10) / (52 - 10)))
  return minSize + (midSize - minSize) * t
}

export type IsometricWordCloudBounds = ReadonlyMap<string, { width: number; height: number }>

/**
 * Rotation hierarchy:
 * - hero + large anchors: horizontal for readability
 * - medium words: mostly horizontal with sparse 90° columns
 * - small fillers: 0° / 90° / ±30°; no steep ±60°/±90° diagonals
 */
function wordCloudRotation(entry: IsometricWordCloudEntry, index: number): number {
  if (entry.word === 'V' || entry.weight >= 30) return 0
  if (entry.weight >= 18) return index % 4 === 0 ? 90 : 0
  const fillerAngles = [0, 90, 0, -30, 0, 30] as const
  return fillerAngles[index % fillerAngles.length]!
}

/** Axis-aligned bounds of a word after rotation (conservative). */
function rotatedAabb(
  width: number,
  height: number,
  rotateDeg: number,
): { w: number; h: number } {
  const rad = (rotateDeg * Math.PI) / 180
  const c = Math.abs(Math.cos(rad))
  const s = Math.abs(Math.sin(rad))
  return {
    w: width * c + height * s,
    h: width * s + height * c,
  }
}

function boxesOverlap(a: PlacedBox, b: PlacedBox, pad: number): boolean {
  return !(
    a.x + a.w / 2 + pad <= b.x - b.w / 2 ||
    a.x - a.w / 2 - pad >= b.x + b.w / 2 ||
    a.y + a.h / 2 + pad <= b.y - b.h / 2 ||
    a.y - a.h / 2 - pad >= b.y + b.h / 2
  )
}

function audiencePackPhase(
  audience: IsometricWordCloudAudience,
  counts: Record<IsometricWordCloudAudience, number>,
): number {
  const index = counts[audience]
  counts[audience] = index + 1
  // Hire and apply share the same golden steps but start a half-turn apart so
  // filtered silhouettes both fan around the hero instead of collapsing to one side.
  const laneOffset = audience === 'apply' ? Math.PI : audience === 'hire' ? 0 : Math.PI * 0.5
  return laneOffset + index * WORD_CLOUD_AUDIENCE_PHASE
}

/**
 * Wordle / d3-cloud pack: sort by weight, pin V at origin, spiral-place the rest.
 * Audience lanes use interleaved golden-angle phases so Hire/Apply filters stay balanced.
 */
export function isometricWordCloudCells(
  entries: readonly IsometricWordCloudEntry[] = ISOMETRIC_WORD_CLOUD_ENTRIES,
  measuredBounds?: IsometricWordCloudBounds,
  packPadding: number = ISOMETRIC_WORD_CLOUD_SCENE.packPadding,
): {
  cells: readonly IsometricWordCloudCell[]
  groupX: number
  groupY: number
} {
  const { charWidthFactor, group } = ISOMETRIC_WORD_CLOUD_SCENE
  const [groupX, groupY] = group

  const ranked = [...entries].sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight
    // Stable hire/apply pairing at equal weights — keep lanes alternating in the pack order.
    if (a.audience === b.audience) return a.word.localeCompare(b.word)
    if (a.audience === 'shared') return -1
    if (b.audience === 'shared') return 1
    return a.audience === 'hire' ? -1 : 1
  })
  const placed: PlacedBox[] = []
  const cells: IsometricWordCloudCell[] = []
  const audienceCounts: Record<IsometricWordCloudAudience, number> = {
    shared: 0,
    hire: 0,
    apply: 0,
  }

  for (let index = 0; index < ranked.length; index += 1) {
    const entry = ranked[index]!
    const size = isometricWordCloudSize(entry.weight)
    const measured = measuredBounds?.get(entry.word)
    const rawW =
      measured?.width ?? Math.max(size * 0.55, entry.word.length * size * charWidthFactor)
    const rawH = measured?.height ?? size * 1.05
    const rotateDeg = wordCloudRotation(entry, index)
    const { w, h } = rotatedAabb(rawW, rawH, rotateDeg)

    let x = 0
    let y = 0
    let ok = true

    if (index === 0) {
      // Hero at center.
      x = 0
      y = 0
      audienceCounts.shared += 1
    } else {
      ok = false
      const phase = audiencePackPhase(entry.audience, audienceCounts)
      const maxSteps = 1400
      for (let step = 0; step < maxSteps; step += 1) {
        const t = step * 0.35
        const r = 0.45 + t * 0.22
        const angle = phase + t
        x = Math.cos(angle) * r
        y = Math.sin(angle) * r * 0.82
        const candidate: PlacedBox = { x, y, w, h }
        if (!placed.some((box) => boxesOverlap(candidate, box, packPadding))) {
          ok = true
          break
        }
      }
    }

    if (!ok) continue

    placed.push({ x, y, w, h })
    cells.push({
      id: `${index}-${entry.word}`,
      word: entry.word,
      weight: entry.weight,
      audience: entry.audience,
      size,
      rotateDeg,
      localX: x,
      localY: y,
      coverX: x + groupX,
      coverY: y + groupY,
      width: rawW,
      height: rawH,
    })
  }

  return { cells, groupX, groupY }
}
