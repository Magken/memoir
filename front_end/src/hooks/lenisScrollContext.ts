import type Lenis from 'lenis'
import { createContext, useContext, type RefObject } from 'react'

export type LenisScrollContextValue = {
  lenisRef: RefObject<Lenis | null>
  lenis: Lenis | null
}

export const LenisScrollContext = createContext<LenisScrollContextValue | null>(null)

export function useLenisScrollContext() {
  const value = useContext(LenisScrollContext)
  if (!value) {
    throw new Error('useLenisScrollContext must be used within LenisScrollProvider')
  }
  return value
}

/** Optional — hooks that work with or without Lenis (e.g. nested scroll hosts). */
export function useLenisScrollContextOptional() {
  return useContext(LenisScrollContext)
}
