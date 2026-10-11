import type { EditorActionKind, EditorFeature, FeatureFidelity } from '../types'

export type DmFeatureCategory = 'chrome' | 'interaction' | 'message' | 'group' | 'composer' | 'io'

export type DmFormatId = 'envelope-json' | 'native-json'

export type DmFeatureFidelity = FeatureFidelity

export type DmEditorFeature = EditorFeature<DmFeatureCategory, DmFormatId>

export type DmEditorActionKind = EditorActionKind
