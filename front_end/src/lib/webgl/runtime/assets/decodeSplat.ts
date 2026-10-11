/**
 * SPZ (v1–v3 gzip, v4 zstd) → packed gaussians.
 * Layout matches the three.js SPZLoader contract. Spherical harmonics up to
 * degree 3 are kept as raw bytes, `(byte - 128) / 128` per coefficient.
 */
import { DataUtils } from 'three'

const SPZ_MAGIC = 0x5053474e
const HEADER_SIZE_BYTES = 16
const SH_C0 = 0.2820947917738781
const SPZ_COLOR_SCALE = SH_C0 / 0.15
const FLAG_LOD = 0x80
const MAX_GAUSSIANS = 8_000_000
const SH_DEGREE_TO_VECTORS = [0, 3, 8, 15, 24]
const MAX_SH_DEGREE = 3

const SCALE_LUT = new Float32Array(256)
const COLOR_LUT = new Uint8Array(256)
const QUAT_COMPONENT_LUT = new Float64Array(1024)

for (let i = 0; i < 256; i++) {
  SCALE_LUT[i] = Math.exp(i / 16 - 10)
  const clamped = new Uint8ClampedArray(1)
  clamped[0] = ((i / 255 - 0.5) * SPZ_COLOR_SCALE + 0.5) * 255
  COLOR_LUT[i] = clamped[0]
}

for (let i = 0; i < 1024; i++) {
  const value = Math.SQRT1_2 * ((i & 511) / 511)
  QUAT_COMPONENT_LUT[i] = (i & 512) !== 0 ? -value : value
}

export type SplatCloud = {
  count: number
  centers: Float32Array
  scales: Float32Array
  quaternions: Float32Array
  colors: Uint8Array
  /** 0–3. */
  shDegree: number
  /** `SH_DEGREE_TO_VECTORS[shDegree] * 3` bytes per splat, coefficient-major (rgb per coefficient). */
  sh: Uint8Array
}

export function shStride(shDegree: number): number {
  return SH_DEGREE_TO_VECTORS[shDegree] * 3
}

export function splatBounds(cloud: SplatCloud): {
  min: [number, number, number]
  max: [number, number, number]
} {
  if (cloud.count === 0) {
    return { min: [0, 0, 0], max: [0, 0, 0] }
  }
  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity
  const centers = cloud.centers
  for (let i = 0; i < cloud.count; i++) {
    const i3 = i * 3
    const x = centers[i3]
    const y = centers[i3 + 1]
    const z = centers[i3 + 2]
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (z < minZ) minZ = z
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
    if (z > maxZ) maxZ = z
  }
  return { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] }
}

/** Drop a distant shell of gaussians when a wide gap separates it from the dense cloud. */
export function cropSplatShell(cloud: SplatCloud): SplatCloud {
  const count = cloud.count
  if (count < 64) return cloud
  const centers = cloud.centers
  const step = Math.max(1, Math.floor(count / 8000))
  const xs: number[] = []
  const ys: number[] = []
  const zs: number[] = []
  for (let i = 0; i < count; i += step) {
    const i3 = i * 3
    xs.push(centers[i3])
    ys.push(centers[i3 + 1])
    zs.push(centers[i3 + 2])
  }
  const mid = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b)
    return sorted[sorted.length >> 1]
  }
  const cx = mid(xs)
  const cy = mid(ys)
  const cz = mid(zs)
  const radii: number[] = []
  for (let i = 0; i < count; i += step) {
    const i3 = i * 3
    radii.push(Math.hypot(centers[i3] - cx, centers[i3 + 1] - cy, centers[i3 + 2] - cz))
  }
  radii.sort((a, b) => a - b)
  let cut = radii[radii.length - 1]
  let found = false
  for (let i = 1; i < radii.length; i++) {
    const prev = radii[i - 1]
    if (radii[i] > Math.max(prev * 8, prev + 1)) {
      cut = prev * 1.25
      found = true
      break
    }
  }
  if (!found) return cloud
  const keep = new Uint8Array(count)
  let kept = 0
  for (let i = 0; i < count; i++) {
    const i3 = i * 3
    const radius = Math.hypot(centers[i3] - cx, centers[i3 + 1] - cy, centers[i3 + 2] - cz)
    if (radius > cut) continue
    keep[i] = 1
    kept++
  }
  if (kept < 32 || kept === count) return cloud
  const stride = shStride(cloud.shDegree)
  const next: SplatCloud = {
    count: kept,
    centers: new Float32Array(kept * 3),
    scales: new Float32Array(kept * 3),
    quaternions: new Float32Array(kept * 4),
    colors: new Uint8Array(kept * 4),
    shDegree: cloud.shDegree,
    sh: new Uint8Array(kept * stride),
  }
  let write = 0
  for (let i = 0; i < count; i++) {
    if (!keep[i]) continue
    const i3 = i * 3
    const i4 = i * 4
    const w3 = write * 3
    const w4 = write * 4
    next.centers[w3] = centers[i3]
    next.centers[w3 + 1] = centers[i3 + 1]
    next.centers[w3 + 2] = centers[i3 + 2]
    next.scales[w3] = cloud.scales[i3]
    next.scales[w3 + 1] = cloud.scales[i3 + 1]
    next.scales[w3 + 2] = cloud.scales[i3 + 2]
    next.quaternions[w4] = cloud.quaternions[i4]
    next.quaternions[w4 + 1] = cloud.quaternions[i4 + 1]
    next.quaternions[w4 + 2] = cloud.quaternions[i4 + 2]
    next.quaternions[w4 + 3] = cloud.quaternions[i4 + 3]
    next.colors[w4] = cloud.colors[i4]
    next.colors[w4 + 1] = cloud.colors[i4 + 1]
    next.colors[w4 + 2] = cloud.colors[i4 + 2]
    next.colors[w4 + 3] = cloud.colors[i4 + 3]
    if (stride > 0) next.sh.set(cloud.sh.subarray(i * stride, (i + 1) * stride), write * stride)
    write++
  }
  return next
}

