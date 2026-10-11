/**
 * Broader-context retrieval when the planner skips/fails, or compose asks for more.
 * Not a keyword matrix — used only when judgment failed or model requests packs.
 * Prior-section binding: resolve phase_transcript / day queries from section index.
 */
import {
  MEMORY_BUDGETS,
  emptyRetrievedMemoryPack,
  memoryMaxNeeds,
  type MemoryRetrievalNeed,
  type MemoryRetrievalPlan,
  type MemorySourceId,
  type RetrievedMemoryPack,
} from './types'

const RETRIEVABLE: MemorySourceId[] = [
  'candidate_cv',
  'day_transcript',
  'topic_synthesis',
  'phase_transcript',
  'bot_notes',
  'stage_artifact',
  'tool_run',
  'tool_synthesis',
]

export type SectionIndexEntry = { phaseId: string; title: string }

export type PriorSectionOpts = {
  continuing?: boolean
  previousSectionTitle?: string | null
  previousPhaseId?: string | null
  currentPhaseId?: string
  sectionIndex?: ReadonlyArray<SectionIndexEntry>
}

/** Match a section title / phaseId query against the spine index. */
export function matchPhaseInSectionIndex(
  query: string | undefined,
  sectionIndex: ReadonlyArray<SectionIndexEntry> | undefined,
): string | null {
  if (!query?.trim() || !sectionIndex?.length) return null
  const q = query.toLowerCase().trim()
  const exact = sectionIndex.find(
    (s) =>
      s.phaseId.toLowerCase() === q ||
      s.title.toLowerCase() === q,
  )
  if (exact) return exact.phaseId
  const contains = sectionIndex.find(
    (s) =>
      s.title.toLowerCase().includes(q) ||
      q.includes(s.title.toLowerCase()),
  )
  if (contains) return contains.phaseId
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

/** Immediate prior spine phase (or title match). */
export function resolvePreviousPhaseId(opts: PriorSectionOpts): string | null {
  if (opts.previousPhaseId?.trim()) return opts.previousPhaseId.trim()
  const idx = opts.sectionIndex
  const cur = opts.currentPhaseId?.trim()
  if (idx?.length && cur) {
    const i = idx.findIndex((s) => s.phaseId === cur)
    if (i > 0) return idx[i - 1]!.phaseId
  }
  if (opts.previousSectionTitle?.trim()) {
    return matchPhaseInSectionIndex(opts.previousSectionTitle, idx)
  }
  return null
}

export function sectionIndexFromLanding(
  sections: ReadonlyArray<{ id: string; title: string; kindLabel?: string }>,
): SectionIndexEntry[] {
  return sections.map((s) => ({
    phaseId: s.id,
    title: s.title.trim() || s.kindLabel?.trim() || s.id,
  }))
}

/**
 * Fill phaseId / query on cross-section needs using the spine + previous section.
 * Condition-aligned (not keyword): only binds fields that are already missing.
 */
export function bindPriorSectionNeeds(
  needs: MemoryRetrievalNeed[],
  opts: PriorSectionOpts,
): MemoryRetrievalNeed[] {
  const prevId = resolvePreviousPhaseId(opts)
  const prevTitle = opts.previousSectionTitle?.trim() || null
  return needs.map((n) => {
    if (n.sourceId === 'phase_transcript') {
      const fromQuery = matchPhaseInSectionIndex(n.query, opts.sectionIndex)
      const phaseId = n.phaseId?.trim() || fromQuery || prevId || undefined
      const query =
        n.query?.trim() ||
        (phaseId
          ? opts.sectionIndex?.find((s) => s.phaseId === phaseId)?.title
          : undefined) ||
        prevTitle ||
        undefined
      return { ...n, phaseId, query }
    }
    if (n.sourceId === 'day_transcript' && !n.query?.trim() && prevTitle) {
      return { ...n, query: prevTitle }
    }
    if (n.sourceId === 'topic_synthesis' && !n.query?.trim() && prevTitle) {
      return { ...n, query: prevTitle }
    }
    return n
  })
}

/** When the memory plan Edge call fails/skips — search a capped broader pack once. */
export function broaderContextPlan(
  candidateText: string,
  opts?: PriorSectionOpts,
): MemoryRetrievalPlan {
  const q = candidateText.replace(/\s+/g, ' ').trim().slice(0, 120)
  const prevId = resolvePreviousPhaseId(opts ?? {})
  const prevTitle = opts?.previousSectionTitle?.trim() || null
  const needs: MemoryRetrievalNeed[] = [
    { sourceId: 'bot_notes', reason: 'broader_standing_notes' },
    { sourceId: 'candidate_cv', reason: 'broader_after_plan_skip' },
  ]
  if (prevId || prevTitle) {
    needs.push({
      sourceId: 'phase_transcript',
      phaseId: prevId || undefined,
      query: prevTitle || undefined,
      reason: 'broader_prior_section',
    })
  } else {
    needs.push({
      sourceId: 'day_transcript',
      reason: 'broader_after_plan_skip',
      query: q || prevTitle || undefined,
    })
  }
  if (needs.length < MEMORY_BUDGETS.maxNeeds) {
    needs.push({
      sourceId: 'day_transcript',
      reason: 'broader_after_plan_skip',
      query: q || prevTitle || undefined,
    })
  }
  if (needs.length < MEMORY_BUDGETS.maxNeeds) {
    needs.push({
      sourceId: 'topic_synthesis',
      reason: 'broader_after_plan_skip',
      query: prevTitle || undefined,
    })
  }
  return {
    confidence: 'low',
    needs: bindPriorSectionNeeds(needs, opts ?? {}).slice(0, MEMORY_BUDGETS.maxNeeds),
  }
}

export function mergeMemoryNeeds(
  base: MemoryRetrievalNeed[],
  extra: MemoryRetrievalNeed[],
): MemoryRetrievalNeed[] {
  const out: MemoryRetrievalNeed[] = []
  const seen = new Set<string>()
  for (const n of [...base, ...extra]) {
    if (!RETRIEVABLE.includes(n.sourceId)) continue
    const key = `${n.sourceId}|${n.phaseId ?? ''}|${n.query ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      sourceId: n.sourceId,
      reason: n.reason?.trim() || 'need_retrieval',
      query: n.query?.trim() || undefined,
      phaseId: n.phaseId?.trim() || undefined,
    })
    if (out.length >= MEMORY_BUDGETS.maxNeedsReferenced) break
  }
  return out
}

export function mergeRetrievedPacks(
  a: RetrievedMemoryPack,
  b: RetrievedMemoryPack,
): RetrievedMemoryPack {
  const sourceIdsUsed = [
    ...new Set([...a.sourceIdsUsed, ...b.sourceIdsUsed]),
  ] as MemorySourceId[]
  return {
    candidateCvNote: b.candidateCvNote || a.candidateCvNote,
    dayHits: [...a.dayHits, ...b.dayHits].slice(0, MEMORY_BUDGETS.dayTranscriptHits),
    topicSynths: [...a.topicSynths, ...b.topicSynths].slice(0, MEMORY_BUDGETS.topicSynths),
    phaseHits: [...a.phaseHits, ...b.phaseHits].slice(0, MEMORY_BUDGETS.phaseTurns),
    botNotes: [...new Set([...a.botNotes, ...b.botNotes])].slice(0, MEMORY_BUDGETS.botNotes),
    sourceIdsUsed,
    stageArtifacts: [...(a.stageArtifacts ?? []), ...(b.stageArtifacts ?? [])].slice(
      0,
      MEMORY_BUDGETS.stageArtifacts,
    ),
    toolRuns: [...(a.toolRuns ?? []), ...(b.toolRuns ?? [])].slice(0, MEMORY_BUDGETS.toolRuns),
    toolSynths: [...(a.toolSynths ?? []), ...(b.toolSynths ?? [])].slice(
      0,
      MEMORY_BUDGETS.toolSynths,
    ),
  }
}

export function coerceNeedRetrievalNeeds(
  raw: unknown,
  referenced = false,
): MemoryRetrievalNeed[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return []
  const needsIn = Array.isArray((raw as { needs?: unknown }).needs)
    ? ((raw as { needs: unknown[] }).needs)
    : []
  const needs: MemoryRetrievalNeed[] = []
  for (const n of needsIn.slice(0, memoryMaxNeeds(referenced))) {
    if (!n || typeof n !== 'object' || Array.isArray(n)) continue
    const row = n as Record<string, unknown>
    const sourceId = String(row.sourceId ?? '')
    if (!RETRIEVABLE.includes(sourceId as MemorySourceId)) continue
    needs.push({
      sourceId: sourceId as MemorySourceId,
      reason: String(row.reason ?? 'compose_need_retrieval').trim() || 'compose_need_retrieval',
      query: typeof row.query === 'string' ? row.query.trim() || undefined : undefined,
      phaseId: typeof row.phaseId === 'string' ? row.phaseId.trim() || undefined : undefined,
    })
  }
  return needs
}

export type ReferencedStageBind = {
  phaseId: string
  kind?: string
}

/**
 * Merge kind-aware needs for authored section references.
 * No-op when refs are empty. Does not wipe CV / bot_notes / other planner needs.
 */
export function bindReferencedStageNeeds(
  needs: MemoryRetrievalNeed[],
  refs: readonly ReferencedStageBind[],
  currentPhaseId?: string,
): MemoryRetrievalNeed[] {
  const current = currentPhaseId?.trim() || ''
  const bound = refs.filter((r) => r.phaseId.trim() && r.phaseId !== current)
  if (!bound.length) return needs
  const extra: MemoryRetrievalNeed[] = []
  for (const r of bound) {
    const kind = String(r.kind ?? '').toLowerCase()
    if (kind === 'talk' || kind === 'discussion') {
      extra.push({
        sourceId: 'phase_transcript',
        phaseId: r.phaseId,
        reason: 'referenced_stage',
      })
      extra.push({
        sourceId: 'topic_synthesis',
        phaseId: r.phaseId,
        reason: 'referenced_stage',
      })
    } else if (kind === 'coding' || kind === 'code') {
      extra.push({
        sourceId: 'tool_run',
        phaseId: r.phaseId,
        reason: 'referenced_stage',
      })
      extra.push({
        sourceId: 'stage_artifact',
        phaseId: r.phaseId,
        reason: 'referenced_stage',
      })
      extra.push({
        sourceId: 'tool_synthesis',
        phaseId: r.phaseId,
        reason: 'referenced_stage',
      })
    } else {
      extra.push({
        sourceId: 'stage_artifact',
        phaseId: r.phaseId,
        reason: 'referenced_stage',
      })
      extra.push({
        sourceId: 'tool_synthesis',
        phaseId: r.phaseId,
        reason: 'referenced_stage',
      })
    }
  }
  return mergeMemoryNeeds(needs, extra).slice(0, memoryMaxNeeds(true))
}

export function emptyPack(): RetrievedMemoryPack {
  return emptyRetrievedMemoryPack()
}
