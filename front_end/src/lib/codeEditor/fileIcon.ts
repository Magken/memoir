import { themeIcons } from 'seti-icons'
import { basename } from './workspace'

/**
 * Monaco has no file-explorer icons. VS Code uses Seti (seti-ui).
 * `seti-icons` packages those SVGs; `themeIcons` remaps Seti color keywords
 * onto this repo’s theme CSS variables so icons follow the active palette.
 */

const themedGetIcon = themeIcons({
  blue: 'var(--theme-info)',
  grey: 'var(--theme-text-muted)',
  'grey-light': 'var(--theme-text-muted)',
  green: 'var(--theme-success)',
  orange: 'var(--theme-warning)',
  pink: 'var(--theme-accent)',
  purple: 'var(--theme-accent)',
  red: 'var(--theme-error)',
  white: 'var(--theme-text)',
  yellow: 'var(--theme-warning)',
  ignore: 'var(--theme-text-muted)',
})

export type SetiFileIcon = {
  /** Raw Seti SVG markup (viewBox 0 0 32 32) */
  svg: string
  /** Theme CSS color (usually a `var(--theme-*)`) */
  color: string
}

/** Resolve a Seti glyph + theme-tinted color for a workspace path. */
export function fileIconForPath(path: string): SetiFileIcon {
  const name = basename(path) || path
  return themedGetIcon(name)
}

/** Inject currentColor so the host `color` style paints the glyph. */
export function setiSvgWithCurrentColor(svg: string): string {
  if (svg.includes('fill=')) return svg
  return svg.replace('<svg', '<svg fill="currentColor"')
}
