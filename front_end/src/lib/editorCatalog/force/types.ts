import type { EditorActionKind, EditorFeature, FeatureFidelity } from '../types'

export type ForceFeatureCategory = 'chrome' | 'interaction' | 'io'

export type ForceFormatId = 'native-json' | 'svg' | 'png'

export type ForceFeatureFidelity = FeatureFidelity

export type ForceEditorFeature = EditorFeature<ForceFeatureCategory, ForceFormatId>

export type ForceEditorActionKind = EditorActionKind
