import type { EditorActionKind, EditorFeature, FeatureFidelity } from '../types'

export type CodeFeatureCategory = 'chrome' | 'interaction' | 'io' | 'alt'

export type CodeFormatId = 'native-json' | 'zip'

export type CodeFeatureFidelity = FeatureFidelity

export type CodeEditorFeature = EditorFeature<CodeFeatureCategory, CodeFormatId>

export type CodeEditorActionKind = EditorActionKind
