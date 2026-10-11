/**
 * Sample interview bot-output fixture — construct toward the live rollup.
 * Now: candidate + summary + Decision package + collapsed meta. Live: `buildOutputCardFromScored`.
 */
import sample from './sample-bot-output.json'
import type {
  AttemptScorePackage,
  SittingGrainCounts,
  SittingResultStatus,
} from '../../scoreAttempt'
import { catalogTemplate } from '../../../interviewBrief/analysisTemplateCatalog'
import {
  normalizeSittingRead,
  sittingReadReport,
  sittingReadScoreReading,
  type SittingReadSection,
  type SittingReadTag,
} from '../../sittingReadMarkup'
import type {
  RecruiterSessionMixOverall,
  RecruiterSittingThesis,
  RecruiterTension,
} from '../../recruiterProcess'
import type { IntakeDeclarationsPack } from '../../sittingDeclaration'

export const BOT_OUTPUT_SCHEMA = 'vurify/interview-bot-output' as const

/**
 * True when Soft Decision overall must not be presented as the sitting result.
 *
 * `unmarked` belongs here too: every assessor stage failed, so the 0 that falls out of the
 * weight math is the absence of marking, not a result the candidate earned.
 */
export function sittingResultHeadlinePending(
  status: SittingResultStatus | undefined,
): boolean {
  return status === 'pending' || status === 'partial' || status === 'unmarked'
}

/** Marking never ran to completion — separate from "scored, and the score is low". */
export function sittingResultUnmarked(status: SittingResultStatus | undefined): boolean {
  return status === 'unmarked'
}

/**
 * The overall is real arithmetic but part of it is our defect, not the candidate's
 * performance — a bucket we failed to mark, or an axis label we could not read.
 *
 * Deliberately not in `sittingResultHeadlinePending`: the number is shown, because
 * hiding it loses the marks that did land. It is flagged instead, so the one status
 * that exists to say "do not ship this unseen" stops rendering as a clean pass.
 */
export function sittingResultNeedsReview(status: SittingResultStatus | undefined): boolean {
  return status === 'needs_review'
}

/** Says how much marking died, so a dash on the donut is debuggable rather than mute. */
export function unmarkedStagesLabel(counts: SittingGrainCounts | undefined): string {
  const skipped = counts?.skipped ?? 0
  if (skipped <= 0) return 'Not marked'
  return skipped === 1 ? 'Not marked · 1 stage failed' : `Not marked · ${skipped} stages failed`
}

export type InterviewOutputCardAxis = {
  key: string
  label: string
  unit: number
}

export type OutputMetaSignal = 'good' | 'watch' | 'bad'

export type InterviewOutputMetaTag = {
  id: 'sections' | 'gate' | 'duration' | 'skipped' | 'security' | 'anomalies'
  label: string
  signal: OutputMetaSignal
}

export type InterviewOutputCardPart = {
  id: string
  label: string
  kind?: 'talk' | 'coding' | 'doc' | 'form'
  unit?: number | null
}

export type InterviewOutputCardBucket = {
  label: string
  unit: number | null
  weight: number
  included: boolean
  /** Spine stages that feed this Decision bucket (one or many). */
  parts?: InterviewOutputCardPart[]
  summary?: string
  summaryDetail?: string
  axes?: InterviewOutputCardAxis[]
}

export type OverviewSecurityCheck = {
  id: string
  check: string
  reading: string
  /** Collector / Edge may omit this; overview cleaning fills `''`. */
  note?: string
  signal?: OutputMetaSignal
  /** 0–1 security of this feature. Shown as a % chip when it differs from `reading`. */
  unit?: number
}

export type OverviewSecurityCapture = {
  sectionId: string
  capture: string
  note: string
}

export type OverviewSignalFlag = {
  id: string
  signal: OutputMetaSignal
  label: string
  why: string
  quote?: string
  evidenceRefs?: Array<{ kind: string; ref: string; t?: number; quote?: string }>
}

export type OverviewClarityFinding = SittingReadSection & {
  evidenceRefs?: Array<{ kind: string; ref: string; t?: number; quote?: string }>
}

export type OverviewSecurityIncident = {
  id: string
  kind: string
  sectionId: string
  t: number
  preMs: number
  postMs: number
  pre?: { body: string }
  post?: { body: string }
  tags?: SittingReadTag[]
  evidenceRefs?: Array<{ kind: string; ref: string; t?: number; quote?: string }>
}

