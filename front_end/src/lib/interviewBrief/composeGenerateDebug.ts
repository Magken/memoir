/**
 * Dev console breadcrumbs for compose blank-slate Generate.
 * Uses console.log/warn/error (not debug) so Chrome default levels show them.
 * Filter DevTools by `[compose-generate]` or `Vurex DIAG`.
 */
import type { InterviewEditResult } from '../interviewEditApi'

const PREFIX = '[compose-generate]'

/** Full PART 1–3 + per-package briefs. Default SUMMARY stays compact. */
export function composeGenerateVerbose(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem('vurexDiagVerbose') === '1'
  } catch {
    return false
  }
}

export function composeGenerateDebug(step: string, detail?: unknown): void {
  if (detail === undefined) {
    console.log(PREFIX, step)
    return
  }
  console.log(PREFIX, step, detail)
}

export function composeGenerateWarn(step: string, detail?: unknown): void {
  if (detail === undefined) {
    console.warn(PREFIX, step)
    return
  }
  console.warn(PREFIX, step, detail)
}

export function composeGenerateError(step: string, err: unknown): void {
  const base =
    err && typeof err === 'object'
      ? {
          name: (err as { name?: string }).name,
          message: (err as { message?: string }).message,
          code: (err as { code?: string }).code,
          detail: (err as { detail?: string }).detail,
          status: (err as { status?: number }).status,
        }
      : { message: String(err) }
  console.error(PREFIX, step, base, err)
}

function clip(s: string, n: number): string {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim()
  if (t.length <= n) return t
  return `${t.slice(0, n)}…`
}

function limitMinutesFromBrief(brief: string): number | null {
  const owned = String(brief ?? '').split(/\bUser:\s*/i)[0] ?? ''
  const m = owned.match(/limitMinutes\s*[:=]\s*(\d{1,3})/i)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) ? n : null
}

/** Live tool hard timers from the done body. */
export function summarizeBodyTimers(result: InterviewEditResult): Array<{
  ref: string
  type: string
  mode: string | null
  limitMinutes: number | null
}> {
  const body = result.body
  const tools =
    body && typeof body.tools === 'object' && body.tools && !Array.isArray(body.tools)
      ? (body.tools as Record<string, Record<string, unknown>>)
      : null
  if (!tools) return []
  return Object.entries(tools).map(([ref, tool]) => {
    const timing =
      tool?.timing && typeof tool.timing === 'object'
        ? (tool.timing as Record<string, unknown>)
        : null
    const mins = Number(timing?.limitMinutes)
    return {
      ref,
      type: String(tool?.type ?? '?'),
      mode: timing && typeof timing.mode === 'string' ? timing.mode : null,
      limitMinutes: Number.isFinite(mins) ? mins : null,
    }
  })
}

/**
 * Planner output dump — prefers Edge plan_snapshot / phaseTraceDetail, else editRun.plan.
 */
export function summarizePlannerPlan(result: InterviewEditResult): Record<string, unknown> | null {
  const meta = result.meta
  const detail =
    meta && typeof meta === 'object' && meta.phaseTraceDetail && typeof meta.phaseTraceDetail === 'object'
      ? (meta.phaseTraceDetail as Record<string, unknown>)
      : null
  const fromDetail =
    detail?.planTimerSnapshot && typeof detail.planTimerSnapshot === 'object'
      ? (detail.planTimerSnapshot as Record<string, unknown>)
      : null
  if (fromDetail) return fromDetail

  const editRun =
    meta && typeof meta === 'object' && meta.editRun && typeof meta.editRun === 'object'
      ? (meta.editRun as Record<string, unknown>)
      : null
  const plan =
    editRun?.plan && typeof editRun.plan === 'object'
      ? (editRun.plan as Record<string, unknown>)
      : null
  if (!plan) return null
  const pkgs = Array.isArray(plan.workPackages) ? plan.workPackages : []
  const facts = Array.isArray(plan.expectedFacts) ? plan.expectedFacts : []
  return {
    blankSlateMap: null,
    packages: pkgs.map((raw) => {
      const p = raw as {
        packageId?: string
        kind?: string
        titleHint?: string
        planningBrief?: string
      }
      const brief = String(p.planningBrief ?? '')
      return {
        packageId: p.packageId ?? '?',
        kind: p.kind ?? '?',
        titleHint: p.titleHint,
        limitMinutes: limitMinutesFromBrief(brief),
        briefPreview: clip(brief.split(/\bUser:\s*/i)[0] ?? brief, 320),
      }
    }),
    timerFacts: facts
      .filter((raw) => {
        const f = raw as { kind?: string }
        return f.kind === 'tool_timing_timed' || f.kind === 'tool_timing_untimed'
      })
      .map((raw) => {
        const f = raw as {
          id?: string
          packageId?: string
          kind?: string
          wantMinutes?: number
        }
        return {
          id: f.id,
          packageId: f.packageId,
          kind: f.kind,
          wantMinutes: typeof f.wantMinutes === 'number' ? f.wantMinutes : null,
        }
      }),
  }
}

