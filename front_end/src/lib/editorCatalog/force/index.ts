import type { EditorCatalog } from '../types'
import { EDITOR_ACTION_KIND_LABELS, FEATURE_FIDELITY_LABELS } from '../catalogFidelity'
import { FORCE_EDITOR_ACTIONS } from './actions'
import {
  FORCE_EDITOR_FEATURES,
  FORCE_FEATURE_CATEGORY_LABELS,
  FORCE_FORMAT_LABELS,
} from './features'
import type { ForceFeatureCategory, ForceFormatId } from './types'

export const FORCE_CATALOG: EditorCatalog<ForceFeatureCategory, ForceFormatId> = {
  kind: 'force',
  features: FORCE_EDITOR_FEATURES,
  actions: FORCE_EDITOR_ACTIONS,
  categoryLabels: FORCE_FEATURE_CATEGORY_LABELS,
  formatLabels: FORCE_FORMAT_LABELS,
  fidelityLabels: FEATURE_FIDELITY_LABELS,
  actionKindLabels: EDITOR_ACTION_KIND_LABELS,
}

export * from './actions'
export * from './features'
export * from './types'
