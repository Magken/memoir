import type { LucideIcon } from 'lucide-react'

export const PROGRESS_LOADER_SIZES = ['micro', 'sm', 'md', 'lg'] as const

export type ProgressLoaderSize = (typeof PROGRESS_LOADER_SIZES)[number]

export const PROGRESS_LOADER_TONES = ['accent', 'success', 'error', 'warning', 'info'] as const

export type ProgressLoaderTone = (typeof PROGRESS_LOADER_TONES)[number]

/** Linear bar fill style. */
export const BAR_LOADER_VARIANTS = ['solid', 'striped', 'segmented'] as const

export type BarLoaderVariant = (typeof BAR_LOADER_VARIANTS)[number]

/** Radial arc sweep — full 360° ring or 180° gauge. */
export const RADIAL_LOADER_SHAPES = ['full', 'semi'] as const

export type RadialLoaderShape = (typeof RADIAL_LOADER_SHAPES)[number]

/** Liquid-fill vessel shape (ref.liquid-loader). */
export const FLUID_LOADER_SHAPES = ['tube', 'bottle', 'circle', 'drop'] as const

export type FluidLoaderShape = (typeof FLUID_LOADER_SHAPES)[number]

/** Fluid loaders use the same size scale minus `micro`. */
export const FLUID_LOADER_SIZES = ['sm', 'md', 'lg'] as const

export type FluidLoaderSize = (typeof FLUID_LOADER_SIZES)[number]

export const fluidLoaderShapeClass: Record<FluidLoaderShape, string> = {
  tube: 'theme-fluid-loader--tube',
  bottle: 'theme-fluid-loader--bottle',
  circle: 'theme-fluid-loader--circle',
  drop: 'theme-fluid-loader--drop',
}

/**
 * Named color-scale gradients — the liquid is anchored to the vessel so the
 * low end shows a different color than the high end (ref.liquid-loader).
 */
export const FLUID_LOADER_GRADIENTS = [
  'thermal',
  'cold',
  'heat',
  'rainbow',
  'sunset',
  'ocean',
  'aurora',
] as const

export type FluidLoaderGradient = (typeof FLUID_LOADER_GRADIENTS)[number]

export const fluidLoaderGradientClass: Record<FluidLoaderGradient, string> = {
  thermal: 'theme-fluid-loader--grad-thermal',
  cold: 'theme-fluid-loader--grad-cold',
  heat: 'theme-fluid-loader--grad-heat',
  rainbow: 'theme-fluid-loader--grad-rainbow',
  sunset: 'theme-fluid-loader--grad-sunset',
  ocean: 'theme-fluid-loader--grad-ocean',
  aurora: 'theme-fluid-loader--grad-aurora',
}

export const fluidLoaderSizeClass: Record<FluidLoaderSize, string> = {
  sm: 'theme-fluid-loader--sm',
  md: 'theme-fluid-loader--md',
  lg: 'theme-fluid-loader--lg',
}

/** One concentric arc in a (stacked) radial loader — ref.radial-loader-1 activity ring. */
export type RadialLoaderRing = {
  /** 0–100 fill percentage. */
  value: number
  tone?: ProgressLoaderTone
  /** Short caption used in the accessible summary. */
  label?: string
  /** Optional Lucide icon pinned to the arc's leading tip (ref.radial-loader-1 style). */
  icon?: LucideIcon
}

export const DEFAULT_PROGRESS_LOADER_SIZE: ProgressLoaderSize = 'md'
export const DEFAULT_PROGRESS_LOADER_TONE: ProgressLoaderTone = 'accent'
export const DEFAULT_BAR_LOADER_VARIANT: BarLoaderVariant = 'solid'

export const radialLoaderSizeClass: Record<ProgressLoaderSize, string> = {
  micro: 'theme-radial-loader--micro',
  sm: 'theme-radial-loader--sm',
  md: 'theme-radial-loader--md',
  lg: 'theme-radial-loader--lg',
}

export const barLoaderSizeClass: Record<ProgressLoaderSize, string> = {
  micro: 'theme-bar-loader--micro',
  sm: 'theme-bar-loader--sm',
  md: 'theme-bar-loader--md',
  lg: 'theme-bar-loader--lg',
}

