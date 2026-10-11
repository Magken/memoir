import type { EditorFeature, FeatureFidelity } from '../types'

export type CopilotFeatureCategory = 'chrome' | 'navigation' | 'io' | 'chat'

export type CopilotFormatId = 'native-json'

export type CopilotFeatureFidelity = FeatureFidelity

export type CopilotEditorFeature = EditorFeature<CopilotFeatureCategory, CopilotFormatId>
