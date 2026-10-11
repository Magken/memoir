/**
 * Compact accepted/rejected Copilot receipts for the next plan/editor hop.
 */
import type { CopilotLiveDoc, CopilotOp } from './copilotApply'
import {
  capEditMemory,
  formatEditMemoryLine,
  type CopilotEditMemoryEntry,
  type CopilotEditMemoryStatus,
} from '../codeEditor/proposeFileEdit'

export type { CopilotEditMemoryEntry, CopilotEditMemoryStatus }
export { capEditMemory, formatEditMemoryLine }

export function locusFromOps(kind: CopilotLiveDoc['kind'], ops: readonly CopilotOp[]): string {
  for (const op of ops) {
    if ('path' in op && typeof op.path === 'string' && op.path.trim()) return op.path.trim()
    if ('questionId' in op && typeof op.questionId === 'string' && op.questionId.trim()) {
      return op.questionId.trim()
    }
  }
  return kind === 'doc' ? 'essay' : kind
}

const SUMMARY_CAP = 160

export function summaryFromOps(ops: readonly CopilotOp[]): string {
  const first = ops[0]
  if (!first) return 'edit'
  if (first.op === 'search_replace') {
    const old = first.old.trim()
    const neu = first.new.trim()
    if (!neu) return `delete ${old.slice(0, SUMMARY_CAP)}`
    if (old && neu.includes(old) && neu.length > old.length) {
      const added = neu.slice(neu.indexOf(old) + old.length).trim()
      if (added.length >= 8) return added.slice(0, SUMMARY_CAP)
    }
    return neu.slice(0, SUMMARY_CAP) || 'replace'
  }
  if (first.op === 'line_hunk') return first.text.trim().slice(0, SUMMARY_CAP) || 'hunk'
  if (first.op === 'create_file') return `create ${first.path}`
  if (first.op === 'delete_file') return `remove ${first.path}`
  if (first.op === 'set_response') return `set ${first.questionId}`
  if (first.op === 'clear_response') return `clear ${first.questionId}`
  if (first.op === 'replace_all') return 'replace span'
  if (first.op === 'create_folder') return `folder ${first.path}`
  return 'edit'
}

export function memoryEntryFromOps(input: {
  status: CopilotEditMemoryStatus
  kind: CopilotLiveDoc['kind']
  ops: readonly CopilotOp[]
}): CopilotEditMemoryEntry {
  return {
    status: input.status,
    kind: input.kind,
    locus: locusFromOps(input.kind, input.ops),
    summary: summaryFromOps(input.ops),
    at: Date.now(),
  }
}

export function codingFileText(doc: CopilotLiveDoc, path: string): string {
  const files = Array.isArray(doc.coding?.files)
    ? (doc.coding!.files as Array<{ path?: string; content?: string; buffer?: string }>)
    : []
  const needle = path.replace(/\\/g, '/').replace(/^\.\//, '')
  const hit = files.find((f) => {
    const p = String(f.path ?? '').replace(/\\/g, '/')
    return p === needle || p.endsWith(`/${needle}`) || p.endsWith(needle)
  })
  return String(hit?.content ?? hit?.buffer ?? '')
}

export function docMarkdownOf(doc: CopilotLiveDoc): string {
  return String((doc.doc as { markdown?: string } | undefined)?.markdown ?? '')
}

export function firstOpPath(ops: readonly CopilotOp[]): string | undefined {
  return codingPathsFromOps(ops)[0]
}

function normalizeOpPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '').trim()
}

/** Unique coding paths in op order. One turn can touch several files; same path once. */
export function codingPathsFromOps(ops: readonly CopilotOp[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const op of ops) {
    if (!('path' in op) || typeof op.path !== 'string') continue
    const path = normalizeOpPath(op.path)
    if (!path || seen.has(path)) continue
    seen.add(path)
    out.push(path)
  }
  return out
}

/** True when dry-run bodies match live files — never overlay a no-op as “Proposed”. */
export function codingDiffIsNoop(
  files: readonly { original: string; next: string }[],
): boolean {
  return files.length === 0 || files.every((f) => f.original === f.next)
}

export function opsForPath(ops: readonly CopilotOp[], path: string): CopilotOp[] {
  const needle = normalizeOpPath(path)
  if (!needle) return []
  return ops.filter((op) => {
    if (!('path' in op) || typeof op.path !== 'string') return false
    const p = normalizeOpPath(op.path)
    return p === needle || p.endsWith(`/${needle}`) || needle.endsWith(`/${p}`)
  })
}
