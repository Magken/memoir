import { getDefaultTheme, type Theme } from '@glideapps/glide-data-grid'
import type { ThemePalette } from '../theme/colorPalettes'

function parseRgb(color: string): { r: number; g: number; b: number } | null {
  const trimmed = color.trim()
  if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1)
    if (hex.length !== 6) return null
    return {
      r: Number.parseInt(hex.slice(0, 2), 16),
      g: Number.parseInt(hex.slice(2, 4), 16),
      b: Number.parseInt(hex.slice(4, 6), 16),
    }
  }
  const rgbMatch = trimmed.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i)
  if (rgbMatch) {
    return {
      r: Number.parseFloat(rgbMatch[1]),
      g: Number.parseFloat(rgbMatch[2]),
      b: Number.parseFloat(rgbMatch[3]),
    }
  }
  return null
}

/** Translucent selection wash — Glide blends accentLight over cells. */
export function accentTint(accent: string, alpha = 0.14): string {
  const rgb = parseRgb(accent)
  if (!rgb) return accent
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

export function buildGlideTheme(palette: ThemePalette): Theme {
  const base = getDefaultTheme()
  const accentLight = accentTint(palette.accent, 0.14)
  const fontFamily =
    typeof document !== 'undefined'
      ? getComputedStyle(document.querySelector('.theme') ?? document.documentElement).fontFamily
      : base.fontFamily

  return {
    ...base,
    accentColor: palette.accent,
    accentFg: palette.accentText,
    accentLight,
    textDark: palette.text,
    textMedium: palette.textMuted,
    textLight: palette.textMuted,
    textBubble: palette.text,
    bgIconHeader: palette.surfaceRaised,
    fgIconHeader: palette.textMuted,
    textHeader: palette.text,
    textHeaderSelected: palette.accentText,
    bgCell: palette.surface,
    bgCellMedium: palette.surfaceRaised,
    bgHeader: palette.surfaceRaised,
    bgHeaderHasFocus: palette.surfaceInset,
    bgHeaderHovered: palette.surfaceInset,
    bgBubble: palette.surface,
    bgBubbleSelected: palette.surfaceRaised,
    bgSearchResult: accentTint(palette.accent, 0.22),
    borderColor: palette.border,
    drilldownBorder: palette.border,
    horizontalBorderColor: palette.border,
    headerBottomBorderColor: palette.border,
    linkColor: palette.accent,
    resizeIndicatorColor: palette.accent,
    fontFamily,
    roundingRadius: 4,
    cellHorizontalPadding: 8,
    cellVerticalPadding: 6,
    headerFontStyle: '600 13px',
    baseFontStyle: '13px',
    editorFontSize: '13px',
    lineHeight: 1.35,
  }
}

export function glideThemeCssVars(palette: ThemePalette): Record<string, string> {
  const theme = buildGlideTheme(palette)
  return {
    '--gdg-accent-color': theme.accentColor,
    '--gdg-accent-fg': theme.accentFg,
    '--gdg-accent-light': theme.accentLight,
    '--gdg-text-dark': theme.textDark,
    '--gdg-text-medium': theme.textMedium,
    '--gdg-text-light': theme.textLight,
    '--gdg-bg-cell': theme.bgCell,
    '--gdg-bg-header': theme.bgHeader,
    '--gdg-border-color': theme.borderColor,
    '--gdg-link-color': theme.linkColor,
    '--gdg-resize-indicator-color': theme.resizeIndicatorColor ?? theme.accentColor,
  }
}
