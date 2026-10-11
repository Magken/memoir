/**
 * Expanded Work / Conversation mark view-model.
 *
 * Collapsed radars already have axis + reading + Why. Expanded cards used to dump
 * boardSummary, justification, synthesis, and dimension notes on top of each other.
 * This projector picks one home per sentence and groups cards by artifact vs chat.
 */
import { chipReadingOk } from './reportDialect'
import { firstJumpCite, type JumpCite } from './jumpCite'
import {
  axisDisplayReading,
  axisUnitBand,
  type ResultHomeRadar,
  type ResultHomeRadarAxis,
} from './resultHomes'
import { ASSIST_TURN_TEMPLATE_ID } from './assistTurnMarks'
import type { TalkVerifyMarkingCard } from './talkVerifyModal'

export type MarkLane = 'work' | 'conversation'

export type MarkBeatAxis = {
  key: string
  label: string
  reading: string
  why: string
}

export type MarkBeat = {
  id: string
  title: string
  reading: string
  lead: string
  axes: MarkBeatAxis[]
  detail?: string
  cite: JumpCite | null
  templateId?: string
  scored: boolean
}

export type MarkGroupId = 'produced' | 'process' | 'assist' | 'delivery' | 'content' | 'other'

export type MarkGroup = {
  id: MarkGroupId
  title: string
  lane: MarkLane
  radarTemplateId?: string
  cards: TalkVerifyMarkingCard[]
  beats: MarkBeat[]
}

const PRODUCED = new Set([
  'mark.code.tests.v1',
  'mark.code.method.v1',
  'mark.code.structure.v1',
  'mark.doc.essay.v1',
  'mark.form.key.v1',
  'mark.form.reasoning.v1',
])

const PROCESS = new Set([
  'mark.code.approach.v1',
  'mark.code.authorship.v1',
  'mark.doc.approach.v1',
  'mark.doc.authorship.v1',
])

const BAND_READINGS = new Set(['Strong', 'Solid', 'Mixed', 'Thin', 'Weak', 'Not scored'])

const GROUP_ORDER: MarkGroupId[] = [
  'produced',
  'process',
  'assist',
  'delivery',
  'content',
  'other',
]

const GROUP_TITLE: Record<MarkGroupId, string> = {
  produced: 'What they produced',
  process: 'How they worked',
  assist: 'How they used Assist',
  delivery: 'How they speak',
  content: 'Substance vs the topic',
  other: 'Other marks',
}

/** Family heading is enough when the card title restates it or only adds a parenthetical. */
export function markBeatHeading(title: string, groupTitle: string): string | null {
  const stripped = title.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
  if (!stripped) return null
  const a = stripped.toLowerCase()
  const b = groupTitle.trim().toLowerCase()
  if (!b) return stripped
  if (a === b) return null
  if (a.startsWith(`${b} `)) return null
  if (/^how they \w+$/.test(a) && /^how they /.test(b)) return null
  return stripped
}

function normalizeSentence(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .replace(/[.!?]+$/g, '')
}

