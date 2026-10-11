/**
 * Flame ink — reusable hover text / line mask helpers.
 * CSS: [flame-ink.css](../../css/effects/flame-ink.css)
 */

export const FLAME_INK_CLASS = 'theme-flame-ink'
export const FLAME_INK_LINE_CLASS = 'theme-flame-ink__line'
export const FLAME_INK_SEED_COUNT = 8

export type FlameInkProps = {
  className: string
  'data-ink': string
}

/** Stable 0–7 personality so the same label keeps its fill / rate / glow. */
export function flameInkSeed(label: string): number {
  let h = 2166136261
  for (let i = 0; i < label.length; i++) {
    h ^= label.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) % FLAME_INK_SEED_COUNT
}

/** Host class only — crumb / calm hosts that share the default recipe. */
export function flameInkClass(): string {
  return FLAME_INK_CLASS
}

/** Host class + `data-ink` seed derived from a label (list rows, tags, assets). */
export function flameInkProps(label: string): FlameInkProps {
  return {
    className: FLAME_INK_CLASS,
    'data-ink': String(flameInkSeed(label)),
  }
}
