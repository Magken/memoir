import type { EditorKind, GridEditorPayload, ImportResult, MarkdownEditorPayload, MermaidEditorPayload } from '../types'
import type { EditorRuntimeHandle } from '../types'

export type RouteImportFn = (
  targetKind: EditorKind,
  input: unknown,
  sourceFormat: string,
  runtime: EditorRuntimeHandle,
) => Promise<ImportResult>

export async function routeCrossKindImport(
  targetKind: EditorKind,
  sourceKind: EditorKind,
  payload: unknown,
  _meta: Record<string, unknown> | undefined,
  runtime: EditorRuntimeHandle,
  routeImport: RouteImportFn,
): Promise<ImportResult> {
  if (targetKind === 'grid' && sourceKind === 'doc') {
    return { ok: false, warnings: ['Doc → grid conversion is not supported in this pass.'] }
  }
  if (targetKind === 'doc' && sourceKind === 'grid') {
    const sheet = payload as GridEditorPayload
    const csv = sheet.rows.map((row) => row.join(',')).join('\n')
    const header = sheet.columns.map((c) => c.title).join(',')
    return routeImport('doc', `${header}\n${csv}`, 'csv', runtime)
  }
  if (targetKind === 'draw' && sourceKind === 'mermaid') {
    const source = (payload as MermaidEditorPayload).source ?? String(payload)
    return routeImport('draw', source, 'mermaid', runtime)
  }
  if (targetKind === 'mermaid' && sourceKind === 'draw') {
    return routeImport('mermaid', payload, 'excalidraw', runtime)
  }
  if (targetKind === 'markdown' && sourceKind === 'mermaid') {
    const source = (payload as MermaidEditorPayload).source ?? ''
    return routeImport('markdown', source, 'mermaid', runtime)
  }
  if (targetKind === 'doc' && sourceKind === 'markdown') {
    const md = (payload as MarkdownEditorPayload).markdown ?? ''
    return routeImport('doc', md, 'markdown', runtime)
  }
  await runtime.loadContext(payload)
  return { ok: true, warnings: [`Loaded ${sourceKind} payload into ${targetKind} — verify fidelity.`] }
}
