import { MERMAID_FIXTURE } from '../fixtures'
import type { MermaidEditorPayload } from '../types'

export function convertMermaidToMermaid(source: string): { payload: MermaidEditorPayload; warnings?: string[] } {
  return { payload: { source: source.trim() } }
}

export function convertDrawToMermaidPayload(
  _input: unknown,
  meta?: Record<string, unknown>,
): { payload: MermaidEditorPayload; warnings?: string[] } {
  const preserved = typeof meta?.mermaidSource === 'string' ? meta.mermaidSource : null
  if (preserved) {
    return { payload: { source: preserved } }
  }
  return {
    payload: { source: `%% Draw JSON has no official mermaid reverse converter\n%% ${MERMAID_FIXTURE.trim()}` },
    warnings: ['Draw → Mermaid is lossy — showing preserved source or sample diagram.'],
  }
}
