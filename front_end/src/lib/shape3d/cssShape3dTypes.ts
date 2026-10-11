import { SHAPE3D_KINDS } from './shape3dTypes'

/** Custom CSS 3D solids — Zdog gallery parity + Rubik's cube. */

export const CSS_SHAPE3D_ZDOG_KINDS = SHAPE3D_KINDS

export const CSS_SHAPE3D_KINDS = [...SHAPE3D_KINDS, 'rubiks'] as const

export type CssShape3dKind = (typeof CSS_SHAPE3D_KINDS)[number]

export type CssShape3dZdogKind = (typeof CSS_SHAPE3D_ZDOG_KINDS)[number]

export const CSS_SHAPE3D_KIND_OPTIONS = CSS_SHAPE3D_KINDS.map((value) => ({
  value,
  label:
    value === 'rubiks'
      ? "Rubik's cube"
      : value.charAt(0).toUpperCase() + value.slice(1),
}))

/** Zdog gallery cell offsets — ref.3d-shapes-1 grid. */
export const CSS_SHAPE3D_GALLERY_LAYOUT: Record<CssShape3dZdogKind, { col: number; row: number }> = {
  hourglass: { col: 1, row: 0 },
  sphere: { col: 0, row: 0 },
  cylinder: { col: 2, row: 0 },
  cone: { col: 0, row: 1 },
  tetrahedron: { col: 1, row: 1 },
  octahedron: { col: 0, row: 2 },
  cube: { col: 2, row: 1 },
  dodecahedron: { col: 1, row: 2 },
  icosahedron: { col: 2, row: 2 },
}

export function cssShape3dFaceNavKind(kind: CssShape3dKind): CssShape3dZdogKind {
  return kind === 'rubiks' ? 'cube' : kind
}
