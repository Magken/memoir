/**
 * Internal coordinate system for isometric spread scenes.
 * Single registry — ref [isometric1](../../../item-reference/front-end/isometric1/) viewBox 1280×720.
 * All SVG layout, GSAP origins, masks, motion, and 3D dependents reference these names.
 *
 * SVG user space: origin top-left · +x right · +y down.
 * Frame space (`ISOMETRIC_SPACE.frame`): pivot-centered · screen on **XY** · **−Z toward viewer**
 * (out of the screen). Use `isometricSvgToFrame()` — never ad-hoc axis math in dependents.
 */

/** Pivot seam look — extend with new surface types over time. */
export type IsometricPivotSurface = 'sharp' | 'curved-wall'

/** Pivot-centered 3D point — screen on XY (z = 0); viewer direction is −Z. */
export type IsometricFramePoint = { readonly x: number; readonly y: number; readonly z: number }

/** @deprecated Prefer `IsometricFramePoint` */
export type IsometricPoint = { readonly x: number; readonly y: number }

/** Scene bounds + named landmarks (SVG user units). */
export const ISOMETRIC_SPACE = {
  viewBox: {
    minX: 0,
    minY: 0,
    width: 1280,
    height: 720,
  },

  /**
   * Canonical 3D frame — referenced by SVG scenes, GSAP, CSS, and WebGL debug.
   * Content on the XY plane (z = 0). Viewer looks along −Z (out of the screen).
   */
  frame: {
    screenPlane: 'xy',
    /** Viewer direction in frame space — negative Z, not positive. */
    viewerAxis: '-z',
    origin: 'pivot',
    unitsPerSvg: 1,
    /** Frame → Three.js world: world.x = −frame.x · world.y = frame.y · world.z = frame.z */
    webglSceneScale: [-1, 1, 1] as const,
  },

  /** Intersection of the two spread planes — ref `svgOrigin: 640 500`. Frame origin (0,0,0). */
  pivot: {
    x: 640,
    y: 500,
  },

  /** Vertical seam between left/right mask halves. */
  seam: {
    x: 640,
  },

  /** Display type block — ref `<text y>` + `font-size="150"`. */
  type: {
    fontSize: 150,
    /** First three line baselines (ref 120 · 250 · 380). */
    lineYs: [120, 250, 380] as const,
    /** Baseline gap — `lineYs[1] - lineYs[0]`. */
    lineStep: 130,
    /** spread-x — smaller size + wider step so lines do not overlap under skewX. */
    fontSizeSeamX: 112,
    lineYsSeamX: [88, 228, 368] as const,
    lineStepSeamX: 140,
    /** spread-x label slide span at `labelTranslate` 1 — symmetric ±half around natural stack. */
    labelTravelSeamX: 150,
  },

  /** Group spread motion (`tl`) — vertical seam uses ±xRange; horizontal seam uses ±yRange (same value). */
  spread: {
    /** Translate amplitude — ref `x: 200` → `-200` (vertical seam); `y` when seam on X. */
    xRange: 200,
    skewMin: 15,
    skewMax: 30,
    scaleMin: 0.6,
    scaleMax: 0.85,
  },

  /** Per-line text slide (`tl2`) — vertical seam: x / xPercent at pivot.x offsets. */
  label: {
    enterXPercent: -100,
    /** +60 from pivot.x (640) — into right half. spread-x: same offset from horizontal seam Y. */
    enterX: 700,
    restXPercent: 0,
    /** −65 from pivot.x — into left half. spread-x: same offset from horizontal seam Y. */
    restX: 575,
  },

  /** Curved-wall seam inset around pivot (future surface types extend here). */
  corner: {
    top: 85,
    bottom: 425,
    halfWidth: 44,
    fillet: 32,
  },

  /** Scrub / timeline defaults tied to ref script. */
  motion: {
    restProgress: 0.5,
    spreadDuration: 2,
    labelDuration: 1,
    labelStagger: 0.2,
    scrubDuration: 2,
  },
} as const

// ─── Derived accessors (prefer these over raw numbers in components) ───

/**
 * SVG user → pivot-centered frame.
 * +x = SVG right · +y = up on screen (−SVG y) · −z = toward viewer (out of screen).
 */
export function isometricSvgToFrame(svgX: number, svgY: number, svgZ = 0): IsometricFramePoint {
  const { pivot } = ISOMETRIC_SPACE
  return {
    x: svgX - pivot.x,
    y: pivot.y - svgY,
    z: svgZ,
  }
}

/** Frame XY → SVG user space (ignores z — content lives on z = 0 screen plane). */
export function isometricFrameToSvg(frame: Pick<IsometricFramePoint, 'x' | 'y'>): IsometricPoint {
  const { pivot } = ISOMETRIC_SPACE
  return {
    x: frame.x + pivot.x,
    y: pivot.y - frame.y,
  }
}

export function isometricFrameOrigin(): IsometricFramePoint {
  return { x: 0, y: 0, z: 0 }
}

export const ISOMETRIC_FRAME_LEGEND = [
  'Frame origin (0, 0, 0) = ISOMETRIC_SPACE.pivot — SVG (640, 500)',
  'Screen content on the XY plane (z = 0)',
  '−Z faces the viewer — out of the screen (not +Z)',
  '+X = SVG right · +Y = up on screen (SVG +y is down)',
] as const

