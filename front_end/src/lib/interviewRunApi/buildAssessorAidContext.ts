/**
 * AssessorAidContext — inject Soft Decision Verify fixture pack into every Aid compose.
 */
import type { AssessorAidReport } from './buildAssessorAidReport'
import { describeAidLocus } from './buildAssessorAidReport'
import type { AidPeelAttach } from './aidPeelAttach'
import type { SoftGradeBucket } from './scoreAttempt'
import type { TalkVerifyMarkingCard, TalkVerifyModal } from './talkVerifyModal'

/** Talk or tool Verify modal shape — tool modals may omit transcript messages. */
export type AssessorAidModalLike = {
  fixtureId: string
  sectionKey: string
  sectionLabel: string
  title: string
  description: string
  depthLabel: string
  personaName?: string
  softBucket?: TalkVerifyModal['softBucket'] | null
  messages?: TalkVerifyModal['messages']
  cards: TalkVerifyMarkingCard[]
}

export type AssessorAidContext = {
  fixtureId: string
  sectionKey: string
  sectionLabel: string
  title: string
  description: string
  depthLabel: string
  personaName: string
  softBucket: SoftGradeBucket | null
  messages: Array<{
    id: string
    role: string
    text: string
    at?: string
    topicId?: string
    probeId?: string
    kind?: string
  }>
  cards: TalkVerifyMarkingCard[]
  focusMessageId?: string | null
  focusCardId?: string | null
  focusPrompt?: string | null
  /** Results home the marker kicked to chat — pack-first, not a pasted draft. */
  attach?: AidPeelAttach | null
  /** The whole recruiter report — overview, security, clarity, every section's axes. */
  report?: AssessorAidReport
  /** Where the reader is right now, in a sentence the prompt can quote back. */
  readerPosition?: string
}

export function buildAssessorAidContext(input: {
  modal: AssessorAidModalLike
  focusMessageId?: string | null
  focusCardId?: string | null
  focusPrompt?: string | null
  attach?: AidPeelAttach | null
  report?: AssessorAidReport | null
}): AssessorAidContext {
  const messages = input.modal.messages ?? []
  const report = input.report ?? null
  const attach = input.attach ?? null
  const snap = attach?.snapshot
  const cards = [...(input.modal.cards ?? [])]
  if (snap?.id && !cards.some((card) => card.id === snap.id)) {
    const lane =
      snap.lane === 'delivery' || snap.lane === 'content' || snap.lane === 'general'
        ? snap.lane
        : 'general'
    cards.unshift({
      id: snap.id,
      kind: 'general',
      anchorMessageId: snap.anchorMessageId ?? '',
      messageIds: snap.anchorMessageId ? [snap.anchorMessageId] : [],
      title: snap.title,
      lane,
      emphasized: false,
      dimensions: (snap.dimensions ?? []).map((dim) => ({
        key: dim.label,
        label: dim.label,
        score: dim.score ?? '',
        ...(dim.notes ? { notes: dim.notes } : {}),
      })),
      evidence: snap.evidence ?? [],
      ...(snap.boardSummary ? { boardSummary: snap.boardSummary } : {}),
      ...(snap.justification ? { justification: snap.justification } : {}),
    })
  }
  return {
    fixtureId: input.modal.fixtureId,
    sectionKey: input.modal.sectionKey,
    sectionLabel: input.modal.sectionLabel,
    title: input.modal.title,
    description: input.modal.description,
    depthLabel: input.modal.depthLabel,
    personaName: input.modal.personaName ?? 'Assessor Aid',
    softBucket: input.modal.softBucket ?? null,
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      text: m.text,
      ...(m.at?.trim() ? { at: m.at.trim() } : {}),
      topicId: m.topicId ?? undefined,
      probeId: m.probeId ?? undefined,
      ...('kind' in m && m.kind ? { kind: String(m.kind) } : {}),
    })),
    cards,
    focusMessageId: input.focusMessageId ?? null,
    focusCardId: input.focusCardId ?? null,
    focusPrompt: input.focusPrompt ?? null,
    ...(attach ? { attach } : {}),
    ...(report ? { report, readerPosition: describeAidLocus(report.locus) } : {}),
  }
}

