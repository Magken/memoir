/**
 * Assessor Aid peel attach — a Results home kicked to chat as a composer pill,
 * not a pasted "Tell me about…" sentence.
 */
import { sittingChatErrorCopy } from '../chat/errorBubble'
import type { TalkVerifyMarkingCard } from './talkVerifyModal'

export type AidPeelAttachKind =
  | 'overall'
  | 'mix'
  | 'security'
  | 'clarity'
  | 'section'
  | 'section_chat'
  | 'section_work'
  | 'mark'

/** Compact mark payload so retrieve can bind when Results cards are not the landing modal. */
export type AidMarkSnapshot = {
  id: string
  title: string
  lane?: string
  boardSummary?: string
  justification?: string
  dimensions?: Array<{ label: string; score?: string; notes?: string }>
  evidence?: string[]
  anchorMessageId?: string
}

export type AidPeelAttach = {
  kind: AidPeelAttachKind
  id?: string
  /** Parent Results step — required so mark / radar chips open that section, not the card id. */
  sectionId?: string
  stage?: 'chat' | 'editor'
  label: string
  snapshot?: AidMarkSnapshot
}

export type AidOpenRef = {
  sectionId: string
  stage?: 'chat' | 'editor'
  label: string
}

const GENERIC_ERROR = 'Could not get an Aid reply. Try again.'

export function snapshotFromMarkCard(card: TalkVerifyMarkingCard): AidMarkSnapshot {
  const dims = Array.isArray(card.dimensions)
    ? card.dimensions
        .slice(0, 8)
        .map((dim) => ({
          label: String(dim.label ?? '').trim(),
          ...(dim.score ? { score: String(dim.score) } : {}),
          ...(dim.notes ? { notes: String(dim.notes) } : {}),
        }))
        .filter((dim) => dim.label)
    : []
  const evidence = Array.isArray(card.evidence)
    ? card.evidence.map((row) => String(row).trim()).filter(Boolean).slice(0, 4)
    : []
  const summary = String(card.boardSummary ?? card.justification ?? '').trim()
  const justification = String(card.justification ?? '').trim()
  const anchor = String(card.anchorMessageId ?? '').trim()
  return {
    id: String(card.id ?? '').trim(),
    title: String(card.title ?? '').trim() || 'this mark',
    ...(card.lane ? { lane: String(card.lane) } : {}),
    ...(summary ? { boardSummary: summary } : {}),
    ...(justification && justification !== summary ? { justification } : {}),
    ...(dims.length ? { dimensions: dims } : {}),
    ...(evidence.length ? { evidence } : {}),
    ...(anchor ? { anchorMessageId: anchor } : {}),
  }
}

export function attachFromMarkCard(
  card: TalkVerifyMarkingCard,
  home?: { sectionId?: string; stage?: 'chat' | 'editor' },
): AidPeelAttach {
  const snapshot = snapshotFromMarkCard(card)
  const lane = String(card.lane ?? '').trim()
  const sectionId = String(home?.sectionId ?? '').trim()
  return {
    kind: 'mark',
    id: snapshot.id,
    label: lane ? `${snapshot.title} · ${lane}` : snapshot.title,
    snapshot,
    ...(sectionId ? { sectionId } : {}),
    ...(home?.stage === 'editor' || home?.stage === 'chat' ? { stage: home.stage } : {}),
  }
}

export function attachFromHome(input: {
  kind: Exclude<AidPeelAttachKind, 'mark'>
  id?: string
  label: string
}): AidPeelAttach {
  const label = String(input.label ?? '').trim()
  const id = String(input.id ?? '').trim()
  return {
    kind: input.kind,
    ...(id ? { id } : {}),
    label: label || input.kind,
  }
}

export const AID_HOUSING_OVERVIEW = '__result_overview__'
export const AID_HOUSING_SECURITY = '__result_security_detail__'
export const AID_HOUSING_CLARITY = '__result_clarity_detail__'

type AidOpenSection = {
  canChat: boolean
  canEditor: boolean
  kind?: string
}

export type AidOpenTarget =
  | { action: 'overview' }
  | { action: 'security' }
  | { action: 'clarity' }
  | { action: 'review'; stepId: string; mode: 'chat' | 'editor' }
  | { action: 'none' }

function pickReviewMode(
  section: AidOpenSection,
  requested?: 'chat' | 'editor',
): 'chat' | 'editor' | null {
  if (requested === 'chat' && section.canChat) return 'chat'
  if (requested === 'editor' && section.canEditor) return 'editor'
  if (section.canEditor) return 'editor'
  if (section.canChat) return 'chat'
  return null
}

/**
 * Chip click → a real Results face. Housing ids and mark-card ids must not open
 * a blank `__edit-stage`.
 */
