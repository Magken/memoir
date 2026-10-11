/**
 * Plays a baked camera motion: seat the start, then boom-arc or a straight
 * View-style hop (`journey` = lerpPose), then yield.
 */
import { useLayoutEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { lerpPose, orbitDrivesCamera, poseFromOrbit, type JourneyPose } from './cameraJourney'
import { sampleBoomArc, journeyEase } from './sceneBoomArc'
import { ageAtProgress, craneClock, steerColorMix, steerReverseDone } from '../materials/sceneObjectColor'
import type { SceneMotionKind } from '../../assets/sceneDoc'
import type { ViewPose } from '../../assets/viewPose'

type OrbitLook = {
  object?: {
    position: { set: (x: number, y: number, z: number) => void }
  }
  target: { x: number; y: number; z: number; set: (x: number, y: number, z: number) => void }
  update?: () => void
}

function asOrbitLook(controls: unknown): OrbitLook | null {
  if (!controls || typeof controls !== 'object' || !('target' in controls)) return null
  return controls as OrbitLook
}

function asJourney(pose: ViewPose): JourneyPose {
  return pose.orbit ? poseFromOrbit({ ...pose.orbit, target: pose.target }) : pose
}

function writeJourneyPose(
  camera: {
    position: { set: (x: number, y: number, z: number) => void }
    up: { set: (x: number, y: number, z: number) => void }
    lookAt: (...xyz: number[]) => void
  },
  controls: unknown,
  pose: JourneyPose,
  up?: [number, number, number],
) {
  camera.position.set(...pose.position)
  if (up) camera.up.set(...up)
  else camera.up.set(0, 1, 0)
  const orbit = asOrbitLook(controls)
  if (orbit?.object && orbit.object !== camera) {
    orbit.object.position.set(...pose.position)
  }
  if (orbit) {
    orbit.target.set(...pose.target)
    orbit.update?.()
  }
  camera.lookAt(...pose.target)
}

type SceneMotionFlyProps = {
  from: ViewPose
  to: ViewPose
  ticket: number
  duration: number
  kind?: SceneMotionKind
  hold?: number
  slowMoAt?: number
  impulseAt?: number
  reverse?: boolean
  /** `1` plays forward, `-1` reverses, `0` holds. Omit for the one-shot crane. */
  rate?: number
  /** Progress 0–1 applied when `ticket` changes. Only used with `rate`. */
  origin?: number
  waypoints?: JourneyPose[]
  onProgress?: (t: number) => void
  /** Camera progress 0–1 through the move, not the color mix. */
  onMove?: (t: number) => void
  onDone?: () => void
  onPeak?: () => void
}

export function SceneMotionFly({
  from,
  to,
  ticket,
  duration,
  kind = 'boom-arc',
  hold = 0,
  slowMoAt,
  impulseAt,
  reverse = false,
  rate,
  origin = 0,
  waypoints,
  onProgress,
  onMove,
  onDone,
  onPeak,
}: SceneMotionFlyProps) {
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls)
  const invalidate = useThree((state) => state.invalidate)
  const trip = useRef<{ age: number; seated: boolean } | null>(null)
  const lastTicket = useRef(Number.NaN)
  const doneFor = useRef(Number.NaN)
  const peakedFor = useRef(Number.NaN)
  const rateRef = useRef(rate)
  const heldStep = useRef(rate ?? 1)
  rateRef.current = rate

  useLayoutEffect(() => {
    invalidate()
  }, [camera, controls, ticket, invalidate])

  useFrame((_, delta) => {
    if (!orbitDrivesCamera(controls, camera)) {
      invalidate()
      return
    }
    if (lastTicket.current !== ticket) {
      lastTicket.current = ticket
      const startAge = rateRef.current === undefined ? 0 : ageAtProgress(origin, hold, duration)
      trip.current = { age: startAge, seated: false }
      doneFor.current = Number.NaN
      peakedFor.current = Number.NaN
    }
    const current = trip.current
    if (!current) return
    const start = asJourney(from)
    const end = asJourney(to)
    const step = rateRef.current ?? 1
    // A glTF hitch reports a huge delta. Eating it slams object color from black to full.
    const wasHeld = heldStep.current === 0
    heldStep.current = step
    const dt = wasHeld && step !== 0 ? 0 : Math.min(delta, 0.05)
    if (!current.seated) {
      const clock = craneClock(current.age, hold, duration)
      const along = kind === 'journey' ? journeyEase(clock.t, slowMoAt) : clock.t
      writeJourneyPose(
        camera,
        controls,
        clock.t <= 0
          ? start
          : kind === 'journey'
            ? lerpPose(reverse ? end : start, reverse ? start : end, reverse ? 1 - along : along)
            : sampleBoomArc(
                reverse ? end : start,
                reverse ? start : end,
                reverse ? 1 - clock.t : clock.t,
                waypoints ?? [],
                slowMoAt ?? 0.5,
              ),
        clock.t >= 1 ? to.up : from.up,
      )
      current.seated = true
      onProgress?.(steerColorMix(clock, step))
      onMove?.(clock.t)
      if (impulseAt !== undefined && step !== 0 && impulseAt <= 0 && clock.t <= 0 && peakedFor.current !== ticket) {
        peakedFor.current = ticket
        onPeak?.()
      }
      invalidate()
      return
    }
    current.age += dt * step
    if (current.age < 0) current.age = 0
    const wait = Math.max(0, hold)
    const clock = craneClock(current.age, hold, duration)
    onProgress?.(steerColorMix(clock, step))
    onMove?.(clock.t)
    if (steerReverseDone(clock, step)) {
      writeJourneyPose(camera, controls, start, from.up)
      onProgress?.(0)
      invalidate()
      trip.current = null
      if (doneFor.current !== ticket) {
        doneFor.current = ticket
        onDone?.()
      }
      return
    }
    if (current.age < wait) {
      writeJourneyPose(camera, controls, start, from.up)
      if (step !== 0 && impulseAt !== undefined && impulseAt <= 0 && clock.t <= 0 && clock.mix >= 0.08 && peakedFor.current !== ticket) {
        peakedFor.current = ticket
        onPeak?.()
      }
      invalidate()
      return
    }
    const t = clock.t
    const along = kind === 'journey' ? journeyEase(t, slowMoAt) : t
    if (step !== 0 && impulseAt !== undefined && t >= impulseAt && peakedFor.current !== ticket) {
      peakedFor.current = ticket
      onPeak?.()
    }
    writeJourneyPose(
      camera,
      controls,
      kind === 'journey'
        ? lerpPose(reverse ? end : start, reverse ? start : end, reverse ? 1 - along : along)
        : sampleBoomArc(
            reverse ? end : start,
            reverse ? start : end,
            reverse ? 1 - t : t,
            waypoints ?? [],
            slowMoAt ?? 0.5,
          ),
      t >= 1 ? to.up : from.up,
    )
    invalidate()
    if (t >= 1 && step > 0) {
      trip.current = null
      if (doneFor.current !== ticket) {
        doneFor.current = ticket
        onDone?.()
      }
    }
  })
  return null
}
