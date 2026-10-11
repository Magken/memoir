import type { ThemePalette } from '../theme/colorPalettes'

/** Theme-mapped Zdog face colors — ref.3d-shapes-1 palette slots. */
export type Shape3dPalette = {
  primary: string
  secondary: string
  tertiary: string
  quaternary: string
  highlight: string
  surface: string
}

export function shape3dPaletteFromTheme(palette: ThemePalette): Shape3dPalette {
  return {
    primary: palette.accent,
    secondary: palette.text,
    tertiary: palette.focus,
    quaternary: palette.warning,
    /** Bright fill slot — ref yellow; not `accentText` (too dark for 3D faces). */
    highlight: palette.glowInkMid,
    surface: palette.surfaceRaised,
  }
}