export const radialLoaderToneClass: Record<ProgressLoaderTone, string> = {
  accent: 'theme-radial-loader__value--accent',
  success: 'theme-radial-loader__value--success',
  error: 'theme-radial-loader__value--error',
  warning: 'theme-radial-loader__value--warning',
  info: 'theme-radial-loader__value--info',
}

export const barLoaderToneClass: Record<ProgressLoaderTone, string> = {
  accent: 'theme-bar-loader__fill--accent',
  success: 'theme-bar-loader__fill--success',
  error: 'theme-bar-loader__fill--error',
  warning: 'theme-bar-loader__fill--warning',
  info: 'theme-bar-loader__fill--info',
}

export const barLoaderVariantClass: Record<BarLoaderVariant, string> = {
  solid: 'theme-bar-loader--solid',
  striped: 'theme-bar-loader--striped',
  segmented: 'theme-bar-loader--segmented',
}

export const fluidLoaderToneClass: Record<ProgressLoaderTone, string> = {
  accent: 'theme-fluid-loader--accent',
  success: 'theme-fluid-loader--success',
  error: 'theme-fluid-loader--error',
  warning: 'theme-fluid-loader--warning',
  info: 'theme-fluid-loader--info',
}

/** Clamp any input to the 0–100 progress range. */
export function clampProgress(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.min(100, Math.max(0, value))
}

/** SVG viewBox is square; this is its side length in user units. */
export const RADIAL_LOADER_VIEWBOX = 120

/** Edge padding (user units) — leaves room for rounded caps + tip icons (no edge clip). */
export const RADIAL_LOADER_PADDING = 11

/** Inner radius (user units) kept clear for stacked rings so the center fits text/scale. */
export const RADIAL_LOADER_INNER_CLEAR = 22

/** Default arc thickness (user units) when `thickness` is not passed. */
export const DEFAULT_RADIAL_RING_THICKNESS = 12
/** Default gap between stacked rings (user units). */
export const DEFAULT_RADIAL_RING_GAP = 5

type RadialGeometryOptions = {
  /** Arc stroke width in user units (auto-fit to all rings when omitted). */
  thickness?: number
  /** Gap between stacked rings in user units. */
  gap?: number
}

/**
 * Per-ring geometry for a stacked radial loader, outermost first.
 * Multi-ring loaders are packed into the OUTER band (down to `RADIAL_LOADER_INNER_CLEAR`)
 * so the rings never collapse over the center — leaving room for center value / scale.
 */
export function radialLoaderRingGeometry(
  ringIndex: number,
  ringCount: number,
  options: RadialGeometryOptions = {},
): { radius: number; strokeWidth: number; circumference: number } {
  const center = RADIAL_LOADER_VIEWBOX / 2
  const gap = options.gap ?? DEFAULT_RADIAL_RING_GAP
  const outerEdge = center - RADIAL_LOADER_PADDING

  if (ringCount <= 1) {
    const strokeWidth = Math.max(2, Math.min(options.thickness ?? DEFAULT_RADIAL_RING_THICKNESS, outerEdge))
    const outerRadius = outerEdge - strokeWidth / 2
    return { radius: outerRadius, strokeWidth, circumference: 2 * Math.PI * outerRadius }
  }

  // Distribute rings + gaps across the outer band only.
  const band = outerEdge - RADIAL_LOADER_INNER_CLEAR
  const autoStroke = (band - gap * (ringCount - 1)) / ringCount
  const strokeWidth = Math.max(2, Math.min(options.thickness ?? autoStroke, autoStroke))
  const outerRadius = outerEdge - strokeWidth / 2
  const radius = outerRadius - ringIndex * (strokeWidth + gap)
  return { radius, strokeWidth, circumference: 2 * Math.PI * radius }
}

/** Visible sweep as a fraction of the full circle (`full` = 1, `semi` = 0.5). */
export function radialLoaderArcSpan(shape: RadialLoaderShape): number {
  return shape === 'semi' ? 0.5 : 1
}

/** Group rotation (deg) so the arc starts at the top (`full`) or left (`semi`). */
export function radialLoaderRotation(shape: RadialLoaderShape): number {
  return shape === 'semi' ? 180 : -90
}

