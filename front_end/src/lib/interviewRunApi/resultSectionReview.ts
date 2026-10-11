/**
 * Result-spine section review — collapsed radars/tags plus expand targets
 * (Talk chat vs tool editor) from sitting read + optional attempt fixture.
 */
import { catalogTemplate } from '../interviewBrief/analysisTemplateCatalog'
import type { Creator2BriefDocument } from '../interviewBrief/creator2BriefTypes'
import { foldersForTemplate } from '../interviewBrief/rollupFolders'
import type { InterviewFlowStepKind } from '../interviewBrief/flowTimelineTypes'
import { buildCodingVerifyModal, type CodingVerifyModal } from './codingVerifyModal'
import { buildEssayVerifyModal, type EssayVerifyModal } from './essayVerifyModal'
import { buildFormVerifyModal, type FormVerifyModal } from './formVerifyModal'
import { buildAssistVerifyModal } from './assistVerifyModal'
import { attemptHostRef } from './toolVerifyShared'
import { tapesPackFromStore } from './editorCapture/store'
import type { EditorTapesPack } from './editorCapture/types'
import type { InterviewOutputCardBucket, ResultOverview } from './fixtures/output-cards/outputCardFixture'
import { getInterviewResponse } from './interviewResponse'
import { scoreAttempt, type AttemptScorePackage } from './scoreAttempt'
import { sittingReadReport, type SittingReadTag } from './sittingReadMarkup'
import { talkSectionsMetaFromBrief } from './talkVerifyFromBrief'
import {
  buildTalkVerifyModal,
  sliceTalkVerifyModal,
  type TalkVerifyModal,
  type TalkVerifyTalkSectionsFile,
} from './talkVerifyModal'
import type { InterviewResponse } from './talkTypes'
import {
  stageMixForPhase,
  sectionCollapsedSummary,
  sessionMixTags,
  buildPhaseResultHomes,
} from './resultHomes'
import type {
  ResultEnumHome,
  ResultPassFailHome,
  ResultScalarHome,
  ResultTaxonomyHome,
} from './resultHomes'
import { markLaneForTemplate } from './markBeats'

export type ResultReviewRadarAxis = {
  key: string
  label: string
  unit: number
  /** The assessor's plain-language reason for this axis. Printed beside the radar. */
  notes?: string
  /** Ordinal the assessor picked, e.g. `strong`. Shown as-is next to the reason. */
  score?: string
  /** Authored gloss — what this criterion measures. Essay rubric rows carry it. */
  criterion?: string
  /** True when this spoke has no grain score. */
  absent?: boolean
  instanceCount?: number
  decisiveCount?: number
}

export type ResultReviewRadar = {
  id: string
  label: string
  templateId?: string
  /** Collapsed charts: Work (artifact) vs Conversation (Assist / Talk). */
  face?: 'conversation' | 'work'
  axes: ResultReviewRadarAxis[]
}

export type ResultSectionReview = {
  stepId: string
  kind: InterviewFlowStepKind
  title: string
  summary: string
  scoreWhy: string
  tags: SittingReadTag[]
  radars: ResultReviewRadar[]
  taxonomies: ResultTaxonomyHome[]
  enums: ResultEnumHome[]
  scalars: ResultScalarHome[]
  passFails: ResultPassFailHome[]
  canChat: boolean
  canEditor: boolean
  attemptPhaseId: string | null
}

export type ResultReviewAttempt = {
  fixtureId: string
  response: InterviewResponse
  scored: AttemptScorePackage
  talkSectionsMeta: TalkVerifyTalkSectionsFile | null
  editorTapes: EditorTapesPack | null
}

export type ResultReviewSource = {
  brief: Creator2BriefDocument
  attempt: ResultReviewAttempt
  /** `undefined` = not built yet; `null` = build failed. */
  fullTalk?: TalkVerifyModal | null
}

export type ResultReviewPack = {
  sections: Record<string, ResultSectionReview>
  talk: Record<string, TalkVerifyModal>
  coding: Record<string, CodingVerifyModal>
  essay: Record<string, EssayVerifyModal>
  form: Record<string, FormVerifyModal>
  source?: ResultReviewSource
}

export function liveResultReviewAttempt(input: {
  briefId: string
  brief: Creator2BriefDocument
  scored?: AttemptScorePackage
}): ResultReviewAttempt {
  const response = getInterviewResponse(input.briefId)
  return {
    fixtureId: input.briefId,
    response,
    scored: input.scored ?? scoreAttempt({ brief: input.brief, response }),
    talkSectionsMeta: talkSectionsMetaFromBrief(input.brief),
    editorTapes: null,
  }
}

