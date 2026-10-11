import type { CandidateAssistChrome } from '../interviewBrief/candidateAssistChrome'
import type { Creator2BriefDocument } from '../interviewBrief/creator2BriefTypes'
import type { InterviewLandingSection, InterviewLandingView } from '../interviewBrief'
import type { InterviewGateProgress } from '../interviewBrief/interviewGateProgress'
import type { GatePreamble } from './gatePreamble'
import type { InterviewResponse, TalkRuntimeView } from './talkTypes'

export type InterviewRunMode = 'landing' | 'gate' | 'finished'

export type InterviewGateView = {
  phaseId: string
  /** Spoiler-safe stage label (e.g. Talk 1). */
  stageLabel: string
  /** Authored section title from the brief. */
  title: string
  /** Candidate-facing section description for this gate. */
  description: string
  kindLabel: string
  timeLabel: string
  timed: boolean
  /** Hard limit minutes when timed (drives countdown). */
  limitMinutes: number | null
  /** True when this gate is a discussion (Talk) with a TalkContext. */
  isTalk: boolean
  /** Tool mount kind for Form / Coding / Writing — null for Talk. */
  toolKind: 'form' | 'coding' | 'doc' | null
  /** Harness sample opener id (for debug / later authored probes). */
  startPromptId: string
  /** Reserved — empty on gate UI; Talk intro is the first peel chat message. */
  introMessage: string
  /** Static prep tips (not AI). */
  preamble: GatePreamble
  /**
   * Catalog Assist chrome for Form/Coding/Writing. Talk / omit → undefined (None).
   * Peel opens only when `openPeel` (`caps.chat`).
   */
  assistChrome?: CandidateAssistChrome
  /** 1-based ordinal among all gates. */
  index: number
  total: number
}

export type InterviewRunSnapshot = {
  briefId: string
  mode: InterviewRunMode
  progress: InterviewGateProgress
  gate: InterviewGateView | null
  landing: InterviewLandingView
  /** Landing sections with attempt flag merged from progress. */
  completedPhaseIds: readonly string[]
  skippedPhaseIds: readonly string[]
  /** Active Talk runtime after Start (null before Start / non-Talk). */
  talk: TalkRuntimeView | null
  /** Growing attempt JSON (transcript + analysis grains). */
  response: InterviewResponse
}

export type OpenAttemptInput = {
  briefId: string
  landing: InterviewLandingView
  /** Optional Creator-2 body; fixture used when omitted for demo brief id. */
  brief?: Creator2BriefDocument | null
}

export type PassGateInput = {
  briefId: string
  landing: InterviewLandingView
  phaseId: string
  brief?: Creator2BriefDocument | null
}

export type LeaveInput = {
  briefId: string
  landing: InterviewLandingView
  /** Active gate being left. */
  phaseId?: string | null
  /** @deprecated Prefer `forfeit` — timer-up alone must not skip. */
  timed?: boolean
  /** Explicit Forfeit this stage → skippedPhaseIds. */
  forfeit?: boolean
  brief?: Creator2BriefDocument | null
}

export type StartTalkInput = {
  briefId: string
  landing: InterviewLandingView
  phaseId: string
  brief?: Creator2BriefDocument | null
  onComposeDelta?: (fullText: string) => void
  onProgress?: (view: TalkRuntimeView) => void
}

export type TalkTurnInput = {
  briefId: string
  landing: InterviewLandingView
  text: string
  brief?: Creator2BriefDocument | null
  onComposeDelta?: (fullText: string) => void
}

export type TalkMenuAction =
  | 'copy_response_json'
  | 'download_response_json'
  | 'download_editor_tapes'
  | 'reset_talk'

export type TalkMenuInput = {
  briefId: string
  landing: InterviewLandingView
  action: TalkMenuAction
  brief?: Creator2BriefDocument | null
}

export type GateSpineSection = InterviewLandingSection

export type { InterviewResponse, TalkRuntimeView }
