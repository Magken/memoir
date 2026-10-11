import { WEBGL_SPACE, viewportPercent, type WebglVec3 } from './webglSpace'

export type Vec3 = [number, number, number]

export type CameraFrame = {
  position: WebglVec3
  target: WebglVec3
  /** Vertical field of view in degrees. */
  fov: number
  aspect: number
}

export type ScreenPoint = {
  /** 0–1 left → right of the Canvas host. */
  x: number
  /** 0–1 top → bottom of the Canvas host. */
  y: number
}

export type CameraBasis = {
  xAxis: Vec3
  yAxis: Vec3
  zAxis: Vec3
  forward: Vec3
}

function sub(a: WebglVec3, b: WebglVec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

function add(a: WebglVec3, b: WebglVec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

function scale(a: WebglVec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s]
}

function dot(a: WebglVec3, b: WebglVec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function cross(a: WebglVec3, b: WebglVec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}

function len(a: WebglVec3): number {
  return Math.hypot(a[0], a[1], a[2])
}

function norm(a: WebglVec3): Vec3 {
  const d = len(a)
  if (d < 1e-8) return [0, 0, 0]
  return scale(a, 1 / d)
}

export function cameraDistance(frame: Pick<CameraFrame, 'position' | 'target'>): number {
  return len(sub(frame.position, frame.target))
}

export function cameraBasis(frame: CameraFrame): CameraBasis {
  const zAxis = norm(sub(frame.position, frame.target))
  const worldUp: Vec3 = WEBGL_SPACE.up === 'y' ? [0, 1, 0] : [0, 0, 1]
  let xAxis = cross(worldUp, zAxis)
  if (len(xAxis) < 1e-8) xAxis = cross([0, 0, 1], zAxis)
  xAxis = norm(xAxis)
  const yAxis = cross(zAxis, xAxis)
  return { xAxis, yAxis, zAxis, forward: scale(zAxis, -1) }
}

export function frustumSliceMeters(
  frame: Pick<CameraFrame, 'fov' | 'aspect'>,
  distance: number,
): { width: number; height: number } {
  const height = 2 * Math.max(distance, 0) * Math.tan(((frame.fov * Math.PI) / 180) / 2)
  return { width: height * Math.max(frame.aspect, 0.0001), height }
}

export type ViewRay = { origin: Vec3; direction: Vec3 }

export function screenToRay(screen: ScreenPoint, frame: CameraFrame): ViewRay {
  const { xAxis, yAxis, forward } = cameraBasis(frame)
  const ndcX = screen.x * 2 - 1
  const ndcY = 1 - screen.y * 2
  const tanHalf = Math.tan(((frame.fov * Math.PI) / 180) / 2)
  const direction = norm(
    add(
      add(scale(xAxis, ndcX * tanHalf * frame.aspect), scale(yAxis, ndcY * tanHalf)),
      forward,
    ),
  )
  return { origin: [...frame.position], direction }
}

/** World point at `distance` metres along the view ray (camera zoom / dolly depth). */
export function screenToWorldAtDistance(
  screen: ScreenPoint,
  frame: CameraFrame,
  distance: number,
): Vec3 | null {
  if (!(distance > 0)) return null
  const ray = screenToRay(screen, frame)
  return add(ray.origin, scale(ray.direction, distance))
}

/** Hit the ground (or another y-plane). Null when the ray is parallel or behind the camera. */
export function screenToWorldOnGround(
  screen: ScreenPoint,
  frame: CameraFrame,
  planeY = WEBGL_SPACE.groundY,
): Vec3 | null {
  const ray = screenToRay(screen, frame)
  if (Math.abs(ray.direction[1]) < 1e-8) return null
  const t = (planeY - ray.origin[1]) / ray.direction[1]
  if (t < 0) return null
  return add(ray.origin, scale(ray.direction, t))
}

export type ScreenProjection = ScreenPoint & { visible: boolean; depth: number }

export function worldToScreen(world: WebglVec3, frame: CameraFrame): ScreenProjection {
  const { xAxis, yAxis, zAxis } = cameraBasis(frame)
  const v = sub(world, frame.position)
  const depth = -dot(v, zAxis)
  if (depth <= 1e-8) {
    return { x: 0.5, y: 0.5, visible: false, depth }
  }
  const tanHalf = Math.tan(((frame.fov * Math.PI) / 180) / 2)
  const ndcX = dot(v, xAxis) / (depth * tanHalf * frame.aspect)
  const ndcY = dot(v, yAxis) / (depth * tanHalf)
  return {
    x: (ndcX + 1) / 2,
    y: (1 - ndcY) / 2,
    visible: ndcX >= -1 && ndcX <= 1 && ndcY >= -1 && ndcY <= 1,
    depth,
  }
}

/**
 * Place an object so it appears at a viewport percent (e.g. 75×50)
 * at the current look-at distance — the depth the camera is zoomed to.
 */
export function worldAtViewportPercent(
  pctX: number,
  pctY: number,
  frame: CameraFrame,
): Vec3 | null {
  return screenToWorldAtDistance(viewportPercent(pctX, pctY), frame, cameraDistance(frame))
}
