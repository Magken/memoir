import type { CSSProperties } from 'react'
import type { ThemePalette } from './colorPalettes'

function pageBgIsDark(pageBg: string): boolean {
  const hex = pageBg.startsWith('#') ? pageBg.slice(1) : pageBg
  if (hex.length < 6) return false
  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 < 140
}

/** Maps palette tokens → `--theme-*` CSS custom properties (inline on `.theme` root). */
export function buildPaletteVars(palette: ThemePalette): CSSProperties {
  return {
    '--theme-page-bg': palette.pageBg,
    '--theme-bg': palette.pageBg,
    '--theme-page-bg-texture-blend': pageBgIsDark(palette.pageBg) ? 'multiply' : 'soft-light',
    '--theme-surface': palette.surface,
    '--theme-surface-raised': palette.surfaceRaised,
    '--theme-surface-inset': palette.surfaceInset,
    '--theme-border': palette.border,
    '--theme-border-strong': palette.borderStrong,
    '--theme-text': palette.text,
    '--theme-text-muted': palette.textMuted,
    '--theme-accent': palette.accent,
    '--theme-accent-text': palette.accentText,
    '--theme-focus': palette.focus,
    '--theme-accent-border': palette.accentBorder,
    '--theme-complement': palette.complement,
    '--theme-complement-bg': palette.complementBg,
    '--theme-complement-border': palette.complementBorder,
    '--theme-success': palette.success,
    '--theme-success-bg': palette.successBg,
    '--theme-success-border': palette.successBorder,
    '--theme-error': palette.error,
    '--theme-error-bg': palette.errorBg,
    '--theme-error-border': palette.errorBorder,
    '--theme-warning': palette.warning,
    '--theme-warning-bg': palette.warningBg,
    '--theme-warning-border': palette.warningBorder,
    '--theme-info': palette.info,
    '--theme-info-bg': palette.infoBg,
    '--theme-info-border': palette.infoBorder,
    '--theme-shadow-outer': palette.shadowOuter,
    '--theme-shadow-inner': palette.shadowInner,
    '--theme-shadow-highlight': palette.shadowHighlight,
    '--theme-shadow-brutal': palette.shadowBrutal,
    '--theme-shadow-brutal-offset': '10px',
    '--theme-shadow-brutal-offset-sm': '6px',
    '--theme-glow-border-rest': palette.glowBorderRest,
    '--theme-glow-border-from': palette.glowBorderFrom,
    '--theme-glow-border-mid': palette.glowBorderMid,
    '--theme-glow-shadow': palette.glowShadow,
    '--theme-glow-ink-from': palette.glowInkFrom,
    '--theme-glow-ink-mid': palette.glowInkMid,
    '--theme-glow-ink-shadow': palette.glowInkShadow,
    ...(palette.sceneYellowBright
      ? { '--theme-scene-yellow-bright': palette.sceneYellowBright }
      : {}),
    ...(palette.sceneYellow ? { '--theme-scene-yellow': palette.sceneYellow } : {}),
    ...(palette.sceneOrange ? { '--theme-scene-orange': palette.sceneOrange } : {}),
  } as CSSProperties
}
