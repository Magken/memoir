/**
 * Interviewer day-memory types — always-on lean pack + on-demand retrieval.
 */

export type MemorySourceId =
  | 'candidate_cv'
  | 'day_transcript'
  | 'topic_synthesis'
  | 'phase_transcript'
  | 'bot_notes'
  | 'stage_artifact'
  | 'tool_run'
  | 'tool_synthesis'

export type MemoryRetrievalNeed = {
  sourceId: MemorySourceId
  /** For day_transcript / phase search. */
  query?: string
  /** For phase_transcript. */
  phaseId?: string
  reason: string
}

export type MemoryRetrievalPlan = {
  /** Empty = compose on always-on only. */
  needs: MemoryRetrievalNeed[]
  confidence: 'low' | 'med' | 'high'
}

export type MemoryHit = {
  phaseId: string
  role: string
  text: string
  at?: string
}

export type TopicSynthHit = {
  topicId: string
  text: string
}

export type RetrievedMemoryPack = {
  candidateCvNote: string | null
  dayHits: MemoryHit[]
  topicSynths: TopicSynthHit[]
  phaseHits: MemoryHit[]
  /** Standing interviewer notes (preferred name, language, durable prefs). */
  botNotes: string[]
  sourceIdsUsed: MemorySourceId[]
  stageArtifacts?: Array<{ phaseId: string; kind: string; digest: string }>
  toolRuns?: Array<{
    phaseId: string
    passed: boolean | null
    passedCount?: number
    total?: number
    failingIds: string[]
  }>
  toolSynths?: Array<{ phaseId: string; boardSummary: string }>
}

export type DayMemoryMeta = {
  continuing: boolean
  previousSectionTitle: string | null
  currentPhaseId: string
  currentTitle: string
  personaName?: string
}

export const MEMORY_BUDGETS = {
  maxNeeds: 3,
  maxNeedsReferenced: 5,
  dayTranscriptHits: 8,
  dayHitChars: 180,
  topicSynths: 3,
  topicSynthChars: 220,
  phaseTurns: 10,
  phaseHitChars: 180,
  botNotes: 12,
  stageArtifacts: 3,
  toolRuns: 3,
  toolSynths: 3,
} as const

export function memoryMaxNeeds(referenced: boolean): number {
  return referenced ? MEMORY_BUDGETS.maxNeedsReferenced : MEMORY_BUDGETS.maxNeeds
}

export function emptyRetrievedMemoryPack(): RetrievedMemoryPack {
  return {
    candidateCvNote: null,
    dayHits: [],
    topicSynths: [],
    phaseHits: [],
    botNotes: [],
    sourceIdsUsed: [],
  }
}

export function emptyMemoryPlan(): MemoryRetrievalPlan {
  return { needs: [], confidence: 'high' }
}
