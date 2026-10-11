import { createContext } from 'react'
import type Lenis from 'lenis'
import type { GsapPageTiming } from './gsapPageTiming'

export type GsapPageContextValue = {
  timing: GsapPageTiming
  reducedMotion: boolean
  refreshScroll: () => void
  scrollTo: (
    target?: number | string | HTMLElement,
    scrollOptions?: Parameters<Lenis['scrollTo']>[1],
  ) => void
}

export const GsapPageContext = createContext<GsapPageContextValue | null>(null)
