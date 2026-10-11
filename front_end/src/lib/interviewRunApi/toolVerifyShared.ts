/**
 * Shared helpers for tool Soft Decision Verify modals (form / coding / essay).
 */
import { labelTemplate } from '../interviewBrief/analysisLabels'
import type { Creator2BriefDocument } from '../interviewBrief/creator2BriefTypes'
import { mapCreator2BriefToTimeline } from '../interviewBrief/mapCreator2BriefToTimeline'
import type { GrainContribution } from './scoreAttempt'
import type { AnalysisGrainStub, InterviewResponse } from './talkTypes'
import type { TalkVerifyMarkingCard } from './talkVerifyModal'
import { grainBoardSummary, parseBucketNotes, parsePasteBursts } from './recruiterProcess'
import { depthReviewNote } from '../../../../back_end/supabase/functions/_shared/interview-assessors/depthLadder.ts'

export type ToolVerifyPackage = {
  assessorNotes?: unknown
  gaps?: unknown
  summary?: unknown
  items?: unknown
  [key: string]: unknown
}

function rec(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
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
  return grain.evidence.map((e) => String(e)).filter(Boolean).slice(0, 8)
}

function tapeTagsFromResult(result: unknown): TalkVerifyMarkingCard['tapeTags'] {
  if (!result || typeof result !== 'object') return undefined
  const raw = (result as { tags?: unknown }).tags
  if (!Array.isArray(raw)) return undefined
  const out: NonNullable<TalkVerifyMarkingCard['tapeTags']> = []
  for (const item of raw.slice(0, 8)) {
    if (!item || typeof item !== 'object') continue
    const rec = item as { t?: unknown; label?: unknown; kind?: unknown }
    const t = typeof rec.t === 'number' && Number.isFinite(rec.t) ? rec.t : undefined
    const label = String(rec.label ?? '').trim()
    if (t == null || !label) continue
    out.push({ t, label, kind: String(rec.kind ?? '').trim() || undefined })
  }
  return out.length ? out : undefined
}

/** Brief phase → authored `toolRef` (analysis.tools host). */
export function phaseToolRef(
  brief: Creator2BriefDocument,
  phaseId: string | null | undefined,
): string | null {
  const id = phaseId?.trim()
  if (!id) return null
  const phase = brief.phases.find((row) => row.id === id)
  return phase && 'toolRef' in phase && typeof phase.toolRef === 'string'
    ? phase.toolRef
    : null
}

/** `tool.coding.oh9vol` → `coding`. The prefix is the host-key convention on every attempt. */
function hostRefKind(hostRef: string): string {
  const parts = hostRef.split('.')
  return parts.length >= 3 && parts[0] === 'tool' ? parts[1]! : ''
}

/** Brief phase → its kind, and its position among the brief's tool phases of that kind. */
function phaseKindSlot(
  brief: Creator2BriefDocument,
  phaseId: string | null | undefined,
): { kind: string; index: number } | null {
  const id = phaseId?.trim()
  if (!id) return null
  const toolPhases = brief.phases.filter((row) => 'toolRef' in row && typeof row.toolRef === 'string')
  const self = toolPhases.find((row) => row.id === id)
  if (!self) return null
  const kind = hostRefKind(String((self as { toolRef?: string }).toolRef ?? ''))
  if (!kind) return null
  const sameKind = toolPhases.filter(
    (row) => hostRefKind(String((row as { toolRef?: string }).toolRef ?? '')) === kind,
  )
  const index = sameKind.findIndex((row) => row.id === id)
  return index < 0 ? null : { kind, index }
}

/**
 * Phase toolRef when that host exists on this attempt.
 *
 * When it does not — a fixture dump recorded against a different brief, or a rename — fall
 * back on kind and position: the second coding phase binds the second coding host, never the
 * first. A blind scan for the template used to hand one section another section's marks.
 * If nothing lines up, return the authored ref so the section reads empty, which is honest.
 */
export function attemptHostRef(
  brief: Creator2BriefDocument,
  phaseId: string | null | undefined,
  response: InterviewResponse,
): string | null {
  const preferred = phaseToolRef(brief, phaseId)
  if (preferred && response.analysis.tools?.[preferred]) return preferred
  const hosts = Object.keys(response.analysis.tools ?? {})
  if (hosts.length === 1) return hosts[0]!
  const slot = phaseKindSlot(brief, phaseId)
  if (slot) {
    const sameKind = hosts.filter((ref) => hostRefKind(ref) === slot.kind).sort()
    const match = sameKind[slot.index]
    if (match) return match
  }
  return preferred
}