function toBytes(input: ArrayBuffer | Uint8Array): Uint8Array {
  return input instanceof Uint8Array ? input : new Uint8Array(input)
}

function payloadStart(bytes: Uint8Array): number {
  let i = 0
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) i = 3
  while (i < bytes.length && (bytes[i] === 0x20 || bytes[i] === 0x09 || bytes[i] === 0x0a || bytes[i] === 0x0d)) i++
  return i
}

async function inflate(bytes: Uint8Array, format: 'gzip' | 'zstd'): Promise<Uint8Array> {
  const copy = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(copy).set(bytes)
  const stream = new Blob([copy]).stream().pipeThrough(new DecompressionStream(format as CompressionFormat))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

function readInt24(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] << 8) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 24)) >> 8
}

function readCenters(
  bytes: Uint8Array,
  centers: Float32Array,
  count: number,
  version: number,
  fractionalBits: number,
) {
  if (version === 1) {
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const row = i3 * 2
      centers[i3] = DataUtils.fromHalfFloat(bytes[row] | (bytes[row + 1] << 8))
      centers[i3 + 1] = DataUtils.fromHalfFloat(bytes[row + 2] | (bytes[row + 3] << 8))
      centers[i3 + 2] = DataUtils.fromHalfFloat(bytes[row + 4] | (bytes[row + 5] << 8))
    }
    return
  }
  const fixedScale = 1 / (1 << fractionalBits)
  for (let i = 0; i < count; i++) {
    const i3 = i * 3
    const row = i * 9
    centers[i3] = readInt24(bytes, row) * fixedScale
    centers[i3 + 1] = readInt24(bytes, row + 3) * fixedScale
    centers[i3 + 2] = readInt24(bytes, row + 6) * fixedScale
  }
}

function readXyzQuaternion(bytes: Uint8Array, offset: number, target: number[]) {
  const qx = bytes[offset] / 127.5 - 1
  const qy = bytes[offset + 1] / 127.5 - 1
  const qz = bytes[offset + 2] / 127.5 - 1
  target[0] = qx
  target[1] = qy
  target[2] = qz
  target[3] = Math.sqrt(Math.max(0, 1 - qx * qx - qy * qy - qz * qz))
}

function readSmallestThreeQuaternion(packed: number, target: number[]) {
  const largestIndex = packed >>> 30
  const a = QUAT_COMPONENT_LUT[packed & 1023]
  const b = QUAT_COMPONENT_LUT[(packed >>> 10) & 1023]
  const c = QUAT_COMPONENT_LUT[(packed >>> 20) & 1023]
  switch (largestIndex) {
    case 0:
      target[1] = c
      target[2] = b
      target[3] = a
      break
    case 1:
      target[0] = c
      target[2] = b
      target[3] = a
      break
    case 2:
      target[0] = c
      target[1] = b
      target[3] = a
      break
    default:
      target[0] = c
      target[1] = b
      target[2] = a
      break
  }
  target[largestIndex] = Math.sqrt(Math.max(0, 1 - (a * a + b * b + c * c)))
}

