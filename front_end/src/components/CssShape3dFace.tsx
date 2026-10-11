import type { CSSProperties } from 'react'
import type { CssShape3dFaceConfig } from '../lib/shape3d/cssShape3dPlatonic'

type CssShape3dFaceProps = {
  face: CssShape3dFaceConfig
}

export function CssShape3dFace({ face }: CssShape3dFaceProps) {
  const style = {
    ['--face-x' as string]: String(face.x),
    ['--face-y' as string]: String(face.y),
    ['--face-z' as string]: String(face.z),
    ['--face-rx' as string]: `${face.rx}deg`,
    ['--face-ry' as string]: `${face.ry}deg`,
    ['--face-rz' as string]: `${face.rz ?? 0}deg`,
    ['--face-w' as string]: String(face.width ?? 0.85),
    ['--face-h' as string]: String(face.height ?? 0.85),
  } satisfies CSSProperties

  return (
    <div
      className={`theme-css-shape3d__poly-face theme-css-shape3d__poly-face--${face.shape} theme-css-shape3d__poly-face--tone-${face.tone}`}
      style={style}
    />
  )
}

type CssShape3dPolyhedronProps = {
  faces: CssShape3dFaceConfig[]
  className?: string
}

export function CssShape3dPolyhedron({ faces, className = '' }: CssShape3dPolyhedronProps) {
  return (
    <div className={`theme-css-shape3d__poly ${className}`.trim()} aria-hidden="true">
      {faces.map((face, index) => (
        <CssShape3dFace key={`${face.tone}-${index}`} face={face} />
      ))}
    </div>
  )
}
