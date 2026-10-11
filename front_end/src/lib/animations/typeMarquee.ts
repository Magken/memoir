export type TypeMarqueeDirection = 'left' | 'right'

export type TypeMarqueeVariant =
  | 'band'
  | 'ghost'
  | 'accent'
  | 'gradient'
  | 'outline'
  | 'invert'
  | 'pill'
  | 'dense'

/** Pixels per second — matches GSAP marquee tutorials (Tuts+ / horizontalLoop speed). */
export const TYPE_MARQUEE_SPEED_DEFAULT = 80

export const TYPE_MARQUEE_SPEED_OPTIONS = [
  { value: '48', label: 'Slow — 48 px/s' },
  { value: '80', label: 'Medium — 80 px/s' },
  { value: '120', label: 'Fast — 120 px/s' },
  { value: '180', label: 'Very fast — 180 px/s' },
] as const

export const TYPE_MARQUEE_DIRECTION_OPTIONS = [
  { value: 'left', label: 'Scroll left' },
  { value: 'right', label: 'Scroll right' },
] as const

export const TYPE_MARQUEE_VARIANT_OPTIONS = [
  { value: 'band', label: 'Band — bordered strip (default)' },
  { value: 'ghost', label: 'Ghost — minimal chrome' },
  { value: 'accent', label: 'Accent — tinted band' },
  { value: 'gradient', label: 'Gradient — display gradient type' },
  { value: 'outline', label: 'Outline — hollow display type' },
  { value: 'invert', label: 'Invert — dark fill band' },
  { value: 'pill', label: 'Pill — rounded capsule' },
  { value: 'dense', label: 'Dense — tight overline rhythm' },
] as const

export const TYPE_MARQUEE_EDGE_FADE_OPTIONS = [
  { value: 'on', label: 'Edge fade on' },
  { value: 'off', label: 'Edge fade off' },
] as const

export type TypeMarqueeCardSurface = 'raised' | 'flat' | 'outline' | 'inset' | 'ghost'
export type TypeMarqueeCardShape = 'pill'

export type TypeMarqueeVariantPreset = {
  typeClass: string
  separator?: string
  speed?: number
  /** Theme card surface — neobrutal border + shadow from [theme-colors.css](../css/effects/theme-colors.css). */
  card?: TypeMarqueeCardSurface
  shape?: TypeMarqueeCardShape
}

/** Per-variant typography + chrome defaults for demos and quick use. */
export const TYPE_MARQUEE_VARIANT_PRESETS: Record<TypeMarqueeVariant, TypeMarqueeVariantPreset> = {
  band: { typeClass: 'type-display-sm type-accent', card: 'flat' },
  ghost: { typeClass: 'type-body-lg type-muted', separator: '/', card: 'ghost' },
  accent: { typeClass: 'type-display-sm type-accent', separator: '—', card: 'raised' },
  gradient: { typeClass: 'type-display-sm type-gradient', card: 'outline' },
  outline: { typeClass: 'type-display-sm type-outlined', card: 'outline' },
  invert: { typeClass: 'type-display-sm type-invert', card: 'raised' },
  pill: { typeClass: 'type-title', separator: '·', card: 'outline', shape: 'pill' },
  dense: { typeClass: 'type-overline type-tracking-wide', separator: '·', speed: 56 },
}

/** Compose `theme-card--*` classes for a marquee variant. */
export function typeMarqueeCardClasses(
  variant: TypeMarqueeVariant,
  cardOverride?: TypeMarqueeCardSurface | false,
): string[] {
  const preset = TYPE_MARQUEE_VARIANT_PRESETS[variant]
  if (cardOverride === false) return []
  const surface = cardOverride ?? preset.card
  if (!surface) return []
  const classes = ['theme-card', `theme-card--${surface}`]
  if (preset.shape === 'pill') {
    classes.push('theme-card--shape-pill')
  }
  return classes
}

export function typeMarqueeLoopDurationPx(loopWidthPx: number, speedPxPerSec: number): number {
  if (loopWidthPx <= 0 || speedPxPerSec <= 0) return 0
  return loopWidthPx / speedPxPerSec
}

/** Repeat the phrase inside one loop half until it covers the viewport (no empty bands). */
export function typeMarqueeFillRepeatCount(viewportWidthPx: number, phraseWidthPx: number): number {
  if (viewportWidthPx <= 0 || phraseWidthPx <= 0) return 1
  return Math.max(1, Math.ceil(viewportWidthPx / phraseWidthPx) + 1)
}
