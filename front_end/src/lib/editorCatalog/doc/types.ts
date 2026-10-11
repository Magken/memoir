import type { EditorActionKind, EditorFeature, FeatureFidelity } from '../types'

export type DocFeatureCategory =
  | 'block'
  | 'inline'
  | 'embed'
  | 'layout'
  | 'chrome'
  | 'interaction'
  | 'io'

export type DocFormatId = 'native-json' | 'markdown' | 'csv' | 'mermaid' | 'html' | 'pdf'

export type DocFeatureFidelity = FeatureFidelity

export type DocEditorFeature = EditorFeature<DocFeatureCategory, DocFormatId>

export type DocEditorActionKind = EditorActionKind
