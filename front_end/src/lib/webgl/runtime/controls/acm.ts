/**
 * Ambient camera motion — pan/tilt toward the pointer. Intensity 0 is still.
 * Applied on top of the orbit rest pose; it does not write the orbit spherical.
 */

/** Radians of yaw at intensity 1 with the pointer at the right edge. */
export const ACM_MAX_YAW = 0.7
/** Radians of pitch at intensity 1 with the pointer at the top edge. */
export const ACM_MAX_PITCH = 0.45
/** Metres of camera travel from rest at intensity 1. */
export const ACM_MAX_PAN = 0.12
/** tanh gain — edge NDC eases into the cap instead of clipping. */
export const ACM_SOFT = 1.15
/** Stage host class — map window pointers here, not the pointer-events-none canvas. */
export const ACM_STAGE_CLASS = 'theme-webgl-toolkit__stage'
/** Exponential follow rate (1/s). Lower = heavier ease onto the stop. */
export const ACM_FOLLOW = 4
/**
 * Blend onto the locked peek after a crane (1/s). Heavier than pointer follow so
 * `camera.acm.lock` does not snap the camera the frame the shot ends.
 */
export const ACM_LOCK_IN = 2.4
/**
 * Raise intensity after a View hop / crane (1/s). Heavier than lock-in so ACM
 * starts at 0 and eases to the slider instead of snapping to 0.3.
 */
export const ACM_WAKE = 1.5
/**
 * Blend onto the lock-off peek after a View hop (1/s). Heavier than wake so an
 * off-center pointer cannot jerk the camera the frame the viewport seats.
 */
export const ACM_UNLOCK_IN = 0.85
export const ACM_INTENSITY_MAX = 1

export type AcmPanTilt = {
  yaw: number
  pitch: number
}

function clamp(value: number, lo: number, hi: number): number {
  if (!Number.isFinite(value)) return lo
  return Math.min(hi, Math.max(lo, value))
}

export function clampIntensity(value: number): number {
  return clamp(value, 0, ACM_INTENSITY_MAX)
}

/**
 * Pointer NDC (−1…1, Y up) → extra camera Euler.
 * Soft tanh so the max is a damped stop, not a wall. Mouse right / up move the camera that way.
 */
export function acmSoftAxis(ndc: number): number {
  return Math.tanh(clamp(ndc, -1, 1) * ACM_SOFT)
}

export function acmPanTilt(ndcX: number, ndcY: number, intensity: number): AcmPanTilt {
  const k = clampIntensity(intensity)
  const x = acmSoftAxis(ndcX)
  const y = acmSoftAxis(ndcY)
  return {
    yaw: -x * ACM_MAX_YAW * k,
    pitch: -y * ACM_MAX_PITCH * k,
  }
}

export function acmFollow(current: number, target: number, dt: number, rate = ACM_FOLLOW): number {
  const step = 1 - Math.exp(-rate * Math.max(0, dt))
  return current + (target - current) * step
}

/** Live ACM gain after a hop. Starts at 0; never jumps to the slider. */
export function acmWakeIntensity(current: number, target: number, dt: number): number {
  const next = acmFollow(current, clampIntensity(target), dt, ACM_WAKE)
  if (Math.abs(next - target) < 1e-4) return clampIntensity(target)
  return next
}

export function acmLerpTriple(
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  t: number,
): [number, number, number] {
  const u = Math.min(1, Math.max(0, t))
  return [
    from[0] + (to[0] - from[0]) * u,
    from[1] + (to[1] - from[1]) * u,
    from[2] + (to[2] - from[2]) * u,
  ]
}

export type AcmClientRect = {
  left: number
  top: number
  width: number
  height: number
}

/** Map a window pointer onto a stage rect. Independent of canvas pointer-events. */
export function acmNdcFromClient(
  clientX: number,
  clientY: number,
  rect: AcmClientRect,
): { x: number; y: number; inside: boolean } {
  if (!(rect.width > 0) || !(rect.height > 0)) return { x: 0, y: 0, inside: false }
  const inside =
    clientX >= rect.left &&
    clientX <= rect.left + rect.width &&
    clientY >= rect.top &&
    clientY <= rect.top + rect.height
  if (!inside) return { x: 0, y: 0, inside: false }
  return {
    x: clamp(((clientX - rect.left) / rect.width) * 2 - 1, -1, 1),
    y: clamp(-(((clientY - rect.top) / rect.height) * 2 - 1), -1, 1),
    inside: true,
  }
}

