import { wireframePageLayouts } from './wireframeLayouts'
import { wireframeSectionLayouts } from './wireframeSections'
import type { WireframeLayout, WireframeScope } from './wireframeTypes'

export {
  WIREFRAME_CATEGORIES,
  WIREFRAME_PAGE_CATEGORIES,
  WIREFRAME_SCOPES,
  WIREFRAME_SECTION_CATEGORIES,
} from './wireframeTypes'

export type {
  WireframeBlockDef,
  WireframeBlockTone,
  WireframeCategory,
  WireframeFrame,
  WireframeLayout,
  WireframeMicroGrid,
  WireframeScope,
} from './wireframeTypes'

export const wireframeCatalog: readonly WireframeLayout[] = [
  ...wireframePageLayouts,
  ...wireframeSectionLayouts,
]

export function filterWireframes(
  scope: WireframeScope,
  category: string,
): readonly WireframeLayout[] {
  let items = wireframeCatalog

  if (scope === 'page') {
    items = items.filter((layout) => layout.tier === 'page')
  } else if (scope === 'section') {
    items = items.filter((layout) => layout.tier === 'section')
  }

  if (category !== 'all') {
    items = items.filter((layout) => layout.category === category)
  }

  return items
}
