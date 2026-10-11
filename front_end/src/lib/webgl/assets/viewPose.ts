import { WEBGL_SPACE } from '../runtime/space/webglSpace'
import { orbitFromPose, poseFromOrbit, type CameraOrbit } from '../runtime/controls/cameraJourney'
import type { AssetAnnotation } from './assetAnnotations'

/** Look-along-normal distance for inspect hops. */
export const INSPECT_LOOK_M = 0.85
/**
 * Floor polar (from +Y) so a top-of-mesh normal cannot sit the camera on the
 * up axis. `lookAt` with world-up then gimbal-locks and the shot pops to a
 * side framing (the lantern Top → Home/scene-pointer teleport).
 */
export const INSPECT_MIN_POLAR = 0.42

/** Synthetic dropdown id — camera home, not a baked mark. */
export const VIEW_HOME_ID = '__home__'

/** Baked viewpoint the model viewer treats as Home. */
export const VIEW_HOME_MARK_ID = 'viewpoint-home'

export type ViewPose = {
  position: [number, number, number]
  target: [number, number, number]
  orbit?: CameraOrbit
  up?: [number, number, number]
  quaternion?: [number, number, number, number]
  model?: {
    position: [number, number, number]
    rotation: [number, number, number]
    quaternion: [number, number, number, number]
    scale: [number, number, number]
  }
}

type HomeMark = Pick<AssetAnnotation, 'id' | 'kind' | 'camera' | 'target' | 'position' | 'orbit' | 'up' | 'quaternion'>

function poseFromMark(mark: Pick<AssetAnnotation, 'camera' | 'target' | 'position' | 'orbit' | 'up' | 'quaternion'>): ViewPose {
  const target = mark.target ?? mark.position
  if (mark.orbit) {
    const pose = poseFromOrbit({ ...mark.orbit, target: [...target] })
    return {
      ...pose,
      orbit: { azimuth: mark.orbit.azimuth, polar: mark.orbit.polar, radius: mark.orbit.radius },
      up: mark.up ? [...mark.up] : [0, 1, 0],
      quaternion: mark.quaternion ? [...mark.quaternion] : undefined,
    }
  }
  if (mark.camera) {
    const pose = { position: [...mark.camera] as [number, number, number], target: [...target] as [number, number, number] }
    return {
      ...pose,
      orbit: orbitFromPose(pose),
      up: mark.up ? [...mark.up] : [0, 1, 0],
      quaternion: mark.quaternion ? [...mark.quaternion] : undefined,
    }
  }
  return {
    position: [...WEBGL_SPACE.cameraHome],
    target: [...target],
  }
}

export function homeViewPose(marks?: readonly HomeMark[]): ViewPose {
  const home = marks?.find((mark) => mark.id === VIEW_HOME_MARK_ID && mark.kind === 'viewpoint')
  if (home?.camera || home?.orbit) return poseFromMark(home)
  const fallback = {
    position: [...WEBGL_SPACE.cameraHome] as [number, number, number],
    target: [...WEBGL_SPACE.lookAt] as [number, number, number],
  }
  return { ...fallback, orbit: orbitFromPose(fallback), up: [0, 1, 0] }
}

export function poseForAnnotation(
  mark: Pick<AssetAnnotation, 'position' | 'camera' | 'target' | 'normal' | 'orbit' | 'up' | 'quaternion'>,
): ViewPose {
  if (mark.orbit || mark.camera) return poseFromMark(mark)
  if (mark.normal) {
    const [nx, ny, nz] = mark.normal
    const len = Math.hypot(nx, ny, nz) || 1
    const pose = {
      position: [
        mark.position[0] + (nx / len) * INSPECT_LOOK_M,
        mark.position[1] + (ny / len) * INSPECT_LOOK_M,
        mark.position[2] + (nz / len) * INSPECT_LOOK_M,
      ] as [number, number, number],
      target: [...mark.position] as [number, number, number],
    }
    const raw = orbitFromPose(pose)
    const orbit =
      raw.polar < INSPECT_MIN_POLAR
        ? { azimuth: raw.azimuth, polar: INSPECT_MIN_POLAR, radius: raw.radius }
        : { azimuth: raw.azimuth, polar: raw.polar, radius: raw.radius }
    const seated = poseFromOrbit({ ...orbit, target: pose.target })
    return { ...seated, orbit, up: [0, 1, 0] }
  }
  const pose = {
    position: [...WEBGL_SPACE.cameraHome] as [number, number, number],
    target: [...mark.position] as [number, number, number],
  }
  return { ...pose, orbit: orbitFromPose(pose), up: [0, 1, 0] }
}

/** Copy session writes the live camera onto the selected viewpoint so a 180° orbit is not dropped. */
export function stampLiveViewpoint(
  marks: readonly AssetAnnotation[],
  viewId: string,
  live: ViewPose,
): AssetAnnotation[] {
  const targetId = viewId === VIEW_HOME_ID ? VIEW_HOME_MARK_ID : viewId
  const orbit = live.orbit ?? orbitFromPose(live)
  return marks.map((mark) => {
    if (mark.id !== targetId || mark.kind !== 'viewpoint') return mark
    return {
      ...mark,
      camera: [...live.position],
      target: [...live.target],
      orbit: { azimuth: orbit.azimuth, polar: orbit.polar, radius: orbit.radius },
      up: live.up ? [...live.up] : [0, 1, 0],
      quaternion: live.quaternion ? [...live.quaternion] : undefined,
    }
  })
}

export function regionFromRing(ring: readonly [number, number, number][]): {
  position: [number, number, number]
  radius: number
} {
  if (ring.length < 3) throw new Error('region needs 3 points')
  const n = ring.length
  const position: [number, number, number] = [
    ring.reduce((sum, point) => sum + point[0], 0) / n,
    ring.reduce((sum, point) => sum + point[1], 0) / n,
    ring.reduce((sum, point) => sum + point[2], 0) / n,
  ]
  let radius = 0
  for (const point of ring) {
    const d = Math.hypot(point[0] - position[0], point[1] - position[1], point[2] - position[2])
    if (d > radius) radius = d
  }
  return { position, radius }
}

export function isNearPoint(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  epsilon = 0.045,
): boolean {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) <= epsilon
}
