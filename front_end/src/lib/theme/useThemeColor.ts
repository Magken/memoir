import { useContext } from 'react'
import { ThemeColorContext } from './themeColorContext'

export function useThemeColor() {
  const ctx = useContext(ThemeColorContext)
  if (!ctx) {
    throw new Error('useThemeColor must be used within ThemeColorProvider')
  }
  return ctx
}
