/** Talk runtime + InterviewResponse analysis grain types (FE SSOT until session wire). */

import type { DepthAccount } from '../../../../back_end/supabase/functions/_shared/interview-assessors/depthLadder.ts'
import type { InterviewerBotNote } from './dayMemory/botNotes'
import type { EditorTapeIndexEntry } from './editorCapture/types'

export type AnalysisGrainKind = 'after_turn' | 'after_tool' | 'topic_end' | 'interview_end'

export type AnalysisGrainStub = {
  templateId: string
  hostRef: string
  grain: AnalysisGrainKind
  order: number
  status: 'pending' | 'filled' | 'skipped'
  result: unknown | null
  dimensions?: Array<{
    key: string
    label: string
    score: string | number
    max?: number
    notes?: string
    depth?: DepthAccount
  }>
  justification: string
  evidence?: string[]
  evidenceRefs?: Array<{ kind: string; ref: string; t?: number; end?: number; quote?: string }>
  confidence?: 'low' | 'med' | 'high'
}

export type TopicEndTargetRow = {
  key: string
  value: unknown
  filled: boolean
  evidenceRefs?: Array<{ kind: string; ref: string; t?: number; end?: number; quote?: string }>
}

export type TopicEndStub = {
  byTemplate: Record<string, AnalysisGrainStub>
  synthesisText: string | null
  targets: Record<string, TopicEndTargetRow>
  status: 'stubbed' | 'filled'
}

export type InterviewResponseMessageKind =
  | 'opener'
  | 'follow_up'
  | 'next_probe'
  | 'soft_time'
  | 'close'
  | 'answer'
  | 'bridge'
  | 'redirect'
  | 'clarify'
  /** Tool-stage assist (navigation / restate / marking — never spoilers). */
  | 'assist'

export type InterviewResponseComposeMeta = {
  /** Copilot Apply receipts use `applied`. */
  situation: string
  missingGaps: string[]
  sampleIdsUsed: string[]
  model: string
  /** Trace of day-memory plan when used this turn (additive). */
  memoryPlan?: {
    needs: string[]
    sampleIdsUsed: string[]
    model: string
    skipped?: boolean
  }
}

/** Day-1 open spine: name-check ask alone, then first probe alone. */
export type TalkOpenBeat = 'day1_name' | 'day1_first_probe' | 'done'

export type TalkRuntimeStatus = 'idle' | 'active' | 'ready_to_pass' | 'abandoned'

export type InterviewResponseMessage = {
  id: string
  phaseId: string
  topicId: string | null
  role: 'assistant' | 'candidate' | 'system'
  text: string
  at: string
  probeId: string | null
  kind: InterviewResponseMessageKind
  /** Present on assistant turns after Edge compose (or authored opener). */
  compose?: InterviewResponseComposeMeta
}

export type InterviewResponseTalkRuntime = {
  phaseId: string
  topicId: string
  status: TalkRuntimeStatus
  activeProbeIndex: number
  followUpsOnActiveProbe: number
  probesAsked: number
  candidateTurns: number
  startedAt: number
  softTimeSent: boolean
  openBeat?: TalkOpenBeat
}

export type MarkStageStatus = 'ok' | 'skipped' | 'failed'

/** One assessor stage, as reported by Edge `meta.toolAssessTurnDiag.stages`. */
export type MarkStageEntry = {
  stage: string
  status: MarkStageStatus
  ms: number
  error?: string
}

/**
 * One marking attempt for one host, persisted so a finished attempt explains itself.
 *
 * Console-only diagnostics cannot answer "which stage failed, hours ago?", which is
 * why every failure used to collapse into the same generic drain string.
 */
export type MarkTraceRow = {
  at: string
  hostRef: string
  kind: string
  phaseId?: string
  /** Where the row came from: the Edge trace, an FE fallback, or an FE mark job. */
  source: 'edge' | 'fe_fallback' | 'fe_job'
  totalMs?: number
  model?: string | null
  /** Error code when the whole call failed rather than one stage. */
  failed?: string
  stages: MarkStageEntry[]
}

export type InterviewResponse = {
  schemaVersion: 1
  briefId: string
  attemptId: string
  startedAt: string
  updatedAt: string
  phasePointer: string | null
  completedPhaseIds: string[]
  skippedPhaseIds: string[]
  messages: InterviewResponseMessage[]
  messageRange: { firstId: string | null; lastId: string | null }
  /** Persisted Talk runtime for resume / download package. */
  talkRuntime: InterviewResponseTalkRuntime | null
  /**
   * Standing interviewer notes (preferred name, language, working prefs, durable facts).
   * Survives across sections; fed to memory plan as `bot_notes`.
   */
  botNotes?: InterviewerBotNote[]
  /**
   * Index of Editor History Capture tapes (bodies live in the sidecar store).
   * Additive — missing on older attempt dumps.
   */
  editorTapes?: Record<string, EditorTapeIndexEntry>
  /**
   * Coarse session-telemetry index (body lives in the sidecar store).
   * Additive — missing on older attempt dumps.
   */
    sessionTelemetry?: import('./sessionTelemetry/types').SessionTelemetryIndexEntry
    /**
     * Optional support note the candidate volunteered on landing.
     * Staff-only. Not a diagnosis. Never inject into Talk compose.
     */
    sittingDeclaration?: import('./sittingDeclaration').SittingDeclaration
    /**
     * Landing terms checkbox. Carried onto a fresh Start so the attempt JSON
     * still has the acceptance stamp.
     */
    sittingTerms?: import('./sittingDeclaration').SittingTermsAck
    analysis: {
    turns: Record<string, Record<string, AnalysisGrainStub>>
    tools: Record<string, Record<string, AnalysisGrainStub>>
    /** AssessorBotPackage per tool hostRef (reviewer dump). */
    toolPackages?: Record<string, unknown>
    topics: Record<string, TopicEndStub>
    /** Interview-end session signals (sig.clarity.v1 / sig.security.v1). Not a Soft Decision source. */
    signals?: Record<string, AnalysisGrainStub>
    rollup: AnalysisGrainStub | null
    partial: { reason: string; atPhaseId: string; at: string } | null
    /**
     * Per-stage marking trace. Additive — missing on older attempt dumps.
     * Bounded in `appendMarkTrace` so a long sitting cannot grow localStorage without limit.
     */
    markTrace?: MarkTraceRow[]
  }
}

