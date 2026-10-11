/**
 * Attempt soft-grade interpreters — grade templates only; collect/narrative → artifacts.
 */
import { catalogSchedulesAfterTurn, catalogSourceWeight, catalogTemplate } from '../interviewBrief/analysisTemplateCatalog'
import { folderForTemplate, foldersForPhase, usesSectionFolderMembership } from '../interviewBrief/rollupFolders'
import { type RollupWeightValue } from '../interviewBrief/rollupWeights'
import { expectedSoftBuckets, type ExpectedBucket } from './expectedSet'
import { meanUnits, ORDINAL_MAPS_VERSION, ordinalToUnit } from './ordinalMaps'
import {
  DEPTH_STANDARD_VERSION,
  depthStandardEnabled,
  positionToUnit,
  type DepthPosition,
} from '../../../../back_end/supabase/functions/_shared/interview-assessors/depthLadder.ts'
import type {
  RecruiterSessionMixOverall,
  RecruiterSittingThesis,
  RecruiterTension,
} from './recruiterProcess'
import {
  collectTensions,
  mixesFromToolGrains,
  stitchSittingThesis,
  weightSessionMixOverall,
} from './recruiterProcess'
import { buildSoftBucketBoardCopy, type SoftGradeAxis } from './softBucketBoardCopy'
import {
  isGradeRole,
  resolveTemplateRole,
} from './templateRoles'
import type {
  AnalysisGrainStub,
  InterviewResponse,
} from './talkTypes'

const ASSIST_ID = 'mark.assist.use.v1'

export type SoftGradeSource = {
  templateId: string
  hostRef: string
  unit: number
}

/**
 * Why an expected bucket scored zero. Recorded because "candidate skipped it" and
 * "our assessor failed" look identical in the number but are not the same fact —
 * only the second one should reach a human reviewer as our problem.
 */
export type ZeroedByReason =
  /** Candidate forfeited or skipped every phase behind this bucket. */
  | 'absent_skipped'
  /** Phases were never reached (attempt abandoned before them). */
  | 'absent_not_reached'
  /** Marking ran and produced nothing usable — a system failure, not the candidate's. */
  | 'mark_failed'

export type SoftGradeBucket = {
  label: string
  unit: number | null
  weight: number
  included: boolean
  /** Set only when the bucket is included at 0 because nothing usable came back. */
  zeroedBy?: ZeroedByReason
  sources: SoftGradeSource[]
  /** Board Soft Decision glance line (output card). */
  summary: string
  /** See more body under the glance line. */
  summaryDetail?: string
  /** Dimension axes when present (≥1). Talk keys are prefixed (`ownership.agency`). */
  axes?: SoftGradeAxis[]
}

export type AttemptSoftGrade = {
  /**
   * `template_role_v1` — denominator was whatever came back; unmarked buckets dropped.
   * `expected_set_v2` — denominator is the brief's expected set; absence scores 0.
   * Overalls are not comparable across the two, hence the version.
   */
  method: 'template_role_v1' | 'expected_set_v2'
  mapsVersion: number
  depthStandardVersion?: number
  overall: number
  byWeight: Record<string, SoftGradeBucket>
  excludedBuckets: string[]
  /** Axes whose authored label could not be mapped to a unit. */
  unmappedAxes?: string[]
  /** The denominator: buckets the brief obliges, whether or not they were answered. */
  expectedBuckets?: string[]
  /** Expected buckets scored 0, with why — absence vs our own marking failure. */
  zeroedBuckets?: Array<{ bucket: string; reason: ZeroedByReason }>
}

export type FormGateSummary = {
  passed: boolean | null
  gradedScore: number
  gradedMax: number
  ungradedIds: string[]
  authorHints: Array<{ questionId: string; reason: string }>
}

export type AttemptScoreArtifacts = {
  topicSynths: Record<string, string>
  toolSynths: Record<string, string>
  taxonomies: Record<string, { labels: string[]; counts: Record<string, number> }>
  enums: Record<string, { value: string; justification?: string }>
  targets: Record<
    string,
    Array<{ key: string; value: unknown; filled: boolean; required?: boolean }>
  >
  targetMisses: Array<{ topicId: string; key: string; label?: string }>
  histograms: Record<string, Record<string, number>>
  tensions?: RecruiterTension[]
  sessionMix?: RecruiterSessionMixOverall | null
  sittingThesis?: RecruiterSittingThesis
}

export type GrainContribution = {
  templateId: string
  hostRef: string
  bucket: string
  unit: number
  sourceWeight: number
  share: number
  towardOverall: number
}

/**
 * `needs_review` — scoring finished, but part of the number is our defect rather
 * than the candidate's performance: a bucket scored 0 because we failed to mark it,
 * or an authored axis label did not map to a unit and was scored 0 by fallback. The
 * score is publishable arithmetic and unfair to ship unseen, so a human is asked to look.
 */
export type SittingResultStatus =
  | 'pending'
  | 'partial'
  | 'complete'
  | 'unmarked'
  | 'needs_review'

/** How many grains landed, so the UI can show real progress instead of a spinner. */
export type SittingGrainCounts = {
  filled: number
  pending: number
  skipped: number
  total: number
}

/**
 * Skip-or-score math stays; this is presentation only (Finished / Verify headlines).
 *
 * A failed assessor stage becomes `skipped`, not `pending`, so an attempt where every stage
 * died used to leave pendingCount at 0 with nothing filled and report `complete` — a real
 * 0% on the donut for work that was never marked at all. `unmarked` keeps that apart from
 * a candidate who genuinely scored nothing.
 */
export function sittingResultStatus(
  pendingCount: number,
  hasFilled: boolean,
  skippedCount = 0,
  markFailedBuckets = 0,
  unmappedAxes = 0,
): SittingResultStatus {
  if (pendingCount > 0 && hasFilled) return 'partial'
  if (pendingCount > 0) return 'pending'
  if (!hasFilled && skippedCount > 0) return 'unmarked'
  // Our failure, not the candidate's: never ship this score without a human.
  // An unmapped axis is scored 0 by fallback, so it drags the overall down for a
  // label *we* could not read — same class of defect as a bucket we failed to mark.
  if (markFailedBuckets > 0 || unmappedAxes > 0) return 'needs_review'
  return 'complete'
}

