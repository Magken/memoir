import { shape3dViewToDegrees, type Shape3dViewRotation } from './shape3dFrame'

export type CssShape3dRotation = {
  /** Degrees — CSS rotateX */
  rx: number
  /** Degrees — CSS rotateY */
  ry: number
}

export function cssShape3dViewFromShape(view: Shape3dViewRotation): CssShape3dRotation {
  const deg = shape3dViewToDegrees(view)
  return { rx: deg.x, ry: deg.y }
}

export function cssShape3dLerpRotation(
  from: CssShape3dRotation,
  to: CssShape3dRotation,
  t: number,
): CssShape3dRotation {
  return {
    rx: lerpAngleShortest(from.rx, to.rx, t),
    ry: lerpAngleShortest(from.ry, to.ry, t),
  }
}

/** Path segment lerp — keeps curated rx/ry twists (ref.image-carousel-12). */
export function cssShape3dLerpRotationLinear(
  from: CssShape3dRotation,
  to: CssShape3dRotation,
  t: number,
): CssShape3dRotation {
  return {
    rx: from.rx + (to.rx - from.rx) * t,
    ry: from.ry + (to.ry - from.ry) * t,
  }
}

/** Shortest arc between two degree angles. */
export function lerpAngleShortest(from: number, to: number, t: number): number {
  let delta = ((to - from + 540) % 360) - 180
  return from + delta * t
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

export function easeInOutQuint(t: number): number {
  return t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2
}

/** Menu cube face snaps — soft start/end without quint stall. */
export function easeInOutSmooth(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

/** ref.image-carousel-12 segment ease — quadratic in/out. */
export function easeIO(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

export function cssShape3dDragDelta(
  moveX: number,
  moveY: number,
  displaySize: number,
): CssShape3dRotation {
  const turn = 280 / Math.max(displaySize, 1)
  return { rx: -moveY * turn, ry: -moveX * turn }
}

/** Default rest pose — slight tilt like ref gallery. */
export const CSS_SHAPE3D_REST_ROTATION: CssShape3dRotation = { rx: -16, ry: 22 }

export const CSS_SHAPE3D_FACE_TWEEN_MS = 720
export const CSS_SHAPE3D_SPIN_DEG_PER_SEC = 28