/** Compact plan_snapshot for stream logs — ids + minutes, no 280-char briefs. */
export function summarizePlanSnapshotCompact(snapshot: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const snap = snapshot && typeof snapshot === 'object' ? snapshot : {}
  const pkgs = Array.isArray(snap.packages) ? (snap.packages as Array<Record<string, unknown>>) : []
  return {
    workerMark: snap.workerMark ?? null,
    runAt: snap.runAt ?? null,
    pkgCount: pkgs.length,
    packages: pkgs.map((p) => {
      const id = String(p.packageId ?? '?')
      const kind = String(p.kind ?? '?')
      const mins = p.limitMinutes != null ? `${p.limitMinutes}m` : '—'
      const hint = p.titleHint ? String(p.titleHint).slice(0, 28) : ''
      return hint ? `${id} [${kind}] ${mins} “${hint}”` : `${id} [${kind}] ${mins}`
    }),
    blankSlateMap: snap.blankSlateMap ?? null,
    dropCount: Array.isArray(snap.guardDrops) ? snap.guardDrops.length : 0,
  }
}

/** Always-on console dump of planner packages + live timers (compose Generate). */
export function logComposePlannerAndTimers(
  step: string,
  result: InterviewEditResult,
  streamSnapshot?: Record<string, unknown> | null,
): void {
  const planner = streamSnapshot ?? summarizePlannerPlan(result)
  const timers = summarizeBodyTimers(result)
  const compact = summarizePlanSnapshotCompact(planner ?? undefined)
  console.log(PREFIX, step, {
    ...compact,
    liveToolTimers: timers.map(
      (t) => `${t.ref} ${t.type}/${t.mode ?? '?'}${t.limitMinutes != null ? `:${t.limitMinutes}m` : ''}`,
    ),
  })
}

const GENERATE_PATH_TOKEN =
  /^generate_path:(compiler|compiler_failed|llm|fallback):([^:]+):band=([^\s]+)$/

export type ComposeGeneratePath = {
  token: string | null
  status: string
  shape: string | null
  band: string | null
  why: string
}

export function parseGeneratePathToken(raw: string): {
  status: string
  shape: string
  band: string
} | null {
  const m = String(raw ?? '').trim().match(GENERATE_PATH_TOKEN)
  if (!m) return null
  return { status: m[1], shape: m[2], band: m[3] }
}

function whyForGeneratePath(input: {
  status: string
  shape: string | null
  band: string | null
  compilerOk: boolean
  planSource: string
}): string {
  const bandBit = input.band && input.band !== 'unknown' ? `, ${input.band} band` : ''
  if (input.status === 'compiler_failed') {
    return `Flow compiler could not check the plan (${input.shape ?? 'unknown'}${bandBit}).`
  }
  if (input.status === 'compiler' || input.compilerOk) {
    if (input.shape === 'full-box') {
      return `Flow compiler: full-box Prompt-1 loop (opening → form → ownership → coding → writing → closing)${bandBit}.`
    }
    if (input.shape === 'divergent') {
      return `Flow compiler: divergent numbered Flow (not the 1A full box)${bandBit}.`
    }
    return `Flow compiler used a numbered Flow${bandBit}.`
  }
  if (input.status === 'fallback' || input.planSource === 'fallback') {
    return 'LLM planner unavailable — offline fallback, not the Generate compiler.'
  }
  if (input.planSource === 'llm' || input.status === 'llm') {
    return 'LLM EditPlan (peel / not empty-board compiler).'
  }
  return `planSource=${input.planSource || 'unknown'}`
}

