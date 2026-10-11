import type { EditorCatalog } from '../types'
import { EDITOR_ACTION_KIND_LABELS, FEATURE_FIDELITY_LABELS } from '../catalogFidelity'
import { TESTFORM_EDITOR_ACTIONS } from './actions'
import {
  TESTFORM_EDITOR_FEATURES,
  TESTFORM_FEATURE_CATEGORY_LABELS,
  TESTFORM_FORMAT_LABELS,
} from './features'
import type { TestFormFeatureCategory, TestFormFormatId } from './types'

export const TESTFORM_CATALOG: EditorCatalog<TestFormFeatureCategory, TestFormFormatId> = {
  kind: 'testform',
  features: TESTFORM_EDITOR_FEATURES,
  actions: TESTFORM_EDITOR_ACTIONS,
  categoryLabels: TESTFORM_FEATURE_CATEGORY_LABELS,
  formatLabels: TESTFORM_FORMAT_LABELS,
  fidelityLabels: FEATURE_FIDELITY_LABELS,
  actionKindLabels: EDITOR_ACTION_KIND_LABELS,
}

export * from './actions'
export * from './features'
export * from './types'
