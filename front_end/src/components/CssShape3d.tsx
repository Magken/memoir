import { CssShape3dSolid } from './CssShape3dSolid'
import { CssShape3dScene } from './CssShape3dScene'
import type { CssShape3dKind } from '../lib/shape3d/cssShape3dTypes'
import type { Shape3dFaceId } from '../lib/shape3d/shape3dTypes'

type CssShape3dProps = {
  kind: CssShape3dKind
  face?: Shape3dFaceId
  autoSpin?: boolean
  drag?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function CssShape3d({
  kind,
  face,
  autoSpin = false,
  drag = true,
  size = 'md',
  className = '',
}: CssShape3dProps) {
  return (
    <CssShape3dScene
      kind={kind}
      face={face}
      autoSpin={autoSpin}
      drag={drag}
      size={size}
      className={className}
    >
      <CssShape3dSolid kind={kind} />
    </CssShape3dScene>
  )
}
