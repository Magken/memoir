import type { EditorCatalog } from '../types'
import { EDITOR_ACTION_KIND_LABELS, FEATURE_FIDELITY_LABELS } from '../catalogFidelity'
import { CODE_EDITOR_ACTIONS } from './actions'
import {
  CODE_EDITOR_FEATURES,
  CODE_FEATURE_CATEGORY_LABELS,
  CODE_FORMAT_LABELS,
} from './features'
import type { CodeFeatureCategory, CodeFormatId } from './types'

export const CODE_CATALOG: EditorCatalog<CodeFeatureCategory, CodeFormatId> = {
  kind: 'code',
  features: CODE_EDITOR_FEATURES,
  actions: CODE_EDITOR_ACTIONS,
  categoryLabels: CODE_FEATURE_CATEGORY_LABELS,
  formatLabels: CODE_FORMAT_LABELS,
  fidelityLabels: FEATURE_FIDELITY_LABELS,
  actionKindLabels: EDITOR_ACTION_KIND_LABELS,
}

export * from './actions'
export * from './features'
export * from './types'
