/**
 * CSS isometric plane viewpoints — true 3D transforms (not SVG spread skew).
 * Refs: Envato Tuts+ (60° × −45°), Codrops voxel floor (65° × 45°),
 * 30 seconds of code card (51° × 43°), Polypane perspective obliques.
 */

import { ISOMETRIC_SPACE } from './isometricSpace'

const { skewMin, skewMax, scaleMin, scaleMax } = ISOMETRIC_SPACE.spread
const spreadBottomSkew = skewMax * 1.15
const spreadBottomScale = scaleMin + (scaleMax - scaleMin) * 0.35

/** Hinge for transform-origin when planes meet. */
export type IsometricPlaneAnchor =
  | 'center'
  | 'bottom'
  | 'top'
  | 'left'
  | 'right'

export type IsometricViewpointCategory = 'reference' | 'isometric' | 'wall' | 'oblique' | 'spread-skew'

/** Prominent CSS 3D viewpoint id. */
export type IsometricPlaneOrientationId =
  | 'screen'
  | 'iso-classic'
  | 'iso-floor'
  | 'iso-card'
  | 'iso-north-west'
  | 'wall-front'
  | 'wall-left'
  | 'wall-right'
  | 'plan-top'
  | 'oblique-left'
  | 'oblique-right'
  | 'spread-left-rest'
  | 'spread-right-rest'
  | 'spread-top-rest'
  | 'spread-bottom-rest'
  | 'extruded-wobble-start'
  | 'extruded-wobble-stop'

export type IsometricPlaneOrientation = {
  readonly id: IsometricPlaneOrientationId
  readonly label: string
  readonly description: string
  readonly category: IsometricViewpointCategory
  readonly anchor: IsometricPlaneAnchor
  readonly rotateX: number
  readonly rotateY: number
  readonly rotateZ: number
  /** SVG spread parity only — skew + scale, not true isometric. */
  readonly skewX: number
  readonly skewY: number
  readonly scaleX: number
  readonly scaleY: number
}

/** Canonical CSS isometric angles (documented sources). */
export const ISOMETRIC_CSS_ANGLES = {
  /** Envato Tuts+ — isometric grid row */
  classicX: 60,
  classicZ: -45,
  /** Codrops voxel / generative worlds floor */
  floorX: 65,
  floorZ: 45,
  /** 30secondsOfCode isometric card */
  cardX: 51,
  cardZ: 43,
  /** Mirror of classic for NW quadrant */
  northWestZ: 45,
} as const

function viewpoint(
  id: IsometricPlaneOrientationId,
  label: string,
  description: string,
  category: IsometricViewpointCategory,
  anchor: IsometricPlaneAnchor,
  transform: Partial<
    Pick<
      IsometricPlaneOrientation,
      'rotateX' | 'rotateY' | 'rotateZ' | 'skewX' | 'skewY' | 'scaleX' | 'scaleY'
    >
  >,
): IsometricPlaneOrientation {
  return {
    id,
    label,
    description,
    category,
    anchor,
    rotateX: transform.rotateX ?? 0,
    rotateY: transform.rotateY ?? 0,
    rotateZ: transform.rotateZ ?? 0,
    skewX: transform.skewX ?? 0,
    skewY: transform.skewY ?? 0,
    scaleX: transform.scaleX ?? 1,
    scaleY: transform.scaleY ?? 1,
  }
}

