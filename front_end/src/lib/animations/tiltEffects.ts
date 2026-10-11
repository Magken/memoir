/** @deprecated Pointer tracking replaced trap grid; kept for API stability. */
export const MOUSE_TILT_GRID_N = 7

/** Map pointer position inside rect to -1…1 (reference / tunnel). */
export function pointerToTiltAxes(
  clientX: number,
  clientY: number,
  rect: DOMRectReadOnly,
): { x: number; y: number } {
  const x = Math.max(-1, Math.min(1, ((clientX - rect.left) / rect.width) * 2 - 1))
  const y = Math.max(-1, Math.min(1, ((clientY - rect.top) / rect.height) * 2 - 1))
  return { x, y }
}

export const MOUSE_TILT_EFFECTS = ['follow', 'away'] as const

export type MouseTiltEffect = (typeof MOUSE_TILT_EFFECTS)[number]

/** `true` → follow · `'away'` → invert · omit/`false` → off */
export type MouseTiltProp = boolean | MouseTiltEffect

export function isMouseTiltEffect(value: string): value is MouseTiltEffect {
  return (MOUSE_TILT_EFFECTS as readonly string[]).includes(value)
}

/** Scales follow/away tilt angle only — does not affect `--dz` text pop. */
export const MOUSE_TILT_STRENGTH_DEFAULT = 1
export const MOUSE_TILT_STRENGTH_MIN = 0.25
export const MOUSE_TILT_STRENGTH_MAX = 2

export function normalizeMouseTiltStrength(value?: number): number {
  if (value === undefined || Number.isNaN(value)) {
    return MOUSE_TILT_STRENGTH_DEFAULT
  }
  return Math.min(MOUSE_TILT_STRENGTH_MAX, Math.max(MOUSE_TILT_STRENGTH_MIN, value))
}

export function resolveMouseTilt(value?: MouseTiltProp): {
  enabled: boolean
  effect: MouseTiltEffect
} {
  if (value === true) {
    return { enabled: true, effect: 'follow' }
  }
  if (value === false || value === undefined) {
    return { enabled: false, effect: 'follow' }
  }
  return { enabled: true, effect: value }
}

