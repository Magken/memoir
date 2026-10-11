import type { EditorActionKind, EditorFeature, FeatureFidelity } from '../types'

export type TestFormFeatureCategory = 'chrome' | 'interaction' | 'question' | 'io'

export type TestFormFormatId = 'native-json'

export type TestFormFeatureFidelity = FeatureFidelity

export type TestFormEditorFeature = EditorFeature<TestFormFeatureCategory, TestFormFormatId>

export type TestFormEditorActionKind = EditorActionKind