/** Primary viewpoints — visually distinct 3D orientations. */
export const ISOMETRIC_PLANE_ORIENTATIONS: Record<IsometricPlaneOrientationId, IsometricPlaneOrientation> = {
  screen: viewpoint(
    'screen',
    'Screen',
    'Flat XY — no tilt (reference)',
    'reference',
    'center',
    {},
  ),
  'iso-classic': viewpoint(
    'iso-classic',
    'Classic iso',
    'rotateX(60°) rotateZ(−45°) — Envato Tuts+ grid',
    'isometric',
    'bottom',
    { rotateX: ISOMETRIC_CSS_ANGLES.classicX, rotateZ: ISOMETRIC_CSS_ANGLES.classicZ },
  ),
  'iso-floor': viewpoint(
    'iso-floor',
    'Voxel floor',
    'rotateX(65°) rotateZ(45°) — Codrops stacked grid',
    'isometric',
    'bottom',
    { rotateX: ISOMETRIC_CSS_ANGLES.floorX, rotateZ: ISOMETRIC_CSS_ANGLES.floorZ },
  ),
  'iso-card': viewpoint(
    'iso-card',
    'Iso card',
    'rotateX(51°) rotateZ(43°) — floating card lift',
    'isometric',
    'bottom',
    { rotateX: ISOMETRIC_CSS_ANGLES.cardX, rotateZ: ISOMETRIC_CSS_ANGLES.cardZ },
  ),
  'iso-north-west': viewpoint(
    'iso-north-west',
    'Iso NW',
    'rotateX(60°) rotateZ(45°) — mirrored Z spin',
    'isometric',
    'bottom',
    { rotateX: ISOMETRIC_CSS_ANGLES.classicX, rotateZ: ISOMETRIC_CSS_ANGLES.northWestZ },
  ),
  'wall-front': viewpoint(
    'wall-front',
    'Wall front',
    'Vertical plane facing viewer (rotateY 0°)',
    'wall',
    'center',
    {},
  ),
  'wall-left': viewpoint(
    'wall-left',
    'Wall left',
    'Left face — rotateY(−90°)',
    'wall',
    'right',
    { rotateY: -90 },
  ),
  'wall-right': viewpoint(
    'wall-right',
    'Wall right',
    'Right face — rotateY(90°)',
    'wall',
    'left',
    { rotateY: 90 },
  ),
  'plan-top': viewpoint(
    'plan-top',
    'Plan top',
    'Overhead plan — rotateX(90°)',
    'oblique',
    'center',
    { rotateX: 90 },
  ),
  'oblique-left': viewpoint(
    'oblique-left',
    'Oblique left',
    'Perspective oblique — rotateY(−28°) rotateX(12°)',
    'oblique',
    'center',
    { rotateY: -28, rotateX: 12 },
  ),
  'oblique-right': viewpoint(
    'oblique-right',
    'Oblique right',
    'Perspective oblique — rotateY(28°) rotateX(12°)',
    'oblique',
    'center',
    { rotateY: 28, rotateX: 12 },
  ),
  'spread-left-rest': viewpoint(
    'spread-left-rest',
    'Spread left',
    'SVG half rest — skewY + scaleX · vertical seam',
    'spread-skew',
    'right',
    { skewY: -skewMin, scaleX: scaleMax },
  ),
  'spread-right-rest': viewpoint(
    'spread-right-rest',
    'Spread right',
    'SVG half rest — skewY + scaleX · vertical seam',
    'spread-skew',
    'left',
    { skewY: skewMax, scaleX: scaleMin },
  ),
  'spread-top-rest': viewpoint(
    'spread-top-rest',
    'Spread top',
    'SVG half rest — skewX + scaleY · horizontal seam',
    'spread-skew',
    'bottom',
    { skewX: -skewMin, scaleY: scaleMax },
  ),
  'spread-bottom-rest': viewpoint(
    'spread-bottom-rest',
    'Spread bottom',
    'SVG half rest — skewX + scaleY · horizontal seam',
    'spread-skew',
    'top',
    { skewX: spreadBottomSkew, scaleY: spreadBottomScale },
  ),
  'extruded-wobble-start': viewpoint(
    'extruded-wobble-start',
    'Extruded wobble start',
    'ref.text-shaped-1 rest pose — rotateY(40°) rotateX(33°)',
    'reference',
    'center',
    { rotateY: 40, rotateX: 33 },
  ),
  'extruded-wobble-stop': viewpoint(
    'extruded-wobble-stop',
    'Extruded wobble stop',
    'ref.text-shaped-1 peak pose — rotateY(−40°) rotateX(−43°)',
    'reference',
    'center',
    { rotateY: -40, rotateX: -43 },
  ),
}

export const ISOMETRIC_PLANE_ORIENTATION_LIST = Object.values(ISOMETRIC_PLANE_ORIENTATIONS)

