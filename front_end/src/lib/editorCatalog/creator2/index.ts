import type { EditorCatalog } from '../types'
import { EDITOR_ACTION_KIND_LABELS, FEATURE_FIDELITY_LABELS } from '../catalogFidelity'
import { CREATOR2_EDITOR_ACTIONS } from './actions'
import {
  CREATOR2_EDITOR_FEATURES,
  CREATOR2_FEATURE_CATEGORY_LABELS,
  CREATOR2_FORMAT_LABELS,
} from './features'
import type { Creator2FeatureCategory, Creator2FormatId } from './types'

export const CREATOR2_CATALOG: EditorCatalog<Creator2FeatureCategory, Creator2FormatId> = {
  kind: 'creator2',
  features: CREATOR2_EDITOR_FEATURES,
  actions: CREATOR2_EDITOR_ACTIONS,
  categoryLabels: CREATOR2_FEATURE_CATEGORY_LABELS,
  formatLabels: CREATOR2_FORMAT_LABELS,
  fidelityLabels: FEATURE_FIDELITY_LABELS,
  actionKindLabels: EDITOR_ACTION_KIND_LABELS,
}

export * from './actions'
export * from './features'
export * from './types'