type ReviewStep = {
  id: string
  title: string
  kind: InterviewFlowStepKind
  summary?: string
}

function tagUnit(tag: SittingReadTag): number | null {
  const pct = tag.label.trim().match(/^(\d+(?:\.\d+)?)\s*%$/)
  if (pct) return Number(pct[1]) / 100
  const frac = tag.label.trim().match(/^(\d+)\s*\/\s*(\d+)$/)
  if (frac) {
    const den = Number(frac[2])
    if (den > 0) return Number(frac[1]) / den
  }
  return null
}

function tagByHint(
  tags: readonly SittingReadTag[],
  hint: string,
): SittingReadTag | undefined {
  const key = hint.trim().toLowerCase()
  return tags.find((tag) => (tag.hint ?? '').trim().toLowerCase() === key)
}

function radarFromTemplate(
  id: string,
  label: string,
  templateId: string,
  unit: number,
  extra?: ResultReviewRadarAxis,
): ResultReviewRadar | null {
  const dims = catalogTemplate(templateId)?.dimensions ?? []
  const axes: ResultReviewRadarAxis[] = dims.map((dim) => ({
    key: dim.key,
    label: dim.label,
    unit,
  }))
  if (extra) axes.push(extra)
  if (axes.length < 3) return null
  return { id, label, axes }
}

function partUnit(
  bucket: InterviewOutputCardBucket | undefined,
  stepId: string,
  kind: InterviewFlowStepKind,
  kindIndex: number,
): number | null {
  const parts = bucket?.parts ?? []
  const byId = parts.find((part) => part.id === stepId)
  if (typeof byId?.unit === 'number') return byId.unit
  const sameKind = parts.filter((part) => part.kind === kind)
  const at = sameKind[kindIndex]
  if (typeof at?.unit === 'number') return at.unit
  if (typeof bucket?.unit === 'number' && sameKind.length <= 1) return bucket.unit
  return null
}

export function talkPhaseIdsFromResponse(response: InterviewResponse): string[] {
  const ids: string[] = []
  for (const message of response.messages ?? []) {
    if (message.role !== 'assistant' && message.role !== 'candidate') continue
    if (message.kind === 'assist') continue
    if (!message.phaseId || ids.includes(message.phaseId)) continue
    ids.push(message.phaseId)
  }
  return ids
}

function responseKnowsPhase(response: InterviewResponse, phaseId: string): boolean {
  if (response.completedPhaseIds?.includes(phaseId)) return true
  if (response.skippedPhaseIds?.includes(phaseId)) return true
  if (response.editorTapes?.[phaseId]) return true
  return (response.messages ?? []).some((row) => row.phaseId === phaseId)
}

export function alignAttemptPhaseId(
  step: ReviewStep,
  steps: readonly ReviewStep[],
  response: InterviewResponse | null | undefined,
): string | null {
  if (!response) return null
  if (responseKnowsPhase(response, step.id)) return step.id
  const talkIds = talkPhaseIdsFromResponse(response)
  const completed = response.completedPhaseIds ?? []
  const toolIds = completed.filter((id) => !talkIds.includes(id))
  if (step.kind === 'talk') {
    const index = steps.filter((row) => row.kind === 'talk').findIndex((row) => row.id === step.id)
    return index >= 0 ? (talkIds[index] ?? null) : null
  }
  if (step.kind === 'form' || step.kind === 'coding' || step.kind === 'doc') {
    const toolSteps = steps.filter(
      (row) => row.kind === 'form' || row.kind === 'coding' || row.kind === 'doc',
    )
    const index = toolSteps.findIndex((row) => row.id === step.id)
    return index >= 0 ? (toolIds[index] ?? null) : null
  }
  return null
}

function phaseHasChat(
  response: InterviewResponse | null | undefined,
  phaseId: string | null,
  kind: InterviewFlowStepKind,
): boolean {
  if (!response || !phaseId) return false
  const messages = response.messages ?? []
  if (kind === 'talk') {
    return messages.some(
      (row) =>
        row.phaseId === phaseId &&
        (row.role === 'assistant' || row.role === 'candidate') &&
        row.kind !== 'assist',
    )
  }
  return messages.some((row) => row.phaseId === phaseId && row.kind === 'assist')
}

