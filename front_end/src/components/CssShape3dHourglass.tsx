import { CSS_SHAPE3D_CONE_SEGMENTS } from '../lib/shape3d/cssShape3dPlatonic'

const SEGMENTS = CSS_SHAPE3D_CONE_SEGMENTS

export function CssShape3dHourglass() {
  return (
    <div className="theme-css-shape3d__hourglass" aria-hidden="true">
      <div className="theme-css-shape3d__hourglass-half theme-css-shape3d__hourglass-half--top">
        {Array.from({ length: SEGMENTS }, (_, index) => (
          <div
            key={`top-${index}`}
            className="theme-css-shape3d__hourglass-segment theme-css-shape3d__hourglass-segment--top theme-css-shape3d__hourglass-segment--tone-b"
            style={{ ['--seg-i' as string]: String(index) }}
          />
        ))}
      </div>
      <div className="theme-css-shape3d__hourglass-half theme-css-shape3d__hourglass-half--bottom">
        {Array.from({ length: SEGMENTS }, (_, index) => (
          <div
            key={`bottom-${index}`}
            className="theme-css-shape3d__hourglass-segment theme-css-shape3d__hourglass-segment--bottom theme-css-shape3d__hourglass-segment--tone-a"
            style={{ ['--seg-i' as string]: String(index) }}
          />
        ))}
      </div>
    </div>
  )
}
