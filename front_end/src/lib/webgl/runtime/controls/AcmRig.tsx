/**
 * Ambient camera motion: after OrbitControls seats the rest pose, slide around
 * a fixed look-at toward the pointer. Off while a crane plays.
 *
 * When `restPose` is set (landing), the camera cannot leave that focal point —
 * rotate and pan are soft-capped. Lock off peeks from the live orbit rest the
 * same way: restore that rest before OrbitControls (−2), peek after it (0), so
 * the offset cannot leak into the spherical and walk with the mouse.
 * Pointer is sampled on `window` (capture) against the stage host.
 * Frame priority 0: after orbit (−1), before EffectComposer (1).
 */
import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  ACM_LOCK_IN,
  ACM_STAGE_CLASS,
  ACM_UNLOCK_IN,
  acmFollow,
  acmLerpTriple,
  acmNdcFromClient,
  acmPanTilt,
  acmPeekFromRest,
  acmShouldRestorePeek,
  acmWakeIntensity,
  type AcmRestPose,
} from './acm'

type AcmRigProps = {
  intensity: number
  enabled?: boolean
  /** Home pose to lock around. Omit in the editor so free orbit still works. */
  restPose?: AcmRestPose
}

type PointerSample = {
  x: number
  y: number
  inside: boolean
  dragging: boolean
}

type OrbitLook = {
  target?: { x: number; y: number; z: number }
}

function acmStageElement(canvas: HTMLElement): HTMLElement {
  const stage = canvas.closest(`.${ACM_STAGE_CLASS}`)
  if (stage instanceof HTMLElement) return stage
  if (canvas.parentElement instanceof HTMLElement) return canvas.parentElement
  return canvas
}

export function AcmRig({ intensity, enabled = true, restPose }: AcmRigProps) {
  const camera = useThree((state) => state.camera)
  const get = useThree((state) => state.get)
  const invalidate = useThree((state) => state.invalidate)
  const nx = useRef(0)
  const ny = useRef(0)
  const liveGain = useRef(0)
  const lockBlend = useRef(0)
  const lockFrom = useRef<AcmRestPose | null>(null)
  const lockKey = useRef('')
  const freeRest = useRef<AcmRestPose | null>(null)
  const peeked = useRef(false)
  const unlockBlend = useRef(0)
  const sample = useRef<PointerSample>({ x: 0, y: 0, inside: false, dragging: false })

  useEffect(() => {
    if (enabled) return
    peeked.current = false
    freeRest.current = null
  }, [enabled])

  useEffect(() => {
    const read = (event: PointerEvent, dragging: boolean) => {
      const host = acmStageElement(get().gl.domElement)
      const mapped = acmNdcFromClient(event.clientX, event.clientY, host.getBoundingClientRect())
      sample.current = {
        x: mapped.x,
        y: mapped.y,
        inside: mapped.inside,
        dragging,
      }
      invalidate()
    }
    const onMove = (event: PointerEvent) => {
      read(event, event.buttons !== 0)
    }
    const onDown = (event: PointerEvent) => {
      read(event, true)
    }
    const onUp = (event: PointerEvent) => {
      read(event, event.buttons !== 0)
    }
    window.addEventListener('pointermove', onMove, { capture: true })
    window.addEventListener('pointerdown', onDown, { capture: true })
    window.addEventListener('pointerup', onUp, { capture: true })
    return () => {
      window.removeEventListener('pointermove', onMove, { capture: true })
      window.removeEventListener('pointerdown', onDown, { capture: true })
      window.removeEventListener('pointerup', onUp, { capture: true })
    }
  }, [get, invalidate])

  useFrame(() => {
    if (!peeked.current) return
    const live: [number, number, number] = [camera.position.x, camera.position.y, camera.position.z]
    if (!acmShouldRestorePeek(enabled, freeRest.current, live)) {
      peeked.current = false
      freeRest.current = null
      return
    }
    const rest = freeRest.current
    if (!rest) return
    camera.position.set(rest.position[0], rest.position[1], rest.position[2])
    camera.lookAt(rest.target[0], rest.target[1], rest.target[2])
    peeked.current = false
  }, -2)

  useFrame((state, dt) => {
    if (!enabled) {
      nx.current = 0
      ny.current = 0
      liveGain.current = 0
      lockBlend.current = 0
      unlockBlend.current = 0
      lockFrom.current = null
      lockKey.current = ''
      freeRest.current = null
      peeked.current = false
      return
    }
    liveGain.current = acmWakeIntensity(liveGain.current, intensity, dt)
    const gain = liveGain.current
    unlockBlend.current = acmFollow(unlockBlend.current, 1, dt, ACM_UNLOCK_IN)
    if (unlockBlend.current > 0.995) unlockBlend.current = 1
    const locked = Boolean(restPose)
    const dragging = sample.current.dragging
    const live = gain > 0 && (locked || !dragging)
    const fromHost = sample.current.inside
    const wantX = live ? (fromHost ? sample.current.x : state.pointer.x) : 0
    const wantY = live ? (fromHost ? sample.current.y : state.pointer.y) : 0
    const nRate = !locked && unlockBlend.current < 1 ? ACM_UNLOCK_IN : undefined
    nx.current = acmFollow(nx.current, wantX, dt, nRate)
    ny.current = acmFollow(ny.current, wantY, dt, nRate)
    if (Math.abs(nx.current) < 1e-4) nx.current = 0
    if (Math.abs(ny.current) < 1e-4) ny.current = 0
    if (restPose) {
      const key = `${restPose.position.join(',')}|${restPose.target.join(',')}`
      if (lockKey.current !== key || !lockFrom.current) {
        const orbit = (state.controls as OrbitLook | null)?.target
        lockKey.current = key
        lockBlend.current = 0
        lockFrom.current = {
          position: [camera.position.x, camera.position.y, camera.position.z],
          target: orbit
            ? [orbit.x, orbit.y, orbit.z]
            : [restPose.target[0], restPose.target[1], restPose.target[2]],
        }
      }
      lockBlend.current = acmFollow(lockBlend.current, 1, dt, ACM_LOCK_IN)
      if (lockBlend.current > 0.995) lockBlend.current = 1
      const peek = acmPeekFromRest(restPose, nx.current, ny.current, gain)
      const from = lockFrom.current
      if (!from) return
      const position = acmLerpTriple(from.position, peek.position, lockBlend.current)
      const look = acmLerpTriple(from.target, peek.target, lockBlend.current)
      camera.position.set(position[0], position[1], position[2])
      camera.lookAt(look[0], look[1], look[2])
      invalidate()
      return
    }
    const target = (state.controls as OrbitLook | null)?.target
    if (target) {
      const rest: AcmRestPose = {
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [target.x, target.y, target.z],
      }
      freeRest.current = rest
      if (dragging || gain <= 0 || (nx.current === 0 && ny.current === 0)) return
      const orbitPeek = acmPeekFromRest(rest, nx.current, ny.current, gain)
      const u = unlockBlend.current
      const position = acmLerpTriple(rest.position, orbitPeek.position, u)
      const look = acmLerpTriple(rest.target, orbitPeek.target, u)
      camera.position.set(position[0], position[1], position[2])
      camera.lookAt(look[0], look[1], look[2])
      peeked.current = true
      invalidate()
      return
    }
    if (gain <= 0 || (nx.current === 0 && ny.current === 0)) return
    const { yaw, pitch } = acmPanTilt(nx.current, ny.current, gain)
    const u = unlockBlend.current
    camera.rotateY(yaw * u)
    camera.rotateX(pitch * u)
    invalidate()
  })

  return null
}
