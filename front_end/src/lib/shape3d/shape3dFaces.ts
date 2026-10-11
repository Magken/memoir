import Zdog from 'zdog'
import type { Shape3dFaceId, Shape3dKind } from './shape3dTypes'
import type { Shape3dViewRotation } from './shape3dFrame'

const TAU = Zdog.TAU

const VIEW: Record<string, Shape3dViewRotation> = {
  front: { x: 0, y: 0 },
  rear: { x: 0, y: TAU / 2 },
  left: { x: 0, y: TAU / 4 },
  right: { x: 0, y: -TAU / 4 },
  top: { x: -TAU / 4, y: 0 },
  bottom: { x: TAU / 4, y: 0 },
  side: { x: TAU / 8, y: -TAU / 8 },
  base: { x: TAU / 4, y: 0 },
  apex: { x: -TAU / 4, y: 0 },
  'face-a': { x: -TAU / 6, y: 0 },
  'face-b': { x: TAU / 6, y: TAU / 3 },
  'face-c': { x: TAU / 6, y: -TAU / 3 },
  'face-d': { x: TAU / 3, y: TAU / 2 },
  'face-e': { x: -TAU / 5, y: TAU / 5 },
  'face-f': { x: TAU / 5, y: -TAU / 5 },
  'face-g': { x: -TAU / 4, y: TAU / 6 },
  'face-h': { x: TAU / 4, y: -TAU / 6 },
}

const FACES_BY_KIND: Record<Shape3dKind, readonly Shape3dFaceId[]> = {
  hourglass: ['front', 'top', 'right', 'rear'],
  sphere: ['front', 'top', 'right', 'rear'],
  cylinder: ['side', 'top', 'bottom'],
  cone: ['side', 'base', 'apex'],
  tetrahedron: ['face-a', 'face-b', 'face-c', 'face-d'],
  octahedron: ['top', 'bottom', 'face-a', 'face-b', 'face-c', 'face-d'],
  cube: ['front', 'rear', 'left', 'right', 'top', 'bottom'],
  dodecahedron: ['top', 'bottom', 'face-a', 'face-b', 'face-c', 'face-d', 'face-e'],
  icosahedron: ['top', 'bottom', 'face-a', 'face-b', 'face-c', 'face-d', 'face-e'],
}

export function shape3dFacesForKind(kind: Shape3dKind): readonly Shape3dFaceId[] {
  return FACES_BY_KIND[kind]
}

export function shape3dFaceOptions(kind: Shape3dKind): readonly { value: Shape3dFaceId; label: string }[] {
  return shape3dFacesForKind(kind).map((face) => ({
    value: face,
    label: face.replace(/-/g, ' '),
  }))
}

export function shape3dDefaultFace(kind: Shape3dKind): Shape3dFaceId {
  return shape3dFacesForKind(kind)[0]
}

export function shape3dFaceView(kind: Shape3dKind, face: Shape3dFaceId): Shape3dViewRotation {
  void kind
  return VIEW[face] ?? VIEW.front
}

export function shape3dIsValidFace(kind: Shape3dKind, face: string): face is Shape3dFaceId {
  return (shape3dFacesForKind(kind) as readonly string[]).includes(face)
}

/** Auto-spin keyframes — ref.3d-shapes-1 */
export const SHAPE3D_SPIN_KEYFRAMES: readonly Shape3dViewRotation[] = [
  { x: 0, y: 0 },
  { x: 0, y: TAU },
  { x: TAU, y: TAU },
]

export const SHAPE3D_SPIN_CYCLE = 180