/**
 * Theme SAMPLE packs have no live response. Paint Delivery / Content / method / writing
 * from tags so the cards still show a spider. Live `briefId` always uses catalog grains.
 */
function themeFallbackRadars(
  step: ReviewStep,
  tags: readonly SittingReadTag[],
  overview: ResultOverview,
  kindIndex: number,
): ResultReviewRadar[] {
  const byWeight = overview.softGrade?.byWeight
  if (step.kind === 'talk') {
    const deliveryUnit =
      tagUnit(tagByHint(tags, 'Delivery') ?? { signal: 'good', label: '' }) ??
      partUnit(byWeight?.interviewDelivery, step.id, 'talk', kindIndex)
    const contentUnit =
      tagUnit(tagByHint(tags, 'Content') ?? { signal: 'good', label: '' }) ??
      partUnit(byWeight?.interviewContent, step.id, 'talk', kindIndex)
    const out: ResultReviewRadar[] = []
    if (typeof deliveryUnit === 'number') {
      const radar = radarFromTemplate(
        `${step.id}:delivery`,
        'Delivery',
        'iv.delivery.v1',
        deliveryUnit,
      )
      if (radar) out.push({ ...radar, templateId: 'iv.delivery.v1' })
    }
    if (typeof contentUnit === 'number') {
      const radar =
        radarFromTemplate(`${step.id}:content`, 'Content', 'iv.content.v1', contentUnit) ??
        radarFromTemplate(`${step.id}:ownership`, 'Ownership', 'iv.ownership.v1', contentUnit, {
          key: 'content',
          label: 'Content',
          unit: contentUnit,
        })
      if (radar) {
        out.push({
          ...radar,
          templateId: radar.id.endsWith(':ownership') ? 'iv.ownership.v1' : 'iv.content.v1',
        })
      }
    }
    return out
  }
  if (step.kind === 'coding') {
    const methodUnit =
      tagUnit(tagByHint(tags, 'Method') ?? { signal: 'good', label: '' }) ??
      partUnit(byWeight?.codingMethod, step.id, 'coding', kindIndex)
    if (typeof methodUnit !== 'number') return []
    const radar = radarFromTemplate(
      `${step.id}:method`,
      'Approach',
      'mark.code.method.v1',
      methodUnit,
    )
    return radar ? [{ ...radar, templateId: 'mark.code.method.v1' }] : []
  }
  if (step.kind === 'doc') {
    const essayUnit =
      tagUnit(tagByHint(tags, 'Essay') ?? { signal: 'good', label: '' }) ??
      partUnit(byWeight?.essay, step.id, 'doc', kindIndex)
    if (typeof essayUnit !== 'number') return []
    const radar = radarFromTemplate(`${step.id}:essay`, 'Writing', 'mark.doc.essay.v1', essayUnit)
    return radar ? [{ ...radar, templateId: 'mark.doc.essay.v1' }] : []
  }
  return []
}

/**
 * The four non-radar homes rendered nothing on Theme SAMPLE packs, so taxonomy chips,
 * enum ladders, scalar readouts and pass/fail badges could not be design-reviewed
 * without running a real interview — the surfaces hardest to eyeball were the ones
 * you could not see. These are representative shapes for the preview only; the live
 * path always builds homes from real grains via `buildPhaseResultHomes`.
 */
function themeFallbackExtras(
  step: ReviewStep,
  overview: ResultOverview,
): {
  taxonomies: ResultTaxonomyHome[]
  enums: ResultEnumHome[]
  scalars: ResultScalarHome[]
  passFails: ResultPassFailHome[]
} {
  const taxonomies: ResultTaxonomyHome[] = []
  const enums: ResultEnumHome[] = []
  const scalars: ResultScalarHome[] = []
  const passFails: ResultPassFailHome[] = []

  if (step.kind === 'talk') {
    taxonomies.push({
      id: `${step.id}:theme`,
      label: 'Themes raised',
      labels: ['cross-team handoff', 'rollback', 'on-call load'],
      counts: { 'cross-team handoff': 2, rollback: 1, 'on-call load': 1 },
    })
    enums.push({
      id: `${step.id}:severity`,
      label: 'Incident severity discussed',
      value: 'high',
      enumValues: ['low', 'medium', 'high', 'critical'],
    })
  }
  if (step.kind === 'form') {
    const gate = overview.formGate
    passFails.push({
      id: `${step.id}:gate`,
      label: 'Eligibility gate',
      passed: gate?.passed ?? null,
      reason:
        gate && gate.gradedMax > 0
          ? `Scored ${gate.gradedScore} of ${gate.gradedMax} on the answer key.`
          : undefined,
    })
  }
  if (step.kind === 'coding') {
    passFails.push({
      id: `${step.id}:tests`,
      label: 'Hidden tests',
      passed: true,
      reason: 'Cleared the hidden suite.',
    })
  }
  if (step.kind === 'doc') {
    scalars.push({
      id: `${step.id}:brief`,
      label: 'Short written mark',
      score: 3,
      max: 5,
      criterion: 'Named, checkable claims — not adjectives.',
    })
  }
  return { taxonomies, enums, scalars, passFails }
}

