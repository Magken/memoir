/**
 * Interview continuity for stage assist — same assessor as Talk, not a fresh bot.
 * Reuses InterviewResponse + prior Talk memory (not a second memory system).
 */
import { buildPriorTalkMemory } from './buildPriorTalkMemory'
import { formatStandingNotes, normalizeBotNotes } from './dayMemory/botNotes'
import type { InterviewResponse } from './talkTypes'

export type AssistDayContinuity = {
  /** True when prior Talk/assist or a previous spine section exists. */
  continuing: boolean
  /** Immediate prior section title (handoff). */
  previousSectionTitle: string | null
  /** Compact prior Talk memory note (same pack Talk Edge uses). */
  priorNote: string | null
  /** Standing interviewer notes (preferred name, language, durable prefs). */
  standingNotes: string | null
  /**
   * Recent turns from earlier phases (Talk + assist) so mid-turn can sound continuous.
   * Excludes the current phase (those live in historyTail).
   */
  dayHistoryTail: Array<{
    role: 'assistant' | 'candidate'
    text: string
    phaseId: string
    at?: string
  }>
}

const MAX_DAY_TURNS = 14
const MAX_TURN_LEN = 220

function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1).trim()}…`
}

/**
 * Build continuity pack for Form/Coding/Doc assist from the shared InterviewResponse.
 */
export function buildAssistDayContinuity(input: {
  response: InterviewResponse
  currentPhaseId: string
  previousSectionTitle?: string | null
}): AssistDayContinuity {
  const currentPhaseId = input.currentPhaseId.trim()
  const previousSectionTitle = input.previousSectionTitle?.trim() || null

  const memory = buildPriorTalkMemory({
    response: input.response,
    currentPhaseId,
    // Assist stages have no Talk topic — use a sentinel so topic filter does not drop phases.
    currentTopicId: `assist.${currentPhaseId}`,
  })

  const dayHistoryTail = input.response.messages
    .filter(
      (m) =>
        m.phaseId !== currentPhaseId &&
        (m.role === 'assistant' || m.role === 'candidate') &&
        m.text.trim(),
    )
    .slice(-MAX_DAY_TURNS)
    .map((m) => ({
      role: m.role as 'assistant' | 'candidate',
      text: clip(m.text, MAX_TURN_LEN),
      phaseId: m.phaseId,
      ...(m.at?.trim() ? { at: m.at.trim() } : {}),
    }))

  const continuing = Boolean(
    previousSectionTitle || memory.hasMemory || dayHistoryTail.length > 0,
  )

  return {
    continuing,
    previousSectionTitle,
    priorNote: memory.hasMemory ? memory.note : null,
    standingNotes: formatStandingNotes(normalizeBotNotes(input.response.botNotes)),
    dayHistoryTail,
  }
}
