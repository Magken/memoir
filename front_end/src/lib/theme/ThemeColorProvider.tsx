import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  colorPalettes,
  DEFAULT_PALETTE_ID,
  THEME_PALETTE_STORAGE_KEY,
  normalizePaletteId,
  type ThemePaletteId,
} from './colorPalettes'
import { buildPaletteVars } from './buildPaletteVars'
import { ThemeColorContext } from './themeColorContext'

export type ThemePageBg = 'solid' | 'grid' | 'checker'

const pageBgHtmlClass: Record<ThemePageBg, string | null> = {
  solid: null,
  grid: 'theme-page-bg--grid',
  checker: 'theme-page-bg--checker',
}

function readStoredPaletteId(): ThemePaletteId {
  if (typeof window === 'undefined') return DEFAULT_PALETTE_ID
  return normalizePaletteId(window.localStorage.getItem(THEME_PALETTE_STORAGE_KEY))
}

export function ThemeColorProvider({
  children,
  pageBg = 'solid',
  /** Locks the palette for this tree (e.g. LCL → grassDark) without writing localStorage. */
  forcedPaletteId,
}: {
  children: ReactNode
  pageBg?: ThemePageBg
  forcedPaletteId?: ThemePaletteId
}) {
  const [storedPaletteId, setPaletteIdState] = useState<ThemePaletteId>(readStoredPaletteId)
  const paletteId = forcedPaletteId ?? storedPaletteId

  const setPaletteId = useCallback((id: ThemePaletteId) => {
    setPaletteIdState(id)
    window.localStorage.setItem(THEME_PALETTE_STORAGE_KEY, id)
  }, [])

  const palette = colorPalettes[paletteId]
  const rootStyle = useMemo(() => {
    const vars = buildPaletteVars(palette)
    if (pageBg === 'solid') {
      return {
        ...vars,
        backgroundColor: palette.pageBg,
        color: palette.text,
      }
    }
    return {
      ...vars,
      color: palette.text,
    }
  }, [palette, pageBg])

  const value = useMemo(
    () => ({ paletteId, palette, setPaletteId }),
    [paletteId, palette, setPaletteId],
  )

  /* Sync tokens + page bg pattern to <html> (Lenis scroll host) */
  useEffect(() => {
    const el = document.documentElement
    const vars = buildPaletteVars(palette)
    for (const [key, value] of Object.entries(vars)) {
      if (typeof value === 'string') el.style.setProperty(key, value)
    }
    el.dataset.themePalette = paletteId
    el.dataset.pageBg = pageBg

    if (pageBg === 'solid') {
      el.style.backgroundColor = palette.pageBg
    } else {
      el.style.removeProperty('background-color')
    }

    el.classList.remove('theme-page-bg--grid', 'theme-page-bg--checker')
    const htmlClass = pageBgHtmlClass[pageBg]
    if (htmlClass) el.classList.add(htmlClass)

    if (pageBg === 'grid') {
      el.style.setProperty(
        '--theme-page-bg-grid-line',
        `color-mix(in srgb, ${palette.border} 45%, ${palette.pageBg})`,
      )
      el.style.setProperty(
        '--theme-page-bg-grid-major-line',
        `color-mix(in srgb, ${palette.border} 45%, ${palette.pageBg})`,
      )
    } else {
      el.style.removeProperty('--theme-page-bg-grid-line')
      el.style.removeProperty('--theme-page-bg-grid-major-line')
    }

    return () => {
      for (const key of Object.keys(vars)) {
        el.style.removeProperty(key)
      }
      delete el.dataset.themePalette
      delete el.dataset.pageBg
      el.style.removeProperty('background-color')
      el.style.removeProperty('--theme-page-bg-grid-line')
      el.style.removeProperty('--theme-page-bg-grid-major-line')
      el.classList.remove('theme-page-bg--grid', 'theme-page-bg--checker')
    }
  }, [palette, paletteId, pageBg])

  return (
    <ThemeColorContext.Provider value={value}>
      <div className="theme theme-root min-h-svh" style={rootStyle}>
        {children}
      </div>
    </ThemeColorContext.Provider>
  )
}
