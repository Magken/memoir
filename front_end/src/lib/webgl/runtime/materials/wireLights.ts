import { Color, PointLight, type Group, type MeshBasicMaterial, type Object3D } from 'three'
import {
  WIRE_HOVER_LIGHTS,
  WIRE_LIGHT_DEFAULT,
  WIRE_REACH_FRAC,
  WIRE_RIPPLE_COUNT,
  WIRE_RIPPLE_DIE,
  WIRE_SPRING_KEY,
  WIRE_UNREACHED,
  WIRE_WAVE_LIGHTS,
  wireRipple,
  type WireSpringState,
} from './wireObject'

export { WIRE_HOVER_LIGHTS, WIRE_LIGHT_DEFAULT, WIRE_WAVE_LIGHTS }

/** Local inverse-square lamps. Decay 0 lit the whole mesh at once. */
export const WIRE_LIGHT_WAVE_INTENSITY = 1.15
export const WIRE_LIGHT_HOVER_INTENSITY = 1.85
export const WIRE_LIGHT_MIN = 0.06
/** Sit just outside the skin so SSS wraps; not a distant orb. */
export const WIRE_LIGHT_FLOAT_FRAC = 0.05
/** Follow the moving centroid — tight enough to ride the wave, slow enough to hide vertex noise. */
export const WIRE_LIGHT_FOLLOW = 7.2
/** Pointer lamp tracks the hit without dimming. Faster than the wave follow. */
export const WIRE_LIGHT_HOVER_FOLLOW = 14
/** Rise rate — slower than the wave so a lamp is not the crest. */
export const WIRE_LIGHT_FADE = 1.35
/** Release rate — slower than rise so a dying wave cannot snap the lamp off. */
export const WIRE_LIGHT_RELEASE = 0.55
export const WIRE_LIGHT_GAIN_DEFAULT = 0.05
/** Seconds for a new pulse or pointer lamp to rise from 0 — slower than the crest. */
export const WIRE_LIGHT_ATTACK = 1.8
/** Only a spent wave lamp may jump to a new pulse origin. */
export const WIRE_LIGHT_JUMP_FRAC = 0.22

export type PulseCentroid = {
  x: number
  y: number
  z: number
  nx: number
  ny: number
  nz: number
  amp: number
}

const WIRE_LIGHT_EASE_KEY = 'wireLightEase'

type LightEase = { x: number; y: number; z: number; intensity: number; origin: number; age: number }

let lightColor = WIRE_LIGHT_DEFAULT
let lightGain = WIRE_LIGHT_GAIN_DEFAULT

export function setWireLightColor(hex: string | number) {
  if (typeof hex === 'number') {
    lightColor = hex >>> 0
    return
  }
  const n = hex.replace('#', '').trim()
  const parsed = Number.parseInt(n, 16)
  if (Number.isFinite(parsed)) lightColor = parsed >>> 0
}

export function getWireLightColor(): number {
  return lightColor
}

export function setWireLightGain(value: number) {
  if (!Number.isFinite(value)) return
  lightGain = Math.min(3, Math.max(0, value))
}

export function getWireLightGain(): number {
  return lightGain
}

export function easeToward(current: number, target: number, rate: number, dt: number): number {
  const step = Math.min(0.05, Math.max(0, dt))
  const k = 1 - Math.exp(-rate * step)
  return current + (target - current) * k
}

/** 0 at birth, 1 after the attack window. Waves and pointer lamps share this rise. */
export function pulseEnvelope(age: number, attack = WIRE_LIGHT_ATTACK): number {
  if (!(age >= 0) || !(attack > 0)) return 0
  return 1 - Math.exp(-age / attack)
}

function cageSpan(state: WireSpringState): number {
  return state.reach > 0 ? state.reach / WIRE_REACH_FRAC : 1
}

function tintCage(group: Object3D, hex: number) {
  const color = new Color(hex)
  for (const name of ['wire-nodes', 'wire-lines']) {
    const mesh = group.getObjectByName(name) as { material?: MeshBasicMaterial } | undefined
    mesh?.material?.color?.copy(color)
  }
}

function lightAt(pack: Object3D, name: string): PointLight | undefined {
  const obj = pack.getObjectByName(name)
  return obj instanceof PointLight ? obj : undefined
}

function easeSlots(pack: Object3D, count: number): LightEase[] {
  let list = pack.userData[WIRE_LIGHT_EASE_KEY] as LightEase[] | undefined
  if (!list || list.length !== count) {
    list = Array.from({ length: count }, () => ({ x: 0, y: 0, z: 0, intensity: 0, origin: -1, age: 0 }))
    pack.userData[WIRE_LIGHT_EASE_KEY] = list
  }
  for (const slot of list) {
    if (!Number.isFinite(slot.origin)) slot.origin = -1
    if (!Number.isFinite(slot.age) || slot.age < 0) slot.age = 0
  }
  return list
}

