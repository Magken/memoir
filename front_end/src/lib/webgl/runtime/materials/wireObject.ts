import {
  Box3,
  BufferGeometry,
  CircleGeometry,
  DynamicDrawUsage,
  Frustum,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PointLight,
  Quaternion,
  Sphere,
  Vector3,
  type Camera,
  type Material,
  type Object3D,
} from 'three'

/** Rest cage sits on the shaded surface. The pinch lifts off; the bake does not. */
export const WIREFRAME_INFLATE_M = 0

/** Line radius as a fraction of the mesh longest edge (mesh-local). */
export const WIRE_LINE_RADIUS_FRAC = 0.00036

/** Node radius — just proud of the tube, not a boil. */
export const WIRE_NODE_RADIUS_FRAC = 0.00095

/** Radius of independent dots that follow the cursor. */
export const WIRE_REACH_FRAC = 0.3

/** How far those dots move along their own surface normal. */
export const WIRE_LIFT_FRAC = 0.055

/** Distance at which the rest of the net fades to nothing. */
export const WIRE_FADE_FRAC = 0.55

/** How uneven the influence blob is. 0 is a circle. */
export const WIRE_JAG_FRAC = 0.38

/** Draw a dot once its lift clears this fraction of the max. */
export const WIRE_SHOW_FRAC = 0.04

/** A joint is on the waved sheet only if it faces the cursor this much. */
export const WIRE_FACE_DOT = 0.2

/** Hide a tube that spans a crease or the far side of a rounded edge. */
export const WIRE_EDGE_DOT = 0.2

/** Hide a tube that has stretched into a chord through the solid. */
export const WIRE_CHORD_FRAC = 1.45

/** How quickly links grow and fade. Lower is a slower reconstruct. */
export const WIRE_LINK_RATE = 2.4

/** How quickly joint glow eases. Lower stops pointer lamps from popping. */
export const WIRE_NODE_RATE = 1.35

/** How many random swell origins can run at once. */
export const WIRE_RIPPLE_COUNT = 2

/** Extra concurrent pulses on compact sculptures (owl, Darwin's monkey, stone lantern). */
export const WIRE_RIPPLE_EXTRA = 2

/** Smaller glTFs that need `WIRE_RIPPLE_EXTRA` more idle waves. */
export const WIRE_COMPACT_PULSE_IDS = ['statue-of-an-owl', 'darwins-monkey', 'stone-lantern'] as const

/** Concurrent pulses for this cage. Adam / Liberty stay at `WIRE_RIPPLE_COUNT`. */
export function wireRippleCount(assetId?: string): number {
  if (assetId && (WIRE_COMPACT_PULSE_IDS as readonly string[]).includes(assetId)) {
    return WIRE_RIPPLE_COUNT + WIRE_RIPPLE_EXTRA
  }
  return WIRE_RIPPLE_COUNT
}

/** Seconds after a wave dies before that slot picks a new place. */
export const WIRE_RIPPLE_PERIOD = 0.55

/** How fast the crest travels, as a fraction of the longest edge per second. */
export const WIRE_RIPPLE_SPEED_FRAC = 0.2

/** Thickness of the traveling crest. */
export const WIRE_RIPPLE_WIDTH_FRAC = 0.065

/** How quickly a wave dies after it launches. */
export const WIRE_RIPPLE_DIE = 2.1

/** Default invisible PointLights per traveling wave. Compact sculptures add `WIRE_RIPPLE_EXTRA`. */
export const WIRE_WAVE_LIGHTS = WIRE_RIPPLE_COUNT

/** One extra PointLight that sits on the raycast hit while hovering. */
export const WIRE_HOVER_LIGHTS = 1

export const WIRE_LIGHT_DEFAULT = 0xf2c48a

export const WIRE_UNREACHED = 1e9

export const WIRE_SPRING_KEY = 'wireSpring'

export type WireSpringState = {
  rest: Float32Array
  offset: Float32Array
  vel: Float32Array
  edges: Uint32Array
  /** Outward unit normals. Offsets may not point against these. */
  normals: Float32Array
  lineRadius: number
  nodeRadius: number
  reach: number
  fade: number
  lift: number
  hasFocus: boolean
  /** Seconds the last raycast is kept so a miss does not kill the pointer lamp. */
  hoverHold: number
  /** Seconds the pointer lamp has been rising. Reset only when that lamp is dark. */
  hoverAge: number
  focusX: number
  focusY: number
  focusZ: number
  focusNX: number
  focusNY: number
  focusNZ: number
  /** Packed neighbor ranges, one row per joint. */
  adjOffset: Uint32Array
  adjNode: Int32Array
  adjLen: Float32Array
  /** Geodesic distance along the facing sheet. */
  surfaceDist: Float32Array
  /** 0–1 reconstruct of each tube. */
  linkAlpha: Float32Array
  /** 0–1 eased glow of each joint. */
  nodeAlpha: Float32Array
  rippleSeed: number
  rippleSpeed: number
  rippleWidth: number
  rippleDie: number
  /** Concurrent pulses. Compact sculptures use `WIRE_RIPPLE_COUNT + WIRE_RIPPLE_EXTRA`. */
  rippleCount: number
  rippleAge: Float32Array
  rippleOrigin: Int32Array
  rippleDist: Float32Array
  field: Float32Array
  asleep: boolean
}

export const WIREFRAME_OVERLAY_KEY = 'webglWireOverlay'

export type WireMeshData = {
  objectName: string
  nodeRadius: number
  lineRadius: number
  /** Packed xyz. */
  nodes: number[]
  /** Packed outward unit normals, one per node. */
  normals: number[]
  /** Packed node-index pairs. */
  edges: number[]
}

export type WireObjectData = {
  assetId: string
  meshes: WireMeshData[]
}

