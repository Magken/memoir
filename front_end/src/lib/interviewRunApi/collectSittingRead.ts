/**
 * Collector sitting-read for live Results. Edge rollup narrative is later;
 * this is the no-OpenAI fallback so Overview / Conversation / Work are not empty.
 */
import type { Creator2BriefDocument } from '../interviewBrief/creator2BriefTypes'
import { catalogTemplate } from '../interviewBrief/analysisTemplateCatalog'
import { resolveTemplateShape } from '../interviewBrief/analysisTemplateShape'
import {
  firstFolderRow,
  foldersForPhase,
  foldersForTemplate,
  rollupFolderLabel,
} from '../interviewBrief/rollupFolders'
import type { InterviewFlowStepKind } from '../interviewBrief/flowTimelineTypes'
import type { AttemptScorePackage, SoftGradeBucket } from './scoreAttempt'
import { scoreGrainUnit } from './scoreAttempt'
import type { SessionSeries } from './sessionSeries'
import {
  isSittingReadScoreLabel,
  type SittingReadBrief,
  type SittingReadSection,
  type SittingReadTag,
} from './sittingReadMarkup'
import { grainBoardSummary, type RecruiterSessionMix } from './recruiterProcess'
import { stripReportProse, toReviewerSentence } from './reportDialect'
import type { AnalysisGrainStub, InterviewResponse } from './talkTypes'

