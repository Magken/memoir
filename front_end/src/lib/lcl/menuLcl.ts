/**
 * Menu LCL on the landing Home scene — lamp `intensity` → 0 + object-color dim.
 * Do not touch camera look Distance or orbit radius.
 */
import { dimHexRgb, formatHexRgb, parseHexRgb } from '../webgl/runtime/materials/sceneObjectColor'

/** Open progress 0…1 (full lamp out + full dim). */
export const MENU_LCL_RETREAT_MAX = 1

/** Subtract this from each RGB channel at retreat = 1. */
export const MENU_LCL_OBJECT_COLOR_DIM = 150

/** Deliberate open/close for lamp intensity (seconds). */
export const MENU_LCL_RETREAT_DURATION = 0.32

export const MENU_LCL_LABEL = 'Menu'
export const MENU_LCL_QUICK_ACCESS_TITLE = 'Quick access'

export const MENU_LCL_QUICK_LINKS = [
  { id: 'who' as const, label: 'About' },
  { id: 'projects' as const, label: 'Projects' },
] as const

export type MenuLclQuickId = (typeof MENU_LCL_QUICK_LINKS)[number]['id']

/** Clamp retreat to 0…1. */
export function clampMenuRetreat(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(MENU_LCL_RETREAT_MAX, Math.max(0, value))
}

/** Baked lamp intensity → 0 at retreat = 1. */
export function menuRetreatIntensity(homeIntensity: number, retreat: number): number {
  const t = clampMenuRetreat(retreat)
  const base = Math.max(0, homeIntensity)
  return base * (1 - t)
}

/** Lerp baked hex toward dimHexRgb(hex, 150) by retreat. */
export function menuRetreatHex(hex: string, retreat: number): string {
  const t = clampMenuRetreat(retreat)
  if (!(t > 0)) return hex
  const from = parseHexRgb(hex)
  const to = parseHexRgb(dimHexRgb(hex, MENU_LCL_OBJECT_COLOR_DIM))
  if (!from || !to) return hex
  if (t >= 1) return dimHexRgb(hex, MENU_LCL_OBJECT_COLOR_DIM)
  return formatHexRgb({
    r: from.r + (to.r - from.r) * t,
    g: from.g + (to.g - from.g) * t,
    b: from.b + (to.b - from.b) * t,
  })
}
