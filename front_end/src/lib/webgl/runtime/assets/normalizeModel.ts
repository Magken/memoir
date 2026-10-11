export type UpAxis = 'y' | 'z'

export type Box3Like = {
  min: readonly [number, number, number]
  max: readonly [number, number, number]
}

export type NormalizeModelResult = {
  /** Translation after scale + up-axis rotation. */
  position: [number, number, number]
  /** Uniform scale so the longest edge equals `targetSize`. */
  scale: number
  /** Euler XYZ in radians. Z-up assets get −90° around X. */
  rotation: [number, number, number]
}

function sizeOf(box: Box3Like): [number, number, number] {
  return [box.max[0] - box.min[0], box.max[1] - box.min[1], box.max[2] - box.min[2]]
}

function rotateX(point: [number, number, number], radians: number): [number, number, number] {
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return [point[0], point[1] * cos - point[2] * sin, point[1] * sin + point[2] * cos]
}

function transformedAabb(box: Box3Like, scale: number, rotX: number) {
  const xs = [box.min[0], box.max[0]]
  const ys = [box.min[1], box.max[1]]
  const zs = [box.min[2], box.max[2]]
  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity
  for (const x of xs) {
    for (const y of ys) {
      for (const z of zs) {
        const [tx, ty, tz] = rotateX([x * scale, y * scale, z * scale], rotX)
        if (tx < minX) minX = tx
        if (ty < minY) minY = ty
        if (tz < minZ) minZ = tz
        if (tx > maxX) maxX = tx
        if (ty > maxY) maxY = ty
        if (tz > maxZ) maxZ = tz
      }
    }
  }
  return { min: [minX, minY, minZ] as const, max: [maxX, maxY, maxZ] as const }
}

export function normalizeModelTransform(
  box: Box3Like,
  options: { targetSize?: number; upAxis?: UpAxis; sitOnGround?: boolean } = {},
): NormalizeModelResult {
  const targetSize = options.targetSize ?? 1
  const upAxis = options.upAxis ?? 'y'
  const sitOnGround = options.sitOnGround ?? true
  const size = sizeOf(box)
  const longest = Math.max(size[0], size[1], size[2], 0.0001)
  const scale = targetSize / longest
  const rotation: [number, number, number] =
    upAxis === 'z' ? [-Math.PI / 2, 0, 0] : [0, 0, 0]
  const aabb = transformedAabb(box, scale, rotation[0])
  const position: [number, number, number] = [
    -(aabb.min[0] + aabb.max[0]) / 2,
    sitOnGround ? -aabb.min[1] : -(aabb.min[1] + aabb.max[1]) / 2,
    -(aabb.min[2] + aabb.max[2]) / 2,
  ]
  return { position, scale, rotation }
}
