/**
 * Shared 8x8 LCL preview host. Copy of the reference tile map.
 */
import type { ReactNode, Ref } from 'react'
import { gridPlacementFromCells, type LclViewportSectionsPayload } from '../../lib/lcl/viewportSections'

type LclPreviewHostProps = {
  fixture: LclViewportSectionsPayload
  hostRef: Ref<HTMLElement>
  label: string
  layoutId?: string
  children: (sectionId: string) => ReactNode
}

export function LclPreviewHost({ fixture, hostRef, label, layoutId, children }: LclPreviewHostProps) {
  return (
    <section
      ref={hostRef}
      className="theme-lcl-preview"
      data-layout={layoutId}
      aria-label={label}
    >
      <div className="theme-lcl-layout">
        {fixture.sections.map((section, index) => {
          const place = gridPlacementFromCells(section.cells)
          if (!place) return null
          return (
            <div
              key={section.id}
              className="theme-lcl-layout__tile"
              data-id={section.id}
              data-tone={String(index % 8)}
              data-cs={String(place.columnStart)}
              data-ce={String(place.columnEnd)}
              data-rs={String(place.rowStart)}
              data-re={String(place.rowEnd)}
              aria-label={section.label}
            >
              {children(section.id)}
            </div>
          )
        })}
      </div>
    </section>
  )
}