function collectGeneratePathSources(result: InterviewEditResult): {
  drops: string[]
  planSource: string
  planningNotes: string
  phaseToken: string | null
} {
  const meta = result.meta && typeof result.meta === 'object' ? result.meta : null
  const editRun =
    meta && meta.editRun && typeof meta.editRun === 'object'
      ? (meta.editRun as Record<string, unknown>)
      : null
  const detail =
    meta?.phaseTraceDetail && typeof meta.phaseTraceDetail === 'object'
      ? (meta.phaseTraceDetail as Record<string, unknown>)
      : null
  const plan =
    editRun?.plan && typeof editRun.plan === 'object'
      ? (editRun.plan as Record<string, unknown>)
      : meta?.plan && typeof meta.plan === 'object'
        ? (meta.plan as Record<string, unknown>)
        : null
  const drops = [
    ...(Array.isArray(meta?.guardDrops) ? meta.guardDrops : []),
    ...(Array.isArray(editRun?.guardDrops) ? editRun.guardDrops : []),
  ].map(String)
  const planningNotes = String(plan?.planningNotes ?? detail?.planningNotes ?? '')
  const phaseToken =
    typeof detail?.generatePath === 'string' && detail.generatePath.startsWith('generate_path:')
      ? detail.generatePath
      : null
  return {
    drops,
    planSource: String(editRun?.planSource ?? meta?.planSource ?? detail?.planSource ?? ''),
    planningNotes,
    phaseToken,
  }
}

/** Why Generate took this path — full-box 1A loop vs divergent Flow. */
export function composeGeneratePathFromResult(result: InterviewEditResult): ComposeGeneratePath {
  const { drops, planSource, planningNotes, phaseToken } = collectGeneratePathSources(result)
  const fromDrop = drops.map(parseGeneratePathToken).find(Boolean) ?? null
  const fromPhase = phaseToken ? parseGeneratePathToken(phaseToken) : null
  const fromNotes = planningNotes
    .split(/\s+/)
    .map(parseGeneratePathToken)
    .find(Boolean) ?? null
  const notesShape = planningNotes.match(/\bshape=(full-box|divergent)\b/)?.[1] ?? null
  const notesBand = planningNotes.match(/\bband=([a-z]+)\b/)?.[1] ?? null
  const parsed = fromDrop ?? fromPhase ?? fromNotes
  const compilerOk = isGenerateCompilerPlanSource(planSource, drops)
  const status =
    parsed?.status ??
    (compilerOk ? 'compiler' : planSource || 'unknown')
  const shape = parsed?.shape ?? notesShape
  const band = parsed?.band ?? notesBand
  const token =
    phaseToken ??
    drops.find((d) => d.startsWith('generate_path:')) ??
    (parsed ? `generate_path:${status}:${shape ?? 'unknown'}:band=${band ?? 'unknown'}` : null)
  return {
    token,
    status,
    shape,
    band,
    why: whyForGeneratePath({ status, shape, band, compilerOk, planSource }),
  }
}

export function formatComposeGeneratePathLine(path: ComposeGeneratePath): string {
  const bits = [path.status, path.shape, path.band ? `band=${path.band}` : null].filter(Boolean)
  return `${bits.join(' · ')} — ${path.why}`
}

/** Compact shape for Edit NDJSON done envelopes — avoids dumping full brief JSON. */
export function summarizeEditResult(result: InterviewEditResult): Record<string, unknown> {
  const body = result.body
  const tools = body && typeof body.tools === 'object' && body.tools && !Array.isArray(body.tools)
    ? body.tools
    : null
  const phases = body && Array.isArray(body.phases) ? body.phases : null
  const meta = result.meta
  const editRun =
    meta && typeof meta === 'object' && meta.editRun && typeof meta.editRun === 'object'
      ? (meta.editRun as Record<string, unknown>)
      : null
  const factResults = Array.isArray(editRun?.factResults)
    ? (editRun.factResults as Array<{ ok?: boolean }>)
    : Array.isArray(meta?.factResults)
      ? (meta.factResults as Array<{ ok?: boolean }>)
      : []
  const toolTypes =
    tools && typeof tools === 'object'
      ? Object.values(tools as Record<string, { type?: string }>).map((t) => t?.type ?? '?')
      : []
  const timers = summarizeBodyTimers(result)
  const generatePath = composeGeneratePathFromResult(result)
  return {
    briefId: result.briefId,
    editRunId: result.editRunId ?? null,
    hasBody: Boolean(body),
    bodyKeys: body && typeof body === 'object' ? Object.keys(body) : [],
    toolCount: tools ? Object.keys(tools).length : 0,
    toolTypes,
    phaseCount: phases?.length ?? 0,
    replyPartCount: result.replyParts?.length ?? 0,
    hadFailures: editRun?.hadFailures ?? meta?.hadFailures ?? null,
    factFailCount: factResults.filter((f) => f && f.ok === false).length,
    factOkCount: factResults.filter((f) => f && f.ok === true).length,
    metaAwait: meta && typeof meta === 'object' ? (meta as { await?: unknown }).await ?? null : null,
    metaKeys: meta && typeof meta === 'object' ? Object.keys(meta) : [],
    liveToolTimers: timers.map(
      (t) => `${t.ref} ${t.type}/${t.mode ?? '?'}${t.limitMinutes != null ? `:${t.limitMinutes}m` : ''}`,
    ),
    generatePathLine: formatComposeGeneratePathLine(generatePath),
  }
}