export type TalkProbe = {
  id: string
  goal: string
  required: boolean
  order: number
  hint: string | null
}

export type TalkTarget = {
  key: string
  label: string
  required: boolean
  datatype: string
  description?: string
  enumValues?: string[]
}

export type TalkRubricCard = {
  id: string
  title: string
  outputKind: string
  justificationPolicy?: string
  /**
   * Authored framing — what this template judges and what it explicitly does not.
   * `subtitle` is deliberately not carried: it is scheduling chrome (`Runs on ...`).
   */
  details?: string
  /** Scalar: what the number measures. */
  criterion?: string
  dimensions: Array<{
    key: string
    label: string
    options: string[]
    optionNotes?: string[]
    evidenceModel?: string
    polarity?: string
  }>
  taxonomy: string[]
  enumValues: string[]
}

export type TalkContext = {
  briefId: string
  phaseId: string
  topicId: string
  title: string
  estimatedMinutes: number | null
  isOpening: boolean
  isClosing: boolean
  required: boolean
  when: unknown | null
  onFail: unknown | null
  /** Authored earlier-stage RAG bind. Omit/null = memory of earlier sections. */
  references?: { phaseIds: string[] } | null
  persona: {
    name: string
    voice: string
    behaviourPrompt: string
  }
  guardrails: string[]
  systemGoals: string[]
  topic: {
    label: string
    purpose: string
    behaviourPromptOverride: string | null
    probes: TalkProbe[]
    targets: TalkTarget[]
    depth: {
      maxFollowUps: number
      targetMinutes: number | null
      maxProbes: number | null
      minCandidateTurns: number
    }
    analysis: {
      attachPack: string | null
      templateIds: string[]
      cards?: TalkRubricCard[]
    }
  }
  opener: {
    probeId: string
    text: string
    /** Authored probe hint — candidate-facing expectation when spoken. */
    hint: string | null
    source: 'authored_probe' | 'fallback_bank'
  }
}

export type TalkMessageKind =
  | 'opener'
  | 'follow_up'
  | 'next_probe'
  | 'soft_time'
  | 'close'
  | 'answer'
  | 'redirect'
  | 'clarify'

export type TalkMessage = {
  id: string
  role: 'assistant' | 'candidate'
  text: string
  at: number
  probeId: string | null
  kind: TalkMessageKind
}

export type TalkRuntimeState = {
  phaseId: string
  status: TalkRuntimeStatus
  activeProbeIndex: number
  followUpsOnActiveProbe: number
  probesAsked: number
  candidateTurns: number
  startedAt: number
  softTimeSent: boolean
  draft: string
  messages: TalkMessage[]
  /** Day-1 beat sequencing — `done` after first probe (or mid-day opens). */
  openBeat: TalkOpenBeat
}

export type TalkRuntimeView = {
  context: TalkContext
  state: TalkRuntimeState
  canPass: boolean
  depthLabel: string
  /** Last Edge/transport error for UI (cleared on successful turn). */
  error?: string | null
  busy?: boolean
}

export type TalkDecisionSituation =
  | 'open'
  | 'follow_up'
  | 'deepen'
  | 'probe_gap'
  | 'move_probe'
  | 'off_topic'
  | 'soft_time'
  | 'close'
  | 'clarify'

export type TalkDecision = {
  situation: TalkDecisionSituation
  missingGaps: string[]
  activeProbeId: string | null
  nextProbeGoal: string | null
  canPass: boolean
  signals: CandidateSignal[]
  /** Compact after_turn cues for Edge compose (additive). */
  composeCues?: string[]
  /** Optional difficulty hint for compose (additive). */
  difficulty?: 'easy' | 'medium' | 'hard'
  nextState: TalkRuntimeState
}

/** Candidate turn signals — additive; Edge decide.accept list must stay in sync. */
export type CandidateSignal =
  | 'collective_we'
  | 'vague'
  | 'short'
  | 'question'
  | 'substantive'
  | 'gibberish'
  | 'non_answer'
  | 'social_rapport'
  | 'meta_clarify'
  | 'ask_for_example'
