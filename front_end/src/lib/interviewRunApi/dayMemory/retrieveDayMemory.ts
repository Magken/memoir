/**
 * Deterministic executor for MemoryRetrievalPlan against InterviewResponse + CV.
 */
import type { CandidateCvNote } from '../buildCandidateCvNote'
import type { InterviewResponse, InterviewResponseMessage } from '../talkTypes'
import { formatBotNotesForRetrieve, normalizeBotNotes } from './botNotes'
import {
  MEMORY_BUDGETS,
  emptyRetrievedMemoryPack,
  memoryMaxNeeds,
  type MemoryHit,
  type MemoryRetrievalPlan,
  type MemorySourceId,
  type RetrievedMemoryPack,
  type TopicSynthHit,
} from './types'
import type { ReferencedEvidencePack } from '../referencedEvidence'

function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1).trim()}…`
}

function tokens(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3)
}

function scoreText(text: string, queryTokens: string[]): number {
  if (!queryTokens.length) return 0
  const hay = text.toLowerCase()
  let score = 0
  for (const t of queryTokens) {
    if (hay.includes(t)) score += 1
  }
  return score
}

function priorMessages(
  messages: readonly InterviewResponseMessage[],
  currentPhaseId: string,
): InterviewResponseMessage[] {
  return messages.filter(
    (m) =>
      m.phaseId !== currentPhaseId &&
      (m.role === 'assistant' || m.role === 'candidate') &&
      m.text.trim(),
  )
}

function toHit(m: InterviewResponseMessage, maxChars: number): MemoryHit {
  return {
    phaseId: m.phaseId,
    role: m.role,
    text: clip(m.text, maxChars),
    at: m.at,
  }
}

function resolvePhaseId(
  needPhaseId: string | undefined,
  query: string | undefined,
  sectionIndex: ReadonlyArray<{ phaseId: string; title: string }> | undefined,
): string | null {
  if (needPhaseId?.trim()) return needPhaseId.trim()
  if (!query?.trim() || !sectionIndex?.length) return null
  const q = query.toLowerCase().trim()
  const exact = sectionIndex.find(
    (s) => s.phaseId.toLowerCase() === q || s.title.toLowerCase() === q,
  )
  if (exact) return exact.phaseId
  const hit = sectionIndex.find(
    (s) =>
      s.title.toLowerCase().includes(q) ||
      q.includes(s.title.toLowerCase()),
  )
  if (hit) return hit.phaseId
  const qTokens = q.split(/[^a-z0-9]+/i).filter((t) => t.length >= 3)
  if (!qTokens.length) return null
  let best: { phaseId: string; score: number } | null = null
  for (const s of sectionIndex) {
    const hay = s.title.toLowerCase()
    const score = qTokens.reduce((n, t) => (hay.includes(t) ? n + 1 : n), 0)
    if (score > 0 && (!best || score > best.score)) {
      best = { phaseId: s.phaseId, score }
    }
  }
  return best?.phaseId ?? null
}

/**
 * Execute a retrieval plan. Caps budgets. Never includes currentPhaseId in day/phase dumps.
 */
export function retrieveDayMemory(input: {
  plan: MemoryRetrievalPlan
  response: InterviewResponse
  currentPhaseId: string
  cv?: CandidateCvNote | null
  sectionIndex?: ReadonlyArray<{ phaseId: string; title: string }>
  referenced?: ReferencedEvidencePack | null
}): RetrievedMemoryPack {
  const out = emptyRetrievedMemoryPack()
  const used = new Set<MemorySourceId>()
  const bound = Boolean(input.referenced?.index.length)
  const cap = memoryMaxNeeds(bound)
  const needs = (input.plan.needs ?? []).slice(0, cap)
  const currentPhaseId = input.currentPhaseId.trim()
  const prior = priorMessages(input.response.messages, currentPhaseId)
  const evidence = input.referenced

  for (const need of needs) {
    const id = need.sourceId
    if (used.has(id) && id !== 'phase_transcript') continue

    if (id === 'candidate_cv') {
      const note = input.cv?.hasCv ? input.cv.note?.trim() || null : null
      if (note) {
        out.candidateCvNote = note
        used.add('candidate_cv')
      }
      continue
    }

    if (id === 'bot_notes') {
      const notes = normalizeBotNotes(input.response.botNotes)
      const lines = formatBotNotesForRetrieve(notes)
      if (lines.length) {
        out.botNotes = lines.slice(0, MEMORY_BUDGETS.botNotes)
        used.add('bot_notes')
      }
      continue
    }

    if (id === 'topic_synthesis') {
      const phaseId = resolvePhaseId(need.phaseId, need.query, input.sectionIndex)
      let entries = Object.entries(input.response.analysis.topics ?? {})
        .filter(([, stub]) => stub?.synthesisText?.trim())
        .map(([topicId, stub]) => ({
          topicId,
          text: clip(stub!.synthesisText!.trim(), MEMORY_BUDGETS.topicSynthChars),
        }))
      if (phaseId) {
        const topicIds = new Set(
          input.response.messages
            .filter((m) => m.phaseId === phaseId && m.topicId)
            .map((m) => String(m.topicId)),
        )
        const filtered = entries.filter(
          (e) => topicIds.has(e.topicId) || e.topicId === phaseId,
        )
        if (!filtered.length) continue
        entries = filtered
      }
      const qTokens = tokens(need.query ?? '')
      const ranked = qTokens.length
        ? [...entries].sort(
            (a, b) => scoreText(b.text, qTokens) - scoreText(a.text, qTokens),
          )
        : entries
      const picked: TopicSynthHit[] = ranked
        .filter((e) => !qTokens.length || scoreText(e.text, qTokens) > 0)
        .slice(0, MEMORY_BUDGETS.topicSynths)
      const finalSynths =
        picked.length > 0 ? picked : ranked.slice(-MEMORY_BUDGETS.topicSynths)
      if (finalSynths.length) {
        out.topicSynths = finalSynths
        used.add('topic_synthesis')
      }
      continue
    }

    if (id === 'day_transcript') {
      const qTokens = tokens(need.query ?? '')
      let hits = prior.map((m) => ({
        m,
        score: qTokens.length ? scoreText(m.text, qTokens) : 0,
      }))
      if (qTokens.length) {
        const matched = hits.filter((h) => h.score > 0)
        hits = matched.length
          ? matched.sort((a, b) => b.score - a.score)
          : hits.map((h, i) => ({ ...h, score: i })) // recency fallback via order
      }
      const selected = (
        qTokens.length && hits.some((h) => h.score > 0)
          ? hits
          : prior.slice(-MEMORY_BUDGETS.dayTranscriptHits).map((m) => ({ m, score: 0 }))
      )
        .slice(0, MEMORY_BUDGETS.dayTranscriptHits)
        .map((h) => toHit(h.m, MEMORY_BUDGETS.dayHitChars))
      if (selected.length) {
        out.dayHits = selected
        used.add('day_transcript')
      }
      continue
    }

    if (id === 'phase_transcript') {
      const phaseId = resolvePhaseId(need.phaseId, need.query, input.sectionIndex)
      if (!phaseId || phaseId === currentPhaseId) continue
      const turns = input.response.messages
        .filter(
          (m) =>
            m.phaseId === phaseId &&
            (m.role === 'assistant' || m.role === 'candidate') &&
            m.text.trim(),
        )
        .slice(-MEMORY_BUDGETS.phaseTurns)
        .map((m) => toHit(m, MEMORY_BUDGETS.phaseHitChars))
      if (turns.length) {
        out.phaseHits = [...out.phaseHits, ...turns]
        used.add('phase_transcript')
      }
      continue
    }

    if (id === 'stage_artifact' && evidence) {
      const phaseId = resolvePhaseId(need.phaseId, need.query, input.sectionIndex)
      const rows = evidence.candidateSafe.artifacts.filter(
        (a) => !phaseId || a.phaseId === phaseId,
      )
      if (rows.length) {
        out.stageArtifacts = [
          ...(out.stageArtifacts ?? []),
          ...rows.slice(0, MEMORY_BUDGETS.stageArtifacts),
        ]
        used.add('stage_artifact')
      }
      continue
    }

    if (id === 'tool_run' && evidence) {
      const phaseId = resolvePhaseId(need.phaseId, need.query, input.sectionIndex)
      const rows = evidence.candidateSafe.runs.filter(
        (a) => !phaseId || a.phaseId === phaseId,
      )
      if (rows.length) {
        out.toolRuns = [
          ...(out.toolRuns ?? []),
          ...rows.slice(0, MEMORY_BUDGETS.toolRuns),
        ]
        used.add('tool_run')
      }
      continue
    }

    if (id === 'tool_synthesis' && evidence) {
      const phaseId = resolvePhaseId(need.phaseId, need.query, input.sectionIndex)
      const rows = evidence.candidateSafe.synths.filter(
        (a) => !phaseId || a.phaseId === phaseId,
      )
      if (rows.length) {
        out.toolSynths = [
          ...(out.toolSynths ?? []),
          ...rows.slice(0, MEMORY_BUDGETS.toolSynths),
        ]
        used.add('tool_synthesis')
      }
    }
  }

  out.sourceIdsUsed = [...used]
  return out
}
