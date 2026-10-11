import {
  useCallback,
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { normalizeMouseTiltStrength, pointerToTiltAxes } from '../lib/animations/tiltEffects'

type BgParallaxSceneProps = {
  /** Scales pointer shift (`0.25`–`2`, default `1`) */
  strength?: number
  children: ReactNode
  className?: string
}

/** Hover bg parallax — oversized cover image shifts opposite pointer (`--x` / `--y`). */
export function BgParallaxScene({ strength, children, className = '' }: BgParallaxSceneProps) {
  const sceneRef = useRef<HTMLDivElement>(null)
  const pointerRafRef = useRef<number | null>(null)
  const activeRef = useRef(false)

  const applyPointer = useCallback((clientX: number, clientY: number) => {
    const scene = sceneRef.current
    if (!scene || !activeRef.current) return

    const rect = scene.getBoundingClientRect()
    const { x, y } = pointerToTiltAxes(clientX, clientY, rect)
    scene.style.setProperty('--x', x.toFixed(3))
    scene.style.setProperty('--y', y.toFixed(3))
  }, [])

  const onPointerEnter = useCallback(() => {
    activeRef.current = true
    sceneRef.current?.classList.add('theme-bg-parallax-scene--active')
  }, [])

  const onPointerLeave = useCallback(() => {
    activeRef.current = false
    const scene = sceneRef.current
    if (!scene) return

    scene.classList.remove('theme-bg-parallax-scene--active')
    scene.style.setProperty('--x', '0')
    scene.style.setProperty('--y', '0')

    if (pointerRafRef.current !== null) {
      cancelAnimationFrame(pointerRafRef.current)
      pointerRafRef.current = null
    }
  }, [])

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!activeRef.current) return
      if (pointerRafRef.current !== null) return

      const { clientX, clientY } = event
      pointerRafRef.current = requestAnimationFrame(() => {
        applyPointer(clientX, clientY)
        pointerRafRef.current = null
      })
    },
    [applyPointer],
  )

  const parallaxStrength = normalizeMouseTiltStrength(strength)

  return (
    <div
      ref={sceneRef}
      className={['theme-bg-parallax-scene', className].filter(Boolean).join(' ')}
      style={
        {
          ['--bg-parallax-strength' as string]: String(parallaxStrength),
          ['--x' as string]: '0',
          ['--y' as string]: '0',
        } as CSSProperties
      }
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onPointerMove={onPointerMove}
    >
      {children}
    </div>
  )
}
