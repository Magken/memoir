/**
 * Editor tape → compact digest for process / authorship marks. Units only. Never secrets.
 */
import type { EditorTape, EditorTapeActionName } from './types'

const SECRET_PATH_RE = /(^|\/)(reference|tests)(\/|$)|cases\.json$|answerKey/i
const SECRET_KEY_RE = /answerKey|expected|oracle|hidden/i

export type TapeDigestAction = {
  t: number
  action: EditorTapeActionName | string
  detail?: Record<string, unknown>
}

export type TapeDigest = {
  kind: string
  durationMs: number
  truncated: boolean
  actions: TapeDigestAction[]
  checkpoints: Array<{ t: number; bytes: number }>
  cadence: { tickCount: number; medianGapMs: number; p95GapMs: number }
  /** Human editor diffs. Checkpoints, idle, and Copilot apply are not this. */
  patchCount: number
  filesTouched?: string[]
}

function median(nums: number[]): number {
  if (!nums.length) return 0
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2
}

function percentile(nums: number[], p: number): number {
  if (!nums.length) return 0
  const s = [...nums].sort((a, b) => a - b)
  const i = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1))
  return s[i]!
}

function sanitizeDetail(detail: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!detail) return undefined
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(detail)) {
    if (SECRET_KEY_RE.test(k)) continue
    if (typeof v === 'string' && SECRET_KEY_RE.test(v)) continue
    if (k === 'path' && typeof v === 'string' && SECRET_PATH_RE.test(v)) continue
    out[k] = typeof v === 'string' ? v.slice(0, 80) : v
  }
  return Object.keys(out).length ? out : undefined
}

function checkpointBytes(checkpoint: Record<string, unknown>): number {
  try {
    const raw = JSON.stringify(checkpoint)
    if (SECRET_KEY_RE.test(raw) || /SECRET|oracle/i.test(raw)) {
      return Math.min(raw.length, 8)
    }
    return raw.length
  } catch {
    return 0
  }
}

function authorSafePath(path: string): boolean {
  return !SECRET_PATH_RE.test(path)
}

/**
 * Compact reconstructable-process digest. Caps size. Never answerKey / hidden expected.
 */
export function digestEditorTape(tape: EditorTape | null | undefined, cap = 80): TapeDigest | null {
  if (!tape) return null
  const actions: TapeDigestAction[] = []
  const checkpoints: Array<{ t: number; bytes: number }> = []
  const gaps: number[] = []
  const files = new Set<string>()
  let lastT = 0
  let tickCount = 0
  let patchCount = 0

  for (const ev of tape.events ?? []) {
    const t = Number(ev.t) || 0
    if (tickCount > 0) gaps.push(Math.max(0, t - lastT))
    lastT = t
    tickCount += 1
    if (ev.type === 'patch') patchCount += 1
    if (ev.type === 'action') {
      if (actions.length < cap) {
        actions.push({
          t,
          action: ev.action,
          detail: sanitizeDetail(ev.detail),
        })
      }
      const path = typeof ev.detail?.path === 'string' ? ev.detail.path : null
      if (path && authorSafePath(path)) files.add(path)
    } else if (ev.type === 'checkpoint') {
      if (checkpoints.length < Math.min(24, cap)) {
        checkpoints.push({ t, bytes: checkpointBytes(ev.checkpoint) })
      }
    } else if (ev.type === 'patch') {
      for (const patch of ev.patches ?? []) {
        const path = typeof patch?.path === 'string' ? patch.path : null
        if (path && authorSafePath(path)) files.add(path)
      }
    }
  }

  const digest: TapeDigest = {
    kind: tape.kind,
    durationMs: tape.durationMs,
    truncated: Boolean(tape.truncated) || (tape.events?.length ?? 0) > cap * 4,
    actions,
    checkpoints,
    cadence: {
      tickCount,
      medianGapMs: Math.round(median(gaps)),
      p95GapMs: Math.round(percentile(gaps, 95)),
    },
    patchCount,
  }
  if (tape.kind === 'coding' && files.size) {
    digest.filesTouched = [...files].slice(0, 24)
  }
  const blob = JSON.stringify(digest)
  if (SECRET_KEY_RE.test(blob) || blob.includes('answerKey')) {
    return {
      ...digest,
      actions: digest.actions.map((a) => ({ t: a.t, action: a.action })),
    }
  }
  return digest
}

export function digestHasSecretLeak(digest: TapeDigest | null): boolean {
  if (!digest) return false
  const raw = JSON.stringify(digest)
  return SECRET_KEY_RE.test(raw) || raw.includes('answerKey')
}
