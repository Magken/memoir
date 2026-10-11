import { isEditorContextEnvelope } from '../envelope'
import { DRAW_SCENE_FIXTURE } from '../fixtures'
import type { DrawEditorPayload } from '../types'

export function convertDrawJsonToDraw(input: unknown): { payload: DrawEditorPayload; warnings?: string[] } {
  if (isEditorContextEnvelope(input) && input.kind === 'draw') {
    return { payload: input.payload as DrawEditorPayload }
  }
  const scene = input && typeof input === 'object' && 'scene' in input ? (input as DrawEditorPayload).scene : input
  return { payload: { scene: scene ?? DRAW_SCENE_FIXTURE } }
}

export function convertMermaidToDrawPayload(
  source: string,
  meta?: Record<string, unknown>,
): { payload: DrawEditorPayload & { mermaid?: string; meta?: Record<string, unknown> }; warnings?: string[] } {
  return {
    payload: { scene: null, mermaid: source, meta: { ...meta, mermaidSource: source } },
    warnings: ['Non-flowchart Mermaid diagrams may import as embedded images.'],
  }
}
