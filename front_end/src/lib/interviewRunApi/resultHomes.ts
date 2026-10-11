/**
 * Sitting Results display homes — one field, one place.
 *
 * | Size | Field | Home | Must not be |
 * | sitting-wide | sittingThesis.summary / overview.summary | Overview intro + Finished headline | A section body |
 * | glance | sitting.brief (intro + strengths/weaknesses + scoreWhy) | Overview findings AND collapsed section summary | Leftover grain dump |
 * | leftover | paragraph + passFail grain glances (Aid) | Aid leftover home | Collapsed summary / radar Why |
 * | mix why | included Decision bucket.summary (not formMark) | Aid Mix | Doughnut aside / collapsed leftover |
 * | editor mix | per-stage sessionMix typed / bot / paste shares | Collapsed chips (`sessionMixTags`) | Leftover sentence / doughnut aside |
 * | paste account | RecruiterPasteBurst before → paste → after | Tape current-bucket + paste chips; Security incident when aligned | A run-tick caption |
 * | radar | grain.dimensions[].notes (process: result.notes keyed bag if the axis string is empty) | Section radar + Axis/Reading/Shown tags + Why | Rubric `criterion` / leftover dump |
 * | taxonomy | artifacts.taxonomies | ResultTaxonomyChips on that section | leftover markdown |
 * | enum | grain result.value + authored enumValues | ResultEnumChoice ladder | leftover markdown |
 * | scalar | grain result.score/max + criterion | ResultScalarReadout | leftover |
 * | passFail | grain pass state + gate reason | ResultPassFailBadge | leftover |
 *
 * Aid quotes these homes. It is not a second assessor.
 */
import { resolveAttachTemplateIds, resolveTemplateCardMeta } from '../interviewBrief/analysisLabels'
import { resolveTemplateShape, OUTPUT_KIND_LABELS } from '../interviewBrief/analysisTemplateShape'
import { resolveDocAssessment } from '../interviewBrief/writingDocCompose'
import { DEFAULT_ATTACH_PACKS } from '../interviewBrief/defaultAttachPacks'
import type { Creator2BriefDocument, Creator2Phase } from '../interviewBrief/creator2BriefTypes'
import { lockedToolTemplateIds } from './buildTalkContext'
import { ordinalToUnit } from './ordinalMaps'
import {
  depthStandardEnabled,
  positionToUnit,
  type DepthPosition,
} from '../../../../back_end/supabase/functions/_shared/interview-assessors/depthLadder.ts'
import { foldersForPhase } from '../interviewBrief/rollupFolders'
import type { RecruiterPasteBurst, RecruiterSessionMix, RecruiterSessionMixOverall } from './recruiterProcess'
import type { AnalysisGrainStub, InterviewResponse } from './talkTypes'
import type { AttemptScoreArtifacts } from './scoreAttempt'
import {
  sittingReadFindingMarkdown,
  type SittingReadBrief,
  type SittingReadTag,
} from './sittingReadMarkup'

/** Catalog-only — never assessed, never shown as a radar. */
export const RESULTS_HOME_SKIP_TEMPLATE_IDS = new Set(['mark.doc.brief.v1'])

export const AXIS_NOTE_NOT_RECORDED = 'This axis was not scored, so the table sits at zero.'
export const AXIS_NOTE_NOT_REACHED = 'They did not reach this axis on this stage.'
export const AXIS_NOTE_PENDING = 'Marking is still running, so this axis has no score yet.'
export const AXIS_NOTE_FAILED = 'The mark failed, so no score was recorded.'

export const RESULT_OUTPUT_KIND_HOMES: Record<keyof typeof OUTPUT_KIND_LABELS, string> = {
  dimensions: 'radar + axis tags + Why',
  taxonomy: 'ResultTaxonomyChips',
  enum: 'ResultEnumChoice',
  scalar: 'ResultScalarReadout',
  passFail: 'ResultPassFailBadge',
  paragraph: 'leftover markdown',
}

export type ResultTaxonomyHome = {
  id: string
  label: string
  labels: string[]
  counts: Record<string, number>
}

export type ResultEnumHome = {
  id: string
  label: string
  value: string
  enumValues: string[]
}

export type ResultScalarHome = {
  id: string
  label: string
  score: number
  max: number | null
  criterion?: string
}

export type ResultPassFailHome = {
  id: string
  label: string
  passed: boolean | null
  reason?: string
}

export type ResultHomeRadarAxis = {
  key: string
  label: string
  unit: number
  notes?: string
  score?: string
  /** Authored gloss — what this criterion measures. Essay rubric rows carry it. */
  criterion?: string
  /** True when this spoke has no grain score. Reading must not fake Weak/Strong. */
  absent?: boolean
  instanceCount?: number
  decisiveCount?: number
}

export type ResultHomeRadar = {
  id: string
  label: string
  templateId: string
  axes: ResultHomeRadarAxis[]
}