/** True while a cage lamp is still fading — the loop must not sleep mid-release. */
export function cageLightsLit(group: Object3D): boolean {
  const pack = group.getObjectByName('wire-lights')
  if (!pack) return false
  for (const child of pack.children) {
    if (child instanceof PointLight && child.intensity > 1e-3) return true
  }
  const slots = pack.userData[WIRE_LIGHT_EASE_KEY] as LightEase[] | undefined
  if (slots) {
    for (const slot of slots) {
      if (slot.intensity > 1e-3) return true
    }
  }
  return false
}

/** Stable tangent at a joint so one pulse keeps a single outward lobe. */
export function pulseHeading(state: WireSpringState, origin: number): [number, number, number] {
  const p = origin * 3
  const nx = state.normals[p] ?? 0
  const ny = state.normals[p + 1] ?? 1
  const nz = state.normals[p + 2] ?? 0
  const ax = Math.abs(ny) > 0.85 ? 1 : 0
  const ay = Math.abs(ny) > 0.85 ? 0 : 1
  let tx = ny * 0 - nz * ay
  let ty = nz * ax - nx * 0
  let tz = nx * ay - ny * ax
  const len = Math.hypot(tx, ty, tz) || 1
  return [tx / len, ty / len, tz / len]
}

/**
 * One weighted centre for a pulse. Not the brightest joint — that hops around the ring.
 * The heading lobe keeps the lamp riding one local area as the wave travels.
 */
export function pulseCentroid(state: WireSpringState, slot: number): PulseCentroid | null {
  const count = state.rest.length / 3
  const waves = state.rippleCount > 0 ? state.rippleCount : WIRE_RIPPLE_COUNT
  if (count < 1 || slot < 0 || slot >= waves) return null
  const origin = state.rippleOrigin?.[slot] ?? -1
  if (origin < 0) return null
  const speed = Number.isFinite(state.rippleSpeed) ? state.rippleSpeed : 0.2
  const width = Number.isFinite(state.rippleWidth) && state.rippleWidth > 0 ? state.rippleWidth : 0.05
  const die = Number.isFinite(state.rippleDie) && state.rippleDie > 0 ? state.rippleDie : WIRE_RIPPLE_DIE
  const age = state.rippleAge?.[slot] ?? 0
  const [hx, hy, hz] = pulseHeading(state, origin)
  const ox = state.rest[origin * 3]
  const oy = state.rest[origin * 3 + 1]
  const oz = state.rest[origin * 3 + 2]
  let wx = 0
  let wy = 0
  let wz = 0
  let wnx = 0
  let wny = 0
  let wnz = 0
  let weight = 0
  let peak = 0
  const crest = speed * age
  const band = width * 4
  for (let i = 0; i < count; i++) {
    const dist = state.rippleDist?.[slot * count + i] ?? WIRE_UNREACHED
    if (!(dist < WIRE_UNREACHED) || Math.abs(dist - crest) > band) continue
    const amp = wireRipple(dist, age, speed, width, die)
    if (!(amp > 0)) continue
    const p = i * 3
    const x = state.rest[p] + state.offset[p]
    const y = state.rest[p + 1] + state.offset[p + 1]
    const z = state.rest[p + 2] + state.offset[p + 2]
    const rx = x - ox
    const ry = y - oy
    const rz = z - oz
    const rlen = Math.hypot(rx, ry, rz) || 1
    const lobe = Math.max(0, (rx * hx + ry * hy + rz * hz) / rlen)
    const w = amp * (0.12 + 0.88 * lobe)
    wx += x * w
    wy += y * w
    wz += z * w
    wnx += state.normals[p] * w
    wny += state.normals[p + 1] * w
    wnz += state.normals[p + 2] * w
    weight += w
    if (amp > peak) peak = amp
  }
  if (!(weight > 0) || !(peak > WIRE_LIGHT_MIN)) return null
  const nlen = Math.hypot(wnx, wny, wnz) || 1
  return {
    x: wx / weight,
    y: wy / weight,
    z: wz / weight,
    nx: wnx / nlen,
    ny: wny / nlen,
    nz: wnz / nlen,
    amp: peak,
  }
}

