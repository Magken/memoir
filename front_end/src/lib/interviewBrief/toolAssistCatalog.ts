/**
 * Per-editor Assist meaning — loaded from `toolAssistCatalog.json`.
 * Add a cap or editor row there; Form/Coding/Writing settings and Vurex prompts follow.
 */

import catalog from './toolAssistCatalog.json'
import type { ToolAssistCaps } from './toolAssistBundles'
import { resolveToolAssistCaps } from './toolAssistBundles'

export type ToolAssistCapId = keyof ToolAssistCaps
export type ToolAssistEditorKind = 'form' | 'coding' | 'doc'

export type ToolAssistCapDef = {
  id: ToolAssistCapId
  label: string
  does: string
}

export type ToolAssistEditorDef = {
  kind: ToolAssistEditorKind
  label: string
  workbench: string
  caps: Record<ToolAssistCapId, ToolAssistCapDef>
}

export const TOOL_ASSIST_CAP_ORDER: readonly ToolAssistCapId[] = [
  'chat',
  'spoilers',
  'write',
]

function inflateEditor(kind: ToolAssistEditorKind): ToolAssistEditorDef {
  const row = catalog.editors[kind]
  const caps = {} as Record<ToolAssistCapId, ToolAssistCapDef>
  for (const id of TOOL_ASSIST_CAP_ORDER) {
    caps[id] = {
      id,
      label: catalog.caps[id].label,
      does: row.caps[id].does,
    }
  }
  return {
    kind,
    label: row.label,
    workbench: row.workbench,
    caps,
  }
}

export const TOOL_ASSIST_EDITOR_CATALOG: Record<
  ToolAssistEditorKind,
  ToolAssistEditorDef
> = {
  form: inflateEditor('form'),
  coding: inflateEditor('coding'),
  doc: inflateEditor('doc'),
}

export function toolAssistEditorDef(
  kind: ToolAssistEditorKind,
): ToolAssistEditorDef {
  return TOOL_ASSIST_EDITOR_CATALOG[kind]
}

export function toolAssistCapRows(
  kind: ToolAssistEditorKind,
): readonly ToolAssistCapDef[] {
  const def = TOOL_ASSIST_EDITOR_CATALOG[kind]
  return TOOL_ASSIST_CAP_ORDER.map((id) => def.caps[id])
}

/** Chat off clears the other caps; write/spoilers imply chat via resolve. */
export function applyToolAssistCapChange(
  current: ToolAssistCaps,
  cap: ToolAssistCapId,
  checked: boolean,
): ToolAssistCaps {
  if (cap === 'chat' && !checked) {
    return { chat: false, spoilers: false, write: false }
  }
  return resolveToolAssistCaps({ ...current, [cap]: checked })
}
