import type { ReactNode } from 'react'
import { Shape3dFaceNav } from './Shape3dFaceNav'
import { Shape3dIllustration } from './Shape3dIllustration'
import { shape3dViewToDegrees } from '../lib/shape3d/shape3dFrame'
import { shape3dFaceView } from '../lib/shape3d/shape3dFaces'
import type { Shape3dFaceId, Shape3dHostRole, Shape3dKind } from '../lib/shape3d/shape3dTypes'

type Shape3dHostProps = {
  kind: Shape3dKind
  role?: Shape3dHostRole
  face?: Shape3dFaceId
  onFaceChange?: (face: Shape3dFaceId) => void
  title?: string
  subtitle?: string
  metric?: string
  children?: ReactNode
  autoSpin?: boolean
  className?: string
}

const ROLE_CLASS: Record<Shape3dHostRole, string> = {
  neutral: 'theme-shape3d__host--neutral',
  card: 'theme-shape3d__host--card',
  button: 'theme-shape3d__host--button',
  display: 'theme-shape3d__host--display',
}

export function Shape3dHost({
  kind,
  role = 'neutral',
  face,
  onFaceChange,
  title,
  subtitle,
  metric,
  children,
  autoSpin = false,
  className = '',
}: Shape3dHostProps) {
  const view = face ? shape3dFaceView(kind, face) : null
  const degrees = view ? shape3dViewToDegrees(view) : null

  return (
    <article
      className={`theme-shape3d__host ${ROLE_CLASS[role]} ${className}`.trim()}
      data-shape-kind={kind}
      data-shape-role={role}
    >
      <div className="theme-shape3d__stage">
        <Shape3dIllustration kind={kind} face={face} autoSpin={autoSpin} size="md" />
      </div>

      {(title || subtitle || metric || children) && (
        <div className="theme-shape3d__body">
          {metric ? <p className="theme-shape3d__metric type-display-sm mb-0">{metric}</p> : null}
          {title ? <p className="theme-shape3d__title type-label mb-0">{title}</p> : null}
          {subtitle ? <p className="theme-shape3d__subtitle type-caption type-muted mb-0">{subtitle}</p> : null}
          {children}
        </div>
      )}

      {onFaceChange && face ? (
        <div className="theme-shape3d__controls">
          <Shape3dFaceNav kind={kind} value={face} onChange={onFaceChange} />
          {degrees ? (
            <p className="type-code type-faint mb-0">
              frame · rotateX {degrees.x.toFixed(0)}° · rotateY {degrees.y.toFixed(0)}°
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