export type OverviewSecurityDiagrams = {
  location: string
  pointer: string
  incidents: string
}

export type OverviewClarityDiagrams = {
  cadence: string
  pace: string
}

export type InterviewOutputMeta = {
  sectionsCompleted: number
  sectionsTotal: number
  skipped: number
  gate: 'pass' | 'fail' | 'review'
  durationMinutes: number
  limitMinutes?: number
  securityUnit: number
  /** 1–2 reviewer paragraphs (sig.security.v1). */
  securitySummary?: string
  /** Attempt-level clarity (sig.clarity.v1 stub). Falls back to anomalyUnit in overview. */
  clarityUnit?: number
  /** 1–2 reviewer paragraphs (sig.clarity.v1 stub). */
  claritySummary?: string
  /** Session-integrity rows (cursor, typing, network). */
  securityChecks?: OverviewSecurityCheck[]
  /** Per-section Talk / editor-tape links (recordings live on those stages). */
  securityCaptures?: OverviewSecurityCapture[]
  /** Legacy bullets under the security stub when checks are absent. */
  securityPoints?: string[]
  /** Attempt-clarity rows (stage order, usability, typical session). */
  clarityChecks?: OverviewSecurityCheck[]
  /** Per-section host-clarity findings (paragraphs + sitting-read tags). */
  clarityFindings?: OverviewClarityFinding[]
  /** Bot flags with cites (not word-kill skips). */
  clarityFlags?: OverviewSignalFlag[]
  /** Shared clocks for Clarity + Security charts. */
  sessionSeries?: unknown
  /** Integrity incidents (paste / leave / reconnect / dictation). */
  securityIncidents?: OverviewSecurityIncident[]
  securityFlags?: OverviewSignalFlag[]
  /** Plain-English captions for the Security street map and pointer path. Clock uses a UI key. */
  securityDiagrams?: OverviewSecurityDiagrams
  /** Plain-English captions for the Clarity pause and idle-vs-typing charts. */
  clarityDiagrams?: OverviewClarityDiagrams
  /** Bullet points under the clarity stub. */
  clarityPoints?: string[]
  /** Anomaly-suite clearness (high = typical / not worth a look). */
  anomalyUnit?: number
  sessionMix?: RecruiterSessionMixOverall
  tensions?: RecruiterTension[]
  sittingThesis?: RecruiterSittingThesis
}

export type InterviewOutputCardFixture = {
  id: string
  candidate: { displayName: string; email?: string; photoUrl?: string | null }
  interviewer?: { displayName: string }
  briefTitle?: string
  /** One-sentence sitting summary on the collapsed card. */
  summary?: string
  /** Overview Summary: one finding per spine section (`tags[]` chips, prose `body`). */
  sittingRead?: string | SittingReadSection[]
  completedAt?: string
  softGrade: {
    overall: number
    byWeight: Record<string, InterviewOutputCardBucket>
  }
  formGate?: {
    passed: boolean | null
    gradedScore: number
    gradedMax: number
  }
  /** Live sitting only — omit on Theme sample cards (treated as complete). */
  resultStatus?: SittingResultStatus
  /** Live sitting only — names how many stages failed behind an `unmarked` dash. */
  grainCounts?: SittingGrainCounts
  meta?: InterviewOutputMeta
}

type SampleBotOutputDoc = {
  schema: typeof BOT_OUTPUT_SCHEMA
  schemaVersion: number
  id: string
  candidate: { displayName: string; photoUrl?: string | null }
  summary?: string
  sittingRead?: string | SittingReadSection[]
  decisionPackage: {
    overall: number
    formGate?: InterviewOutputCardFixture['formGate']
    byWeight: Record<string, InterviewOutputCardBucket>
  }
  meta?: InterviewOutputMeta
}

function cardFromSampleDoc(doc: SampleBotOutputDoc): InterviewOutputCardFixture {
  return {
    id: doc.id,
    candidate: {
      displayName: doc.candidate.displayName,
      photoUrl: doc.candidate.photoUrl ?? null,
    },
    summary: doc.summary,
    sittingRead: doc.sittingRead,
    softGrade: {
      overall: doc.decisionPackage.overall,
      byWeight: doc.decisionPackage.byWeight,
    },
    formGate: doc.decisionPackage.formGate,
    meta: doc.meta,
  }
}

const sampleDoc = sample as SampleBotOutputDoc

export const SAMPLE_OUTPUT_CARDS = [cardFromSampleDoc(sampleDoc)]

