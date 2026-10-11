/** General node chrome + connector style menus (DrawCanvas-style presets). */

export type FlowNodeFillPreset = {
  id: string
  label: string
  /** CSS color or empty for theme default */
  value: string
}

export type FlowNodeBorderStyle = 'solid' | 'dashed' | 'dotted'

export const FLOW_NODE_FILL_OPTIONS: FlowNodeFillPreset[] = [
  { id: 'default', label: 'Default', value: '' },
  { id: 'surface', label: 'Surface', value: 'var(--theme-surface-raised)' },
  { id: 'accent', label: 'Accent wash', value: 'color-mix(in srgb, var(--theme-accent) 12%, var(--theme-surface-raised))' },
  { id: 'info', label: 'Info wash', value: 'color-mix(in srgb, var(--theme-info, var(--theme-accent)) 12%, var(--theme-surface-raised))' },
  { id: 'success', label: 'Success wash', value: 'color-mix(in srgb, var(--theme-success, #22c55e) 12%, var(--theme-surface-raised))' },
  { id: 'warning', label: 'Warning wash', value: 'color-mix(in srgb, var(--theme-warning, #f59e0b) 12%, var(--theme-surface-raised))' },
  { id: 'error', label: 'Error wash', value: 'color-mix(in srgb, var(--theme-error) 12%, var(--theme-surface-raised))' },
]

export const FLOW_NODE_BORDER_COLOR_OPTIONS: FlowNodeFillPreset[] = [
  { id: 'default', label: 'Default', value: '' },
  { id: 'strong', label: 'Strong', value: 'var(--theme-border-strong)' },
  { id: 'accent', label: 'Accent', value: 'var(--theme-accent)' },
  { id: 'success', label: 'Success', value: 'var(--theme-success, #22c55e)' },
  { id: 'warning', label: 'Warning', value: 'var(--theme-warning, #f59e0b)' },
  { id: 'error', label: 'Error', value: 'var(--theme-error)' },
]

export const FLOW_NODE_BORDER_STYLE_OPTIONS: { id: FlowNodeBorderStyle; label: string }[] = [
  { id: 'solid', label: 'Solid' },
  { id: 'dashed', label: 'Dashed' },
  { id: 'dotted', label: 'Dotted' },
]

export const FLOW_NODE_BORDER_WIDTH_OPTIONS: { id: string; label: string; value: number }[] = [
  { id: '2', label: 'Thin', value: 2 },
  { id: '3', label: 'Bold', value: 3 },
  { id: '4', label: 'Extra', value: 4 },
]

export const FLOW_EDGE_STROKE_OPTIONS: FlowNodeFillPreset[] = [
  { id: 'default', label: 'Default', value: '' },
  { id: 'muted', label: 'Muted', value: 'var(--theme-text-muted)' },
  { id: 'accent', label: 'Accent', value: 'var(--theme-accent)' },
  { id: 'success', label: 'Success', value: 'var(--theme-success, #22c55e)' },
  { id: 'warning', label: 'Warning', value: 'var(--theme-warning, #f59e0b)' },
  { id: 'error', label: 'Error', value: 'var(--theme-error)' },
]

export const FLOW_EDGE_STROKE_WIDTH_OPTIONS: { id: string; label: string; value: number }[] = [
  { id: '2', label: 'Thin', value: 2 },
  { id: '3', label: 'Bold', value: 3 },
  { id: '4', label: 'Extra', value: 4 },
]

/** Default connector stroke when unset (RF default 1 is too thin). */
export const FLOW_EDGE_DEFAULT_STROKE_WIDTH = 2.5
