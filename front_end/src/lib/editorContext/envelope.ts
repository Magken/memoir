import {
  EDITOR_CONTEXT_SCHEMA,
  type EditorContextEnvelope,
  type EditorKind,
  type EditorPayloadByKind,
} from './types'

export function isEditorContextEnvelope(value: unknown): value is EditorContextEnvelope {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (
    record.schema === EDITOR_CONTEXT_SCHEMA &&
    record.version === 1 &&
    typeof record.kind === 'string' &&
    'payload' in record
  )
}

export function createEnvelope<K extends EditorKind>(
  kind: K,
  payload: EditorPayloadByKind[K],
  opts: { title?: string; meta?: Record<string, unknown> } = {},
): EditorContextEnvelope {
  return {
    schema: EDITOR_CONTEXT_SCHEMA,
    version: 1,
    kind,
    title: opts.title,
    exportedAt: new Date().toISOString(),
    meta: opts.meta,
    payload,
  }
}

export function parseEnvelopeJson(text: string): EditorContextEnvelope | null {
  try {
    const parsed = JSON.parse(text) as unknown
    return isEditorContextEnvelope(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function envelopeToJson(envelope: EditorContextEnvelope): string {
  return JSON.stringify(envelope, null, 2)
}