export function loadSampleOutputCards(): readonly InterviewOutputCardFixture[] {
  return SAMPLE_OUTPUT_CARDS
}

export function formatOutputCardPercent(unit: number | null | undefined): string {
  if (unit == null || !Number.isFinite(unit)) return '—'
  return `${Math.round(unit * 100)}%`
}

export function formGateLabel(
  gate: InterviewOutputCardFixture['formGate'] | undefined,
): string | null {
  if (!gate) return null
  if (gate.passed === true) return 'Pass'
  if (gate.passed === false) return 'Fail'
  return 'Review'
}

function suiteClearSignal(unit: number): OutputMetaSignal {
  if (unit >= 0.85) return 'good'
  if (unit >= 0.6) return 'watch'
  return 'bad'
}

function securityLabel(unit: number, signal: OutputMetaSignal): string {
  const pct = formatOutputCardPercent(unit)
  if (signal === 'good') return `Secure ${pct}`
  if (signal === 'watch') return `Watch ${pct}`
  return `Flagged ${pct}`
}

function anomalyLabel(unit: number, signal: OutputMetaSignal): string {
  const pct = formatOutputCardPercent(unit)
  if (signal === 'good') return `Clear ${pct}`
  if (signal === 'watch') return `Look ${pct}`
  return `Flagged ${pct}`
}

function durationTag(
  durationMinutes: number,
  limitMinutes: number | undefined,
): InterviewOutputMetaTag {
  if (limitMinutes == null || limitMinutes <= 0) {
    return { id: 'duration', label: `${durationMinutes} min`, signal: 'good' }
  }
  const over = durationMinutes - limitMinutes
  if (over > 0) {
    return { id: 'duration', label: `${durationMinutes} min · +${over}`, signal: 'bad' }
  }
  const remaining = limitMinutes - durationMinutes
  const signal: OutputMetaSignal = remaining <= Math.max(5, limitMinutes * 0.1) ? 'watch' : 'good'
  return { id: 'duration', label: `${durationMinutes} / ${limitMinutes} min`, signal }
}

/**
 * Collapsed-card meta shortlist (6): sections · gate · duration · skipped · security · anomalies.
 * Signals: good · watch · bad (three colours).
 */
export function collapsedMetaTags(card: InterviewOutputCardFixture): InterviewOutputMetaTag[] {
  const meta = card.meta
  if (!meta) return []
  const completed = Math.max(0, meta.sectionsCompleted)
  const total = Math.max(0, meta.sectionsTotal)
  const sectionSignal: OutputMetaSignal =
    total > 0 && completed >= total ? 'good' : completed > 0 ? 'watch' : 'bad'
  const gateSignal: OutputMetaSignal =
    meta.gate === 'pass' ? 'good' : meta.gate === 'fail' ? 'bad' : 'watch'
  const skipped = Math.max(0, meta.skipped)
  const skippedSignal: OutputMetaSignal = skipped <= 0 ? 'good' : skipped === 1 ? 'watch' : 'bad'
  const marking = sittingResultHeadlinePending(card.resultStatus)
  const needsReview = sittingResultNeedsReview(card.resultStatus)
  const secSignal = suiteClearSignal(meta.securityUnit)
  const tags: InterviewOutputMetaTag[] = [
    {
      id: 'sections',
      label: `${completed} / ${total} sections`,
      signal: sectionSignal,
    },
    {
      id: 'gate',
      label: sittingResultUnmarked(card.resultStatus)
        ? unmarkedStagesLabel(card.grainCounts)
        : marking
          ? 'Marking'
          : needsReview
            ? 'Needs review'
            : meta.gate === 'pass'
              ? 'Pass'
              : meta.gate === 'fail'
                ? 'Fail'
                : 'Review',
      signal: sittingResultUnmarked(card.resultStatus)
        ? 'bad'
        : marking
          ? 'watch'
          : needsReview
            ? 'bad'
            : gateSignal,
    },
    durationTag(meta.durationMinutes, meta.limitMinutes),
    {
      id: 'skipped',
      label: skipped === 1 ? '1 skipped' : `${skipped} skipped`,
      signal: skippedSignal,
    },
    {
      id: 'security',
      label: securityLabel(meta.securityUnit, secSignal),
      signal: secSignal,
    },
  ]
  if (typeof meta.anomalyUnit === 'number' && Number.isFinite(meta.anomalyUnit)) {
    const anomalySignal = suiteClearSignal(meta.anomalyUnit)
    tags.push({
      id: 'anomalies',
      label: anomalyLabel(meta.anomalyUnit, anomalySignal),
      signal: anomalySignal,
    })
  }
  return tags
}