export type PhaseGrainLocus = {
  toolRef?: string | null
  topicId?: string | null
  phaseId?: string | null
}

export type MixWhyLine = {
  bucket: string
  label: string
  summary: string
  summaryDetail?: string
}

function phaseOf(brief: Creator2BriefDocument, phaseId: string): Creator2Phase | undefined {
  return brief.phases.find((row) => row.id === phaseId)
}

function toolAssistChat(brief: Creator2BriefDocument, toolRef: string): boolean {
  const tool = brief.tools?.[toolRef]
  const assist = tool?.assist
  return Boolean(assist?.chat || assist?.write || assist?.spoilers)
}

/** Locked / implied templates for this spine phase. Never invent STAR the brief did not attach. */
export function attachedTemplateIdsForPhase(
  brief: Creator2BriefDocument,
  phase: Creator2Phase | undefined,
): string[] {
  if (!phase) return []
  const skip = (id: string) => !RESULTS_HOME_SKIP_TEMPLATE_IDS.has(id)
  if (phase.kind === 'discussion' || ('topicId' in phase && phase.kind !== 'tool')) {
    const topicId = String(phase.topicId ?? '').trim()
    const topic = brief.topicLibrary.find((row) => row.id === topicId)
    const packs = brief.analysis?.attachPacks ?? DEFAULT_ATTACH_PACKS
    return resolveAttachTemplateIds(topic?.analysis, packs).filter(skip)
  }
  const toolRef = 'toolRef' in phase ? String(phase.toolRef ?? '').trim() : ''
  const tool = brief.tools?.[toolRef]
  return lockedToolTemplateIds({
    toolType: tool?.type,
    stored: tool?.analysis?.templateIds,
    assistChat: toolAssistChat(brief, toolRef),
  }).filter(skip)
}

export function attachedTemplateIdsForStep(
  brief: Creator2BriefDocument,
  phaseId: string,
): string[] {
  return attachedTemplateIdsForPhase(brief, phaseOf(brief, phaseId))
}

export type GrainCandidateHome = 'tools' | 'topics' | 'turns'

export type GrainCandidate = {
  home: GrainCandidateHome
  key: string
  grain: AnalysisGrainStub
}

/**
 * Every stored grain for this phase + template. Results picks among these —
 * tools leftover, topic leftover (topic id then legacy phase id), peel turns.
 */
export function grainCandidatesForPhaseTemplate(
  response: InterviewResponse | null | undefined,
  locus: PhaseGrainLocus,
  templateId: string,
): GrainCandidate[] {
  if (!response || !templateId) return []
  const toolRef = String(locus.toolRef ?? '').trim()
  const topicId = String(locus.topicId ?? '').trim()
  const phaseId = String(locus.phaseId ?? '').trim()
  const candidates: GrainCandidate[] = []
  if (toolRef) {
    const hosted = response.analysis.tools?.[toolRef]?.[templateId]
    if (hosted) candidates.push({ home: 'tools', key: toolRef, grain: hosted })
  }
  if (topicId) {
    const leftover = response.analysis.topics?.[topicId]?.byTemplate?.[templateId]
    if (leftover) candidates.push({ home: 'topics', key: topicId, grain: leftover })
  }
  // Leftover used to be keyed by phase id instead of topic id on some sittings.
  if (phaseId && phaseId !== topicId) {
    const alt = response.analysis.topics?.[phaseId]?.byTemplate?.[templateId]
    if (alt) candidates.push({ home: 'topics', key: phaseId, grain: alt })
  }
  const msgIds = new Set(
    (response.messages ?? [])
      .filter((row) => (phaseId ? row.phaseId === phaseId : true))
      .map((row) => row.id),
  )
  for (const [messageId, row] of Object.entries(response.analysis.turns ?? {})) {
    if (phaseId && msgIds.size && !msgIds.has(messageId)) continue
    const grain = row?.[templateId]
    if (!grain) continue
    if (toolRef && String(grain.hostRef ?? '').trim() && String(grain.hostRef).trim() !== toolRef) {
      continue
    }
    candidates.push({ home: 'turns', key: messageId, grain })
  }
  return candidates
}

/**
 * Grain for this phase's host — tools row, topic leftover, then after_turn turns
 * for messages in this phaseId. Never `firstTopicGrain` across the sitting.
 *
 * A skipped leftover (Assist leave with no axes, omitted Talk leftover) must not
 * hide a filled grain stored under the other host. Prefer a filled row that
 * actually has axis scores.
 */
export function grainForPhaseTemplate(
  response: InterviewResponse | null | undefined,
  locus: PhaseGrainLocus,
  templateId: string,
): AnalysisGrainStub | null {
  const candidates = grainCandidatesForPhaseTemplate(response, locus, templateId)
  const scored = candidates.find((row) => grainHasAxisScores(row.grain))
  if (scored) return scored.grain
  return candidates[0]?.grain ?? null
}

