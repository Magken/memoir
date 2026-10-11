import { useEffect, useRef } from 'react'
import Zdog from 'zdog'
import type { Illustration } from 'zdog'
import { useVisualActivity } from './useVisualActivity'
import { useThemeColor } from '../lib/theme'
import { motionLoopShouldRun } from '../lib/visualActivity'
import {
  buildShape3dGallery,
  buildShape3dSolid,
  SHAPE3D_SCENE_SIZE,
  type Shape3dSolid,
} from '../lib/shape3d/shape3dBuilders'
import {
  createShape3dFaceTween,
  createShape3dSpinState,
  shape3dDragRotation,
  shape3dFaceTweenStep,
  shape3dSpinStep,
  type Shape3dFaceTween,
  type Shape3dSpinState,
} from '../lib/shape3d/shape3dAnimate'
import { shape3dDefaultFace, shape3dFaceView } from '../lib/shape3d/shape3dFaces'
import { shape3dPaletteFromTheme } from '../lib/shape3d/shape3dPalette'
import type { Shape3dFaceId, Shape3dKind } from '../lib/shape3d/shape3dTypes'
import type { Shape3dViewRotation } from '../lib/shape3d/shape3dFrame'

type UseShape3dIllustrationOptions = {
  kind: Shape3dKind
  mode?: 'single' | 'gallery'
  face?: Shape3dFaceId
  autoSpin?: boolean
  drag?: boolean
  scale?: number
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useShape3dIllustration({
  kind,
  mode = 'single',
  face,
  autoSpin = true,
  drag = true,
  scale = 8,
}: UseShape3dIllustrationOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { palette } = useThemeColor()

  const illoRef = useRef<Illustration | null>(null)
  const solidsRef = useRef<Shape3dSolid[]>([])
  const viewRef = useRef<Shape3dViewRotation>({ x: 0, y: 0 })
  const spinRef = useRef<Shape3dSpinState>(createShape3dSpinState(false))
  const tweenRef = useRef<Shape3dFaceTween | null>(null)
  const displaySizeRef = useRef(96)
  const dragStartRef = useRef<Shape3dViewRotation>({ x: 0, y: 0 })
  const rafRef = useRef<number | null>(null)
  const tickRef = useRef<() => void>(() => {})
  const draggingRef = useRef(false)
  const autoSpinRef = useRef(autoSpin)
  const faceRef = useRef(face)
  const reducedMotion = prefersReducedMotion()
  const visuallyActive = useVisualActivity(canvasRef)
  const visuallyActiveRef = useRef(visuallyActive)
  visuallyActiveRef.current = visuallyActive

  autoSpinRef.current = autoSpin
  faceRef.current = face

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const colors = shape3dPaletteFromTheme(palette)
    const illo = new Zdog.Illustration({
      element: canvas,
      scale,
      resize: true,
      dragRotate: false,
      onResize(width, height) {
        displaySizeRef.current = Math.min(width, height)
        this.zoom = Math.floor(displaySizeRef.current / SHAPE3D_SCENE_SIZE)
      },
    })

    illoRef.current = illo
    solidsRef.current =
      mode === 'gallery'
        ? buildShape3dGallery(illo, colors)
        : [buildShape3dSolid(illo, kind, colors, 'single')]

    const initialFace = faceRef.current
    if (initialFace) {
      viewRef.current = shape3dFaceView(kind, initialFace)
    } else {
      viewRef.current = { x: 0, y: 0 }
    }

    spinRef.current = createShape3dSpinState(
      autoSpinRef.current && !initialFace && !reducedMotion,
    )
    tweenRef.current = null

    let dragger: InstanceType<typeof Zdog.Dragger> | null = null
    if (drag && !reducedMotion) {
      dragger = new Zdog.Dragger({
        startElement: canvas,
        onDragStart() {
          draggingRef.current = true
          spinRef.current.isSpinning = false
          tweenRef.current = null
          dragStartRef.current = { ...viewRef.current }
          if (rafRef.current === null) {
            rafRef.current = requestAnimationFrame(() => tickRef.current())
          }
        },
        onDragMove(_pointer, moveX, moveY) {
          viewRef.current = shape3dDragRotation(
            dragStartRef.current,
            moveX,
            moveY,
            displaySizeRef.current,
          )
        },
        onDragEnd() {
          draggingRef.current = false
        },
      })
    }

    function loopNeeded() {
      return motionLoopShouldRun({
        visuallyActive: visuallyActiveRef.current,
        spinning: spinRef.current.isSpinning,
        tweening: Boolean(tweenRef.current),
        dragging: draggingRef.current,
      })
    }

    function tick() {
      const illoInstance = illoRef.current
      const solids = solidsRef.current
      if (!illoInstance) return

      const tween = tweenRef.current
      if (tween) {
        const next = shape3dFaceTweenStep(tween)
        viewRef.current = next ?? tween.to
        if (!next) tweenRef.current = null
      } else if (spinRef.current.isSpinning) {
        viewRef.current = shape3dSpinStep(spinRef.current)
      }

      solids.forEach((solid) => {
        solid.rotate.set(viewRef.current)
      })

      illoInstance.updateGraph()
      illoInstance.renderGraph()

      if (loopNeeded()) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        rafRef.current = null
      }
    }

    tickRef.current = tick
    tick()

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      void dragger
      illoRef.current = null
      solidsRef.current = []
      canvas.replaceChildren()
    }
  }, [drag, kind, mode, palette, reducedMotion, scale])

  useEffect(() => {
    if (face) {
      spinRef.current.isSpinning = false
      tweenRef.current = createShape3dFaceTween(viewRef.current, shape3dFaceView(kind, face))
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => tickRef.current())
      }
      return
    }

    tweenRef.current = null
    spinRef.current.isSpinning = autoSpin && !reducedMotion
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => tickRef.current())
    }
  }, [autoSpin, face, kind, reducedMotion])

  useEffect(() => {
    if (!visuallyActive) return
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => tickRef.current())
  }, [visuallyActive])

  return { canvasRef, defaultFace: shape3dDefaultFace(kind) }
}