export function resolveAidOpenRef(
  ref: { sectionId?: string; stage?: 'chat' | 'editor' } | null | undefined,
  sections?: Record<string, AidOpenSection> | null,
): AidOpenTarget {
  const raw = String(ref?.sectionId ?? '').trim()
  if (!raw) return { action: 'none' }
  if (raw === 'overall' || raw === 'mix' || raw === AID_HOUSING_OVERVIEW) {
    return { action: 'overview' }
  }
  if (raw === 'security' || raw === '__result_security__' || raw === AID_HOUSING_SECURITY) {
    return { action: 'security' }
  }
  if (raw === 'clarity' || raw === '__result_clarity__' || raw === AID_HOUSING_CLARITY) {
    return { action: 'clarity' }
  }
  let stepId = raw
  let requested = ref?.stage
  if (raw.endsWith('::chat')) {
    stepId = raw.slice(0, -'::chat'.length)
    requested = requested ?? 'chat'
  } else if (raw.endsWith('::editor')) {
    stepId = raw.slice(0, -'::editor'.length)
    requested = requested ?? 'editor'
  }
  const section = sections?.[stepId]
  if (!section) return { action: 'none' }
  const mode = pickReviewMode(section, requested)
  if (!mode) return { action: 'none' }
  return { action: 'review', stepId, mode }
}

/** Trail chips after the reply clock — section faces can jump; marks still show the home. */
export function trailRefsFromAttach(attach: AidPeelAttach | null | undefined): AidOpenRef[] {
  if (!attach) return []
  const label = String(attach.label ?? '').trim()
  if (!label) return []
  if (attach.kind === 'overall' || attach.kind === 'mix') {
    return [{ sectionId: AID_HOUSING_OVERVIEW, label }]
  }
  if (attach.kind === 'security') {
    return [{ sectionId: AID_HOUSING_SECURITY, label }]
  }
  if (attach.kind === 'clarity') {
    return [{ sectionId: AID_HOUSING_CLARITY, label }]
  }
  if (attach.kind === 'mark') {
    const sectionId = String(attach.sectionId ?? '').trim()
    if (!sectionId) return []
    return [
      {
        sectionId,
        ...(attach.stage === 'editor' || attach.stage === 'chat' ? { stage: attach.stage } : {}),
        label,
      },
    ]
  }
  if (attach.kind === 'section_chat' && attach.id) {
    return [{ sectionId: attach.id, stage: 'chat', label }]
  }
  if (attach.kind === 'section_work' && attach.id) {
    return [{ sectionId: attach.id, stage: 'editor', label }]
  }
  if (attach.kind === 'section' && attach.id) {
    return [{ sectionId: attach.id, label }]
  }
  return []
}

export function mergeAidTrailRefs(
  composed: AidOpenRef[] | null | undefined,
  attach: AidPeelAttach | null | undefined,
): AidOpenRef[] {
  const out: AidOpenRef[] = []
  const seen = new Set<string>()
  const push = (row: AidOpenRef) => {
    const key = `${row.sectionId}:${row.stage ?? ''}:${row.label}`
    if (seen.has(key)) return
    seen.add(key)
    out.push(row)
  }
  for (const row of trailRefsFromAttach(attach)) push(row)
  for (const row of composed ?? []) {
    if (!row?.label?.trim()) continue
    push({
      sectionId: String(row.sectionId ?? '').trim(),
      ...(row.stage === 'editor' || row.stage === 'chat' ? { stage: row.stage } : {}),
      label: String(row.label).trim(),
    })
  }
  return out.slice(0, 4)
}

export function aidErrorCodeFromCatch(input: { code?: string; message?: string } | null): string {
  const code = String(input?.code ?? '').trim()
  const message = String(input?.message ?? '').trim()
  if (code === 'unknown' && /^http_\d+/.test(message)) return message
  if (
    code === 'missing_openai_key' ||
    code === 'compose_empty' ||
    code === 'not_authenticated'
  ) {
    return code
  }
  if (
    /WORKER_RESOURCE_LIMIT|WORKER_LIMIT/i.test(code) ||
    /WORKER_RESOURCE_LIMIT|WORKER_LIMIT/i.test(message)
  ) {
    return 'http_546'
  }
  if (code) return code
  if (/^http_\d+/.test(message)) return message
  if (/openai|missing_openai/i.test(message)) return 'missing_openai_key'
  return 'unknown'
}

export function aidPeelErrorCopy(code: string): string {
  const raw = String(code ?? '').trim()
  if (raw === 'missing_openai_key') {
    return 'AI is not configured on this environment (missing OpenAI key).'
  }
  if (raw === 'not_authenticated') return sittingChatErrorCopy(raw, 'aid')
  if (raw === 'http_503' || raw === 'http_502') {
    return 'Assessor Aid is restarting. Try again in a moment.'
  }
  if (raw === 'http_546' || raw === 'WORKER_RESOURCE_LIMIT' || raw === 'WORKER_LIMIT') {
    return GENERIC_ERROR
  }
  if (raw === 'compose_empty') return 'Could not write a reply from this card. Try again.'
  return GENERIC_ERROR
}

export const AID_PEEL_GENERIC_ERROR = GENERIC_ERROR
