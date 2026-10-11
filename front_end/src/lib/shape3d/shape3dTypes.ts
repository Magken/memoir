/** Zdog solid kinds — ref.3d-shapes-1 */

export const SHAPE3D_KINDS = [
  'hourglass',
  'sphere',
  'cylinder',
  'cone',
  'tetrahedron',
  'octahedron',
  'cube',
  'dodecahedron',
  'icosahedron',
] as const

export type Shape3dKind = (typeof SHAPE3D_KINDS)[number]

export type Shape3dHostRole = 'neutral' | 'card' | 'button' | 'display'

export type Shape3dCubeFace = 'front' | 'rear' | 'left' | 'right' | 'top' | 'bottom'
export type Shape3dCapFace = 'top' | 'bottom' | 'side'
export type Shape3dCardinalFace = 'front' | 'rear' | 'left' | 'right' | 'top' | 'bottom'

export type Shape3dFaceId =
  | Shape3dCubeFace
  | Shape3dCapFace
  | 'base'
  | 'apex'
  | 'face-a'
  | 'face-b'
  | 'face-c'
  | 'face-d'
  | 'face-e'
  | 'face-f'
  | 'face-g'
  | 'face-h'

export const SHAPE3D_KIND_OPTIONS = SHAPE3D_KINDS.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}))

export const SHAPE3D_ROLE_OPTIONS = [
  { value: 'neutral', label: 'Neutral' },
  { value: 'card', label: 'Card shell' },
  { value: 'button', label: 'Button tile' },
  { value: 'display', label: 'Data display' },
] as const satisfies ReadonlyArray<{ value: Shape3dHostRole; label: string }>