export function splitOverviewParagraphs(text: string | undefined): string[] {
  if (!text?.trim()) return []
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
}

export type OverviewScoreRow = {
  id: string
  measure: string
  reading: string
  kind?: InterviewOutputCardPart['kind']
}

export type ResultOverview = {
  summary?: string
  overall: number
  tags: InterviewOutputMetaTag[]
  sittingSections: SittingReadSection[]
  securityTitle: string
  securityParagraphs: string[]
  securityUnit: number
  securityChecks: OverviewSecurityCheck[]
  securityCaptures: OverviewSecurityCapture[]
  securityPoints: string[]
  securityIncidents: OverviewSecurityIncident[]
  securityFlags: OverviewSignalFlag[]
  securityDiagrams: OverviewSecurityDiagrams | null
  clarityTitle: string
  clarityParagraphs: string[]
  clarityUnit: number
  clarityChecks: OverviewSecurityCheck[]
  clarityFindings: OverviewClarityFinding[]
  clarityFlags: OverviewSignalFlag[]
  clarityPoints: string[]
  clarityDiagrams: OverviewClarityDiagrams | null
  sessionSeries: unknown
  /** Soft Decision mix for the Overview donut. */
  softGrade: InterviewOutputCardFixture['softGrade']
  formGate?: InterviewOutputCardFixture['formGate']
  resultStatus?: SittingResultStatus
  sessionMix?: RecruiterSessionMixOverall | null
  tensions?: RecruiterTension[]
  sittingThesis?: RecruiterSittingThesis
  /** Live Results only — landing terms + support note. Sample cards omit this. */
  intakeDeclarations?: IntakeDeclarationsPack
}

function includedUnit(
  bucket: InterviewOutputCardBucket | undefined,
): number | null {
  if (!bucket?.included) return null
  if (typeof bucket.unit !== 'number' || !Number.isFinite(bucket.unit)) return null
  return bucket.unit
}

function fallbackSectionReading(
  kind: InterviewOutputCardPart['kind'] | undefined,
  scored: Pick<ResultOverview, 'formGate' | 'softGrade'>,
): string {
  if (kind === 'form' && scored.formGate) {
    return `${scored.formGate.gradedScore} / ${scored.formGate.gradedMax}`
  }
  const buckets = scored.softGrade?.byWeight
  if (!buckets) return ''
  if (kind === 'coding') {
    const bits: string[] = []
    const tests = includedUnit(buckets.codingTests)
    const method = includedUnit(buckets.codingMethod)
    if (tests != null) bits.push(formatOutputCardPercent(tests))
    if (method != null) bits.push(formatOutputCardPercent(method))
    return bits.join(' · ')
  }
  if (kind === 'doc') {
    const essay = includedUnit(buckets.essay)
    return essay != null ? formatOutputCardPercent(essay) : ''
  }
  if (kind === 'talk') {
    const delivery = includedUnit(buckets.interviewDelivery)
    return delivery != null ? formatOutputCardPercent(delivery) : ''
  }
  return ''
}

/**
 * Compact sidebar: one row per live section, score chips only (no time, no notes).
 */
export function buildOverviewScoreRows(
  sittingSections: readonly SittingReadSection[],
  spine: readonly { id: string; title: string; kind?: InterviewOutputCardPart['kind'] }[],
  scored: Pick<ResultOverview, 'formGate' | 'softGrade'>,
): OverviewScoreRow[] {
  const spineById = new Map(spine.map((row) => [row.id, row]))
  const kindCounts = new Map<string, number>()
  for (const row of sittingSections) {
    const kind = spineById.get(row.sectionId)?.kind
    if (!kind) continue
    kindCounts.set(kind, (kindCounts.get(kind) ?? 0) + 1)
  }
  return sittingSections.map((row) => {
    const step = spineById.get(row.sectionId)
    const kind = step?.kind
    const kindName =
      kind === 'form'
        ? 'Form'
        : kind === 'coding'
          ? 'Coding'
          : kind === 'doc'
            ? 'Writing'
            : kind === 'talk'
              ? 'Conversation'
              : ''
    const uniqueKind = Boolean(kind && (kindCounts.get(kind) ?? 0) === 1 && kindName)
    const measure = uniqueKind ? kindName : (step?.title.trim() || kindName || 'Section')
    const fromTags = sittingReadScoreReading(sittingReadReport(row).tags)
    const marking = (row.tags ?? []).some(
      (t) => t.hint === 'Marking' || t.label === 'Marking',
    )
    const reading = marking
      ? fromTags || '—'
      : fromTags || fallbackSectionReading(kind, scored)
    return {
      id: row.sectionId,
      measure,
      reading: reading || '—',
      kind,
    }
  })
}

