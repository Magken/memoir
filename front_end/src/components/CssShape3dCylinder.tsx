import { CSS_SHAPE3D_CYLINDER_SEGMENTS } from '../lib/shape3d/cssShape3dPlatonic'

const SEGMENTS = CSS_SHAPE3D_CYLINDER_SEGMENTS

export function CssShape3dCylinder() {
  return (
    <div className="theme-css-shape3d__cylinder" aria-hidden="true">
      {Array.from({ length: SEGMENTS }, (_, index) => (
        <div
          key={index}
          className="theme-css-shape3d__cylinder-segment theme-css-shape3d__cylinder-segment--tone-b"
          style={{ ['--seg-i' as string]: String(index) }}
        />
      ))}
      <div className="theme-css-shape3d__cap theme-css-shape3d__cap--top theme-css-shape3d__cap--tone-e" />
      <div className="theme-css-shape3d__cap theme-css-shape3d__cap--bottom theme-css-shape3d__cap--tone-a" />
    </div>
  )
}
