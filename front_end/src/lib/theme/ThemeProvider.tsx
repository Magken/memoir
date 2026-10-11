import type { ReactNode } from 'react'
import { ThemeColorProvider, type ThemePageBg } from './ThemeColorProvider'
import { ThemeFontProvider } from './ThemeFontProvider'
import type { ThemePaletteId } from './colorPalettes'

type ThemeProviderProps = {
  children: ReactNode
  pageBg?: ThemePageBg
  /** Locks palette for this tree without writing localStorage (LCL → grassDark). */
  forcedPaletteId?: ThemePaletteId
}

/** Palette + font stack — use instead of ThemeColorProvider alone. */
export function ThemeProvider({ children, pageBg = 'solid', forcedPaletteId }: ThemeProviderProps) {
  return (
    <ThemeColorProvider pageBg={pageBg} forcedPaletteId={forcedPaletteId}>
      <ThemeFontProvider>{children}</ThemeFontProvider>
    </ThemeColorProvider>
  )
}
