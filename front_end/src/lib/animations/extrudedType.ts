/** 3D extruded type — ExtrudedType.tsx · ref.text-shaped-1 · isometricPlanes orientations */

import {
  isometricPlaneOrientation,
  type IsometricPlaneOrientation,
  type IsometricPlaneOrientationId,
} from '../isometrics/isometricPlanes'

export type { IsometricPlaneOrientationId } from '../isometrics/isometricPlanes'

export type ExtrudedTypePointer = 'none' | 'follow' | 'repulse'

export const EXTRUDED_TYPE_POINTER_OPTIONS = [
  { value: 'none', label: 'Auto wobble' },
  { value: 'follow', label: 'Mouse follow' },
  { value: 'repulse', label: 'Mouse repulse' },
] as const satisfies ReadonlyArray<{ value: ExtrudedTypePointer; label: string }>

/** Default wobble poses — ref.text-shaped-1 */
export const EXTRUDED_TYPE_DEFAULT_ORIENTATION_FROM: IsometricPlaneOrientationId =
  'extruded-wobble-start'
export const EXTRUDED_TYPE_DEFAULT_ORIENTATION_TO: IsometricPlaneOrientationId = 'extruded-wobble-stop'

/** Showcase-friendly orientation pairs (from → to). */
export const EXTRUDED_TYPE_ORIENTATION_OPTIONS = [
  { value: 'extruded-wobble-start', label: 'Extruded start (ref-1)' },
  { value: 'extruded-wobble-stop', label: 'Extruded stop (ref-1)' },
  { value: 'oblique-left', label: 'Oblique left' },
  { value: 'oblique-right', label: 'Oblique right' },
  { value: 'iso-card', label: 'Iso card' },
  { value: 'wall-left', label: 'Wall left' },
  { value: 'wall-right', label: 'Wall right' },
  { value: 'spread-top-rest', label: 'Spread top rest' },
  { value: 'spread-bottom-rest', label: 'Spread bottom rest' },
] as const satisfies ReadonlyArray<{ value: IsometricPlaneOrientationId; label: string }>

export const EXTRUDED_TYPE_DEFAULT_LAYERS = 20
export const EXTRUDED_TYPE_DEFAULT_DEPTH = 1.5
export const EXTRUDED_TYPE_MIN_LAYERS = 8
export const EXTRUDED_TYPE_MAX_LAYERS = 24

export const EXTRUDED_TYPE_POINTER_STRENGTH_DEFAULT = 1
export const EXTRUDED_TYPE_POINTER_STRENGTH_MIN = 0.25
export const EXTRUDED_TYPE_POINTER_STRENGTH_MAX = 1.75

export function normalizeExtrudedTypeLayers(value?: number): number {
  if (value === undefined || Number.isNaN(value)) {
    return EXTRUDED_TYPE_DEFAULT_LAYERS
  }
  return Math.min(EXTRUDED_TYPE_MAX_LAYERS, Math.max(EXTRUDED_TYPE_MIN_LAYERS, Math.round(value)))
}

export function normalizeExtrudedTypeDepth(value?: number): number {
  if (value === undefined || Number.isNaN(value)) {
    return EXTRUDED_TYPE_DEFAULT_DEPTH
  }
  return Math.min(3, Math.max(0.75, value))
}

export function normalizeExtrudedTypePointerStrength(value?: number): number {
  if (value === undefined || Number.isNaN(value)) {
    return EXTRUDED_TYPE_POINTER_STRENGTH_DEFAULT
  }
  return Math.min(
    EXTRUDED_TYPE_POINTER_STRENGTH_MAX,
    Math.max(EXTRUDED_TYPE_POINTER_STRENGTH_MIN, value),
  )
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t
}

/** CSS custom properties for stack transform — mirrors isometric plane vars. */
export function extrudedTypeOrientationVars(
  orientation: IsometricPlaneOrientation,
  suffix = '',
): Record<string, string | number> {
  const tag = suffix ? `-${suffix}` : ''
  return {
    [`--extruded-rx${tag}`]: `${orientation.rotateX}deg`,
    [`--extruded-ry${tag}`]: `${orientation.rotateY}deg`,
    [`--extruded-rz${tag}`]: `${orientation.rotateZ}deg`,
    [`--extruded-skew-x${tag}`]: `${orientation.skewX}deg`,
    [`--extruded-skew-y${tag}`]: `${orientation.skewY}deg`,
    [`--extruded-scale-x${tag}`]: orientation.scaleX,
    [`--extruded-scale-y${tag}`]: orientation.scaleY,
  }
}

export function extrudedTypeOrientationVarsFromId(
  id: IsometricPlaneOrientationId,
  suffix = '',
): Record<string, string | number> {
  return extrudedTypeOrientationVars(isometricPlaneOrientation(id), suffix)
}

/** Interpolate between iso registry poses for pointer scrub (from → to). */
export function extrudedTypePointerOrientationVars(
  from: IsometricPlaneOrientation,
  to: IsometricPlaneOrientation,
  axisX: number,
  axisY: number,
  pointer: ExtrudedTypePointer,
  strength = EXTRUDED_TYPE_POINTER_STRENGTH_DEFAULT,
): Record<string, string | number> {
  const mul = pointer === 'repulse' ? -1 : 1
  const tx = Math.max(0, Math.min(1, 0.5 + axisX * 0.5 * strength * mul))
  const ty = Math.max(0, Math.min(1, 0.5 + axisY * 0.5 * strength * mul))

  return extrudedTypeOrientationVars({
    ...from,
    rotateX: lerp(from.rotateX, to.rotateX, ty),
    rotateY: lerp(from.rotateY, to.rotateY, tx),
    rotateZ: lerp(from.rotateZ, to.rotateZ, (tx + ty) * 0.5),
    skewX: lerp(from.skewX, to.skewX, tx),
    skewY: lerp(from.skewY, to.skewY, ty),
    scaleX: lerp(from.scaleX, to.scaleX, (tx + ty) * 0.5),
    scaleY: lerp(from.scaleY, to.scaleY, (tx + ty) * 0.5),
  })
}

/** @deprecated use extrudedTypePointerOrientationVars */
export function extrudedTypePointerRotation(
  axisX: number,
  axisY: number,
  pointer: ExtrudedTypePointer,
  strength = EXTRUDED_TYPE_POINTER_STRENGTH_DEFAULT,
): { rotateX: number; rotateY: number } {
  const from = isometricPlaneOrientation(EXTRUDED_TYPE_DEFAULT_ORIENTATION_FROM)
  const to = isometricPlaneOrientation(EXTRUDED_TYPE_DEFAULT_ORIENTATION_TO)
  const vars = extrudedTypePointerOrientationVars(from, to, axisX, axisY, pointer, strength)
  return {
    rotateX: parseFloat(String(vars['--extruded-rx']).replace('deg', '')),
    rotateY: parseFloat(String(vars['--extruded-ry']).replace('deg', '')),
  }
}
