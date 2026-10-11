import { useTexture } from '@react-three/drei'
import { curvedMonitorStillSrcs, decodeCurvedMonitorStills } from './stills'

let preloadPromise: Promise<void> | null = null

/**
 * Warm drei's texture cache + browser-decode the extras stills.
 * Safe to call from Home chunk eval / `%`→V — no Canvas, no second WebGL context.
 */
export function preloadCurvedMonitorStills(): Promise<void> {
  if (preloadPromise) return preloadPromise
  if (typeof window === 'undefined') {
    preloadPromise = Promise.resolve()
    return preloadPromise
  }
  for (const src of curvedMonitorStillSrcs()) {
    useTexture.preload(src)
  }
  preloadPromise = decodeCurvedMonitorStills()
  return preloadPromise
}