export type SittingMarkingProgress = {
  /** Grains that will not change again — filled or skipped. */
  settled: number
  total: number
  /** 0-100, rounded. 100 once nothing is outstanding. */
  percent: number
  skipped: number
  inflightJobs: number
}

/**
 * Marked-vs-total, so the report can show real progress instead of an unbounded spinner.
 *
 * `AttemptPackage.marking` only ever carried outstanding work, which is why no percentage
 * could be computed. Skipped grains count as settled: they are never coming back.
 */
export function sittingMarkingProgress(
  counts: SittingGrainCounts,
  inflightJobs = 0,
): SittingMarkingProgress {
  const settled = counts.filled + counts.skipped
  const total = Math.max(counts.total, settled)
  const percent = total === 0 ? 100 : Math.round((settled / total) * 100)
  return { settled, total, percent, skipped: counts.skipped, inflightJobs }
}

export type AttemptScorePackage = {
  softGrade: AttemptSoftGrade
  formGate: FormGateSummary | null
  artifacts: AttemptScoreArtifacts
  contributions: GrainContribution[]
  pendingCount: number
  grainCounts: SittingGrainCounts
  resultStatus: SittingResultStatus
}

type BriefLike = {
  topicLibrary?: Array<{
    id?: string
    targets?: Array<{ key?: string; required?: boolean; label?: string }>
  }>
  phases?: Array<{
    id?: string
    title?: string
    kind?: string
    topicId?: string
    toolRef?: string
    topics?: Array<{ id?: string; targets?: Array<{ key?: string; required?: boolean; label?: string }> }>
  }>
  tools?: Record<string, { type?: string; editorKind?: string } | undefined>
  analysis?: {
    rollup?: {
      weights?: Record<string, RollupWeightValue>
      weightSections?: Record<string, string[]>
      weightTemplates?: Record<string, string[]>
      weightLabels?: Record<string, string>
    } | null
    overrides?: {
      templateCards?: Record<
        string,
        {
          outputKind?: string
          enumValues?: string[]
          gradeable?: boolean
          decisionBucket?: string
          criterion?: string
          dimensions?: Array<{
            key?: string
            options?: string[]
            weight?: number
          }>
        }
      >
    }
  }
}

function templateCardOpts(
  brief: BriefLike,
  templateId: string,
): Parameters<typeof resolveTemplateRole>[1] {
  const card = brief.analysis?.overrides?.templateCards?.[templateId]
  if (!card) return undefined
  return {
    outputKind: card.outputKind,
    enumValues: card.enumValues,
    gradeable: card.gradeable,
    decisionBucket: card.decisionBucket ?? undefined,
  }
}

function roleFor(brief: BriefLike, templateId: string) {
  return resolveTemplateRole(templateId, templateCardOpts(brief, templateId))
}

function decisionBucketForGrain(
  brief: BriefLike,
  templateId: string,
  hostRef: string,
): string | null {
  const rollup = brief.analysis?.rollup ?? null
  const assigned = folderForTemplate(templateId, rollup)
  if (templateId === 'mark.assist.use.v1') {
    if (assigned) return assigned
    const tool = brief.tools?.[hostRef]
    const t = String(tool?.type ?? tool?.editorKind ?? '')
    if (t === 'doc' || t === 'writing' || t === 'essay') return 'essay'
    return 'codingMethod'
  }
  if (assigned) return assigned
  return roleFor(brief, templateId).decisionBucket ?? null
}

type DimLike = {
  key?: string
  label?: string
  score?: unknown
  max?: number
  weight?: number
  depth?: {
    position?: number
    rungIndex?: number
    instanceCount?: number
    decisiveCount?: number
    capped?: true
  }
}

