import { getAdapter } from './registry'
import { createEnvelope, envelopeToJson } from './envelope'
import { downloadBlob, downloadJson, downloadText } from './download'
import { loadFixture } from './fixtures'
import { routeImport } from './converters'
import { sheetToCsv } from '../dataGridEditor/csv'
import { buildWorkspaceZipBlob } from '../codeEditor/exportWorkspaceZip'
import { deserializeCodeWorkspace } from '../codeEditor/workspaceSerialize'
import type {
  CodeEditorPayload,
  DocEditorPayload,
  EditorKind,
  EditorPayloadByKind,
  EditorRuntimeHandle,
  FormatId,
  ImportResult,
  MarkdownEditorPayload,
  MermaidEditorPayload,
  ForceGraphEditorPayload,
} from './types'

export type { EditorKind, EditorRuntimeHandle, FormatId, ImportResult, DemoScenario } from './types'
export { loadFixture } from './fixtures'
export { createEnvelope, isEditorContextEnvelope, parseEnvelopeJson } from './envelope'
export { downloadBlob, downloadText, downloadJson } from './download'
export { exportFormatsForKind } from './registry'

function slugify(title: string | undefined, fallback: string) {
  const base = title?.trim().replace(/\s+/g, '-').toLowerCase()
  return base || fallback
}

export function exportContext(
  kind: EditorKind,
  runtime: EditorRuntimeHandle,
  format: FormatId,
  title?: string,
): string | Blob {
  const adapter = getAdapter(kind)
  const payload = adapter.serialize(runtime)
  if (format === 'envelope-json') {
    return envelopeToJson(
      createEnvelope(kind, payload as EditorPayloadByKind[EditorKind], { title }),
    )
  }

  if (format === 'native-json') {
    if (kind === 'force') {
      return (payload as ForceGraphEditorPayload).source
    }
    return JSON.stringify(payload, null, 2)
  }

  if (kind === 'grid' && format === 'csv') {
    return sheetToCsv(payload as import('../dataGridEditor/sheetModel').DataGridSheet)
  }

  if (kind === 'markdown') {
    const md = payload as MarkdownEditorPayload
    if (format === 'markdown' || format === 'md') return md.markdown
    if (format === 'tex') return md.latex ?? ''
  }

  if (kind === 'mermaid') {
    const mmd = payload as MermaidEditorPayload
    if (format === 'mermaid' || format === 'mmd') return mmd.source
  }

  if (kind === 'draw' && format === 'excalidraw') {
    const draw = payload as { scene: unknown }
    return JSON.stringify(draw.scene ?? draw, null, 2)
  }

  if (kind === 'doc' && format === 'markdown') {
    const doc = payload as DocEditorPayload & { markdown?: string }
    if (doc.markdown) return doc.markdown
    return '# Document\n\nExport markdown from the live editor via the doc bridge.\n'
  }

  if (kind === 'code' && format === 'zip') {
    const workspace = deserializeCodeWorkspace(payload as CodeEditorPayload)
    return buildWorkspaceZipBlob(workspace)
  }

  return JSON.stringify(payload, null, 2)
}

export function downloadExportedContext(
  kind: EditorKind,
  runtime: EditorRuntimeHandle,
  format: FormatId,
  title?: string,
) {
  const content = exportContext(kind, runtime, format, title)
  const safeTitle = slugify(title, kind)

  if (content instanceof Blob) {
    downloadBlob(content, `${safeTitle}.zip`)
    return
  }

  if (format === 'envelope-json' || format === 'native-json') {
    downloadJson(`${safeTitle}.${format === 'envelope-json' ? 'editor-context' : 'json'}`, JSON.parse(content as string))
    return
  }
  if (format === 'csv') {
    downloadText(`${safeTitle}.csv`, content as string)
    return
  }
  if (format === 'markdown' || format === 'md') {
    downloadText(`${safeTitle}.md`, content as string)
    return
  }
  if (format === 'tex') {
    downloadText(`${safeTitle}.tex`, content as string)
    return
  }
  if (format === 'mermaid' || format === 'mmd') {
    downloadText(`${safeTitle}.mmd`, content as string)
    return
  }
  if (format === 'excalidraw') {
    downloadText(`${safeTitle}.excalidraw`, content as string, 'application/json')
    return
  }

  downloadText(`${safeTitle}.txt`, String(content))
}

export async function importContext(
  kind: EditorKind,
  input: unknown,
  sourceFormat: FormatId,
  runtime: EditorRuntimeHandle,
): Promise<ImportResult> {
  try {
    return await routeImport(kind, input, sourceFormat, runtime)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed'
    return { ok: false, warnings: [message] }
  }
}

export async function importFixture(
  targetKind: EditorKind,
  fixtureId: string,
  sourceFormat: FormatId,
  runtime: EditorRuntimeHandle,
): Promise<ImportResult> {
  const fixture = loadFixture(fixtureId)
  return importContext(targetKind, fixture, sourceFormat, runtime)
}

export function detectFormatFromFixtureId(fixtureId: string): FormatId {
  if (fixtureId.endsWith('.csv')) return 'csv'
  if (fixtureId.endsWith('.mermaid') || fixtureId.includes('mermaid')) return 'mermaid'
  if (fixtureId.includes('force')) return 'native-json'
  if (fixtureId.endsWith('.markdown') || fixtureId.endsWith('.md')) return 'markdown'
  if (fixtureId.endsWith('.excalidraw') || fixtureId.endsWith('.draw')) return 'excalidraw'
  if (fixtureId.endsWith('.lexical') || fixtureId.endsWith('.sheet')) return 'native-json'
  return 'native-json'
}
