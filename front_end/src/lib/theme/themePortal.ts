import type { CSSProperties } from 'react'

const PORTAL_VAR_PREFIXES = ['--theme', '--type', '--font', '--vv'] as const

function isPortalCssVar(name: string): boolean {
  return PORTAL_VAR_PREFIXES.some((prefix) => name.startsWith(prefix))
}

/** Copy inline custom properties from a themed host onto a portal wrapper. */
export function collectThemePortalStyle(from: HTMLElement | null | undefined): CSSProperties {
  if (!from) return {}
  const out: Record<string, string> = {}
  const decl = from.style
  for (let i = 0; i < decl.length; i++) {
    const name = decl.item(i)
    if (!name || !isPortalCssVar(name)) continue
    const value = decl.getPropertyValue(name).trim()
    if (value) out[name] = value
  }
  return out as CSSProperties
}

/**
 * Portals must escape overflow / opacity ancestors. Prefer `document.body` and
 * re-apply theme tokens from `.theme-root` (inline vars from ThemeColorProvider).
 * A bare `<div class="theme">` without those tokens paints transparent panels.
 * A fullscreen element is its own top layer: a menu on `document.body` is not
 * painted. Mount inside that element so the dropdown stays on screen.
 */
export function resolveThemePortalMount(anchor: HTMLElement | null | undefined): {
  parent: HTMLElement
  wrapStyle: CSSProperties
} {
  const themeRoot =
    (document.querySelector('.theme-root') as HTMLElement | null) ??
    (anchor?.closest('.theme') as HTMLElement | null) ??
    null
  const fullscreen = document.fullscreenElement

  return {
    parent: fullscreen instanceof HTMLElement ? fullscreen : document.body,
    wrapStyle: collectThemePortalStyle(themeRoot),
  }
}
