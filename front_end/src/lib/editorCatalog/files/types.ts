import type { EditorActionKind, EditorFeature, FeatureFidelity } from '../types'

export type FilesFeatureCategory = 'chrome' | 'interaction' | 'io'

export type FilesFormatId = 'fixture'

export type FilesFeatureFidelity = FeatureFidelity

export type FilesEditorFeature = EditorFeature<FilesFeatureCategory, FilesFormatId>

export type FilesEditorActionKind = EditorActionKind