export function isometricViewBoxString(): string {
  const { minX, minY, width, height } = ISOMETRIC_SPACE.viewBox
  return `${minX} ${minY} ${width} ${height}`
}

export function isometricSvgOriginString(): string {
  const { x, y } = ISOMETRIC_SPACE.pivot
  return `${x} ${y}`
}

/** spread-x fold line + svgOrigin Y — viewBox vertical center (equal top/bottom). */
export function isometricHorizontalSeamY(): number {
  return ISOMETRIC_SPACE.viewBox.height / 2
}

export function isometricHorizontalSvgOriginString(): string {
  return `${ISOMETRIC_SPACE.pivot.x} ${isometricHorizontalSeamY()}`
}

export function isometricPivotPoint(): IsometricPoint {
  return ISOMETRIC_SPACE.pivot
}

export function isometricSeamX(): number {
  return ISOMETRIC_SPACE.seam.x
}

export function isometricSeamY(): number {
  return isometricHorizontalSeamY()
}

/** Sharp horizontal mask split — viewBox mid-Y (equal halves; vertical ref uses width mid for X). */
export function isometricHorizontalMaskSplitY(): number {
  return isometricHorizontalSeamY()
}

/** Top mask height for curved horizontal seam — `null` = ref percentage mask. */
export function isometricMaskSplitY(surface: IsometricPivotSurface): number | null {
  if (surface === 'sharp') return null
  return isometricHorizontalSeamY() - ISOMETRIC_SPACE.corner.halfWidth
}

/** Bottom mask start y for curved horizontal seam. */
export function isometricMaskBottomY(surface: IsometricPivotSurface): number | null {
  if (surface === 'sharp') return null
  return isometricHorizontalSeamY() + ISOMETRIC_SPACE.corner.halfWidth
}

export function isometricTypeLineY(index: number, seamX = false): number {
  const { lineYs, lineStep, lineYsSeamX, lineStepSeamX } = ISOMETRIC_SPACE.type
  const ys = seamX ? lineYsSeamX : lineYs
  const step = seamX ? lineStepSeamX : lineStep
  if (index < ys.length) {
    return ys[index]!
  }
  const last = ys[ys.length - 1]!
  return last + (index - ys.length + 1) * step
}

/** spread-x display size — fits half-height 360 under skewX without overlap. */
export function isometricTypeFontSize(seamX = false): number {
  const { fontSize, fontSizeSeamX } = ISOMETRIC_SPACE.type
  return seamX ? fontSizeSeamX : fontSize
}

/** Per-line clip band — ref isometric2 row height / isometric1 lineStep. */
export function isometricLineSlotClip(
  index: number,
  seamX = false,
): { x: number; y: number; width: number; height: number } {
  const baselineY = isometricTypeLineY(index, seamX)
  const step = seamX ? ISOMETRIC_SPACE.type.lineStepSeamX : ISOMETRIC_SPACE.type.lineStep
  const fontSize = isometricTypeFontSize(seamX)
  return {
    x: 0,
    y: baselineY - fontSize * 0.72,
    width: ISOMETRIC_SPACE.viewBox.width,
    height: step,
  }
}

/** CSS custom properties for `.theme-isometric-scene` — keep in sync with [isometric-effect.css](../css/effects/isometric-effect.css). */
export function isometricSpaceCssVars(): Record<string, string | number> {
  const { viewBox, pivot, seam, type, spread, label, corner, motion } = ISOMETRIC_SPACE
  return {
    '--iso-view-w': viewBox.width,
    '--iso-view-h': viewBox.height,
    '--iso-pivot-x': pivot.x,
    '--iso-pivot-y': pivot.y,
    '--iso-seam-x': seam.x,
    '--iso-seam-y': viewBox.height / 2,
    '--iso-type-size-seam-x': type.fontSizeSeamX,
    '--iso-label-enter-y': viewBox.height / 2 + (label.enterX - pivot.x),
    '--iso-label-rest-y': viewBox.height / 2 + (label.restX - pivot.x),
    '--iso-type-size': type.fontSize,
    '--iso-spread-x': spread.xRange,
    '--iso-label-enter-x': label.enterX,
    '--iso-label-rest-x': label.restX,
    '--iso-corner-top': corner.top,
    '--iso-corner-bottom': corner.bottom,
    '--iso-corner-half-w': corner.halfWidth,
    '--iso-corner-fillet': corner.fillet,
    '--iso-rest-progress': motion.restProgress,
  }
}

/** Left mask width for curved seam — `null` = ref percentage mask (`x="-50%"`). */
export function isometricMaskSplitX(surface: IsometricPivotSurface): number | null {
  if (surface === 'sharp') return null
  return ISOMETRIC_SPACE.pivot.x - ISOMETRIC_SPACE.corner.halfWidth
}

/** Right mask start x for curved seam — `null` = ref percentage mask (`x="50%"`). */
export function isometricMaskRightX(surface: IsometricPivotSurface): number | null {
  if (surface === 'sharp') return null
  return ISOMETRIC_SPACE.pivot.x + ISOMETRIC_SPACE.corner.halfWidth
}

export function isometricUsesCurvedMask(surface: IsometricPivotSurface): boolean {
  return surface === 'curved-wall'
}
