import type { ReactNode } from 'react'
import {
  useCssShape3dMenuCubeMotion,
  type CssShape3dMenuCubeMotionMode,
} from '../hooks/useCssShape3dMenuCubeMotion'
import {
  CSS_SHAPE3D_MENU_CUBE_REF_FACES,
  cssShape3dMenuCubeBodyClass,
  cssShape3dMenuCubeStageClass,
  type CssShape3dMenuCubeRefFaceId,
  type CssShape3dMenuCubeSize,
} from '../lib/shape3d/cssShape3dMenuCube'

type CssShape3dMenuCubeProps<TFace extends string = CssShape3dMenuCubeRefFaceId> = {
  faceIds?: readonly TFace[]
  activeFace: TFace
  size?: CssShape3dMenuCubeSize
  /** `menu` = ref.3d-menu class-swap transition · `drag` = pointer orbit */
  mode?: CssShape3dMenuCubeMotionMode
  /** Draw a bordered frame around each cube face */
  faceBorder?: boolean
  className?: string
  children: (faceId: TFace) => ReactNode
}

export function CssShape3dMenuCube<TFace extends string = CssShape3dMenuCubeRefFaceId>({
  faceIds = CSS_SHAPE3D_MENU_CUBE_REF_FACES as unknown as readonly TFace[],
  activeFace,
  size = 'md',
  mode = 'menu',
  faceBorder = false,
  className = '',
  children,
}: CssShape3dMenuCubeProps<TFace>) {
  const {
    stageRef,
    cubeRef,
    motionState,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  } = useCssShape3dMenuCubeMotion({ activeFace, mode })

  const stageClass = [cssShape3dMenuCubeStageClass(size), className].filter(Boolean).join(' ')

  return (
    <div
      ref={stageRef}
      className={stageClass}
      data-menu-cube-mode={mode}
      data-menu-cube-motion={motionState}
      {...(mode === 'drag'
        ? {
            onPointerDown,
            onPointerMove,
            onPointerUp,
            onPointerCancel,
          }
        : {})}
    >
      <ul
        ref={cubeRef}
        className={[
          'theme-css-shape3d__menu-cube',
          mode === 'menu' ? cssShape3dMenuCubeBodyClass(activeFace) : '',
        ]
          .filter(Boolean)
          .join(' ')}
        {...(faceBorder ? { 'data-face-border': 'true' } : {})}
      >
        {faceIds.map((faceId) => (
          <li
            key={faceId}
            className="theme-css-shape3d__menu-cube-side"
            data-cube-face={faceId}
            {...(faceId === activeFace ? { 'data-active-face': 'true' } : {})}
          >
            {children(faceId)}
          </li>
        ))}
      </ul>
    </div>
  )
}
