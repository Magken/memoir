import { createContext } from 'react'
import type { ThemePalette, ThemePaletteId } from './colorPalettes'

export type ThemeColorContextValue = {
  paletteId: ThemePaletteId
  palette: ThemePalette
  setPaletteId: (id: ThemePaletteId) => void
}

export const ThemeColorContext = createContext<ThemeColorContextValue | null>(null)