/** Showcase groups — primary viewpoints first; spread skew labeled separately. */
export const ISOMETRIC_PLANE_SHOWCASE_GROUPS: ReadonlyArray<{
  readonly title: string
  readonly caption: string
  readonly ids: readonly IsometricPlaneOrientationId[]
}> = [
  {
    title: 'Reference',
    caption: 'Flat screen plane — baseline · extruded type wobble (ref.text-shaped-1).',
    ids: ['screen', 'extruded-wobble-start', 'extruded-wobble-stop'],
  },
  {
    title: 'Isometric grounds',
    caption: 'True CSS 3D — rotateX + rotateZ on a perspective stage (Tuts+, Codrops, 30sec card).',
    ids: ['iso-classic', 'iso-floor', 'iso-card', 'iso-north-west'],
  },
  {
    title: 'Walls & plan',
    caption: 'Vertical faces and overhead plan — rotateY / rotateX.',
    ids: ['wall-front', 'wall-left', 'wall-right', 'plan-top'],
  },
  {
    title: 'Oblique perspective',
    caption: 'Shallow Y + X tilt — product mockup style (not true iso).',
    ids: ['oblique-left', 'oblique-right'],
  },
  {
    title: 'SVG spread parity',
    caption: 'Skew + scale only — matches GSAP spread halves, not true isometric projection.',
    ids: ['spread-left-rest', 'spread-right-rest', 'spread-top-rest', 'spread-bottom-rest'],
  },
]

export function isometricPlaneOrientation(id: IsometricPlaneOrientationId): IsometricPlaneOrientation {
  return ISOMETRIC_PLANE_ORIENTATIONS[id]
}

export function isometricPlaneTransformSummary(orientation: IsometricPlaneOrientation): string {
  const parts: string[] = []
  if (orientation.rotateX) parts.push(`rotateX(${orientation.rotateX}deg)`)
  if (orientation.rotateY) parts.push(`rotateY(${orientation.rotateY}deg)`)
  if (orientation.rotateZ) parts.push(`rotateZ(${orientation.rotateZ}deg)`)
  if (orientation.skewX) parts.push(`skewX(${orientation.skewX}deg)`)
  if (orientation.skewY) parts.push(`skewY(${orientation.skewY}deg)`)
  if (orientation.scaleX !== 1) parts.push(`scaleX(${orientation.scaleX})`)
  if (orientation.scaleY !== 1) parts.push(`scaleY(${orientation.scaleY.toFixed(2)})`)
  return parts.length ? parts.join(' ') : 'none'
}

export function isometricPlaneCssVars(
  orientation: IsometricPlaneOrientation,
): Record<string, string | number> {
  return {
    '--iso-plane-rotate-x': `${orientation.rotateX}deg`,
    '--iso-plane-rotate-y': `${orientation.rotateY}deg`,
    '--iso-plane-rotate-z': `${orientation.rotateZ}deg`,
    '--iso-plane-skew-x': `${orientation.skewX}deg`,
    '--iso-plane-skew-y': `${orientation.skewY}deg`,
    '--iso-plane-scale-x': orientation.scaleX,
    '--iso-plane-scale-y': orientation.scaleY,
  }
}

/** Flat / screen plane — start pose for `animateToIso`. */
export function isometricPlaneFlatCssVars(): Record<string, string | number> {
  return isometricPlaneCssVars(ISOMETRIC_PLANE_ORIENTATIONS.screen)
}

export const ISOMETRIC_PLANE_ANIMATE_DEFAULTS = {
  duration: 0.85,
  ease: 'power2.out',
  hoverDuration: 0.55,
  hoverEase: 'power2.inOut',
} as const

/** Default rest pose for `animateOnHover` — wall front (flat to viewer). */
export const ISOMETRIC_PLANE_HOVER_FROM: IsometricPlaneOrientationId = 'wall-front'

export function isometricPlaneCanAnimateToIso(id: IsometricPlaneOrientationId): boolean {
  return id !== 'screen'
}

export function isometricPlaneCanAnimateOnHover(
  to: IsometricPlaneOrientationId,
  from: IsometricPlaneOrientationId = ISOMETRIC_PLANE_HOVER_FROM,
): boolean {
  return to !== from && to !== 'screen'
}

/** Stage perspective — tighter for walls, wide for iso grounds. */
export function isometricPlaneStagePerspective(category: IsometricViewpointCategory): number {
  switch (category) {
    case 'wall':
      return 720
    case 'oblique':
      return 880
    case 'spread-skew':
      return 640
    default:
      return 1200
  }
}