function grainUnit(
  templateId: string,
  grain: AnalysisGrainStub | null | undefined,
  brief?: BriefLike,
): { unit: number | null; hist: Record<string, number>; unmapped: string[] } {
  const hist: Record<string, number> = {}
  const unmapped: string[] = []
  const none = () => ({ unit: null as number | null, hist, unmapped })
  if (!grain || grain.status !== 'filled') return none()

  const role = brief ? roleFor(brief, templateId) : resolveTemplateRole(templateId)
  const entry = catalogTemplate(templateId)
  const cardOpts = brief ? templateCardOpts(brief, templateId) : undefined
  const card = brief?.analysis?.overrides?.templateCards?.[templateId]

  if (!isGradeRole(role.role)) {
    return none()
  }

  // Low confidence: exclude sparse Talk guesses; keep tool assessor composites / ratios.
  const explicitToolResult = grain.result as {
    composite?: number
    softComposite?: number
    gradedMax?: number
    max?: number
    total?: number
    emptyMatrix?: boolean
  } | null
  // Empty essay matrix must not soft-grade as 0%.
  if (explicitToolResult?.emptyMatrix === true) return none()
  const dimsEarly = (grain.dimensions ?? []) as DimLike[]
  const isEssayTemplate =
    templateId === 'mark.doc.essay.v1' || templateId === 'mark.doc.brief.v1'
  if (
    isEssayTemplate &&
    dimsEarly.length === 0 &&
    (explicitToolResult?.composite === 0 || explicitToolResult?.softComposite === 0)
  ) {
    return none()
  }
  const hasExplicitScore =
    (typeof explicitToolResult?.composite === 'number' &&
      !(isEssayTemplate && explicitToolResult.composite === 0 && dimsEarly.length === 0)) ||
    typeof explicitToolResult?.softComposite === 'number' ||
    (typeof explicitToolResult?.gradedMax === 'number' && explicitToolResult.gradedMax > 0) ||
    (typeof explicitToolResult?.max === 'number' && explicitToolResult.max > 0) ||
    (typeof explicitToolResult?.total === 'number' && explicitToolResult.total > 0)
  const hasDepthPosition = dimsEarly.some(
    (d) => typeof d.depth?.position === 'number' && Number.isFinite(d.depth.position),
  )
  if (grain.confidence === 'low' && !hasExplicitScore && !hasDepthPosition) return none()

  const done = (unit: number | null) => ({ unit, hist, unmapped })

  // Authored essay matrix: prefer composite / band index before catalog weak|mixed|strong.
  if (isEssayTemplate) {
    const r = grain.result as {
      composite?: number
      softComposite?: number
    } | null
    if (typeof r?.softComposite === 'number') {
      return done(Math.min(1, Math.max(0, r.softComposite)))
    }
    if (typeof r?.composite === 'number') {
      return done(Math.min(1, Math.max(0, r.composite)))
    }
    const bandUnits: number[] = []
    for (const d of dimsEarly) {
      const max = typeof d.max === 'number' && d.max > 1 ? d.max : null
      const head = String(d.score ?? '').trim().match(/^(\d+)/)
      if (head && max) {
        const n = Number(head[1])
        if (n >= 1 && n <= max) bandUnits.push((n - 1) / (max - 1))
      }
    }
    if (bandUnits.length) {
      const mu = meanUnits(bandUnits)
      if (mu != null) return done(mu)
    }
  }

  if (role.role === 'grade.scalar') {
    const r = grain.result as { score?: number; max?: number; value?: number } | null
    if (typeof r?.score === 'number' && typeof r?.max === 'number' && r.max > 0) {
      return done(Math.min(1, Math.max(0, r.score / r.max)))
    }
    if (typeof r?.value === 'number') {
      return done(Math.min(1, Math.max(0, r.value)))
    }
    if (typeof grain.result === 'number') {
      return done(Math.min(1, Math.max(0, grain.result)))
    }
    return none()
  }

  if (role.role === 'grade.passFail') {
    const r = grain.result as {
      score?: number
      max?: number
      passedCount?: number
      total?: number
      gradedScore?: number
      gradedMax?: number
    } | null
    if (typeof r?.gradedMax === 'number' && r.gradedMax > 0 && typeof r.gradedScore === 'number') {
      return done(r.gradedScore / r.gradedMax)
    }
    if (typeof r?.max === 'number' && r.max > 0 && typeof r.score === 'number') {
      return done(r.score / r.max)
    }
    if (typeof r?.total === 'number' && r.total > 0 && typeof r.passedCount === 'number') {
      return done(r.passedCount / r.total)
    }
    return none()
  }

  if (role.role === 'grade.enum') {
    const r = grain.result as { value?: string } | null
    const value = r?.value ?? (typeof grain.result === 'string' ? grain.result : null)
    const unit = ordinalToUnit({
      templateId,
      dimKey: 'result',
      score: value,
      options: card?.enumValues ?? cardOpts?.enumValues ?? entry?.enumValues,
    })
    if (value != null) hist[String(value)] = 1
    return done(unit)
  }

  // dimensions
  const dims = (grain.dimensions ?? []) as DimLike[]
  const weighted: Array<{ unit: number; weight: number }> = []
  for (const d of dims) {
    const key = String(d.key ?? '')
    const authored = card?.dimensions?.find((x) => x.key === key)
    const catalogDim = entry?.dimensions?.find((x) => x.key === key)
    const opt = authored?.options ?? catalogDim?.options
    const label = normalizeHistLabel(d.score)
    if (label) hist[label] = (hist[label] ?? 0) + 1
    let u: number | null = null
    const pos = d.depth?.position
    if (
      depthStandardEnabled() &&
      typeof pos === 'number' &&
      Number.isFinite(pos) &&
      pos >= 0 &&
      pos <= 5
    ) {
      u = positionToUnit(pos as DepthPosition)
    } else {
      u = ordinalToUnit({
        templateId,
        dimKey: key,
        score: d.score,
        options: opt,
      })
    }
    if (u == null && d.score != null && String(d.score).trim() !== '') {
      unmapped.push(`${templateId}:${key || 'axis'}`)
      u = 0
    }
    if (u == null) continue
    const weightRaw = authored?.weight ?? d.weight
    const weight =
      typeof weightRaw === 'number' && Number.isFinite(weightRaw) && weightRaw > 0
        ? weightRaw
        : 1
    weighted.push({ unit: u, weight })
  }
  if (weighted.length) {
    const wsum = weighted.reduce((s, row) => s + row.weight, 0)
    const unit =
      wsum > 0
        ? weighted.reduce((s, row) => s + row.unit * row.weight, 0) / wsum
        : meanUnits(weighted.map((row) => row.unit))
    if (unit != null) return done(unit)
  }

  // Authored writing matrix: prefer softComposite / composite when ordinals don't map
  const r = grain.result as {
    composite?: number
    softComposite?: number
    bands?: Record<string, { id?: string; label?: string }>
  } | null
  if (typeof r?.softComposite === 'number') {
    return done(Math.min(1, Math.max(0, r.softComposite)))
  }
  if (typeof r?.composite === 'number') {
    return done(Math.min(1, Math.max(0, r.composite)))
  }
  // Band id index fallback when dimensions carry bandId + max band count
  const bandUnits: number[] = []
  for (const d of dims) {
    const bandId = (d as { bandId?: string }).bandId
    const max = typeof d.max === 'number' && d.max > 1 ? d.max : null
    if (bandId && max) {
      const head = String(d.score ?? '').trim().match(/^(\d+)/)
      if (head) {
        const n = Number(head[1])
        if (n >= 1 && n <= max) bandUnits.push((n - 1) / (max - 1))
      }
    }
  }
  if (bandUnits.length) return done(meanUnits(bandUnits))

  return none()
}

function normalizeHistLabel(score: unknown): string | null {
  if (score == null || score === '') return null
  if (typeof score === 'number') return String(score)
  return String(score).trim().toLowerCase() || null
}

function mergeHist(
  into: Record<string, Record<string, number>>,
  templateId: string,
  hist: Record<string, number>,
): void {
  if (!Object.keys(hist).length) return
  const row = { ...(into[templateId] ?? {}) }
  for (const [k, v] of Object.entries(hist)) {
    row[k] = (row[k] ?? 0) + v
  }
  into[templateId] = row
}

function asNumberWeight(value: RollupWeightValue | undefined): number | null {
  if (value === 'gate_only' || value == null) return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const n = Number.parseFloat(String(value))
  return Number.isFinite(n) ? n : null
}