function packedQuaternions(rotations: Uint8Array, count: number): Uint32Array {
  if (rotations.byteOffset % 4 === 0) {
    return new Uint32Array(rotations.buffer, rotations.byteOffset, count)
  }
  const copy = rotations.buffer.slice(rotations.byteOffset, rotations.byteOffset + count * 4)
  return new Uint32Array(copy)
}

function packAttributes(args: {
  positions: Uint8Array
  alphas: Uint8Array
  colors: Uint8Array
  scales: Uint8Array
  rotations: Uint8Array
  sphericalHarmonics: Uint8Array
  storedShDegree: number
  count: number
  version: number
  fractionalBits: number
}): SplatCloud {
  const { positions, alphas, colors, scales, rotations, count, version, fractionalBits } = args
  const shDegree = Math.min(args.storedShDegree, MAX_SH_DEGREE)
  const stride = shStride(shDegree)
  const sourceStride = shStride(args.storedShDegree)
  let sh: Uint8Array
  if (stride === sourceStride) sh = args.sphericalHarmonics.slice(0, count * stride)
  else {
    sh = new Uint8Array(count * stride)
    for (let i = 0; i < count; i++) {
      sh.set(args.sphericalHarmonics.subarray(i * sourceStride, i * sourceStride + stride), i * stride)
    }
  }
  const centers = new Float32Array(count * 3)
  const scaleOut = new Float32Array(count * 3)
  const quaternions = new Float32Array(count * 4)
  const colorOut = new Uint8Array(count * 4)
  readCenters(positions, centers, count, version, fractionalBits)
  const packed = version >= 3 ? packedQuaternions(rotations, count) : null
  const quaternion = [0, 0, 0, 0]
  for (let i = 0; i < count; i++) {
    const i3 = i * 3
    const i4 = i * 4
    scaleOut[i3] = SCALE_LUT[scales[i3]]
    scaleOut[i3 + 1] = SCALE_LUT[scales[i3 + 1]]
    scaleOut[i3 + 2] = SCALE_LUT[scales[i3 + 2]]
    if (packed) readSmallestThreeQuaternion(packed[i], quaternion)
    else readXyzQuaternion(rotations, i3, quaternion)
    quaternions[i4] = quaternion[0]
    quaternions[i4 + 1] = quaternion[1]
    quaternions[i4 + 2] = quaternion[2]
    quaternions[i4 + 3] = quaternion[3]
    colorOut[i4] = COLOR_LUT[colors[i3]]
    colorOut[i4 + 1] = COLOR_LUT[colors[i3 + 1]]
    colorOut[i4 + 2] = COLOR_LUT[colors[i3 + 2]]
    colorOut[i4 + 3] = alphas[i]
  }
  return { count, centers, scales: scaleOut, quaternions, colors: colorOut, shDegree, sh }
}

function decodeRaw(bytes: Uint8Array): SplatCloud {
  if (bytes.byteLength < HEADER_SIZE_BYTES) throw new Error('Invalid SPZ header')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const magic = view.getUint32(0, true)
  const version = view.getUint32(4, true)
  const count = view.getUint32(8, true)
  const storedShDegree = view.getUint8(12)
  const fractionalBits = view.getUint8(13)
  const flags = view.getUint8(14)
  if (magic !== SPZ_MAGIC) throw new Error('Not an SPZ file')
  if (version < 1 || version > 3) throw new Error(`SPZ version ${version} is not supported`)
  if (storedShDegree >= SH_DEGREE_TO_VECTORS.length) {
    throw new Error(`Unsupported SPZ spherical harmonics degree ${storedShDegree}`)
  }
  if (fractionalBits > 24) throw new Error('Unsupported SPZ fractional bits')
  if (count > MAX_GAUSSIANS) throw new Error('SPZ has too many gaussians to draw')
  const positionsSize = count * 3 * (version === 1 ? 2 : 3)
  const rotationsSize = count * (version === 3 ? 4 : 3)
  const shSize = count * SH_DEGREE_TO_VECTORS[storedShDegree] * 3
  const lodSize = (flags & FLAG_LOD) !== 0 ? count * 6 : 0
  const expected =
    HEADER_SIZE_BYTES + positionsSize + count + count * 3 + count * 3 + rotationsSize + shSize + lodSize
  if (!Number.isSafeInteger(expected) || bytes.byteLength !== expected) {
    throw new Error('Invalid SPZ byte length')
  }
  let offset = HEADER_SIZE_BYTES
  const positions = bytes.subarray(offset, offset + positionsSize)
  offset += positionsSize
  const alphas = bytes.subarray(offset, offset + count)
  offset += count
  const colors = bytes.subarray(offset, offset + count * 3)
  offset += count * 3
  const scales = bytes.subarray(offset, offset + count * 3)
  offset += count * 3
  const rotations = bytes.subarray(offset, offset + rotationsSize)
  offset += rotationsSize
  const sphericalHarmonics = bytes.subarray(offset, offset + shSize)
  return packAttributes({
    positions,
    alphas,
    colors,
    scales,
    rotations,
    sphericalHarmonics,
    storedShDegree,
    count,
    version,
    fractionalBits,
  })
}

