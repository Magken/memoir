import {
  ISOMETRIC_SPACE,
  isometricHorizontalSvgOriginString,
  isometricSvgOriginString,
  isometricTypeFontSize,
  isometricTypeLineY,
  type IsometricPivotSurface,
} from './isometricSpace'

export type { IsometricPivotSurface } from './isometricSpace'

/** Skew targets — ref `.left` / `.right` or `.top` / `.bottom`. */
export const ISOMETRIC_HALF_SELECTOR_VERTICAL = '.left, .right'
export const ISOMETRIC_HALF_SELECTOR_HORIZONTAL = '.top, .bottom'

/** @deprecated Prefer `isometricHalfSelector()` */
export const ISOMETRIC_HALF_SELECTOR = ISOMETRIC_HALF_SELECTOR_VERTICAL

/** Label targets — ref `querySelectorAll('text')`. */
export const ISOMETRIC_TEXT_SELECTOR = 'text'

/** @deprecated Prefer `ISOMETRIC_SPACE.viewBox` */
export const ISOMETRIC_VIEWBOX = {
  width: ISOMETRIC_SPACE.viewBox.width,
  height: ISOMETRIC_SPACE.viewBox.height,
} as const

/** @deprecated Prefer `isometricSvgOriginString()` / `ISOMETRIC_SPACE.pivot` */
export const ISOMETRIC_SVG_ORIGIN = isometricSvgOriginString()

/** @deprecated Prefer `ISOMETRIC_SPACE.type.lineYs` */
export const ISOMETRIC_LINE_Y = ISOMETRIC_SPACE.type.lineYs

/** @deprecated Prefer `ISOMETRIC_SPACE.motion.restProgress` */
export const ISOMETRIC_REST_PROGRESS = ISOMETRIC_SPACE.motion.restProgress

/** @deprecated Prefer `ISOMETRIC_SPACE.pivot.x` */
export const ISOMETRIC_TEXT_CENTER_X = ISOMETRIC_SPACE.pivot.x

export type IsometricVariant = 'spread' | 'static' | 'spread-x' | 'static-x'

/** Horizontal seam variant — pivot line parallel to X, spread + labels on Y. */
export function isometricVariantUsesHorizontalSeam(variant: IsometricVariant): boolean {
  return variant === 'spread-x' || variant === 'static-x'
}

export function isometricVariantIsStatic(variant: IsometricVariant): boolean {
  return variant === 'static' || variant === 'static-x'
}

export function isometricHalfSelector(variant: IsometricVariant): string {
  return isometricVariantUsesHorizontalSeam(variant)
    ? ISOMETRIC_HALF_SELECTOR_HORIZONTAL
    : ISOMETRIC_HALF_SELECTOR_VERTICAL
}

/** GSAP svgOrigin — vertical ref uses pivot (640 500); spread-x uses viewBox vertical center. */
export function isometricSvgOriginForVariant(variant: IsometricVariant): string {
  return isometricVariantUsesHorizontalSeam(variant)
    ? isometricHorizontalSvgOriginString()
    : isometricSvgOriginString()
}

/** @deprecated Prefer `ISOMETRIC_SPACE.corner` */
export const ISOMETRIC_PIVOT_CORNER = ISOMETRIC_SPACE.corner

export type IsometricConfig = {
  duration?: number
  ease?: string
  scrubDuration?: number
  scrubEase?: string
  xRange?: number
  yRange?: number
  skewMin?: number
  skewMax?: number
  scaleMin?: number
  scaleMax?: number
  stagger?: number
  labelEnterX?: number
  labelEndX?: number
  labelEnterY?: number
  labelEndY?: number
  svgOrigin?: string
}

export type IsometricProp = boolean | IsometricConfig

