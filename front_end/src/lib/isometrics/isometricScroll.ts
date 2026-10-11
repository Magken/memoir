/** Find the scroll viewport inside a ThemeScroll / RoundedScroll host. */
export function resolveIsometricScrollViewport(
  host: HTMLElement | null | undefined,
): HTMLElement | null {
  if (!host) return null
  return host.querySelector<HTMLElement>(
    '.theme-scroll__viewport, .theme-rounded-scroll__viewport',
  )
}

export type IsometricFollowMode = 'off' | 'mouse' | 'scroll'

export const ISOMETRIC_VARIANT_OPTIONS = [
  { value: 'spread', label: 'Spread — vertical seam · horizontal motion' },
  { value: 'spread-x', label: 'Spread X — horizontal seam · vertical motion' },
  { value: 'static', label: 'Fixed pivot — vertical seam, text slide X' },
  { value: 'static-x', label: 'Fixed pivot X — horizontal seam, text slide Y' },
] as const

export const ISOMETRIC_PIVOT_SURFACE_OPTIONS = [
  { value: 'sharp', label: 'Sharp seam' },
  { value: 'curved-wall', label: 'Curved wall corner' },
] as const

export const ISOMETRIC_FOLLOW_OPTIONS = [
  { value: 'off', label: 'Follow off' },
  { value: 'mouse', label: 'Mouse follow' },
  { value: 'scroll', label: 'Scroll follow (inner card)' },
] as const

export type IsometricPlaneBorderMode = 'off' | 'on'

export const ISOMETRIC_PLANE_BORDER_OPTIONS = [
  { value: 'off', label: 'Plane borders off' },
  { value: 'on', label: 'Plane borders on' },
] as const

export function isometricPlaneBordersFromMode(mode: IsometricPlaneBorderMode): boolean {
  return mode === 'on'
}

export const ISOMETRIC_PIVOT_TRANSLATE_OPTIONS = [
  { value: '0', label: 'Pivot translate ×0' },
  { value: '0.5', label: 'Pivot translate ×0.5' },
  { value: '1', label: 'Pivot translate ×1 (ref)' },
  { value: '1.5', label: 'Pivot translate ×1.5' },
  { value: '2', label: 'Pivot translate ×2' },
  { value: '2.5', label: 'Pivot translate ×2.5' },
] as const

export const ISOMETRIC_LABEL_TRANSLATE_OPTIONS = [
  { value: '0.5', label: 'Text travel ×0.5' },
  { value: '1', label: 'Text travel ×1 (ref)' },
  { value: '1.5', label: 'Text travel ×1.5' },
  { value: '2', label: 'Text travel ×2' },
  { value: '2.5', label: 'Text travel ×2.5' },
] as const

export function isometricFollowFromMode(mode: IsometricFollowMode): {
  mouseFollow: boolean
  scrollFollow: boolean
} {
  return {
    mouseFollow: mode === 'mouse',
    scrollFollow: mode === 'scroll',
  }
}

export type IsometricCssWordsLayout = 'diagonal' | 'vertical'

export const ISOMETRIC_CSS_WORDS_LAYOUT_OPTIONS = [
  { value: 'diagonal', label: 'Diagonal — ref isometric2 step' },
  { value: 'vertical', label: 'Vertical — lightweight stack' },
] as const

export type IsometricSliceTextLayout = 'ref' | 'flat'

export const ISOMETRIC_SLICE_LAYOUT_OPTIONS = [
  { value: 'ref', label: 'Ref axonometric — rotate/skew wrapper' },
  { value: 'flat', label: 'Flat — no wrapper transform' },
] as const

export const ISOMETRIC_SLICE_DENSITY_OPTIONS = [
  { value: '0.75', label: 'Slice density ×0.75' },
  { value: '1', label: 'Slice density ×1 (ref)' },
  { value: '1.25', label: 'Slice density ×1.25' },
] as const

export const ISOMETRIC_SLICE_TRAVEL_OPTIONS = [
  { value: '0.75', label: 'Slice travel ×0.75' },
  { value: '1', label: 'Slice travel ×1 (ref)' },
  { value: '1.5', label: 'Slice travel ×1.5' },
] as const