/** Spine step when it exists on the brief; else first on-spine tool of that kind. */
export function resolveVerifyPhaseId(
  brief: Creator2BriefDocument,
  kind: 'form' | 'coding' | 'doc',
  phaseId?: string | null,
): string | null {
  const id = phaseId?.trim()
  if (id && brief.phases.some((row) => row.id === id)) return id
  return findTimelinePhaseId(brief, kind)
}

/**
 * Grain matching templateId. Prefer `hostRef` when set; else first host.
 *
 * The scan is a fixture affordance. When the caller names a host, do not wander: a second
 * coding section shares template ids with the first, and the scan used to hand back the
 * other section's grain, which is how later-stage marks surfaced under an earlier section.
 */
export function findToolGrain(
  response: InterviewResponse,
  templateId: string,
  hostRef?: string | null,
): { hostRef: string; grain: AnalysisGrainStub } | null {
  const prefer = hostRef?.trim()
  if (prefer) {
    const grain = response.analysis.tools?.[prefer]?.[templateId]
    return grain ? { hostRef: prefer, grain } : null
  }
  for (const [ref, row] of Object.entries(response.analysis.tools ?? {})) {
    const grain = row?.[templateId]
    if (!grain) continue
    return { hostRef: ref, grain }
  }
  return null
}

export function findToolPackage(
  response: InterviewResponse,
  hostRef: string,
): ToolVerifyPackage | null {
  const pkg = response.analysis.toolPackages?.[hostRef]
  if (!pkg || typeof pkg !== 'object') return null
  return pkg as ToolVerifyPackage
}

export function cardsFromGrain(
  grain: AnalysisGrainStub | null | undefined,
  opts: {
    lane: TalkVerifyMarkingCard['lane']
    title?: string
    emphasized?: boolean
    id?: string
  },
): TalkVerifyMarkingCard[] {
  if (!grain) return []
  const skipped = grain.status === 'skipped'
  const pending = grain.status === 'pending'
  const isSynth = grain.templateId.startsWith('synth.')
  if (grain.status !== 'filled' && grain.status !== 'skipped' && grain.status !== 'pending') {
    return []
  }
  const title =
    opts.title?.trim() ||
    labelTemplate(grain.templateId) ||
    grain.templateId.replace(/^mark\./, '').replace(/\.v1$/, '') ||
    'Mark'
  const { summary, detail } = grainBoardSummary(grain.result)
  const bucketNotes = parseBucketNotes(rec(grain.result)?.bucketNotes)
  const pasteBursts = parsePasteBursts(rec(grain.result)?.pasteBursts)
  const extraEvidence = [
    ...bucketNotes.map((n) => n.summary),
    ...pasteBursts.map((b) => b.summary),
  ]
  const extraRefs = [
    ...bucketNotes.map((n) => ({
      kind: 'tape_action',
      ref: n.id,
      t: n.startMs,
      quote: n.summary,
    })),
    ...pasteBursts.map((b) => ({
      kind: 'tape_action',
      ref: 'paste',
      t: b.t,
      quote: b.summary,
    })),
  ]
  const glance = summary || grain.justification?.trim() || (pending ? 'Scoring in progress' : undefined)
  const trail = detail || grain.justification?.trim()
  return [
    {
      id: opts.id ?? `grain:${grain.templateId}:${grain.hostRef}`,
      kind: 'general',
      anchorMessageId: '',
      messageIds: [],
      title,
      lane: opts.lane,
      emphasized: skipped || pending ? false : (opts.emphasized ?? true),
      scored: !skipped && !pending && !isSynth,
      status: grain.status,
      templateId: grain.templateId,
      hostRef: grain.hostRef,
      dimensions: dimRows(grain),
      justification: glance,
      boardSummary: summary || undefined,
      boardSummaryDetail: trail && trail !== summary ? trail : undefined,
      evidence: [...evidenceList(grain), ...extraEvidence].slice(0, 12),
      evidenceRefs: [...(grain.evidenceRefs ?? []), ...extraRefs],
      confidence: grain.confidence,
      tapeTags: tapeTagsFromResult(grain.result),
      bucketNotes,
      pasteBursts,
    },
  ]
}