/** Score one dimensions/passFail/scalar grain to 0–1. */
export function scoreGrainUnit(
  templateId: string,
  grain: AnalysisGrainStub | null | undefined,
  brief?: BriefLike,
): number | null {
  return grainUnit(templateId, grain, brief).unit
}

function folderIsBlended(
  weights: Record<string, RollupWeightValue>,
  key: string,
  formMarkCounts: boolean,
): boolean {
  if (key === 'formMark' && !formMarkCounts) return false
  if (weights[key] === 'gate_only') return false
  return true
}

function pushBucketSource(
  bucketSources: Record<string, SoftGradeSource[]>,
  bucket: string | null,
  source: SoftGradeSource,
): void {
  if (!bucket) return
  const existing = bucketSources[bucket] ?? []
  if (existing.some((s) => s.templateId === source.templateId && s.hostRef === source.hostRef)) {
    return
  }
  existing.push(source)
  bucketSources[bucket] = existing
}

/** Collect filled grade grains into author folders. Store follows the template grain. */
function collectMembershipSources(
  response: InterviewResponse,
  brief: BriefLike,
): Record<string, SoftGradeSource[]> {
  const bucketSources: Record<string, SoftGradeSource[]> = {}
  const push = (
    templateId: string,
    hostRef: string,
    unit: number,
    grain?: AnalysisGrainStub | null,
  ) => {
    const folders = foldersForGrain(brief, response, templateId, hostRef, grain)
    for (const folder of folders) {
      pushBucketSource(bucketSources, folder, { templateId, hostRef, unit })
    }
  }

  for (const [messageId, row] of Object.entries(response.analysis.turns ?? {})) {
    for (const [templateId, g] of Object.entries(row ?? {})) {
      if (!catalogSchedulesAfterTurn(templateId)) continue
      if (!g || g.status === 'skipped') continue
      if (templateId === ASSIST_ID) continue
      const { unit } = grainUnit(templateId, g, brief)
      if (unit == null) continue
      push(templateId, messageId, unit, g)
    }
  }

  for (const [topicId, topic] of Object.entries(response.analysis.topics ?? {})) {
    for (const [templateId, g] of Object.entries(topic.byTemplate ?? {})) {
      if (!g || g.status === 'skipped') continue
      if (catalogSchedulesAfterTurn(templateId)) continue
      const meta = roleFor(brief, templateId)
      if (!isGradeRole(meta.role)) continue
      const { unit } = grainUnit(templateId, g, brief)
      if (unit == null) continue
      push(templateId, topicId, unit, g)
    }
  }

  for (const [hostRef, row] of Object.entries(response.analysis.tools ?? {})) {
    for (const [templateId, g] of Object.entries(row)) {
      if (templateId === ASSIST_ID) continue
      const meta = roleFor(brief, templateId)
      if (!isGradeRole(meta.role)) continue
      const { unit } = grainUnit(templateId, g, brief)
      if (unit == null) continue
      push(templateId, hostRef, unit, g)
    }
  }

  for (const src of collectAssistTurnSources(response, brief)) {
    push(src.templateId, src.hostRef, src.unit)
  }

  return bucketSources
}

function collectAssistTurnSources(
  response: InterviewResponse,
  brief: BriefLike,
): SoftGradeSource[] {
  const unitsByHost = new Map<string, number[]>()
  for (const row of Object.values(response.analysis.turns ?? {})) {
    const g = row?.[ASSIST_ID]
    if (!g || g.status !== 'filled') continue
    const toolRef = String(g.hostRef ?? '').trim()
    if (!toolRef) continue
    const { unit } = grainUnit(ASSIST_ID, g, brief)
    if (unit == null) continue
    const list = unitsByHost.get(toolRef) ?? []
    list.push(unit)
    unitsByHost.set(toolRef, list)
  }
  const sources: SoftGradeSource[] = []
  for (const [hostRef, units] of unitsByHost) {
    const mean = units.reduce((s, n) => s + n, 0) / units.length
    sources.push({ templateId: ASSIST_ID, hostRef, unit: mean })
  }
  return sources
}

/**
 * Distinguish "the candidate did not do it" from "we failed to mark it".
 *
 * The number is 0 either way, but only the second is our defect, and only the
 * second should flag the attempt for human review.
 */
/**
 * True while any mark behind this bucket is still pending.
 *
 * Absence and "not finished yet" both look like an empty bucket, but only the
 * first is a zero. Zeroing mid-run would flash a 0 while assessors are still
 * working; the terminal drain turns leftover pending into skipped, and then the
 * bucket zeroes for real.
 *
 * After-turn grains are keyed by message id, not by host, so they have to be
 * matched on their `hostRef` (the topic). Checking only `tools` and `topics` left
 * `interviewDelivery` — which is fed entirely from turns — with no guard at all.
 */
function bucketMarksStillPending(
  brief: BriefLike,
  response: InterviewResponse,
  expected: ExpectedBucket,
): boolean {
  const phases = new Set(expected.phaseIds)
  const hosts = new Set<string>()
  for (const phase of brief.phases ?? []) {
    const phaseId = String(phase.id ?? '')
    if (!phases.has(phaseId)) continue
    if (phase.toolRef) hosts.add(String(phase.toolRef))
    if (phase.topicId) hosts.add(String(phase.topicId))
  }
  for (const host of hosts) {
    const toolRow = response.analysis.tools?.[host]
    if (toolRow && Object.values(toolRow).some((g) => g?.status === 'pending')) return true
    const topicRow = response.analysis.topics?.[host]
    if (
      topicRow?.byTemplate &&
      Object.values(topicRow.byTemplate).some((g) => g?.status === 'pending')
    ) {
      return true
    }
  }
  for (const row of Object.values(response.analysis.turns ?? {})) {
    for (const g of Object.values(row ?? {})) {
      if (g?.status !== 'pending') continue
      if (hosts.has(String(g.hostRef ?? ''))) return true
    }
  }
  return false
}

function zeroReasonForBucket(
  expected: ExpectedBucket,
  response: InterviewResponse,
): ZeroedByReason {
  const skipped = new Set(response.skippedPhaseIds ?? [])
  const completed = new Set(response.completedPhaseIds ?? [])
  if (expected.phaseIds.every((id) => skipped.has(id))) return 'absent_skipped'
  // Reached and completed, yet nothing usable came back: marking is at fault.
  if (expected.phaseIds.some((id) => completed.has(id))) return 'mark_failed'
  return 'absent_not_reached'
}

