import type { CssShape3dKind } from '../lib/shape3d/cssShape3dTypes'
import type { Shape3dFaceId } from '../lib/shape3d/shape3dTypes'
import { R3fShape3dViewport } from './R3fShape3dViewport'

type R3fShape3dProps = {
  kind: CssShape3dKind
  face?: Shape3dFaceId
  autoSpin?: boolean
  drag?: boolean
  edges?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function R3fShape3d(props: R3fShape3dProps) {
  return <R3fShape3dViewport {...props} />
}
