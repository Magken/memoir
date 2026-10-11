import type { LenisOptions } from 'lenis'
import type { ReactNode } from 'react'
import { LenisScrollContext } from '../hooks/lenisScrollContext'
import { useLenisScroll } from '../hooks/useLenisScroll'

type LenisScrollProviderProps = {
  children: ReactNode
  options?: LenisOptions
}

/** Enables Lenis smooth scrolling for the app shell. */
export function LenisScrollProvider({ children, options }: LenisScrollProviderProps) {
  const scroll = useLenisScroll(options)

  return <LenisScrollContext.Provider value={scroll}>{children}</LenisScrollContext.Provider>
}