async function decodeV4(bytes: Uint8Array): Promise<SplatCloud> {
  if (bytes.byteLength < 20) throw new Error('Invalid SPZ header')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const count = view.getUint32(8, true)
  const storedShDegree = view.getUint8(12)
  const fractionalBits = view.getUint8(13)
  const numStreams = view.getUint8(15)
  const tocByteOffset = view.getUint32(16, true)
  if (storedShDegree >= SH_DEGREE_TO_VECTORS.length) {
    throw new Error(`Unsupported SPZ spherical harmonics degree ${storedShDegree}`)
  }
  if (fractionalBits > 24) throw new Error('Unsupported SPZ fractional bits')
  if (count > MAX_GAUSSIANS) throw new Error('SPZ has too many gaussians to draw')
  const positionsSize = count * 9
  const rotationsSize = count * 4
  const shSize = count * SH_DEGREE_TO_VECTORS[storedShDegree] * 3
  const streamSizes = [positionsSize, count, count * 3, count * 3, rotationsSize, shSize]
  const toc: { offset: number; size: number }[] = []
  let compressedOffset = tocByteOffset + numStreams * 16
  for (let i = 0; i < numStreams; i++) {
    const entryOffset = tocByteOffset + i * 16
    if (entryOffset + 8 > bytes.byteLength) throw new Error('Invalid SPZ header')
    const compressedSize = Number(view.getBigUint64(entryOffset, true))
    toc.push({ offset: compressedOffset, size: compressedSize })
    compressedOffset += compressedSize
  }
  const streams: Uint8Array[] = []
  let streamIndex = 0
  for (const streamSize of streamSizes) {
    if (streamSize === 0) {
      streams.push(new Uint8Array())
      continue
    }
    const entry = toc[streamIndex++]
    if (!entry) throw new Error('SPZ v4 is missing a stream')
    const end = entry.offset + entry.size
    if (end > bytes.byteLength) throw new Error('Invalid SPZ byte length')
    let raw: Uint8Array
    try {
      raw = await inflate(bytes.subarray(entry.offset, end), 'zstd')
    } catch {
      throw new Error('SPZ v4 could not be decompressed')
    }
    if (raw.byteLength !== streamSize) throw new Error('Invalid SPZ byte length')
    streams.push(raw)
  }
  return packAttributes({
    positions: streams[0],
    alphas: streams[1],
    colors: streams[2],
    scales: streams[3],
    rotations: streams[4],
    sphericalHarmonics: streams[5],
    storedShDegree,
    count,
    version: 4,
    fractionalBits,
  })
}

export async function decodeSplatBytes(input: ArrayBuffer | Uint8Array): Promise<SplatCloud> {
  const bytes = toBytes(input)
  if (bytes.byteLength === 0) throw new Error('SPZ file is empty')
  const start = payloadStart(bytes)
  if (start >= bytes.byteLength) throw new Error('SPZ file is empty')
  if (bytes[start] === 0x70 && bytes[start + 1] === 0x6c && bytes[start + 2] === 0x79) {
    throw new Error('PLY is not an SPZ file')
  }
  if (bytes[start] === 0x3c) throw new Error('HTML is not an SPZ file')
  if (bytes.byteLength >= 8) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    const magic = view.getUint32(0, true)
    const version = view.getUint32(4, true)
    if (magic === SPZ_MAGIC) {
      if (version !== 4) throw new Error(`SPZ version ${version} is not supported`)
      return decodeV4(bytes)
    }
  }
  let raw: Uint8Array
  try {
    raw = await inflate(bytes, 'gzip')
  } catch {
    throw new Error('Not an SPZ file')
  }
  return decodeRaw(raw)
}
