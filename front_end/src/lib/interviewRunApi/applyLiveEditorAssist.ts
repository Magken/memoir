/**
 * Copilot live-workbench apply — FE loadContext only.
 * Never patch Creator-2 / interview-brief-edit. Never persist the brief.
 */
import type { CodeEditorPayload, DocEditorPayload } from '../editorContext/types'
import { mergeAttemptResponses } from '../testForm/scoring'
import type { TestFormDocument, TestFormResponseValue, TestFormResponses } from '../testForm/types'
import { languageFromPath } from '../codeEditor/languageFromPath'
import { applyCopilotOps, type CopilotLiveDoc, type CopilotOp } from './copilotApply'
import { Capture } from './editorCapture/recorder'

export type LiveEditorApply =
  | { kind: 'form'; responses: Array<{ questionId: string; value: unknown }> }
  | { kind: 'coding'; files: Array<{ path: string; contents: string }> }
  | { kind: 'doc'; markdown?: string; title?: string }

export type LiveEditorApplyResult =
  | { ok: true; kind: LiveEditorApply['kind'] }
  | { ok: false; reason: string }

/** Peel sentence when Apply cannot mutate the live mount. */
export function copilotApplyMissReason(reason: string | undefined): string {
  switch (reason) {
    case 'no_handle':
      return 'The editor is not ready. Wait for the file to load and try Apply again.'
    case 'no_match':
      return 'That snippet no longer matches the file. Ask again for a fresh edit.'
    case 'stale_generation':
      return 'The file changed since this proposal. Ask again for a fresh edit.'
    case 'denied_path':
      return 'That path is not editable here.'
    case 'outside_src':
      return 'New files must live under src/. Ask again with a source-folder path.'
    case 'ambiguous_match':
      return 'That snippet matches more than once. Ask again with a tighter hunk.'
    case 'no_ops':
      return 'Nothing to apply.'
    case 'no_change':
      return 'That edit would not change the file. Ask again with a different change.'
    case 'apply_failed':
      return 'Could not apply that change. Ask again for a fresh edit.'
    case 'no_write':
      return 'This peel cannot write in the editor.'
    case 'stale_pending':
      return 'This Apply is no longer current. Use the latest proposal.'
    case 'inject_miss_peel':
      return 'This chat lost the earlier turns. Send the ask again so I can see the full thread.'
    default:
      return 'Could not apply that change. The file may have moved.'
  }
}

export function isDeniedCodingAssistPath(path: string): boolean {
  const p = path.trim()
  if (!p) return true
  if (/(^|\/)cases\.json$/i.test(p)) return true
  if (/reference/i.test(p) || /\/hidden/i.test(p)) return true
  return false
}

function coerceFormResponse(value: unknown): TestFormResponseValue | null {
  if (typeof value === 'string') return { kind: 'short_text', value }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { kind: 'ordinal', value }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const o = value as Record<string, unknown>
  if (o.kind === 'short_text' && typeof o.value === 'string') {
    return { kind: 'short_text', value: o.value }
  }
  if (o.kind === 'essay' && typeof o.value === 'string') {
    return { kind: 'essay', value: o.value }
  }
  if (o.kind === 'mcq_single') {
    return { kind: 'mcq_single', optionId: typeof o.optionId === 'string' ? o.optionId : null }
  }
  if (o.kind === 'mcq_multi' && Array.isArray(o.optionIds)) {
    return { kind: 'mcq_multi', optionIds: o.optionIds.map(String) }
  }
  if (o.kind === 'dropdown') {
    return { kind: 'dropdown', optionId: typeof o.optionId === 'string' ? o.optionId : null }
  }
  if (o.kind === 'fill_blank' && o.blanks && typeof o.blanks === 'object') {
    const blanks: Record<string, string> = {}
    for (const [k, v] of Object.entries(o.blanks as Record<string, unknown>)) {
      blanks[k] = String(v ?? '')
    }
    return { kind: 'fill_blank', blanks }
  }
  if (o.kind === 'ordinal') {
    const n = typeof o.value === 'number' ? o.value : null
    return { kind: 'ordinal', value: n }
  }
  if (o.kind === 'ordinal_grid' && o.values && typeof o.values === 'object') {
    const values: Record<string, string | null> = {}
    for (const [k, v] of Object.entries(o.values as Record<string, unknown>)) {
      values[k] = v == null ? null : String(v)
    }
    return { kind: 'ordinal_grid', values }
  }
  if (typeof o.text === 'string') return { kind: 'short_text', value: o.text }
  if (typeof o.optionId === 'string') return { kind: 'mcq_single', optionId: o.optionId }
  if (typeof o.single === 'string') return { kind: 'mcq_single', optionId: o.single }
  if (typeof o.option === 'string') return { kind: 'mcq_single', optionId: o.option }
  if (Array.isArray(o.optionIds)) return { kind: 'mcq_multi', optionIds: o.optionIds.map(String) }
  if (Array.isArray(o.multi)) return { kind: 'mcq_multi', optionIds: o.multi.map(String) }
  return null
}

