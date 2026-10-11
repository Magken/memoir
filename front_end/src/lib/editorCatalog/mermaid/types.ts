import type { EditorActionKind, EditorFeature, FeatureFidelity } from '../types'

export type MermaidFeatureCategory = 'chrome' | 'interaction' | 'io'

export type MermaidFormatId = 'native-json' | 'mmd' | 'svg' | 'png'

export type MermaidFeatureFidelity = FeatureFidelity

export type MermaidEditorFeature = EditorFeature<MermaidFeatureCategory, MermaidFormatId>

export type MermaidEditorActionKind = EditorActionKind
