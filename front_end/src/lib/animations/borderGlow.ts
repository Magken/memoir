/** Palette-linked gradient border / ink / SVG icon glow — [border-glow.css](../css/effects/border-glow.css) */

export const BORDER_GLOW_SURFACE_CLASS = 'theme-border-glow'
export const BORDER_GLOW_INK_CLASS = 'theme-border-glow--ink'
export const BORDER_GLOW_ICON_CLASS = 'theme-border-glow--icon'
export const TYPE_GLOW_CLASS = 'type-glow'
export const ICON_SVG_GLOW_CLASS = 'theme-btn__icon--svg-glow'

/** `true` — ring on surfaced controls, ink on cardless/icon-only. `'ink'` · `'icon'` force a mode. */
export type BorderGlowMode = boolean | 'ink' | 'icon'

export type ResolvedBorderGlow = {
  enabled: boolean
  ring: boolean
  ink: boolean
  icon: boolean
}

export function resolveBorderGlow(
  borderGlow: BorderGlowMode | undefined,
  context: { cardlessOrIconOnly: boolean }
): ResolvedBorderGlow {
  if (!borderGlow) {
    return { enabled: false, ring: false, ink: false, icon: false }
  }
  if (borderGlow === 'icon') {
    return { enabled: true, ring: false, ink: false, icon: true }
  }
  if (borderGlow === 'ink') {
    return { enabled: true, ring: false, ink: true, icon: false }
  }
  if (context.cardlessOrIconOnly) {
    return { enabled: true, ring: false, ink: true, icon: false }
  }
  return { enabled: true, ring: true, ink: false, icon: false }
}

export function borderGlowClassFromResolved(resolved: ResolvedBorderGlow): string {
  if (!resolved.enabled) return ''
  if (resolved.icon) return BORDER_GLOW_ICON_CLASS
  const parts = [BORDER_GLOW_SURFACE_CLASS]
  if (resolved.ink) parts.push(BORDER_GLOW_INK_CLASS)
  return parts.join(' ')
}

/** Surface gradient ring only — [Card](Card.tsx). */
export function borderGlowClass(enabled?: boolean): string {
  return enabled ? BORDER_GLOW_SURFACE_CLASS : ''
}

/** @deprecated Prefer `borderGlowClassFromResolved(resolveBorderGlow(...))` on buttons. */
export function borderGlowClassLegacy(enabled?: boolean, ink = false): string {
  if (!enabled) return ''
  return ink
    ? `${BORDER_GLOW_SURFACE_CLASS} ${BORDER_GLOW_INK_CLASS}`
    : BORDER_GLOW_SURFACE_CLASS
}
