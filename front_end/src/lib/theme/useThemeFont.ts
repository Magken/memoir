import { useContext } from 'react'
import { ThemeFontContext } from './themeFontContext'

export function useThemeFont() {
  const ctx = useContext(ThemeFontContext)
  if (!ctx) {
    throw new Error('useThemeFont must be used within ThemeFontProvider')
  }
  return ctx
}