export function isWireframeOverlay(obj: { userData?: { webglWireOverlay?: boolean } }): boolean {
  return Boolean(obj.userData?.webglWireOverlay)
}

export function wireFieldHash(x: number, y: number, z: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453
  return n - Math.floor(n)
}

/** Per-dot reach so the lifted region is not a circle. */
export function wireReachAt(x: number, y: number, z: number, reach: number): number {
  const coarse = wireFieldHash(x, y, z)
  const fine = wireFieldHash(x * 2.17, y * 1.91, z * 2.43)
  const wiggle = (coarse * 0.65 + fine * 0.35) * 2 - 1
  return Math.max(1e-6, reach * (1 + WIRE_JAG_FRAC * wiggle))
}

/** 1 inside the influence, 0 past the fade. */
export function wireFadeOpacity(dist: number, reach: number, fade: number): number {
  if (!(fade > 0) || dist >= fade) return 0
  if (dist <= reach) return 1
  const t = 1 - (dist - reach) / (fade - reach)
  return t * t
}

export function ensureWireGraph(state: WireSpringState) {
  const count = state.rest.length / 3
  if (state.adjOffset && state.adjOffset.length === count + 1) return
  const deg = new Uint32Array(count)
  for (let e = 0; e < state.edges.length; e += 2) {
    deg[state.edges[e]]++
    deg[state.edges[e + 1]]++
  }
  const adjOffset = new Uint32Array(count + 1)
  for (let i = 0; i < count; i++) adjOffset[i + 1] = adjOffset[i] + deg[i]
  const adjNode = new Int32Array(adjOffset[count])
  const adjLen = new Float32Array(adjOffset[count])
  const cursor = Uint32Array.from(adjOffset)
  for (let e = 0; e < state.edges.length; e += 2) {
    const a = state.edges[e]
    const b = state.edges[e + 1]
    const pa = a * 3
    const pb = b * 3
    const len = Math.hypot(
      state.rest[pb] - state.rest[pa],
      state.rest[pb + 1] - state.rest[pa + 1],
      state.rest[pb + 2] - state.rest[pa + 2],
    )
    const ia = cursor[a]++
    adjNode[ia] = b
    adjLen[ia] = len
    const ib = cursor[b]++
    adjNode[ib] = a
    adjLen[ib] = len
  }
  state.adjOffset = adjOffset
  state.adjNode = adjNode
  state.adjLen = adjLen
  state.surfaceDist = new Float32Array(count)
  if (!state.linkAlpha || state.linkAlpha.length !== state.edges.length / 2) {
    state.linkAlpha = new Float32Array(state.edges.length / 2)
  }
}

const _heap: number[] = []

function heapPush(dist: Float32Array, i: number) {
  _heap.push(i)
  let k = _heap.length - 1
  while (k > 0) {
    const p = (k - 1) >> 1
    if (dist[_heap[p]] <= dist[_heap[k]]) break
    const swap = _heap[p]
    _heap[p] = _heap[k]
    _heap[k] = swap
    k = p
  }
}

function heapPop(dist: Float32Array): number {
  const top = _heap[0]
  const last = _heap.pop()
  if (last === undefined || !_heap.length) return top
  _heap[0] = last
  let k = 0
  for (;;) {
    const l = k * 2 + 1
    const r = l + 1
    let s = k
    if (l < _heap.length && dist[_heap[l]] < dist[_heap[s]]) s = l
    if (r < _heap.length && dist[_heap[r]] < dist[_heap[s]]) s = r
    if (s === k) break
    const swap = _heap[k]
    _heap[k] = _heap[s]
    _heap[s] = swap
    k = s
  }
  return top
}

function facingDot(state: WireSpringState, index: number): number {
  const p = index * 3
  return state.normals[p] * state.focusNX + state.normals[p + 1] * state.focusNY + state.normals[p + 2] * state.focusNZ
}

/** Walk the facing sheet from the cursor. Volume shortcuts do not count. */
export function fillWireField(state: WireSpringState) {
  ensureWireGraph(state)
  const dist = state.surfaceDist
  dist.fill(WIRE_UNREACHED)
  if (!state.hasFocus) return
  const count = state.rest.length / 3
  let seed = -1
  let best = WIRE_UNREACHED
  for (let i = 0; i < count; i++) {
    if (facingDot(state, i) < WIRE_FACE_DOT) continue
    const p = i * 3
    const d = Math.hypot(
      state.rest[p] - state.focusX,
      state.rest[p + 1] - state.focusY,
      state.rest[p + 2] - state.focusZ,
    )
    if (d < best) {
      best = d
      seed = i
    }
  }
  if (seed < 0) return
  dist[seed] = best
  _heap.length = 0
  heapPush(dist, seed)
  while (_heap.length) {
    const i = heapPop(dist)
    const di = dist[i]
    const start = state.adjOffset[i]
    const end = state.adjOffset[i + 1]
    const pi = i * 3
    for (let e = start; e < end; e++) {
      const j = state.adjNode[e]
      if (facingDot(state, j) < WIRE_FACE_DOT) continue
      const pj = j * 3
      const crease =
        state.normals[pi] * state.normals[pj] +
        state.normals[pi + 1] * state.normals[pj + 1] +
        state.normals[pi + 2] * state.normals[pj + 2]
      if (crease < WIRE_EDGE_DOT) continue
      const next = di + state.adjLen[e]
      if (next >= dist[j]) continue
      dist[j] = next
      heapPush(dist, j)
    }
  }
}

export function wireLinkAllowed(state: WireSpringState, ia: number, ib: number, posedLen: number): boolean {
  const pa = ia * 3
  const pb = ib * 3
  const crease =
    state.normals[pa] * state.normals[pb] +
    state.normals[pa + 1] * state.normals[pb + 1] +
    state.normals[pa + 2] * state.normals[pb + 2]
  if (crease < WIRE_EDGE_DOT) return false
  const restLen = Math.hypot(
    state.rest[pb] - state.rest[pa],
    state.rest[pb + 1] - state.rest[pa + 1],
    state.rest[pb + 2] - state.rest[pa + 2],
  )
  return !(restLen > 1e-8 && posedLen > restLen * WIRE_CHORD_FRAC)
}

