import { useEffect, useState } from 'react'
import type { NanoStackedMenuItem } from '../menus/nanoStackedMenu'

/**
 * Bridges the runtime theme (`--theme-*` custom props on the `.theme` root) into
 * chart libraries. Nivo renders SVG and can read CSS vars, but ECharts paints to
 * canvas and needs *resolved* hex colors — so we read computed styles once and
 * re-read on palette changes (MutationObserver on the `.theme` element).
 */

export type ChartTheme = {
  /** Categorical series colors (accent → info → success → warning → error). */
  palette: string[]
  text: string
  textMuted: string
  grid: string
  border: string
  surface: string
  surfaceRaised: string
  background: string
}

const FALLBACK: ChartTheme = {
  palette: ['#6366f1', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444'],
  text: '#1c1917',
  textMuted: '#78716c',
  grid: '#e7e5e4',
  border: '#e7e5e4',
  surface: '#ffffff',
  surfaceRaised: '#ffffff',
  background: '#ffffff',
}

function themeRoot(): HTMLElement | null {
  if (typeof document === 'undefined') return null
  return (document.querySelector('.theme') as HTMLElement | null) ?? document.documentElement
}

function readVar(el: HTMLElement, name: string, fallback: string): string {
  const value = getComputedStyle(el).getPropertyValue(name).trim()
  return value || fallback
}

/** Read the current theme colors as resolved values (safe for canvas). */
export function readChartTheme(): ChartTheme {
  const el = themeRoot()
  if (!el) return FALLBACK
  const accent = readVar(el, '--theme-accent', FALLBACK.palette[0])
  const info = readVar(el, '--theme-info', FALLBACK.palette[1])
  const success = readVar(el, '--theme-success', FALLBACK.palette[2])
  const warning = readVar(el, '--theme-warning', FALLBACK.palette[3])
  const error = readVar(el, '--theme-error', FALLBACK.palette[4])
  const surface = readVar(el, '--theme-surface', FALLBACK.surface)
  return {
    palette: [accent, info, success, warning, error],
    text: readVar(el, '--theme-text', FALLBACK.text),
    textMuted: readVar(el, '--theme-text-muted', FALLBACK.textMuted),
    grid: readVar(el, '--theme-border', FALLBACK.grid),
    border: readVar(el, '--theme-border', FALLBACK.border),
    surface,
    surfaceRaised: readVar(el, '--theme-surface-raised', surface),
    background: readVar(el, '--theme-page-bg', surface),
  }
}

function chartThemesEqual(a: ChartTheme, b: ChartTheme): boolean {
  return (
    a.text === b.text &&
    a.textMuted === b.textMuted &&
    a.grid === b.grid &&
    a.border === b.border &&
    a.surface === b.surface &&
    a.surfaceRaised === b.surfaceRaised &&
    a.background === b.background &&
    a.palette.length === b.palette.length &&
    a.palette.every((color, i) => color === b.palette[i])
  )
}

/** Live theme colors — re-reads when the palette picker mutates the `.theme` root. */
export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState<ChartTheme>(() =>
    typeof window === 'undefined' ? FALLBACK : readChartTheme(),
  )

  useEffect(() => {
    const el = themeRoot()
    if (!el) return
    const update = () => {
      const next = readChartTheme()
      setTheme((prev) => (chartThemesEqual(prev, next) ? prev : next))
    }
    update()
    const observer = new MutationObserver(update)
    observer.observe(el, { attributes: true, attributeFilter: ['style', 'class', 'data-theme'] })
    return () => observer.disconnect()
  }, [])

  return theme
}

/** Nivo `theme` prop built from the live theme (transparent bg, themed axes/tooltip). */
export function nivoChartTheme(t: ChartTheme) {
  return {
    background: 'transparent',
    text: { fill: t.text, fontFamily: 'inherit', fontSize: 12 },
    axis: {
      domain: { line: { stroke: t.border } },
      ticks: { line: { stroke: t.border }, text: { fill: t.textMuted, fontSize: 13, fontWeight: 700 } },
      legend: { text: { fill: t.text, fontSize: 12 } },
    },
    grid: { line: { stroke: t.grid, strokeDasharray: '2 4' } },
    legends: { text: { fill: t.textMuted, fontSize: 11 } },
    tooltip: {
      container: {
        background: t.surfaceRaised,
        color: t.text,
        fontSize: 12,
        borderRadius: 8,
        border: `1px solid ${t.border}`,
        boxShadow: 'none',
      },
    },
    crosshair: { line: { stroke: t.textMuted, strokeWidth: 1, strokeOpacity: 0.5 } },
  }
}

/* Palette presets — reorderings of the theme palette for the ChartPanel chooser. */

export type ChartPalettePreset = { id: string; label: string; build: (t: ChartTheme) => string[] }

export const CHART_PALETTE_PRESETS: readonly ChartPalettePreset[] = [
  { id: 'theme', label: 'Theme', build: (t) => t.palette },
  { id: 'cool', label: 'Cool', build: (t) => [t.palette[1], t.palette[0], t.palette[2], t.palette[4], t.palette[3]] },
  { id: 'warm', label: 'Warm', build: (t) => [t.palette[3], t.palette[4], t.palette[0], t.palette[1], t.palette[2]] },
  { id: 'flip', label: 'Flip', build: (t) => [...t.palette].reverse() },
]

export function chartPaletteById(id: string, t: ChartTheme): string[] {
  const preset = CHART_PALETTE_PRESETS.find((p) => p.id === id) ?? CHART_PALETTE_PRESETS[0]
  return preset.build(t)
}

/** SVG rect swatch for [NanoStackedMenu](../../components/NanoStackedMenu.tsx) palette rails. */
export function chartPaletteSwatch(fill: string, alt: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="${fill}"/></svg>`
  return { src: `data:image/svg+xml,${encodeURIComponent(svg)}`, alt }
}

/** Nano menu items — first series color of each preset as the swatch fill. */
export function chartPaletteMenuItems(t: ChartTheme): NanoStackedMenuItem[] {
  return CHART_PALETTE_PRESETS.map((preset) => ({
    id: preset.id,
    label: preset.label,
    image: chartPaletteSwatch(chartPaletteById(preset.id, t)[0], `${preset.label} palette`),
  }))
}

/* ECharts axis/tooltip helpers — spread into option objects to stay on-theme. */

export function echartsAxisLabel(t: ChartTheme) {
  return { color: t.textMuted, fontSize: 13, fontWeight: 700 as const }
}

/**
 * Axis title — centered along the axis, on-theme. ECharts 6 auto-reserves grid
 * room for axis names (no manual grid padding needed). Spread after `name`.
 */
export function echartsAxisName(t: ChartTheme, axis: 'x' | 'y') {
  return {
    nameLocation: 'middle' as const,
    nameGap: axis === 'x' ? 28 : 48,
    nameTextStyle: { color: t.textMuted, fontSize: 11, fontWeight: 600 as const },
  }
}

export function echartsAxisLine(t: ChartTheme) {
  return { lineStyle: { color: t.border } }
}

export function echartsSplitLine(t: ChartTheme) {
  return { lineStyle: { color: t.grid, type: 'dashed' as const } }
}

export function echartsTooltip(t: ChartTheme) {
  return {
    backgroundColor: t.surfaceRaised,
    borderColor: t.border,
    textStyle: { color: t.text, fontSize: 12 },
  }
}
