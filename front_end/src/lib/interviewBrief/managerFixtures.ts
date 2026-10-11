import type { LucideIcon } from 'lucide-react'
import {
  Briefcase,
  Code2,
  Layers,
  Palette,
  Tags,
} from 'lucide-react'
import type { InterviewBrief, InterviewBriefStatus } from '../assessmentApi'
import type { FlowDocument } from '../flowEditor/types'
import { estimateInterviewMinutes } from './duration'
import { briefBodyToFlow } from './mapBrief'
import {
  interviewRoleCategoryLabel,
  normalizeInterviewRoleCategoryValue,
} from './roleCategories'
import { INTERVIEW_KIND, type InterviewBriefBody, type InterviewMetaConfig } from './types'

/** List-row metadata for the Interview manager (live briefs). */
export type InterviewManagerCategory = 'engineering' | 'design' | 'product' | 'ops'

export type InterviewManagerListItem = {
  id: string
  title: string
  roleTitle: string
  status: InterviewBriefStatus
  /** Spine length — discussion + tool phases. */
  phaseCount: number
  /** Tool phases within the spine. */
  toolPhaseCount: number
  /** Auto duration from spine (discussion + tool weights). */
  estimatedMinutes: number
  /** Optional compose target duration. */
  proposedMinutes?: number
  /** Completed attempts against this brief. */
  applicantsTaken: number
  /** Attempts still in progress. */
  applicantsInProgress: number
  /** Outstanding invites (pending). */
  invitesPending: number
  updatedAt: string
  /** Optional window copy, e.g. “Opens Jul 28 · closes Aug 12”. */
  windowLabel?: string
  /** ISO open date for the application window. */
  opensAt?: string
  /** ISO close date for the application window. */
  closesAt?: string
  category: string
  /**
   * Optional cover for the list row. When set, the row shows this image
   * instead of the category Lucide mark (category stays in hover meta).
   */
  imageUrl?: string
  /** Drive cover node — re-sign when `imageUrl` expires. */
  coverNodeId?: string
  /** Last-saved Check Suite shorts — blocks Test/Publish until empty. */
  checkWarningShorts?: string[]
  /** Interview description (Overview Brief) — truncated on the manage row. */
  description?: string
}

/** CP tone for open/close chips — accent · complement (soon) · error (past) · muted. */
export type InterviewDateTone = 'open' | 'closing' | 'past' | 'muted'

export type InterviewManagerStat = {
  id: string
  label: string
  value: number
  hint?: string
}

export const INTERVIEW_MANAGER_CATEGORY_ICON: Record<InterviewManagerCategory, LucideIcon> = {
  engineering: Code2,
  design: Palette,
  product: Layers,
  ops: Briefcase,
}

export const INTERVIEW_MANAGER_CATEGORY_LABEL: Record<InterviewManagerCategory, string> = {
  engineering: 'Engineering',
  design: 'Design',
  product: 'Product',
  ops: 'Operations',
}

/** Resolve list-row icon for free-text or known catalog categories. */
export function interviewManagerCategoryIcon(category: string): LucideIcon {
  const key = normalizeManagerCategoryKey(category)
  if (key) return INTERVIEW_MANAGER_CATEGORY_ICON[key]
  const normalized = category.trim().toLowerCase()
  if (
    normalized.includes('design') ||
    normalized.includes('ux') ||
    normalized.includes('brand-creative')
  ) {
    return Palette
  }
  if (
    normalized.includes('engineer') ||
    normalized.includes('devops') ||
    normalized.includes('data-') ||
    normalized.includes('security') ||
    normalized.includes('cyber') ||
    normalized.includes('ai-') ||
    normalized.includes('architecture-software') ||
    normalized.includes('qa-')
  ) {
    return Code2
  }
  if (
    normalized.includes('product') ||
    normalized.includes('project-program') ||
    normalized.includes('analytics')
  ) {
    return Layers
  }
  if (
    normalized.includes('operation') ||
    normalized.includes('sales') ||
    normalized.includes('finance') ||
    normalized.includes('hr') ||
    normalized.includes('people') ||
    normalized.includes('admin') ||
    normalized.includes('supply') ||
    normalized.includes('talent')
  ) {
    return Briefcase
  }
  return Tags
}