function emptyArtifacts(): AttemptScoreArtifacts {
  return {
    topicSynths: {},
    toolSynths: {},
    taxonomies: {},
    enums: {},
    targets: {},
    targetMisses: [],
    histograms: {},
  }
}

function requiredTargetKeysFromBrief(brief: BriefLike): Record<string, Set<string>> {
  const out: Record<string, Set<string>> = {}
  const absorb = (
    topicId: string,
    targets: Array<{ key?: string; required?: boolean }> | undefined,
  ) => {
    if (!topicId || !targets?.length) return
    const keys = out[topicId] ?? new Set<string>()
    for (const t of targets) {
      if (t.required && t.key) keys.add(String(t.key))
    }
    if (keys.size) out[topicId] = keys
  }
  // Creator-2 SSOT: topicLibrary + phases.topicId
  for (const topic of brief.topicLibrary ?? []) {
    absorb(String(topic.id ?? ''), topic.targets)
  }
  // Nested phase.topics (unit fixtures / legacy shapes)
  for (const phase of brief.phases ?? []) {
    for (const topic of phase.topics ?? []) {
      absorb(String(topic.id ?? ''), topic.targets)
    }
  }
  return out
}

function targetLabelForKey(brief: BriefLike, topicId: string, key: string): string {
  const fromLibrary = (brief.topicLibrary ?? []).find((t) => String(t.id ?? '') === topicId)
  const hit = fromLibrary?.targets?.find((t) => t.key === key)
  if (hit?.label?.trim()) return hit.label.trim()
  for (const phase of brief.phases ?? []) {
    for (const topic of phase.topics ?? []) {
      if (String(topic.id ?? '') !== topicId) continue
      const row = topic.targets?.find((t) => t.key === key)
      if (row?.label?.trim()) return row.label.trim()
    }
  }
  return key.replace(/[_-]+/g, ' ')
}

/** Map topicId / toolRef → phase id for weightSections filtering. */
function hostToPhaseId(brief: BriefLike): Map<string, string> {
  const map = new Map<string, string>()
  for (const phase of brief.phases ?? []) {
    const phaseId = String(phase.id ?? '')
    if (!phaseId) continue
    if (phase.topicId) map.set(String(phase.topicId), phaseId)
    if (phase.toolRef) map.set(String(phase.toolRef), phaseId)
  }
  return map
}

function resolveGrainPhaseId(
  brief: BriefLike,
  response: InterviewResponse,
  hostRef: string,
  grain?: AnalysisGrainStub | null,
): string | null {
  const hostPhase = hostToPhaseId(brief)
  if (hostPhase.has(hostRef)) return hostPhase.get(hostRef) ?? null
  const grainHost = String(grain?.hostRef ?? '').trim()
  if (grainHost && hostPhase.has(grainHost)) return hostPhase.get(grainHost) ?? null
  if ((brief.phases ?? []).some((p) => String(p.id ?? '') === hostRef)) return hostRef
  const msg = (response.messages ?? []).find((m) => m.id === hostRef)
  if (msg?.phaseId) return String(msg.phaseId)
  if (msg?.topicId && hostPhase.has(msg.topicId)) return hostPhase.get(msg.topicId) ?? null
  return null
}

function foldersForGrain(
  brief: BriefLike,
  response: InterviewResponse,
  templateId: string,
  hostRef: string,
  grain?: AnalysisGrainStub | null,
): string[] {
  const rollup = brief.analysis?.rollup ?? null
  if (usesSectionFolderMembership(rollup)) {
    const phaseId = resolveGrainPhaseId(brief, response, hostRef, grain)
    if (!phaseId) return []
    return foldersForPhase(phaseId, rollup)
  }
  const one = decisionBucketForGrain(brief, templateId, hostRef)
  return one ? [one] : []
}

/**
 * Plan ladder step 3: only phases listed in weightSections[bucket] that are
 * completed (skipped omitted). Empty section list = no chip filter (all hosts).
 */
function filterSourcesByWeightSections(
  sources: SoftGradeSource[],
  bucket: string,
  brief: BriefLike,
  response: InterviewResponse,
): SoftGradeSource[] {
  const sections = brief.analysis?.rollup?.weightSections?.[bucket]
  if (!sections?.length) return sources
  const hostPhase = hostToPhaseId(brief)
  const skipped = new Set(response.skippedPhaseIds ?? [])
  const completed = new Set(response.completedPhaseIds ?? [])
  const allowed = new Set(sections.map(String))
  return sources.filter((s) => {
    const phaseId = hostPhase.get(s.hostRef)
    if (!phaseId) return true
    if (skipped.has(phaseId)) return false
    if (!allowed.has(phaseId)) return false
    if (completed.size > 0 && !completed.has(phaseId)) return false
    return true
  })
}