export function locusForPhaseId(brief: Creator2BriefDocument, phaseId: string): PhaseGrainLocus {
  return locusForPhase(brief, phaseId)
}

function grainHasAxisScores(grain: AnalysisGrainStub | null | undefined): boolean {
  if (!grain || grain.status !== 'filled') return false
  return (grain.dimensions ?? []).some((d) => String(d.score ?? '').trim().length > 0)
}

function locusForPhase(brief: Creator2BriefDocument, phaseId: string): PhaseGrainLocus {
  const phase = phaseOf(brief, phaseId)
  return {
    toolRef: phase && 'toolRef' in phase ? String(phase.toolRef ?? '') : null,
    topicId: phase && 'topicId' in phase ? String(phase.topicId ?? '') : null,
    phaseId,
  }
}

function dimByKey(
  grain: AnalysisGrainStub | null | undefined,
): Map<string, NonNullable<AnalysisGrainStub['dimensions']>[number]> {
  const map = new Map<string, NonNullable<AnalysisGrainStub['dimensions']>[number]>()
  for (const dim of grain?.dimensions ?? []) {
    const key = String(dim.key ?? '').trim()
    if (key) map.set(key, dim)
  }
  return map
}

function axisAbsentNote(grain: AnalysisGrainStub | null | undefined): string {
  if (!grain) return AXIS_NOTE_NOT_RECORDED
  if (grain.status === 'pending') return AXIS_NOTE_PENDING
  if (grain.status === 'skipped') return AXIS_NOTE_NOT_REACHED
  return AXIS_NOTE_NOT_RECORDED
}

/** Per-axis scoring note. Process grains used to keep these only on `result.notes[key]`. */
function axisNotesFromGrain(
  scored: NonNullable<AnalysisGrainStub['dimensions']>[number] | undefined,
  grain: AnalysisGrainStub | null | undefined,
  dimKey: string,
): string {
  const fromDim = typeof scored?.notes === 'string' ? scored.notes.trim() : ''
  if (fromDim) return fromDim
  const result = grain?.result
  if (!result || typeof result !== 'object' || Array.isArray(result)) return ''
  const bag = (result as { notes?: unknown }).notes
  if (!bag || typeof bag !== 'object' || Array.isArray(bag)) return ''
  const hit = (bag as Record<string, unknown>)[dimKey]
  return typeof hit === 'string' ? hit.trim() : ''
}

function briefCard(
  brief: Creator2BriefDocument | null | undefined,
  templateId: string,
): unknown {
  const overrides = brief?.analysis?.overrides
  if (!overrides || typeof overrides !== 'object') return undefined
  const cards = (overrides as { templateCards?: Record<string, unknown> }).templateCards
  const raw = cards?.[templateId]
  return raw && typeof raw === 'object' ? raw : undefined
}

/** The essay rubric is authored on the doc tool, so its axes come from there, not the catalog. */
export const ESSAY_RUBRIC_TEMPLATE_ID = 'mark.doc.essay.v1'

type RadarAxisSource = {
  key: string
  label: string
  options?: readonly string[]
  criterion?: string
}

/**
 * The essay marking matrix lives on the doc tool (`tools[ref].assessment`), not in
 * `analysis.overrides.templateCards`, so `briefCard` never saw it and the essay radar fell back
 * to the catalog's fixed relevance/structure/depth. The writing assessor scores the matrix rows,
 * so those catalog keys never matched a grain row: every essay painted three zeroed axes reading
 * "not scored" while a real per-criterion mark sat in the grain.
 *
 * Resolved through the same `resolveDocAssessment` the assess body uses, so a section with no
 * authored rows (every `format` section, since that editor has no criterion list) lines up with
 * whatever the pipeline actually graded. Bands become the option ladder so `ordinalToUnit` can
 * place a label like `3 - Strong` by index.
 */
function authoredEssayAxes(
  brief: Creator2BriefDocument | null | undefined,
  toolRef: string | null | undefined,
): RadarAxisSource[] {
  const ref = String(toolRef ?? '').trim()
  if (!ref) return []
  const tool = brief?.tools?.[ref]
  if (!tool) return []
  const out: RadarAxisSource[] = []
  for (const dim of resolveDocAssessment(tool).dimensions) {
    const key = String(dim?.key ?? '').trim()
    if (!key) continue
    const criterion = String(dim?.criterion ?? '').trim()
    out.push({
      key,
      label: String(dim?.label ?? key).trim() || key,
      options: (dim?.bands ?? []).map((band) => String(band?.label ?? '').trim()).filter(Boolean),
      ...(criterion ? { criterion } : {}),
    })
  }
  return out
}

/**
 * Axes rebuilt from the rows the assessor actually marked.
 *
 * Last-resort guard for when the matrix moved after an attempt was graded — the author
 * renamed a criterion, or the section was re-typed between Rubric and Format. The stored
 * grain is the record of what was marked, so showing it beats printing a full set of
 * zeroed "not scored" axes over marks that plainly exist.
 */
