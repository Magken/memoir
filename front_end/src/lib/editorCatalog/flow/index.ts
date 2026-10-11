import type { EditorCatalog } from '../types'
import { EDITOR_ACTION_KIND_LABELS, FEATURE_FIDELITY_LABELS } from '../catalogFidelity'
import { FLOW_EDITOR_ACTIONS } from './actions'
import {
  FLOW_EDITOR_FEATURES,
  FLOW_FEATURE_CATEGORY_LABELS,
  FLOW_FORMAT_LABELS,
} from './features'
import type { FlowFeatureCategory, FlowFormatId } from './types'

export const FLOW_CATALOG: EditorCatalog<FlowFeatureCategory, FlowFormatId> = {
  kind: 'flow',
  features: FLOW_EDITOR_FEATURES,
  actions: FLOW_EDITOR_ACTIONS,
  categoryLabels: FLOW_FEATURE_CATEGORY_LABELS,
  formatLabels: FLOW_FORMAT_LABELS,
  fidelityLabels: FEATURE_FIDELITY_LABELS,
  actionKindLabels: EDITOR_ACTION_KIND_LABELS,
}

export * from './actions'
export * from './features'
export * from './types'
