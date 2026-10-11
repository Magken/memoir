/** Eased camera trip around a look-at — heading and zoom, not a world-XYZ teleport. */

export type JourneyPose = {
  position: [number, number, number]
  target: [number, number, number]
}

/** OrbitControls Y-up spherical: azimuth around Y, polar from +Y, radius in metres. */
export type CameraOrbit = {
  azimuth: number
  polar: number
  radius: number
}

export type OrbitPose = CameraOrbit & {
  target: [number, number, number]
}

/** Minimal OrbitControls surface — azimuth/polar/radius is the capture frame. */
export type OrbitFrameHandle = {
  target: { x: number; y: number; z: number }
  getAzimuthalAngle: () => number
  getPolarAngle: () => number
  getDistance: () => number
  update?: () => void
}

export function isOrbitFrameHandle(value: unknown): value is OrbitFrameHandle {
  if (!value || typeof value !== 'object') return false
  const handle = value as Partial<OrbitFrameHandle>
  return (
    !!handle.target &&
    typeof handle.target.x === 'number' &&
    typeof handle.getAzimuthalAngle === 'function' &&
    typeof handle.getPolarAngle === 'function' &&
    typeof handle.getDistance === 'function'
  )
}

/** True when OrbitControls.object is the visible default camera — not the leftover canvas camera. */
export function orbitDrivesCamera(controls: unknown, camera: unknown): boolean {
  if (!controls || typeof controls !== 'object' || !('object' in controls)) return false
  return (controls as { object: unknown }).object === camera
}

export function poseFromOrbitHandle(handle: OrbitFrameHandle): { pose: JourneyPose; orbit: CameraOrbit } {
  const orbit: CameraOrbit = {
    azimuth: handle.getAzimuthalAngle(),
    polar: handle.getPolarAngle(),
    radius: handle.getDistance(),
  }
  const target: [number, number, number] = [handle.target.x, handle.target.y, handle.target.z]
  return { pose: poseFromOrbit({ ...orbit, target }), orbit }
}

/** Flush OrbitControls, then read heading. Missing handle falls back (Home until the first frame). */
export function poseFromLiveOrbit(
  handle: OrbitFrameHandle | null | undefined,
  fallback: JourneyPose,
): { pose: JourneyPose; orbit: CameraOrbit } {
  if (!isOrbitFrameHandle(handle)) {
    return { pose: fallback, orbit: orbitFromPose(fallback) }
  }
  handle.update?.()
  return poseFromOrbitHandle(handle)
}

export const JOURNEY_MIN_S = 0.35
export const JOURNEY_MAX_S = 1.5
export const JOURNEY_METRE_S = 0.74

function hypot3(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value))
}

export function wrapAngle(radians: number): number {
  let x = radians
  while (x > Math.PI) x -= Math.PI * 2
  while (x <= -Math.PI) x += Math.PI * 2
  return x
}

/** Shortest signed delta from `from` to `to` in (−π, π]. */
export function shortestAngle(from: number, to: number): number {
  return wrapAngle(to - from)
}

export function lerpAngle(from: number, to: number, t: number): number {
  return wrapAngle(from + shortestAngle(from, to) * t)
}

export function orbitFromPose(pose: JourneyPose): OrbitPose {
  const ox = pose.position[0] - pose.target[0]
  const oy = pose.position[1] - pose.target[1]
  const oz = pose.position[2] - pose.target[2]
  const radius = Math.hypot(ox, oy, oz) || 1e-6
  return {
    target: [...pose.target],
    radius,
    polar: Math.acos(clamp(oy / radius, -1, 1)),
    azimuth: Math.atan2(ox, oz),
  }
}

export function poseFromOrbit(orbit: OrbitPose): JourneyPose {
  const sinP = Math.sin(orbit.polar)
  return {
    position: [
      orbit.target[0] + orbit.radius * sinP * Math.sin(orbit.azimuth),
      orbit.target[1] + orbit.radius * Math.cos(orbit.polar),
      orbit.target[2] + orbit.radius * sinP * Math.cos(orbit.azimuth),
    ],
    target: [...orbit.target],
  }
}

export function flipOrbit(orbit: OrbitPose): OrbitPose {
  return { ...orbit, azimuth: wrapAngle(orbit.azimuth + Math.PI) }
}

export function poseDistance(from: JourneyPose, to: JourneyPose): number {
  return Math.max(hypot3(from.position, to.position), hypot3(from.target, to.target))
}

export function orbitSpan(from: OrbitPose, to: OrbitPose): number {
  const yaw = Math.abs(shortestAngle(from.azimuth, to.azimuth)) * Math.max(from.radius, to.radius)
  const pitch = Math.abs(to.polar - from.polar) * Math.max(from.radius, to.radius)
  const zoom = Math.abs(to.radius - from.radius)
  const look = hypot3(from.target, to.target)
  return Math.max(yaw, pitch, zoom, look)
}

export function journeyDuration(from: JourneyPose, to: JourneyPose): number {
  const span = orbitSpan(orbitFromPose(from), orbitFromPose(to))
  if (span < 1e-6) return 0
  return Math.min(JOURNEY_MAX_S, Math.max(JOURNEY_MIN_S, JOURNEY_MIN_S + span * JOURNEY_METRE_S))
}

export function easeInOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2
}

/** Rest at 0/1 — the boom orbit. Landing's rhythm stays on this curve. */
export function cosineEase(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return 0.5 - 0.5 * Math.cos(Math.PI * x)
}

/** Softer than `cosineEase`: acceleration builds from rest and falls into the stop. */
export function settleEase(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * x * (x * (x * 6 - 15) + 10)
}

/** Linger into the stop so a View hop settles like a Play crane, not a cubic punch. */
export const JOURNEY_DAMP = 0.06
export const JOURNEY_DAMP_AT = 0.82

export function journeyEase(t: number, amount = JOURNEY_DAMP, center = JOURNEY_DAMP_AT): number {
  const u = settleEase(t)
  const c = Math.min(0.9, Math.max(0.1, center))
  const raw = (x: number) => x + amount * Math.sin(2 * Math.PI * (x - c + 0.5))
  const a = raw(0)
  const b = raw(1)
  return (raw(u) - a) / (b - a)
}

export function lerpTriple(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  t: number,
): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

export function lerpOrbit(from: OrbitPose, to: OrbitPose, t: number): OrbitPose {
  const u = journeyEase(t)
  return {
    target: lerpTriple(from.target, to.target, u),
    radius: from.radius + (to.radius - from.radius) * u,
    polar: from.polar + (to.polar - from.polar) * u,
    azimuth: lerpAngle(from.azimuth, to.azimuth, u),
  }
}

/** Orbit around the look-at so a 180° heading stays on the sphere, not a chord through the mesh. */
export function lerpPose(from: JourneyPose, to: JourneyPose, t: number): JourneyPose {
  return poseFromOrbit(lerpOrbit(orbitFromPose(from), orbitFromPose(to), t))
}

export function poseKey(pose: JourneyPose): string {
  const orbit = orbitFromPose(pose)
  return `${orbit.azimuth.toFixed(5)}|${orbit.polar.toFixed(5)}|${orbit.radius.toFixed(5)}|${pose.target.join(',')}`
}