export type ResolvedIsometricEffect = {
  enabled: boolean
  variant: IsometricVariant
  pivotSurface: IsometricPivotSurface
  mouseFollow: boolean
  scrollFollow: boolean
  strength: number
  /** Spread group x (`tl`) around svgOrigin — `1` = ref ±xRange. */
  pivotTranslate: number
  /** Text slide (`tl2`) travel — shared on both halves; `labelTranslate` scrubs through slot, not past it. */
  labelTranslate: number
  config: Required<IsometricConfig>
}

export const ISOMETRIC_STRENGTH_DEFAULT = 1
export const ISOMETRIC_STRENGTH_MIN = 0.25
export const ISOMETRIC_STRENGTH_MAX = 2

export const ISOMETRIC_PIVOT_TRANSLATE_DEFAULT = 1
export const ISOMETRIC_PIVOT_TRANSLATE_MIN = 0
export const ISOMETRIC_PIVOT_TRANSLATE_MAX = 3

export const ISOMETRIC_LABEL_TRANSLATE_DEFAULT = 1
export const ISOMETRIC_LABEL_TRANSLATE_MIN = 0
export const ISOMETRIC_LABEL_TRANSLATE_MAX = 3

const { spread, label, motion, pivot, viewBox } = ISOMETRIC_SPACE
const HORIZONTAL_SEAM_Y = viewBox.height / 2
/** Same offset from seam as ref label enter/rest from vertical pivot.x (+60 / −65). */
const LABEL_ENTER_OFFSET = label.enterX - pivot.x
const LABEL_REST_OFFSET = label.restX - pivot.x

export const ISOMETRIC_DEFAULTS: Required<IsometricConfig> = {
  duration: motion.spreadDuration,
  ease: 'power2.inOut',
  scrubDuration: motion.scrubDuration,
  scrubEase: 'power4',
  xRange: spread.xRange,
  yRange: spread.xRange,
  skewMin: spread.skewMin,
  skewMax: spread.skewMax,
  scaleMin: spread.scaleMin,
  scaleMax: spread.scaleMax,
  stagger: motion.labelStagger,
  labelEnterX: label.enterX,
  labelEndX: label.restX,
  /** spread-x: enter/rest Y straddle horizontal seam (not literal 700/575). */
  labelEnterY: HORIZONTAL_SEAM_Y + LABEL_ENTER_OFFSET,
  labelEndY: HORIZONTAL_SEAM_Y + LABEL_REST_OFFSET,
  svgOrigin: isometricSvgOriginString(),
}

export function isometricLineY(index: number, variant: IsometricVariant = 'spread'): number {
  return isometricTypeLineY(index, isometricVariantUsesHorizontalSeam(variant))
}

export function isometricTypeFontSizeForVariant(variant: IsometricVariant): number {
  return isometricTypeFontSize(isometricVariantUsesHorizontalSeam(variant))
}

export function normalizeIsometricStrength(value?: number): number {
  if (value === undefined || Number.isNaN(value)) {
    return ISOMETRIC_STRENGTH_DEFAULT
  }
  return Math.min(ISOMETRIC_STRENGTH_MAX, Math.max(ISOMETRIC_STRENGTH_MIN, value))
}

export function normalizeIsometricPivotTranslate(value?: number): number {
  if (value === undefined || Number.isNaN(value)) {
    return ISOMETRIC_PIVOT_TRANSLATE_DEFAULT
  }
  return Math.min(
    ISOMETRIC_PIVOT_TRANSLATE_MAX,
    Math.max(ISOMETRIC_PIVOT_TRANSLATE_MIN, value),
  )
}

export function normalizeIsometricLabelTranslate(value?: number): number {
  if (value === undefined || Number.isNaN(value)) {
    return ISOMETRIC_LABEL_TRANSLATE_DEFAULT
  }
  return Math.min(
    ISOMETRIC_LABEL_TRANSLATE_MAX,
    Math.max(ISOMETRIC_LABEL_TRANSLATE_MIN, value),
  )
}

