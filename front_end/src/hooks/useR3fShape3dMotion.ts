import {
  useCallback,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'
import { useVisualActivity } from './useVisualActivity'
import { motionLoopShouldRun, resolveR3fFrameloop } from '../lib/visualActivity'
import {
  createShape3dFaceTween,
  createShape3dSpinState,
  shape3dDragRotation,
  shape3dFaceTweenStep,
  shape3dSpinStep,
  type Shape3dFaceTween,
  type Shape3dSpinState,
} from '../lib/shape3d/shape3dAnimate'
import { CSS_SHAPE3D_REST_ROTATION } from '../lib/shape3d/cssShape3dMath'
import { cssShape3dFaceNavKind, type CssShape3dKind } from '../lib/shape3d/cssShape3dTypes'
import type { Shape3dViewRotation } from '../lib/shape3d/shape3dFrame'
import { shape3dFaceView } from '../lib/shape3d/shape3dFaces'
import type { Shape3dFaceId } from '../lib/shape3d/shape3dTypes'

type UseR3fShape3dMotionOptions = {
  kind: CssShape3dKind
  face?: Shape3dFaceId
  autoSpin?: boolean
  drag?: boolean
}

const REST_VIEW: Shape3dViewRotation = {
  x: (CSS_SHAPE3D_REST_ROTATION.rx * Math.PI) / 180,
  y: (CSS_SHAPE3D_REST_ROTATION.ry * Math.PI) / 180,
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useR3fShape3dMotion({
  kind,
  face,
  autoSpin = false,
  drag = true,
}: UseR3fShape3dMotionOptions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<Shape3dViewRotation>({ ...REST_VIEW })
  const spinRef = useRef<Shape3dSpinState>(createShape3dSpinState(false))
  const tweenRef = useRef<Shape3dFaceTween | null>(null)
  const dragStartRef = useRef<Shape3dViewRotation>({ ...REST_VIEW })
  const dragOriginRef = useRef({ x: 0, y: 0 })
  const draggingRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const tickRef = useRef<() => void>(() => {})
  const reducedMotion = prefersReducedMotion()
  const visuallyActive = useVisualActivity(containerRef)
  const visuallyActiveRef = useRef(visuallyActive)
  visuallyActiveRef.current = visuallyActive
  const spinning = Boolean(autoSpin && !face && !reducedMotion)
  const frameloop = resolveR3fFrameloop('always', visuallyActive, spinning)

  useEffect(() => {
    if (face) {
      spinRef.current.isSpinning = false
      tweenRef.current = createShape3dFaceTween(viewRef.current, shape3dFaceView(cssShape3dFaceNavKind(kind), face))
      if (rafRef.current === null && !reducedMotion) {
        rafRef.current = requestAnimationFrame(() => tickRef.current())
      }
      return
    }

    tweenRef.current = null
    spinRef.current.isSpinning = autoSpin && !reducedMotion
    if (rafRef.current === null && !reducedMotion) {
      rafRef.current = requestAnimationFrame(() => tickRef.current())
    }
  }, [autoSpin, face, kind, reducedMotion])

  useEffect(() => {
    if (reducedMotion) return

    function loopNeeded() {
      return motionLoopShouldRun({
        visuallyActive: visuallyActiveRef.current,
        spinning: spinRef.current.isSpinning,
        tweening: Boolean(tweenRef.current),
        dragging: draggingRef.current,
      })
    }

    function tick() {
      const tween = tweenRef.current
      if (tween) {
        const next = shape3dFaceTweenStep(tween)
        viewRef.current = next ?? tween.to
        if (!next) tweenRef.current = null
      } else if (spinRef.current.isSpinning) {
        viewRef.current = shape3dSpinStep(spinRef.current)
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
  }, [reducedMotion])

  useEffect(() => {
    if (!visuallyActive || reducedMotion) return
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => tickRef.current())
  }, [reducedMotion, visuallyActive])

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!drag || reducedMotion) return
      draggingRef.current = true
      spinRef.current.isSpinning = false
      tweenRef.current = null
      dragStartRef.current = { ...viewRef.current }
      dragOriginRef.current = { x: event.clientX, y: event.clientY }
      event.currentTarget.setPointerCapture(event.pointerId)
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => tickRef.current())
      }
    },
    [drag, reducedMotion],
  )

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    const moveX = event.clientX - dragOriginRef.current.x
    const moveY = event.clientY - dragOriginRef.current.y
    if (moveX === 0 && moveY === 0) return
    const displaySize = Math.min(event.currentTarget.clientWidth, event.currentTarget.clientHeight)
    viewRef.current = shape3dDragRotation(dragStartRef.current, moveX, moveY, displaySize)
  }, [])

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      draggingRef.current = false
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      if (autoSpin && !reducedMotion && !face) {
        spinRef.current.isSpinning = true
      }
    },
    [autoSpin, face, reducedMotion],
  )

  return {
    containerRef,
    viewRef: viewRef as RefObject<Shape3dViewRotation>,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    frameloop,
  }
}
