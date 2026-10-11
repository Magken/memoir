/**
 * DataGridEditor feature catalog — notation ids, import/export fidelity, and IR hints.
 */
import { F } from '../catalogFidelity'
import type { GridEditorFeature, GridFeatureCategory, GridFormatId } from './types'

export type { GridEditorFeature, GridFeatureCategory, GridFormatId, GridFeatureFidelity } from './types'

export const GRID_FEATURE_CATEGORY_LABELS: Record<GridFeatureCategory, string> = {
  sheet: 'Sheet model',
  chrome: 'Grid chrome',
  interaction: 'Interaction',
  io: 'Context I/O',
}

export const GRID_FORMAT_LABELS: Record<GridFormatId, string> = {
  'native-json': 'Native JSON',
  csv: 'CSV',
}

export const GRID_EDITOR_FEATURES: GridEditorFeature[] = [
  {
    id: 'grid.sheet.cells',
    label: 'Cell values & types',
    category: 'sheet',
    usable: true,
    notation: 'sheet.cells[row][col]',
    irNode: 'cell',
    import: { 'native-json': F.full, csv: F.partial },
    export: { 'native-json': F.full, csv: F.partial },
    notes: 'Typed cell grid — CSV maps to string cells with inferred types on import.',
  },
  {
    id: 'grid.sheet.columns',
    label: 'Column definitions',
    category: 'sheet',
    usable: true,
    notation: 'sheet.columns[]',
    irNode: 'column',
    import: { 'native-json': F.full, csv: F.partial },
    export: { 'native-json': F.full, csv: F.partial },
    notes: 'Header row and column metadata preserved in native-json; CSV uses first row as headers.',
  },
  {
    id: 'grid.io.csv',
    label: 'CSV import / export',
    category: 'io',
    usable: true,
    notation: 'payload.csv',
    import: { 'native-json': F.na, csv: F.full },
    export: { 'native-json': F.na, csv: F.full },
    actions: ['grid.action.import-csv'],
  },
  {
    id: 'grid.io.native-json',
    label: 'Native JSON context',
    category: 'io',
    usable: true,
    notation: 'envelope.payload.sheet',
    import: { 'native-json': F.full, csv: F.na },
    export: { 'native-json': F.full, csv: F.na },
  },
  {
    id: 'grid.interaction.fill-handle',
    label: 'Fill handle drag',
    category: 'interaction',
    usable: true,
    notation: 'interaction.fill-handle @range',
    import: { 'native-json': F.na, csv: F.na },
    export: { 'native-json': F.na, csv: F.na },
    notes: 'Spreadsheet fill-down/right affordance — not serialized.',
    actions: ['grid.action.fill-handle'],
  },
]

export const USABLE_GRID_EDITOR_FEATURES = GRID_EDITOR_FEATURES.filter((feature) => feature.usable)

export function gridFeaturesByCategory(category: GridFeatureCategory): GridEditorFeature[] {
  return USABLE_GRID_EDITOR_FEATURES.filter((feature) => feature.category === category)
}

export const GRID_EDITOR_FEATURE_CATEGORIES = (
  Object.keys(GRID_FEATURE_CATEGORY_LABELS) as GridFeatureCategory[]
).filter((category) => gridFeaturesByCategory(category).length > 0)
