import { SEED_FORCE_GRAPH } from '../../forceGraph/seedContent'
import { parseForceGraphSource } from '../../forceGraph/parseGraph'
import type { ForceGraphEditorPayload } from '../types'

export function convertJsonToForce(
  input: unknown,
): { payload: ForceGraphEditorPayload; warnings?: string[] } {
  if (typeof input === 'string') {
    const parsed = parseForceGraphSource(input)
    if (!parsed.ok) {
      return {
        payload: { source: SEED_FORCE_GRAPH.trim() },
        warnings: [`Invalid force graph JSON — loaded sample (${parsed.error}).`],
      }
    }
    return { payload: { source: JSON.stringify(parsed.spec, null, 2) } }
  }

  if (input && typeof input === 'object') {
    const record = input as Record<string, unknown>
    if (typeof record.source === 'string') {
      const parsed = parseForceGraphSource(record.source)
      if (!parsed.ok) {
        return {
          payload: { source: SEED_FORCE_GRAPH.trim() },
          warnings: [`Invalid force graph source — loaded sample (${parsed.error}).`],
        }
      }
      const payload: ForceGraphEditorPayload = { source: record.source }
      if (
        record.viewport &&
        typeof record.viewport === 'object' &&
        record.viewport !== null
      ) {
        payload.viewport = record.viewport as ForceGraphEditorPayload['viewport']
      }
      return { payload }
    }

    const asJson = JSON.stringify(input, null, 2)
    const parsed = parseForceGraphSource(asJson)
    if (parsed.ok) {
      return { payload: { source: asJson } }
    }
  }

  return {
    payload: { source: SEED_FORCE_GRAPH.trim() },
    warnings: ['Could not convert input to force graph — loaded sample.'],
  }
}

export function convertForceToForce(source: string): {
  payload: ForceGraphEditorPayload
  warnings?: string[]
} {
  const parsed = parseForceGraphSource(source)
  if (!parsed.ok) {
    return {
      payload: { source: source.trim() || SEED_FORCE_GRAPH.trim() },
      warnings: [parsed.error],
    }
  }
  return { payload: { source: source.trim() } }
}