function kindIndexOf(step: ReviewStep, steps: readonly ReviewStep[]): number {
  return steps.filter((row) => row.kind === step.kind).findIndex((row) => row.id === step.id)
}

function stampRadarFace(radar: ResultReviewRadar): ResultReviewRadar {
  if (radar.face === 'conversation' || radar.face === 'work') return radar
  return { ...radar, face: markLaneForTemplate(radar.templateId) }
}

export function buildResultReviewPack(input: {
  overview: ResultOverview
  steps: readonly ReviewStep[]
  brief: Creator2BriefDocument
  attempt?: ResultReviewAttempt | null
}): ResultReviewPack {
  const sections: Record<string, ResultSectionReview> = {}
  const attempt = input.attempt ?? null
  const sittingById = new Map(
    input.overview.sittingSections.map((row) => [row.sectionId, row]),
  )

  for (const step of input.steps) {
    if (step.kind === 'wrap' || step.kind === 'unknown') continue
    const sitting = sittingById.get(step.id)
    const report = sitting ? sittingReadReport(sitting) : { prose: '', tags: [] as SittingReadTag[] }
    const mix = stageMixForPhase(input.overview.sessionMix, step.id)
    const tags = [...(report.tags.length ? report.tags : (sitting?.tags ?? [])), ...sessionMixTags(mix)]
    const attemptPhaseId = alignAttemptPhaseId(step, input.steps, attempt?.response)
    const canEditor = step.kind === 'form' || step.kind === 'coding' || step.kind === 'doc'
    const canChat = phaseHasChat(attempt?.response, attemptPhaseId, step.kind)
    const live = Boolean(attempt?.response)
    const homes = live
      ? buildPhaseResultHomes({
          brief: input.brief,
          phaseId: step.id,
          response: attempt!.response,
          artifacts: attempt?.scored.artifacts,
        })
      : {
          radars: themeFallbackRadars(step, tags, input.overview, kindIndexOf(step, input.steps)),
          ...themeFallbackExtras(step, input.overview),
        }
    sections[step.id] = {
      stepId: step.id,
      kind: step.kind,
      title: step.title,
      /* Glance finding — leftover grain dumps stay on Aid, not this collapsed body. */
      summary: sectionCollapsedSummary(sitting),
      scoreWhy: sitting?.brief?.scoreWhy?.trim() ?? '',
      tags,
      radars: homes.radars.map(stampRadarFace),
      taxonomies: homes.taxonomies,
      enums: homes.enums,
      scalars: homes.scalars,
      passFails: homes.passFails,
      canChat,
      canEditor,
      attemptPhaseId,
    }
  }

  return {
    sections,
    talk: {},
    coding: {},
    essay: {},
    form: {},
    source: attempt ? { brief: input.brief, attempt } : undefined,
  }
}

function ensureFullTalk(source: ResultReviewSource): TalkVerifyModal | null {
  if (source.fullTalk !== undefined) return source.fullTalk
  try {
    source.fullTalk = buildTalkVerifyModal({
      fixtureId: source.attempt.fixtureId,
      sectionKey:
        foldersForTemplate('iv.delivery.v1', source.brief.analysis?.rollup)[0] ?? 'interviewDelivery',
      sectionLabel: 'Discussion',
      response: source.attempt.response,
      scored: source.attempt.scored,
      talkSectionsMeta: source.attempt.talkSectionsMeta,
    })
  } catch {
    source.fullTalk = null
  }
  return source.fullTalk
}

