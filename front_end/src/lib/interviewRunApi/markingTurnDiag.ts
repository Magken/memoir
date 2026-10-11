/**
 * Marking DIAG — assessor stages per host. Filter DevTools by `Marking DIAG`.
 * On in Vite DEV. Force: localStorage vurify.interviewBotDebug = '1' | '0'.
 * Mark failures always `console.error('[interview-mark]', …)` even when DIAG is off.
 *
 * Mirrors `sittingTurnDiag` / `vurexBoardTurnDiag`. The trace is also persisted to
 * `analysis.markTrace` — console output cannot answer a bug reported hours later.
 */
import type { MarkStageEntry } from './talkTypes'

export type MarkingDiagInput = {
  hostRef: string
  kind: string
  phaseId?: string
  stages?: MarkStageEntry[]
  totalMs?: number
  model?: string | null
  /** Set when the whole call failed rather than one stage. */
  failed?: string
  error?: unknown
  /** Grain ids left pending after this attempt — a non-empty list is the stuck signal. */
  stillPending?: string[]
}

function markingDiagEnabled(): boolean {
  try {
    if (typeof localStorage !== 'undefined') {
      const flag =
        localStorage.getItem('vurify.interviewBotDebug') ??
        localStorage.getItem('vurify.talkDebug')
      if (flag === '0') return false
      if (flag === '1') return true
    }
  } catch {
    /* ignore */
  }
  try {
    return Boolean(import.meta.env?.DEV)
  } catch {
    return true
  }
}

function clip(text: string, max: number): string {
  const t = String(text ?? '').trim().replace(/\s+/g, ' ')
  if (!t) return '(empty)'
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`
}

function errText(error: unknown): string {
  if (!error) return ''
  if (typeof error === 'object') {
    const e = error as { message?: string; code?: string }
    return String(e.message ?? e.code ?? '')
  }
  return String(error)
}

/** `stage:status` with duration, so a slow stage is as visible as a failed one. */
function stageLine(stage: MarkStageEntry): string {
  const ms = typeof stage.ms === 'number' && stage.ms > 0 ? `(${stage.ms}ms)` : ''
  const err = stage.error ? ` !${clip(stage.error, 60)}` : ''
  return `${stage.stage}:${stage.status}${ms}${err}`
}

function markingVerdict(input: MarkingDiagInput): string {
  if (input.failed || input.error) return `failed:${input.failed || clip(errText(input.error), 40)}`
  if (input.stillPending?.length) return `stuck:${input.stillPending.length}_pending`
  const stages = input.stages ?? []
  if (!stages.length) return 'no_stages_ran'
  if (stages.every((s) => s.status === 'skipped')) return 'all_skipped'
  if (stages.some((s) => s.status === 'failed')) return 'partial'
  return 'ok'
}

export function logMarkingTurnDebug(input: MarkingDiagInput): void {
  if (input.error || input.failed) {
    console.error('[interview-mark]', input.kind, input.hostRef, input.error ?? input.failed)
  }
  if (!markingDiagEnabled()) return

  const stages = input.stages ?? []
  const err = errText(input.error)
  const head = [
    '======== Marking DIAG (copy) ========',
    `HOST: ${input.hostRef}  kind=${input.kind}${input.phaseId ? `  phase=${input.phaseId}` : ''}`,
    `MODEL: ${input.model || '—'}  total=${typeof input.totalMs === 'number' ? `${input.totalMs}ms` : '—'}`,
    `STAGES: ${stages.length ? stages.map(stageLine).join(' → ') : '—'}`,
    input.stillPending?.length ? `PENDING: ${input.stillPending.join(' · ')}` : '',
    err ? `ERROR: ${clip(err, 160)}` : '',
    `VERDICT: ${markingVerdict(input)}`,
    '======== end Marking DIAG ========',
  ].filter(Boolean)

  console.log(head.join('\n'))
}