function cleanPoints(points: string[] | undefined): string[] {
  return (points ?? []).map((p) => p.trim()).filter(Boolean)
}

const META_SIGNALS = new Set<OutputMetaSignal>(['good', 'watch', 'bad'])

function cleanSecurityChecks(
  rows: OverviewSecurityCheck[] | undefined,
): OverviewSecurityCheck[] {
  return (rows ?? [])
    .filter((row) => row && typeof row === 'object')
    .map((row) => {
      const unit =
        typeof row.unit === 'number' && Number.isFinite(row.unit)
          ? Math.min(1, Math.max(0, row.unit))
          : undefined
      return {
        id: String(row.id ?? '').trim(),
        check: String(row.check ?? '').trim(),
        reading: String(row.reading ?? '').trim(),
        note: String(row.note ?? '').trim(),
        signal: row.signal && META_SIGNALS.has(row.signal) ? row.signal : undefined,
        unit,
      }
    })
    .filter((row) => row.id && row.check && row.reading)
}

function cleanSecurityCaptures(
  rows: OverviewSecurityCapture[] | undefined,
): OverviewSecurityCapture[] {
  return (rows ?? [])
    .filter((row) => row && typeof row === 'object')
    .map((row) => ({
      sectionId: String(row.sectionId ?? '').trim(),
      capture: String(row.capture ?? '').trim(),
      note: String(row.note ?? '').trim(),
    }))
    .filter((row) => row.sectionId && row.capture)
}

function cleanFlags(rows: OverviewSignalFlag[] | undefined): OverviewSignalFlag[] {
  return (rows ?? [])
    .map((row) => ({
      id: String(row.id ?? '').trim(),
      signal: META_SIGNALS.has(row.signal) ? row.signal : ('watch' as const),
      label: String(row.label ?? '').trim(),
      why: String(row.why ?? '').trim(),
      ...(row.quote ? { quote: String(row.quote).trim() } : {}),
      ...(row.evidenceRefs?.length ? { evidenceRefs: row.evidenceRefs } : {}),
    }))
    .filter((row) => row.id && row.label)
}

function cleanFindings(rows: OverviewClarityFinding[] | undefined): OverviewClarityFinding[] {
  return (rows ?? [])
    .map((row) => ({
      sectionId: String(row.sectionId ?? '').trim(),
      body: String(row.body ?? '').trim(),
      ...(row.tags?.length ? { tags: row.tags } : {}),
      ...(row.evidenceRefs?.length ? { evidenceRefs: row.evidenceRefs } : {}),
    }))
    .filter((row) => row.sectionId && row.body)
}

function cleanIncidents(
  rows: OverviewSecurityIncident[] | undefined,
): OverviewSecurityIncident[] {
  return (rows ?? [])
    .map((row) => ({
      id: String(row.id ?? '').trim(),
      kind: String(row.kind ?? '').trim(),
      sectionId: String(row.sectionId ?? '').trim(),
      t: typeof row.t === 'number' ? row.t : 0,
      preMs: typeof row.preMs === 'number' ? row.preMs : 30_000,
      postMs: typeof row.postMs === 'number' ? row.postMs : 30_000,
      ...(row.pre?.body ? { pre: { body: String(row.pre.body) } } : {}),
      ...(row.post?.body ? { post: { body: String(row.post.body) } } : {}),
      ...(row.tags?.length ? { tags: row.tags } : {}),
      ...(row.evidenceRefs?.length ? { evidenceRefs: row.evidenceRefs } : {}),
    }))
    .filter((row) => row.id && row.kind && row.sectionId)
}

function cleanDiagrams(
  raw: OverviewSecurityDiagrams | undefined,
): OverviewSecurityDiagrams | null {
  if (!raw) return null
  const location = String(raw.location ?? '').trim()
  const pointer = String(raw.pointer ?? '').trim()
  const incidents = String(raw.incidents ?? '').trim()
  if (!location && !pointer && !incidents) return null
  return { location, pointer, incidents }
}