/** Display label — catalog / legacy keys / free text. */
export function interviewManagerCategoryLabel(category: string): string {
  return interviewRoleCategoryLabel(category)
}

function normalizeManagerCategoryKey(category: string): InterviewManagerCategory | null {
  const normalized = category.trim().toLowerCase()
  if (!normalized) return null
  if (normalized in INTERVIEW_MANAGER_CATEGORY_ICON) {
    return normalized as InterviewManagerCategory
  }
  for (const [key, label] of Object.entries(INTERVIEW_MANAGER_CATEGORY_LABEL) as [
    InterviewManagerCategory,
    string,
  ][]) {
    if (label.toLowerCase() === normalized) return key
  }
  const catalog = normalizeInterviewRoleCategoryValue(category)
  if (catalog === 'engineering-software' || catalog.startsWith('engineering-')) return 'engineering'
  if (catalog.startsWith('design-')) return 'design'
  if (catalog === 'product-management') return 'product'
  if (catalog === 'business-operations') return 'ops'
  return null
}

/** Restore FlowDocument from Drive brief body (flow snapshot or mapped brief JSON). */
export function flowFromStoredBriefBody(
  body: Record<string, unknown> | null | undefined,
): FlowDocument | null {
  if (!body || typeof body !== 'object') return null
  const kind = typeof body.kind === 'string' ? body.kind : ''
  if (kind === 'interview_brief_flow') {
    const flow = body.flow
    if (!flow || typeof flow !== 'object' || Array.isArray(flow)) return null
    const doc = flow as FlowDocument
    if (!Array.isArray(doc.nodes) || !Array.isArray(doc.edges)) return null
    return doc
  }
  if (kind === 'interview_brief' || body.definition) {
    try {
      return briefBodyToFlow(body as unknown as InterviewBriefBody)
    } catch {
      return null
    }
  }
  return null
}

function metaFromFlow(flow: FlowDocument | null): InterviewMetaConfig | null {
  if (!flow) return null
  const metaNode = flow.nodes.find((n) => n.kind === INTERVIEW_KIND.meta)
  if (!metaNode?.config || typeof metaNode.config !== 'object') return null
  return metaNode.config as InterviewMetaConfig
}

function phaseCountsFromFlow(flow: FlowDocument | null): {
  phaseCount: number
  toolPhaseCount: number
} {
  if (!flow) return { phaseCount: 0, toolPhaseCount: 0 }
  const phases = flow.nodes.filter(
    (n) => n.kind === INTERVIEW_KIND.discussion || n.kind === INTERVIEW_KIND.tool,
  )
  return {
    phaseCount: phases.length,
    toolPhaseCount: phases.filter((n) => n.kind === INTERVIEW_KIND.tool).length,
  }
}

function readMetaString(meta: Record<string, unknown> | undefined, key: string): string {
  const v = meta?.[key]
  return typeof v === 'string' ? v.trim() : ''
}

function readCheckWarningShorts(meta: Record<string, unknown> | undefined): string[] {
  const raw = meta?.checkWarningShorts
  if (!Array.isArray(raw)) return []
  return raw.map((s) => String(s).trim()).filter(Boolean)
}

/** `null` = list row has no snapshot yet (scan the body). Empty array = takeable. */
export function listedCheckWarningShorts(
  meta: Record<string, unknown> | undefined,
): string[] | null {
  if (!meta || !Object.prototype.hasOwnProperty.call(meta, 'checkWarningShorts')) return null
  return readCheckWarningShorts(meta)
}

function readMetaNumber(meta: Record<string, unknown> | undefined, key: string): number | undefined {
  const v = meta?.[key]
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim()) {
    const n = Number.parseInt(v, 10)
    if (Number.isFinite(n)) return n
  }
  return undefined
}

