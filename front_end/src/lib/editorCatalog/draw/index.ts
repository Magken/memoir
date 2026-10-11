import type { EditorCatalog } from '../types'
import { EDITOR_ACTION_KIND_LABELS, FEATURE_FIDELITY_LABELS } from '../catalogFidelity'
import { DRAW_EDITOR_ACTIONS } from './actions'
import {
  DRAW_EDITOR_FEATURES,
  DRAW_FEATURE_CATEGORY_LABELS,
  DRAW_FORMAT_LABELS,
} from './features'
import type { DrawFeatureCategory, DrawFormatId } from './types'

export const DRAW_CATALOG: EditorCatalog<DrawFeatureCategory, DrawFormatId> = {
  kind: 'draw',
  features: DRAW_EDITOR_FEATURES,
  actions: DRAW_EDITOR_ACTIONS,
  categoryLabels: DRAW_FEATURE_CATEGORY_LABELS,
  formatLabels: DRAW_FORMAT_LABELS,
  fidelityLabels: FEATURE_FIDELITY_LABELS,
  actionKindLabels: EDITOR_ACTION_KIND_LABELS,
}

export * from './actions'
export * from './features'
export * from './types'
