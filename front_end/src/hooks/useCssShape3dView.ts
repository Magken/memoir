import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useVisualActivity } from './useVisualActivity'
import { motionLoopShouldRun } from '../lib/visualActivity'
import {
  CSS_SHAPE3D_FACE_TWEEN_MS,
  CSS_SHAPE3D_REST_ROTATION,
  CSS_SHAPE3D_SPIN_DEG_PER_SEC,
  cssShape3dDragDelta,
  cssShape3dLerpRotation,
  cssShape3dViewFromShape,
  easeInOutQuint,
  type CssShape3dRotation,
} from '../lib/shape3d/cssShape3dMath'
import { shape3dFaceView } from '../lib/shape3d/shape3dFaces'
import { cssShape3dFaceNavKind, type CssShape3dKind } from '../lib/shape3d/cssShape3dTypes'
import type { Shape3dFaceId } from '../lib/shape3d/shape3dTypes'

type UseCssShape3dViewOptions = {
  kind: CssShape3dKind
  face?: Shape3dFaceId
  autoSpin?: boolean
  drag?: boolean
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

type FaceTween = {
  from: CssShape3dRotation
  to: CssShape3dRotation
  startedAt: number
  durationMs: number
}

type SpinState = {
  active: boolean
  startedAt: number
  baseRy: number
}

export function useCssShape3dView({ kind, face, autoSpin = false, drag = true }: UseCssShape3dViewOptions) {
  const sceneRef = useRef<HTMLDivElement>(null)
  const rotationRef = useRef<CssShape3dRotation>({ ...CSS_SHAPE3D_REST_ROTATION })
  const tweenRef = useRef<FaceTween | null>(null)
  const spinRef = useRef<SpinState>({ active: false, startedAt: 0, baseRy: CSS_SHAPE3D_REST_ROTATION.ry })
  const dragPointerRef = useRef({ x: 0, y: 0 })
  const draggingRef = useRef(false)
  const pointerRafRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const tickRef = useRef<(now: number) => void>(() => {})
  const [motionState, setMotionState] = useState<'idle' | 'drag' | 'tween' | 'spin'>('idle')
  const reducedMotion = prefersReducedMotion()
  const visuallyActive = useVisualActivity(sceneRef)
  const visuallyActiveRef = useRef(visuallyActive)
  visuallyActiveRef.current = visuallyActive

  const applyRotation = useCallback((next: CssShape3dRotation) => {
    rotationRef.current = next
    const root = sceneRef.current
    if (!root) return
    root.style.setProperty('--css-shape-rx', `${next.rx.toFixed(3)}deg`)
    root.style.setProperty('--css-shape-ry', `${next.ry.toFixed(3)}deg`)
  }, [])

  useEffect(() => {
    applyRotation(rotationRef.current)
  }, [applyRotation])

  useEffect(() => {
    if (face) {
      spinRef.current.active = false
      tweenRef.current = {
        from: { ...rotationRef.current },
        to: cssShape3dViewFromShape(shape3dFaceView(cssShape3dFaceNavKind(kind), face)),
        startedAt: performance.now(),
        durationMs: CSS_SHAPE3D_FACE_TWEEN_MS,
      }
      setMotionState('tween')
      if (rafRef.current === null && !reducedMotion) {
        rafRef.current = requestAnimationFrame((now) => tickRef.current(now))
      }
      return
    }

    tweenRef.current = null
    if (autoSpin && !reducedMotion) {
      spinRef.current = {
        active: true,
        startedAt: performance.now(),
        baseRy: rotationRef.current.ry,
      }
      setMotionState('spin')
    } else {
      spinRef.current.active = false
      setMotionState('idle')
    }
    if (rafRef.current === null && !reducedMotion) {
      rafRef.current = requestAnimationFrame((now) => tickRef.current(now))
    }
  }, [autoSpin, face, kind, reducedMotion])

  useEffect(() => {
    if (reducedMotion) return

    function loopNeeded() {
      return motionLoopShouldRun({
        visuallyActive: visuallyActiveRef.current,
        spinning: spinRef.current.active,
        tweening: Boolean(tweenRef.current),
        dragging: draggingRef.current,
      })
    }

    function tick(now: number) {
      const tween = tweenRef.current
      if (tween) {
        const elapsed = now - tween.startedAt
        const t = easeInOutQuint(Math.min(elapsed / tween.durationMs, 1))
        applyRotation(cssShape3dLerpRotation(tween.from, tween.to, t))
        if (elapsed >= tween.durationMs) {
          tweenRef.current = null
          if (spinRef.current.active) {
            spinRef.current.startedAt = now
            spinRef.current.baseRy = rotationRef.current.ry
            setMotionState('spin')
          } else {
            setMotionState('idle')
          }
        }
      } else if (spinRef.current.active) {
        const elapsedSec = (now - spinRef.current.startedAt) / 1000
        applyRotation({
          rx: CSS_SHAPE3D_REST_ROTATION.rx,
          ry: spinRef.current.baseRy + elapsedSec * CSS_SHAPE3D_SPIN_DEG_PER_SEC,
        })
      }

      if (loopNeeded()) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        rafRef.current = null
      }
    }

    tickRef.current = tick
    if (loopNeeded()) {
      rafRef.current = requestAnimationFrame(tick)
    }
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [applyRotation, reducedMotion])

  useEffect(() => {
    if (!visuallyActive || reducedMotion) return
    if (spinRef.current.active) {
      spinRef.current.startedAt = performance.now()
      spinRef.current.baseRy = rotationRef.current.ry
    }
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame((now) => tickRef.current(now))
  }, [reducedMotion, visuallyActive])

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!drag || reducedMotion) return
      draggingRef.current = true
      spinRef.current.active = false
      tweenRef.current = null
      dragPointerRef.current = { x: event.clientX, y: event.clientY }
      setMotionState('drag')
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [drag, reducedMotion],
  )

  const applyDrag = useCallback(
    (clientX: number, clientY: number, displaySize: number) => {
      const moveX = clientX - dragPointerRef.current.x
      const moveY = clientY - dragPointerRef.current.y
      if (moveX === 0 && moveY === 0) return

      const delta = cssShape3dDragDelta(moveX, moveY, displaySize)
      applyRotation({
        rx: rotationRef.current.rx + delta.rx,
        ry: rotationRef.current.ry + delta.ry,
      })
      dragPointerRef.current = { x: clientX, y: clientY }
    },
    [applyRotation],
  )

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return
      if (pointerRafRef.current !== null) return

      const { clientX, clientY } = event
      const displaySize = Math.min(event.currentTarget.clientWidth, event.currentTarget.clientHeight)
      pointerRafRef.current = requestAnimationFrame(() => {
        applyDrag(clientX, clientY, displaySize)
        pointerRafRef.current = null
      })
    },
    [applyDrag],
  )

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      draggingRef.current = false
      if (pointerRafRef.current !== null) {
        cancelAnimationFrame(pointerRafRef.current)
        pointerRafRef.current = null
      }
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      if (autoSpin && !reducedMotion && !face) {
        spinRef.current = {
          active: true,
          startedAt: performance.now(),
          baseRy: rotationRef.current.ry,
        }
        setMotionState('spin')
        if (rafRef.current === null) {
          rafRef.current = requestAnimationFrame((now) => tickRef.current(now))
        }
      } else {
        setMotionState('idle')
      }
    },
    [autoSpin, face, reducedMotion],
  )

  const sceneStyle = {
    ['--css-shape-rx' as string]: `${rotationRef.current.rx}deg`,
    ['--css-shape-ry' as string]: `${rotationRef.current.ry}deg`,
  } satisfies CSSProperties

  return {
    sceneRef,
    sceneStyle,
    motionState,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
  }
}
