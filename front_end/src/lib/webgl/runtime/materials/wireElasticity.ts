import { Matrix4, Vector3, type Camera, type Object3D } from 'three'
import type { RaycastHit } from '../interaction/cameraPick'
import {
  applyWirePose,
  fillWireField,
  isWireframeOverlay,
  stepLinkAlphas,
  stepNodeAlphas,
  initWireRipples,
  stepWireRipples,
  WIRE_SPRING_KEY,
  WIRE_UNREACHED,
  wireReachAt,
  type WireSpringState,
} from './wireObject'
import { cageLightsLit, poseWireLights } from './wireLights'

/** Slow follow. A small give, then it stops. */
export const WIRE_SPRING_STIFFNESS = 52
export const WIRE_SPRING_DAMPING = 16
/** Keep the last hit this long so a raycast gap does not create/remove the pointer lamp. */
export const WIRE_HOVER_HOLD = 0.18
/** Boom-peak impulse hold — long enough to read through the high point, then waves resume. */
export const WIRE_IMPULSE_HOLD = 1.45

export type ImpulseMark = {
  position?: [number, number, number]
  normal?: [number, number, number]
  faceIndex?: number
  objectName?: string
}

/** Build a cage hit from a baked impulse mark. `object` must be the named mesh so host checks pass. */
export function impulseHitFromMark(root: Object3D, mark: ImpulseMark): RaycastHit | null {
  if (!mark.position) return null
  let object: Object3D | undefined
  const name = mark.objectName
  if (name) {
    root.traverse((obj) => {
      if (object) return
      if (obj.name === name) object = obj
    })
  }
  return {
    point: mark.position,
    normal: mark.normal ?? [0, 1, 0],
    faceIndex: mark.faceIndex ?? null,
    objectName: name ?? '',
    object,
  }
}

/** Independent dots: falloff from the cursor. Links do not pull anything. */
export function wireDotInfluence(dist: number, reach: number): number {
  if (!(reach > 0) || dist >= reach) return 0
  const t = 1 - dist / reach
  return t * t
}

export function stepSpring(
  pos: number,
  vel: number,
  target: number,
  dt: number,
  stiffness = WIRE_SPRING_STIFFNESS,
  damping = WIRE_SPRING_DAMPING,
): { pos: number; vel: number } {
  const step = Math.min(0.033, Math.max(0, dt))
  const nextVel = vel + ((target - pos) * stiffness - vel * damping) * step
  return { pos: pos + nextVel * step, vel: nextVel }
}

type LocalHit = { x: number; y: number; z: number; nx: number; ny: number; nz: number }

const _point = new Vector3()
const _normal = new Vector3()
const _inv = new Matrix4()

/** Drop any inward component. The cage cannot occupy the solid. */
export function keepCageOutside(state: WireSpringState, index: number) {
  const p = index * 3
  const nx = state.normals[p]
  const ny = state.normals[p + 1]
  const nz = state.normals[p + 2]
  const along = state.offset[p] * nx + state.offset[p + 1] * ny + state.offset[p + 2] * nz
  if (along < 0) {
    state.offset[p] -= nx * along
    state.offset[p + 1] -= ny * along
    state.offset[p + 2] -= nz * along
  }
  const vAlong = state.vel[p] * nx + state.vel[p + 1] * ny + state.vel[p + 2] * nz
  if (vAlong < 0) {
    state.vel[p] -= nx * vAlong
    state.vel[p + 1] -= ny * vAlong
    state.vel[p + 2] -= nz * vAlong
  }
}

