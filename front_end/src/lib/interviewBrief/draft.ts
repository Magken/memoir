import type { FlowDocument } from '../flowEditor/types'
import type { InterviewComposeSession } from './compose'
import { INTERVIEW_BRIEF_SCHEMA_VERSION, type InterviewBriefDraft } from './types'

export const INTERVIEW_BRIEF_DRAFT_KEY = 'vurify.interviewBrief.draft'
/** Keyed compose drafts: `{ activeId, byId }` — migrates legacy single draft once. */
export const INTERVIEW_BRIEF_DRAFT_MAP_KEY = 'vurify.interviewBrief.draftMap'

export type InterviewBriefDraftMap = {
  activeId: string | null
  byId: Record<string, InterviewBriefDraft>
}

export function createInterviewBriefDraft(
  title: string,
  flow: FlowDocument,
): InterviewBriefDraft {
  return {
    schemaVersion: INTERVIEW_BRIEF_SCHEMA_VERSION,
    title,
    flow,
    updatedAt: new Date().toISOString(),
  }
}

export function serializeInterviewBriefDraft(draft: InterviewBriefDraft): string {
  return JSON.stringify(draft, null, 2)
}

export function parseInterviewBriefDraft(raw: string): InterviewBriefDraft | null {
  try {
    const parsed = JSON.parse(raw) as Partial<InterviewBriefDraft>
    if (
      typeof parsed !== 'object' ||
      parsed == null ||
      typeof parsed.schemaVersion !== 'number' ||
      typeof parsed.title !== 'string' ||
      !parsed.flow ||
      !Array.isArray(parsed.flow.nodes) ||
      !Array.isArray(parsed.flow.edges)
    ) {
      return null
    }
    if (parsed.schemaVersion > INTERVIEW_BRIEF_SCHEMA_VERSION) return null
    return {
      schemaVersion: parsed.schemaVersion,
      title: parsed.title,
      flow: {
        nodes: parsed.flow.nodes,
        edges: parsed.flow.edges,
        groups: parsed.flow.groups ?? [],
        viewport: parsed.flow.viewport,
        meta: parsed.flow.meta,
      },
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export function loadInterviewBriefDraft(): InterviewBriefDraft | null {
  const map = loadInterviewBriefDraftMap()
  if (map.activeId && map.byId[map.activeId]) return map.byId[map.activeId]
  return null
}

export function saveInterviewBriefDraft(draft: InterviewBriefDraft, id?: string): void {
  if (typeof localStorage === 'undefined') return
  const map = loadInterviewBriefDraftMap()
  const key = id ?? map.activeId ?? 'legacy'
  map.byId[key] = draft
  map.activeId = key
  saveInterviewBriefDraftMap(map)
  try {
    localStorage.setItem(INTERVIEW_BRIEF_DRAFT_KEY, serializeInterviewBriefDraft(draft))
  } catch {
    // ignore
  }
}

export function clearInterviewBriefDraft(): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(INTERVIEW_BRIEF_DRAFT_KEY)
    localStorage.removeItem(INTERVIEW_BRIEF_DRAFT_MAP_KEY)
  } catch {
    // ignore
  }
}

export function loadInterviewBriefDraftMap(): InterviewBriefDraftMap {
  if (typeof localStorage === 'undefined') return { activeId: null, byId: {} }
  try {
    const raw = localStorage.getItem(INTERVIEW_BRIEF_DRAFT_MAP_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<InterviewBriefDraftMap>
      if (parsed && typeof parsed === 'object' && parsed.byId && typeof parsed.byId === 'object') {
        const byId: Record<string, InterviewBriefDraft> = {}
        for (const [id, draft] of Object.entries(parsed.byId)) {
          const normalized = parseInterviewBriefDraft(JSON.stringify(draft))
          if (normalized) byId[id] = normalized
        }
        return {
          activeId: typeof parsed.activeId === 'string' ? parsed.activeId : null,
          byId,
        }
      }
    }
    const legacy = localStorage.getItem(INTERVIEW_BRIEF_DRAFT_KEY)
    if (legacy) {
      const draft = parseInterviewBriefDraft(legacy)
      if (draft) {
        const map: InterviewBriefDraftMap = { activeId: 'legacy', byId: { legacy: draft } }
        saveInterviewBriefDraftMap(map)
        return map
      }
    }
  } catch {
    // ignore
  }
  return { activeId: null, byId: {} }
}

export function saveInterviewBriefDraftMap(map: InterviewBriefDraftMap): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(INTERVIEW_BRIEF_DRAFT_MAP_KEY, JSON.stringify(map))
  } catch {
    // Quota / private mode — ignore
  }
}

export function saveComposeSessionDraft(
  session: InterviewComposeSession,
  draft: InterviewBriefDraft,
): void {
  saveInterviewBriefDraft(draft, session.listItemId)
}

export function loadComposeSessionDraft(listItemId: string): InterviewBriefDraft | null {
  const map = loadInterviewBriefDraftMap()
  return map.byId[listItemId] ?? null
}