function cleanClarityDiagrams(
  raw: OverviewClarityDiagrams | undefined,
): OverviewClarityDiagrams | null {
  if (!raw) return null
  const cadence = String(raw.cadence ?? '').trim()
  const pace = String(raw.pace ?? '').trim()
  if (!cadence && !pace) return null
  return { cadence, pace }
}

/**
 * Result-spine Overview — sitting-level document (read, security, clarity).
 * Per-section synth stays on spine stages. Scoreboard rows are built in the UI
 * from sittingRead + live spine titles.
 */
export function buildResultOverview(card: InterviewOutputCardFixture): ResultOverview {
  const meta = card.meta
  return {
    summary: card.summary,
    overall: card.softGrade.overall,
    tags: collapsedMetaTags(card),
    sittingSections: normalizeSittingRead(card.sittingRead),
    securityTitle: catalogTemplate('sig.security.v1')?.label ?? 'Security overview',
    securityParagraphs: splitOverviewParagraphs(meta?.securitySummary),
    securityUnit: typeof meta?.securityUnit === 'number' ? meta.securityUnit : 0,
    securityChecks: cleanSecurityChecks(meta?.securityChecks),
    securityCaptures: cleanSecurityCaptures(meta?.securityCaptures),
    securityPoints: cleanPoints(meta?.securityPoints),
    clarityTitle: catalogTemplate('sig.clarity.v1')?.label ?? 'Clarity overview',
    clarityParagraphs: splitOverviewParagraphs(meta?.claritySummary),
    clarityUnit:
      typeof meta?.clarityUnit === 'number'
        ? meta.clarityUnit
        : typeof meta?.anomalyUnit === 'number'
          ? meta.anomalyUnit
          : 0,
    clarityChecks: cleanSecurityChecks(meta?.clarityChecks),
    clarityFindings: cleanFindings(meta?.clarityFindings),
    clarityFlags: cleanFlags(meta?.clarityFlags),
    clarityPoints: cleanPoints(meta?.clarityPoints),
    sessionSeries: meta?.sessionSeries ?? null,
    securityIncidents: cleanIncidents(meta?.securityIncidents),
    securityFlags: cleanFlags(meta?.securityFlags),
    securityDiagrams: cleanDiagrams(meta?.securityDiagrams),
    clarityDiagrams: cleanClarityDiagrams(meta?.clarityDiagrams),
    softGrade: card.softGrade,
    formGate: card.formGate,
    resultStatus: card.resultStatus,
    sessionMix: meta?.sessionMix ?? null,
    tensions: meta?.tensions ?? [],
    sittingThesis: meta?.sittingThesis,
  }
}

export function buildOutputCardFromScored(input: {
  id: string
  candidate: { displayName: string; email?: string; photoUrl?: string | null }
  interviewer?: { displayName: string }
  briefTitle?: string
  summary?: string
  sittingRead?: string | SittingReadSection[]
  completedAt?: string
  meta?: InterviewOutputMeta
  scored: Pick<AttemptScorePackage, 'softGrade' | 'formGate' | 'resultStatus'> &
    Partial<Pick<AttemptScorePackage, 'grainCounts'>>
}): InterviewOutputCardFixture {
  const byWeight: Record<string, InterviewOutputCardBucket> = {}
  for (const [key, bucket] of Object.entries(input.scored.softGrade.byWeight)) {
    byWeight[key] = {
      label: bucket.label,
      unit: bucket.unit,
      weight: bucket.weight,
      included: bucket.included,
      summary: bucket.summary,
      summaryDetail: bucket.summaryDetail,
      axes: bucket.axes?.map((a) => ({
        key: a.key,
        label: a.label,
        unit: a.unit,
      })),
    }
  }
  return {
    id: input.id,
    candidate: input.candidate,
    interviewer: input.interviewer,
    briefTitle: input.briefTitle,
    summary: input.summary,
    sittingRead: input.sittingRead,
    completedAt: input.completedAt,
    meta: input.meta,
    softGrade: {
      overall: input.scored.softGrade.overall,
      byWeight,
    },
    formGate: input.scored.formGate
      ? {
          passed: input.scored.formGate.passed,
          gradedScore: input.scored.formGate.gradedScore,
          gradedMax: input.scored.formGate.gradedMax,
        }
      : undefined,
    resultStatus: input.scored.resultStatus,
    grainCounts: input.scored.grainCounts,
  }
}
