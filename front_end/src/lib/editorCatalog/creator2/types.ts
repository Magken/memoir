import type { EditorActionKind, EditorFeature, FeatureFidelity } from '../types'

export type Creator2FeatureCategory = 'chrome' | 'navigation' | 'io' | 'chat'

export type Creator2FormatId = 'native-json'

export type Creator2FeatureFidelity = FeatureFidelity

export type Creator2EditorFeature = EditorFeature<Creator2FeatureCategory, Creator2FormatId>

export type Creator2EditorActionKind = EditorActionKind
