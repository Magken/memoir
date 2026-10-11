/**
 * Talk Soft Decision Verify modal — maps InterviewResponse analysis → review UI.
 * Section title/description prefer the live brief when topicId or phaseId match.
 * Unmatched attempt topics use the sidecar, never briefSections[index].
 * Soft Decision bucket labels stay on the general marking card only.
 */
import type { SoftGradeBucket } from './scoreAttempt'
import type {
  AnalysisGrainStub,
  InterviewResponse,
  InterviewResponseMessage,
  TopicEndStub,
} from './talkTypes'
import type { AttemptScorePackage } from './scoreAttempt'
import { catalogSchedulesAfterTurn, catalogTemplate } from '../interviewBrief/analysisTemplateCatalog'
import type { RollupMaps } from '../interviewBrief/rollupFolders'
import {
  formatTalkVerifyDepthLabel,
  type TalkVerifyBriefSection,
} from './talkVerifyFromBrief'
import { applyContributionsToCards } from './toolVerifyShared'
import { depthReviewNote } from '../../../../back_end/supabase/functions/_shared/interview-assessors/depthLadder.ts'
import type { RecruiterBucketNote, RecruiterPasteBurst } from './recruiterProcess'

export type TalkVerifyMarkingCard = {
  id: string
  kind: 'utterance' | 'topic' | 'general'
  /** Candidate message id or first message in topic range. */
  anchorMessageId: string
  messageIds: string[]
  topicId?: string
  title: string
  lane: 'delivery' | 'content' | 'general'
  emphasized: boolean
  dimensions: Array<{ key: string; label: string; score: string; notes?: string }>
  justification?: string
  evidence: string[]
  evidenceRefs?: Array<{ kind: string; ref: string; t?: number; end?: number; quote?: string }>
  confidence?: string
  synthesisText?: string
  /** Extra history-player tags from tape_process `result.tags`. */
  tapeTags?: Array<{ t?: number; label?: string; kind?: string }>
  /** False for clarify / meta turns — card is for assessor location only. */
  scored?: boolean
  status?: 'pending' | 'filled' | 'skipped'
  templateId?: string
  hostRef?: string
  unit?: number | null
  towardOverall?: number | null
  boardSummary?: string
  boardSummaryDetail?: string
  bucketNotes?: RecruiterBucketNote[]
  pasteBursts?: RecruiterPasteBurst[]
}

export type TalkVerifySectionMeta = {
  topicId: string
  phaseId?: string
  title: string
  description: string
  /** Live Talk depth line (e.g. Probe 1 of 3 · Follow-up 0 of 2). */
  depthLabel: string
  messageIds: string[]
}

export type TalkVerifyTalkSectionsFile = {
  byTopicId: Record<
    string,
    {
      phaseId?: string
      title: string
      description: string
      probeLabels?: Record<string, string>
    }
  >
}

export type TalkVerifyModal = {
  fixtureId: string
  sectionKey: string
  sectionLabel: string
  /** Primary Talk section title (first topic) — for promote chrome. */
  title: string
  description: string
  depthLabel: string
  personaName: string
  /** Authored Talk phases in transcript order. */
  talkSections: TalkVerifySectionMeta[]
  messages: InterviewResponseMessage[]
  softBucket: SoftGradeBucket | null
  cards: TalkVerifyMarkingCard[]
  /** Full package for copy/download menu. */
  packageJson: unknown
}

function topicTemplateTitle(templateId: string): string {
  const label = catalogTemplate(templateId)?.label?.trim()
  if (label) return label.replace(/\s*\(.*\)$/, '').trim() || label
  if (templateId.startsWith('custom.')) {
    const slug = templateId.replace(/^custom\./, '').replace(/\.v\d+$/, '').replace(/[_-]+/g, ' ')
    return slug.replace(/\b\w/g, (c) => c.toUpperCase())
  }
  if (templateId.startsWith('synth.')) return 'Topic summary'
  return templateId.replace(/^iv\./, '').replace(/\.v1$/, '').replace(/[_-]+/g, ' ')
}