export function parseLiveEditorApply(
  raw: unknown,
  expectedKind: 'form' | 'coding' | 'doc',
): LiveEditorApply | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const kind = String(o.kind ?? '')
  if (kind !== expectedKind) return null
  if (kind === 'form') {
    if (!Array.isArray(o.responses)) return null
    const responses: Array<{ questionId: string; value: unknown }> = []
    for (const row of o.responses.slice(0, 40)) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) continue
      const r = row as Record<string, unknown>
      const questionId = String(r.questionId ?? '').trim()
      if (!questionId) continue
      responses.push({ questionId, value: r.value })
    }
    if (!responses.length) return null
    return { kind: 'form', responses }
  }
  if (kind === 'coding') {
    if (!Array.isArray(o.files)) return null
    const files: Array<{ path: string; contents: string }> = []
    for (const row of o.files.slice(0, 8)) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) continue
      const r = row as Record<string, unknown>
      const path = String(r.path ?? '').trim()
      const contents = typeof r.contents === 'string' ? r.contents : typeof r.content === 'string' ? r.content : ''
      if (!path) continue
      files.push({ path, contents })
    }
    if (!files.length) return null
    return { kind: 'coding', files }
  }
  const markdown = typeof o.markdown === 'string' ? o.markdown : undefined
  const title = typeof o.title === 'string' ? o.title : undefined
  if (markdown == null && title == null) return null
  return { kind: 'doc', markdown, title }
}

export function mergeFormLiveAssist(
  doc: TestFormDocument,
  responses: Array<{ questionId: string; value: unknown }>,
): TestFormDocument {
  const known = new Set((doc.questions ?? []).map((q) => q.id))
  const next: TestFormResponses = { ...(doc.attempt?.responses ?? {}) }
  for (const row of responses) {
    if (!known.has(row.questionId)) continue
    const coerced = coerceFormResponse(row.value)
    if (!coerced) continue
    next[row.questionId] = coerced
  }
  return mergeAttemptResponses(doc, next)
}

export function mergeCodingLiveAssist(
  payload: CodeEditorPayload,
  files: Array<{ path: string; contents: string }>,
  opts?: { create?: boolean },
): { payload: CodeEditorPayload; applied: number; denied: string[] } {
  const denied: string[] = []
  const byPath = new Map((payload.files ?? []).map((f) => [f.path, { ...f }]))
  let applied = 0
  const created: CodeEditorPayload['files'] = []
  for (const file of files) {
    if (isDeniedCodingAssistPath(file.path)) {
      denied.push(file.path)
      continue
    }
    const prev = byPath.get(file.path)
    if (!prev) {
      if (!opts?.create) continue
      const nextFile = {
        path: file.path,
        content: file.contents,
        language: languageFromPath(file.path),
      }
      byPath.set(file.path, nextFile)
      created.push(nextFile)
      applied += 1
      continue
    }
    byPath.set(file.path, { ...prev, content: file.contents })
    applied += 1
  }
  const filesOut = [
    ...(payload.files ?? []).map((f) => byPath.get(f.path) ?? f),
    ...created.filter((f) => !(payload.files ?? []).some((p) => p.path === f.path)),
  ]
  const openIds = Array.isArray(payload.openIds) ? [...payload.openIds] : []
  for (const f of created) {
    const id = f.path
    if (!openIds.includes(id)) openIds.push(id)
  }
  return {
    payload: {
      ...payload,
      files: filesOut,
      openIds,
      activeId: created[created.length - 1]?.path ?? payload.activeId,
    },
    applied,
    denied,
  }
}

export function mergeDocLiveAssist(
  payload: DocEditorPayload,
  patch: { markdown?: string; title?: string },
): DocEditorPayload {
  return {
    ...payload,
    title: patch.title?.trim() || payload.title,
    markdown: patch.markdown != null ? patch.markdown : payload.markdown,
  }
}

export type LiveEditorApplyInput = {
  kind: 'form' | 'coding' | 'doc'
  apply: LiveEditorApply
  write: boolean
  getContext: () => unknown
  loadContext: (payload: unknown) => void | Promise<void>
}

function noteBotEdit(detail?: Record<string, unknown>): void {
  Capture.action('copilot_apply', detail)
}

