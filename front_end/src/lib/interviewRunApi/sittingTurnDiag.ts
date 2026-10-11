/**
 * Sitting peel DIAG — Copilot, Assist, and Assessor Aid. Filter DevTools by `Sitting DIAG`.
 * On in Vite DEV. Force: localStorage vurify.interviewBotDebug = '1' | '0'.
 * Send failures always `console.error('[interview-peel]', …)` even when DIAG is off.
 */

function sittingDiagVerdict(input: {
  mode?: string
  converseNoMemory?: boolean
  peelEmpty?: boolean
  mixedAssistDialect?: boolean
  bodyChanged?: boolean
}): string {
  if (input.mixedAssistDialect) return 'mode_mixed'
  if (input.peelEmpty) return 'peel_empty'
  if (input.converseNoMemory) return 'converse_no_memory'
  if (input.mode === 'edit' && input.bodyChanged === false) return 'edit_no_change'
  return String(input.mode ?? '—')
}

export type SittingTurnDiagSurface = 'copilot' | 'assist' | 'aid'

export type SittingTurnDiagInput = {
  surface: SittingTurnDiagSurface
  userMessage: string
  replyMarkdown: string
  error?: unknown
  meta?: Record<string, unknown> | null
  editMemory?: Array<{ status?: string; locus?: string }>
}

function sittingDiagEnabled(): boolean {
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

function strList(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.map(String).filter(Boolean) : []
}

export function logSittingTurnDebug(input: SittingTurnDiagInput): void {
  if (input.error) {
    console.error('[interview-peel]', input.surface, input.error)
  }
  if (!sittingDiagEnabled()) return
  const meta = input.meta && typeof input.meta === 'object' ? input.meta : {}
  const diag =
    meta.copilotTurnDiag && typeof meta.copilotTurnDiag === 'object'
      ? (meta.copilotTurnDiag as Record<string, unknown>)
      : meta.sittingTurnDiag && typeof meta.sittingTurnDiag === 'object'
        ? (meta.sittingTurnDiag as Record<string, unknown>)
        : meta
  const phaseTrace = strList(diag.phaseTrace ?? meta.phaseTrace)
  const guardDrops = strList(diag.guardDrops ?? meta.guardDrops ?? diag.drops ?? meta.drops)
  const peelLines = strList(diag.peelUserLines)
  const mode = String(diag.mode ?? meta.mode ?? '—')
  const planSource = String(diag.planSource ?? meta.planSource ?? '—')
  const boundPath = String(diag.boundPath ?? '—')
  const applyCodes = strList(diag.applyCodes)
  const pkgs = diag.packageCount ?? meta.packageCount ?? '—'
  const homes = strList(diag.homes ?? meta.homes)
  const needs = strList(diag.needs ?? meta.needs)
  const retrieved = strList(diag.retrieved ?? meta.retrieved)
  const injectMiss = strList(diag.injectMiss ?? meta.injectMiss)
  const mem = (input.editMemory ?? [])
    .slice(-8)
    .map((r) => `${r.status ?? '?'}·${r.locus ?? '?'}`)
    .join(' | ')
  const err =
    input.error && typeof input.error === 'object'
      ? String((input.error as { message?: string; code?: string }).message ??
          (input.error as { code?: string }).code ??
          '')
      : input.error
        ? String(input.error)
        : ''
  const from = String(meta.from ?? (input.error ? 'error' : input.surface === 'aid' ? 'edge' : '—'))
  const situation = String(meta.situation ?? '—')
  const model = String(meta.model ?? '—')
  const verdict = sittingDiagVerdict({
    mode,
    converseNoMemory:
      input.surface !== 'aid' && mode !== 'edit' && !peelLines.length && !mem,
    peelEmpty:
      input.surface !== 'aid' && peelLines.length === 0 && Boolean(input.userMessage),
    mixedAssistDialect: guardDrops.includes('mode_mixed'),
    bodyChanged: meta.bodyChanged === true || Boolean((meta.receipt as { bodyChanged?: boolean } | undefined)?.bodyChanged),
  })

  const aid = input.surface === 'aid'
  const head = [
    aid
      ? '======== Sitting DIAG PART 1/2 (copy ALL parts) ========'
      : '======== Sitting DIAG (copy) ========',
    `SURFACE: ${input.surface}`,
    `USER: ${clip(input.userMessage, 160)}`,
    `REPLY: ${clip(input.replyMarkdown, 200)}`,
    err ? `ERROR: ${clip(err, 120)}` : '',
    `FROM: ${from}`,
    `SITUATION: ${situation}`,
    `MODEL: ${model}`,
    `PLAN: ${planSource}  mode=${mode}  ${
      aid
        ? `needs=${needs.length ? needs.join(',') : '—'}  retrieved=${retrieved.length ? retrieved.join(',') : '—'}  injectMiss=${injectMiss.length ? injectMiss.join(',') : '—'}  homes=${homes.length ? homes.join(',') : '—'}`
        : `pkgs=${String(pkgs)}  bound=${boundPath}`
    }`,
    `STEPS: ${phaseTrace.length ? phaseTrace.join(' → ') : '—'}`,
    `PEEL: ${peelLines.length ? peelLines.map((l) => clip(l, 80)).join(' || ') : '—'}`,
    `MEMORY: ${mem || '—'}`,
    applyCodes.length ? `APPLY: ${applyCodes.join(', ')}` : '',
    `DROPS: ${guardDrops.length ? guardDrops.join(' · ') : '—'}`,
    `VERDICT: ${verdict}`,
    aid ? '======== end Sitting DIAG PART 1/2 ========' : '======== end Sitting DIAG ========',
  ].filter(Boolean)

  console.log(head.join('\n'))

  if (aid) {
    const pack = strList(diag.packDiag ?? meta.packDiag)
    console.log(
      [
        '======== Sitting DIAG PART 2/2 (RESULTS PACK — copy) ========',
        ...(pack.length ? pack : ['(no packDiag — FE did not pass the results board)']),
        '======== end Sitting DIAG ========',
      ].join('\n'),
    )
  }
}
