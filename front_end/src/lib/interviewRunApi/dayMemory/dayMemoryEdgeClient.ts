/**
 * FE client for interview-day-memory Edge (retrieval plan only).
 * On transport/plan failure → empty needs (compose on always-on only).
 */
import { getSupabase } from '../../dataApi'
import { resolveInterviewEdgeAccessToken } from '../edgeAccessToken'
import { formatMemorySourceCatalogForPlan } from './sourceCatalog'
import {
  emptyMemoryPlan,
  type DayMemoryMeta,
  type MemoryRetrievalPlan,
  type MemorySourceId,
} from './types'

export type DayMemoryPlanResult = {
  plan: MemoryRetrievalPlan
  composeMeta: {
    model: string
    sampleIdsUsed: string[]
    skipped?: boolean
  }
}

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
const BOUND_ONLY = new Set<MemorySourceId>(['stage_artifact', 'tool_run', 'tool_synthesis'])

function coercePlan(raw: unknown, referenced: boolean): MemoryRetrievalPlan {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return emptyMemoryPlan()
  const o = raw as Record<string, unknown>
  const needsIn = Array.isArray(o.needs) ? o.needs : []
  const needs = []
  const cap = referenced ? 5 : 3
  for (const n of needsIn.slice(0, cap)) {
    if (!n || typeof n !== 'object' || Array.isArray(n)) continue
    const row = n as Record<string, unknown>
    const sourceId = String(row.sourceId ?? '')
    if (!RETRIEVABLE.includes(sourceId as MemorySourceId)) continue
    if (!referenced && BOUND_ONLY.has(sourceId as MemorySourceId)) continue
    const reason = String(row.reason ?? '').trim() || 'plan'
    needs.push({
      sourceId: sourceId as MemorySourceId,
      query: typeof row.query === 'string' ? row.query.trim() || undefined : undefined,
      phaseId: typeof row.phaseId === 'string' ? row.phaseId.trim() || undefined : undefined,
      reason,
    })
  }
  const confidence =
    o.confidence === 'low' || o.confidence === 'med' || o.confidence === 'high'
      ? o.confidence
      : 'med'
  return { needs, confidence }
}

function skippedResult(): DayMemoryPlanResult {
  return {
    plan: emptyMemoryPlan(),
    composeMeta: { model: '', sampleIdsUsed: [], skipped: true },
  }
}

/**
 * Ask Edge whether to retrieve CV / day history. On transport/plan failure → empty needs.
 */
export async function planDayMemory(input: {
  surface: 'talk' | 'assist'
  candidateText: string
  lastAssistantText?: string | null
  alwaysOnMeta: DayMemoryMeta & {
    situationHint?: string
    sectionIds?: Array<{ phaseId: string; title: string }>
    standingNotes?: string | null
    referencedStages?: Array<{
      phaseId: string
      title: string
      kind: string
      available?: string[]
    }>
  }
  /** Reuse JWT from the same turn (skip repeated getSession). */
  accessToken?: string | null
  /** Fixture demo brief — allows anon guest Edge when unsigned. */
  briefId?: string | null
}): Promise<DayMemoryPlanResult> {
  try {
    const token = await resolveInterviewEdgeAccessToken(input.accessToken, input.briefId)
    if (!token) return skippedResult()

    const supabase = getSupabase()
    const { data, error } = await supabase.functions.invoke('interview-day-memory', {
      body: {
        mode: 'plan',
        surface: input.surface,
        candidateText: input.candidateText,
        lastAssistantText: input.lastAssistantText ?? null,
        alwaysOnMeta: input.alwaysOnMeta,
        availableSources: formatMemorySourceCatalogForPlan(
          Array.isArray(input.alwaysOnMeta.referencedStages) &&
            input.alwaysOnMeta.referencedStages.length > 0,
        ),
        ...(input.briefId ? { briefId: input.briefId } : {}),
      },
      headers: { Authorization: `Bearer ${token}` },
    })
    if (error) return skippedResult()

    const env = data as {
      data?: { plan?: unknown; composeMeta?: Record<string, unknown> }
      error?: unknown
    } | null
    if (env?.error) return skippedResult()

    const payload = env?.data
    const bound =
      Array.isArray(input.alwaysOnMeta.referencedStages) &&
      input.alwaysOnMeta.referencedStages.length > 0
    const plan = coercePlan(payload?.plan, bound)
    const meta = payload?.composeMeta ?? {}
    return {
      plan,
      composeMeta: {
        model: String(meta.model ?? ''),
        sampleIdsUsed: Array.isArray(meta.sampleIdsUsed)
          ? meta.sampleIdsUsed.map(String)
          : [],
      },
    }
  } catch {
    return skippedResult()
  }
}
