import { CSS_SHAPE3D_CONE_SEGMENTS } from '../lib/shape3d/cssShape3dPlatonic'

const SEGMENTS = CSS_SHAPE3D_CONE_SEGMENTS

export function CssShape3dCone() {
  return (
    <div className="theme-css-shape3d__cone" aria-hidden="true">
      {Array.from({ length: SEGMENTS }, (_, index) => (
        <div
          key={index}
          className="theme-css-shape3d__cone-segment theme-css-shape3d__cone-segment--tone-c"
          style={{ ['--seg-i' as string]: String(index) }}
        />
      ))}
      <div className="theme-css-shape3d__cap theme-css-shape3d__cap--bottom theme-css-shape3d__cap--tone-a" />
    </div>
  )
}
