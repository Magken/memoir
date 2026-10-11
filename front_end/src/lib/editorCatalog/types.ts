/**
 * Shared editor catalog types — features, actions, fidelity (MCPF/MCPA metadata).
 */

export type FeatureFidelity = 'full' | 'partial' | 'fallback' | 'native' | 'na' | 'lossy'

export type EditorActionKind = 'prop' | 'ui' | 'command' | 'runtime'

export type EditorFeature<
  TCategory extends string = string,
  TFormat extends string = string,
> = {
  /** Stable notation id, e.g. `doc.block.paragraph`. */
  id: string
  label: string
  category: TCategory
  /** Implemented and exposed in the live editor UI. */
  usable: boolean
  /** Example notation snippet for bots / converters. */
  notation?: string
  /** Planned doc-dom-ir node kind. */
  irNode?: string
  import: Record<TFormat, FeatureFidelity>
  export: Record<TFormat, FeatureFidelity>
  /** MCT action ids that control this feature. */
  actions?: string[]
  notes?: string
}

export type EditorAction = {
  /** Stable action id, e.g. `doc.action.prop.show-diagram-view-options`. */
  id: string
  label: string
  kind: EditorActionKind
  /** Primary code target (component, prop, plugin, or command). */
  target: string
  /** MCT / bot invocation notation. */
  notation: string
  defaultValue?: string | boolean | number
  /** Related feature notation ids. */
  relatedFeatures?: string[]
  notes?: string
  /** Whether the UI/runtime already implements this action (false = MCP stub only). */
  implemented?: boolean
}

export type EditorCatalog<
  TCategory extends string = string,
  TFormat extends string = string,
> = {
  kind: string
  features: EditorFeature<TCategory, TFormat>[]
  actions: EditorAction[]
  categoryLabels: Record<TCategory, string>
  formatLabels: Record<TFormat, string>
  fidelityLabels: Record<FeatureFidelity, string>
  actionKindLabels: Record<EditorActionKind, string>
}
