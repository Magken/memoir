/**
 * Camera path stills for a boom-arc crane — model viewer and Scene editor Path columns.
 * First still is `from`, last is `to`, middle stills shape the peak — they are not corners.
 */
import { orbitFromPose, type CameraOrbit, type JourneyPose } from './cameraJourney'
import type { ViewPose } from '../../assets/viewPose'

export const CAMERA_PATH_KIND = 'webgl-camera-path'

export type CameraPathStill = {
  target: [number, number, number]
  orbit: CameraOrbit
  position: [number, number, number]
}

export type CameraPathPayload = {
  kind: typeof CAMERA_PATH_KIND
  assetId?: string
  sceneId?: string
  stills: CameraPathStill[]
}

function asTriple(value: unknown): [number, number, number] | null {
  if (!Array.isArray(value) || value.length !== 3) return null
  if (!value.every((n) => typeof n === 'number' && Number.isFinite(n))) return null
  return [value[0], value[1], value[2]]
}

export function stillFromViewPose(pose: ViewPose): CameraPathStill {
  const orbit = pose.orbit ?? orbitFromPose(pose)
  return {
    target: [pose.target[0], pose.target[1], pose.target[2]],
    orbit: { azimuth: orbit.azimuth, polar: orbit.polar, radius: orbit.radius },
    position: [pose.position[0], pose.position[1], pose.position[2]],
  }
}

export function serializeCameraPath(payload: CameraPathPayload): string {
  return `${JSON.stringify(payload, null, 2)}\n`
}

export function parseCameraPath(raw: unknown): CameraPathPayload | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: 'path must be an object' }
  const row = raw as Record<string, unknown>
  if (row.kind !== CAMERA_PATH_KIND) return { error: 'kind must be webgl-camera-path' }
  const assetId = typeof row.assetId === 'string' ? row.assetId.trim() : ''
  const sceneId = typeof row.sceneId === 'string' ? row.sceneId.trim() : ''
  if (!assetId && !sceneId) return { error: 'assetId or sceneId is required' }
  if (!Array.isArray(row.stills) || row.stills.length < 2) {
    return { error: 'stills must have at least two captures' }
  }
  const stills: CameraPathStill[] = []
  for (const item of row.stills) {
    if (!item || typeof item !== 'object') return { error: 'still must be an object' }
    const still = item as Record<string, unknown>
    const target = asTriple(still.target)
    if (!target) return { error: 'still.target must be [x,y,z]' }
    const position = asTriple(still.position)
    if (still.orbit && typeof still.orbit === 'object') {
      const orbit = still.orbit as Record<string, unknown>
      if (
        typeof orbit.azimuth !== 'number' ||
        typeof orbit.polar !== 'number' ||
        typeof orbit.radius !== 'number' ||
        !Number.isFinite(orbit.azimuth) ||
        !Number.isFinite(orbit.polar) ||
        !Number.isFinite(orbit.radius) ||
        orbit.radius <= 0
      ) {
        return { error: 'still.orbit needs finite azimuth, polar, and radius > 0' }
      }
      stills.push({
        target,
        orbit: { azimuth: orbit.azimuth, polar: orbit.polar, radius: orbit.radius },
        position: position ?? target,
      })
      continue
    }
    const pose: JourneyPose = { position: position ?? [0, 0, 1], target }
    const derived = orbitFromPose(pose)
    stills.push({ target, orbit: derived, position: pose.position })
  }
  return {
    kind: CAMERA_PATH_KIND,
    ...(assetId ? { assetId } : {}),
    ...(sceneId ? { sceneId } : {}),
    stills,
  }
}
