import { shape3dFaceOptions } from '../lib/shape3d/shape3dFaces'
import type { Shape3dFaceId, Shape3dKind } from '../lib/shape3d/shape3dTypes'

type Shape3dFaceNavProps = {
  kind: Shape3dKind
  value: Shape3dFaceId
  onChange: (face: Shape3dFaceId) => void
  className?: string
}

export function Shape3dFaceNav({ kind, value, onChange, className = '' }: Shape3dFaceNavProps) {
  const faces = shape3dFaceOptions(kind)

  return (
    <div
      className={`theme-shape3d__face-nav flex flex-wrap gap-1.5 ${className}`.trim()}
      role="group"
      aria-label="Shape face navigation"
    >
      {faces.map((face) => {
        const active = face.value === value
        return (
          <button
            key={face.value}
            type="button"
            className={`theme-shape3d__face-btn type-overline ${active ? 'theme-shape3d__face-btn--active' : ''}`}
            aria-pressed={active}
            onClick={() => onChange(face.value)}
          >
            {face.label}
          </button>
        )
      })}
    </div>
  )
}