/** Each nearby dot lifts with the traveling wave. Lines only redraw. */
export function stepWireOffsets(state: WireSpringState, hit: LocalHit | null, dt: number): number {
  let waves = 0
  let pointer = Boolean(hit)
  if (hit) {
    state.hoverHold = WIRE_HOVER_HOLD
  } else if ((state.hoverHold ?? 0) > 0) {
    state.hoverHold = Math.max(0, state.hoverHold - dt)
    pointer = state.hoverHold > 0
  }
  if (pointer) {
    if (state.field) state.field.fill(0)
  } else {
    if (state.hasFocus) initWireRipples(state, state.rippleSeed || 1)
    waves = stepWireRipples(state, dt)
  }
  const wasFocus = state.hasFocus
  state.hasFocus = pointer
  if (hit) {
    const same =
      wasFocus &&
      state.focusX === hit.x &&
      state.focusY === hit.y &&
      state.focusZ === hit.z &&
      state.focusNX === hit.nx &&
      state.focusNY === hit.ny &&
      state.focusNZ === hit.nz
    state.focusX = hit.x
    state.focusY = hit.y
    state.focusZ = hit.z
    state.focusNX = hit.nx
    state.focusNY = hit.ny
    state.focusNZ = hit.nz
    if (!same) fillWireField(state)
  } else if (pointer && !wasFocus) {
    fillWireField(state)
  }
  const count = state.rest.length / 3
  for (let i = 0; i < count; i++) {
    const p = i * 3
    let weight = 0
    if (hit) {
      const dist = state.surfaceDist[i]
      if (dist < WIRE_UNREACHED) {
        const localReach = wireReachAt(state.rest[p], state.rest[p + 1], state.rest[p + 2], state.reach)
        weight = wireDotInfluence(dist, localReach)
      }
    } else {
      weight = state.field?.[i] ?? 0
    }
    if (
      weight === 0 &&
      Math.abs(state.offset[p]) < 1e-7 &&
      Math.abs(state.offset[p + 1]) < 1e-7 &&
      Math.abs(state.offset[p + 2]) < 1e-7 &&
      Math.abs(state.vel[p]) < 1e-7 &&
      Math.abs(state.vel[p + 1]) < 1e-7 &&
      Math.abs(state.vel[p + 2]) < 1e-7
    ) {
      continue
    }
    const tx = state.normals[p] * state.lift * weight
    const ty = state.normals[p + 1] * state.lift * weight
    const tz = state.normals[p + 2] * state.lift * weight
    const targets = [tx, ty, tz]
    for (let k = 0; k < 3; k++) {
      const next = stepSpring(state.offset[p + k], state.vel[p + k], targets[k], dt)
      state.offset[p + k] = next.pos
      state.vel[p + k] = next.vel
    }
    keepCageOutside(state, i)
  }
  let peak = 0
  for (let i = 0; i < count; i++) {
    const p = i * 3
    peak = Math.max(
      peak,
      Math.abs(state.offset[p]),
      Math.abs(state.offset[p + 1]),
      Math.abs(state.offset[p + 2]),
      Math.abs(state.vel[p]),
      Math.abs(state.vel[p + 1]),
      Math.abs(state.vel[p + 2]),
    )
  }
  const links = stepLinkAlphas(state, dt)
  const nodes = stepNodeAlphas(state, dt)
  state.asleep = !hit && peak < 1e-4 && links < 0.02 && nodes < 0.02 && waves < 0.02
  return Math.max(peak, links, nodes, waves)
}

function localHit(host: Object3D, hit: RaycastHit): LocalHit | null {
  host.updateWorldMatrix(true, false)
  _point.set(hit.point[0], hit.point[1], hit.point[2])
  host.worldToLocal(_point)
  const normal = hit.normal
  _normal.set(normal?.[0] ?? 0, normal?.[1] ?? 1, normal?.[2] ?? 0)
  if (_normal.lengthSq() < 1e-8) _normal.set(0, 1, 0)
  _inv.copy(host.matrixWorld).invert()
  _normal.transformDirection(_inv).normalize()
  return { x: _point.x, y: _point.y, z: _point.z, nx: _normal.x, ny: _normal.y, nz: _normal.z }
}

function cageHitOnHost(host: Object3D, hit: RaycastHit): boolean {
  let node: Object3D | null | undefined = hit.object
  while (node) {
    if (node === host) return true
    node = node.parent
  }
  return false
}

function localForHost(host: Object3D | null, hit: RaycastHit | null): LocalHit | null {
  if (!hit || !host) return null
  if (!hit.object || !cageHitOnHost(host, hit)) return null
  return localHit(host, hit)
}

/** Spring every mounted cage. Does not touch host mesh vertices. */
export function stepMountedWires(
  root: Object3D,
  hit: RaycastHit | null,
  dt: number,
  impulse: RaycastHit | null = null,
  camera: Camera | null = null,
): boolean {
  let awake = false
  const groups: Object3D[] = []
  root.traverse((obj) => {
    if (!isWireframeOverlay(obj)) return
    if (obj.parent && isWireframeOverlay(obj.parent)) return
    if (!obj.userData[WIRE_SPRING_KEY]) return
    groups.push(obj)
  })
  for (const group of groups) {
    const state = group.userData[WIRE_SPRING_KEY] as WireSpringState
    const host = group.parent
    const local = localForHost(host, hit) ?? localForHost(host, impulse)
    const peak = stepWireOffsets(state, local, dt)
    applyWirePose(group, camera)
    poseWireLights(group, dt)
    if (peak > 1e-4 || local || cageLightsLit(group)) awake = true
  }
  return awake
}
