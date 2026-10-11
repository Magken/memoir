export type FlowFeatureCategory = 'chrome' | 'interaction' | 'io'

export type FlowFormatId = 'native-json' | 'png'

export type FlowFeatureFidelity = 'full' | 'partial' | 'fallback' | 'lossy' | 'na'

export type FlowEditorFeature = {
  id: string
  label: string
  category: FlowFeatureCategory
  usable: boolean
  notation?: string
  import: Record<FlowFormatId, FlowFeatureFidelity>
  export: Record<FlowFormatId, FlowFeatureFidelity>
  actions?: string[]
  notes?: string
}
