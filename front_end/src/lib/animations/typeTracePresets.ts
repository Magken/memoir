/** SVG stroke trace presets — ref.text-trace-1 · [text-trace.css](../../css/effects/text-trace.css) */

export const TYPE_TRACE_PRESETS = ['trace-in', 'trace-out'] as const

export type TypeTracePreset = (typeof TYPE_TRACE_PRESETS)[number]

export type TypeTraceTrigger = 'hover' | 'enter'

export const TYPE_TRACE_PRESET_OPTIONS = [
  { value: 'trace-in', label: 'trace-in — stroke draw' },
  { value: 'trace-out', label: 'trace-out — stroke undraw' },
] as const
