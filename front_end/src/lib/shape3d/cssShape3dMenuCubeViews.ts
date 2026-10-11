import type { CssShape3dMenuCubeRefFaceId } from './cssShape3dMenuCube'
import type { CssShape3dRotation } from './cssShape3dMath'

/**
 * Body rotation to bring each labeled face forward.
 * Face placement uses ref.3d-menu nth-child transforms; body angle is the inverse
 * so each semantic face panel lands flat in front when selected.
 */
export const CSS_SHAPE3D_MENU_CUBE_FACE_VIEW: Record<CssShape3dMenuCubeRefFaceId, CssShape3dRotation> = {
  home: { rx: 0, ry: 0 },
  about: { rx: 0, ry: -90 },
  misc: { rx: 180, ry: 0 },
  shop: { rx: 0, ry: 90 },
  social: { rx: 90, ry: 0 },
  dribbble: { rx: -90, ry: 0 },
}

/** ref.3d-menu `#cube` transition (0.6s cubic-bezier). */
export const CSS_SHAPE3D_MENU_CUBE_TRANSITION_MS = 600

export const CSS_SHAPE3D_MENU_CUBE_TRANSITION_EASE = 'cubic-bezier(0.11, 0.93, 0.65, 0.92)'

export function cssShape3dMenuCubeFaceView(faceId: string): CssShape3dRotation {
  return (
    CSS_SHAPE3D_MENU_CUBE_FACE_VIEW[faceId as CssShape3dMenuCubeRefFaceId] ?? {
      rx: 0,
      ry: 0,
    }
  )
}
