import { createContext } from 'react'
import type { FontStack, FontStackId } from './fontStacks'

export type ThemeFontContextValue = {
  stackId: FontStackId
  stack: FontStack
  setStackId: (id: FontStackId) => void
  /** Session override for --font-display (display face catalog). */
  displayOverride: string | null
  setDisplayOverride: (family: string | null) => void
}

export const ThemeFontContext = createContext<ThemeFontContextValue | null>(null)
