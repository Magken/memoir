/**
 * Deterministic Copilot apply engine — fail closed.
 * Shared contract for Edge dry-run and FE Apply click.
 */
const DENIED_CODING_PATH_RE = /(^|\/)cases\.json$|reference|\/hidden/i

export type CopilotKind = 'form' | 'coding' | 'doc'

export type CopilotOp =
  | {
      op: 'search_replace'
      path?: string
      old: string
      new: string
      replaceAll?: boolean
    }
  | { op: 'line_hunk'; path?: string; start: number; end: number; text: string }
  | { op: 'create_file'; path: string; contents: string }
  | { op: 'create_folder'; path: string }
  | { op: 'delete_file'; path: string }
  | { op: 'set_response'; questionId: string; value: unknown }
  | { op: 'clear_response'; questionId: string }
  | { op: 'replace_all'; path?: string; text: string }

export type CopilotSelection = {
  path?: string
  questionId?: string
  startLine?: number
  endLine?: number
  text?: string
}

export type CopilotDiagnostic = { path: string; line: number; message: string }

export type CopilotLiveDoc = {
  kind: CopilotKind
  generation: number
  snapshotHash: string
  form?: Record<string, unknown>
  coding?: Record<string, unknown>
  doc?: Record<string, unknown>
  selection?: CopilotSelection
  diagnostics?: CopilotDiagnostic[]
}

export type CopilotApplyFailure = {
  op: CopilotOp
  code: string
  detail: string
}

export type CopilotApplyResult = {
  ok: boolean
  doc: CopilotLiveDoc
  applied: CopilotOp[]
  failed: CopilotApplyFailure[]
}

export function isDeniedCodingPath(path: string): boolean {
  const p = String(path ?? '').trim()
  if (!p) return true
  if (DENIED_CODING_PATH_RE.test(p)) return true
  // Authored challenge README is readable in converse, never a write target.
  return /(^|\/)README\.md$/i.test(p)
}