function messageIdsFromRefs(
  refs: Array<{ kind?: string; ref?: string }> | undefined,
  fallback: string[],
): string[] {
  const ids = (refs ?? [])
    .filter((r) => (r.kind ?? 'message') === 'message' && String(r.ref || '').trim())
    .map((r) => String(r.ref).trim())
  const unique = [...new Set(ids)]
  return unique.length ? unique : fallback
}

function targetMessageIds(stub: TopicEndStub, fallback: string[]): string[] {
  const refs: Array<{ kind?: string; ref?: string }> = []
  for (const t of Object.values(stub.targets ?? {})) {
    if (Array.isArray(t.evidenceRefs)) refs.push(...t.evidenceRefs)
  }
  return messageIdsFromRefs(refs, fallback)
}

function humanSlotLabel(key: string): string {
  return key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function targetRows(
  stub: TopicEndStub,
  labels?: Array<{ key: string; label: string }> | null,
): TalkVerifyMarkingCard['dimensions'] {
  const targets = stub.targets ?? {}
  const named = new Map((labels ?? []).map((row) => [row.key, row.label]))
  return Object.entries(targets).map(([key, t]) => ({
    key,
    label: named.get(key)?.trim() || humanSlotLabel(key),
    score: t.filled ? String(t.value ?? 'filled') : 'missing',
  }))
}

function dimRows(grain: AnalysisGrainStub | null | undefined): TalkVerifyMarkingCard['dimensions'] {
  if (!grain?.dimensions?.length) return []
  return grain.dimensions.map((d) => {
    const notes = [String(d.notes ?? '').trim(), depthReviewNote(d.depth)]
      .filter(Boolean)
      .join(' ')
    return {
      key: String(d.key ?? ''),
      label: String(d.label ?? d.key ?? ''),
      score: String(d.score ?? ''),
      notes: notes || undefined,
    }
  })
}

function evidenceList(grain: AnalysisGrainStub | null | undefined): string[] {
  if (!Array.isArray(grain?.evidence)) return []
  return grain.evidence.map((e) => String(e)).filter(Boolean).slice(0, 6)
}

function pickBriefSection(
  topicId: string,
  phaseId: string | undefined,
  briefSections: TalkVerifyBriefSection[] | null | undefined,
): TalkVerifyBriefSection | null {
  if (!briefSections?.length) return null
  const byTopic = briefSections.find((s) => s.topicId && s.topicId === topicId)
  if (byTopic) return byTopic
  if (phaseId) {
    const byPhase = briefSections.find((s) => s.phaseId === phaseId)
    if (byPhase) return byPhase
  }
  return null
}

function buildTalkSections(
  talkMessages: InterviewResponseMessage[],
  meta: TalkVerifyTalkSectionsFile | null | undefined,
  briefSections?: TalkVerifyBriefSection[] | null,
): TalkVerifySectionMeta[] {
  const order: string[] = []
  for (const m of talkMessages) {
    if (!m.topicId) continue
    if (!order.includes(m.topicId)) order.push(m.topicId)
  }

  return order.map((topicId) => {
    const topicMsgs = talkMessages.filter((m) => m.topicId === topicId)
    const phaseId = topicMsgs[0]?.phaseId
    const fromBrief = pickBriefSection(topicId, phaseId, briefSections)
    const authored = meta?.byTopicId?.[topicId]
    const probeCount =
      fromBrief?.probeCount ??
      Math.max(1, new Set(topicMsgs.map((m) => m.probeId).filter(Boolean)).size || 1)
    const maxFollowUps = fromBrief?.maxFollowUps ?? 0
    return {
      topicId,
      phaseId: fromBrief?.phaseId || authored?.phaseId || phaseId,
      title:
        fromBrief?.title?.trim() ||
        authored?.title?.trim() ||
        `Topic · ${topicId}`,
      description:
        fromBrief?.description?.trim() ||
        authored?.description?.trim() ||
        '',
      depthLabel: formatTalkVerifyDepthLabel(probeCount, maxFollowUps),
      messageIds: topicMsgs.map((m) => m.id),
    }
  })
}

/**
 * Build Talk Verify review modal for interviewDelivery / interviewContent.
 */
export function buildTalkVerifyModal(input: {
  fixtureId: string
  sectionKey: string
  sectionLabel: string
  response: InterviewResponse
  scored: AttemptScorePackage
  /** Live brief Talk sections (preferred — same copy as gate Talk). */
  briefTalkSections?: TalkVerifyBriefSection[] | null
  /** Fixture sidecar fallback when brief sections are unavailable. */
  talkSectionsMeta?: TalkVerifyTalkSectionsFile | null
}): TalkVerifyModal {
  const talkMessages = (input.response.messages ?? []).filter(
    (m) => m.role === 'assistant' || m.role === 'candidate',
  )
  const softBucket = input.scored.softGrade.byWeight[input.sectionKey] ?? null
  const emphasizeDelivery = input.sectionKey === 'interviewDelivery'
  const emphasizeContent = input.sectionKey === 'interviewContent'

  const talkSections = buildTalkSections(
    talkMessages,
    input.talkSectionsMeta ?? null,
    input.briefTalkSections ?? null,
  )
  const primary = talkSections[0]

  const cards: TalkVerifyMarkingCard[] = []

  // Utterance cards from after_turn delivery/question grains (both may share one stretch)
  for (const msg of talkMessages) {
    if (msg.role !== 'candidate') continue
    const turnMap = input.response.analysis.turns?.[msg.id]
    if (!turnMap) continue
    const delivery = turnMap['iv.delivery.v1']
    const question = turnMap['iv.question.v1']

    // Clarifying turns: show an unscored location card for answer-only skips,
    // and still show filled clarify-eligible grains (e.g. question quality).
    if (delivery?.status === 'skipped') {
      const quote =
        delivery.evidence?.[0]?.trim() ||
        msg.text?.trim() ||
        ''
      cards.push({
        id: `utterance:${msg.id}:clarify`,
        kind: 'utterance',
        anchorMessageId: msg.id,
        messageIds: [msg.id],
        topicId: msg.topicId ?? undefined,
        title: 'Clarification',
        lane: 'delivery',
        emphasized: false,
        scored: false,
        dimensions: [],
        justification:
          delivery.justification?.trim() ||
          'Not scored - answer rubrics skipped on clarification (clarify-eligible templates may still score).',
        evidence: quote ? [quote] : [],
        confidence: delivery.confidence,
      })
    } else if (question?.status === 'skipped' && delivery?.status !== 'filled') {
      const quote =
        question.evidence?.[0]?.trim() ||
        msg.text?.trim() ||
        ''
      cards.push({
        id: `utterance:${msg.id}:clarify`,
        kind: 'utterance',
        anchorMessageId: msg.id,
        messageIds: [msg.id],
        topicId: msg.topicId ?? undefined,
        title: 'Clarification',
        lane: 'delivery',
        emphasized: false,
        scored: false,
        dimensions: [],
        justification:
          question.justification?.trim() ||
          'Not scored - clarifying or non-answer turn.',
        evidence: quote ? [quote] : [],
        confidence: question.confidence,
      })
    }

    if (delivery?.status === 'filled') {
      cards.push({
        id: `utterance:${msg.id}:delivery`,
        kind: 'utterance',
        anchorMessageId: msg.id,
        messageIds: [msg.id],
        topicId: msg.topicId ?? undefined,
        title: 'Delivery',
        lane: 'delivery',
        emphasized: emphasizeDelivery,
        scored: true,
        status: 'filled',
        templateId: 'iv.delivery.v1',
        hostRef: msg.id,
        dimensions: dimRows(delivery),
        justification: delivery.justification?.trim() || undefined,
        evidence: evidenceList(delivery),
        confidence: delivery.confidence,
      })
    }
    if (question?.status === 'filled') {
      cards.push({
        id: `utterance:${msg.id}:question`,
        kind: 'utterance',
        anchorMessageId: msg.id,
        messageIds: [msg.id],
        topicId: msg.topicId ?? undefined,
        title: 'Closing question',
        lane: 'delivery',
        emphasized: emphasizeDelivery,
        scored: true,
        status: 'filled',
        templateId: 'iv.question.v1',
        hostRef: msg.id,
        dimensions: dimRows(question),
        justification: question.justification?.trim() || undefined,
        evidence: evidenceList(question),
        confidence: question.confidence,
      })
    }
  }

  // Topic cards: every leftover grade template (filled or honest skip), custom.*,
  // targets, and synth as narrative — not a score.
  for (const [topicId, topic] of Object.entries(input.response.analysis.topics ?? {})) {
    const stub = topic as TopicEndStub
    const range = talkMessages.filter((m) => m.topicId === topicId).map((m) => m.id)
    const anchor =
      talkMessages.find((m) => m.topicId === topicId && m.role === 'candidate')?.id ||
      range[0] ||
      ''
    if (!anchor) continue
    const fromBrief = pickBriefSection(
      topicId,
      talkMessages.find((m) => m.topicId === topicId)?.phaseId,
      input.briefTalkSections,
    )
    for (const [templateId, grain] of Object.entries(stub.byTemplate ?? {})) {
      if (templateId.startsWith('synth.')) continue
      if (templateId.startsWith('sig.')) continue
      if (!grain) continue
      const skipped = grain.status === 'skipped'
      const pending = grain.status === 'pending'
      const afterTurn = catalogSchedulesAfterTurn(templateId)
      const citeIds = messageIdsFromRefs(grain.evidenceRefs, range)
      cards.push({
        id: `topic:${topicId}:${templateId}`,
        kind: 'topic',
        anchorMessageId: citeIds[0] || anchor,
        messageIds: citeIds,
        topicId,
        title: topicTemplateTitle(templateId),
        lane: afterTurn ? 'delivery' : 'content',
        emphasized: pending || skipped
          ? false
          : afterTurn
            ? emphasizeDelivery
            : emphasizeContent,
        scored: !skipped && !pending,
        status: grain.status,
        templateId,
        hostRef: topicId,
        dimensions: dimRows(grain),
        justification:
          grain.justification?.trim() || (pending ? 'Scoring in progress' : undefined),
        evidence: evidenceList(grain),
        confidence: grain.confidence,
      })
    }
    const targetDims = targetRows(stub, fromBrief?.targets)
    const targetCite = targetMessageIds(stub, range)
    if (targetDims.length) {
      cards.push({
        id: `topic:${topicId}:targets`,
        kind: 'topic',
        anchorMessageId: targetCite[0] || anchor,
        messageIds: targetCite,
        topicId,
        title: 'Targets',
        lane: 'content',
        emphasized: emphasizeContent,
        scored: true,
        dimensions: targetDims,
        justification: targetDims.some((d) => d.score === 'missing')
          ? 'Some required extract slots are still empty.'
          : 'Topic extract slots filled from the transcript.',
        evidence: targetDims.filter((d) => d.score !== 'missing').map((d) => `${d.label}: ${d.score}`),
      })
    }
    const synthGrain = Object.entries(stub.byTemplate ?? {}).find(([id]) =>
      id.startsWith('synth.'),
    )?.[1]
    const synthText = stub.synthesisText?.trim() || synthGrain?.justification?.trim()
    if (synthText) {
      cards.push({
        id: `topic:${topicId}:synth`,
        kind: 'topic',
        anchorMessageId: anchor,
        messageIds: range,
        topicId,
        title: 'Topic summary',
        lane: 'general',
        emphasized: false,
        scored: false,
        dimensions: [],
        justification: synthText,
        evidence: evidenceList(synthGrain),
        synthesisText: synthText,
      })
    }
  }

  // General Soft Decision marking at end (bucket label/summary belong here only)
  cards.push({
    id: `general:${input.sectionKey}`,
    kind: 'general',
    anchorMessageId: talkMessages[talkMessages.length - 1]?.id ?? '',
    messageIds: talkMessages.map((m) => m.id),
    title: softBucket?.label ?? input.sectionLabel,
    lane: 'general',
    emphasized: true,
    dimensions: (softBucket?.axes ?? []).map((a) => ({
      key: a.key,
      label: a.label,
      score: `${Math.round(a.unit * 100)}%`,
    })),
    justification: softBucket?.summary,
    evidence: softBucket?.summaryDetail ? [softBucket.summaryDetail] : [],
  })

  const personaGuess =
    talkMessages.find((m) => m.role === 'assistant')?.text?.match(/I'm ([^,]+)/)?.[1]?.trim() ||
    'Interviewer'

  return {
    fixtureId: input.fixtureId,
    sectionKey: input.sectionKey,
    sectionLabel: input.sectionLabel,
    title: primary?.title || 'Discussion',
    description: primary?.description || '',
    depthLabel: primary?.depthLabel || 'Discussion',
    personaName: personaGuess,
    talkSections,
    messages: talkMessages,
    softBucket,
    cards: applyContributionsToCards(cards, input.scored.contributions),
    packageJson: {
      sectionKey: input.sectionKey,
      softBucket,
      messageCount: talkMessages.length,
      cardCount: cards.length,
      fixtureId: input.fixtureId,
      talkSections: talkSections.map((s) => ({
        topicId: s.topicId,
        title: s.title,
      })),
    },
  }
}

export function isTalkVerifySectionKey(key: string, rollup?: RollupMaps | null): boolean {
  if (key === 'interviewDelivery' || key === 'interviewContent') return true
  if (key === 'codingTests' || key === 'codingMethod' || key === 'essay' || key === 'formMark') {
    return false
  }
  const templates = rollup?.weightTemplates?.[key] ?? []
  if (templates.some((id) => String(id).startsWith('iv.'))) return true
  if (
    templates.some((id) => {
      const s = String(id)
      return s.startsWith('mark.code') || s.startsWith('mark.doc') || s.startsWith('mark.form')
    })
  ) {
    return false
  }
  return false
}

/** Keep one Talk phase (utterances + marks) for a result-spine section. */
export function sliceTalkVerifyModal(
  modal: TalkVerifyModal,
  phaseId: string,
  display?: { title?: string; description?: string },
): TalkVerifyModal | null {
  const id = phaseId.trim()
  if (!id) return null
  const messages = modal.messages.filter((row) => row.phaseId === id)
  if (!messages.length) return null
  const messageIds = new Set(messages.map((row) => row.id))
  const talkSections = modal.talkSections.filter(
    (row) => row.phaseId === id || row.messageIds.some((mid) => messageIds.has(mid)),
  )
  const cards = modal.cards.filter((card) =>
    card.messageIds.some((mid) => messageIds.has(mid)),
  )
  const primary = talkSections[0]
  const title = display?.title?.trim() || primary?.title || modal.title
  return {
    ...modal,
    title,
    description: display?.description?.trim() || primary?.description || modal.description,
    depthLabel: primary?.depthLabel || modal.depthLabel,
    talkSections,
    messages,
    cards,
    packageJson: {
      ...(typeof modal.packageJson === 'object' && modal.packageJson
        ? modal.packageJson
        : {}),
      phaseId: id,
      messageCount: messages.length,
      cardCount: cards.length,
    },
  }
}

/** Participant Results row — Verify overlay with result spine (not a Soft Decision bucket). */
export const RESULT_REVIEW_SECTION_KEY = 'resultReview'

export function isResultReviewSectionKey(key: string): boolean {
  return key === RESULT_REVIEW_SECTION_KEY
}

export function isCodingVerifySectionKey(key: string, rollup?: RollupMaps | null): boolean {
  if (key === 'codingTests' || key === 'codingMethod') return true
  const templates = rollup?.weightTemplates?.[key] ?? []
  return templates.some((id) => String(id).startsWith('mark.code'))
}

export function isEssayVerifySectionKey(key: string, rollup?: RollupMaps | null): boolean {
  if (key === 'essay') return true
  const templates = rollup?.weightTemplates?.[key] ?? []
  return templates.some((id) => String(id).startsWith('mark.doc'))
}

export function isFormVerifySectionKey(key: string, rollup?: RollupMaps | null): boolean {
  if (key === 'formMark') return true
  const templates = rollup?.weightTemplates?.[key] ?? []
  return templates.some((id) => String(id).startsWith('mark.form'))
}

export type ToolVerifyKind = 'coding' | 'essay' | 'form'

export function resolveToolVerifyKind(key: string, rollup?: RollupMaps | null): ToolVerifyKind | null {
  if (isCodingVerifySectionKey(key, rollup)) return 'coding'
  if (isEssayVerifySectionKey(key, rollup)) return 'essay'
  if (isFormVerifySectionKey(key, rollup)) return 'form'
  return null
}
