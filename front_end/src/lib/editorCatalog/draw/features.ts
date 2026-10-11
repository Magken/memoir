/**
 * DrawCanvas feature catalog — notation ids, import/export fidelity, and IR hints.
 */
import { F } from '../catalogFidelity'
import type { DrawEditorFeature, DrawFeatureCategory, DrawFormatId } from './types'

export type { DrawEditorFeature, DrawFeatureCategory, DrawFormatId, DrawFeatureFidelity } from './types'

export const DRAW_FEATURE_CATEGORY_LABELS: Record<DrawFeatureCategory, string> = {
  chrome: 'Canvas chrome',
  interaction: 'Interaction',
  io: 'Context I/O',
}

export const DRAW_FORMAT_LABELS: Record<DrawFormatId, string> = {
  'native-json': 'Native JSON',
  excalidraw: 'Excalidraw JSON',
  png: 'PNG',
  svg: 'SVG',
}

export const DRAW_EDITOR_FEATURES: DrawEditorFeature[] = [
  {
    id: 'draw.io.excalidraw',
    label: 'Excalidraw scene import / export',
    category: 'io',
    usable: true,
    notation: 'payload.excalidraw',
    import: { 'native-json': F.partial, excalidraw: F.full, png: F.na, svg: F.na },
    export: { 'native-json': F.partial, excalidraw: F.full, png: F.na, svg: F.na },
    notes: 'Raw Excalidraw JSON — elements, appState, files.',
  },
  {
    id: 'draw.io.native-json',
    label: 'Native JSON context',
    category: 'io',
    usable: true,
    notation: 'envelope.payload.scene',
    import: { 'native-json': F.full, excalidraw: F.na, png: F.na, svg: F.na },
    export: { 'native-json': F.full, excalidraw: F.na, png: F.na, svg: F.na },
  },
  {
    id: 'draw.io.png',
    label: 'PNG export (native raster)',
    category: 'io',
    usable: true,
    notation: 'export.png @scene',
    import: { 'native-json': F.na, excalidraw: F.na, png: F.na, svg: F.na },
    export: { 'native-json': F.na, excalidraw: F.na, png: F.native, svg: F.na },
    actions: ['draw.action.export-png'],
    notes: 'Browser-native raster export from the live canvas.',
  },
  {
    id: 'draw.io.svg',
    label: 'SVG export (native vector)',
    category: 'io',
    usable: true,
    notation: 'export.svg @scene',
    import: { 'native-json': F.na, excalidraw: F.na, png: F.na, svg: F.na },
    export: { 'native-json': F.na, excalidraw: F.na, png: F.na, svg: F.native },
    actions: ['draw.action.export-svg'],
    notes: 'Browser-native vector export from the live canvas.',
  },
  {
    id: 'draw.io.envelope',
    label: 'Envelope save distinction',
    category: 'io',
    usable: true,
    notation: 'envelope.payload.scene vs raw excalidraw file',
    import: { 'native-json': F.full, excalidraw: F.partial, png: F.na, svg: F.na },
    export: { 'native-json': F.full, excalidraw: F.partial, png: F.na, svg: F.na },
    notes: 'Editor context envelope wraps scene metadata; standalone .excalidraw files omit envelope fields.',
  },
]

export const USABLE_DRAW_EDITOR_FEATURES = DRAW_EDITOR_FEATURES.filter((feature) => feature.usable)

export function drawFeaturesByCategory(category: DrawFeatureCategory): DrawEditorFeature[] {
  return USABLE_DRAW_EDITOR_FEATURES.filter((feature) => feature.category === category)
}

export const DRAW_EDITOR_FEATURE_CATEGORIES = (
  Object.keys(DRAW_FEATURE_CATEGORY_LABELS) as DrawFeatureCategory[]
).filter((category) => drawFeaturesByCategory(category).length > 0)