function grainRowAxes(grain: AnalysisGrainStub | null | undefined): RadarAxisSource[] {
  const out: RadarAxisSource[] = []
  for (const dim of grain?.dimensions ?? []) {
    const key = String(dim?.key ?? '').trim()
    if (!key) continue
    out.push({ key, label: String(dim?.label ?? key).trim() || key })
  }
  return out
}

/**
 * Band position from a numeric band label (`3 — Competent` of 4) — the same reading
 * `scoreAttempt` uses for authored essay bands. Needed when axes come from the grain,
 * where the ladder that produced the label is no longer available to index against.
 */
function bandPrefixUnit(score: unknown, max: unknown): number | null {
  const head = String(score ?? '').trim().match(/^(\d+)/)
  const top = typeof max === 'number' && max > 1 ? max : null
  if (!head || !top) return null
  const n = Number(head[1])
  if (!Number.isFinite(n) || n < 1 || n > top) return null
  return (n - 1) / (top - 1)
}

/**
 * Full catalog or authored axes. Grain score/notes when present; absent/pending/skipped/zeroed
 * stay at unit 0 with an explicit note — never clone another template's unit.
 */
export function radarFromAttachedTemplate(input: {
  id: string
  templateId: string
  grain?: AnalysisGrainStub | null
  brief?: Creator2BriefDocument | null
  /** Doc tool hosting this phase — carries the authored essay criterion table. */
  toolRef?: string | null
}): ResultHomeRadar | null {
  const card = briefCard(input.brief, input.templateId)
  const shape = resolveTemplateShape(input.templateId, card as never)
  if (shape.outputKind !== 'dimensions') return null
  const authored =
    input.templateId === ESSAY_RUBRIC_TEMPLATE_ID
      ? authoredEssayAxes(input.brief, input.toolRef)
      : []
  let dims: RadarAxisSource[] = authored.length ? authored : (shape.dimensions ?? [])
  const byKey = dimByKey(input.grain)
  const leftoverFill =
    input.grain?.status === 'filled' && byKey.size === 0
      ? String(input.grain.justification ?? '').trim()
      : ''
  // The matrix moved since this attempt was marked. Print what was marked rather than a
  // wall of zeros over it.
  if (byKey.size > 0 && !dims.some((dim) => byKey.has(dim.key))) {
    const fromGrain = grainRowAxes(input.grain)
    if (fromGrain.length) dims = fromGrain
  }
  if (!dims.length) return null
  const axes: ResultHomeRadarAxis[] = dims.map((dim) => {
    const scored = byKey.get(dim.key)
    const score = scored ? String(scored.score ?? '').trim() : leftoverFill ? 'weak' : ''
    const pos = scored?.depth?.position
    const fromDepth =
      depthStandardEnabled() && typeof pos === 'number' && pos >= 0 && pos <= 5
        ? positionToUnit(pos as DepthPosition)
        : null
    const measured =
      fromDepth ??
      ordinalToUnit({
        templateId: input.templateId,
        dimKey: dim.key,
        score: scored?.score,
        options: dim.options,
      }) ??
      bandPrefixUnit(scored?.score, scored?.max) ??
      0
    const notesFromGrain = axisNotesFromGrain(scored, input.grain, dim.key)
    const absent = leftoverFill ? false : !scored || !score
    const notes =
      notesFromGrain ||
      (!absent ? String(input.grain?.justification ?? '').trim() : '')
    // Weak/L0 is unit 0, which sits on the origin next to Not scored. A scored
    // axis must occupy the first ring so the polygon is visible.
    const unit = absent ? (fromDepth == null ? 0 : measured) : measured <= 0 ? 0.2 : measured
    const rungIndex = scored?.depth?.rungIndex
    const authoredScore =
      score ||
      (typeof rungIndex === 'number' && dim.options?.[rungIndex]
        ? dim.options[rungIndex]
        : '')
    return {
      key: dim.key,
      label: dim.label,
      unit,
      notes: notes || (absent ? axisAbsentNote(input.grain) : ''),
      absent,
      ...(dim.criterion ? { criterion: dim.criterion } : {}),
      ...(authoredScore && !absent ? { score: authoredScore } : {}),
      ...(typeof scored?.depth?.instanceCount === 'number'
        ? { instanceCount: scored.depth.instanceCount }
        : {}),
      ...(typeof scored?.depth?.decisiveCount === 'number'
        ? { decisiveCount: scored.depth.decisiveCount }
        : {}),
    }
  })
  return {
    id: input.id,
    label: resolveTemplateCardMeta(input.templateId, card as never).title,
    templateId: input.templateId,
    axes,
  }
}