/**
 * Slide the camera around the look-at. Pointer right / up move the camera that
 * way so the subject stays framed (parallax), instead of a tiny in-place glance.
 */
export function acmOffsetAroundTarget(
  cam: readonly [number, number, number],
  target: readonly [number, number, number],
  yaw: number,
  pitch: number,
): [number, number, number] {
  let ox = cam[0] - target[0]
  let oy = cam[1] - target[1]
  let oz = cam[2] - target[2]
  const cosY = Math.cos(yaw)
  const sinY = Math.sin(yaw)
  const yx = ox * cosY - oz * sinY
  const yz = ox * sinY + oz * cosY
  ox = yx
  oz = yz
  const rLen = Math.hypot(ox, oz)
  if (rLen > 1e-8 && pitch !== 0) {
    const rx = oz / rLen
    const rz = -ox / rLen
    const cosP = Math.cos(pitch)
    const sinP = Math.sin(pitch)
    const vx = ox
    const vy = oy
    const vz = oz
    const kxvX = -rz * vy
    const kxvY = rz * vx - rx * vz
    const kxvZ = rx * vy
    const kdotv = rx * vx + rz * vz
    ox = vx * cosP + kxvX * sinP + rx * kdotv * (1 - cosP)
    oy = vy * cosP + kxvY * sinP
    oz = vz * cosP + kxvZ * sinP + rz * kdotv * (1 - cosP)
  }
  return [target[0] + ox, target[1] + oy, target[2] + oz]
}

/** Soft-cap camera travel from rest so pan cannot walk off the focal point. */
export function acmLimitTravel(
  rest: readonly [number, number, number],
  peeked: readonly [number, number, number],
  maxDist: number,
): [number, number, number] {
  const dx = peeked[0] - rest[0]
  const dy = peeked[1] - rest[1]
  const dz = peeked[2] - rest[2]
  const len = Math.hypot(dx, dy, dz)
  if (!(maxDist > 0) || len < 1e-8) return [peeked[0], peeked[1], peeked[2]]
  const allowed = maxDist * Math.tanh(len / maxDist)
  const scale = allowed / len
  return [rest[0] + dx * scale, rest[1] + dy * scale, rest[2] + dz * scale]
}

export type AcmRestPose = {
  position: readonly [number, number, number]
  target: readonly [number, number, number]
}

/**
 * Metres the unlocked camera may sit off rest (a peek). Farther than this is a
 * new seat (View hop / crane) — restoring rest would teleport off the label.
 */
export const ACM_SEAT_DRIFT_M = ACM_MAX_PAN * 2

/** True only while ACM is on and the live camera is still a peek around rest. */
export function acmShouldRestorePeek(
  enabled: boolean,
  rest: AcmRestPose | null,
  livePosition: readonly [number, number, number],
): boolean {
  if (!enabled || !rest) return false
  const dx = livePosition[0] - rest.position[0]
  const dy = livePosition[1] - rest.position[1]
  const dz = livePosition[2] - rest.position[2]
  return Math.hypot(dx, dy, dz) <= ACM_SEAT_DRIFT_M
}

/**
 * Locked ACM: rotate around a fixed look-at, pan a capped distance, never leave that focal point.
 */
export function acmPeekFromRest(
  rest: AcmRestPose,
  ndcX: number,
  ndcY: number,
  intensity: number,
): { position: [number, number, number]; target: [number, number, number] } {
  const target: [number, number, number] = [rest.target[0], rest.target[1], rest.target[2]]
  const k = clampIntensity(intensity)
  if (k <= 0) {
    return { position: [rest.position[0], rest.position[1], rest.position[2]], target }
  }
  const { yaw, pitch } = acmPanTilt(ndcX, ndcY, k)
  const orbited = acmOffsetAroundTarget(rest.position, rest.target, yaw, pitch)
  return {
    position: acmLimitTravel(rest.position, orbited, ACM_MAX_PAN * k),
    target,
  }
}