/** Report vocabulary — these questions are about the card, not the transcript. */
const REPORT_WORD = /\b(report|overview|section|sections|card|result|results|verdict|overall|thesis|summary of)\b/
const RECOMMEND_WORD =
  /\b(recommend|hire|proceed|should we|what do you think|next (round|loop|interview|step)|follow[- ]?ups?)\b/
const SECURITY_WORD = /\b(security|integrity|leave|left the|reconnect|dictation|tab)\b|\b(past(e|ed|ing)|incident|cheat)\w*/
const CLARITY_HOME =
  /\bclarity\b|\b(ambiguous|usability|instructions|wording)\b|\b(confus|readab|misread)\w*/
const SCORE_WORD =
  /\b(grain|dimension|score|justification|evidence|delivery|content|why (is|was|did)|marking|percent)\b/
/** `here`, `this section`, `on screen` — only answerable if the Aid knows the reader position. */
const HERE_WORD = /\b(here|this (section|page|part|screen|one)|on screen|currently|right now|what am i)\b/

/** FE hint only. Plan needs own which Results row to bind; this router is not the planner. */
export function inferAssessorAidSituation(text: string): string {
  const t = text.toLowerCase().trim()
  if (SECURITY_WORD.test(t)) return 'explain_security'
  if (SCORE_WORD.test(t) && !/\bclarity\b/.test(t)) {
    if (HERE_WORD.test(t)) return 'explain_here'
    return 'explain_grain'
  }
  if (CLARITY_HOME.test(t)) return 'explain_clarity'
  if (RECOMMEND_WORD.test(t)) return 'recommend'
  if (HERE_WORD.test(t)) return 'explain_here'
  if (/\b(find|where|locate|jump|highlight|show me)\b/.test(t)) return 'locate_utterance'
  if (/\b(compare|vs|versus|difference)\b/.test(t)) return 'compare_turns'
  if (REPORT_WORD.test(t)) return 'explain_report'
  if (/\b(summarize|summary|topic)\b/.test(t)) return 'summarize_topic'
  if (/\b(challenge|disagree|too (low|high)|band)\b/.test(t)) return 'challenge_band'
  return 'clarify'
}

/** Compact results-board snapshot for Sitting DIAG PART 2 — same job as Vurex PART 3 board dump. */
export function formatAidPackDiag(ctx: AssessorAidContext | null | undefined): string[] {
  if (!ctx) return ['(no assessorAidContext)']
  const report = ctx.report
  const sections = Array.isArray(report?.sections) ? report.sections : []
  const sitting = Array.isArray(ctx.messages) ? ctx.messages : []
  const talk = sitting.filter((m) => m.kind !== 'copilot' && m.role !== 'assistant').length
  const copilot = sitting.filter((m) => /copilot/i.test(String(m.kind ?? '')) || /copilot/i.test(m.id)).length
  const lines = [
    `title: ${ctx.title || '—'}  section=${ctx.sectionLabel || ctx.sectionKey || '—'}`,
    report?.overallPercent ? `overall: ${report.overallPercent}` : 'overall: (none)',
    report?.thesis ? `thesis: ${String(report.thesis).replace(/\s+/g, ' ').trim().slice(0, 160)}` : 'thesis: (none)',
    ctx.readerPosition ? `here: ${ctx.readerPosition}` : 'here: (none)',
    `sitting: ${sitting.length} lines (talk~${talk} copilot~${copilot})`,
    `cards: ${ctx.cards?.length ?? 0}`,
    `sections (${sections.length}):`,
    ...(sections.length
      ? sections.slice(0, 12).map((s) => {
          const open = s.reading ? ' [open]' : ''
          const pct = s.axes?.[0]?.percent ? ` ${s.axes[0].percent}` : ''
          return `  - ${s.title || s.id}${open}${pct}`
        })
      : ['  (none)']),
  ]
  return lines
}