/** Map a live `InterviewBrief` (+ optional body) into a manager list row. */
export function listItemFromBrief(
  brief: InterviewBrief,
  extras: Partial<
    Pick<
      InterviewManagerListItem,
      | 'phaseCount'
      | 'toolPhaseCount'
      | 'applicantsTaken'
      | 'applicantsInProgress'
      | 'invitesPending'
      | 'roleTitle'
      | 'category'
      | 'estimatedMinutes'
      | 'proposedMinutes'
      | 'imageUrl'
      | 'coverNodeId'
      | 'checkWarningShorts'
      | 'description'
    >
  > = {},
): InterviewManagerListItem {
  const flow = flowFromStoredBriefBody(brief.body ?? null)
  const flowMeta = metaFromFlow(flow)
  const counts = phaseCountsFromFlow(flow)
  const meta = brief.metadata ?? {}
  const roleTitle =
    extras.roleTitle?.trim() ||
    (typeof flowMeta?.roleTitle === 'string' ? flowMeta.roleTitle.trim() : '') ||
    readMetaString(meta, 'roleTitle') ||
    'Role'
  const categoryRaw = extras.category?.trim() || readMetaString(meta, 'category') || 'other'
  const estimatedMinutes =
    extras.estimatedMinutes ??
    (flow ? estimateInterviewMinutes(flow) : undefined) ??
    (typeof flowMeta?.estimatedMinutes === 'number' ? flowMeta.estimatedMinutes : undefined) ??
    readMetaNumber(meta, 'estimatedMinutes') ??
    45
  const proposedMinutes =
    extras.proposedMinutes ??
    (typeof flowMeta?.proposedMinutes === 'number' ? flowMeta.proposedMinutes : undefined) ??
    readMetaNumber(meta, 'proposedMinutes')

  return {
    id: brief.id,
    title: brief.title.trim() || 'Untitled interview',
    roleTitle,
    status: brief.status,
    phaseCount: extras.phaseCount ?? (counts.phaseCount || readMetaNumber(meta, 'phaseCount') || 0),
    toolPhaseCount:
      extras.toolPhaseCount ??
      (counts.toolPhaseCount || readMetaNumber(meta, 'toolPhaseCount') || 0),
    estimatedMinutes,
    proposedMinutes,
    applicantsTaken: extras.applicantsTaken ?? 0,
    applicantsInProgress: extras.applicantsInProgress ?? 0,
    invitesPending: extras.invitesPending ?? 0,
    updatedAt: brief.updatedAt ?? brief.createdAt ?? new Date().toISOString(),
    opensAt: brief.opensAt ?? undefined,
    closesAt: brief.closesAt ?? undefined,
    category: normalizeInterviewRoleCategoryValue(categoryRaw),
    imageUrl: extras.imageUrl,
    coverNodeId:
      extras.coverNodeId?.trim() ||
      readMetaString(meta, 'coverNodeId') ||
      readMetaString(meta, 'cover_node_id') ||
      undefined,
    checkWarningShorts:
      extras.checkWarningShorts ?? readCheckWarningShorts(meta),
    description:
      extras.description?.trim() ||
      readMetaString(meta, 'roleDescription') ||
      readMetaString(meta, 'description') ||
      undefined,
  }
}

export function interviewManagerStats(
  items: readonly InterviewManagerListItem[],
): InterviewManagerStat[] {
  const published = items.filter((i) => i.status === 'published').length
  const applicantsTaken = items.reduce((sum, i) => sum + i.applicantsTaken, 0)
  return [
    { id: 'total', label: 'Interviews', value: items.length },
    { id: 'published', label: 'Published', value: published },
    { id: 'taken', label: 'Applicants', value: applicantsTaken },
  ]
}

export function formatInterviewManagerDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

/** Compact chip date — month + day only (intuitive in a title row). */
export function formatInterviewManagerDateShort(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

const DAY_MS = 86_400_000
const CLOSING_SOON_DAYS = 7

export function interviewDateTone(
  iso: string | undefined,
  role: 'open' | 'close',
  now = Date.now(),
): InterviewDateTone {
  if (!iso) return 'muted'
  const time = new Date(iso).getTime()
  if (Number.isNaN(time)) return 'muted'
  if (role === 'close') {
    if (time < now) return 'past'
    if (time - now <= CLOSING_SOON_DAYS * DAY_MS) return 'closing'
    return 'open'
  }
  if (time > now) return 'open'
  return 'open'
}

export function interviewWindowFields(item: InterviewManagerListItem) {
  return {
    openIso: item.opensAt,
    closeIso: item.closesAt,
    openLabel: item.opensAt ? formatInterviewManagerDateShort(item.opensAt) : '—',
    closeLabel: item.closesAt ? formatInterviewManagerDateShort(item.closesAt) : '—',
    openTone: interviewDateTone(item.opensAt, 'open'),
    closeTone: interviewDateTone(item.closesAt, 'close'),
  }
}
