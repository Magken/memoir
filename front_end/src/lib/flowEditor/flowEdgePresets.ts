import type { CSSProperties } from 'react'
import type { FlowEdgeStyleType } from './types'

export type FlowEdgeMarkerPreset = 'none' | 'arrow' | 'arrowclosed'

export const FLOW_EDGE_TYPE_OPTIONS: { id: FlowEdgeStyleType; label: string }[] = [
  { id: 'default', label: 'Bezier' },
  { id: 'straight', label: 'Straight' },
  { id: 'step', label: 'Step' },
  { id: 'smoothstep', label: 'Smooth step' },
  { id: 'simplebezier', label: 'Simple bezier' },
]

export const FLOW_EDGE_MARKER_OPTIONS: { id: FlowEdgeMarkerPreset; label: string; marker: string }[] = [
  { id: 'none', label: 'None', marker: 'none' },
  { id: 'arrow', label: 'Arrow', marker: 'arrow' },
  { id: 'arrowclosed', label: 'Arrow closed', marker: 'arrowclosed' },
]

/** Shared RF EdgeText chrome — compact pill on connectors. */
export const FLOW_EDGE_LABEL_CHROME = {
  labelShowBg: true,
  labelBgPadding: [4, 8] as [number, number],
  labelBgBorderRadius: 6,
  labelStyle: {
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: '0.02em',
    fill: 'var(--theme-text-muted)',
  } satisfies CSSProperties,
  labelBgStyle: {
    fill: 'var(--theme-surface-raised)',
    stroke: 'var(--theme-border)',
    strokeWidth: 1,
  } satisfies CSSProperties,
}

export function markerIdFromPreset(preset: FlowEdgeMarkerPreset): string | undefined {
  const option = FLOW_EDGE_MARKER_OPTIONS.find((o) => o.id === preset)
  if (!option || option.marker === 'none') return undefined
  return option.marker
}

export function presetFromMarker(marker?: string): FlowEdgeMarkerPreset {
  if (!marker) return 'none'
  if (marker === 'arrowclosed') return 'arrowclosed'
  if (marker === 'arrow') return 'arrow'
  return 'none'
}
