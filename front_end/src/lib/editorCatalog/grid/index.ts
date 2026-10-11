import type { EditorCatalog } from '../types'
import { EDITOR_ACTION_KIND_LABELS, FEATURE_FIDELITY_LABELS } from '../catalogFidelity'
import { GRID_EDITOR_ACTIONS } from './actions'
import {
  GRID_EDITOR_FEATURES,
  GRID_FEATURE_CATEGORY_LABELS,
  GRID_FORMAT_LABELS,
} from './features'
import type { GridFeatureCategory, GridFormatId } from './types'

export const GRID_CATALOG: EditorCatalog<GridFeatureCategory, GridFormatId> = {
  kind: 'grid',
  features: GRID_EDITOR_FEATURES,
  actions: GRID_EDITOR_ACTIONS,
  categoryLabels: GRID_FEATURE_CATEGORY_LABELS,
  formatLabels: GRID_FORMAT_LABELS,
  fidelityLabels: FEATURE_FIDELITY_LABELS,
  actionKindLabels: EDITOR_ACTION_KIND_LABELS,
}

export * from './actions'
export * from './features'
export * from './types'