export function applyContributionsToCards(
  cards: TalkVerifyMarkingCard[],
  contributions: readonly GrainContribution[] | undefined,
): TalkVerifyMarkingCard[] {
  if (!contributions?.length) return cards
  const byKey = new Map(
    contributions.map((c) => [`${c.templateId}:${c.hostRef}`, c]),
  )
  return cards.map((card) => {
    const key =
      card.templateId && card.hostRef ? `${card.templateId}:${card.hostRef}` : null
    const hit = key ? byKey.get(key) : undefined
    if (!hit) return card
    return {
      ...card,
      unit: hit.unit,
      towardOverall: hit.towardOverall,
    }
  })
}

function grainRank(templateId: string): number {
  if (
    templateId === 'mark.code.tests.v1' ||
    templateId === 'mark.form.key.v1' ||
    templateId === 'mark.doc.essay.v1' ||
    templateId === 'mark.doc.brief.v1'
  ) {
    return 0
  }
  if (templateId === 'mark.code.method.v1') return 1
  if (templateId === 'mark.code.structure.v1') return 2
  if (templateId === 'mark.form.reasoning.v1') return 3
  if (templateId.startsWith('synth.')) return 90
  return 50
}

/** Walk every grain on a tool host (filled, honest skip, custom, synth). */
export function cardsFromToolHost(
  response: InterviewResponse,
  hostRef: string,
  opts?: {
    emphasizeTemplateId?: string
    lane?: TalkVerifyMarkingCard['lane']
  },
): TalkVerifyMarkingCard[] {
  const row = response.analysis.tools?.[hostRef] ?? {}
  const ids = Object.keys(row).sort((a, b) => grainRank(a) - grainRank(b) || a.localeCompare(b))
  const cards: TalkVerifyMarkingCard[] = []
  for (const id of ids) {
    if (id.startsWith('sig.')) continue
    if (id === 'mark.assist.use.v1') continue
    const grain = row[id]
    if (!grain) continue
    cards.push(
      ...cardsFromGrain(grain, {
        lane: opts?.lane ?? (id.startsWith('mark.doc.') ? 'content' : 'general'),
        title: labelTemplate(id),
        emphasized: opts?.emphasizeTemplateId === id,
        id: `grain:${id}:${hostRef}`,
      }),
    )
  }
  return cards
}

export function cardsFromPackageNotes(pkg: ToolVerifyPackage | null | undefined): TalkVerifyMarkingCard[] {
  if (!pkg) return []
  const cards: TalkVerifyMarkingCard[] = []
  const notes = Array.isArray(pkg.assessorNotes)
    ? pkg.assessorNotes.map((n) => String(n).trim()).filter(Boolean)
    : []
  const gaps = Array.isArray(pkg.gaps)
    ? pkg.gaps.map((g) => String(g).trim()).filter(Boolean)
    : []
  const summary = typeof pkg.summary === 'string' ? pkg.summary.trim() : ''

  if (notes.length > 0 || summary) {
    cards.push({
      id: 'package:notes',
      kind: 'general',
      anchorMessageId: '',
      messageIds: [],
      title: 'Assessor notes',
      lane: 'general',
      emphasized: false,
      scored: false,
      dimensions: [],
      justification: summary || notes.map((n) => `- ${n}`).join('\n') || undefined,
      boardSummaryDetail: notes.length ? notes.map((n) => `- ${n}`).join('\n') : undefined,
      evidence: notes.slice(0, 8),
    })
  }
  if (gaps.length > 0) {
    cards.push({
      id: 'package:gaps',
      kind: 'general',
      anchorMessageId: '',
      messageIds: [],
      title: 'Gaps',
      lane: 'general',
      emphasized: false,
      scored: false,
      dimensions: [],
      evidence: gaps.map((g) => `- ${g}`).slice(0, 12),
    })
  }
  return cards
}

/** First on-spine timeline step id for a tool kind. */
export function findTimelinePhaseId(
  brief: Creator2BriefDocument,
  kind: 'form' | 'coding' | 'doc',
): string | null {
  const timeline = mapCreator2BriefToTimeline(brief)
  const step = timeline.steps.find((s) => {
    if (s.offSpine) return false
    if (kind === 'form') return Boolean(s.formEditor)
    if (kind === 'coding') return Boolean(s.codingEditor)
    return Boolean(s.docEditor)
  })
  return step?.id ?? null
}
