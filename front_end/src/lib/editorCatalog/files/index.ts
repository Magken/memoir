import type { EditorCatalog } from '../types'
import { EDITOR_ACTION_KIND_LABELS, FEATURE_FIDELITY_LABELS } from '../catalogFidelity'
import { FILES_EDITOR_ACTIONS } from './actions'
import {
  FILES_EDITOR_FEATURES,
  FILES_FEATURE_CATEGORY_LABELS,
  FILES_FORMAT_LABELS,
} from './features'
import type { FilesFeatureCategory, FilesFormatId } from './types'

export const FILES_CATALOG: EditorCatalog<FilesFeatureCategory, FilesFormatId> = {
  kind: 'files',
  features: FILES_EDITOR_FEATURES,
  actions: FILES_EDITOR_ACTIONS,
  categoryLabels: FILES_FEATURE_CATEGORY_LABELS,
  formatLabels: FILES_FORMAT_LABELS,
  fidelityLabels: FEATURE_FIDELITY_LABELS,
  actionKindLabels: EDITOR_ACTION_KIND_LABELS,
}

export * from './actions'
export * from './features'
export * from './types'
