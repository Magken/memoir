export const STEM_LENGTH = 0.055
/** Short tick on the hover cursor only — placed marks are points. */
export const CURSOR_STEM = 0.016
export const CURSOR_RADIUS = 0.0035
export const PIN_RADIUS = 0.0028
export const RING_TUBE = 0.0007
export const SURFACE_LIFT = 0.004
/** Dense freehand sample while the pointer is down (poly 5). */
export const STROKE_GAP = 0.0008
/** Collapse colinear wobble after the loop is closed — not while drawing. */
export const STROKE_SIMPLIFY = 0.0015
export const POLY_MIN = 1
export const POLY_MAX = 8
export const POLY_DEFAULT = 5

const POLY_GAP = [0.008, 0.004, 0.002, 0.0012, 0.0008, 0.00055, 0.0004, 0.00028] as const
const POLY_SIMPLIFY = [0.014, 0.008, 0.004, 0.0024, 0.0015, 0.001, 0.0007, 0.00045] as const

export function clampPoly(value: number): number {
  if (!Number.isFinite(value)) return POLY_DEFAULT
  return Math.min(POLY_MAX, Math.max(POLY_MIN, Math.round(value)))
}

export function strokeGapForPoly(poly: number): number {
  return POLY_GAP[clampPoly(poly) - 1]
}

export function simplifyForPoly(poly: number): number {
  return POLY_SIMPLIFY[clampPoly(poly) - 1]
}

export const HIGHLIGHT_MIN = 0.01
export const HIGHLIGHT_MAX = 0.045

export function stemTip(
  position: readonly [number, number, number],
  normal: readonly [number, number, number] | null | undefined,
  length = STEM_LENGTH,
): [number, number, number] {
  const n = normal ?? [0, 1, 0]
  const len = Math.hypot(n[0], n[1], n[2]) || 1
  return [
    position[0] + (n[0] / len) * length,
    position[1] + (n[1] / len) * length,
    position[2] + (n[2] / len) * length,
  ]
}