function fillNarrativeAndCollect(
  response: InterviewResponse,
  artifacts: AttemptScoreArtifacts,
  requiredByTopic: Record<string, Set<string>>,
  brief: BriefLike,
): string[] {
  const unmapped: string[] = []
  const take = (templateId: string, g: AnalysisGrainStub) => {
    const { hist, unmapped: u } = grainUnit(templateId, g, brief)
    mergeHist(artifacts.histograms, templateId, hist)
    unmapped.push(...u)
  }
  for (const [topicId, topic] of Object.entries(response.analysis.topics ?? {})) {
    if (topic.synthesisText?.trim()) {
      artifacts.topicSynths[topicId] = topic.synthesisText.trim()
    }
    const requiredKeys = requiredByTopic[topicId]
    const targetRows: AttemptScoreArtifacts['targets'][string] = []
    for (const [key, t] of Object.entries(topic.targets ?? {})) {
      const required = requiredKeys ? requiredKeys.has(key) : false
      targetRows.push({
        key,
        value: t.value,
        filled: Boolean(t.filled),
        required,
      })
      if (!t.filled && required) {
        artifacts.targetMisses.push({
          topicId,
          key,
          label: targetLabelForKey(brief, topicId, key),
        })
      }
    }
    if (targetRows.length) artifacts.targets[topicId] = targetRows

    for (const [templateId, g] of Object.entries(topic.byTemplate ?? {})) {
      const role = roleFor(brief, templateId)
      if (role.role === 'narrative.paragraph' && g.justification?.trim()) {
        if (!artifacts.topicSynths[topicId] && templateId.startsWith('synth.')) {
          artifacts.topicSynths[topicId] = g.justification.trim()
        }
      }
      take(templateId, g)
      absorbCollectable(artifacts, topicId, templateId, g, brief)
    }
  }

  for (const [hostRef, row] of Object.entries(response.analysis.tools ?? {})) {
    const synth = row['synth.tool.v1']
    const synthText =
      synth?.justification?.trim() ||
      (typeof (synth?.result as { paragraph?: string } | null)?.paragraph === 'string'
        ? (synth!.result as { paragraph: string }).paragraph.trim()
        : '')
    if (synthText) artifacts.toolSynths[hostRef] = synthText
  }

  for (const [hostRef, pkg] of Object.entries(response.analysis.toolPackages ?? {})) {
    if (artifacts.toolSynths[hostRef]) continue
    const p = pkg as { summary?: string; kind?: string }
    if (p.summary?.trim()) artifacts.toolSynths[hostRef] = p.summary.trim()
  }

  for (const [hostRef, row] of Object.entries(response.analysis.tools ?? {})) {
    for (const [templateId, g] of Object.entries(row)) {
      take(templateId, g)
      absorbCollectable(artifacts, hostRef, templateId, g, brief)
    }
  }

  // after_turn histograms
  for (const [messageId, row] of Object.entries(response.analysis.turns ?? {})) {
    for (const [templateId, g] of Object.entries(row)) {
      take(templateId, g)
      absorbCollectable(artifacts, messageId, templateId, g, brief)
    }
  }
  return [...new Set(unmapped)]
}

function absorbCollectable(
  artifacts: AttemptScoreArtifacts,
  hostRef: string,
  templateId: string,
  g: AnalysisGrainStub,
  brief: BriefLike,
): void {
  const role = roleFor(brief, templateId)
  if (role.role === 'collect.taxonomy') {
    const labels = extractTaxonomyLabels(g)
    const counts: Record<string, number> = {}
    for (const l of labels) counts[l] = (counts[l] ?? 0) + 1
    artifacts.taxonomies[`${hostRef}:${templateId}`] = { labels, counts }
  }
  if (role.role === 'collect.enum' || role.role === 'grade.enum') {
    const value = extractEnumValue(g)
    if (value) {
      artifacts.enums[`${hostRef}:${templateId}`] = {
        value,
        justification: g.justification,
      }
    }
  }
}

function extractTaxonomyLabels(g: AnalysisGrainStub): string[] {
  const r = g.result as { labels?: string[]; tags?: string[] } | null
  if (Array.isArray(r?.labels)) return r!.labels.map(String)
  if (Array.isArray(r?.tags)) return r!.tags.map(String)
  return []
}

function extractEnumValue(g: AnalysisGrainStub): string | null {
  const r = g.result as { value?: string } | null
  if (typeof r?.value === 'string' && r.value.trim()) return r.value.trim()
  if (typeof g.result === 'string' && g.result.trim()) return g.result.trim()
  return null
}

/* ── Tiered weighting ────────────────────────────────────────────────────────────
 *
 * A mark passes three tiers on its way to the overall:
 *
 *   template --templateWeight--> section --sectionWeight--> bucket --rollup weight--> overall
 *
 * Each tier reads its authored weight first and falls back to the deterministic default
 * named beside it, so standing up the weighting editor means filling
 * `analysis.rollup.templateWeights` / `sectionWeights` — not reworking this formula.
 *
 * A weight of exactly `0` means "recorded but does not count": the row keeps its result
 * in the response and the results table, and contributes nothing to the grade. That is
 * different from an absent mark, which is a zero the candidate earned.
 *
 * Sections matter as a tier because without one, a section carrying five templates
 * outvoted a section carrying one, purely by template count.
 */

/** Tier 1 default when neither the brief nor the catalog states a template weight. */
const DEFAULT_TEMPLATE_WEIGHT = 1
/** Tier 2 default — sections in a bucket count equally. */
const DEFAULT_SECTION_WEIGHT = 1

/** Authored weight, or undefined when the author has not set one. `0` is a real answer. */
function authoredWeight(raw: unknown): number | undefined {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) return raw
  if (typeof raw === 'string' && raw.trim()) {
    const n = Number(raw.trim())
    if (Number.isFinite(n) && n >= 0) return n
  }
  return undefined
}

/** Tier 1 — section-scoped authored weight, then the template card, then the catalog. */
function templateWeightFor(
  brief: BriefLike,
  phaseId: string,
  templateId: string,
): number {
  const rollup = brief.analysis?.rollup as
    | { templateWeights?: Record<string, Record<string, unknown>> }
    | undefined
  const scoped = authoredWeight(rollup?.templateWeights?.[phaseId]?.[templateId])
  if (scoped !== undefined) return scoped
  const card = brief.analysis?.overrides?.templateCards?.[templateId] as
    | { sourceWeight?: number }
    | undefined
  const fromCard = authoredWeight(card?.sourceWeight)
  if (fromCard !== undefined) return fromCard
  const fromCatalog = catalogSourceWeight(templateId)
  return Number.isFinite(fromCatalog) ? fromCatalog : DEFAULT_TEMPLATE_WEIGHT
}

/** Tier 2 — this section's share of its decision bucket. */
function sectionWeightFor(brief: BriefLike, phaseId: string): number {
  const rollup = brief.analysis?.rollup as
    | { sectionWeights?: Record<string, unknown> }
    | undefined
  const authored = authoredWeight(rollup?.sectionWeights?.[phaseId])
  return authored !== undefined ? authored : DEFAULT_SECTION_WEIGHT
}

/**
 * `hostRef` → section. Tool and topic hosts come off the spine; after-turn marks are
 * keyed by message id, so they are resolved through the transcript. Without that, every
 * Talk turn looked like its own section and a long section outweighed a short one.
 */