function splitSentences(text: string): string[] {
  const t = text.trim()
  if (!t) return []
  return t
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function sentenceSet(texts: readonly string[]): Set<string> {
  const out = new Set<string>()
  for (const text of texts) {
    for (const sentence of splitSentences(text)) {
      const key = normalizeSentence(sentence)
      if (key) out.add(key)
    }
  }
  return out
}

/** True when every sentence in `text` already appears in `prior`. */
export function repeatsPrior(text: string, prior: readonly string[]): boolean {
  const sentences = splitSentences(text)
  if (!sentences.length) return true
  const bag = sentenceSet(prior)
  return sentences.every((sentence) => bag.has(normalizeSentence(sentence)))
}

export function markLaneForTemplate(templateId: string | undefined): MarkLane {
  const id = templateId?.trim() ?? ''
  if (!id) return 'work'
  if (id === ASSIST_TURN_TEMPLATE_ID) return 'conversation'
  if (id.startsWith('iv.')) return 'conversation'
  return 'work'
}

export function markGroupIdForTemplate(templateId: string | undefined): MarkGroupId {
  const id = templateId?.trim() ?? ''
  if (id === ASSIST_TURN_TEMPLATE_ID) return 'assist'
  if (id === 'iv.delivery.v1' || id === 'iv.question.v1') return 'delivery'
  if (id === 'iv.content.v1') return 'content'
  if (PRODUCED.has(id)) return 'produced'
  if (PROCESS.has(id) || /\.approach\.v1$/.test(id) || /\.authorship\.v1$/.test(id)) {
    return 'process'
  }
  if (id.startsWith('synth.') || id.startsWith('sig.')) return 'other'
  return markLaneForTemplate(id) === 'conversation' ? 'assist' : 'produced'
}

function axisFromDim(
  dim: TalkVerifyMarkingCard['dimensions'][number],
  unit: number,
): ResultHomeRadarAxis {
  return {
    key: dim.key,
    label: dim.label,
    unit,
    score: dim.score,
    notes: dim.notes,
  }
}

function readingFromAxis(axis: ResultHomeRadarAxis): string {
  const raw = axisDisplayReading(axis)
  if (BAND_READINGS.has(raw)) return raw
  if (chipReadingOk(raw)) return raw
  return axisUnitBand(axis.unit)
}

function cardReading(card: TalkVerifyMarkingCard, axes: MarkBeatAxis[]): string {
  if (card.status === 'pending') return 'Not scored'
  if (card.scored === false || card.status === 'skipped') return 'Not scored'
  const unit = typeof card.unit === 'number' && Number.isFinite(card.unit) ? card.unit : null
  if (unit != null) {
    const band = axisUnitBand(unit)
    if (BAND_READINGS.has(band)) return band
  }
  const unique = [...new Set(axes.map((a) => a.reading).filter((r) => r && r !== 'Not scored'))]
  if (unique.length === 1) return unique[0]!
  if (unique.length > 1) return 'Mixed'
  return ''
}

function leadFromCard(card: TalkVerifyMarkingCard): string {
  const summary = card.boardSummary?.trim() ?? ''
  if (summary) return summary
  return card.justification?.trim() ?? ''
}

function stripDepthNoise(text: string): string {
  return text
    .replace(/Shown in one separate moment\.?/gi, ' ')
    .replace(/Shown in \d+ separate moments\.?/gi, ' ')
    .replace(/One of them was decisive\.?/gi, ' ')
    .replace(/\d+ of them were decisive\.?/gi, ' ')
    .replace(
      /The cited evidence did not carry the claimed reading, so the mark was held down\.?/gi,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim()
}

export function markBeatFromCard(card: TalkVerifyMarkingCard): MarkBeat {
  const unit = typeof card.unit === 'number' && Number.isFinite(card.unit) ? card.unit : 0
  const lead = leadFromCard(card)
  const axes: MarkBeatAxis[] = (card.dimensions ?? []).map((dim) => {
    const axis = axisFromDim(dim, unit)
    const whyRaw = stripDepthNoise(dim.notes?.trim() ?? '')
    const why = whyRaw && !repeatsPrior(whyRaw, [lead]) ? whyRaw : ''
    return {
      key: dim.key,
      label: dim.label || dim.key,
      reading: readingFromAxis(axis),
      why,
    }
  })
  const axisWhys = axes.map((a) => a.why).filter(Boolean)
  const detailRaw = card.boardSummaryDetail?.trim() ?? ''
  const detail =
    axes.length === 0 && detailRaw && !repeatsPrior(detailRaw, [lead, ...axisWhys])
      ? detailRaw
      : undefined
  return {
    id: card.id,
    title: card.title,
    reading: cardReading(card, axes),
    lead,
    axes,
    detail,
    cite: firstJumpCite(card.evidenceRefs),
    templateId: card.templateId,
    scored: card.scored !== false && card.status !== 'skipped' && card.status !== 'pending',
  }
}

/** One closing narrative for the section. Never printed per card. */
export function synthesisBeat(cards: readonly TalkVerifyMarkingCard[]): string {
  const seen = new Set<string>()
  const parts: string[] = []
  for (const card of cards) {
    const text = card.synthesisText?.trim() ?? ''
    if (!text) continue
    const key = normalizeSentence(text)
    if (!key || seen.has(key)) continue
    seen.add(key)
    parts.push(text)
  }
  return parts[0] ?? ''
}

export function markGroupsForKind(
  kind: 'talk' | 'coding' | 'doc' | 'form' | string,
  cards: readonly TalkVerifyMarkingCard[],
): MarkGroup[] {
  const byId = new Map<MarkGroupId, TalkVerifyMarkingCard[]>()
  for (const card of cards) {
    if (!card.templateId) continue
    if (card.templateId.startsWith('synth.')) continue
    if (card.templateId.startsWith('sig.')) continue
    const groupId = markGroupIdForTemplate(card.templateId)
    const lane = markLaneForTemplate(card.templateId)
    if (kind === 'talk' && lane === 'work') continue
    const list = byId.get(groupId) ?? []
    list.push(card)
    byId.set(groupId, list)
  }
  const groups: MarkGroup[] = []
  for (const id of GROUP_ORDER) {
    const groupCards = byId.get(id)
    if (!groupCards?.length) continue
    const radarTemplateId = groupCards.find((c) => c.templateId && (c.dimensions?.length ?? 0) >= 1)
      ?.templateId
    groups.push({
      id,
      title: GROUP_TITLE[id],
      lane: id === 'assist' || id === 'delivery' || id === 'content' ? 'conversation' : 'work',
      radarTemplateId,
      cards: groupCards,
      beats: groupCards.map(markBeatFromCard),
    })
  }
  return groups
}

export function workGroups(cards: readonly TalkVerifyMarkingCard[]): MarkGroup[] {
  return markGroupsForKind('coding', cards).filter((g) => g.lane === 'work')
}

export function conversationGroups(cards: readonly TalkVerifyMarkingCard[]): MarkGroup[] {
  return markGroupsForKind('coding', cards).filter((g) => g.lane === 'conversation')
}

const UNIT_FROM_BAND: Record<string, number> = {
  Strong: 1,
  Solid: 0.8,
  Mixed: 0.5,
  Thin: 0.35,
  Weak: 0.2,
  'Not scored': 0,
}

function axesFromBeat(beat: MarkBeat): ResultHomeRadar['axes'] {
  return beat.axes.map((axis) => ({
    key: axis.key,
    label: axis.label,
    unit: UNIT_FROM_BAND[axis.reading] ?? 0.2,
    notes: axis.why || undefined,
    score: axis.reading.toLowerCase(),
  }))
}

/** Radar home for a beat. Always returns axes so Why rows can render when the web cannot. */
export function radarFromMarkBeat(beat: MarkBeat): ResultHomeRadar | null {
  if (!beat.axes.length) return null
  return {
    id: beat.id,
    label: beat.title,
    templateId: beat.templateId ?? beat.id,
    axes: axesFromBeat(beat),
  }
}

export function radarFromMarkGroup(group: MarkGroup): ResultHomeRadar | null {
  const beat =
    group.beats.find((row) => row.axes.length >= 3) ??
    group.beats.find((row) => row.axes.length > 0)
  if (!beat) return null
  const radar = radarFromMarkBeat(beat)
  if (!radar) return null
  return { ...radar, id: `${group.id}:${radar.id}`, label: group.title }
}

function cardStub(partial: Partial<TalkVerifyMarkingCard> & Pick<TalkVerifyMarkingCard, 'id' | 'title'>): TalkVerifyMarkingCard {
  return {
    kind: 'general',
    anchorMessageId: '',
    messageIds: [],
    lane: 'general',
    emphasized: false,
    dimensions: [],
    evidence: [],
    scored: true,
    ...partial,
  }
}

/** Test helper — not used in product UI. */
export function markBeatCardFixture(
  partial: Partial<TalkVerifyMarkingCard> & Pick<TalkVerifyMarkingCard, 'id' | 'title'>,
): TalkVerifyMarkingCard {
  return cardStub(partial)
}