/** Point (viewBox units) at `fraction` (0–1) along the drawn arc. */
export function radialLoaderPoint(
  fraction: number,
  radius: number,
  shape: RadialLoaderShape,
): { x: number; y: number } {
  const center = RADIAL_LOADER_VIEWBOX / 2
  const f = Math.min(1, Math.max(0, fraction))
  if (shape === 'semi') {
    // Left → top → right across the upper semicircle.
    return { x: center - radius * Math.cos(Math.PI * f), y: center - radius * Math.sin(Math.PI * f) }
  }
  const theta = f * 2 * Math.PI
  return { x: center + radius * Math.sin(theta), y: center - radius * Math.cos(theta) }
}

/** Percent-of-box position of an arc's leading tip. */
export function radialLoaderTipPosition(
  fraction: number,
  radius: number,
  shape: RadialLoaderShape = 'full',
): { xPct: number; yPct: number } {
  const { x, y } = radialLoaderPoint(fraction, radius, shape)
  return {
    xPct: (x / RADIAL_LOADER_VIEWBOX) * 100,
    yPct: (y / RADIAL_LOADER_VIEWBOX) * 100,
  }
}

/** Showcase activity-ring preset (Apple-style move / exercise / stand). */
export const RADIAL_LOADER_DEMO_RINGS: readonly RadialLoaderRing[] = [
  { value: 78, tone: 'error', label: 'Move' },
  { value: 62, tone: 'success', label: 'Exercise' },
  { value: 90, tone: 'info', label: 'Stand' },
]

/* ------------------------------------------------------------------ *
 * Extra determinate loader types — step / dial / battery.
 * Tone + size are shared via the `theme-loader-*` token classes below.
 * ------------------------------------------------------------------ */

/** Sets `--loader-tone` so step / dial / battery share one tone palette. */
export const loaderToneClass: Record<ProgressLoaderTone, string> = {
  accent: 'theme-loader-tone--accent',
  success: 'theme-loader-tone--success',
  error: 'theme-loader-tone--error',
  warning: 'theme-loader-tone--warning',
  info: 'theme-loader-tone--info',
}

/** Sets `--loader-size`; each extra loader scales its parts from it. */
export const loaderSizeClass: Record<ProgressLoaderSize, string> = {
  micro: 'theme-loader--micro',
  sm: 'theme-loader--sm',
  md: 'theme-loader--md',
  lg: 'theme-loader--lg',
}

/** Discrete step loader cell shape. `vurify` = sharp-edge project steps. */
export const STEP_LOADER_VARIANTS = ['dots', 'bars', 'steps', 'vurify'] as const

export type StepLoaderVariant = (typeof STEP_LOADER_VARIANTS)[number]

export const stepLoaderVariantClass: Record<StepLoaderVariant, string> = {
  dots: 'theme-step-loader--dots',
  bars: 'theme-step-loader--bars',
  steps: 'theme-step-loader--steps',
  vurify: 'theme-step-loader--vurify',
}

/** Conic dial fill shape — solid pie or donut ring. */
export const DIAL_LOADER_SHAPES = ['pie', 'donut'] as const

export type DialLoaderShape = (typeof DIAL_LOADER_SHAPES)[number]

export const dialLoaderShapeClass: Record<DialLoaderShape, string> = {
  pie: 'theme-dial-loader--pie',
  donut: 'theme-dial-loader--donut',
}

/** Battery body direction. */
export const BATTERY_LOADER_ORIENTATIONS = ['horizontal', 'vertical'] as const

export type BatteryLoaderOrientation = (typeof BATTERY_LOADER_ORIENTATIONS)[number]

export const batteryLoaderOrientationClass: Record<BatteryLoaderOrientation, string> = {
  horizontal: 'theme-battery-loader--horizontal',
  vertical: 'theme-battery-loader--vertical',
}

/** Charge-based tone: low = error, mid = warning, high = success. */
export function batteryChargeTone(value: number): ProgressLoaderTone {
  const v = clampProgress(value)
  if (v <= 20) return 'error'
  if (v <= 50) return 'warning'
  return 'success'
}
