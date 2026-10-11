import { createEnvelope, isEditorContextEnvelope } from '../envelope'
import { MERMAID_FIXTURE } from '../fixtures'
import type { EditorKind, ImportResult } from '../types'
import type { EditorRuntimeHandle } from '../types'
import {
  convertCsvToDocPayload,
  convertJsonToDoc,
  convertMermaidToDocPayload,
  resolveDocMarkdownImport,
} from './doc'
import { convertDrawJsonToDraw, convertMermaidToDrawPayload } from './draw'
import { convertJsonToCode } from './code'
import { convertCsvToGrid, convertJsonToGrid } from './grid'
import { convertMarkdownToMarkdown, extractMermaidFromMarkdown } from './markdown'
import { convertDrawToMermaidPayload, convertMermaidToMermaid } from './mermaid'
import { convertJsonToFlow } from './flow'
import { convertJsonToForce } from './force'
import { convertJsonToTestForm } from './testForm'
import { routeCrossKindImport } from './crossKind'

export { routeCrossKindImport } from './crossKind'

export function buildEnvelopeForKind(kind: EditorKind, payload: unknown, title?: string) {
  return createEnvelope(kind, payload as never, { title })
}

async function getAdapterDeserialize(_kind: EditorKind, payload: unknown, runtime: EditorRuntimeHandle) {
  await runtime.loadContext(payload)
}

