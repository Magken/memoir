import { useR3fShape3dMotion } from '../hooks/useR3fShape3dMotion'
import type { CssShape3dKind } from '../lib/shape3d/cssShape3dTypes'
import type { Shape3dFaceId } from '../lib/shape3d/shape3dTypes'
import { R3fShape3dCanvas } from './r3fShape3d/R3fShape3dCanvas'

type R3fShape3dViewportProps = {
  kind: CssShape3dKind
  face?: Shape3dFaceId
  autoSpin?: boolean
  drag?: boolean
  edges?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASS = {
  sm: 'theme-r3f-shape3d__viewport--sm',
  md: 'theme-r3f-shape3d__viewport--md',
  lg: 'theme-r3f-shape3d__viewport--lg',
} as const

export function R3fShape3dViewport({
  kind,
  face,
  autoSpin = false,
  drag = true,
  edges = false,
  size = 'md',
  className = '',
}: R3fShape3dViewportProps) {
  const { containerRef, viewRef, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, frameloop } =
    useR3fShape3dMotion({ kind, face, autoSpin, drag })

  return (
    <div
      ref={containerRef}
      className={`theme-r3f-shape3d__viewport ${SIZE_CLASS[size]} ${className}`.trim()}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <R3fShape3dCanvas kind={kind} viewRef={viewRef} edges={edges} frameloop={frameloop} />
    </div>
  )
}