function poseLamp(
  light: PointLight,
  ease: LightEase,
  targetX: number,
  targetY: number,
  targetZ: number,
  targetIntensity: number,
  span: number,
  color: Color,
  dt: number,
  track: 'pulse' | 'pointer',
  hold = false,
) {
  light.color.copy(color)
  light.decay = 2
  light.distance = Math.max(0.4, span * 0.55)
  const dark = ease.intensity <= 1e-3
  if (hold) {
    targetIntensity = 0
  } else if (track === 'pointer') {
    if (dark) {
      ease.x = targetX
      ease.y = targetY
      ease.z = targetZ
    } else {
      const follow = WIRE_LIGHT_HOVER_FOLLOW
      ease.x = easeToward(ease.x, targetX, follow, dt)
      ease.y = easeToward(ease.y, targetY, follow, dt)
      ease.z = easeToward(ease.z, targetZ, follow, dt)
    }
  } else if (dark) {
    ease.x = targetX
    ease.y = targetY
    ease.z = targetZ
  } else {
    ease.x = easeToward(ease.x, targetX, WIRE_LIGHT_FOLLOW, dt)
    ease.y = easeToward(ease.y, targetY, WIRE_LIGHT_FOLLOW, dt)
    ease.z = easeToward(ease.z, targetZ, WIRE_LIGHT_FOLLOW, dt)
  }
  const goal = Math.max(0, targetIntensity)
  const dropping = goal < ease.intensity - 1e-6
  const rate = dropping ? WIRE_LIGHT_RELEASE : WIRE_LIGHT_FADE
  ease.intensity = easeToward(ease.intensity, goal, rate, dt)
  if (goal <= 0 && ease.intensity < 0.004) ease.intensity = 0
  light.position.set(ease.x, ease.y, ease.z)
  // Gain is outside the wave ease so Menu LCL / intensity knobs track without lag-then-snap.
  light.intensity = ease.intensity * lightGain
}

function floatPoint(
  x: number,
  y: number,
  z: number,
  nx: number,
  ny: number,
  nz: number,
  span: number,
): [number, number, number] {
  const float = span * WIRE_LIGHT_FLOAT_FRAC
  return [x + nx * float, y + ny * float, z + nz * float]
}

/** One invisible lamp per pulse, riding that pulse's centroid. Hover sits on the raycast. */
export function poseWireLights(group: Object3D, dt = 1 / 60) {
  const state = group.userData[WIRE_SPRING_KEY] as WireSpringState | undefined
  const pack = group.getObjectByName('wire-lights')
  if (!state || !pack) return
  const hex = getWireLightColor()
  tintCage(group, hex)
  const span = cageSpan(state)
  const color = new Color(hex)
  const waves = state.rippleCount > 0 ? state.rippleCount : WIRE_RIPPLE_COUNT
  const slots = easeSlots(pack, waves + WIRE_HOVER_LIGHTS)
  for (let s = 0; s < waves; s++) {
    const light = lightAt(pack, `wire-wave-light-${s}`)
    if (!light) continue
    const ease = slots[s]
    const pulse = state.hasFocus ? null : pulseCentroid(state, s)
    const origin = pulse ? (state.rippleOrigin[s] ?? -1) : -1
    const switching = ease.origin >= 0 && origin !== ease.origin
    if (!pulse || switching) {
      poseLamp(light, ease, ease.x, ease.y, ease.z, 0, span, color, dt, 'pulse', true)
      if (ease.intensity <= 0) {
        ease.origin = -1
        ease.age = 0
      }
      continue
    }
    ease.origin = origin
    ease.age += dt
    const [x, y, z] = floatPoint(pulse.x, pulse.y, pulse.z, pulse.nx, pulse.ny, pulse.nz, span)
    const rise = pulseEnvelope(ease.age)
    poseLamp(light, ease, x, y, z, rise * WIRE_LIGHT_WAVE_INTENSITY, span, color, dt, 'pulse')
  }
  const hover = lightAt(pack, 'wire-hover-light')
  if (hover && WIRE_HOVER_LIGHTS) {
    const slot = slots[waves]
    if (state.hasFocus) {
      state.hoverAge = (state.hoverAge ?? 0) + dt
      const [x, y, z] = floatPoint(
        state.focusX,
        state.focusY,
        state.focusZ,
        state.focusNX,
        state.focusNY,
        state.focusNZ,
        span,
      )
      const rise = pulseEnvelope(state.hoverAge)
      poseLamp(
        hover,
        slot,
        x,
        y,
        z,
        rise * WIRE_LIGHT_HOVER_INTENSITY,
        span,
        color,
        dt,
        'pointer',
      )
    } else {
      poseLamp(hover, slot, slot.x, slot.y, slot.z, 0, span, color, dt, 'pointer')
      if (slot.intensity <= 0) state.hoverAge = 0
    }
  }
}

export function poseMountedWireLights(root: Object3D, dt = 1 / 60) {
  root.traverse((obj) => {
    if (!obj.userData[WIRE_SPRING_KEY]) return
    if (obj.parent && obj.parent.userData[WIRE_SPRING_KEY]) return
    poseWireLights(obj as Group, dt)
  })
}