/** Merge + loadContext. Refuses when write is off or kind mismatches. */
export async function applyLiveEditorAssist(
  input: LiveEditorApplyInput,
): Promise<LiveEditorApplyResult> {
  if (!input.write) return { ok: false, reason: 'no_write' }
  if (input.apply.kind !== input.kind) return { ok: false, reason: 'kind_mismatch' }

  const ctx = input.getContext()
  if (input.kind === 'form' && input.apply.kind === 'form') {
    const wrapped =
      ctx && typeof ctx === 'object' && 'document' in (ctx as object)
        ? (ctx as { document: TestFormDocument; mode?: string })
        : null
    const doc = wrapped?.document
    if (!doc) return { ok: false, reason: 'no_document' }
    const next = mergeFormLiveAssist(doc, input.apply.responses)
    noteBotEdit({ kind: 'form' })
    await input.loadContext({ document: next, mode: wrapped?.mode === 'take' ? 'take' : 'take' })
    return { ok: true, kind: 'form' }
  }

  if (input.kind === 'coding' && input.apply.kind === 'coding') {
    const payload = ctx as CodeEditorPayload
    if (!payload || !Array.isArray(payload.files)) return { ok: false, reason: 'no_workspace' }
    const merged = mergeCodingLiveAssist(payload, input.apply.files)
    if (merged.applied === 0) {
      return { ok: false, reason: merged.denied.length ? 'denied_path' : 'no_files' }
    }
    noteBotEdit({ kind: 'coding', files: merged.applied })
    await input.loadContext(merged.payload)
    return { ok: true, kind: 'coding' }
  }

  if (input.kind === 'doc' && input.apply.kind === 'doc') {
    const payload = (ctx && typeof ctx === 'object' ? ctx : {}) as DocEditorPayload
    const next = mergeDocLiveAssist(payload, input.apply)
    noteBotEdit({ kind: 'doc' })
    await input.loadContext(next)
    return { ok: true, kind: 'doc' }
  }

  return { ok: false, reason: 'unsupported' }
}

export type CopilotPendingApplyInput = {
  kind: 'form' | 'coding' | 'doc'
  ops: CopilotOp[]
  write: boolean
  expectedGeneration?: number
  generation?: number
  snapshotHash?: string
  getContext: () => unknown
  loadContext: (payload: unknown) => void | Promise<void>
}

function liveDocFromContext(
  kind: 'form' | 'coding' | 'doc',
  ctx: unknown,
  generation: number,
  snapshotHash: string,
): CopilotLiveDoc {
  if (kind === 'form') {
    const wrapped =
      ctx && typeof ctx === 'object' && 'document' in (ctx as object)
        ? (ctx as { document: TestFormDocument })
        : null
    return {
      kind: 'form',
      generation,
      snapshotHash,
      form: (wrapped?.document ?? ctx) as Record<string, unknown>,
    }
  }
  if (kind === 'coding') {
    return { kind: 'coding', generation, snapshotHash, coding: ctx as Record<string, unknown> }
  }
  return { kind: 'doc', generation, snapshotHash, doc: ctx as Record<string, unknown> }
}

/** Apply pending Copilot ops into the live mount. Never called from stream done. */
export async function applyCopilotPendingOps(
  input: CopilotPendingApplyInput,
): Promise<LiveEditorApplyResult> {
  if (!input.write) return { ok: false, reason: 'no_write' }
  if (!input.ops.length) return { ok: false, reason: 'no_ops' }
  const ctx = input.getContext()
  const generation = input.generation ?? 0
  const doc = liveDocFromContext(input.kind, ctx, generation, input.snapshotHash ?? '')
  const result = applyCopilotOps(doc, input.ops, { expectedGeneration: input.expectedGeneration })
  if (!result.ok) return { ok: false, reason: result.failed[0]?.code ?? 'apply_failed' }
  if (input.kind === 'form') {
    const wrapped =
      ctx && typeof ctx === 'object' && 'document' in (ctx as object)
        ? (ctx as { document: TestFormDocument; mode?: string })
        : null
    noteBotEdit({ kind: 'form' })
    await input.loadContext({
      document: result.doc.form as TestFormDocument,
      mode: wrapped?.mode === 'take' ? 'take' : 'take',
    })
    return { ok: true, kind: 'form' }
  }
  if (input.kind === 'coding') {
    const created = input.ops.some((o) => o.op === 'create_file')
    if (created) {
      const files = Array.isArray((result.doc.coding as { files?: Array<{ path: string; content?: string }> })?.files)
        ? ((result.doc.coding as { files: Array<{ path: string; content?: string }> }).files)
        : []
      const payload = ctx as CodeEditorPayload
      const merged = mergeCodingLiveAssist(
        payload,
        files.map((f) => ({ path: f.path, contents: String(f.content ?? '') })),
        { create: true },
      )
      noteBotEdit({ kind: 'coding', files: merged.applied })
      await input.loadContext(merged.payload)
      return { ok: true, kind: 'coding' }
    }
    noteBotEdit({ kind: 'coding', files: result.applied.length })
    await input.loadContext(result.doc.coding)
    return { ok: true, kind: 'coding' }
  }
  const payload = result.doc.doc as DocEditorPayload
  noteBotEdit({ kind: 'doc' })
  await input.loadContext({ ...payload, lexical: null })
  return { ok: true, kind: 'doc' }
}
