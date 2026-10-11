import type { EditorActionKind, EditorFeature, FeatureFidelity } from '../types'

export type BotFeatureCategory = 'chrome' | 'interaction' | 'message' | 'composer' | 'io'

export type BotFormatId = 'envelope-json' | 'native-json'

export type BotFeatureFidelity = FeatureFidelity

export type BotEditorFeature = EditorFeature<BotFeatureCategory, BotFormatId>

export type BotEditorActionKind = EditorActionKind
