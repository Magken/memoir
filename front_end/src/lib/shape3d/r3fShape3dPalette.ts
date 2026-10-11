import type { ThemePalette } from '../theme/colorPalettes'
import type { Shape3dPalette } from './shape3dPalette'

/**
 * R3F fill palette — saturated theme slots safe in light mode.
 * Zdog canvas keeps `shape3dPaletteFromTheme` (text/focus for flat fills).
 */
export function r3fShape3dPaletteFromTheme(palette: ThemePalette): Shape3dPalette {
  return {
    primary: palette.accent,
    secondary: palette.info,
    tertiary: palette.glowInkFrom,
    quaternary: palette.glowInkMid,
    highlight: palette.glowBorderMid,
    surface: palette.surfaceRaised,
  }
}

export function r3fShape3dEdgeColor(palette: ThemePalette): string {
  return palette.text
}
