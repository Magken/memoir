import { useShape3dIllustration } from '../hooks/useShape3dIllustration'
import type { Shape3dFaceId, Shape3dKind } from '../lib/shape3d/shape3dTypes'

type Shape3dIllustrationProps = {
  kind: Shape3dKind
  mode?: 'single' | 'gallery'
  face?: Shape3dFaceId
  autoSpin?: boolean
  drag?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASS = {
  sm: 'theme-shape3d__canvas--sm',
  md: 'theme-shape3d__canvas--md',
  lg: 'theme-shape3d__canvas--lg',
} as const

export function Shape3dIllustration({
  kind,
  mode = 'single',
  face,
  autoSpin = true,
  drag = true,
  size = 'md',
  className = '',
}: Shape3dIllustrationProps) {
  const { canvasRef } = useShape3dIllustration({
    kind,
    mode,
    face,
    autoSpin,
    drag,
  })

  return (
    <canvas
      ref={canvasRef}
      className={`theme-shape3d__canvas ${SIZE_CLASS[size]} ${className}`.trim()}
      aria-hidden="true"
    />
  )
}
