import type { EditorCatalog } from '../types'
import { EDITOR_ACTION_KIND_LABELS, FEATURE_FIDELITY_LABELS } from '../catalogFidelity'
import { MARKDOWN_EDITOR_ACTIONS } from './actions'
import {
  MARKDOWN_EDITOR_FEATURES,
  MARKDOWN_FEATURE_CATEGORY_LABELS,
  MARKDOWN_FORMAT_LABELS,
} from './features'
import type { MarkdownFeatureCategory, MarkdownFormatId } from './types'

export const MARKDOWN_CATALOG: EditorCatalog<MarkdownFeatureCategory, MarkdownFormatId> = {
  kind: 'markdown',
  features: MARKDOWN_EDITOR_FEATURES,
  actions: MARKDOWN_EDITOR_ACTIONS,
  categoryLabels: MARKDOWN_FEATURE_CATEGORY_LABELS,
  formatLabels: MARKDOWN_FORMAT_LABELS,
  fidelityLabels: FEATURE_FIDELITY_LABELS,
  actionKindLabels: EDITOR_ACTION_KIND_LABELS,
}

export * from './actions'
export * from './features'
export * from './types'
