import type { EditorCatalog } from '../types'
import { EDITOR_ACTION_KIND_LABELS, FEATURE_FIDELITY_LABELS } from '../catalogFidelity'
import { CALENDAR_EDITOR_ACTIONS } from './actions'
import {
  CALENDAR_EDITOR_FEATURES,
  CALENDAR_FEATURE_CATEGORY_LABELS,
  CALENDAR_FORMAT_LABELS,
} from './features'
import type { CalendarFeatureCategory, CalendarFormatId } from './types'

export const CALENDAR_CATALOG: EditorCatalog<CalendarFeatureCategory, CalendarFormatId> = {
  kind: 'calendar',
  features: CALENDAR_EDITOR_FEATURES,
  actions: CALENDAR_EDITOR_ACTIONS,
  categoryLabels: CALENDAR_FEATURE_CATEGORY_LABELS,
  formatLabels: CALENDAR_FORMAT_LABELS,
  fidelityLabels: FEATURE_FIDELITY_LABELS,
  actionKindLabels: EDITOR_ACTION_KIND_LABELS,
}

export * from './actions'
export * from './features'
export * from './types'