/** One radar / axis table per attached dimension template. Paragraph / passFail / scalar stay leftover-only. */
export function buildCatalogRadars(input: {
  brief: Creator2BriefDocument
  phaseId: string
  response: InterviewResponse
}): ResultHomeRadar[] {
  const ids = attachedTemplateIdsForStep(input.brief, input.phaseId)
  const locus = locusForPhase(input.brief, input.phaseId)
  const out: ResultHomeRadar[] = []
  for (const templateId of ids) {
    const radar = radarFromAttachedTemplate({
      id: `${input.phaseId}:${templateId}`,
      templateId,
      grain: grainForPhaseTemplate(input.response, locus, templateId),
      brief: input.brief,
      toolRef: locus.toolRef,
    })
    if (radar) out.push(radar)
  }
  return out
}

export function buildPhaseResultHomes(input: {
  brief: Creator2BriefDocument
  phaseId: string
  response: InterviewResponse
  artifacts?: AttemptScoreArtifacts
}): {
  radars: ResultHomeRadar[]
  taxonomies: ResultTaxonomyHome[]
  enums: ResultEnumHome[]
  scalars: ResultScalarHome[]
  passFails: ResultPassFailHome[]
} {
  const ids = attachedTemplateIdsForStep(input.brief, input.phaseId)
  const locus = locusForPhase(input.brief, input.phaseId)
  const radars: ResultHomeRadar[] = []
  const taxonomies: ResultTaxonomyHome[] = []
  const enums: ResultEnumHome[] = []
  const scalars: ResultScalarHome[] = []
  const passFails: ResultPassFailHome[] = []
  const cards = (input.brief as {
    analysis?: { overrides?: { templateCards?: Record<string, Record<string, unknown>> } }
  }).analysis?.overrides?.templateCards
  for (const templateId of ids) {
    const grain = grainForPhaseTemplate(input.response, locus, templateId)
    const card = cards?.[templateId] ?? (briefCard(input.brief, templateId) as Record<string, unknown> | undefined)
    const resolved = resolveTemplateShape(templateId, card as never)
    const id = `${input.phaseId}:${templateId}`
    const label = resolveTemplateCardMeta(templateId, card as never).title
    if (resolved.outputKind === 'dimensions') {
      const radar = radarFromAttachedTemplate({
        id,
        templateId,
        grain,
        brief: input.brief,
        toolRef: locus.toolRef,
      })
      if (radar) radars.push(radar)
      continue
    }
    if (resolved.outputKind === 'taxonomy') {
      const host = String(locus.toolRef || locus.topicId || input.phaseId)
      const fromArtifacts = input.artifacts?.taxonomies[`${host}:${templateId}`]
      const labels = fromArtifacts?.labels ?? extractTaxonomyFromGrain(grain)
      const counts = fromArtifacts?.counts ?? countLabels(labels)
      if (labels.length) taxonomies.push({ id, label, labels, counts })
      continue
    }
    if (resolved.outputKind === 'enum') {
      const value = extractEnumFromGrain(grain)
      const enumValues = resolved.enumValues.length
        ? resolved.enumValues
        : Array.isArray(card?.enumValues)
          ? (card.enumValues as string[])
          : []
      if (value) enums.push({ id, label, value, enumValues })
      continue
    }
    if (resolved.outputKind === 'scalar') {
      const scalar = extractScalarFromGrain(grain)
      if (scalar) {
        scalars.push({
          id,
          label,
          score: scalar.score,
          max: scalar.max,
          criterion: typeof card?.criterion === 'string' ? card.criterion : undefined,
        })
      }
      continue
    }
    if (resolved.outputKind === 'passFail') {
      const gate = extractPassFailFromGrain(grain)
      if (gate) passFails.push({ id, label, ...gate })
    }
  }
  return { radars, taxonomies, enums, scalars, passFails }
}

function extractTaxonomyFromGrain(grain: AnalysisGrainStub | null): string[] {
  const r = grain?.result as { labels?: string[]; tags?: string[] } | null
  if (Array.isArray(r?.labels)) return r.labels.map(String)
  if (Array.isArray(r?.tags)) return r.tags.map(String)
  return []
}

function countLabels(labels: string[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const l of labels) counts[l] = (counts[l] ?? 0) + 1
  return counts
}

function extractEnumFromGrain(grain: AnalysisGrainStub | null): string | null {
  const r = grain?.result as { value?: string } | null
  if (typeof r?.value === 'string' && r.value.trim()) return r.value.trim()
  return null
}

function extractScalarFromGrain(
  grain: AnalysisGrainStub | null,
): { score: number; max: number | null } | null {
  const r = grain?.result as { score?: number; max?: number; value?: number } | null
  if (typeof r?.score === 'number') {
    return { score: r.score, max: typeof r.max === 'number' ? r.max : null }
  }
  if (typeof r?.value === 'number') return { score: r.value, max: null }
  return null
}

function extractPassFailFromGrain(
  grain: AnalysisGrainStub | null,
): { passed: boolean | null; reason?: string } | null {
  if (!grain || grain.status === 'pending') return null
  const r = grain.result as { passed?: boolean; reason?: string; boardSummary?: string } | null
  const passed = typeof r?.passed === 'boolean' ? r.passed : null
  const reason =
    String(r?.reason ?? grain.justification ?? r?.boardSummary ?? '').trim() || undefined
  if (passed == null && !reason) return null
  return { passed, reason }
}

