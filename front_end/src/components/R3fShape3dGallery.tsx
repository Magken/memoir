import { R3fShape3d } from './R3fShape3d'
import {
  CSS_SHAPE3D_GALLERY_LAYOUT,
  CSS_SHAPE3D_ZDOG_KINDS,
} from '../lib/shape3d/cssShape3dTypes'

type R3fShape3dGalleryProps = {
  edges?: boolean
}

export function R3fShape3dGallery({ edges = false }: R3fShape3dGalleryProps) {
  return (
    <div className="theme-r3f-shape3d__gallery-grid">
      {CSS_SHAPE3D_ZDOG_KINDS.map((kind) => {
        const slot = CSS_SHAPE3D_GALLERY_LAYOUT[kind]
        return (
          <div
            key={kind}
            className="theme-r3f-shape3d__gallery-cell"
            style={{
              gridColumn: slot.col + 1,
              gridRow: slot.row + 1,
            }}
          >
            <R3fShape3d kind={kind} size="sm" autoSpin drag edges={edges} />
            <p className="theme-r3f-shape3d__gallery-label type-caption type-faint mb-0">{kind}</p>
          </div>
        )
      })}
    </div>
  )
}
