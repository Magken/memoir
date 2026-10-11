import type { EditorCatalog } from '../types'
import { EDITOR_ACTION_KIND_LABELS, FEATURE_FIDELITY_LABELS } from '../catalogFidelity'
import { DM_EDITOR_ACTIONS } from './actions'
import {
  DM_EDITOR_FEATURES,
  DM_FEATURE_CATEGORY_LABELS,
  DM_FORMAT_LABELS,
} from './features'
import type { DmFeatureCategory, DmFormatId } from './types'

export const DM_CATALOG: EditorCatalog<DmFeatureCategory, DmFormatId> = {
  kind: 'dm',
  features: DM_EDITOR_FEATURES,
  actions: DM_EDITOR_ACTIONS,
  categoryLabels: DM_FEATURE_CATEGORY_LABELS,
  formatLabels: DM_FORMAT_LABELS,
  fidelityLabels: FEATURE_FIDELITY_LABELS,
  actionKindLabels: EDITOR_ACTION_KIND_LABELS,
}

export * from './actions'
export * from './features'
export * from './types'