function ensureEditorTapes(source: ResultReviewSource): ResultReviewAttempt {
  if (source.attempt.editorTapes) return source.attempt
  source.attempt = {
    ...source.attempt,
    editorTapes: tapesPackFromStore(source.attempt.fixtureId),
  }
  return source.attempt
}

/**
 * Fill one Conversation or Work modal. Collapsed review only needs `sections`.
 * Caches onto the pack so reopen does not rebuild.
 */
export function fillResultReviewStage(
  pack: ResultReviewPack,
  stepId: string,
  mode: 'chat' | 'editor',
): ResultReviewPack {
  const section = pack.sections[stepId]
  const source = pack.source
  if (!section || !source) return pack

  if (mode === 'chat') {
    if (pack.talk[stepId] || !section.canChat || !section.attemptPhaseId) return pack
    if (section.kind === 'talk') {
      const fullTalk = ensureFullTalk(source)
      if (!fullTalk) return pack
      const sliced = sliceTalkVerifyModal(fullTalk, section.attemptPhaseId, {
        title: section.title,
        description: section.summary,
      })
      if (sliced) pack.talk[stepId] = sliced
      return pack
    }
    try {
      pack.talk[stepId] = buildAssistVerifyModal({
        fixtureId: source.attempt.fixtureId,
        sectionLabel: section.title,
        response: source.attempt.response,
        scored: source.attempt.scored,
        brief: source.brief,
        phaseId: section.attemptPhaseId,
        hostRef: attemptHostRef(source.brief, stepId, source.attempt.response),
        title: section.title,
        description: section.summary,
      })
    } catch {
      /* Keep collapsed review even when Assist Conversation cannot mount. */
    }
    return pack
  }

  if (!section.canEditor) return pack
  if (pack.coding[stepId] || pack.essay[stepId] || pack.form[stepId]) return pack
  const attempt = ensureEditorTapes(source)
  const tapePacks = { live: attempt.editorTapes, fixture: attempt.editorTapes }
  try {
    if (section.kind === 'coding') {
      pack.coding[stepId] = buildCodingVerifyModal({
        fixtureId: attempt.fixtureId,
        sectionKey:
          foldersForTemplate('mark.code.tests.v1', source.brief.analysis?.rollup)[0] ?? 'codingTests',
        sectionLabel: section.title,
        response: attempt.response,
        scored: attempt.scored,
        brief: source.brief,
        tapePacks,
        phaseId: stepId,
      })
    } else if (section.kind === 'doc') {
      pack.essay[stepId] = buildEssayVerifyModal({
        fixtureId: attempt.fixtureId,
        sectionKey:
          foldersForTemplate('mark.doc.essay.v1', source.brief.analysis?.rollup)[0] ?? 'essay',
        sectionLabel: section.title,
        response: attempt.response,
        scored: attempt.scored,
        brief: source.brief,
        tapePacks,
        phaseId: stepId,
      })
    } else if (section.kind === 'form') {
      pack.form[stepId] = buildFormVerifyModal({
        fixtureId: attempt.fixtureId,
        sectionKey: 'formMark',
        sectionLabel: section.title,
        response: attempt.response,
        scored: attempt.scored,
        brief: source.brief,
        tapePacks,
        phaseId: stepId,
      })
    }
  } catch {
    /* Keep collapsed review even when Verify modal cannot mount. */
  }
  return pack
}

export const RESULT_REVIEW_CHAT_SUFFIX = '::chat'
export const RESULT_REVIEW_EDITOR_SUFFIX = '::editor'

/** Work-first when the stage has an editor; Conversation otherwise. Shared by Expand and openSection. */
export function defaultResultReviewMode(section: {
  canChat: boolean
  canEditor: boolean
}): 'chat' | 'editor' {
  if (section.canEditor) return 'editor'
  if (section.canChat) return 'chat'
  return 'editor'
}

export function parseResultReviewEditId(id: string | null | undefined): {
  stepId: string
  mode: 'chat' | 'editor'
} | null {
  if (!id) return null
  if (id.endsWith(RESULT_REVIEW_CHAT_SUFFIX)) {
    return {
      stepId: id.slice(0, -RESULT_REVIEW_CHAT_SUFFIX.length),
      mode: 'chat',
    }
  }
  if (id.endsWith(RESULT_REVIEW_EDITOR_SUFFIX)) {
    return {
      stepId: id.slice(0, -RESULT_REVIEW_EDITOR_SUFFIX.length),
      mode: 'editor',
    }
  }
  return null
}