const UNIT_BANDS: ReadonlyArray<[number, string]> = [
  [0.85, 'Strong'],
  [0.65, 'Solid'],
  [0.45, 'Mixed'],
  [0.25, 'Thin'],
]

/** Plain word for a 0-1 axis so a reader never has to decode a percentage. */
export function axisUnitBand(unit: number): string {
  for (const [floor, word] of UNIT_BANDS) {
    if (unit >= floor) return word
  }
  return 'Weak'
}

function titleCaseBand(word: string): string {
  const t = word.trim()
  if (!t) return ''
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
}

/** Band chip only — never the essay `3 - Strong` string, never notes. */
export function axisDisplayReading(axis: ResultHomeRadarAxis): string {
  if (axis.absent) return 'Not scored'
  const score = String(axis.score ?? '').trim()
  const fromScore = score.match(/\b(strong|solid|mixed|thin|weak)\b/i)
  if (fromScore?.[1]) return titleCaseBand(fromScore[1])
  if (score && score.length <= 16 && !score.includes(' ')) return score
  return axisUnitBand(axis.unit)
}

/** Why is the scoring note. Criterion is the authored gloss (Axis tooltip), never Why. */
export function axisDisplayWhy(axis: ResultHomeRadarAxis): string {
  if (axis.absent) return axis.notes?.trim() || AXIS_NOTE_NOT_RECORDED
  const notes = axis.notes?.trim() ?? ''
  if (notes && notes !== AXIS_NOTE_NOT_RECORDED) return notes
  return ''
}

export function axisDisplayShown(axis: ResultHomeRadarAxis): string {
  const instanceCount = axis.instanceCount
  const decisiveCount = axis.decisiveCount
  if (typeof instanceCount !== 'number' || instanceCount <= 0) return ''
  const moments = instanceCount === 1 ? '1 moment' : `${instanceCount} moments`
  if (typeof decisiveCount === 'number' && decisiveCount > 0) {
    return `${moments}, ${decisiveCount === 1 ? '1 decisive' : `${decisiveCount} decisive`}`
  }
  return moments
}

export function axisReadingSignal(reading: string): SittingReadTag['signal'] {
  if (/not scored/i.test(reading)) return 'watch'
  if (/strong|solid/i.test(reading)) return 'good'
  if (/mixed|thin/i.test(reading)) return 'watch'
  return 'bad'
}

type MixShareRow = {
  humanTickShare?: number
  copilotApplyShare?: number
  pasteShare?: number
}

/**
 * Overview-style collapsed summary. Never leftover grain dumps, mix-why, or editor mix.
 */
export function sectionCollapsedSummary(
  sitting:
    | {
        brief?: SittingReadBrief
      }
    | null
    | undefined,
): string {
  return sittingReadFindingMarkdown(sitting?.brief)
}

/** Typed / bot / paste chips. Empty when the tape has no editor work. */
export function sessionMixTags(
  mix: MixShareRow | RecruiterSessionMix | RecruiterSessionMixOverall | null | undefined,
): SittingReadTag[] {
  if (!mix) return []
  const typed = Math.round(Number(mix.humanTickShare) * 100)
  const bot = Math.round(Number(mix.copilotApplyShare) * 100)
  const paste = Math.round(Number(mix.pasteShare) * 100)
  if (typed + bot + paste <= 0) return []
  const out: SittingReadTag[] = []
  if (typed > 0) {
    out.push({
      signal: typed >= 50 ? 'good' : 'watch',
      label: `${typed}% typed`,
      hint: 'Typed',
    })
  }
  if (bot > 0) {
    out.push({
      signal: bot >= 40 ? 'bad' : 'watch',
      label: `${bot}% bot`,
      hint: 'Bot edits',
    })
  }
  if (paste > 0) {
    out.push({
      signal: paste >= 40 ? 'bad' : 'watch',
      label: `${paste}% paste`,
      hint: 'Paste',
    })
  }
  return out
}

/**
 * Section leftover. Never the Overview glance `brief.intro`.
 * Intro-only sitting-read (body === intro, no distinct detail) yields ''.
 */
export function leftoverSectionProse(
  sitting:
    | {
        body?: string
        detail?: string
        brief?: { intro?: string }
      }
    | null
    | undefined,
): string {
  const body = String(sitting?.body ?? '').trim()
  const detail = String(sitting?.detail ?? '').trim()
  const intro = String(sitting?.brief?.intro ?? '').trim()
  const parts: string[] = []
  if (body && body !== intro) parts.push(body)
  else if (body && !intro) parts.push(body)
  if (detail && detail !== body && detail !== intro && !parts.some((p) => p.includes(detail))) {
    parts.push(detail)
  }
  return parts.join('\n\n').trim()
}

