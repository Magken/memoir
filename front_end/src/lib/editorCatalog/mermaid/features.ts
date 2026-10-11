/**
 * MermaidRenderer feature catalog — notation ids, import/export fidelity, and IR hints.
 */
import { F } from '../catalogFidelity'
import type { MermaidEditorFeature, MermaidFeatureCategory, MermaidFormatId } from './types'

export type { MermaidEditorFeature, MermaidFeatureCategory, MermaidFormatId, MermaidFeatureFidelity } from './types'

export const MERMAID_FEATURE_CATEGORY_LABELS: Record<MermaidFeatureCategory, string> = {
  chrome: 'Diagram chrome',
  interaction: 'Interaction',
  io: 'Context I/O',
}

export const MERMAID_FORMAT_LABELS: Record<MermaidFormatId, string> = {
  'native-json': 'Native JSON',
  mmd: 'Mermaid source',
  svg: 'SVG',
  png: 'PNG',
}

const NA = { 'native-json': F.na, mmd: F.na, svg: F.na, png: F.na } as const

export const MERMAID_EDITOR_FEATURES: MermaidEditorFeature[] = [
  {
    id: 'mermaid.chrome.source',
    label: 'Source editor pane',
    category: 'chrome',
    usable: true,
    notation: 'chrome.source=visible',
    import: { ...NA },
    export: { ...NA },
    notes: 'Mermaid source buffer — UI chrome, not serialized.',
  },
  {
    id: 'mermaid.chrome.canvas',
    label: 'Rendered canvas viewport',
    category: 'chrome',
    usable: true,
    notation: 'chrome.canvas=visible',
    import: { ...NA },
    export: { ...NA },
    actions: [
      'mermaid.action.zoom-in',
      'mermaid.action.zoom-out',
      'mermaid.action.zoom-fit',
    ],
    notes: 'Pan/zoom diagram viewport — UI chrome, not serialized.',
  },
  {
    id: 'mermaid.io.mmd',
    label: 'Mermaid source import / export',
    category: 'io',
    usable: true,
    notation: 'payload.mermaid',
    import: { 'native-json': F.na, mmd: F.full, svg: F.na, png: F.na },
    export: { 'native-json': F.na, mmd: F.full, svg: F.na, png: F.na },
  },
  {
    id: 'mermaid.io.native-json',
    label: 'Native JSON context',
    category: 'io',
    usable: true,
    notation: 'envelope.payload.mermaid',
    import: { 'native-json': F.full, mmd: F.na, svg: F.na, png: F.na },
    export: { 'native-json': F.full, mmd: F.na, svg: F.na, png: F.na },
  },
  {
    id: 'mermaid.io.svg',
    label: 'SVG export',
    category: 'io',
    usable: true,
    notation: 'export.svg',
    import: { ...NA },
    export: { 'native-json': F.na, mmd: F.na, svg: F.full, png: F.na },
    notes: 'Runtime SVG from the live viewport with theme paints inlined.',
  },
  {
    id: 'mermaid.io.png',
    label: 'PNG export',
    category: 'io',
    usable: true,
    notation: 'export.png',
    import: { ...NA },
    export: { 'native-json': F.na, mmd: F.na, svg: F.na, png: F.full },
    notes: 'Runtime PNG rasterized from the inlined live SVG.',
  },
]

export const USABLE_MERMAID_EDITOR_FEATURES = MERMAID_EDITOR_FEATURES.filter((feature) => feature.usable)

export function mermaidFeaturesByCategory(category: MermaidFeatureCategory): MermaidEditorFeature[] {
  return USABLE_MERMAID_EDITOR_FEATURES.filter((feature) => feature.category === category)
}

export const MERMAID_EDITOR_FEATURE_CATEGORIES = (
  Object.keys(MERMAID_FEATURE_CATEGORY_LABELS) as MermaidFeatureCategory[]
).filter((category) => mermaidFeaturesByCategory(category).length > 0)
