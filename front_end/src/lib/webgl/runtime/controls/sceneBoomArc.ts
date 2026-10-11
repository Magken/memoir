/**
 * Cinematic crane: one smooth orbit-space move — boom up, 180° through the peak, drop.
 * Copied stills shape the high point; they are not corners. Not a View hop, not extra world-Y.
 */
import {
  cosineEase,
  settleEase,
  lerpTriple,
  orbitFromPose,
  poseFromOrbit,
  shortestAngle,
  type CameraOrbit,
  type JourneyPose,
  type OrbitPose,
} from './cameraJourney'

export { cosineEase, settleEase }

/** Seconds to sit on `from` before the crane runs. Landing uses this; About holds longer on the torch. */
export const BOOM_ARC_HOLD = 0.5
/** Seconds for the landing back→front crane. */
export const BOOM_ARC_DURATION = 4
/** Polar (from +Y) at the top of the boom — high, not a zenith scrape. */
export const BOOM_ARC_PEAK_POLAR = 0.26
/** Mid-move linger. Applied after the cosine ease so the shot still starts and stops at rest. */
export const BOOM_ARC_SLOWMO = 0.06
/** Look-at / radius begin easing to the end pose after the around. */
export const BOOM_ARC_HOME_START = 0.64
/** Look-at plus zoom, in metres, before the last leg needs the whole second half. */
const WIDE_DOLLY_M = 0.8
/** <1 flattens the polar peak so more of the 180° happens while high. */
export const BOOM_ARC_PEAK_HOLD = 0.62
/** Normalized time of the high point (`craneEase` is 0.5). */
export const BOOM_ARC_PEAK_T = 0.5
/** Cage impulse starts on the rise, before the polar peak. */
export const BOOM_ARC_IMPULSE_T = 0.36

export type MotionWaypoint = {
  target: [number, number, number]
  orbit: CameraOrbit
}

export function posesFromWaypoints(waypoints: readonly MotionWaypoint[]): JourneyPose[] {
  return waypoints.map((point) => poseFromOrbit({ ...point.orbit, target: point.target }))
}

export function slowMoMid(u: number, amount = BOOM_ARC_SLOWMO, center = 0.5): number {
  const t = Math.min(1, Math.max(0, u))
  const c = Math.min(0.9, Math.max(0.1, center))
  const raw = (x: number) => x + amount * Math.sin(2 * Math.PI * (x - c + 0.5))
  const a = raw(0)
  const b = raw(1)
  return (raw(t) - a) / (b - a)
}

/** Rest at 0/1, one continuous ease, linger around `center` (0.5 is mid-turn). Ends ramp; the middle stays on the landing cosine. */
export function craneEase(t: number, amount = BOOM_ARC_SLOWMO, center = 0.5): number {
  const x = Math.min(1, Math.max(0, t))
  const mid = Math.sin(Math.PI * x) ** 2
  const eased = cosineEase(x) + (settleEase(x) - cosineEase(x)) * (1 - mid)
  return slowMoMid(eased, amount, center)
}

/** Straight hop. No `slowMoAt` stays linear. A set mark lingers there — Footer uses the lamp top. */
export function journeyEase(t: number, slowMoAt?: number): number {
  const u = Math.min(1, Math.max(0, t))
  if (slowMoAt === undefined) return u
  return craneEase(u, BOOM_ARC_SLOWMO, slowMoAt)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** A wide dolly (canvas → inset) starts settling at the peak so the last leg is not a rush. */
export function homeBlendStart(from: OrbitPose, to: OrbitPose): number {
  const look = Math.hypot(
    from.target[0] - to.target[0],
    from.target[1] - to.target[1],
    from.target[2] - to.target[2],
  )
  const travel = look + Math.abs(from.radius - to.radius)
  if (travel <= WIDE_DOLLY_M) return BOOM_ARC_HOME_START
  return 0.5
}

function clampPolar(polar: number): number {
  return Math.min(Math.PI - 0.05, Math.max(0.05, polar))
}

function peakPolarOf(start: CameraOrbit, waypoints: readonly JourneyPose[]): number {
  let captured = start.polar
  for (const pose of waypoints) {
    captured = Math.min(captured, orbitFromPose(pose).polar)
  }
  if (captured < BOOM_ARC_PEAK_POLAR) return clampPolar(BOOM_ARC_PEAK_POLAR)
  return clampPolar(captured)
}

/** Signed yaw along copied stills. Empty stills use the short arc; a captured Path can go the long way. */
export function yawAlong(
  start: CameraOrbit,
  end: CameraOrbit,
  waypoints: readonly JourneyPose[] = [],
): number {
  let azimuth = start.azimuth
  let total = 0
  for (const pose of waypoints) {
    const next = orbitFromPose(pose).azimuth
    total += shortestAngle(azimuth, next)
    azimuth = next
  }
  return total + shortestAngle(azimuth, end.azimuth)
}

export function sampleBoomArc(
  from: JourneyPose,
  to: JourneyPose,
  t: number,
  waypoints: readonly JourneyPose[] = [],
  slowMoAt = 0.5,
): JourneyPose {
  const u = Math.min(1, Math.max(0, t))
  const start = orbitFromPose(from)
  const end = orbitFromPose(to)
  const e = craneEase(u, BOOM_ARC_SLOWMO, slowMoAt)
  const boom = Math.sin(Math.PI * e) ** BOOM_ARC_PEAK_HOLD
  const polar = clampPolar(lerp(lerp(start.polar, end.polar, e), peakPolarOf(start, waypoints), boom))
  const azimuth = start.azimuth + yawAlong(start, end, waypoints) * e
  const blendAt = homeBlendStart(start, end)
  const home = settleEase(Math.min(1, Math.max(0, (u - blendAt) / (1 - blendAt))))
  return poseFromOrbit({
    target: lerpTriple(start.target, end.target, home),
    radius: lerp(start.radius, end.radius, home),
    polar,
    azimuth,
  })
}
