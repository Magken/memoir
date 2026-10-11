import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { buildFontVars } from './buildFontVars'
import { THEME_DISPLAY_FACE_OVERRIDE_KEY } from './displayFaces'
import {
  DEFAULT_FONT_STACK_ID,
  fontStacks,
  THEME_FONT_STACK_STORAGE_KEY,
  type FontStackId,
} from './fontStacks'
import { ThemeFontContext } from './themeFontContext'

function readStoredFontStackId(): FontStackId {
  if (typeof window === 'undefined') return DEFAULT_FONT_STACK_ID
  const stored = window.localStorage.getItem(THEME_FONT_STACK_STORAGE_KEY)
  if (stored && stored in fontStacks) return stored as FontStackId
  return DEFAULT_FONT_STACK_ID
}

function readDisplayOverride(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(THEME_DISPLAY_FACE_OVERRIDE_KEY)
}

export function ThemeFontProvider({ children }: { children: ReactNode }) {
  const [stackId, setStackIdState] = useState<FontStackId>(readStoredFontStackId)
  const [displayOverride, setDisplayOverrideState] = useState<string | null>(readDisplayOverride)

  const setStackId = useCallback(
    (id: FontStackId) => {
      setStackIdState(id)
      window.localStorage.setItem(THEME_FONT_STACK_STORAGE_KEY, id)
      // Stack pick wins over a stuck Display Faces override so GRAS/Vurify/Brand/Editorial
      // actually show their own --font-display again.
      setDisplayOverrideState(null)
      window.localStorage.removeItem(THEME_DISPLAY_FACE_OVERRIDE_KEY)
    },
    [],
  )

  const setDisplayOverride = useCallback((family: string | null) => {
    setDisplayOverrideState(family)
    if (family) window.localStorage.setItem(THEME_DISPLAY_FACE_OVERRIDE_KEY, family)
    else window.localStorage.removeItem(THEME_DISPLAY_FACE_OVERRIDE_KEY)
  }, [])

  const stack = fontStacks[stackId]
  const effectiveStack = useMemo(
    () =>
      displayOverride
        ? { ...stack, display: displayOverride }
        : stack,
    [stack, displayOverride],
  )
  const fontStyle = useMemo(() => buildFontVars(effectiveStack), [effectiveStack])

  const value = useMemo(
    () => ({ stackId, stack: effectiveStack, setStackId, displayOverride, setDisplayOverride }),
    [stackId, effectiveStack, setStackId, displayOverride, setDisplayOverride],
  )

  useEffect(() => {
    const el = document.documentElement
    const vars = buildFontVars(effectiveStack)
    for (const [key, value] of Object.entries(vars)) {
      if (typeof value === 'string') el.style.setProperty(key, value)
    }
    el.dataset.themeFont = stackId
    if (displayOverride) el.dataset.themeDisplayOverride = '1'
    else delete el.dataset.themeDisplayOverride
    return () => {
      for (const key of Object.keys(vars)) {
        el.style.removeProperty(key)
      }
      delete el.dataset.themeFont
      delete el.dataset.themeDisplayOverride
    }
  }, [effectiveStack, stackId, displayOverride])

  return (
    <ThemeFontContext.Provider value={value}>
      <div className="contents" style={fontStyle}>
        {children}
      </div>
    </ThemeFontContext.Provider>
  )
}
