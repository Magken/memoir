import type { ReactNode } from 'react'
import { CssShape3d } from './CssShape3d'
import { Shape3dFaceNav } from './Shape3dFaceNav'
import { shape3dViewToDegrees } from '../lib/shape3d/shape3dFrame'
import { shape3dFaceView } from '../lib/shape3d/shape3dFaces'
import { cssShape3dFaceNavKind, type CssShape3dKind } from '../lib/shape3d/cssShape3dTypes'
import type { Shape3dFaceId } from '../lib/shape3d/shape3dTypes'

type CssShape3dHostProps = {
  kind: CssShape3dKind
  face?: Shape3dFaceId
  onFaceChange?: (face: Shape3dFaceId) => void
  title?: string
  subtitle?: string
  autoSpin?: boolean
  children?: ReactNode
  className?: string
}

export function CssShape3dHost({
  kind,
  face,
  onFaceChange,
  title,
  subtitle,
  autoSpin = false,
  children,
  className = '',
}: CssShape3dHostProps) {
  const navKind = cssShape3dFaceNavKind(kind)
  const view = face ? shape3dFaceView(navKind, face) : null
  const degrees = view ? shape3dViewToDegrees(view) : null

  return (
    <article
      className={`theme-shape3d__host theme-css-shape3d__host ${className}`.trim()}
      data-css-shape-kind={kind}
    >
      <div className="theme-shape3d__stage theme-css-shape3d__host-stage">
        <CssShape3d kind={kind} face={face} autoSpin={autoSpin} size="md" drag />
      </div>

      {(title || subtitle || children) && (
        <div className="theme-shape3d__body">
          {title ? <p className="theme-shape3d__title type-label mb-0">{title}</p> : null}
          {subtitle ? <p className="theme-shape3d__subtitle type-caption type-muted mb-0">{subtitle}</p> : null}
          {children}
        </div>
      )}

      {onFaceChange && face ? (
        <div className="theme-shape3d__controls">
          <Shape3dFaceNav kind={navKind} value={face} onChange={onFaceChange} />
          {degrees ? (
            <p className="type-code type-faint mb-0">
              css · rotateX {degrees.x.toFixed(0)}° · rotateY {degrees.y.toFixed(0)}°
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
