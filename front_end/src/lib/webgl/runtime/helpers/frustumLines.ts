export type Vec3 = readonly [number, number, number]

function sub(a: Vec3, b: Vec3): [number, number, number] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

function add(a: Vec3, b: Vec3): [number, number, number] {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

function scale(v: Vec3, s: number): [number, number, number] {
  return [v[0] * s, v[1] * s, v[2] * s]
}

function cross(a: Vec3, b: Vec3): [number, number, number] {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}

function length(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]) || 1
}

function norm(v: Vec3): [number, number, number] {
  const len = length(v)
  return [v[0] / len, v[1] / len, v[2] / len]
}

/** Line strips for a camera frustum gizmo (eye to near-rect, plus the rect). */
export function frustumLineStrips(
  position: Vec3,
  target: Vec3,
  size = 0.12,
): [number, number, number][][] {
  const forward = norm(sub(target, position))
  const worldUp: Vec3 = Math.abs(forward[1]) > 0.92 ? [0, 0, 1] : [0, 1, 0]
  const right = norm(cross(forward, worldUp))
  const up = norm(cross(right, forward))
  const near = add(position, scale(forward, size * 1.6))
  const hx = scale(right, size)
  const hy = scale(up, size * 0.7)
  const c0 = add(add(near, hx), hy)
  const c1 = add(sub(near, hx), hy)
  const c2 = sub(sub(near, hx), hy)
  const c3 = sub(add(near, hx), hy)
  const eye: [number, number, number] = [position[0], position[1], position[2]]
  return [
    [eye, c0],
    [eye, c1],
    [eye, c2],
    [eye, c3],
    [c0, c1, c2, c3, c0],
  ]
}
