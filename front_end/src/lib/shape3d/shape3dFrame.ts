/**
 * Shape3D view frame — aligned with [isometricSpace](../isometrics/isometricSpace.ts).
 * Screen on XY · viewer along −Z (out of screen). Zdog view rotations scrub which face
 * points toward the viewer.
 */

import { ISOMETRIC_SPACE } from '../isometrics/isometricSpace'

export const SHAPE3D_FRAME = {
  screenPlane: ISOMETRIC_SPACE.frame.screenPlane,
  viewerAxis: ISOMETRIC_SPACE.frame.viewerAxis,
  origin: ISOMETRIC_SPACE.frame.origin,
} as const

export type Shape3dViewRotation = {
  /** Radians — Zdog `rotate.x` */
  x: number
  /** Radians — Zdog `rotate.y` */
  y: number
}

export type Shape3dFrameSample = {
  view: Shape3dViewRotation
  /** Degrees for UI readout */
  label: string
}

export function shape3dViewToDegrees(view: Shape3dViewRotation): { x: number; y: number } {
  const toDeg = (rad: number) => (rad * 180) / Math.PI
  return { x: toDeg(view.x), y: toDeg(view.y) }
}

export function shape3dLerpView(
  from: Shape3dViewRotation,
  to: Shape3dViewRotation,
  t: number,
): Shape3dViewRotation {
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
  }
}
