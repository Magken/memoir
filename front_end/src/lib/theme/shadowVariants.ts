/** Shadow style presets — ref.shadows-1 · theme palette tokens */

export const TEXT_SHADOW_VARIANT_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'brutal', label: 'Brutal offset' },
  { value: 'soft', label: 'Soft drop' },
  { value: 'glow', label: 'Ink glow' },
  { value: 'emboss', label: 'Emboss' },
  { value: 'layered', label: 'Layered' },
] as const

export type TextShadowVariant = (typeof TEXT_SHADOW_VARIANT_OPTIONS)[number]['value']

export const SURFACE_SHADOW_VARIANT_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'brutal', label: 'Brutal offset' },
  { value: 'soft', label: 'Soft outer' },
  { value: 'inner', label: 'Inner pressed' },
  { value: 'float', label: 'Float' },
  { value: 'glow', label: 'Accent glow' },
  { value: 'layered', label: 'Layered depth' },
  { value: 'vurify', label: 'Vurify' },
] as const

export type SurfaceShadowVariant = (typeof SURFACE_SHADOW_VARIANT_OPTIONS)[number]['value']

/** Default surface shadow for Vurify product chrome — soft float + press. */
export const DEFAULT_VURIFY_SHADOW_VARIANT = 'soft' as const satisfies SurfaceShadowVariant

export function textShadowClass(variant: TextShadowVariant = 'none') {
  return variant === 'none' ? '' : `theme-text-shadow--${variant}`
}

export function cardShadowClass(variant?: SurfaceShadowVariant) {
  return variant ? `theme-card--shadow-${variant}` : ''
}

export function buttonShadowClass(variant?: SurfaceShadowVariant) {
  return variant ? `theme-btn--shadow-${variant}` : ''
}
