import type { ReactNode } from 'react'
import { useCssShape3dView } from '../hooks/useCssShape3dView'
import type { CssShape3dKind } from '../lib/shape3d/cssShape3dTypes'
import type { Shape3dFaceId } from '../lib/shape3d/shape3dTypes'

type CssShape3dSceneProps = {
  kind: CssShape3dKind
  face?: Shape3dFaceId
  autoSpin?: boolean
  drag?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  children: ReactNode
}

const SIZE_CLASS = {
  sm: 'theme-css-shape3d__scene--sm',
  md: 'theme-css-shape3d__scene--md',
  lg: 'theme-css-shape3d__scene--lg',
} as const

export function CssShape3dScene({
  kind,
  face,
  autoSpin = false,
  drag = true,
  size = 'md',
  className = '',
  children,
}: CssShape3dSceneProps) {
  const { sceneRef, sceneStyle, motionState, onPointerDown, onPointerMove, onPointerUp, onPointerCancel } =
    useCssShape3dView({ kind, face, autoSpin, drag })

  return (
    <div
      ref={sceneRef}
      className={`theme-css-shape3d__scene ${SIZE_CLASS[size]} ${className}`.trim()}
      style={sceneStyle}
      data-css-shape-motion={motionState}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div className="theme-css-shape3d__stage">
        <div className="theme-css-shape3d__rigid">{children}</div>
      </div>
    </div>
  )
}