function sourceSectionIndex(
  brief: BriefLike,
  response: InterviewResponse,
): Map<string, string> {
  const map = hostToPhaseId(brief)
  for (const message of response.messages ?? []) {
    const id = String(message.id ?? '')
    const phaseId = String(message.phaseId ?? '')
    if (id && phaseId && !map.has(id)) map.set(id, phaseId)
  }
  return map
}

type BucketRollup = {
  unit: number | null
  /** Each counted source's share of this bucket. Shares sum to 1. */
  shares: Map<SoftGradeSource, { share: number; templateWeight: number }>
  /** Sources existed but every one was zeroed by an authored weight. */
  excludedByWeight: boolean
}

/** Tiers 1 and 2: templates into a section score, sections into a bucket score. */
function rollUpBucket(
  sources: SoftGradeSource[],
  brief: BriefLike,
  response: InterviewResponse,
): BucketRollup {
  const shares: BucketRollup['shares'] = new Map()
  if (!sources.length) return { unit: null, shares, excludedByWeight: false }

  const sectionOf = sourceSectionIndex(brief, response)
  const bySection = new Map<string, SoftGradeSource[]>()
  for (const source of sources) {
    const phaseId = sectionOf.get(source.hostRef) ?? ''
    const list = bySection.get(phaseId) ?? []
    list.push(source)
    bySection.set(phaseId, list)
  }

  const sections: Array<{
    unit: number
    weight: number
    rows: Array<{ source: SoftGradeSource; share: number; templateWeight: number }>
  }> = []
  for (const [phaseId, rows] of bySection) {
    let num = 0
    let den = 0
    const counted: Array<{ source: SoftGradeSource; templateWeight: number }> = []
    for (const source of rows) {
      const weight = templateWeightFor(brief, phaseId, source.templateId)
      if (!(weight > 0)) continue
      num += source.unit * weight
      den += weight
      counted.push({ source, templateWeight: weight })
    }
    if (den <= 0) continue
    const sectionWeight = phaseId ? sectionWeightFor(brief, phaseId) : DEFAULT_SECTION_WEIGHT
    if (!(sectionWeight > 0)) continue
    sections.push({
      unit: num / den,
      weight: sectionWeight,
      rows: counted.map(({ source, templateWeight }) => ({
        source,
        templateWeight,
        share: templateWeight / den,
      })),
    })
  }

  // Everything here was deliberately taken off the grade. That is an exclusion, not a
  // zero — scoring it 0 would punish the candidate for the author's weighting.
  if (!sections.length) return { unit: null, shares, excludedByWeight: true }

  const sectionDen = sections.reduce((a, s) => a + s.weight, 0)
  let unit = 0
  for (const section of sections) {
    const sectionShare = section.weight / sectionDen
    unit += section.unit * sectionShare
    for (const row of section.rows) {
      shares.set(row.source, {
        share: sectionShare * row.share,
        templateWeight: row.templateWeight,
      })
    }
  }
  return { unit, shares, excludedByWeight: false }
}

function countGrainStatuses(response: InterviewResponse): SittingGrainCounts {
  const counts: SittingGrainCounts = { filled: 0, pending: 0, skipped: 0, total: 0 }
  const visit = (g: AnalysisGrainStub | null | undefined) => {
    if (!g) return
    counts.total += 1
    if (g.status === 'pending') counts.pending += 1
    else if (g.status === 'skipped') counts.skipped += 1
    else if (g.status === 'filled') counts.filled += 1
  }
  for (const row of Object.values(response.analysis.turns ?? {})) {
    for (const g of Object.values(row ?? {})) visit(g)
  }
  for (const row of Object.values(response.analysis.tools ?? {})) {
    for (const g of Object.values(row ?? {})) visit(g)
  }
  for (const topic of Object.values(response.analysis.topics ?? {})) {
    for (const g of Object.values(topic?.byTemplate ?? {})) visit(g)
  }
  for (const g of Object.values(response.analysis.signals ?? {})) visit(g)
  return counts
}

function extractFormGate(response: InterviewResponse): FormGateSummary | null {
  for (const row of Object.values(response.analysis.tools ?? {})) {
    const g = row['mark.form.key.v1']
    if (!g || g.status !== 'filled') continue
    const r = g.result as {
      passed?: boolean | null
      score?: number
      max?: number
      gradedScore?: number
      gradedMax?: number
      ungradedIds?: string[]
      byItem?: Array<{
        questionId: string
        auto?: boolean
        status?: string
        notes?: string
        authorHint?: string
      }>
    } | null
    const ungradedIds =
      r?.ungradedIds ??
      (r?.byItem ?? [])
        .filter((i) => i.status === 'ungraded')
        .map((i) => i.questionId)
    const authorHints = (r?.byItem ?? [])
      .filter((i) => i.authorHint)
      .map((i) => ({ questionId: i.questionId, reason: String(i.authorHint) }))
    return {
      passed: r?.passed ?? null,
      gradedScore: r?.gradedScore ?? r?.score ?? 0,
      gradedMax: r?.gradedMax ?? r?.max ?? 0,
      ungradedIds,
      authorHints,
    }
  }
  void response
  return null
}

/**
 * Build soft grade + artifacts from a filled InterviewResponse.
 */
