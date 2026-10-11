/**
 * Dot Pad X hardware buttons → camera moves. The two panning triangles turn the view;
 * F1–F4 left to right: rotate down, rotate up, capture, describe. Stages apply a `PadNudge`.
 */
import type { PerspectiveCamera, Vector3 } from 'three'

export type PadNudge = { yaw: number; pitch: number; zoom: number }

/** 15° per press. */
export const PAD_TURN = Math.PI / 12
/** Each zoom press moves the camera this fraction closer (or farther). */
export const PAD_ZOOM = 0.85

export function padNudgeFor(key: string): PadNudge | null {
  switch (key) {
    case 'PanningLeft':
      return { yaw: PAD_TURN, pitch: 0, zoom: 1 }
    case 'PanningRight':
      return { yaw: -PAD_TURN, pitch: 0, zoom: 1 }
    case 'KeyFunction1':
      return { yaw: 0, pitch: -PAD_TURN, zoom: 1 }
    case 'KeyFunction2':
      return { yaw: 0, pitch: PAD_TURN, zoom: 1 }
    default:
      return null
  }
}

export type PadAction = 'capture' | 'describe'

/** F3 takes a photo of the window; F4 describes it in braille and voice. */
export function padActionFor(key: string): PadAction | null {
  if (key === 'KeyFunction3') return 'capture'
  if (key === 'KeyFunction4') return 'describe'
  return null
}

/** Keeps the camera off the poles so a tilt never flips the view. */
const POLE_MARGIN = 0.1

/**
 * Moves `camera` round `target`: yaw about up, pitch about the camera's right, zoom along the line.
 * Builds no vectors of its own (only clones), so it works with the splat stage's three r186 too.
 */
export function applyPadNudge(
  camera: PerspectiveCamera,
  target: Vector3,
  nudge: PadNudge,
  minDistance = 0,
  maxDistance = Infinity,
) {
  const up = camera.up.clone().normalize()
  const offset = camera.position.clone().sub(target)
  offset.applyAxisAngle(up, nudge.yaw)
  if (nudge.pitch) {
    const angle = offset.angleTo(up)
    const next = Math.min(Math.PI - POLE_MARGIN, Math.max(POLE_MARGIN, angle - nudge.pitch))
    const right = offset.clone().cross(up).normalize()
    if (right.lengthSq() > 0) offset.applyAxisAngle(right, angle - next)
  }
  const length = Math.min(maxDistance, Math.max(minDistance, offset.length() * nudge.zoom))
  offset.setLength(length)
  camera.position.copy(target).add(offset)
  camera.lookAt(target)
}
