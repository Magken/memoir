import { actionById, getEditorCatalog, type EditorCatalogKind } from '../editorCatalog/manifest'
import type { EditorActionRequest, EditorActionResult, EditorRuntimeHandle } from './types'

/** Editor kinds that carry a registered catalog (see editorCatalog/manifest). */
const KNOWN_CATALOG_KINDS: ReadonlySet<EditorCatalogKind> = new Set([
  'doc',
  'code',
  'grid',
  'markdown',
  'draw',
  'mermaid',
  'flow',
  'force',
  'files',
  'bot',
  'dm',
  'calendar',
  'testform',
  'creator2',
])

function isCatalogKind(kind: string): kind is EditorCatalogKind {
  return KNOWN_CATALOG_KINDS.has(kind as EditorCatalogKind)
}

/**
 * Validates an action request against the matching editor catalog, then
 * forwards it to the runtime's `invokeAction` handle. Rejects unknown kinds,
 * unknown action ids, and actions not marked `implemented: true`.
 */
export async function dispatchEditorAction(
  runtime: EditorRuntimeHandle,
  request: EditorActionRequest,
): Promise<EditorActionResult> {
  const kind = request.kind
  if (typeof kind !== 'string' || !isCatalogKind(kind)) {
    return { ok: false, actionId: request.actionId, error: `Unknown editor kind: ${String(kind)}` }
  }

  const action = actionById(kind, request.actionId)
  if (!action) {
    return { ok: false, actionId: request.actionId, error: `Unknown action id: ${request.actionId}` }
  }
  if (!action.implemented) {
    return { ok: false, actionId: request.actionId, error: `Action not implemented: ${request.actionId}` }
  }
  if (!runtime.invokeAction) {
    return { ok: false, actionId: request.actionId, error: 'Runtime does not support invokeAction' }
  }

  try {
    return await runtime.invokeAction(request)
  } catch (error) {
    return {
      ok: false,
      actionId: request.actionId,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/** Implemented action ids for a catalog kind — used to build MCT allowlists. */
export function listImplementedActionIds(kind: EditorCatalogKind): string[] {
  return getEditorCatalog(kind)
    .actions.filter((action) => action.implemented)
    .map((action) => action.id)
}
