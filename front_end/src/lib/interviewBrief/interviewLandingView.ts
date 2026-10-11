import type { Creator2BriefDocument } from './creator2BriefTypes'
import type { InterviewFlowStep, InterviewFlowStepKind } from './flowTimelineTypes'
import { mapCreator2BriefToTimeline } from './mapCreator2BriefToTimeline'

/** Reader chip for `kind: 'talk'` — Conversation. Code ids stay `talk`. */
export const TALK_KIND_LABEL = 'Conversation'

/** True for the landing/chip label of a talk stage (current or legacy). */
export function isTalkKindLabel(kindLabel: string): boolean {
  const k = kindLabel.trim()
  return k === TALK_KIND_LABEL || k === 'Talk' || k.toLowerCase() === 'talk'
}

const KIND_LABEL: Record<InterviewFlowStepKind, string> = {
  talk: TALK_KIND_LABEL,
  form: 'Form',
  coding: 'Coding',
  doc: 'Writing',
  wrap: 'Decision',
  unknown: 'Section',
}

const GENERIC_PURPOSE =
  /^(discussion for this role|tool section for this role|tool section)$/i

const BUILDER_TEASER =
  /\b\d+\s+(probe|target|question|test|template)s?\b| · |opens the day|closes the day|opens the interview|closes the interview|optional pack/i

const ASSESSOR_TEASER =
  /^(helps the candidate|surfaces|extracts|assess(?:es| the candidate)|welcome the candidate)\b/i

export type InterviewLandingSection = {
  id: string
  title: string
  kindLabel: string
  description: string
  tags: readonly string[]
  /** Soft estimate or hard limit minutes (candidate-facing). */
  minutes: number | null
  /** True when the section uses a hard timer. */
  timed: boolean
  /** Short chip label e.g. `6 min` / `~5 min`. */
  timeLabel: string
  /** Cumulative soft start minute along the spine (0-based). */
  timelineStartMin: number | null
  /** Cumulative soft end minute along the spine. */
  timelineEndMin: number | null
}

export type InterviewLandingView = {
  title: string
  roleTitle: string
  description: string
  ownerLabel: string
  interviewerName: string | null
  coverUrl: string | null
  /** Drive node — re-sign when the cached URL expires. */
  coverNodeId: string | null
  estimatedMinutes: number | null
  sectionCount: number
  sections: readonly InterviewLandingSection[]
  hasInProgressAttempt: boolean
}

export type InterviewLandingExtras = {
  /** Agency / company shown as the interview owner. */
  ownerLabel?: string
  /** Cover / thumbnail URL when Drive cover is available. */
  coverUrl?: string | null
  /** Drive cover node for re-signing expired thumbnails. */
  coverNodeId?: string | null
  /** Human creator display name when persona is missing. */
  interviewerName?: string | null
  /** True when the candidate already has a started attempt. */
  hasInProgressAttempt?: boolean
}

