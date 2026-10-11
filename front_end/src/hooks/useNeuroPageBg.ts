import { useEffect, type RefObject } from 'react'
import { NeuroBackgroundEngine } from '../lib/backgrounds/neuroBackground'

/** Mount WebGL neuro noise on a canvas — ref.background-types-2 */
export function useNeuroPageBg(canvasRef: RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let engine: NeuroBackgroundEngine | null = null
    try {
      engine = new NeuroBackgroundEngine(canvas)
      engine.init()
    } catch {
      return
    }

    return () => {
      engine?.destroy()
    }
  }, [canvasRef])
}
