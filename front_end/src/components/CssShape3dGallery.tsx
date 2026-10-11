import { CssShape3d } from './CssShape3d'
import {
  CSS_SHAPE3D_GALLERY_LAYOUT,
  CSS_SHAPE3D_ZDOG_KINDS,
} from '../lib/shape3d/cssShape3dTypes'

export function CssShape3dGallery() {
  return (
    <div className="theme-css-shape3d__gallery-grid">
      {CSS_SHAPE3D_ZDOG_KINDS.map((kind) => {
        const slot = CSS_SHAPE3D_GALLERY_LAYOUT[kind]
        return (
          <div
            key={kind}
            className="theme-css-shape3d__gallery-cell"
            style={{
              gridColumn: slot.col + 1,
              gridRow: slot.row + 1,
            }}
          >
            <CssShape3d kind={kind} size="sm" autoSpin drag />
            <p className="theme-css-shape3d__gallery-label type-caption type-faint mb-0">{kind}</p>
          </div>
        )
      })}
    </div>
  )
}
