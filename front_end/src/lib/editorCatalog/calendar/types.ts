import type { EditorActionKind, EditorFeature, FeatureFidelity } from '../types'

export type CalendarFeatureCategory =
  | 'chrome'
  | 'interaction'
  | 'view'
  | 'event'
  | 'task'
  | 'io'

export type CalendarFormatId = 'envelope-json' | 'native-json' | 'ics'

export type CalendarFeatureFidelity = FeatureFidelity

export type CalendarEditorFeature = EditorFeature<CalendarFeatureCategory, CalendarFormatId>

export type CalendarEditorActionKind = EditorActionKind