function rec(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function cleanMarkdown(text: string, fallback: string): string {
  const note = String(text ?? '')
    .split('\n')
    .map((line) => (line.trim() ? stripReportProse(line) : ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return note || fallback
}

function humanTemplateTitle(templateId: string): string {
  const label = catalogTemplate(templateId)?.label?.trim()
  if (label) return label.replace(/\s*\(.*\)$/, '').trim() || label
  if (templateId.startsWith('custom.')) {
    return templateId
      .replace(/^custom\./, '')
      .replace(/\.v\d+$/, '')
      .replace(/[_-]+/g, ' ')
  }
  if (templateId.startsWith('synth.')) return 'Stage summary'
  return templateId.replace(/^mark\./, '').replace(/\.v\d+$/, '').replace(/\./g, ' ')
}

function leftoverGrain(templateId: string): boolean {
  const kind = resolveTemplateShape(templateId).outputKind
  return kind === 'paragraph' || kind === 'passFail'
}

function grainMarkdownBlock(grain: AnalysisGrainStub): string {
  if (!leftoverGrain(grain.templateId)) return ''
  const { summary } = grainBoardSummary(grain.result)
  const glance = String(summary || grain.justification || '').trim()
  if (!glance) return ''
  /* Dimension notes, quotes, and boardSummaryDetail restatements live on radar Why. */
  return `### ${humanTemplateTitle(grain.templateId)}\n\n${glance}`
}

function leftoverMarkdown(response: InterviewResponse, topicId: string | null): {
  glance: string
  detail: string
  quotes: string[]
  confidence: string
} {
  if (!topicId) return { glance: '', detail: '', quotes: [], confidence: '' }
  const topic = response.analysis.topics?.[topicId]
  if (!topic) return { glance: '', detail: '', quotes: [], confidence: '' }
  const blocks: string[] = []
  const quotes: string[] = []
  let confidence = ''
  for (const grain of Object.values(topic.byTemplate ?? {})) {
    if (!grain?.templateId || grain.templateId.startsWith('sig.')) continue
    const block = grainMarkdownBlock(grain)
    if (!block) continue
    blocks.push(block)
    if (!confidence && grain.confidence) confidence = grain.confidence
    for (const ref of grain.evidenceRefs ?? []) {
      const q = String(ref.quote ?? '').trim()
      if (q) quotes.push(q)
    }
  }
  const synth = String(topic.synthesisText ?? '').trim()
  if (synth && !blocks.some((block) => block.includes(synth))) blocks.push(synth)
  return {
    glance: blocks.join('\n\n'),
    detail: '',
    quotes: quotes.slice(0, 2),
    confidence,
  }
}

function leftoverGlance(response: InterviewResponse, topicId: string | null): {
  glance: string
  detail: string
  quotes: string[]
  confidence: string
} {
  return leftoverMarkdown(response, topicId)
}

function pctSignal(unit: number): SittingReadTag['signal'] {
  if (unit >= 0.85) return 'good'
  if (unit >= 0.6) return 'watch'
  return 'bad'
}

function pctTag(unit: number, hint: string): SittingReadTag {
  return {
    signal: pctSignal(unit),
    label: `${Math.round(unit * 100)}%`,
    hint,
  }
}

function meanUnits(units: number[]): number | null {
  if (!units.length) return null
  return units.reduce((n, u) => n + u, 0) / units.length
}

function phaseKind(
  brief: Creator2BriefDocument,
  phase: Creator2BriefDocument['phases'][number],
): InterviewFlowStepKind {
  if (phase.kind === 'discussion' || 'topicId' in phase) return 'talk'
  const toolRef = 'toolRef' in phase ? String(phase.toolRef ?? '') : ''
  const t = String(brief.tools[toolRef]?.type ?? '')
  if (t === 'form' || t === 'form_quiz') return 'form'
  if (t === 'coding') return 'coding'
  if (t === 'doc' || t === 'writing' || t === 'essay') return 'doc'
  return 'unknown'
}

function uniqueKind(
  brief: Creator2BriefDocument,
  kind: InterviewFlowStepKind,
): boolean {
  return brief.phases.filter((p) => phaseKind(brief, p) === kind).length === 1
}

function bucketUnitForPhase(
  bucket: SoftGradeBucket | undefined,
  response: InterviewResponse,
  phaseId: string,
  topicId: string | null,
  onlyKind: boolean,
): number | null {
  if (!bucket) return null
  const ids = new Set<string>()
  if (topicId) ids.add(topicId)
  for (const message of response.messages ?? []) {
    if (message.phaseId === phaseId) ids.add(message.id)
  }
  const units = bucket.sources.filter((s) => ids.has(s.hostRef)).map((s) => s.unit)
  const local = meanUnits(units)
  if (local != null) return local
  return onlyKind && typeof bucket.unit === 'number' ? bucket.unit : null
}

function timeTag(
  series: SessionSeries | null | undefined,
  phaseId: string,
  work: boolean,
): SittingReadTag | null {
  const row = series?.byPhase?.find((p) => p.phaseId === phaseId)
  const ms = Math.max(row?.durationMs ?? 0, row?.dwell?.visibleMs ?? 0)
  if (ms < 30_000) return null
  const min = Math.max(1, Math.round(ms / 60_000))
  if (work && row?.cadence?.buckets?.length) {
    const idle = row.cadence.buckets.reduce((s, b) => s + (b.idleMs ?? 0), 0)
    const idleMin = Math.round(idle / 60_000)
    if (idleMin >= 1) {
      return {
        signal: 'good',
        label: `${min} min · ${idleMin} min idle`,
        hint: 'Time',
      }
    }
  }
  return { signal: 'good', label: `${min} min`, hint: 'Time' }
}

function workGlance(
  response: InterviewResponse,
  toolRef: string | null,
  _kind: 'coding' | 'doc' | 'form',
): { glance: string; detail: string; quotes: string[]; confidence: string; mix: RecruiterSessionMix | null } {
  if (!toolRef) return { glance: '', detail: '', quotes: [], confidence: '', mix: null }
  const row = response.analysis.tools?.[toolRef]
  if (!row) return { glance: '', detail: '', quotes: [], confidence: '', mix: null }
  const order = [
    'mark.form.key.v1',
    'mark.form.reasoning.v1',
    'mark.code.tests.v1',
    'mark.code.method.v1',
    'mark.code.structure.v1',
    'mark.code.approach.v1',
    'mark.code.authorship.v1',
    'mark.doc.essay.v1',
    'mark.doc.approach.v1',
    'mark.doc.authorship.v1',
    'mark.assist.use.v1',
    'synth.tool.v1',
  ]
  const seen = new Set<string>()
  const blocks: string[] = []
  const quotes: string[] = []
  let confidence = ''
  let mix: RecruiterSessionMix | null = null
  const grains = Object.entries(row)
  const ranked = [
    ...order.map((id) => grains.find(([k]) => k === id)).filter(Boolean),
    ...grains.filter(([k]) => !order.includes(k)),
  ] as Array<[string, AnalysisGrainStub]>
  for (const [id, grain] of ranked) {
    if (!grain || seen.has(id) || grain.templateId.startsWith('sig.')) continue
    seen.add(id)
    const block = grainMarkdownBlock(grain)
    if (!block) continue
    blocks.push(block)
    if (!confidence && grain.confidence) confidence = grain.confidence
    const m = rec(grain.result)?.sessionMix
    if (!mix && m && typeof m === 'object') mix = m as RecruiterSessionMix
    for (const ref of grain.evidenceRefs ?? []) {
      const q = String(ref.quote ?? '').trim()
      if (q) quotes.push(q)
    }
  }
  return { glance: blocks.join('\n\n'), detail: '', quotes: quotes.slice(0, 2), confidence, mix }
}

function missedFormItems(response: InterviewResponse, toolRef: string | null): string[] {
  if (!toolRef) return []
  const pkg = rec(response.analysis.toolPackages?.[toolRef])
  const items = Array.isArray(pkg?.items) ? pkg.items : []
  const labelById = new Map<string, string>()
  for (const item of items) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const id = String(row.id ?? row.questionId ?? '').trim()
    const label = String(row.label ?? '').trim()
    if (id && label) labelById.set(id, label)
  }
  const r = rec(response.analysis.tools?.[toolRef]?.['mark.form.key.v1']?.result)
  const byItem = Array.isArray(r?.byItem) ? r.byItem : []
  const missed: string[] = []
  for (const item of byItem) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const id = String(row.questionId ?? '').trim()
    if (!id) continue
    const status = String(row.status ?? '')
    const earned = typeof row.earned === 'number' ? row.earned : null
    const max = typeof row.max === 'number' ? row.max : null
    if (status === 'ungraded' || status === 'miss' || (earned != null && max != null && earned < max)) {
      missed.push(labelById.get(id) || String(row.label ?? '').trim() || 'a form question')
    }
  }
  return missed.slice(0, 6)
}

function failingTestIds(response: InterviewResponse, toolRef: string | null): string[] {
  if (!toolRef) return []
  const r = rec(response.analysis.tools?.[toolRef]?.['mark.code.tests.v1']?.result)
  const failing = Array.isArray(r?.failing) ? r.failing : []
  const names: string[] = []
  for (const [index, item] of failing.entries()) {
    if (typeof item === 'string' && item.trim()) {
      names.push(/^t\d+$/i.test(item.trim()) ? `hidden test ${index + 1}` : item.trim())
      continue
    }
    if (item && typeof item === 'object') {
      const row = item as Record<string, unknown>
      const name = String(row.name ?? row.label ?? '').trim()
      if (name) {
        names.push(name)
        continue
      }
      const hidden = Boolean(row.hidden)
      names.push(hidden ? `hidden test ${index + 1}` : `visible test ${index + 1}`)
    }
  }
  return names.slice(0, 8)
}

function toolUnit(
  response: InterviewResponse,
  brief: Creator2BriefDocument,
  scored: AttemptScorePackage,
  toolRef: string | null,
  templateId: string,
  fallbackBucket: string,
): number | null {
  if (!toolRef) return null
  const grain = response.analysis.tools?.[toolRef]?.[templateId]
  if (grain?.status === 'pending') return null
  const fromGrain = scoreGrainUnit(templateId, grain, brief)
  if (fromGrain != null) return fromGrain
  const folders = foldersForTemplate(templateId, brief.analysis?.rollup)
  const bucket =
    firstFolderRow(scored.softGrade.byWeight, folders, [fallbackBucket]) ??
    scored.softGrade.byWeight[fallbackBucket]
  const units = (bucket?.sources ?? []).filter((s) => s.hostRef === toolRef).map((s) => s.unit)
  return meanUnits(units)
}

function isPendingScoreGrain(grain: { status?: string; templateId?: string } | null | undefined): boolean {
  if (grain?.status !== 'pending') return false
  const id = String(grain.templateId ?? '')
  if (id.startsWith('sig.') || id.startsWith('synth.')) return false
  return true
}

function hostPending(
  response: InterviewResponse,
  toolRef: string,
  topicId: string,
): boolean {
  if (toolRef) {
    const grains = response.analysis.tools?.[toolRef]
    return grains ? Object.values(grains).some(isPendingScoreGrain) : false
  }
  if (topicId) {
    const grains = response.analysis.topics?.[topicId]?.byTemplate
    return grains ? Object.values(grains).some(isPendingScoreGrain) : false
  }
  return false
}

export function sittingDurationMinutes(series: SessionSeries | null | undefined): number {
  if (!series?.byPhase?.length) return 0
  const ms = series.byPhase.reduce(
    (n, p) => n + Math.max(p.durationMs ?? 0, p.dwell?.visibleMs ?? 0),
    0,
  )
  return Math.max(0, Math.round(ms / 60_000))
}

function fleshGlance(
  text: string,
  kind: InterviewFlowStepKind,
  good: boolean,
): string {
  let s = toReviewerSentence(text)
  if (!s) return ''
  if (/\b(so|because|while)\b/i.test(s)) return s
  if (kind === 'form') {
    return s.replace(
      /\.$/,
      good
        ? ', so later stages were allowed to run.'
        : ', so the eligibility screen is not a clean pass.',
    )
  }
  if (kind === 'coding') {
    return s.replace(
      /\.$/,
      good
        ? ', so the suite can be treated as evidence rather than a scramble.'
        : ', so the suite is not clean evidence yet.',
    )
  }
  if (kind === 'talk') {
    return s.replace(
      /\.$/,
      good
        ? ', so the marker can treat this as a usable account.'
        : ', so the notes still need a human read.',
    )
  }
  if (kind === 'doc') {
    return s.replace(
      /\.$/,
      good
        ? ', so the writing is usable product judgment.'
        : ', so writing is not the reason this interview holds.',
    )
  }
  return s
}

function pushClaim(list: string[], text: string, max = 3): void {
  const line = toReviewerSentence(text)
  if (!line || list.length >= max) return
  if (list.some((x) => x.toLowerCase() === line.toLowerCase())) return
  list.push(line)
}

function phaseGrains(
  response: InterviewResponse,
  toolRef: string,
  topicId: string,
): AnalysisGrainStub[] {
  const out: AnalysisGrainStub[] = []
  if (toolRef) {
    for (const grain of Object.values(response.analysis.tools?.[toolRef] ?? {})) {
      if (!grain || String(grain.templateId ?? '').startsWith('sig.')) continue
      out.push(grain)
    }
  }
  if (topicId) {
    for (const grain of Object.values(response.analysis.topics?.[topicId]?.byTemplate ?? {})) {
      if (!grain || String(grain.templateId ?? '').startsWith('sig.')) continue
      out.push(grain)
    }
  }
  return out
}

function claimsFromGrains(_grains: AnalysisGrainStub[]): {
  strengths: string[]
  weaknesses: string[]
} {
  /* Axis notes live on the radar Why table. Glance is intro + scoreWhy + missed/failing. */
  return { strengths: [], weaknesses: [] }
}

function sectionExpectation(kind: InterviewFlowStepKind, title: string): string {
  const name = title.trim() || 'This stage'
  if (kind === 'form') {
    return `${name} is a pass or fail screen that checks whether they may continue into the rest of the interview.`
  }
  if (kind === 'talk') {
    return `${name} is a conversation, and the marker expects a concrete, owned account of a real incident rather than a slogan.`
  }
  if (kind === 'coding') {
    return `${name} is a coding stage that expects working solutions against the hidden and visible suite.`
  }
  if (kind === 'doc') {
    return `${name} is a written note, and the marker expects usable product judgment rather than a blank outline.`
  }
  return `${name} is a stage in this interview, and the notes below are what the marker recorded.`
}

function describeScore(input: {
  kind: InterviewFlowStepKind
  tags: readonly SittingReadTag[]
  pending: boolean
  skipped: boolean
  formPassed?: boolean | null
}): string {
  if (input.pending) {
    return 'Marking is still in flight for this stage, so this chip is not a final share of the overall score yet.'
  }
  if (input.skipped) {
    return 'They did not sit this stage, so the chip reads as a fail rather than a scored attempt.'
  }
  if (input.kind === 'form') {
    if (input.formPassed === true) {
      return 'This chip is a pass on the eligibility screen, and it does not change the overall score.'
    }
    if (input.formPassed === false) {
      return 'This chip is a fail on the eligibility screen, even though later stages still ran.'
    }
    return 'This screen is recorded as a pass or fail gate, and it is not a share of the overall score.'
  }
  const scoreTags = input.tags.filter((tag) => isSittingReadScoreLabel(tag.label, tag.hint))
  if (input.kind === 'coding') {
    const tests = scoreTags.find((t) => t.hint === 'Tests')
    const method = scoreTags.find((t) => t.hint === 'Method')
    if (tests && method) {
      const t = Number.parseInt(tests.label, 10)
      const m = Number.parseInt(method.label, 10)
      if (Number.isFinite(t) && Number.isFinite(m) && t - m >= 10) {
        return `Tests sit at ${tests.label} on the mix, while method trails at ${method.label}, so the suite is stronger than the approach notes.`
      }
      if (Number.isFinite(t) && Number.isFinite(m) && m - t >= 10) {
        return `Method sits at ${method.label} on the overall score, while tests trail at ${tests.label}, so the approach notes are stronger than the suite.`
      }
      return `Tests sit at ${tests.label} on the overall score, and method sits at ${method.label}.`
    }
    if (tests) {
      return `Tests sit at ${tests.label} on the overall score, and that is the share this stage contributes.`
    }
    if (method) {
      return `Method sits at ${method.label} on the overall score, and that is the share this stage contributes.`
    }
  }
  if (input.kind === 'talk') {
    const delivery = scoreTags.find((t) => t.hint === 'Delivery')
    const content = scoreTags.find((t) => t.hint === 'Content')
    if (content && delivery) {
      return `Content sits at ${content.label} on the overall score, and delivery sits at ${delivery.label}.`
    }
    if (content) {
      return `Content sits at ${content.label} on the overall score, and that is the share this stage contributes.`
    }
    if (delivery) {
      return `Delivery sits at ${delivery.label} on the overall score, and that is the share this stage contributes.`
    }
  }
  if (input.kind === 'doc') {
    const essay = scoreTags.find((t) => t.hint === 'Essay')
    if (essay) {
      return `Writing sits at ${essay.label} on the overall score, and that is the share this stage contributes.`
    }
  }
  const first = scoreTags[0]
  return first
    ? `This stage reads ${first.label} on the overall score, and that chip is what the overall-score ring uses.`
    : 'This stage is recorded without a share of the overall score, so the ring does not take a number from it.'
}

function buildSectionBrief(input: {
  kind: InterviewFlowStepKind
  title: string
  tags: readonly SittingReadTag[]
  pending: boolean
  skipped: boolean
  glance: string
  grains: AnalysisGrainStub[]
  missed?: string[]
  failing?: string[]
  formPassed?: boolean | null
  lowConfidence?: boolean
}): SittingReadBrief {
  const intro = sectionExpectation(input.kind, input.title)
  const fromGrains = claimsFromGrains(input.grains)
  const strengths = [...fromGrains.strengths]
  const weaknesses = [...fromGrains.weaknesses]
  if (input.skipped) {
    pushClaim(
      weaknesses,
      'They did not sit this stage, so it reads as a forfeit rather than a scored attempt.',
    )
  }
  for (const label of input.missed ?? []) {
    pushClaim(weaknesses, `They missed ${label}, so this screen is not a clean pass.`)
  }
  for (const name of input.failing ?? []) {
    pushClaim(
      weaknesses,
      `They did not pass ${name}, so the suite is not clean evidence yet.`,
    )
  }
  if (input.lowConfidence) {
    pushClaim(
      weaknesses,
      'The mark is low confidence, so a human marker should still open the stage before trusting the glance.',
    )
  }
  const glanceLine = fleshGlance(input.glance, input.kind, input.formPassed !== false)
  if (glanceLine && strengths.length + weaknesses.length === 0) {
    const scoreTags = input.tags.filter((tag) => isSittingReadScoreLabel(tag.label, tag.hint))
    const pct = Number.parseInt(scoreTags[0]?.label ?? '', 10)
    if (Number.isFinite(pct) && pct <= 40) pushClaim(weaknesses, glanceLine)
    else pushClaim(strengths, glanceLine)
  }
  if (input.kind === 'form' && input.formPassed === true && !strengths.length) {
    pushClaim(
      strengths,
      glanceLine || 'They cleared this eligibility screen, so later stages were allowed to run.',
    )
  }
  if (input.kind === 'form' && input.formPassed === false && !weaknesses.length) {
    pushClaim(
      weaknesses,
      glanceLine ||
        'They did not clear this screen, so the eligibility gate failed even though later stages still ran.',
    )
  }
  return {
    intro,
    strengths: strengths.slice(0, 2),
    weaknesses: weaknesses.slice(0, 2),
    scoreWhy: describeScore({
      kind: input.kind,
      tags: input.tags,
      pending: input.pending,
      skipped: input.skipped,
      formPassed: input.formPassed,
    }),
  }
}

export function collectSittingRead(input: {
  brief: Creator2BriefDocument
  response: InterviewResponse
  scored: AttemptScorePackage
  sessionSeries?: SessionSeries | null
}): SittingReadSection[] {
  const { brief, response, scored } = input
  const skipped = new Set(response.skippedPhaseIds ?? [])
  const completed = new Set(response.completedPhaseIds ?? [])
  const out: SittingReadSection[] = []

  for (const phase of brief.phases) {
    const phaseId = String(phase.id ?? '').trim()
    if (!phaseId) continue
    const kind = phaseKind(brief, phase)
    if (kind === 'wrap' || kind === 'unknown') continue
    const topicId = 'topicId' in phase ? String(phase.topicId ?? '') : ''
    const toolRef = 'toolRef' in phase ? String(phase.toolRef ?? '') : ''
    const title = String(phase.title ?? '').trim()
    const tags: SittingReadTag[] = []
    const time = timeTag(input.sessionSeries, phaseId, kind === 'coding' || kind === 'doc')
    if (time) tags.push(time)

    if (skipped.has(phaseId)) {
      const skipTags: SittingReadTag[] = [
        ...tags,
        { signal: 'bad', label: 'Fail', hint: kind === 'form' ? 'Items' : 'Gate' },
      ]
      out.push({
        sectionId: phaseId,
        body: 'This stage was forfeited.',
        tags: skipTags,
        brief: buildSectionBrief({
          kind,
          title,
          tags: skipTags,
          pending: false,
          skipped: true,
          glance: '',
          grains: [],
        }),
      })
      continue
    }

    const pending = hostPending(response, toolRef, topicId)
    const grains = phaseGrains(response, toolRef, topicId)
    let body = ''
    let detail = ''
    let quotes: string[] = []
    let glance = ''
    let missed: string[] = []
    let failing: string[] = []
    let lowConfidence = false
    let formPassed: boolean | null | undefined
    if (kind === 'form') {
      const gate = scored.formGate
      formPassed = gate?.passed
      missed = missedFormItems(response, toolRef)
      if (gate) {
        const n = Math.max(0, Math.round(gate.gradedScore))
        const d = Math.max(0, Math.round(gate.gradedMax))
        tags.push({
          signal:
            d > 0 && n >= d
              ? 'good'
              : d > 0 && n <= 0
                ? 'bad'
                : gate.passed === true
                  ? 'good'
                  : gate.passed === false
                    ? 'bad'
                    : 'watch',
          label: d > 0 ? `${n} / ${d}` : gate.passed === true ? 'Pass' : 'Fail',
          hint: 'Form items',
        })
      }
      const work = workGlance(response, toolRef, 'form')
      quotes = work.quotes
      detail = work.detail
      glance = work.glance
      body = cleanMarkdown(
        glance,
        gate?.passed === true
          ? 'They cleared this eligibility screen.'
          : gate?.passed === false
            ? 'They did not clear this eligibility screen.'
            : 'This form stage was recorded.',
      )
    } else if (kind === 'talk') {
      const localOnly = uniqueKind(brief, 'talk') && !pending
      const rollup = brief.analysis?.rollup
      const folders = foldersForPhase(phaseId, rollup)
      const keys = folders.length ? folders : ['interviewDelivery', 'interviewContent']
      for (const key of keys) {
        const unit = bucketUnitForPhase(
          scored.softGrade.byWeight[key],
          response,
          phaseId,
          topicId || null,
          localOnly,
        )
        if (unit != null) tags.push(pctTag(unit, rollupFolderLabel(key, rollup?.weightLabels)))
      }
      const leftover = leftoverGlance(response, topicId || null)
      quotes = leftover.quotes
      detail = leftover.detail
      glance = leftover.glance
      body = cleanMarkdown(glance, 'This conversation was recorded.')
      if (leftover.confidence === 'low') {
        lowConfidence = true
        tags.push({ signal: 'watch', label: 'Low confidence', hint: 'Confidence' })
      }
    } else if (kind === 'coding') {
      const tests = toolUnit(response, brief, scored, toolRef, 'mark.code.tests.v1', 'codingTests')
      const method = toolUnit(response, brief, scored, toolRef, 'mark.code.method.v1', 'codingMethod')
      if (tests != null) tags.push(pctTag(tests, 'Tests'))
      if (method != null) tags.push(pctTag(method, 'Method'))
      const work = workGlance(response, toolRef, 'coding')
      quotes = work.quotes
      failing = failingTestIds(response, toolRef)
      detail = work.detail
      glance = work.glance
      if (work.confidence === 'low') {
        lowConfidence = true
        tags.push({ signal: 'watch', label: 'Low confidence', hint: 'Confidence' })
      }
      body = cleanMarkdown(glance, 'This coding stage was recorded.')
    } else if (kind === 'doc') {
      const essay = toolUnit(response, brief, scored, toolRef, 'mark.doc.essay.v1', 'essay')
      if (essay != null) tags.push(pctTag(essay, 'Essay'))
      const work = workGlance(response, toolRef, 'doc')
      quotes = work.quotes
      detail = work.detail
      glance = work.glance
      if (work.confidence === 'low') {
        lowConfidence = true
        tags.push({ signal: 'watch', label: 'Low confidence', hint: 'Confidence' })
      }
      body = cleanMarkdown(glance, 'This writing stage was recorded.')
    }

    if (!body && completed.has(phaseId)) body = 'This stage finished.'
    if (!body) continue
    if (pending) {
      tags.push({ signal: 'watch', label: 'Marking', hint: 'Marking' })
    }
    out.push({
      sectionId: phaseId,
      body,
      ...(detail && detail !== body ? { detail } : {}),
      ...(quotes.length ? { quotes } : {}),
      tags,
      brief: buildSectionBrief({
        kind,
        title,
        tags,
        pending,
        skipped: false,
        glance: '',
        grains,
        missed,
        failing,
        formPassed,
        lowConfidence,
      }),
    })
  }

  return out
}
