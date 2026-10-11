import { useThree } from '@react-three/fiber'
import { useCallback, useRef } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { isPlacePointerButton, shouldPlaceMark } from './placeFromPointer'
import { pickFromIntersections, type RaycastHit } from './cameraPick'

export type { RaycastHit } from './cameraPick'

export type RaycastPickHandler = (hit: RaycastHit | null) => void

export type RaycastPickOptions = {
  enabled?: boolean
  /** Select tool: never places. Place tools: click (not drag) places. */
  toolActive?: boolean
  /** Highlight / region: press-drag; orbit pauses while the pointer is down. */
  dragExpand?: boolean
  onDrawingChange?: (drawing: boolean) => void
  onDrag?: (hit: RaycastHit) => void
  onDragEnd?: (hit: RaycastHit | null) => void
  /** Every move, including Select. Cage spring reads this; it must not set React state. */
  onSurface?: (hit: RaycastHit | null) => void
  onHover?: (hit: RaycastHit | null) => void
}

type OrbitLike = { enableRotate?: boolean; enablePan?: boolean }

function pauseOrbit(controls: unknown, paused: boolean) {
  if (!controls || typeof controls !== 'object') return
  const orbit = controls as OrbitLike
  if ('enableRotate' in orbit) orbit.enableRotate = !paused
  if ('enablePan' in orbit) orbit.enablePan = !paused
}

/** Closest *mesh* from R3F's ray — never overlays, never a fallback `event.point`. */
export function hitFromEvent(event: ThreeEvent<PointerEvent>): RaycastHit | null {
  return pickFromIntersections(event.intersections ?? [])
}

export function useRaycastPick(onPick: RaycastPickHandler, options: boolean | RaycastPickOptions = true) {
  const enabled = typeof options === 'boolean' ? options : options.enabled !== false
  const toolActive = typeof options === 'boolean' ? true : options.toolActive !== false
  const dragExpand = typeof options === 'boolean' ? false : Boolean(options.dragExpand)
  const onDrawingChange = typeof options === 'boolean' ? undefined : options.onDrawingChange
  const onDrag = typeof options === 'boolean' ? undefined : options.onDrag
  const onDragEnd = typeof options === 'boolean' ? undefined : options.onDragEnd
  const onSurface = typeof options === 'boolean' ? undefined : options.onSurface
  const onHover = typeof options === 'boolean' ? undefined : options.onHover
  const down = useRef<{ x: number; y: number } | null>(null)
  const drawing = useRef(false)
  const lastHit = useRef<RaycastHit | null>(null)
  const invalidate = useThree((s) => s.invalidate)
  const controls = useThree((s) => s.controls)

  const onPointerDown = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (!enabled) return
      if (!isPlacePointerButton(event.nativeEvent.button)) return
      down.current = { x: event.nativeEvent.clientX, y: event.nativeEvent.clientY }
      const hit = hitFromEvent(event)
      lastHit.current = hit
      if (!dragExpand || !toolActive || !hit) return
      drawing.current = true
      event.stopPropagation()
      const target = event.nativeEvent.target
      if (target && 'setPointerCapture' in target) {
        ;(target as Element).setPointerCapture(event.nativeEvent.pointerId)
      }
      pauseOrbit(controls, true)
      onDrawingChange?.(true)
      onDrag?.(hit)
      invalidate()
    },
    [controls, dragExpand, enabled, invalidate, onDrag, onDrawingChange, toolActive],
  )

  const onPointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (!enabled) return
      const hit = hitFromEvent(event)
      onSurface?.(hit)
      if (drawing.current) {
        if (!hit) return
        lastHit.current = hit
        event.stopPropagation()
        onDrag?.(hit)
        invalidate()
        return
      }
      if (!toolActive || !onHover) return
      onHover(hit)
      invalidate()
    },
    [enabled, invalidate, onDrag, onHover, onSurface, toolActive],
  )

  const onPointerLeave = useCallback(() => {
    if (!enabled || drawing.current) return
    onSurface?.(null)
    onHover?.(null)
    invalidate()
  }, [enabled, invalidate, onHover, onSurface])

  const onPointerUp = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (!enabled) return
      const start = down.current
      down.current = null
      const up = { x: event.nativeEvent.clientX, y: event.nativeEvent.clientY }
      if (drawing.current) {
        drawing.current = false
        pauseOrbit(controls, false)
        onDrawingChange?.(false)
        const hit = hitFromEvent(event) ?? lastHit.current
        onDragEnd?.(hit)
        lastHit.current = null
        invalidate()
        return
      }
      if (
        !shouldPlaceMark({
          toolActive,
          down: start,
          up,
          button: event.nativeEvent.button,
        })
      )
        return
      event.stopPropagation()
      onPick(hitFromEvent(event))
      invalidate()
    },
    [controls, enabled, invalidate, onDragEnd, onDrawingChange, onPick, toolActive],
  )

  return { onPointerDown, onPointerMove, onPointerUp, onPointerLeave }
}
