/** Default multiplier for `--theme-menu-scale` on menu roots. */
export const MENU_SCALE_DEFAULT = 1

export const MENU_SCALE_MIN = 0.75

export const MENU_SCALE_MAX = 1.25

/** Preset multipliers — map to `.theme-menu-scale--{pct}` in [menu-scale.css](../css/effects/menu-scale.css). */
export const MENU_SCALE_STEPS = [0.75, 0.85, 1, 1.15, 1.25] as const

export type MenuScale = (typeof MENU_SCALE_STEPS)[number]

export function resolveMenuScale(scale?: MenuScale): number {
  if (scale === undefined) return MENU_SCALE_DEFAULT
  return Math.min(MENU_SCALE_MAX, Math.max(MENU_SCALE_MIN, scale))
}

/** Modifier class on menu / dock root — omits class when scale is `1`. */
export function menuScaleClass(scale?: MenuScale): string {
  const value = resolveMenuScale(scale)
  if (value === 1) return ''
  return `theme-menu-scale--${Math.round(value * 100)}`
}
