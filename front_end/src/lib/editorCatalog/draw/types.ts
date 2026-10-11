import type { EditorActionKind, EditorFeature, FeatureFidelity } from '../types'

export type DrawFeatureCategory = 'chrome' | 'interaction' | 'io'

export type DrawFormatId = 'native-json' | 'excalidraw' | 'png' | 'svg'

export type DrawFeatureFidelity = FeatureFidelity

export type DrawEditorFeature = EditorFeature<DrawFeatureCategory, DrawFormatId>

export type DrawEditorActionKind = EditorActionKind
