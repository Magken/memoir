import type { EditorActionKind, EditorFeature, FeatureFidelity } from '../types'

export type GridFeatureCategory = 'sheet' | 'chrome' | 'interaction' | 'io'

export type GridFormatId = 'native-json' | 'csv'

export type GridFeatureFidelity = FeatureFidelity

export type GridEditorFeature = EditorFeature<GridFeatureCategory, GridFormatId>

export type GridEditorActionKind = EditorActionKind
