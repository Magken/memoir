import { catalogTemplate } from '../interviewBrief/analysisTemplateCatalog'
import { clearEditorTapes } from './editorCapture/store'
import { clearSessionTelemetry } from './sessionTelemetry/store'
import { afterTurnTemplateIds } from './buildTalkContext'
import { markJobsInflightCount } from './markJobs'
import { scoreAttempt } from './scoreAttempt'
import {
  normalizeBotNotes,
  upsertBotNotes,
  type PersistNoteDraft,
} from './dayMemory/botNotes'
import type {
  AnalysisGrainStub,
  InterviewResponse,
  InterviewResponseComposeMeta,
  MarkStageStatus,
  MarkTraceRow,
  InterviewResponseMessage,
  InterviewResponseMessageKind,
  InterviewResponseTalkRuntime,
  TalkContext,
  TalkRuntimeState,
  TopicEndStub,
} from './talkTypes'

const STORAGE_PREFIX = 'vurify.interviewResponse.v1:'

function storageKey(briefId: string): string {
  return `${STORAGE_PREFIX}${briefId.trim()}`
}

function nowIso(): string {
  return new Date().toISOString()
}

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`
}

export function emptyInterviewResponse(briefId: string): InterviewResponse {
  const startedAt = nowIso()
  return {
    schemaVersion: 1,
    briefId: briefId.trim(),
    attemptId: `local:${briefId.trim()}:${startedAt}`,
    startedAt,
    updatedAt: startedAt,
    phasePointer: null,
    completedPhaseIds: [],
    skippedPhaseIds: [],
    messages: [],
    messageRange: { firstId: null, lastId: null },
    talkRuntime: null,
    botNotes: [],
    editorTapes: {},
    analysis: {
      turns: {},
      tools: {},
      toolPackages: {},
      topics: {},
      signals: {},
      rollup: null,
      partial: null,
      markTrace: [],
    },
  }
}

function normalizeLoaded(doc: InterviewResponse): InterviewResponse {
  return {
    ...doc,
    talkRuntime: doc.talkRuntime ?? null,
    botNotes: normalizeBotNotes(doc.botNotes),
    editorTapes: doc.editorTapes ?? {},
    sittingDeclaration: doc.sittingDeclaration,
    sittingTerms: doc.sittingTerms,
    messages: (doc.messages ?? []).map((m) => ({ ...m })),
    analysis: {
      turns: doc.analysis?.turns ?? {},
      tools: doc.analysis?.tools ?? {},
      toolPackages: doc.analysis?.toolPackages ?? {},
      topics: doc.analysis?.topics ?? {},
      signals: doc.analysis?.signals ?? {},
      rollup: doc.analysis?.rollup ?? null,
      partial: doc.analysis?.partial ?? null,
      markTrace: doc.analysis?.markTrace ?? [],
    },
  }
}

export function loadInterviewResponse(briefId: string): InterviewResponse | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(storageKey(briefId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as InterviewResponse
    if (parsed?.schemaVersion !== 1 || typeof parsed.briefId !== 'string') return null
    return normalizeLoaded(parsed)
  } catch {
    return null
  }
}

export function saveInterviewResponse(doc: InterviewResponse): InterviewResponse {
  const next = { ...doc, updatedAt: nowIso() }
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(storageKey(doc.briefId), JSON.stringify(next))
  }
  return next
}

export function clearInterviewResponse(briefId: string): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(storageKey(briefId))
  clearEditorTapes(briefId)
  clearSessionTelemetry(briefId)
}

/** Fresh attempt id, keep landing terms + support note (Start must not wipe them). */
export function restartInterviewResponseKeepingIntake(briefId: string): InterviewResponse {
  const prev = loadInterviewResponse(briefId)
  const sittingDeclaration = prev?.sittingDeclaration
  const sittingTerms = prev?.sittingTerms
  clearInterviewResponse(briefId)
  const fresh = emptyInterviewResponse(briefId)
  if (sittingDeclaration) fresh.sittingDeclaration = sittingDeclaration
  if (sittingTerms) fresh.sittingTerms = sittingTerms
  return saveInterviewResponse(fresh)
}

/** Ensure a response shell exists (create if missing). */
export function ensureInterviewResponse(briefId: string): InterviewResponse {
  return loadInterviewResponse(briefId) ?? saveInterviewResponse(emptyInterviewResponse(briefId))
}

export function getInterviewResponse(briefId: string): InterviewResponse {
  return ensureInterviewResponse(briefId)
}

export function exportInterviewResponseJson(briefId: string, pretty = true): string {
  const doc = getInterviewResponse(briefId)
  return pretty ? JSON.stringify(doc, null, 2) : JSON.stringify(doc)
}

export function setResponsePhasePointer(
  doc: InterviewResponse,
  phaseId: string | null,
): InterviewResponse {
  return saveInterviewResponse({ ...doc, phasePointer: phaseId })
}

export function syncResponseProgress(
  doc: InterviewResponse,
  completedPhaseIds: readonly string[],
  skippedPhaseIds: readonly string[],
): InterviewResponse {
  return saveInterviewResponse({
    ...doc,
    completedPhaseIds: [...completedPhaseIds],
    skippedPhaseIds: [...skippedPhaseIds],
  })
}

export function talkRuntimeSnapshot(
  ctx: TalkContext,
  state: TalkRuntimeState,
): InterviewResponseTalkRuntime {
  return {
    phaseId: ctx.phaseId,
    topicId: ctx.topicId,
    status: state.status,
    activeProbeIndex: state.activeProbeIndex,
    followUpsOnActiveProbe: state.followUpsOnActiveProbe,
    probesAsked: state.probesAsked,
    candidateTurns: state.candidateTurns,
    startedAt: state.startedAt,
    softTimeSent: state.softTimeSent,
    openBeat: state.openBeat,
  }
}

export function persistTalkRuntime(
  doc: InterviewResponse,
  ctx: TalkContext,
  state: TalkRuntimeState,
): InterviewResponse {
  return saveInterviewResponse({
    ...doc,
    talkRuntime: talkRuntimeSnapshot(ctx, state),
  })
}

/** Merge durable interviewer notes (preferred name, language, etc.) into the response SSOT. */
export function persistBotNotes(
  doc: InterviewResponse,
  drafts: readonly PersistNoteDraft[],
  meta: { phaseId?: string; source: 'talk' | 'assist' },
): InterviewResponse {
  if (!drafts.length) return doc
  const botNotes = upsertBotNotes(doc.botNotes ?? [], drafts, meta)
  return saveInterviewResponse({ ...doc, botNotes })
}

export function appendResponseMessage(
  doc: InterviewResponse,
  input: {
    phaseId: string
    topicId: string | null
    role: InterviewResponseMessage['role']
    text: string
    probeId: string | null
    kind: InterviewResponseMessageKind
    id?: string
    at?: string
    compose?: InterviewResponseComposeMeta
  },
): { doc: InterviewResponse; message: InterviewResponseMessage } {
  const message: InterviewResponseMessage = {
    id: input.id ?? newId('msg'),
    phaseId: input.phaseId,
    topicId: input.topicId,
    role: input.role,
    text: input.text,
    at: input.at ?? nowIso(),
    probeId: input.probeId,
    kind: input.kind,
    ...(input.compose ? { compose: input.compose } : {}),
  }
  let messages: InterviewResponseMessage[]
  if (input.id) {
    const idx = doc.messages.findIndex((m) => m.id === input.id)
    if (idx >= 0) {
      messages = [...doc.messages]
      messages[idx] = { ...message, at: doc.messages[idx]!.at }
    } else {
      messages = [...doc.messages, message]
    }
  } else {
    messages = [...doc.messages, message]
  }
  const next = saveInterviewResponse({
    ...doc,
    phasePointer: input.phaseId,
    messages,
    messageRange: {
      firstId: doc.messageRange.firstId ?? message.id,
      lastId: message.id,
    },
  })
  return { doc: next, message }
}

function dimensionShells(templateId: string): AnalysisGrainStub['dimensions'] {
  const entry = catalogTemplate(templateId)
  if (!entry?.dimensions?.length) return undefined
  return entry.dimensions.map((d) => ({
    key: d.key,
    label: d.label,
    score: '',
    max: 5,
  }))
}

/** Write pending after_turn grain slots with catalog dimension shells. */
export function writePendingAfterTurnGrains(
  doc: InterviewResponse,
  input: {
    messageId: string
    hostRef: string
    templateIds: readonly string[]
    order: number
  },
): InterviewResponse {
  const ivIds = afterTurnTemplateIds(input.templateIds)
  if (ivIds.length === 0) return doc
  const turns = { ...doc.analysis.turns }
  const row = { ...(turns[input.messageId] ?? {}) }
  for (const templateId of ivIds) {
    if (row[templateId]) continue
    const grain: AnalysisGrainStub = {
      templateId,
      hostRef: input.hostRef,
      grain: 'after_turn',
      order: input.order,
      status: 'pending',
      result: null,
      dimensions: dimensionShells(templateId),
      justification: '',
    }
    row[templateId] = grain
  }
  turns[input.messageId] = row
  return saveInterviewResponse({
    ...doc,
    analysis: { ...doc.analysis, turns },
  })
}

/**
 * Mark after_turn templates skipped (clarifying / non-answer meta turns).
 * Still records a stub so Verify can show an unscored card at that utterance.
 * Analysis templates apply to substantive answers only — Soft Decision ignores skipped.
 */
export function writeSkippedAfterTurnGrains(
  doc: InterviewResponse,
  input: {
    messageId: string
    hostRef: string
    templateIds: readonly string[]
    order: number
    reason?: string
    /** Candidate quote for assessor review (not scored). */
    evidence?: readonly string[]
  },
): InterviewResponse {
  const ivIds = afterTurnTemplateIds(input.templateIds)
  if (ivIds.length === 0) return doc
  const justification =
    input.reason?.trim() ||
    'Not scored - clarifying or non-answer turn (analysis applies to answers only).'
  const evidence = (input.evidence ?? [])
    .map((e) => e.trim())
    .filter(Boolean)
    .slice(0, 3)
  const turns = { ...doc.analysis.turns }
  const row = { ...(turns[input.messageId] ?? {}) }
  for (const templateId of ivIds) {
    const prev = row[templateId]
    if (prev?.status === 'filled') continue
    row[templateId] = {
      templateId,
      hostRef: input.hostRef,
      grain: 'after_turn',
      order: input.order,
      status: 'skipped',
      result: null,
      dimensions: [],
      justification,
      evidence,
      confidence: 'low',
    }
  }
  turns[input.messageId] = row
  return saveInterviewResponse({
    ...doc,
    analysis: { ...doc.analysis, turns },
  })
}

export function mergeFilledAfterTurnGrains(
  doc: InterviewResponse,
  messageId: string,
  grains: Record<string, AnalysisGrainStub>,
  /** When set, only merge these template ids (Edge allowlist). */
  allowIds?: readonly string[],
): InterviewResponse {
  const turns = { ...doc.analysis.turns }
  const row = { ...(turns[messageId] ?? {}) }
  const allow = allowIds?.length
    ? new Set([
        ...afterTurnTemplateIds(allowIds),
        ...allowIds.filter((id) => id.startsWith('custom.')),
      ])
    : null
  for (const [templateId, grain] of Object.entries(grains)) {
    if (allow && !allow.has(templateId)) continue
    const scheduled = afterTurnTemplateIds([templateId]).length > 0
    if (!allow && !scheduled && !templateId.startsWith('custom.')) continue
    const incomingStatus = grain.status
    const status: AnalysisGrainStub['status'] =
      incomingStatus === 'skipped' || incomingStatus === 'pending'
        ? incomingStatus
        : 'filled'
    row[templateId] = {
      ...row[templateId],
      ...grain,
      templateId: grain.templateId || templateId,
      grain: 'after_turn',
      status,
    }
  }
  turns[messageId] = row
  return saveInterviewResponse({
    ...doc,
    analysis: { ...doc.analysis, turns },
  })
}

/**
 * Convert leftover pending after_turn grains to skipped (Edge omit / failed merge).
 * Does not overwrite filled or already-skipped.
 */
export function drainPendingAfterTurnGrains(
  doc: InterviewResponse,
  messageId: string,
  templateIds?: readonly string[],
  reason = 'Analysis incomplete — left pending; marked skipped so Soft Decision does not hang.',
): InterviewResponse {
  const turns = { ...doc.analysis.turns }
  const row = { ...(turns[messageId] ?? {}) }
  const ids = templateIds?.length
    ? afterTurnTemplateIds(templateIds)
    : Object.keys(row).filter((id) => afterTurnTemplateIds([id]).length > 0)
  let changed = false
  for (const templateId of ids) {
    const prev = row[templateId]
    if (!prev || prev.status !== 'pending') continue
    row[templateId] = {
      ...prev,
      status: 'skipped',
      result: null,
      dimensions: [],
      justification: reason,
      confidence: 'low',
    }
    changed = true
  }
  if (!changed) return doc
  turns[messageId] = row
  return saveInterviewResponse({
    ...doc,
    analysis: { ...doc.analysis, turns },
  })
}

/** Drain all pending after_turn grains across messages (topic leave / pass). */
export function drainAllPendingAfterTurnGrains(
  doc: InterviewResponse,
  reason?: string,
): InterviewResponse {
  let next = doc
  for (const messageId of Object.keys(doc.analysis.turns)) {
    next = drainPendingAfterTurnGrains(next, messageId, undefined, reason)
  }
  return next
}

export type CompactAfterTurnGrain = {
  status: string
  dimensions?: AnalysisGrainStub['dimensions']
  justification?: string
  evidence?: string[]
  evidenceRefs?: AnalysisGrainStub['evidenceRefs']
}

/** Compact analysis.turns for this topic — leave jobs cite these instead of re-scoring. */
export function compactAfterTurnPack(
  doc: InterviewResponse,
  topicId: string,
): Record<string, Record<string, CompactAfterTurnGrain>> {
  const out: Record<string, Record<string, CompactAfterTurnGrain>> = {}
  const topicMessageIds = new Set(
    (doc.messages ?? []).filter((m) => m.topicId === topicId).map((m) => m.id),
  )
  for (const [messageId, row] of Object.entries(doc.analysis.turns ?? {})) {
    if (!topicMessageIds.has(messageId)) continue
    const packed: Record<string, CompactAfterTurnGrain> = {}
    for (const [templateId, grain] of Object.entries(row ?? {})) {
      packed[templateId] = {
        status: grain.status,
        ...(grain.dimensions ? { dimensions: grain.dimensions } : {}),
        ...(grain.justification ? { justification: grain.justification } : {}),
        ...(grain.evidence?.length ? { evidence: grain.evidence } : {}),
        ...(grain.evidenceRefs?.length ? { evidenceRefs: grain.evidenceRefs } : {}),
      }
    }
    if (Object.keys(packed).length) out[messageId] = packed
  }
  return out
}

export function writeTopicEndStub(
  doc: InterviewResponse,
  input: {
    topicId: string
    targets: Array<{ key: string }>
    templateIds: readonly string[]
    /** Remark: pending overwrites filled / skipped so leftover can re-run. */
    resetFilled?: boolean
  },
): InterviewResponse {
  const prev = doc.analysis.topics[input.topicId]
  const byTemplate: Record<string, AnalysisGrainStub> = { ...(prev?.byTemplate ?? {}) }
  let order = Object.keys(byTemplate).length
  for (const templateId of input.templateIds) {
    if (!templateId) continue
    const existing = byTemplate[templateId]
    if (
      !input.resetFilled &&
      (existing?.status === 'filled' || existing?.status === 'skipped')
    ) {
      continue
    }
    byTemplate[templateId] = {
      templateId,
      hostRef: input.topicId,
      grain: 'topic_end',
      order: existing?.order ?? order++,
      status: 'pending',
      result: null,
      justification: '',
    }
  }
  const targets: TopicEndStub['targets'] = { ...(prev?.targets ?? {}) }
  for (const t of input.targets) {
    if (input.resetFilled) {
      targets[t.key] = { key: t.key, value: null, filled: false }
      continue
    }
    if (targets[t.key]?.filled) continue
    if (!targets[t.key]) {
      targets[t.key] = { key: t.key, value: null, filled: false }
    }
  }
  const stillPending = Object.values(byTemplate).some((g) => g.status === 'pending')
  const stub: TopicEndStub = {
    byTemplate,
    synthesisText: input.resetFilled ? null : prev?.synthesisText ?? null,
    targets,
    status: stillPending ? 'stubbed' : (prev?.status === 'filled' ? 'filled' : 'stubbed'),
  }
  return saveInterviewResponse({
    ...doc,
    analysis: {
      ...doc.analysis,
      topics: { ...doc.analysis.topics, [input.topicId]: stub },
    },
  })
}

export function mergeFilledTopicEnd(
  doc: InterviewResponse,
  topicId: string,
  filled: {
    synthesisText: string
    targets: TopicEndStub['targets']
    byTemplate: Record<string, AnalysisGrainStub>
  },
): InterviewResponse {
  const prev = doc.analysis.topics[topicId]
  const byTemplate: Record<string, AnalysisGrainStub> = {
    ...(prev?.byTemplate ?? {}),
  }
  for (const [templateId, grain] of Object.entries(filled.byTemplate ?? {})) {
    const incomingStatus = grain.status
    const status: AnalysisGrainStub['status'] =
      incomingStatus === 'skipped' || incomingStatus === 'pending'
        ? incomingStatus
        : 'filled'
    byTemplate[templateId] = {
      ...byTemplate[templateId],
      ...grain,
      templateId: grain.templateId || templateId,
      grain: 'topic_end',
      status,
    }
  }
  // Drain leftover pending topic_end stubs the model omitted.
  for (const [templateId, grain] of Object.entries(byTemplate)) {
    if (grain.status !== 'pending') continue
    byTemplate[templateId] = {
      ...grain,
      status: 'skipped',
      result: null,
      justification:
        grain.justification?.trim() ||
        'Omitted at topic_end — marked skipped.',
      confidence: 'low',
    }
  }
  const topic: TopicEndStub = {
    byTemplate,
    synthesisText: filled.synthesisText,
    targets: { ...(prev?.targets ?? {}), ...filled.targets },
    status: 'filled',
  }
  const saved = saveInterviewResponse({
    ...doc,
    analysis: {
      ...doc.analysis,
      topics: { ...doc.analysis.topics, [topicId]: topic },
    },
  })
  const topicMessageIds = (saved.messages ?? [])
    .filter((m) => m.topicId === topicId)
    .map((m) => m.id)
  let next = saved
  for (const messageId of topicMessageIds) {
    next = drainPendingAfterTurnGrains(
      next,
      messageId,
      undefined,
      'Leftover after_turn still pending at topic_end — marked skipped so the report is not stuck partial.',
    )
  }
  return next
}

/** Merge Edge interview-tool-assess grains + AssessorBotPackage into response. */
export function mergeToolAssessResult(
  doc: InterviewResponse,
  hostRef: string,
  result: {
    grains: Record<string, AnalysisGrainStub>
    package?: unknown
  },
): InterviewResponse {
  const tools = { ...doc.analysis.tools }
  const row = { ...(tools[hostRef] ?? {}) }
  for (const [templateId, grain] of Object.entries(result.grains ?? {})) {
    const incomingStatus = grain.status
    const status: AnalysisGrainStub['status'] =
      incomingStatus === 'skipped' || incomingStatus === 'pending'
        ? incomingStatus
        : 'filled'
    row[templateId] = {
      ...row[templateId],
      ...grain,
      templateId: grain.templateId || templateId,
      hostRef: grain.hostRef || hostRef,
      grain: 'after_tool',
      status,
    }
  }
  tools[hostRef] = row
  const toolPackages = {
    ...(doc.analysis.toolPackages ?? {}),
    ...(result.package != null ? { [hostRef]: result.package } : {}),
  }
  return saveInterviewResponse({
    ...doc,
    analysis: { ...doc.analysis, tools, toolPackages },
  })
}

/** Write pending after_tool grain slots (Next free-pass). */
export function writePendingAfterToolGrains(
  doc: InterviewResponse,
  input: {
    hostRef: string
    templateIds: readonly string[]
    /** Remark: pending overwrites filled / skipped so leftover can re-run. */
    resetFilled?: boolean
  },
): InterviewResponse {
  const tools = { ...doc.analysis.tools }
  const row = { ...(tools[input.hostRef] ?? {}) }
  let order = Object.keys(row).length
  for (const templateId of input.templateIds) {
    const prev = row[templateId]
    if (
      !input.resetFilled &&
      (prev?.status === 'filled' || prev?.status === 'skipped')
    ) {
      continue
    }
    row[templateId] = {
      templateId,
      hostRef: input.hostRef,
      grain: 'after_tool',
      order: order++,
      status: 'pending',
      result: null,
      justification: '',
    }
  }
  tools[input.hostRef] = row
  return saveInterviewResponse({
    ...doc,
    analysis: { ...doc.analysis, tools },
  })
}

/**
 * Forfeit: leftover pending after_tool → skipped.
 *
 * `onlyIds` scopes the settle to the templates one mark job owns. Without it a
 * failing job settles grains belonging to jobs that have not run yet — the mark
 * chain is serial, so the first failure would strand every later stage.
 */
export function skipPendingToolGrains(
  doc: InterviewResponse,
  hostRef: string,
  reason = 'Stage forfeited — remaining marks skipped.',
  onlyIds?: readonly string[],
): InterviewResponse {
  const tools = { ...doc.analysis.tools }
  const row = { ...(tools[hostRef] ?? {}) }
  const scope = onlyIds?.length ? new Set(onlyIds) : null
  let changed = false
  for (const [id, grain] of Object.entries(row)) {
    if (grain.status !== 'pending') continue
    if (scope && !scope.has(id)) continue
    row[id] = {
      ...grain,
      status: 'skipped',
      justification: reason,
      confidence: 'low',
    }
    changed = true
  }
  if (!changed) return doc
  tools[hostRef] = row
  return saveInterviewResponse({
    ...doc,
    analysis: { ...doc.analysis, tools },
  })
}

/** Keep the newest rows; a long sitting must not grow localStorage without bound. */
const MARK_TRACE_LIMIT = 200

/**
 * Record one marking attempt so a finished attempt can say which stage failed and why.
 *
 * Every failure mode used to collapse into the same drain string, making an HTTP 500,
 * a timeout, an abort, and a thrown parse error indistinguishable after the fact.
 */
export function appendMarkTrace(
  doc: InterviewResponse,
  row: Omit<MarkTraceRow, 'at'> & { at?: string },
): InterviewResponse {
  const rows = [...(doc.analysis.markTrace ?? []), { ...row, at: row.at ?? nowIso() }]
  return saveInterviewResponse({
    ...doc,
    analysis: {
      ...doc.analysis,
      markTrace: rows.slice(-MARK_TRACE_LIMIT),
    },
  })
}

/** Stages that did not mark, newest first — the "what went wrong" read. */
export function failedMarkStages(
  doc: InterviewResponse,
): Array<{ hostRef: string; stage: string; status: MarkStageStatus; error?: string; at: string }> {
  const out: Array<{
    hostRef: string
    stage: string
    status: MarkStageStatus
    error?: string
    at: string
  }> = []
  for (const row of doc.analysis.markTrace ?? []) {
    if (row.failed) {
      out.push({
        hostRef: row.hostRef,
        stage: row.kind || 'request',
        status: 'failed',
        error: row.failed,
        at: row.at,
      })
    }
    for (const stage of row.stages ?? []) {
      if (stage.status === 'ok') continue
      out.push({
        hostRef: row.hostRef,
        stage: stage.stage,
        status: stage.status,
        error: stage.error,
        at: row.at,
      })
    }
  }
  return out.reverse()
}

/**
 * Settle every tool host still pending once no mark job is running.
 *
 * A failed assess call never merges a result, so its pending stub survives. `pendingCount`
 * stays above zero, `attemptPackageStatus` reports `marking` forever, and the report sits
 * on a spinner that will never resolve. The after_turn side already drains; tools only did
 * so on an explicit forfeit.
 */
export function drainAllPendingToolGrains(
  doc: InterviewResponse,
  reason = 'Marking did not return for this stage — marked skipped so the report is not stuck.',
): InterviewResponse {
  let next = doc
  for (const hostRef of Object.keys(doc.analysis.tools ?? {})) {
    next = skipPendingToolGrains(next, hostRef, reason)
  }
  return next
}

/** FE Decision-package stub at interview_end (no Edge rollup LLM). */
/**
 * `never` — leave peers alone (an in-job rollup that only wants a fresh score).
 * `when_idle` — settle only when no mark job is running.
 * `always` — terminal: settle whatever is left so the report is never stuck partial.
 */
export type RollupSettleMode = 'never' | 'when_idle' | 'always'

export function assembleAttemptRollup(input: {
  brief: {
    topicLibrary?: Array<{
      id?: string
      targets?: Array<{ key?: string; required?: boolean }>
    }>
    phases?: Array<{
      id?: string
      topicId?: string
      toolRef?: string
      topics?: Array<{ id?: string; targets?: Array<{ key?: string; required?: boolean }> }>
    }>
    analysis?: {
      rollup?: {
        templateId?: string
        weights?: Record<string, number | string>
        weightSections?: Record<string, string[]>
      } | null
      overrides?: {
        templateCards?: Record<
          string,
          {
            outputKind?: string
            enumValues?: string[]
            gradeable?: boolean
            decisionBucket?: string
          }
        >
      }
    }
  }
  response: InterviewResponse
  /**
   * Whether this rollup may settle grains other jobs still own.
   *
   * `when_idle` reads the in-flight count, which is never zero when the caller is
   * itself a mark job — that is why in-job rollups could never drain and an attempt
   * could sit stuck partial forever. Terminal callers pass `always`.
   */
  settleStranded?: RollupSettleMode
}): InterviewResponse {
  const { brief, response: incoming } = input
  const mode: RollupSettleMode = input.settleStranded ?? 'when_idle'
  const inflight = typeof window === 'undefined' ? 0 : markJobsInflightCount()
  const shouldSettle = mode === 'always' || (mode === 'when_idle' && inflight === 0)
  const response = shouldSettle
    ? drainAllPendingToolGrains(
        drainAllPendingAfterTurnGrains(
          incoming,
          'Leftover after_turn still pending at interview_end — marked skipped so the report is not stuck partial.',
        ),
        'Marking for this stage never returned — marked skipped so the report is not stuck partial.',
      )
    : incoming
  const weights = brief.analysis?.rollup?.weights ?? {}
  const weightSections = brief.analysis?.rollup?.weightSections ?? {}
  const templateId = brief.analysis?.rollup?.templateId ?? 'rollup.attempt.v1'
  const topicSynths = Object.entries(response.analysis.topics).map(([topicId, t]) => ({
    topicId,
    status: t.status,
    synthesisText: t.synthesisText,
    targets: t.targets,
  }))
  const toolSummaries = Object.entries(response.analysis.toolPackages ?? {}).map(
    ([hostRef, pkg]) => {
      const p = pkg as {
        summary?: string
        overall?: { passed?: boolean | null; label?: string }
        kind?: string
      }
      return {
        hostRef,
        kind: p.kind ?? null,
        summary: p.summary ?? null,
        overall: p.overall ?? null,
      }
    },
  )
  const scored = scoreAttempt({ brief, response })
  const rollup: AnalysisGrainStub = {
    templateId,
    hostRef: 'interview_end',
    grain: 'interview_end',
    order: 0,
    status: 'filled',
    result: {
      weights,
      weightSections,
      completedPhaseIds: response.completedPhaseIds,
      skippedPhaseIds: response.skippedPhaseIds,
      topics: topicSynths,
      tools: toolSummaries,
      toolGrainHosts: Object.keys(response.analysis.tools),
      softGrade: scored.softGrade,
      formGate: scored.formGate,
      artifacts: scored.artifacts,
      contributions: scored.contributions,
      pendingCount: scored.pendingCount,
      // Without these a downloaded package cannot tell "scored low" from "never marked".
      grainCounts: scored.grainCounts,
      resultStatus: scored.resultStatus,
    },
    justification:
      'FE-assembled attempt rollup: template-role soft grade + collect/narrative artifacts (no Edge narrative).',
    confidence: 'med',
  }
  return saveInterviewResponse({
    ...response,
    analysis: { ...response.analysis, rollup },
  })
}

export function markResponsePartial(
  doc: InterviewResponse,
  input: { reason: string; atPhaseId: string },
): InterviewResponse {
  return saveInterviewResponse({
    ...doc,
    analysis: {
      ...doc.analysis,
      partial: { reason: input.reason, atPhaseId: input.atPhaseId, at: nowIso() },
    },
  })
}

/** Drop messages + turn grains for one phase (Talk reset). Keeps other phases. */
export function resetPhaseInResponse(
  doc: InterviewResponse,
  phaseId: string,
  topicId: string | null,
): InterviewResponse {
  const removedIds = new Set(
    doc.messages.filter((m) => m.phaseId === phaseId).map((m) => m.id),
  )
  const messages = doc.messages.filter((m) => m.phaseId !== phaseId)
  const turns = { ...doc.analysis.turns }
  for (const id of removedIds) delete turns[id]
  const topics = { ...doc.analysis.topics }
  if (topicId && topics[topicId]) delete topics[topicId]
  const firstId = messages[0]?.id ?? null
  const lastId = messages.length ? messages[messages.length - 1]!.id : null
  return saveInterviewResponse({
    ...doc,
    messages,
    messageRange: { firstId, lastId },
    talkRuntime: null,
    analysis: { ...doc.analysis, turns, topics, partial: null },
  })
}

export function downloadInterviewResponseJson(briefId: string): void {
  const json = exportInterviewResponseJson(briefId, true)
  if (typeof document === 'undefined') return
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const name = `interview-response-${briefId.replace(/[^a-z0-9._-]+/gi, '_')}-${stamp}.json`
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}