/** Ref spread x amplitude — `±xRange` at pivot, scaled by scrub pivot + strength. */
export function isometricSpreadXAmplitude(
  config: Required<IsometricConfig>,
  pivotTranslate: number,
  strength: number = ISOMETRIC_STRENGTH_DEFAULT,
): number {
  return config.xRange * pivotTranslate * strength
}

/** Ref spread y amplitude — `±yRange` at pivot (`spread-x`). */
export function isometricSpreadYAmplitude(
  config: Required<IsometricConfig>,
  pivotTranslate: number,
  strength: number = ISOMETRIC_STRENGTH_DEFAULT,
): number {
  return config.yRange * pivotTranslate * strength
}

/**
 * Fraction of the ref enter→rest slot used when translate &lt; 1.
 * Translate &gt; 1 keeps slot distance fixed — use `isometricLabelSlotProgress` on scrub.
 */
export function isometricLabelSlotSpan(labelTranslate: number): number {
  return Math.max(0, Math.min(1, labelTranslate))
}

/** Map scrub progress through one bounded slot — never overshoots rest pose. */
export function isometricLabelSlotProgress(progress: number, labelTranslate: number): number {
  if (labelTranslate <= 0) return 0
  return Math.max(0, Math.min(1, progress * labelTranslate))
}

/**
 * Shared label X for both halves (ref) — fixed enter/rest; one slot between them.
 */
export function isometricLabelXTargets(config: Required<IsometricConfig>): {
  enterX: number
  restX: number
} {
  const refRestX = config.labelEndX
  const refTravel = config.labelEnterX - refRestX
  return {
    restX: refRestX,
    enterX: refRestX + refTravel,
  }
}

/**
 * Shared label Y for spread-x — down-only delta from natural stack (never shifts up).
 */
export function isometricLabelYTargets(
  _config: Required<IsometricConfig>,
  labelTranslate: number,
): { enterY: number; restY: number } {
  const refTravel = ISOMETRIC_SPACE.type.labelTravelSeamX
  const span = isometricLabelSlotSpan(labelTranslate)
  return {
    restY: 0,
    enterY: refTravel * span,
  }
}

/** Full GSAP label slide — same targets on `.left` and `.right` text (ref tl2). */
export function isometricLabelMotionTargets(
  config: Required<IsometricConfig>,
  labelTranslate: number,
): { enterX: number; restX: number; enterXPercent: number; restXPercent: number } {
  const { enterXPercent: refEnterPct, restXPercent: refRestPct } = ISOMETRIC_SPACE.label
  const { enterX, restX } = isometricLabelXTargets(config)
  const span = isometricLabelSlotSpan(labelTranslate)
  return {
    enterX,
    restX,
    restXPercent: refRestPct,
    enterXPercent: refRestPct + (refEnterPct - refRestPct) * span,
  }
}

/** spread-x label slide — y delta only (no yPercent; −100% was pulling text up at idle). */
export function isometricLabelMotionTargetsY(
  config: Required<IsometricConfig>,
  labelTranslate: number,
): { enterY: number; restY: number; enterYPercent: number; restYPercent: number } {
  const { enterY, restY } = isometricLabelYTargets(config, labelTranslate)
  return {
    enterY,
    restY,
    restYPercent: 0,
    enterYPercent: 0,
  }
}

export function resolveIsometricConfig(
  value?: IsometricProp,
): { enabled: boolean; partial: Partial<IsometricConfig> } {
  if (value === false || value === undefined) {
    return { enabled: false, partial: {} }
  }
  if (value === true) {
    return { enabled: true, partial: {} }
  }
  return { enabled: true, partial: value }
}

export const ISOMETRIC_STATIC_CONFIG: Pick<Required<IsometricConfig>, 'xRange'> = {
  xRange: 0,
}

export const ISOMETRIC_STATIC_X_CONFIG: Pick<Required<IsometricConfig>, 'yRange'> = {
  yRange: 0,
}