/** Included Decision buckets that feed the mix donut — never formMark, never templates. */
export function includedScoreDonutBuckets<T extends { included?: boolean; weight?: number }>(
  byWeight: Record<string, T> | null | undefined,
): Array<[string, T]> {
  return Object.entries(byWeight ?? {}).filter(
    ([key, row]) => Boolean(row?.included) && (Number(row?.weight) || 0) > 0 && key !== 'formMark',
  )
}

/** Donut slices: included, weighted, and actually scored. Zero units must not paint a pie. */
export function contributingScoreDonutBuckets<
  T extends { included?: boolean; weight?: number; unit?: number | null },
>(byWeight: Record<string, T> | null | undefined): Array<[string, T]> {
  return includedScoreDonutBuckets(byWeight).filter(([, row]) => (Number(row?.unit) || 0) > 0)
}

/** Recruiter sentence for typed vs bot vs paste. Null when the tape has no editor work. */
export function sessionMixAccount(
  mix: MixShareRow | RecruiterSessionMix | RecruiterSessionMixOverall | null | undefined,
): string | null {
  if (!mix) return null
  const typed = Math.round(Number(mix.humanTickShare) * 100)
  const bot = Math.round(Number(mix.copilotApplyShare) * 100)
  const paste = Math.round(Number(mix.pasteShare) * 100)
  if (typed + bot + paste <= 0) return null
  return `Editor changes: ${typed}% typed, ${bot}% bot edits, ${paste}% paste.`
}

export function stageMixForPhase(
  overall: RecruiterSessionMixOverall | null | undefined,
  phaseId: string,
): RecruiterSessionMix | null {
  const id = String(phaseId ?? '').trim()
  if (!id || !overall?.stages?.length) return null
  return overall.stages.find((row) => row.phaseId === id) ?? null
}

type MixWhyBucket = {
  included?: boolean
  label?: string
  summary?: string
  summaryDetail?: string
  parts?: Array<{ id?: string }>
}

/** Glance sentences for included Decision buckets except formMark. Not leftover detail. */
export function mixWhyFromSoftGrade(
  softGrade:
    | {
        byWeight?: Record<string, MixWhyBucket>
      }
    | null
    | undefined,
): MixWhyLine[] {
  const out: MixWhyLine[] = []
  for (const [bucket, row] of Object.entries(softGrade?.byWeight ?? {})) {
    if (bucket === 'formMark') continue
    if (!row?.included) continue
    const summary = String(row.summary ?? '').trim()
    if (!summary) continue
    const summaryDetail = String(row.summaryDetail ?? '').trim()
    out.push({
      bucket,
      label: String(row.label ?? bucket),
      summary,
      ...(summaryDetail && summaryDetail !== summary ? { summaryDetail } : {}),
    })
  }
  return out
}

function defaultFoldersForMixWhy(brief: Creator2BriefDocument, phaseId: string): string[] {
  const authored = foldersForPhase(phaseId, brief.analysis?.rollup).filter((key) => key !== 'formMark')
  if (authored.length) return authored
  const phase = phaseOf(brief, phaseId)
  if (!phase) return []
  if (phase.kind === 'discussion') return ['interviewDelivery', 'interviewContent']
  if (phase.kind === 'tool' && 'toolRef' in phase) {
    const kind = String(brief.tools?.[String(phase.toolRef)]?.type ?? '')
    if (kind === 'coding') return ['codingTests', 'codingMethod']
    if (kind === 'doc' || kind === 'writing') return ['essay']
  }
  return []
}

/** Mix-why lines that belong on this spine stage, not under the doughnut. */
export function mixWhyForPhase(
  softGrade:
    | {
        byWeight?: Record<string, MixWhyBucket>
      }
    | null
    | undefined,
  brief: Creator2BriefDocument,
  phaseId: string,
): MixWhyLine[] {
  const folders = new Set(defaultFoldersForMixWhy(brief, phaseId))
  const byWeight = softGrade?.byWeight ?? {}
  for (const [bucket, row] of Object.entries(byWeight)) {
    if (bucket === 'formMark') continue
    if ((row?.parts ?? []).some((part) => String(part?.id ?? '') === phaseId)) folders.add(bucket)
  }
  if (!folders.size) return []
  return mixWhyFromSoftGrade(softGrade).filter((line) => folders.has(line.bucket))
}

function leftoverAlreadyHas(leftover: string, bit: string): boolean {
  const needle = bit.trim()
  if (!needle) return true
  return leftover.includes(needle)
}

/**
 * Leftover paragraphs, then this stage's mix-why and editor mix.
 * Glance intro stays on Overview findings.
 */