/** Reject auth emails as owner / creator chrome. */
export function isEmailLabel(value: string | null | undefined): boolean {
  if (!value) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function humanAccountLabel(value: string | null | undefined): string {
  const text = value?.trim() ?? ''
  if (!text || isEmailLabel(text)) return ''
  return text
}

function truncateDescription(raw: string, max = 420): string {
  const text = raw.replace(/\s+/g, ' ').trim()
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trim()}…`
}

function fullDescription(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim()
}

function candidateFacingDescription(brief: Creator2BriefDocument): string {
  const meta = brief.definition?.meta
  const candidate = meta?.candidateDescription?.trim()
  if (candidate) return fullDescription(candidate)

  const role = meta?.roleDescription?.trim()
  if (role && role.length <= 520 && !/\nFlow I want\b/i.test(role)) {
    return fullDescription(role)
  }

  const roleTitle = meta?.roleTitle?.trim() || 'this role'
  const minutes = meta?.proposedMinutes ?? meta?.estimatedMinutes
  const timeBit = minutes ? ` about ${minutes} minutes` : ''
  return `Welcome. This interview assesses candidates for ${roleTitle}. Expect a structured session${timeBit} with a few stages. Read the outline below, then start when you are ready.`
}

function authoredSectionBlurb(step: InterviewFlowStep): string {
  const raw =
    step.talkEditor?.summaryBlurb?.trim() ||
    step.formEditor?.summaryBlurb?.trim() ||
    step.codingEditor?.summaryBlurb?.trim() ||
    step.docEditor?.summaryBlurb?.trim() ||
    step.talkEditor?.purpose?.trim() ||
    ''
  if (!raw || BUILDER_TEASER.test(raw) || GENERIC_PURPOSE.test(raw) || ASSESSOR_TEASER.test(raw)) {
    return ''
  }
  if (raw === step.title.trim()) return ''
  return raw
}

function talkProbeExplanation(step: InterviewFlowStep): string {
  const goals = (step.probes ?? [])
    .map((p) => p.goal?.trim())
    .filter((g): g is string => Boolean(g))
  if (goals.length === 0) return ''
  if (goals.length === 1) return truncateDescription(goals[0]!, 420)
  return truncateDescription(
    `You'll cover these prompts: ${goals.join(' · ')}`,
    480,
  )
}

function toolFallbackExplanation(step: InterviewFlowStep): string {
  if (step.kind === 'form') {
    const n = step.formQuestions?.length ?? 0
    if (n > 0) {
      return `You'll answer ${n} screening question${n === 1 ? '' : 's'} before continuing.`
    }
    return 'Complete a short eligibility screen before the next stage.'
  }
  if (step.kind === 'coding') {
    return 'Solve a timed coding challenge in the workspace.'
  }
  if (step.kind === 'doc') {
    return 'Write a short design note in the workspace.'
  }
  return ''
}

/**
 * Candidate-facing section copy from structured brief fields only
 * (phase.summary.blurb, topic purpose / tool instructions, probes).
 * No invented teasers or roleDescription chrome dumps.
 */
function sectionDescription(step: InterviewFlowStep): string {
  const authored = authoredSectionBlurb(step)
  if (authored) return truncateDescription(authored, 420)

  const summary = step.summary?.trim()
  if (
    summary &&
    summary !== step.title.trim() &&
    !GENERIC_PURPOSE.test(summary) &&
    !BUILDER_TEASER.test(summary) &&
    !ASSESSOR_TEASER.test(summary)
  ) {
    return truncateDescription(summary, 420)
  }

  if (step.kind === 'talk') {
    const fromProbes = talkProbeExplanation(step)
    if (fromProbes) return fromProbes
  }

  const purpose = step.purpose?.trim()
  if (
    purpose &&
    purpose !== step.title.trim() &&
    !GENERIC_PURPOSE.test(purpose) &&
    !BUILDER_TEASER.test(purpose) &&
    !ASSESSOR_TEASER.test(purpose)
  ) {
    return truncateDescription(purpose, 420)
  }

  return toolFallbackExplanation(step)
}

function sectionTags(step: InterviewFlowStep): string[] {
  const tags: string[] = []
  if (step.isOpening) tags.push('Opening')
  if (step.isClosing) tags.push('Closing')
  for (const tag of step.tags) {
    const label = tag.label.trim()
    if (!label) continue
    if (/^no templates$/i.test(label)) continue
    if (/^\d+\s+template/i.test(label)) continue
    if (/\bmin\b/i.test(label)) continue
    if (/^\d+\s+(probe|target|question|test)s?$/i.test(label)) continue
    if (/^required$/i.test(label) && !tags.includes('Required')) tags.push('Required')
    else if (/pass|gate|fail|jump|end attempt|skip/i.test(label) && !tags.includes(label)) {
      tags.push(label)
    }
  }
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of tags) {
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
    if (out.length >= 3) break
  }
  return out
}