export function replyMarkdownFromEditResult(result: InterviewEditResult | null): string {
  if (!result?.replyParts?.length) return ''
  return result.replyParts
    .filter((p): p is { type: 'markdown'; text: string } => p.type === 'markdown' && typeof p.text === 'string')
    .map((p) => p.text.trim())
    .filter(Boolean)
    .join('\n\n')
}

/** Blank-slate Generate compiler is not an LLM-outage fallback. */
export function isGenerateCompilerPlanSource(
  planSource: string,
  drops: readonly string[],
): boolean {
  const src = String(planSource ?? '').toLowerCase()
  const list = drops.map(String)
  if (src === 'compiler') return true
  return (
    src === 'fallback' &&
    list.includes('generate_compiler') &&
    list.includes('generate_checked') &&
    !list.some(
      (d) => d === 'generate_compiler_failed' || d.startsWith('generate_compiler_failed:'),
    )
  )
}

/** Blank-slate Generate/Regenerate must not open builder on fallback / LLM outage. */
export function composeEditTurnFailureReason(result: InterviewEditResult): string | null {
  const meta = result.meta && typeof result.meta === 'object' ? result.meta : null
  const editRun =
    meta && meta.editRun && typeof meta.editRun === 'object'
      ? (meta.editRun as Record<string, unknown>)
      : null
  const detail =
    meta?.phaseTraceDetail && typeof meta.phaseTraceDetail === 'object'
      ? (meta.phaseTraceDetail as Record<string, unknown>)
      : null
  const planSource = String(
    editRun?.planSource ?? meta?.planSource ?? detail?.planSource ?? '',
  ).toLowerCase()
  const drops = [
    ...(Array.isArray(meta?.guardDrops) ? meta.guardDrops : []),
    ...(Array.isArray(editRun?.guardDrops) ? editRun.guardDrops : []),
  ].map(String)
  const warnings = (Array.isArray(editRun?.warnings) ? editRun.warnings : []).map(String)
  const plan =
    editRun?.plan && typeof editRun.plan === 'object'
      ? (editRun.plan as Record<string, unknown>)
      : null
  const intent = String(plan?.intent ?? '')
  const planningNotes = String(plan?.planningNotes ?? '')
  const blob = [...drops, ...warnings, planningNotes].join('\n')
  const reply = replyMarkdownFromEditResult(result)
  const compilerOk = isGenerateCompilerPlanSource(planSource, drops)

  if (/no credits remaining|\b429\b/i.test(blob)) {
    return 'Planner was unavailable (API credits). Add OpenAI credits, then tap Regenerate.'
  }
  if (intent === 'generate_llm_failed' || /generate_llm_unavailable|generate_empty_llm_plan/i.test(blob)) {
    if (/timeout|plan_timeout/i.test(blob)) {
      return 'Planner timed out before a full plan. Tap Regenerate to retry.'
    }
    if (/unavailable|no planner model/i.test(planningNotes)) {
      return 'Planner model was unavailable. Tap Regenerate to retry.'
    }
    if (/empty_llm_plan/i.test(blob)) {
      return 'Planner returned no sections. Tap Regenerate to retry.'
    }
    return 'Planner did not return a usable interview plan. Tap Regenerate to retry.'
  }
  if (planSource === 'fallback' && !compilerOk) {
    if (/invoke_failed/i.test(blob)) {
      return 'Planner could not finish. Tap Regenerate to retry.'
    }
    return 'Planner fell back without a full LLM plan. Tap Regenerate to retry.'
  }
  if (/plan_llm_failed|invoke_failed/i.test(blob)) {
    return 'Planner could not finish. Tap Regenerate to retry.'
  }
  if (/^\s*\*{0,2}\s*that edit failed/i.test(reply)) {
    return 'That edit failed. Tap Regenerate to retry.'
  }
  return null
}
