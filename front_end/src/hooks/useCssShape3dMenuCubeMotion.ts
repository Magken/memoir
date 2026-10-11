import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { cssShape3dDragDelta, type CssShape3dRotation } from '../lib/shape3d/cssShape3dMath'
import { cssShape3dMenuCubeFaceView } from '../lib/shape3d/cssShape3dMenuCubeViews'

export type CssShape3dMenuCubeMotionMode = 'menu' | 'drag'

type UseCssShape3dMenuCubeMotionOptions = {
  activeFace: string
  mode: CssShape3dMenuCubeMotionMode
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function isInteractivePointerTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(target.closest('button, a, [role="button"], input, textarea, select, label'))
}

export function useCssShape3dMenuCubeMotion({
  activeFace,
  mode,
}: UseCssShape3dMenuCubeMotionOptions) {
  const stageRef = useRef<HTMLDivElement>(null)
  const cubeRef = useRef<HTMLUListElement>(null)
  const rotationRef = useRef<CssShape3dRotation>(cssShape3dMenuCubeFaceView(activeFace))
  const dragPointerRef = useRef({ x: 0, y: 0 })
  const dragStartRotationRef = useRef<CssShape3dRotation>({ rx: 0, ry: 0 })
  const draggingRef = useRef(false)
  const [motionState, setMotionState] = useState<'idle' | 'drag' | 'tween'>('idle')
  const reducedMotion = prefersReducedMotion()

  const applyRotation = useCallback((next: CssShape3dRotation) => {
    rotationRef.current = next
    const cube = cubeRef.current
    if (!cube) return
    cube.style.setProperty('--css-menu-cube-rx', `${next.rx.toFixed(3)}deg`)
    cube.style.setProperty('--css-menu-cube-ry', `${next.ry.toFixed(3)}deg`)
  }, [])

  useEffect(() => {
    if (mode !== 'drag') return
    applyRotation(rotationRef.current)
  }, [applyRotation, mode])

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (mode !== 'drag' || reducedMotion || isInteractivePointerTarget(event.target)) return
      draggingRef.current = true
      dragStartRotationRef.current = { ...rotationRef.current }
      dragPointerRef.current = { x: event.clientX, y: event.clientY }
      setMotionState('drag')
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [mode, reducedMotion],
  )

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return
      const moveX = event.clientX - dragPointerRef.current.x
      const moveY = event.clientY - dragPointerRef.current.y
      if (moveX === 0 && moveY === 0) return
      const displaySize = Math.min(event.currentTarget.clientWidth, event.currentTarget.clientHeight)
      const delta = cssShape3dDragDelta(moveX, moveY, displaySize)
      applyRotation({
        rx: dragStartRotationRef.current.rx + delta.rx,
        ry: dragStartRotationRef.current.ry + delta.ry,
      })
    },
    [applyRotation],
  )

  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    draggingRef.current = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setMotionState('idle')
  }, [])

  return {
    stageRef,
    cubeRef,
    motionState: mode === 'drag' ? motionState : 'idle',
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
  }
}
