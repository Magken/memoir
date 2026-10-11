/**
 * ForceGraphRenderer feature catalog — chrome, interaction, and I/O fidelity.
 */
import { F } from '../catalogFidelity'
import type { ForceEditorFeature, ForceFeatureCategory, ForceFormatId } from './types'

export type { ForceEditorFeature, ForceFeatureCategory, ForceFormatId, ForceFeatureFidelity } from './types'

export const FORCE_FEATURE_CATEGORY_LABELS: Record<ForceFeatureCategory, string> = {
  chrome: 'Graph chrome',
  interaction: 'Interaction',
  io: 'Context I/O',
}

export const FORCE_FORMAT_LABELS: Record<ForceFormatId, string> = {
  'native-json': 'Graph JSON',
  svg: 'SVG',
  png: 'PNG',
}

export const FORCE_EDITOR_FEATURES: ForceEditorFeature[] = [
  {
    id: 'force.chrome.source',
    label: 'Source editor pane',
    category: 'chrome',
    usable: true,
    notation: 'chrome.source=visible',
    import: { 'native-json': F.na, svg: F.na, png: F.na },
    export: { 'native-json': F.na, svg: F.na, png: F.na },
    notes: 'JSON graph buffer — UI chrome, not serialized.',
  },
  {
    id: 'force.chrome.canvas',
    label: 'Force canvas viewport',
    category: 'chrome',
    usable: true,
    notation: 'chrome.canvas=visible',
    import: { 'native-json': F.na, svg: F.na, png: F.na },
    export: { 'native-json': F.na, svg: F.na, png: F.na },
    actions: ['force.action.zoom-in', 'force.action.zoom-out', 'force.action.zoom-fit'],
    notes: 'd3-force SVG viewport with pan/zoom and node drag.',
  },
  {
    id: 'force.io.native-json',
    label: 'Graph JSON import / export',
    category: 'io',
    usable: true,
    notation: 'payload.force.source',
    import: { 'native-json': F.full, svg: F.na, png: F.na },
    export: { 'native-json': F.full, svg: F.na, png: F.na },
  },
  {
    id: 'force.io.svg',
    label: 'SVG export',
    category: 'io',
    usable: true,
    notation: 'export.svg',
    import: { 'native-json': F.na, svg: F.na, png: F.na },
    export: { 'native-json': F.na, svg: F.full, png: F.na },
    notes: 'Runtime SVG serialize from the live viewport.',
  },
  {
    id: 'force.io.png',
    label: 'PNG export',
    category: 'io',
    usable: true,
    notation: 'export.png',
    import: { 'native-json': F.na, svg: F.na, png: F.na },
    export: { 'native-json': F.na, svg: F.na, png: F.full },
    notes: 'Runtime PNG rasterized from the inlined live SVG.',
  },
]

export const USABLE_FORCE_EDITOR_FEATURES = FORCE_EDITOR_FEATURES.filter((feature) => feature.usable)

export function forceFeaturesByCategory(category: ForceFeatureCategory): ForceEditorFeature[] {
  return USABLE_FORCE_EDITOR_FEATURES.filter((feature) => feature.category === category)
}

export const FORCE_EDITOR_FEATURE_CATEGORIES = (
  Object.keys(FORCE_FEATURE_CATEGORY_LABELS) as ForceFeatureCategory[]
).filter((category) => forceFeaturesByCategory(category).length > 0)