export function scoreAttempt(input: {
  brief: BriefLike
  response: InterviewResponse
}): AttemptScorePackage {
  const response = input.response
  const brief = input.brief
  const weights = brief.analysis?.rollup?.weights ?? {}
  const weightLabels = brief.analysis?.rollup?.weightLabels ?? null
  const artifacts = emptyArtifacts()
  const unmappedAxes = fillNarrativeAndCollect(
    response,
    artifacts,
    requiredTargetKeysFromBrief(brief),
    brief,
  )

  // The answer-key mark is a gate by default (`formMark: 'gate_only'`), so a form can
  // pass or fail the attempt without ever moving the score. An author who gives formMark
  // a positive number is asking for it to count too — same ladder as every other bucket.
  const formMarkCounts = (asNumberWeight(weights.formMark) ?? 0) > 0

  const bucketSources = collectMembershipSources(response, brief)
  for (const key of Object.keys(bucketSources)) {
    if (!folderIsBlended(weights, key, formMarkCounts)) {
      delete bucketSources[key]
      continue
    }
    bucketSources[key] = filterSourcesByWeightSections(
      bucketSources[key] ?? [],
      key,
      brief,
      response,
    )
  }

  const softKeys = Object.keys(weights).filter(
    (k) => folderIsBlended(weights, k, formMarkCounts) && asNumberWeight(weights[k]) != null,
  )

  const included: Array<{
    key: string
    unit: number
    weight: number
    sources: SoftGradeSource[]
    shares: BucketRollup['shares']
    zeroedBy?: ZeroedByReason
  }> = []
  const excludedBuckets: string[] = []
  const byWeight: Record<string, SoftGradeBucket> = {}
  // The denominator comes from the brief, not from what came back. Dropping an
  // unmarked bucket and renormalising the rest is what let absence raise a score.
  const expected = expectedSoftBuckets(brief)

  for (const key of softKeys) {
    const wRaw = asNumberWeight(weights[key] ?? defaultSoftWeight(key))
    const sources = bucketSources[key] ?? []
    const rolled = rollUpBucket(sources, brief, response)
    const unit = rolled.unit
    const weighted = wRaw != null && wRaw > 0

    if (unit != null && weighted) {
      included.push({ key, unit, weight: wRaw, sources, shares: rolled.shares })
      continue
    }

    // Authored but unanswered: score zero and stay in the denominator — unless its
    // marks are still in flight, in which case it is not absent, just not done, or
    // every source was weighted off the grade, which is an exclusion and not a zero.
    const expectation = expected.get(key)
    if (
      unit == null &&
      weighted &&
      !rolled.excludedByWeight &&
      expectation &&
      !bucketMarksStillPending(brief, response, expectation)
    ) {
      included.push({
        key,
        unit: 0,
        weight: wRaw,
        sources,
        shares: rolled.shares,
        zeroedBy: zeroReasonForBucket(expectation, response),
      })
      continue
    }

    excludedBuckets.push(key)
    const board = buildSoftBucketBoardCopy({
      key,
      unit,
      included: false,
      sources,
      response,
      weightLabels,
    })
    byWeight[key] = {
      label: board.label,
      unit,
      weight: wRaw ?? 0,
      included: false,
      sources,
      summary: board.summary,
      summaryDetail: board.summaryDetail,
      axes: board.axes,
    }
  }

  const contributions: GrainContribution[] = []
  const weightSum = included.reduce((s, r) => s + r.weight, 0)
  let overall = 0
  for (const row of included) {
    const normW = weightSum > 0 ? row.weight / weightSum : 0
    // Shares come from the same tiered roll-up that produced the unit, so the legend
    // adds up to the grade rather than re-deriving it a second, divergent way.
    for (const src of row.sources) {
      const carried = row.shares.get(src)
      contributions.push({
        templateId: src.templateId,
        hostRef: src.hostRef,
        bucket: row.key,
        unit: src.unit,
        sourceWeight: carried?.templateWeight ?? 0,
        share: carried?.share ?? 0,
        towardOverall: src.unit * normW * (carried?.share ?? 0),
      })
    }
    const board = buildSoftBucketBoardCopy({
      key: row.key,
      unit: row.unit,
      included: true,
      sources: row.sources,
      response,
      weightLabels,
    })
    byWeight[row.key] = {
      label: board.label,
      unit: row.unit,
      weight: normW,
      included: true,
      sources: row.sources,
      summary: board.summary,
      summaryDetail: board.summaryDetail,
      axes: board.axes,
      zeroedBy: row.zeroedBy,
    }
    overall += normW * row.unit
  }

  // Ensure excluded keys still present
  for (const key of softKeys) {
    if (!byWeight[key]) {
      const sources = bucketSources[key] ?? []
      const board = buildSoftBucketBoardCopy({
        key,
        unit: null,
        included: false,
        sources,
        response,
        weightLabels,
      })
      byWeight[key] = {
        label: board.label,
        unit: null,
        weight: 0,
        included: false,
        sources,
        summary: board.summary,
        summaryDetail: board.summaryDetail,
        axes: board.axes,
      }
    }
  }

  const grainCounts = countGrainStatuses(response)
  const pendingCount = grainCounts.pending
  const formGate = extractFormGate(response)
  // A bucket included at 0 is a result, not an absence of one: the attempt was
  // scored against the brief and came up empty.
  const zeroedBuckets = included
    .filter((row) => row.zeroedBy)
    .map((row) => ({ bucket: row.key, reason: row.zeroedBy! }))
  const hasFilled =
    contributions.length > 0 || overall > 0 || Boolean(formGate) || zeroedBuckets.length > 0

  const pkg: AttemptScorePackage = {
    softGrade: {
      method: 'expected_set_v2',
      expectedBuckets: [...expected.keys()].sort(),
      zeroedBuckets,
      mapsVersion: ORDINAL_MAPS_VERSION,
      depthStandardVersion: DEPTH_STANDARD_VERSION,
      overall: Math.round(overall * 1000) / 1000,
      byWeight,
      excludedBuckets,
      ...(unmappedAxes.length ? { unmappedAxes } : {}),
    },
    formGate,
    artifacts,
    contributions,
    pendingCount,
    grainCounts,
    resultStatus: sittingResultStatus(
      pendingCount,
      hasFilled,
      grainCounts.skipped,
      zeroedBuckets.filter((z) => z.reason === 'mark_failed').length,
      unmappedAxes.length,
    ),
  }
  artifacts.tensions = collectTensions({
    brief: brief as Parameters<typeof collectTensions>[0]['brief'],
    response,
    scored: pkg,
  })
  artifacts.sessionMix = weightSessionMixOverall(
    mixesFromToolGrains(response),
    pkg.softGrade.byWeight,
  )
  artifacts.sittingThesis = stitchSittingThesis({
    scored: pkg,
    skipped: response.skippedPhaseIds?.length ?? 0,
    phases: brief.phases,
    tools: brief.tools,
  })
  return pkg
}

function defaultSoftWeight(key: string): number {
  const defaults: Record<string, number> = {
    codingTests: 0.25,
    codingMethod: 0.1,
    essay: 0.15,
    interviewDelivery: 0.2,
    interviewContent: 0.3,
  }
  return defaults[key] ?? 0
}

export type { SoftGradeAxis } from './softBucketBoardCopy'
