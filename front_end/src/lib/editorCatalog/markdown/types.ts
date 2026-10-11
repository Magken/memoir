import type { EditorActionKind, EditorFeature, FeatureFidelity } from '../types'

export type MarkdownFeatureCategory = 'chrome' | 'interaction' | 'io'

export type MarkdownFormatId = 'native-json' | 'md' | 'tex'

export type MarkdownFeatureFidelity = FeatureFidelity

export type MarkdownEditorFeature = EditorFeature<MarkdownFeatureCategory, MarkdownFormatId>

export type MarkdownEditorActionKind = EditorActionKind