export function worldDistance(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

export function clampHighlightRadius(distance: number): number {
  if (!Number.isFinite(distance) || distance <= 0) return HIGHLIGHT_MIN
  return Math.min(HIGHLIGHT_MAX, Math.max(HIGHLIGHT_MIN, distance))
}

export function shouldAppendStroke(
  prev: readonly [number, number, number] | null | undefined,
  next: readonly [number, number, number],
  gap = STROKE_GAP,
): boolean {
  if (!prev) return true
  return worldDistance(prev, next) >= gap
}

function segmentDistance(
  point: readonly [number, number, number],
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): number {
  const abx = b[0] - a[0]
  const aby = b[1] - a[1]
  const abz = b[2] - a[2]
  const apx = point[0] - a[0]
  const apy = point[1] - a[1]
  const apz = point[2] - a[2]
  const ab2 = abx * abx + aby * aby + abz * abz
  if (ab2 < 1e-16) return worldDistance(point, a)
  let t = (apx * abx + apy * aby + apz * abz) / ab2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(point[0] - (a[0] + abx * t), point[1] - (a[1] + aby * t), point[2] - (a[2] + abz * t))
}

function rdp(
  points: readonly [number, number, number][],
  epsilon: number,
): [number, number, number][] {
  if (points.length <= 2) return points.map((point) => [point[0], point[1], point[2]])
  const first = points[0]
  const last = points[points.length - 1]
  let maxD = 0
  let maxI = 0
  for (let i = 1; i < points.length - 1; i++) {
    const d = segmentDistance(points[i], first, last)
    if (d > maxD) {
      maxD = d
      maxI = i
    }
  }
  if (maxD <= epsilon) return [[first[0], first[1], first[2]], [last[0], last[1], last[2]]]
  const left = rdp(points.slice(0, maxI + 1), epsilon)
  const right = rdp(points.slice(maxI), epsilon)
  return [...left.slice(0, -1), ...right]
}

/** Trim a finished freehand loop. Live draw stays dense. */
export function simplifyStroke(
  points: readonly [number, number, number][],
  epsilon = STROKE_SIMPLIFY,
): [number, number, number][] {
  const ring = openRing(points)
  if (ring.length <= 2) return ring
  const next = rdp(ring, epsilon)
  return next.length >= 2 ? next : ring
}

function asUnit(n: readonly [number, number, number]): [number, number, number] {
  const len = Math.hypot(n[0], n[1], n[2]) || 1
  return [n[0] / len, n[1] / len, n[2] / len]
}

/** Ring samples on the mesh: probe along +normal, hit back toward the surface, then lift. */
export function surfaceCirclePoints(
  origin: readonly [number, number, number],
  normal: readonly [number, number, number] | null | undefined,
  radius: number,
  sampleCount: number,
  hitTowardSurface: (
    from: [number, number, number],
    dir: [number, number, number],
  ) => [number, number, number] | null,
  probe = 0.06,
): [number, number, number][] {
  const n = asUnit(normal ?? [0, 1, 0])
  const helper: [number, number, number] = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
  const tx = helper[1] * n[2] - helper[2] * n[1]
  const ty = helper[2] * n[0] - helper[0] * n[2]
  const tz = helper[0] * n[1] - helper[1] * n[0]
  const tlen = Math.hypot(tx, ty, tz) || 1
  const tangent: [number, number, number] = [tx / tlen, ty / tlen, tz / tlen]
  const bitangent: [number, number, number] = [
    n[1] * tangent[2] - n[2] * tangent[1],
    n[2] * tangent[0] - n[0] * tangent[2],
    n[0] * tangent[1] - n[1] * tangent[0],
  ]
  const count = Math.max(3, sampleCount | 0)
  const out: [number, number, number][] = []
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2
    const c = Math.cos(a)
    const s = Math.sin(a)
    const px = origin[0] + (tangent[0] * c + bitangent[0] * s) * radius
    const py = origin[1] + (tangent[1] * c + bitangent[1] * s) * radius
    const pz = origin[2] + (tangent[2] * c + bitangent[2] * s) * radius
    const from: [number, number, number] = [px + n[0] * probe, py + n[1] * probe, pz + n[2] * probe]
    const dir: [number, number, number] = [-n[0], -n[1], -n[2]]
    const hit = hitTowardSurface(from, dir)
    out.push(stemTip(hit ?? [px, py, pz], n, SURFACE_LIFT))
  }
  return out
}

/** Drop a duplicated closing vertex so a lasso can fan-fill. */
export function openRing(
  points: readonly [number, number, number][],
): [number, number, number][] {
  if (points.length < 2) return [...points]
  const first = points[0]
  const last = points[points.length - 1]
  if (first[0] === last[0] && first[1] === last[1] && first[2] === last[2]) {
    return points.slice(0, -1) as [number, number, number][]
  }
  return [...points]
}

export function ringCentroid(
  ring: readonly [number, number, number][],
): [number, number, number] | null {
  if (ring.length < 3) return null
  let x = 0
  let y = 0
  let z = 0
  for (const point of ring) {
    x += point[0]
    y += point[1]
    z += point[2]
  }
  const n = ring.length
  return [x / n, y / n, z / n]
}

/** Newell average so a lasso fill can project back onto the mesh. */
export function ringNewellNormal(
  ring: readonly [number, number, number][],
): [number, number, number] {
  if (ring.length < 3) return [0, 1, 0]
  let nx = 0
  let ny = 0
  let nz = 0
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]
    const b = ring[(i + 1) % ring.length]
    nx += (a[1] - b[1]) * (a[2] + b[2])
    ny += (a[2] - b[2]) * (a[0] + b[0])
    nz += (a[0] - b[0]) * (a[1] + b[1])
  }
  const len = Math.hypot(nx, ny, nz)
  if (!(len > 0)) return [0, 1, 0]
  return [nx / len, ny / len, nz / len]
}

/** Triangle-fan indices: vertex 0 is the centroid, 1…n are the ring. */
export function regionFanIndices(ringCount: number): number[] {
  if (ringCount < 3) return []
  const idx: number[] = []
  for (let i = 1; i < ringCount; i++) idx.push(0, i, i + 1)
  idx.push(0, ringCount, 1)
  return idx
}
