import type { EditorCatalog } from '../types'
import { DOC_EDITOR_ACTIONS, DOC_EDITOR_ACTION_KIND_LABELS } from './actions'
import {
  DOC_EDITOR_FEATURES,
  DOC_FEATURE_CATEGORY_LABELS,
  DOC_FEATURE_FIDELITY_LABELS,
  DOC_FORMAT_LABELS,
} from './features'
import type { DocFeatureCategory, DocFormatId } from './types'

export const DOC_CATALOG: EditorCatalog<DocFeatureCategory, DocFormatId> = {
  kind: 'doc',
  features: DOC_EDITOR_FEATURES,
  actions: DOC_EDITOR_ACTIONS,
  categoryLabels: DOC_FEATURE_CATEGORY_LABELS,
  formatLabels: DOC_FORMAT_LABELS,
  fidelityLabels: DOC_FEATURE_FIDELITY_LABELS,
  actionKindLabels: DOC_EDITOR_ACTION_KIND_LABELS,
}

export * from './actions'
export * from './allowlist'
export * from './features'
export * from './types'