export function resolveIsometricEffect(
  isometric?: IsometricProp,
  overrides?: {
    variant?: IsometricVariant
    pivotSurface?: IsometricPivotSurface
    mouseFollow?: boolean
    scrollFollow?: boolean
    strength?: number
    pivotTranslate?: number
    labelTranslate?: number
  },
): ResolvedIsometricEffect {
  const { enabled, partial } = resolveIsometricConfig(isometric)
  const variant = overrides?.variant ?? 'spread'
  const pivotSurface = overrides?.pivotSurface ?? 'sharp'
  const staticPartial = isometricVariantIsStatic(variant)
    ? isometricVariantUsesHorizontalSeam(variant)
      ? ISOMETRIC_STATIC_X_CONFIG
      : ISOMETRIC_STATIC_CONFIG
    : {}
  const config = {
    ...ISOMETRIC_DEFAULTS,
    ...staticPartial,
    ...partial,
    svgOrigin: partial.svgOrigin ?? isometricSvgOriginForVariant(variant),
  }
  let mouseFollow = overrides?.mouseFollow ?? false
  let scrollFollow = overrides?.scrollFollow ?? false

  if (mouseFollow && scrollFollow) {
    scrollFollow = false
  }

  return {
    enabled,
    variant,
    pivotSurface,
    mouseFollow: enabled ? mouseFollow : false,
    scrollFollow: enabled ? scrollFollow : false,
    strength: normalizeIsometricStrength(overrides?.strength),
    pivotTranslate: normalizeIsometricPivotTranslate(overrides?.pivotTranslate),
    labelTranslate: normalizeIsometricLabelTranslate(overrides?.labelTranslate),
    config,
  }
}

export function isometricSpreadSkewY(index: number, phase: 'from' | 'to', config: Required<IsometricConfig>) {
  if (index === 0) {
    return phase === 'from' ? -config.skewMax : -config.skewMin
  }
  return phase === 'from' ? config.skewMin : config.skewMax
}

export function isometricSpreadScaleX(index: number, phase: 'from' | 'to', config: Required<IsometricConfig>) {
  if (index === 0) {
    return phase === 'from' ? config.scaleMin : config.scaleMax
  }
  return phase === 'from' ? config.scaleMax : config.scaleMin
}

export function isometricSpreadSkewX(index: number, phase: 'from' | 'to', config: Required<IsometricConfig>) {
  const { skewMin, skewMax } = config
  if (index === 0) {
    /** Top — ref-parity with vertical left half (full skew range). */
    return phase === 'from' ? -skewMax : -skewMin
  }
  /** Bottom — slightly stronger tilt toward viewer. */
  const botMin = skewMin * 1.15
  const botMax = skewMax * 1.15
  return phase === 'from' ? botMin : botMax
}

export function isometricSpreadScaleY(index: number, phase: 'from' | 'to', config: Required<IsometricConfig>) {
  const { scaleMin, scaleMax } = config
  if (index === 0) {
    /** Top — same scale arc as vertical left half. */
    return phase === 'from' ? scaleMin : scaleMax
  }
  /** Bottom — a touch more open / elongated. */
  return phase === 'from' ? scaleMax : scaleMin + (scaleMax - scaleMin) * 0.35
}

export {
  ISOMETRIC_FRAME_LEGEND,
  ISOMETRIC_SPACE,
  isometricFrameOrigin,
  isometricFrameToSvg,
  isometricMaskRightX,
  isometricMaskSplitX,
  isometricMaskBottomY,
  isometricMaskSplitY,
  isometricPivotPoint,
  isometricSeamX,
  isometricHorizontalSeamY,
  isometricHorizontalMaskSplitY,
  isometricHorizontalSvgOriginString,
  isometricLineSlotClip,
  isometricSeamY,
  isometricSpaceCssVars,
  isometricSvgOriginString,
  isometricSvgToFrame,
  isometricTypeLineY,
  isometricTypeFontSize,
  isometricViewBoxString,
  type IsometricFramePoint,
} from './isometricSpace'