export function blendSectionLeftover(input: {
  leftover: string
  mixWhy?: readonly MixWhyLine[]
  mix?: MixShareRow | RecruiterSessionMix | RecruiterSessionMixOverall | null
}): string {
  const parts: string[] = []
  const leftover = String(input.leftover ?? '').trim()
  if (leftover) parts.push(leftover)
  let joined = leftover
  for (const line of input.mixWhy ?? []) {
    const summary = String(line.summary ?? '').trim()
    if (summary && !leftoverAlreadyHas(joined, summary)) {
      parts.push(summary)
      joined = parts.join('\n\n')
    }
    const detail = String(line.summaryDetail ?? '').trim()
    if (detail && detail !== summary && !leftoverAlreadyHas(joined, detail)) {
      parts.push(detail)
      joined = parts.join('\n\n')
    }
  }
  const editor = sessionMixAccount(input.mix)
  if (editor && !leftoverAlreadyHas(joined, editor)) parts.push(editor)
  return parts.join('\n\n').trim()
}

const ACTION_HUMAN: Record<string, string> = {
  run: 'ran tests',
  paste: 'pasted',
  paste_route: 'pasted',
  copilot_apply: 'applied a bot edit',
  open_file: 'opened a file',
  language: 'changed language',
  undo: 'undid',
  redo: 'redid',
  idle: 'idled',
}

/** Recruiter-facing tape action. Never snake_case keys. */
export function humanTapeAction(action: string): string {
  const key = String(action ?? '').trim()
  return ACTION_HUMAN[key] ?? key.replace(/_/g, ' ')
}

/** Recruiter-facing coding file mention. Workspace paths are allowed. */
export function humanFileRef(path: string | null | undefined): string {
  return String(path ?? '').trim().replace(/\\/g, '/')
}

/** Before → paste → after. Editor splice excerpt only — never clipboard text. */
export function pasteBurstAccount(burst: RecruiterPasteBurst | null | undefined): string {
  if (!burst) return ''
  const tag =
    burst.route === 'bot'
      ? 'Bot edit. '
      : burst.route === 'internal'
        ? 'In-app paste. '
        : burst.route === 'external'
          ? 'Outside paste. '
          : ''
  const before = (burst.before?.lastActions ?? []).filter(
    (action) => action && action !== 'paste' && action !== 'paste_route' && action !== 'copilot_apply',
  )
  const beforeBit = before.length ? humanTapeAction(before[before.length - 1]!) : ''
  const fileBit = burst.file ? `into ${humanFileRef(burst.file)}` : ''
  const size = burst.wholeFile
    ? 'the whole file'
    : burst.chars != null
      ? `about ${burst.chars} characters`
      : ''
  const lines = burst.lineCount && burst.lineCount > 1 ? `(${burst.lineCount} lines)` : ''
  const quote = String(burst.excerpt ?? '').trim().replace(/\s+/g, ' ').slice(0, 80)
  const quoteBit = quote ? `starting with "${quote}"` : ''
  const origin =
    burst.route === 'internal'
      ? 'from inside the interview'
      : burst.route === 'external'
        ? 'from outside'
        : ''
  const pasteBit =
    burst.route === 'bot'
      ? ['applied a bot edit', fileBit].filter(Boolean).join(' ')
      : ['pasted', size, lines, origin, fileBit, quoteBit].filter(Boolean).join(' ')
  let afterBit = ''
  if (burst.after?.ranTests) afterBit = 'ran tests'
  else if (burst.after?.edited) afterBit = 'edited'
  else {
    const next = (burst.after?.nextActions ?? []).find(
      (action) =>
        action &&
        action !== 'paste' &&
        action !== 'paste_route' &&
        action !== 'idle' &&
        action !== 'copilot_apply',
    )
    if (next) afterBit = humanTapeAction(next)
    else if ((burst.after?.idleMs ?? 0) > 0) afterBit = 'idled'
  }
  const parts = [beforeBit, pasteBit, afterBit].filter(Boolean)
  if (parts.length >= 2) return `${tag}They ${parts[0]}, then ${parts.slice(1).join(', then ')}.`
  const summary = burst.summary?.trim() ?? ''
  if (summary && !/[×x]\d/.test(summary) && !/[—–]/.test(summary)) return summary
  return `${tag}They ${pasteBit}.`
}

const PASTE_ALIGN_MS = 2_500
const INSERT_INCIDENT_KINDS = new Set(['paste', 'paste_internal', 'apply'])

export function applyPasteBurstsToIncidents<
  T extends { kind: string; t: number; sectionId?: string; pre?: { body: string }; post?: { body: string } },
>(incidents: readonly T[], bursts: readonly RecruiterPasteBurst[]): T[] {
  if (!bursts.length) return [...incidents]
  return incidents.map((incident) => {
    if (!INSERT_INCIDENT_KINDS.has(incident.kind)) return incident
    const burst = bursts.find((row) => Math.abs(row.t - incident.t) <= PASTE_ALIGN_MS)
    if (!burst) return incident
    const account = pasteBurstAccount(burst)
    if (!account) return incident
    return {
      ...incident,
      pre: { body: account },
    }
  })
}