function sectionMinutes(step: InterviewFlowStep): {
  minutes: number | null
  timed: boolean
  timeLabel: string
} {
  const hard = step.timing?.limitMinutes ?? null
  if (step.timed && hard != null && hard > 0) {
    return { minutes: hard, timed: true, timeLabel: `${hard} min` }
  }
  const soft = step.minutes ?? step.timing?.estimatedMinutes ?? null
  if (soft != null && soft > 0) {
    return { minutes: soft, timed: Boolean(step.timed), timeLabel: step.timed ? `${soft} min` : `~${soft} min` }
  }
  return { minutes: null, timed: Boolean(step.timed), timeLabel: step.timed ? 'Timed' : '' }
}

/**
 * Candidate-facing landing model from a Creator-2 `interview_brief` body.
 * Uses timeline mapping for section titles/tags/descriptions; extras fill owner/cover/attempt.
 */
export function buildInterviewLandingView(
  brief: Creator2BriefDocument,
  extras: InterviewLandingExtras = {},
): InterviewLandingView {
  const timeline = mapCreator2BriefToTimeline(brief)
  const meta = brief.definition?.meta
  let cursor = 0
  const sections = timeline.steps
    .filter((step) => step.kind !== 'wrap' && !step.offSpine)
    .map((step) => {
      const timing = sectionMinutes(step)
      const start = timing.minutes != null ? cursor : null
      const end = timing.minutes != null ? cursor + timing.minutes : null
      if (timing.minutes != null) cursor += timing.minutes
      return {
        id: step.id,
        title: step.title.trim() || KIND_LABEL[step.kind],
        kindLabel: KIND_LABEL[step.kind] ?? 'Section',
        description: sectionDescription(step),
        tags: sectionTags(step),
        minutes: timing.minutes,
        timed: timing.timed,
        timeLabel: timing.timeLabel,
        timelineStartMin: start,
        timelineEndMin: end,
      }
    })

  const estimatedMinutes =
    meta?.proposedMinutes ??
    meta?.estimatedMinutes ??
    timeline.proposedMinutes ??
    timeline.estimatedMinutes ??
    null

  return {
    title: meta?.title?.trim() || timeline.title || 'Interview',
    roleTitle: meta?.roleTitle?.trim() || timeline.roleTitle || '',
    description: candidateFacingDescription(brief),
    ownerLabel: humanAccountLabel(extras.ownerLabel),
    interviewerName:
      brief.definition?.persona?.name?.trim() ||
      humanAccountLabel(extras.interviewerName) ||
      null,
    coverUrl: extras.coverUrl?.trim() || null,
    coverNodeId: extras.coverNodeId?.trim() || null,
    estimatedMinutes: estimatedMinutes != null && estimatedMinutes > 0 ? estimatedMinutes : null,
    sectionCount: sections.length,
    sections,
    hasInProgressAttempt: Boolean(extras.hasInProgressAttempt),
  }
}

function metaString(
  metadata: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string | null {
  if (!metadata) return null
  for (const key of keys) {
    const raw = metadata[key]
    if (typeof raw === 'string' && raw.trim()) return raw.trim()
  }
  return null
}

/** Read Drive cover node id from brief metadata (manager persist stamp). */
export function coverNodeIdFromBriefMetadata(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  return metaString(metadata, 'coverNodeId', 'cover_node_id')
}

/** Agency username stamped on brief metadata when present. */
export function ownerLabelFromBriefMetadata(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  return metaString(
    metadata,
    'accountUsername',
    'ownerUsername',
    'username',
    'account_username',
    'owner_username',
  )
}

/** Human creator display name stamped on brief metadata when present. */
export function creatorNameFromBriefMetadata(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  return metaString(metadata, 'createdByName', 'creatorName', 'created_by_name', 'creator_name')
}