/** Bare `foo.py` / `helpers` → `src/…`. Existing `src/` paths stay. */
export function normalizeCodingCreatePath(path: string): string {
  const p = String(path ?? '').trim().replace(/\\/g, '/').replace(/^\.\//, '')
  if (!p) return p
  if (p === 'src' || p.startsWith('src/')) return p
  if (!p.includes('/')) return `src/${p}`
  return p
}

/** Empty or comment-only placeholder — search_replace has nothing to quote. */
export function isCodingStubBody(text: string): boolean {
  const t = String(text ?? '')
  if (!t.trim()) return true
  if (t.length > 400) return false
  return !/\b(def |class |function |export |from |import )/m.test(t)
}

/** Heading-only or a few words of body — the essay is one canvas. */
export function essayMarkdownBody(markdown: string): string {
  return String(markdown ?? '')
    .replace(/^#{1,3}\s+[^\n]*\n*/gm, '')
    .trim()
}

export function isUniqueEssayCanvas(markdown: string): boolean {
  const body = essayMarkdownBody(markdown)
  if (!body) return true
  return body.length < 160
}

export function isEssayStubBody(text: string): boolean {
  return isUniqueEssayCanvas(text)
}

export function parseEssayInsertMode(
  peel: string,
): 'after' | 'before' | 'append' | 'replace' | 'add' | 'delete' | null {
  const t = String(peel ?? '').toLowerCase()
  if (/\bdelete_(?:span|section)\b/.test(t)) return 'delete'
  if (
    /\b(remove|delete|take out|cut out|get rid of|drop the)\b/.test(t) &&
    !/\b(add|insert|write|put|include)\b/.test(t)
  ) {
    return 'delete'
  }
  if (/\b(after|below|under|following)\b/.test(t)) return 'after'
  if (/\b(before|above|preceding)\b/.test(t)) return 'before'
  if (/\b(at the end|end of|append|at the bottom)\b/.test(t)) return 'append'
  if (
    /\b(fix|correct|typo|spelling|proofread|replace)\b/.test(t) &&
    !/\b(add|insert|write|put|include)\b/.test(t)
  ) {
    return 'replace'
  }
  if (/\b(add|insert|write|put|include|citation|bibliograph|outline|template)\b/.test(t)) return 'add'
  return null
}

function isLikelyEssayCorrection(old: string, neu: string): boolean {
  const a = old.trim()
  const b = neu.trim()
  if (!a || !b || b.includes(a)) return false
  if (a.length > 80) return false
  return b.length / Math.max(a.length, 1) < 1.6 && Math.abs(b.length - a.length) <= 12
}

function lastPeelLine(peel: string): string {
  const parts = String(peel ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  return parts[parts.length - 1] ?? String(peel ?? '')
}

/** Keep existing quotes on add/after/before. Proofread may replace a short typo. */
export function rewriteEssayInsertOps(
  ops: CopilotOp[],
  peelAsk: string,
  liveMarkdown: string,
): CopilotOp[] {
  const current = lastPeelLine(peelAsk)
  const mode = parseEssayInsertMode(current)
  void liveMarkdown
  return ops
    .filter((op) => {
      if (op.op !== 'search_replace') return true
      return String(op.old ?? '').trim() !== String(op.new ?? '').trim()
    })
    .map((op) => {
    if (op.op !== 'search_replace') return op
    const old = String(op.old ?? '')
    const neu = String(op.new ?? '')
    if (!neu.trim()) return op
    if (mode === 'delete') return op
    if (old && neu.includes(old)) return op
    if (mode === 'replace') return op
    if ((mode === 'add' || !mode) && isLikelyEssayCorrection(old, neu)) return op
    const stem = old.trim().slice(0, Math.min(48, old.trim().length))
    if (stem.length >= 12 && neu.includes(stem)) return op
    if (mode === 'before' && old) return { ...op, new: `${neu.trim()}\n\n${old}` }
    if ((mode === 'after' || mode === 'add' || mode === 'append') && old) {
      const sep = old.endsWith('\n') ? '\n' : '\n\n'
      return { ...op, new: `${old}${sep}${neu.trim()}\n` }
    }
    if (/\b(add|insert|write|put)\b/i.test(current) && old && !isLikelyEssayCorrection(old, neu)) {
      const sep = old.endsWith('\n') ? '\n' : '\n\n'
      return { ...op, new: `${old}${sep}${neu.trim()}\n` }
    }
    return op
  })
}

export function isWritableCodingCreatePath(path: string): boolean {
  const p = normalizeCodingCreatePath(path)
  if (!p || p.includes('..')) return false
  if (isDeniedCodingPath(p)) return false
  if (p === 'src') return true
  return p.startsWith('src/')
}

/** Stamp create_file / create_folder onto src/ before Diff/Apply so the tab path matches the write. */
export function rewriteCopilotOpPaths(ops: CopilotOp[]): CopilotOp[] {
  return ops.map((op) => {
    if (op.op === 'create_file' || op.op === 'create_folder') {
      return { ...op, path: normalizeCodingCreatePath(op.path) }
    }
    return op
  })
}

export function coerceFormValue(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'string') return { kind: 'short_text', value }
  if (typeof value === 'number' && Number.isFinite(value)) return { kind: 'ordinal', value }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const o = value as Record<string, unknown>
  if (o.kind === 'mcq_single' || typeof o.optionId === 'string' || typeof o.single === 'string') {
    const optionId = String(o.optionId ?? o.single ?? o.option ?? '')
    return { kind: 'mcq_single', optionId: optionId || null }
  }
  if (o.kind === 'mcq_multi' || Array.isArray(o.optionIds) || Array.isArray(o.multi)) {
    const ids = (Array.isArray(o.optionIds) ? o.optionIds : o.multi) as unknown[]
    return { kind: 'mcq_multi', optionIds: ids.map(String) }
  }
  if (o.kind === 'short_text' && typeof o.value === 'string') return { kind: 'short_text', value: o.value }
  if (o.kind === 'essay' && typeof o.value === 'string') return { kind: 'essay', value: o.value }
  if (o.kind === 'dropdown') {
    return { kind: 'dropdown', optionId: typeof o.optionId === 'string' ? o.optionId : null }
  }
  if (typeof o.text === 'string') return { kind: 'short_text', value: o.text }
  if (typeof o.value === 'string' && o.value.trim()) return { kind: 'short_text', value: o.value }
  return null
}

function codingFiles(doc: CopilotLiveDoc): Array<{ path: string; content: string; language?: string }> {
  const files = (doc.coding as { files?: Array<{ path: string; content?: string; contents?: string; language?: string }> } | undefined)
    ?.files
  if (!Array.isArray(files)) return []
  return files.map((f) => ({
    path: String(f.path ?? ''),
    content: typeof f.content === 'string' ? f.content : String(f.contents ?? ''),
    language: f.language,
  }))
}

function codingLanguageFromPath(path: string): string {
  const ext = path.replace(/\\/g, '/').split('/').pop()?.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'py') return 'python'
  if (ext === 'ts' || ext === 'tsx') return 'typescript'
  if (ext === 'js' || ext === 'jsx' || ext === 'mjs' || ext === 'cjs') return 'javascript'
  if (ext === 'json') return 'json'
  if (ext === 'md' || ext === 'markdown') return 'markdown'
  if (ext === 'css') return 'css'
  if (ext === 'html' || ext === 'htm') return 'html'
  return 'plaintext'
}

function setCodingFile(
  doc: CopilotLiveDoc,
  path: string,
  content: string,
  extra?: { language?: string; create?: boolean },
): CopilotLiveDoc {
  const payload = { ...(doc.coding ?? {}) } as Record<string, unknown>
  const files = codingFiles(doc)
  const idx = files.findIndex((f) => f.path === path)
  if (idx >= 0) {
    files[idx] = { ...files[idx]!, content }
  } else if (extra?.create) {
    files.push({ path, content, language: extra.language ?? codingLanguageFromPath(path) })
  } else {
    return doc
  }
  payload.files = files
  return { ...doc, coding: payload }
}

function removeCodingFile(doc: CopilotLiveDoc, path: string): CopilotLiveDoc {
  const payload = { ...(doc.coding ?? {}) } as Record<string, unknown>
  const files = codingFiles(doc).filter((f) => f.path !== path)
  payload.files = files
  const openIds = Array.isArray(payload.openIds)
    ? (payload.openIds as string[]).filter((id) => id !== path)
    : []
  payload.openIds = openIds
  if (payload.activeId === path) payload.activeId = files[0]?.path ?? null
  return { ...doc, coding: payload }
}

function docMarkdown(doc: CopilotLiveDoc): string {
  return String((doc.doc as { markdown?: string } | undefined)?.markdown ?? '')
}

function setDocMarkdown(doc: CopilotLiveDoc, markdown: string): CopilotLiveDoc {
  return { ...doc, doc: { ...(doc.doc ?? {}), markdown } }
}

function formQuestions(doc: CopilotLiveDoc): Array<{ id: string }> {
  const qs = (doc.form as { questions?: Array<{ id: string }> } | undefined)?.questions
  return Array.isArray(qs) ? qs : []
}

function formResponses(doc: CopilotLiveDoc): Record<string, unknown> {
  const attempt = (doc.form as { attempt?: { responses?: Record<string, unknown> } } | undefined)?.attempt
  return { ...(attempt?.responses ?? {}) }
}

function setFormResponses(doc: CopilotLiveDoc, responses: Record<string, unknown>): CopilotLiveDoc {
  const form = { ...(doc.form ?? {}) } as Record<string, unknown>
  const attempt = { ...((form.attempt as Record<string, unknown>) ?? {}), responses }
  form.attempt = attempt
  return { ...doc, form }
}

function countMatches(hay: string, needle: string): number {
  if (!needle) return 0
  let n = 0
  let from = 0
  while (from <= hay.length) {
    const i = hay.indexOf(needle, from)
    if (i < 0) break
    n += 1
    from = i + needle.length
  }
  return n
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function isMidTokenPrefix(text: string, needle: string, index: number): boolean {
  if (index < 0 || !needle) return false
  const next = text[index + needle.length] ?? ''
  return /[A-Za-z0-9]/.test(needle.slice(-1)) && /[A-Za-z0-9]/.test(next)
}

function replaceNeedle(
  text: string,
  old: string,
  neu: string,
  replaceAll?: boolean,
): { text: string; code?: string } | null {
  const hits = countMatches(text, old)
  if (hits === 0) return null
  if (!replaceAll && hits !== 1) return { text, code: 'ambiguous_match' }
  const index = text.indexOf(old)
  if (!replaceAll && isMidTokenPrefix(text, old, index)) return { text, code: 'no_match' }
  if (replaceAll) return { text: text.split(old).join(neu) }
  return { text: text.replace(old, neu) }
}

function applySearchReplace(text: string, op: Extract<CopilotOp, { op: 'search_replace' }>): { text: string; code?: string } {
  const exact = replaceNeedle(text, op.old, op.new, op.replaceAll)
  if (exact) return exact
  const trimmed = op.old.trim()
  if (trimmed && trimmed !== op.old) {
    const second = replaceNeedle(text, trimmed, op.new, op.replaceAll)
    if (second) return second
  }
  const needle = trimmed || op.old
  if (!needle) return { text, code: 'no_match' }
  try {
    const wsPattern = escapeRegExp(needle).replace(/\s+/g, '\\s+')
    const global = new RegExp(wsPattern, 'g')
    const matches = text.match(global)
    if (!matches || matches.length === 0) return { text, code: 'no_match' }
    if (!op.replaceAll && matches.length !== 1) return { text, code: 'ambiguous_match' }
    const found = matches[0]!
    const index = text.search(new RegExp(wsPattern))
    if (!op.replaceAll && isMidTokenPrefix(text, found, index)) return { text, code: 'no_match' }
    return { text: text.replace(op.replaceAll ? global : new RegExp(wsPattern), op.new) }
  } catch {
    return { text, code: 'no_match' }
  }
}

function applyLineHunk(text: string, op: Extract<CopilotOp, { op: 'line_hunk' }>): { text: string; code?: string } {
  const lines = text.split('\n')
  let start = Math.max(1, Math.floor(op.start))
  let end = Math.max(start - 1, Math.floor(op.end))
  const maxStart = lines.length + 1
  if (start > maxStart) {
    start = maxStart
    end = lines.length
  }
  const before = lines.slice(0, start - 1)
  const after = lines.slice(end)
  const insert = op.text === '' ? [] : op.text.split('\n')
  return { text: [...before, ...insert, ...after].join('\n') }
}

function targetText(doc: CopilotLiveDoc, path?: string): { text: string; code?: string } {
  if (doc.kind === 'doc') return { text: docMarkdown(doc) }
  if (doc.kind === 'coding') {
    const p = String(path ?? '').trim()
    if (!p) return { text: '', code: 'denied_path' }
    if (isDeniedCodingPath(p)) return { text: '', code: 'denied_path' }
    const file = codingFiles(doc).find((f) => f.path === p)
    if (!file) return { text: '', code: 'no_match' }
    return { text: file.content }
  }
  return { text: '', code: 'scope_violation' }
}

function writeTarget(doc: CopilotLiveDoc, path: string | undefined, text: string): CopilotLiveDoc {
  if (doc.kind === 'doc') return setDocMarkdown(doc, text)
  if (doc.kind === 'coding' && path) return setCodingFile(doc, path, text)
  return doc
}

export function applyCopilotOps(
  doc: CopilotLiveDoc,
  ops: CopilotOp[],
  opts?: { expectedGeneration?: number; peelAsk?: string },
): CopilotApplyResult {
  if (opts?.expectedGeneration != null && opts.expectedGeneration !== doc.generation) {
    return {
      ok: false,
      doc,
      applied: [],
      failed: ops.map((op) => ({
        op,
        code: 'stale_generation',
        detail: `generation ${doc.generation} != ${opts.expectedGeneration}`,
      })),
    }
  }

  let next = { ...doc }
  const applied: CopilotOp[] = []
  const failed: CopilotApplyFailure[] = []
  const queued = rewriteCopilotOpPaths(ops)
  const queue =
    next.kind === 'doc'
      ? rewriteEssayInsertOps(queued, opts?.peelAsk ?? '', docMarkdown(next))
      : queued

  for (const op of queue) {
    if (op.op === 'set_response' || op.op === 'clear_response') {
      if (next.kind !== 'form') {
        failed.push({ op, code: 'scope_violation', detail: 'form ops on non-form doc' })
        continue
      }
      const known = new Set(formQuestions(next).map((q) => q.id))
      if (!known.has(op.questionId)) {
        failed.push({ op, code: 'unknown_question', detail: op.questionId })
        continue
      }
      const responses = formResponses(next)
      if (op.op === 'clear_response') {
        delete responses[op.questionId]
      } else {
        const coerced = coerceFormValue(op.value)
        if (!coerced) {
          failed.push({ op, code: 'unknown_question', detail: 'value' })
          continue
        }
        responses[op.questionId] = coerced
      }
      next = setFormResponses(next, responses)
      applied.push(op)
      continue
    }

    if (op.op === 'create_file' || op.op === 'create_folder') {
      if (next.kind !== 'coding') {
        failed.push({ op, code: 'scope_violation', detail: 'create on non-coding' })
        continue
      }
      const path = normalizeCodingCreatePath(op.path)
      const nextOp = { ...op, path }
      if (isDeniedCodingPath(path)) {
        failed.push({ op: nextOp, code: 'denied_path', detail: path })
        continue
      }
      if (!isWritableCodingCreatePath(path)) {
        failed.push({ op: nextOp, code: 'outside_src', detail: path })
        continue
      }
      const payload = { ...(next.coding ?? {}) } as Record<string, unknown>
      if (nextOp.op === 'create_folder') {
        const folders = Array.isArray(payload.folders) ? [...(payload.folders as string[])] : []
        if (!folders.includes(path)) folders.push(path)
        payload.folders = folders
        next = { ...next, coding: payload }
        applied.push(nextOp)
        continue
      }
      const existing = codingFiles(next).some((f) => f.path === path)
      if (existing) {
        failed.push({ op: nextOp, code: 'create_collision', detail: path })
        continue
      }
      next = setCodingFile(next, path, nextOp.contents, { create: true })
      const openIds = Array.isArray((next.coding as { openIds?: string[] })?.openIds)
        ? [...((next.coding as { openIds: string[] }).openIds)]
        : []
      if (!openIds.includes(path)) openIds.push(path)
      next = {
        ...next,
        coding: { ...(next.coding ?? {}), openIds, activeId: path },
      }
      applied.push(nextOp)
      continue
    }

    if (op.op === 'delete_file') {
      if (next.kind !== 'coding') {
        failed.push({ op, code: 'scope_violation', detail: 'delete on non-coding' })
        continue
      }
      const path = String(op.path ?? '').trim().replace(/\\/g, '/')
      const nextOp = { ...op, path }
      if (
        !path ||
        path.includes('..') ||
        path.startsWith('src/') ||
        isDeniedCodingPath(path) ||
        /(?:^|\/)solve\.\w+$/i.test(path)
      ) {
        failed.push({ op: nextOp, code: 'denied_path', detail: path })
        continue
      }
      const exists = codingFiles(next).some((f) => f.path === path)
      if (!exists) {
        failed.push({ op: nextOp, code: 'no_match', detail: path })
        continue
      }
      next = removeCodingFile(next, path)
      applied.push(nextOp)
      continue
    }

    if (next.kind === 'form') {
      failed.push({ op, code: 'scope_violation', detail: 'hunk on form' })
      continue
    }

    const path = 'path' in op ? op.path : undefined
    if (next.kind === 'coding' && path && isDeniedCodingPath(path)) {
      failed.push({ op, code: 'denied_path', detail: path })
      continue
    }

    if (op.op === 'replace_all') {
      const cur = targetText(next, path)
      if (cur.code) {
        failed.push({ op, code: cur.code, detail: path ?? 'doc' })
        continue
      }
      next = writeTarget(next, path, op.text)
      applied.push(op)
      continue
    }

    if (op.op === 'search_replace') {
      const cur = targetText(next, path)
      if (cur.code) {
        failed.push({ op, code: cur.code, detail: path ?? 'doc' })
        continue
      }
      const out = applySearchReplace(cur.text, op)
      if (out.code) {
        if (
          out.code === 'no_match' &&
          ((next.kind === 'coding' && isCodingStubBody(cur.text)) ||
            (next.kind === 'doc' && isEssayStubBody(cur.text))) &&
          String(op.new ?? '').trim()
        ) {
          const sep = cur.text && !cur.text.endsWith('\n') ? '\n' : ''
          const neu = op.new.endsWith('\n') ? op.new : `${op.new}\n`
          next = writeTarget(next, path, `${cur.text}${sep}${neu}`)
          applied.push(op)
          continue
        }
        failed.push({ op, code: out.code, detail: 'search_replace' })
        continue
      }
      next = writeTarget(next, path, out.text)
      applied.push(op)
      continue
    }

    if (op.op === 'line_hunk') {
      const cur = targetText(next, path)
      if (cur.code) {
        failed.push({ op, code: cur.code, detail: path ?? 'doc' })
        continue
      }
      const out = applyLineHunk(cur.text, op)
      if (out.code) {
        failed.push({ op, code: out.code, detail: 'line_hunk' })
        continue
      }
      next = writeTarget(next, path, out.text)
      applied.push(op)
    }
  }

  return { ok: failed.length === 0, doc: next, applied, failed }
}

export function snapshotHashFor(doc: CopilotLiveDoc): string {
  const raw = JSON.stringify({
    kind: doc.kind,
    form: doc.form ? { responses: formResponses(doc) } : null,
    coding: codingFiles(doc).map((f) => [f.path, f.content.length]),
    doc: docMarkdown(doc).length,
  })
  let h = 0
  for (let i = 0; i < raw.length; i += 1) h = (h * 31 + raw.charCodeAt(i)) | 0
  return `h${(h >>> 0).toString(16)}`
}
