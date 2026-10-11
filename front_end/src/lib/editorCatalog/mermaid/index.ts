import type { EditorCatalog } from '../types'
import { EDITOR_ACTION_KIND_LABELS, FEATURE_FIDELITY_LABELS } from '../catalogFidelity'
import { MERMAID_EDITOR_ACTIONS } from './actions'
import {
  MERMAID_EDITOR_FEATURES,
  MERMAID_FEATURE_CATEGORY_LABELS,
  MERMAID_FORMAT_LABELS,
} from './features'
import type { MermaidFeatureCategory, MermaidFormatId } from './types'

export const MERMAID_CATALOG: EditorCatalog<MermaidFeatureCategory, MermaidFormatId> = {
  kind: 'mermaid',
  features: MERMAID_EDITOR_FEATURES,
  actions: MERMAID_EDITOR_ACTIONS,
  categoryLabels: MERMAID_FEATURE_CATEGORY_LABELS,
  formatLabels: MERMAID_FORMAT_LABELS,
  fidelityLabels: FEATURE_FIDELITY_LABELS,
  actionKindLabels: EDITOR_ACTION_KIND_LABELS,
}

export * from './actions'
export * from './features'
export * from './types'
