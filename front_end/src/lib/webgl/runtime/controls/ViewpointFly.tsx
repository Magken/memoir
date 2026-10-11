/**
 * Eased orbit hop for Home / viewpoints. Seats once OrbitControls drives the visible camera.
 * A ticket re-applies the same pose (Home click after a wander).
 */
import { useLayoutEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  isOrbitFrameHandle,
  journeyDuration,
  lerpPose,
  orbitDrivesCamera,
  poseFromLiveOrbit,
  poseFromOrbit,
  type JourneyPose,
} from './cameraJourney'
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

function readJourneyPose(
  camera: { position: { x: number; y: number; z: number } },
  controls: unknown,
  fallback: JourneyPose,
): JourneyPose {
  const orbit = asOrbitLook(controls)
  return {
    position: [camera.position.x, camera.position.y, camera.position.z],
    target: orbit ? [orbit.target.x, orbit.target.y, orbit.target.z] : fallback.target,
  }
}

function writeJourneyPose(
  camera: {
    position: { set: (x: number, y: number, z: number) => void }
    up: { set: (x: number, y: number, z: number) => void }
    lookAt: (...xyz: number[]) => void
  },
  controls: unknown,
  pose: ViewPose,
) {
  const placed = pose.orbit ? poseFromOrbit({ ...pose.orbit, target: pose.target }) : pose
  camera.position.set(...placed.position)
  if (pose.up) camera.up.set(...pose.up)
  else camera.up.set(0, 1, 0)
  const orbit = asOrbitLook(controls)
  if (orbit?.object && orbit.object !== camera) {
    orbit.object.position.set(...placed.position)
  }
  if (orbit) {
    orbit.target.set(...placed.target)
    orbit.update?.()
  }
  camera.lookAt(...placed.target)
}

type ViewpointFlyProps = {
  pose: ViewPose | null
  ticket: number
  onTrip?: (active: boolean) => void
}

export function ViewpointFly({ pose, ticket, onTrip }: ViewpointFlyProps) {
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls)
  const invalidate = useThree((state) => state.invalidate)
  const trip = useRef<{ from: JourneyPose; to: JourneyPose; age: number; duration: number } | null>(null)
  const seated = useRef(false)
  const lastTicket = useRef(-1)
  const boundControls = useRef(controls)
  const onTripRef = useRef(onTrip)
  onTripRef.current = onTrip

  useLayoutEffect(() => {
    invalidate()
  }, [camera, controls, ticket, invalidate])

  useLayoutEffect(() => {
    return () => onTripRef.current?.(false)
  }, [])

  useFrame((_, delta) => {
    if (!pose) return
    if (boundControls.current !== controls) {
      boundControls.current = controls
      seated.current = false
      trip.current = null
    }
    if (!orbitDrivesCamera(controls, camera)) {
      invalidate()
      return
    }

    if (!seated.current) {
      writeJourneyPose(camera, controls, pose)
      seated.current = true
      lastTicket.current = ticket
      invalidate()
      return
    }

    if (lastTicket.current !== ticket) {
      lastTicket.current = ticket
      const from = poseFromLiveOrbit(
        isOrbitFrameHandle(controls) ? controls : null,
        readJourneyPose(camera, controls, pose),
      ).pose
      const duration = journeyDuration(from, pose)
      if (duration <= 0) {
        writeJourneyPose(camera, controls, pose)
        trip.current = null
        onTripRef.current?.(false)
        invalidate()
        return
      }
      trip.current = { from, to: pose, age: 0, duration }
      onTripRef.current?.(true)
      invalidate()
    }

    const current = trip.current
    if (!current) return
    current.age += delta
    const t = Math.min(1, current.age / current.duration)
    writeJourneyPose(camera, controls, lerpPose(current.from, current.to, t))
    invalidate()
    if (t >= 1) {
      trip.current = null
      onTripRef.current?.(false)
    }
  })
  return null
}