function rippleRand(state: WireSpringState): number {
  state.rippleSeed = (Math.imul(state.rippleSeed, 1664525) + 1013904223) >>> 0
  return state.rippleSeed / 4294967296
}

function hashSeed(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

/** Geodesic from one joint. Stays on the cage; no volume shortcuts. */
export function fillGeodesicFrom(state: WireSpringState, seed: number, dest: Float32Array) {
  ensureWireGraph(state)
  dest.fill(WIRE_UNREACHED)
  const count = state.rest.length / 3
  if (seed < 0 || seed >= count) return
  dest[seed] = 0
  _heap.length = 0
  heapPush(dest, seed)
  while (_heap.length) {
    const i = heapPop(dest)
    const di = dest[i]
    const start = state.adjOffset[i]
    const end = state.adjOffset[i + 1]
    for (let e = start; e < end; e++) {
      const j = state.adjNode[e]
      const next = di + state.adjLen[e]
      if (next >= dest[j]) continue
      dest[j] = next
      heapPush(dest, j)
    }
  }
}

/** Traveling crest: 1 at the ring, 0 ahead of it and after it dies. */
export function wireRipple(dist: number, age: number, speed: number, width: number, die: number): number {
  if (!(age >= 0) || !(speed > 0) || !(width > 0) || dist >= WIRE_UNREACHED) return 0
  const crest = speed * age
  const fall = Math.exp(-age / Math.max(1e-3, die))
  const ring = Math.exp((-(dist - crest) * (dist - crest)) / (2 * width * width))
  return ring * fall
}

function rippleSlots(state: WireSpringState): number {
  return state.rippleCount > 0 ? state.rippleCount : WIRE_RIPPLE_COUNT
}

function pickRippleOrigin(state: WireSpringState, slot: number): number {
  const count = state.rest.length / 3
  if (count < 2) return 0
  const n = rippleSlots(state)
  const taken = new Set<number>()
  for (let s = 0; s < n; s++) {
    if (s === slot) continue
    const origin = state.rippleOrigin[s]
    if (origin >= 0) taken.add(origin)
  }
  let seed = Math.floor(rippleRand(state) * count)
  for (let k = 0; k < count; k++) {
    const candidate = (seed + k) % count
    if (!taken.has(candidate)) return candidate
  }
  return seed
}

function fireRipple(state: WireSpringState, slot: number) {
  const count = state.rest.length / 3
  const seed = pickRippleOrigin(state, slot)
  state.rippleOrigin[slot] = seed
  state.rippleAge[slot] = 0
  const dest = state.rippleDist.subarray(slot * count, (slot + 1) * count)
  fillGeodesicFrom(state, seed, dest)
}

export function initWireRipples(state: WireSpringState, seed = 1) {
  ensureWireGraph(state)
  const count = state.rest.length / 3
  const n = rippleSlots(state)
  state.rippleCount = n
  state.rippleSeed = seed || 1
  if (!state.rippleAge || state.rippleAge.length !== n) {
    state.rippleAge = new Float32Array(n)
    state.rippleOrigin = new Int32Array(n)
  }
  if (!state.rippleDist || state.rippleDist.length !== count * n) {
    state.rippleDist = new Float32Array(count * n)
  }
  if (!state.field || state.field.length !== count) state.field = new Float32Array(count)
  for (let s = 0; s < n; s++) {
    fireRipple(state, s)
    if (s > 0 && n > 1) state.rippleAge[s] = state.rippleDie * 0.55 * (s / (n - 1))
  }
  writeRippleField(state)
}

function writeRippleField(state: WireSpringState) {
  const count = state.rest.length / 3
  if (!state.field || state.field.length !== count) state.field = new Float32Array(count)
  const speed = Number.isFinite(state.rippleSpeed) ? state.rippleSpeed : 0.2
  const width = Number.isFinite(state.rippleWidth) && state.rippleWidth > 0 ? state.rippleWidth : 0.05
  const die = Number.isFinite(state.rippleDie) && state.rippleDie > 0 ? state.rippleDie : WIRE_RIPPLE_DIE
  const n = rippleSlots(state)
  const band = width * 4
  for (let i = 0; i < count; i++) {
    let amp = 0
    for (let s = 0; s < n; s++) {
      const dist = state.rippleDist[s * count + i]
      if (!(dist < WIRE_UNREACHED)) continue
      const crest = speed * state.rippleAge[s]
      if (Math.abs(dist - crest) > band) continue
      amp += wireRipple(dist, state.rippleAge[s], speed, width, die)
    }
    state.field[i] = Math.min(1, amp)
  }
}

/** Launch and fade traveling waves from random joints. */
export function stepWireRipples(state: WireSpringState, dt: number) {
  ensureWireGraph(state)
  const count = state.rest.length / 3
  if (count < 1) return 0
  const n = rippleSlots(state)
  if (!state.rippleAge || state.rippleAge.length !== n) initWireRipples(state, state.rippleSeed || 1)
  const step = Math.min(0.05, Math.max(0, dt))
  const die = state.rippleDie || WIRE_RIPPLE_DIE
  let peak = 0
  for (let s = 0; s < n; s++) {
    state.rippleAge[s] += step
    if (state.rippleAge[s] > die + WIRE_RIPPLE_PERIOD) fireRipple(state, s)
  }
  writeRippleField(state)
  for (let i = 0; i < count; i++) peak = Math.max(peak, state.field[i])
  return peak
}

const _p = new Vector3()
const _n = new Vector3()
const _a = new Vector3()
const _b = new Vector3()
const _dir = new Vector3()
const _mid = new Vector3()
const _y = new Vector3(0, 1, 0)
const _z = new Vector3(0, 0, 1)
const _side = new Vector3()
const _face = new Vector3()
const _camLocal = new Vector3()
const _worldA = new Vector3()
const _worldB = new Vector3()
const _quat = new Quaternion()
const _scale = new Vector3()
const _m = new Matrix4()
const _proj = new Matrix4()
const _frustum = new Frustum()
const _sphere = new Sphere()
const _box = new Box3()

let sharedLinkSprite: PlaneGeometry | null = null
let sharedNodeSprite: CircleGeometry | null = null

/** Two-triangle strip. World-space width matches the old tube diameter. */
function linkSpriteGeo(): PlaneGeometry {
  if (!sharedLinkSprite) sharedLinkSprite = new PlaneGeometry(2, 1)
  return sharedLinkSprite
}

/** Camera-facing disc. Thin joints are indistinguishable from a tessellated sphere. */
function nodeSpriteGeo(): CircleGeometry {
  if (!sharedNodeSprite) sharedNodeSprite = new CircleGeometry(1, 8)
  return sharedNodeSprite
}

function syncWireFrustum(camera: Camera) {
  _proj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
  _frustum.setFromProjectionMatrix(_proj)
}

function pointInWireFrustum(world: Vector3, radius: number): boolean {
  _sphere.center.copy(world)
  _sphere.radius = radius
  return _frustum.intersectsSphere(_sphere)
}

function segmentInWireFrustum(a: Vector3, b: Vector3, radius: number): boolean {
  _box.makeEmpty()
  _box.expandByPoint(a)
  _box.expandByPoint(b)
  _box.expandByScalar(radius)
  return _frustum.intersectsBox(_box)
}

export function inflateGeometryAlongNormals(geometry: BufferGeometry, metres: number): BufferGeometry {
  const geo = geometry.clone()
  if (!geo.getAttribute('normal')) geo.computeVertexNormals()
  const pos = geo.getAttribute('position')
  const nor = geo.getAttribute('normal')
  if (!pos || !nor) return geo
  for (let i = 0; i < pos.count; i++) {
    _p.fromBufferAttribute(pos, i)
    _n.fromBufferAttribute(nor, i)
    if (_n.lengthSq() > 0) _n.normalize()
    _p.addScaledVector(_n, metres)
    pos.setXYZ(i, _p.x, _p.y, _p.z)
  }
  pos.needsUpdate = true
  geo.computeBoundingBox()
  return geo
}

function triangleIndices(geometry: BufferGeometry): ArrayLike<number> {
  if (geometry.index) return geometry.index.array
  const count = geometry.getAttribute('position')?.count ?? 0
  const out = new Uint32Array(count)
  for (let i = 0; i < count; i++) out[i] = i
  return out
}

function longestSpan(nodes: number[]): number {
  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity
  for (let i = 0; i < nodes.length; i += 3) {
    const x = nodes[i]
    const y = nodes[i + 1]
    const z = nodes[i + 2]
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (z < minZ) minZ = z
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
    if (z > maxZ) maxZ = z
  }
  if (!Number.isFinite(minX)) return 1
  return Math.max(maxX - minX, maxY - minY, maxZ - minZ, 0.0001)
}

/** Hard ceiling for one asset’s cage. Adam sits under this; high-poly glTFs clamp to it. */
export const WIRE_CAGE_NODE_BUDGET = 6500

export function wireMeshNodeCount(data: WireMeshData): number {
  return Math.floor(data.nodes.length / 3)
}

function weldWireMesh(data: WireMeshData, grid: number): WireMeshData {
  const count = wireMeshNodeCount(data)
  const remap = new Int32Array(count)
  const nodes: number[] = []
  const accN: number[] = []
  const weld = new Map<string, number>()
  for (let i = 0; i < count; i++) {
    const p = i * 3
    const key = `${Math.round(data.nodes[p] * grid)}:${Math.round(data.nodes[p + 1] * grid)}:${Math.round(data.nodes[p + 2] * grid)}`
    let id = weld.get(key)
    if (id === undefined) {
      id = nodes.length / 3
      weld.set(key, id)
      nodes.push(data.nodes[p], data.nodes[p + 1], data.nodes[p + 2])
      accN.push(0, 0, 0)
    }
    remap[i] = id
    accN[id * 3] += data.normals[p] ?? 0
    accN[id * 3 + 1] += data.normals[p + 1] ?? 0
    accN[id * 3 + 2] += data.normals[p + 2] ?? 1
  }
  const normals: number[] = []
  for (let i = 0; i < nodes.length; i += 3) {
    const len = Math.hypot(accN[i], accN[i + 1], accN[i + 2]) || 1
    normals.push(accN[i] / len, accN[i + 1] / len, accN[i + 2] / len)
  }
  const edgeSet = new Set<string>()
  const edges: number[] = []
  for (let i = 0; i + 1 < data.edges.length; i += 2) {
    const a = remap[data.edges[i]]
    const b = remap[data.edges[i + 1]]
    if (a === b) continue
    const lo = Math.min(a, b)
    const hi = Math.max(a, b)
    const key = `${lo}:${hi}`
    if (edgeSet.has(key)) continue
    edgeSet.add(key)
    edges.push(lo, hi)
  }
  return {
    objectName: data.objectName,
    nodeRadius: data.nodeRadius,
    lineRadius: data.lineRadius,
    nodes,
    normals,
    edges,
  }
}

/** Voxel-weld a cage until it has at most `maxNodes` joints. */
export function capWireMesh(data: WireMeshData, maxNodes: number): WireMeshData {
  const count = wireMeshNodeCount(data)
  if (!(maxNodes > 0) || count <= maxNodes) return data
  const longest = longestSpan(data.nodes)
  let lo = 0.25
  let hi = Math.max(4, Math.sqrt(maxNodes) * 8)
  let best = weldWireMesh(data, lo / longest)
  while (wireMeshNodeCount(best) > maxNodes && lo > 0.02) {
    lo *= 0.5
    best = weldWireMesh(data, lo / longest)
  }
  if (wireMeshNodeCount(best) > maxNodes) return best
  for (let attempt = 0; attempt < 16; attempt++) {
    const mid = (lo + hi) / 2
    const next = weldWireMesh(data, mid / longest)
    if (wireMeshNodeCount(next) <= maxNodes) {
      best = next
      lo = mid
    } else {
      hi = mid
    }
    if (hi - lo < 0.05) break
  }
  return best
}

/** Clamp every mesh in an asset so the total joint count never exceeds the budget. */
export function capWireMeshes(
  meshes: readonly WireMeshData[],
  budget = WIRE_CAGE_NODE_BUDGET,
): WireMeshData[] {
  const counts = meshes.map(wireMeshNodeCount)
  const total = counts.reduce((sum, n) => sum + n, 0)
  if (total <= budget) return [...meshes]
  const capped = meshes.map((mesh, i) => {
    const share = Math.max(8, Math.round((budget * counts[i]) / total))
    return capWireMesh(mesh, share)
  })
  let overflow = capped.reduce((sum, mesh) => sum + wireMeshNodeCount(mesh), 0) - budget
  let guard = 0
  while (overflow > 0 && guard < 8) {
    guard += 1
    let heaviest = 0
    for (let i = 1; i < capped.length; i++) {
      if (wireMeshNodeCount(capped[i]) > wireMeshNodeCount(capped[heaviest])) heaviest = i
    }
    const have = wireMeshNodeCount(capped[heaviest])
    if (have <= 8) break
    capped[heaviest] = capWireMesh(meshes[heaviest], Math.max(8, have - overflow))
    overflow = capped.reduce((sum, mesh) => sum + wireMeshNodeCount(mesh), 0) - budget
  }
  return capped
}

/** Unique welded vertices + unique undirected edges. Mesh-local. `grid` is 1/metres of cell size (default 0.01 mm). */
export function extractWireMesh(geometry: BufferGeometry, objectName = '', grid = 1e5): WireMeshData {
  const geo = geometry.clone()
  if (!geo.getAttribute('normal')) geo.computeVertexNormals()
  const pos = geo.getAttribute('position')
  const nor = geo.getAttribute('normal')
  const nodes: number[] = []
  const accN: number[] = []
  const weld = new Map<string, number>()
  const nodeId = (vi: number): number => {
    const x = pos.getX(vi)
    const y = pos.getY(vi)
    const z = pos.getZ(vi)
    const key = `${Math.round(x * grid)}:${Math.round(y * grid)}:${Math.round(z * grid)}`
    let id = weld.get(key)
    if (id === undefined) {
      id = nodes.length / 3
      weld.set(key, id)
      nodes.push(x, y, z)
      accN.push(0, 0, 0)
    }
    if (nor) {
      accN[id * 3] += nor.getX(vi)
      accN[id * 3 + 1] += nor.getY(vi)
      accN[id * 3 + 2] += nor.getZ(vi)
    }
    return id
  }
  const edgeSet = new Set<string>()
  const edges: number[] = []
  const addEdge = (a: number, b: number) => {
    if (a === b) return
    const lo = Math.min(a, b)
    const hi = Math.max(a, b)
    const key = `${lo}:${hi}`
    if (edgeSet.has(key)) return
    edgeSet.add(key)
    edges.push(lo, hi)
  }
  const idx = triangleIndices(geo)
  for (let i = 0; i + 2 < idx.length; i += 3) {
    const a = nodeId(idx[i])
    const b = nodeId(idx[i + 1])
    const c = nodeId(idx[i + 2])
    addEdge(a, b)
    addEdge(b, c)
    addEdge(c, a)
  }
  geo.dispose()
  const longest = longestSpan(nodes)
  const gap = longest * WIRE_LINE_RADIUS_FRAC
  const normals: number[] = []
  for (let i = 0; i < nodes.length; i += 3) {
    const nx = accN[i]
    const ny = accN[i + 1]
    const nz = accN[i + 2]
    const len = Math.hypot(nx, ny, nz) || 1
    const ox = nx / len
    const oy = ny / len
    const oz = nz / len
    normals.push(ox, oy, oz)
    nodes[i] += ox * gap
    nodes[i + 1] += oy * gap
    nodes[i + 2] += oz * gap
  }
  return {
    objectName,
    nodeRadius: longest * WIRE_NODE_RADIUS_FRAC,
    lineRadius: longest * WIRE_LINE_RADIUS_FRAC,
    nodes,
    normals,
    edges,
  }
}

export function hostWireColor(host: Mesh): number {
  const source = Array.isArray(host.material) ? host.material[0] : host.material
  const color = (source as Material & { color?: { getHex?: () => number } } | undefined)?.color
  if (color && typeof color.getHex === 'function') return color.getHex()
  return 0x94a3b8
}

function cageNormals(data: WireMeshData): Float32Array {
  if (data.normals && data.normals.length === data.nodes.length) return Float32Array.from(data.normals)
  const out = new Float32Array(data.nodes.length)
  const count = data.nodes.length / 3 || 1
  let cx = 0
  let cy = 0
  let cz = 0
  for (let i = 0; i < data.nodes.length; i += 3) {
    cx += data.nodes[i]
    cy += data.nodes[i + 1]
    cz += data.nodes[i + 2]
  }
  cx /= count
  cy /= count
  cz /= count
  for (let i = 0; i < data.nodes.length; i += 3) {
    let x = data.nodes[i] - cx
    let y = data.nodes[i + 1] - cy
    let z = data.nodes[i + 2] - cz
    const len = Math.hypot(x, y, z) || 1
    out[i] = x / len
    out[i + 1] = y / len
    out[i + 2] = z / len
  }
  return out
}

function tagOverlay(obj: Object3D) {
  obj.traverse((child) => {
    child.userData[WIREFRAME_OVERLAY_KEY] = true
    child.raycast = () => {}
  })
}

function disposeOverlay(root: Object3D) {
  root.traverse((obj) => {
    const mesh = obj as Mesh & { material?: Material | Material[] }
    if (mesh.geometry && mesh.geometry !== sharedLinkSprite && mesh.geometry !== sharedNodeSprite) {
      mesh.geometry.dispose()
    }
    const mat = mesh.material
    if (!mat) return
    if (Array.isArray(mat)) mat.forEach((item) => item.dispose())
    else mat.dispose()
  })
}

function overlayRoots(root: Object3D): Object3D[] {
  const stale: Object3D[] = []
  root.traverse((obj) => {
    if (!isWireframeOverlay(obj)) return
    if (obj.parent && isWireframeOverlay(obj.parent)) return
    stale.push(obj)
  })
  return stale
}

export function clearWireOverlays(root: Object3D) {
  for (const overlay of overlayRoots(root)) {
    overlay.removeFromParent()
    disposeOverlay(overlay)
  }
}

function shadeHost(mesh: Mesh) {
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  for (const mat of mats) {
    if (mat && typeof mat === 'object' && 'wireframe' in mat) {
      ;(mat as { wireframe: boolean }).wireframe = false
    }
  }
}

function instancedGeo(base: BufferGeometry, count: number): BufferGeometry {
  const geo = base.clone()
  geo.setAttribute('instanceOpacity', new InstancedBufferAttribute(new Float32Array(count), 1))
  return geo
}

function bindInstanceOpacity(shader: { vertexShader: string; fragmentShader: string }) {
  shader.vertexShader = shader.vertexShader
    .replace(
      '#include <common>',
      '#include <common>\nattribute float instanceOpacity;\nvarying float vInstanceOpacity;',
    )
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvInstanceOpacity = instanceOpacity;')
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying float vInstanceOpacity;')
    .replace(
      '#include <opaque_fragment>',
      'diffuseColor.a *= vInstanceOpacity;\n#include <opaque_fragment>',
    )
}

/** Unlit bulbs — they must not shade like the host. Quiet pulse → invisible. */
function lineMaterial(color: number): MeshBasicMaterial {
  const mat = new MeshBasicMaterial({
    color,
    toneMapped: false,
    transparent: true,
    depthWrite: true,
    alphaTest: 0.02,
  })
  mat.name = 'wire-line'
  mat.onBeforeCompile = bindInstanceOpacity
  mat.customProgramCacheKey = () => 'webgl-wire-bulb'
  return mat
}

function nodeMaterial(color: number): MeshBasicMaterial {
  const mat = new MeshBasicMaterial({
    color,
    toneMapped: false,
    transparent: true,
    depthWrite: true,
    alphaTest: 0.02,
  })
  mat.name = 'wire-node'
  mat.onBeforeCompile = bindInstanceOpacity
  mat.customProgramCacheKey = () => 'webgl-wire-bulb'
  return mat
}

/** Invisible PointLight. Sits in the live pool until a pulse or pointer is posed. */
function makeLight(name: string, color: number): PointLight {
  const light = new PointLight(color, 0, 1, 2)
  light.name = name
  return light
}

/** Build the editable cage object from baked topology. Radii follow live fractions. */
export function buildWireObject(data: WireMeshData, color: number, assetId?: string): Group {
  const group = new Group()
  group.name = data.objectName ? `wire:${data.objectName}` : 'wire-object'
  const nodeCount = data.nodes.length / 3
  const edgeCount = data.edges.length / 2
  const longest = longestSpan(data.nodes)
  const lineRadius = longest * WIRE_LINE_RADIUS_FRAC
  const nodeRadius = longest * WIRE_NODE_RADIUS_FRAC

  const edgePairs: number[] = []
  if (edgeCount > 0) {
    const lines = new InstancedMesh(instancedGeo(linkSpriteGeo(), edgeCount), lineMaterial(color), edgeCount)
    lines.name = 'wire-lines'
    for (let e = 0; e < data.edges.length; e += 2) {
      const ia = data.edges[e] * 3
      const ib = data.edges[e + 1] * 3
      _a.set(data.nodes[ia], data.nodes[ia + 1], data.nodes[ia + 2])
      _b.set(data.nodes[ib], data.nodes[ib + 1], data.nodes[ib + 2])
      if (_dir.subVectors(_b, _a).length() < 1e-8) continue
      edgePairs.push(data.edges[e], data.edges[e + 1])
    }
    lines.count = 0
    lines.frustumCulled = false
    lines.matrixAutoUpdate = false
    lines.instanceMatrix.setUsage(DynamicDrawUsage)
    lines.renderOrder = 1
    group.add(lines)
  }

  if (nodeCount > 0) {
    const nodes = new InstancedMesh(instancedGeo(nodeSpriteGeo(), nodeCount), nodeMaterial(color), nodeCount)
    nodes.name = 'wire-nodes'
    nodes.count = 0
    nodes.frustumCulled = false
    nodes.matrixAutoUpdate = false
    nodes.instanceMatrix.setUsage(DynamicDrawUsage)
    nodes.renderOrder = 2
    group.add(nodes)
  }

  const pulses = wireRippleCount(assetId)
  const lights = new Group()
  lights.name = 'wire-lights'
  for (let i = 0; i < pulses; i++) lights.add(makeLight(`wire-wave-light-${i}`, color))
  if (WIRE_HOVER_LIGHTS) lights.add(makeLight('wire-hover-light', color))
  group.add(lights)

  group.userData[WIRE_SPRING_KEY] = {
    rest: Float32Array.from(data.nodes),
    offset: new Float32Array(data.nodes.length),
    vel: new Float32Array(data.nodes.length),
    edges: Uint32Array.from(edgePairs),
    normals: cageNormals(data),
    lineRadius,
    nodeRadius,
    reach: longest * WIRE_REACH_FRAC,
    fade: longest * WIRE_FADE_FRAC,
    lift: longest * WIRE_LIFT_FRAC,
    hasFocus: false,
    hoverHold: 0,
    hoverAge: 0,
    focusX: 0,
    focusY: 0,
    focusZ: 0,
    focusNX: 0,
    focusNY: 1,
    focusNZ: 0,
    adjOffset: new Uint32Array(1),
    adjNode: new Int32Array(0),
    adjLen: new Float32Array(0),
    surfaceDist: new Float32Array(nodeCount),
    linkAlpha: new Float32Array(edgePairs.length / 2),
    nodeAlpha: new Float32Array(nodeCount),
    rippleSeed: 1,
    rippleSpeed: longest * WIRE_RIPPLE_SPEED_FRAC,
    rippleWidth: longest * WIRE_RIPPLE_WIDTH_FRAC,
    rippleDie: WIRE_RIPPLE_DIE,
    rippleCount: pulses,
    rippleAge: new Float32Array(pulses),
    rippleOrigin: new Int32Array(pulses),
    rippleDist: new Float32Array(nodeCount * pulses),
    field: new Float32Array(nodeCount),
    asleep: false,
  } satisfies WireSpringState
  ensureWireGraph(group.userData[WIRE_SPRING_KEY])
  initWireRipples(group.userData[WIRE_SPRING_KEY], hashSeed(data.objectName || group.name) || 1)
  tagOverlay(group)
  applyWirePose(group)
  return group
}

export function wireDotLift(state: WireSpringState, index: number): number {
  const p = index * 3
  return Math.hypot(state.offset[p], state.offset[p + 1], state.offset[p + 2])
}

/** Whether this joint has left rest. */
export function isWireDotRaised(state: WireSpringState, index: number): boolean {
  return wireDotLift(state, index) > state.lift * WIRE_SHOW_FRAC
}

function instanceOpacity(mesh: InstancedMesh): InstancedBufferAttribute | undefined {
  const attr = mesh.geometry.getAttribute('instanceOpacity')
  return attr instanceof InstancedBufferAttribute ? attr : undefined
}

export function wireFieldOpacity(state: WireSpringState, index: number): number {
  const wave = state.field?.[index] ?? 0
  if (!state.hasFocus) return Math.min(1, wave)
  const dist = state.surfaceDist?.[index] ?? WIRE_UNREACHED
  if (!(dist < WIRE_UNREACHED)) return Math.min(1, wave)
  const p = index * 3
  const localReach = wireReachAt(state.rest[p], state.rest[p + 1], state.rest[p + 2], state.reach)
  const jag = state.reach > 0 ? localReach / state.reach : 1
  const fade = state.fade > 0 ? state.fade : state.reach * 1.8
  return Math.min(1, Math.max(wave, wireFadeOpacity(dist, localReach, fade * jag)))
}

/** Ease tubes toward the hover web. They grow in and fall away instead of blinking. */
export function stepLinkAlphas(state: WireSpringState, dt: number): number {
  ensureWireGraph(state)
  const n = state.edges.length / 2
  if (!state.linkAlpha || state.linkAlpha.length !== n) state.linkAlpha = new Float32Array(n)
  const k = 1 - Math.exp(-WIRE_LINK_RATE * Math.min(0.033, Math.max(0, dt)))
  let peak = 0
  for (let i = 0; i < n; i++) {
    const ia = state.edges[i * 2]
    const ib = state.edges[i * 2 + 1]
    if (
      (state.linkAlpha[i] ?? 0) <= 0 &&
      (state.hasFocus
        ? (state.surfaceDist?.[ia] ?? WIRE_UNREACHED) >= WIRE_UNREACHED &&
          (state.surfaceDist?.[ib] ?? WIRE_UNREACHED) >= WIRE_UNREACHED &&
          (state.field?.[ia] ?? 0) <= 0 &&
          (state.field?.[ib] ?? 0) <= 0
        : (state.field?.[ia] ?? 0) <= 0 && (state.field?.[ib] ?? 0) <= 0)
    ) {
      continue
    }
    const pa = ia * 3
    const pb = ib * 3
    const crease =
      state.normals[pa] * state.normals[pb] +
      state.normals[pa + 1] * state.normals[pb + 1] +
      state.normals[pa + 2] * state.normals[pb + 2]
    const target =
      crease >= WIRE_EDGE_DOT ? Math.min(wireFieldOpacity(state, ia), wireFieldOpacity(state, ib)) : 0
    const next = state.linkAlpha[i] + (target - state.linkAlpha[i]) * k
    state.linkAlpha[i] = next
    peak = Math.max(peak, next)
  }
  return peak
}

/** Ease joint glow so pointer detection does not pop lamps on and off. */
export function stepNodeAlphas(state: WireSpringState, dt: number): number {
  const n = state.rest.length / 3
  if (!state.nodeAlpha || state.nodeAlpha.length !== n) state.nodeAlpha = new Float32Array(n)
  const k = 1 - Math.exp(-WIRE_NODE_RATE * Math.min(0.033, Math.max(0, dt)))
  let peak = 0
  for (let i = 0; i < n; i++) {
    if (
      (state.nodeAlpha[i] ?? 0) <= 0 &&
      (state.hasFocus
        ? (state.surfaceDist?.[i] ?? WIRE_UNREACHED) >= WIRE_UNREACHED && (state.field?.[i] ?? 0) <= 0
        : (state.field?.[i] ?? 0) <= 0)
    ) {
      continue
    }
    const target = wireFieldOpacity(state, i)
    const next = state.nodeAlpha[i] + (target - state.nodeAlpha[i]) * k
    state.nodeAlpha[i] = next
    peak = Math.max(peak, next)
  }
  return peak
}

/** Joints follow the pulse (opacity 0 when quiet). Links grow in from the hover web.
 *  Only instances in the camera frustum are written (webgl_buffergeometry_drawrange). */
export function applyWirePose(group: Object3D, camera?: Camera | null) {
  const state = group.userData[WIRE_SPRING_KEY] as WireSpringState | undefined
  if (!state) return
  const nodes = group.getObjectByName('wire-nodes')
  const lines = group.getObjectByName('wire-lines')
  if (state.asleep) {
    if (nodes instanceof InstancedMesh) nodes.count = 0
    if (lines instanceof InstancedMesh) lines.count = 0
    return
  }
  const nodeCount = state.rest.length / 3
  if (camera) {
    group.updateWorldMatrix(true, false)
    camera.updateMatrixWorld()
    syncWireFrustum(camera)
    _camLocal.copy(camera.position)
    group.worldToLocal(_camLocal)
  }
  const worldScale = camera ? group.matrixWorld.getMaxScaleOnAxis() : 1
  const worldNodeR = state.nodeRadius * worldScale * 2
  const worldLineR = state.lineRadius * worldScale * 2
  if (nodes instanceof InstancedMesh) {
    const opacities = instanceOpacity(nodes)
    let written = 0
    for (let i = 0; i < nodeCount; i++) {
      const glow = state.nodeAlpha?.[i] ?? 0
      if (glow <= 0.02) continue
      const p = i * 3
      _a.set(
        state.rest[p] + state.offset[p],
        state.rest[p + 1] + state.offset[p + 1],
        state.rest[p + 2] + state.offset[p + 2],
      )
      if (camera) {
        _worldA.copy(_a).applyMatrix4(group.matrixWorld)
        if (!pointInWireFrustum(_worldA, worldNodeR)) continue
        _dir.copy(_camLocal).sub(_a)
        if (_dir.lengthSq() < 1e-12) _quat.identity()
        else _quat.setFromUnitVectors(_z, _dir.normalize())
      } else {
        _quat.identity()
      }
      _scale.setScalar(state.nodeRadius)
      _m.compose(_a, _quat, _scale)
      nodes.setMatrixAt(written, _m)
      opacities?.setX(written, glow)
      written += 1
    }
    nodes.count = written
    nodes.instanceMatrix.needsUpdate = true
    if (opacities) opacities.needsUpdate = true
  }
  if (lines instanceof InstancedMesh) {
    const opacities = instanceOpacity(lines)
    const count = state.edges.length / 2
    const alphas = state.linkAlpha
    let written = 0
    for (let i = 0; i < count; i++) {
      const grow = alphas?.[i] ?? 0
      if (grow <= 0.02) continue
      const ia = state.edges[i * 2]
      const ib = state.edges[i * 2 + 1]
      const pa = ia * 3
      const pb = ib * 3
      _a.set(
        state.rest[pa] + state.offset[pa],
        state.rest[pa + 1] + state.offset[pa + 1],
        state.rest[pa + 2] + state.offset[pa + 2],
      )
      _b.set(
        state.rest[pb] + state.offset[pb],
        state.rest[pb + 1] + state.offset[pb + 1],
        state.rest[pb + 2] + state.offset[pb + 2],
      )
      _dir.subVectors(_b, _a)
      const len = _dir.length()
      if (len < 1e-8) continue
      if (!wireLinkAllowed(state, ia, ib, len)) continue
      _dir.multiplyScalar(1 / len)
      _mid.addVectors(_a, _b).multiplyScalar(0.5)
      if (camera) {
        _worldA.copy(_a).applyMatrix4(group.matrixWorld)
        _worldB.copy(_b).applyMatrix4(group.matrixWorld)
        if (!segmentInWireFrustum(_worldA, _worldB, worldLineR)) continue
        _face.copy(_camLocal).sub(_mid)
        _side.crossVectors(_dir, _face)
        if (_side.lengthSq() < 1e-12) {
          _side.crossVectors(_dir, _y)
          if (_side.lengthSq() < 1e-12) _side.set(1, 0, 0)
        }
        _side.normalize()
        _face.crossVectors(_side, _dir).normalize()
        _scale.set(state.lineRadius, len * grow, 1)
        _m.makeBasis(_side, _dir, _face)
        _m.scale(_scale)
        _m.setPosition(_mid)
      } else {
        _quat.setFromUnitVectors(_y, _dir)
        _scale.set(state.lineRadius, len * grow, 1)
        _m.compose(_mid, _quat, _scale)
      }
      lines.setMatrixAt(written, _m)
      opacities?.setX(written, grow)
      written += 1
    }
    lines.count = written
    lines.instanceMatrix.needsUpdate = true
    if (opacities) opacities.needsUpdate = true
  }
}

function meshDataForHost(bake: WireObjectData, host: Mesh, index: number): WireMeshData | undefined {
  const named = bake.meshes.find((item) => item.objectName && item.objectName === host.name)
  if (named) return named
  return bake.meshes[index]
}

/** Attach the baked cage. Does not extract from the live mesh. */
export function attachBakedWire(root: Object3D, bake: WireObjectData, color = WIRE_LIGHT_DEFAULT) {
  clearWireOverlays(root)
  const hosts: Mesh[] = []
  root.traverse((obj) => {
    const mesh = obj as Mesh
    if (!(mesh instanceof Mesh) || mesh instanceof InstancedMesh || isWireframeOverlay(mesh)) return
    shadeHost(mesh)
    hosts.push(mesh)
  })
  hosts.forEach((host, index) => {
    const data = meshDataForHost(bake, host, index)
    if (!data || data.nodes.length < 3) return
    host.add(buildWireObject(data, color, bake.assetId))
  })
}
