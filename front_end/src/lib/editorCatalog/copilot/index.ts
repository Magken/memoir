import type { EditorCatalog } from '../types'
import { EDITOR_ACTION_KIND_LABELS, FEATURE_FIDELITY_LABELS } from '../catalogFidelity'
import { COPILOT_EDITOR_ACTIONS } from './actions'
import {
  COPILOT_EDITOR_FEATURES,
  COPILOT_FEATURE_CATEGORY_LABELS,
  COPILOT_FORMAT_LABELS,
} from './features'
import type { CopilotFeatureCategory, CopilotFormatId } from './types'

export const COPILOT_CATALOG: EditorCatalog<CopilotFeatureCategory, CopilotFormatId> = {
  kind: 'copilot',
  features: COPILOT_EDITOR_FEATURES,
  actions: COPILOT_EDITOR_ACTIONS,
  categoryLabels: COPILOT_FEATURE_CATEGORY_LABELS,
  formatLabels: COPILOT_FORMAT_LABELS,
  fidelityLabels: FEATURE_FIDELITY_LABELS,
  actionKindLabels: EDITOR_ACTION_KIND_LABELS,
}

export * from './actions'
export * from './features'
export * from './types'