export async function routeImport(
  targetKind: EditorKind,
  input: unknown,
  sourceFormat: string,
  runtime: EditorRuntimeHandle,
): Promise<ImportResult> {
  const warnings: string[] = []

  if (sourceFormat === 'envelope-json') {
    const parsed =
      typeof input === 'string'
        ? (JSON.parse(input) as unknown)
        : isEditorContextEnvelope(input)
          ? input
          : null
    if (!parsed || !isEditorContextEnvelope(parsed)) {
      return { ok: false, warnings: ['Invalid editor context envelope.'] }
    }
    if (parsed.kind !== targetKind) {
      return routeCrossKindImport(targetKind, parsed.kind, parsed.payload, parsed.meta, runtime, routeImport)
    }
    await runtime.loadContext(parsed.payload)
    return { ok: true, warnings: parsed.meta?.lossy ? ['Envelope marked lossy in meta.'] : undefined }
  }

  const text = typeof input === 'string' ? input : null

  if (targetKind === 'grid') {
    if (sourceFormat === 'csv' && text) {
      const result = await convertCsvToGrid(text)
      warnings.push(...(result.warnings ?? []))
      await getAdapterDeserialize(targetKind, result.payload, runtime)
      return { ok: true, warnings: warnings.length ? warnings : undefined }
    }
    if (sourceFormat === 'native-json' || sourceFormat === 'json') {
      const parsed = text ? (JSON.parse(text) as unknown) : input
      const result = convertJsonToGrid(parsed)
      warnings.push(...(result.warnings ?? []))
      await getAdapterDeserialize(targetKind, result.payload, runtime)
      return { ok: true, warnings: warnings.length ? warnings : undefined }
    }
  }

  if (targetKind === 'doc') {
    if (sourceFormat === 'markdown' || sourceFormat === 'md') {
      const result = resolveDocMarkdownImport(input, text)
      warnings.push(...(result.warnings ?? []))
      await runtime.loadContext(result.payload)
      return { ok: true, warnings: warnings.length ? warnings : undefined }
    }
    if (sourceFormat === 'mermaid' || sourceFormat === 'mmd') {
      const result = convertMermaidToDocPayload(text ?? String(input))
      warnings.push(...(result.warnings ?? []))
      await runtime.loadContext(result.payload)
      return { ok: true, warnings: warnings.length ? warnings : undefined }
    }
    if (sourceFormat === 'csv') {
      const result = convertCsvToDocPayload(text ?? String(input))
      warnings.push(...(result.warnings ?? []))
      await runtime.loadContext(result.payload)
      return { ok: true, warnings: warnings.length ? warnings : undefined }
    }
    const parsed = text ? (JSON.parse(text) as unknown) : input
    const result = convertJsonToDoc(parsed)
    warnings.push(...(result.warnings ?? []))
    await runtime.loadContext(result.payload)
    return { ok: true, warnings: warnings.length ? warnings : undefined }
  }

  if (targetKind === 'draw') {
    if (sourceFormat === 'mermaid' || sourceFormat === 'mmd') {
      const result = convertMermaidToDrawPayload(text ?? String(input))
      warnings.push(...(result.warnings ?? []))
      await runtime.loadContext(result.payload)
      return { ok: true, warnings: warnings.length ? warnings : undefined }
    }
    const parsed = text ? (JSON.parse(text) as unknown) : input
    const result = convertDrawJsonToDraw(parsed)
    await runtime.loadContext(result.payload)
    return { ok: true, warnings: warnings.length ? warnings : undefined }
  }

  if (targetKind === 'markdown') {
    if (sourceFormat === 'mermaid' || sourceFormat === 'mmd') {
      const fenced = `\`\`\`mermaid\n${(text ?? String(input)).trim()}\n\`\`\`\n`
      const result = convertMarkdownToMarkdown(fenced)
      await runtime.loadContext(result.payload)
      return { ok: true }
    }
    const md = text ?? String(input)
    const result = convertMarkdownToMarkdown(md)
    await runtime.loadContext(result.payload)
    return { ok: true }
  }

  if (targetKind === 'mermaid') {
    if (sourceFormat === 'markdown' || sourceFormat === 'md') {
      const extracted = extractMermaidFromMarkdown(text ?? String(input))
      const result = convertMermaidToMermaid(extracted ?? MERMAID_FIXTURE)
      if (!extracted) warnings.push('No mermaid fence found — loaded sample diagram.')
      await runtime.loadContext(result.payload)
      return { ok: true, warnings: warnings.length ? warnings : undefined }
    }
    if (sourceFormat === 'excalidraw' || sourceFormat === 'draw') {
      const meta = isEditorContextEnvelope(input) ? input.meta : undefined
      const result = convertDrawToMermaidPayload(input, meta)
      warnings.push(...(result.warnings ?? []))
      await runtime.loadContext(result.payload)
      return { ok: true, warnings: warnings.length ? warnings : undefined }
    }
    const result = convertMermaidToMermaid(text ?? String(input))
    await runtime.loadContext(result.payload)
    return { ok: true }
  }

  if (targetKind === 'code') {
    if (sourceFormat === 'zip' && input instanceof Blob) {
      const { parseWorkspaceZip } = await import('../../codeEditor/importWorkspaceZip')
      const { serializeCodeWorkspace } = await import('../../codeEditor/workspaceSerialize')
      const workspace = await parseWorkspaceZip(input)
      await runtime.loadContext(serializeCodeWorkspace(workspace))
      return { ok: true, warnings: warnings.length ? warnings : undefined }
    }
    const parsed = text ? (JSON.parse(text) as unknown) : input
    const result = await convertJsonToCode(parsed)
    warnings.push(...(result.warnings ?? []))
    await runtime.loadContext(result.payload)
    return { ok: true, warnings: warnings.length ? warnings : undefined }
  }

  if (targetKind === 'flow') {
    const parsed = text ? (JSON.parse(text) as unknown) : input
    const result = convertJsonToFlow(parsed)
    warnings.push(...(result.warnings ?? []))
    await runtime.loadContext(result.payload)
    return { ok: true, warnings: warnings.length ? warnings : undefined }
  }

  if (targetKind === 'force') {
    const parsed = text ? (JSON.parse(text) as unknown) : input
    const result = convertJsonToForce(parsed)
    warnings.push(...(result.warnings ?? []))
    await runtime.loadContext(result.payload)
    return { ok: true, warnings: warnings.length ? warnings : undefined }
  }

  if (targetKind === 'testform') {
    const parsed = text ? (JSON.parse(text) as unknown) : input
    const result = convertJsonToTestForm(parsed)
    warnings.push(...(result.warnings ?? []))
    await runtime.loadContext(result.payload)
    return { ok: true, warnings: warnings.length ? warnings : undefined }
  }

  await runtime.loadContext(input)
  return { ok: true, warnings: warnings.length ? warnings : undefined }
}
