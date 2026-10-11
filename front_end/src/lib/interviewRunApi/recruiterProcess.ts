/**
 * Recruiter-facing process helpers — bucket notes, paste bursts, session mix,
 * sitting thesis, Talk-vs-work tensions. Deterministic. Not Soft Decision grades.
 */
import { formatTapeClock, type TimelineAtlasBucket, type TimelineIndex } from './editorCapture/timelineIndex'
import type { TapeDigest } from './editorCapture/tapeDigest'
import type { Creator2BriefDocument } from '../interviewBrief/creator2BriefTypes'
import { firstFolderRow, foldersForTemplate, type RollupMaps } from '../interviewBrief/rollupFolders'
import type { AttemptScorePackage } from './scoreAttempt'
import type { InterviewResponse } from './talkTypes'
import { humanFileRef, humanTapeAction } from './resultHomes'
import {
  classifyTapeInsert,
  insertSourceLabel,
  uniqueInsertActions,
  type InsertSource,
} from './insertSource'

export type RecruiterBucketNote = {
  id: string
  kind: 'active' | 'idle'
  start: string
  end: string
  startMs?: number
  endMs?: number
  summary: string
}

export type RecruiterPasteBurst = {
  t: number
  clock: string
  chars?: number
  file?: string
  route?: 'bot' | 'internal' | 'external' | 'unknown'
  fromSurface?: string
  excerpt?: string
  lineCount?: number
  coverage?: number
  wholeFile?: boolean
  before: { bucketId: string; lastActions: string[] }
  after: { nextActions: string[]; ranTests: boolean; edited: boolean; idleMs: number }
  summary: string
}

export type RecruiterSessionMix = {
  phaseId: string
  toolRef: string
  bucket: 'codingMethod' | 'essay'
  copilotApply: number
  /** Typed editor patches. Checkpoints, idle, and Copilot apply are not this. */
  humanTicks: number
  pasteEvents: number
  copilotApplyShare: number
  humanTickShare: number
  pasteShare: number
}

export type RecruiterSessionMixOverall = {
  copilotApplyShare: number
  humanTickShare: number
  pasteShare: number
  stages: RecruiterSessionMix[]
}

export type RecruiterTension = {
  talkPhaseId?: string
  toolRef?: string
  summary: string
}

export type RecruiterSittingThesis = {
  /**
   * Short introduction paragraph for Overview: what the sitting was, how it went, and what
   * stands out. Deliberately not a strengths/risks dump — those stay per section.
   */
  summary: string
  strengths: string[]
  risks: string[]
  followUps: string[]
}

function rec(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function humanActionCounts(counts: Record<string, number> | undefined): string {
  const parts = Object.entries(counts ?? {})
    .filter(([, n]) => n > 0)
    .slice(0, 3)
    .map(([key, n]) => {
      const verb = humanTapeAction(key)
      return n > 1 ? `${verb} ${n} times` : verb
    })
  return listJoin(parts)
}

function humanFilesTouched(files: readonly string[] | undefined): string {
  const labels = (files ?? []).slice(0, 2).map((path) => humanFileRef(path)).filter(Boolean)
  return listJoin(labels)
}

export function digestBucketNotes(
  atlas: TimelineIndex['atlas'] | null | undefined,
  digest?: TapeDigest | null,
): RecruiterBucketNote[] {
  const buckets = atlas?.buckets
  if (!Array.isArray(buckets) || !buckets.length) return []
  const bursts = digest ? digestPasteBursts(digest, atlas) : []
  return buckets.slice(0, 12).map((b: TimelineAtlasBucket) => {
    const hit = bursts.find((row) => row.t >= b.startMs && row.t <= b.endMs)
    const summary = hit?.summary?.trim() || bucketCaption(b)
    return {
      id: b.id,
      kind: b.kind === 'idle' ? 'idle' : 'active',
      start: b.start,
      end: b.end,
      startMs: b.startMs,
      endMs: b.endMs,
      summary,
    }
  })
}

function bucketAt(
  atlas: TimelineIndex['atlas'] | null | undefined,
  t: number,
): TimelineAtlasBucket | null {
  const buckets = atlas?.buckets
  if (!Array.isArray(buckets)) return null
  for (const b of buckets) {
    if (t >= b.startMs && t <= b.endMs) return b
  }
  return buckets[buckets.length - 1] ?? null
}

function actionNames(digest: TapeDigest, fromT: number, toT: number): string[] {
  return digest.actions
    .filter((a) => a.t >= fromT && a.t <= toT && a.action !== 'idle')
    .map((a) => String(a.action))
    .slice(0, 6)
}

function burstRoute(source: InsertSource | null): RecruiterPasteBurst['route'] {
  if (source === 'bot_edit') return 'bot'
  if (source === 'internal_paste') return 'internal'
  if (source === 'external_paste') return 'external'
  return 'unknown'
}

function burstSummary(input: {
  source: InsertSource | null
  chars?: number
  file?: string
  fromSurface?: string
  clock: string
  next: string
  excerpt?: string
  lineCount?: number
  wholeFile?: boolean
}): string {
  const tag = input.source ? `${insertSourceLabel(input.source)}. ` : ''
  const where = input.file ? ` into ${humanFileRef(input.file)}` : ''
  const origin =
    input.source === 'internal_paste' && input.fromSurface
      ? ` from ${input.fromSurface}`
      : input.source === 'internal_paste'
        ? ' from inside the interview'
        : input.source === 'external_paste'
          ? ' from outside'
          : ''
  const lines =
    input.lineCount && input.lineCount > 1 ? ` (${input.lineCount} lines)` : ''
  const landed = input.wholeFile
    ? 'the whole file'
    : input.chars != null
      ? `about ${input.chars} characters`
      : 'a paste'
  const quote = String(input.excerpt ?? '').trim()
  const quoteBit = quote ? `, starting with "${quote.slice(0, 80).replace(/\s+/g, ' ')}"` : ''
  if (input.source === 'bot_edit') {
    const size = input.chars != null ? ` about ${input.chars} characters` : ''
    return `${tag}They applied a bot edit${size}${where} at ${input.clock}, ${input.next}.`
  }
  return `${tag}They pasted ${landed}${lines}${origin}${where}${quoteBit} at ${input.clock}, ${input.next}.`
}

export function digestPasteBursts(
  digest: TapeDigest | null | undefined,
  atlas: TimelineIndex['atlas'] | null | undefined,
): RecruiterPasteBurst[] {
  if (!digest) return []
  const inserts = uniqueInsertActions(digest.actions)
  const out: RecruiterPasteBurst[] = []
  for (const paste of inserts.slice(0, 12)) {
    const t = paste.t
    const bucket = bucketAt(atlas, t)
    const detail = rec(paste.detail)
    const charsRaw = detail?.chars
    const chars = typeof charsRaw === 'number' && Number.isFinite(charsRaw) ? charsRaw : undefined
    const file = typeof detail?.path === 'string' ? detail.path : undefined
    const fromSurface = typeof detail?.srcSurface === 'string' ? detail.srcSurface : undefined
    const source = classifyTapeInsert(paste.action, detail)
    const route = burstRoute(source)
    const beforeActions = actionNames(digest, Math.max(0, t - 8_000), t - 1)
    const afterWindow = digest.actions.filter((a) => a.t > t && a.t <= t + 20_000)
    const nextActions = afterWindow.map((a) => String(a.action)).slice(0, 6)
    const ranTests = afterWindow.some((a) => a.action === 'run')
    const edited = afterWindow.some(
      (a) => a.action !== 'paste' && a.action !== 'paste_route' && a.action !== 'idle' && a.action !== 'run' && a.action !== 'copilot_apply',
    )
    let idleMs = 0
    for (let i = 0; i < afterWindow.length; i += 1) {
      const row = afterWindow[i]
      if (row.action !== 'idle') continue
      const end = afterWindow[i + 1]?.t ?? t + 20_000
      idleMs += Math.max(0, end - row.t)
    }
    const excerpt = typeof detail?.excerpt === 'string' ? detail.excerpt.trim().slice(0, 200) : ''
    const lineCount =
      typeof detail?.lineCount === 'number' && Number.isFinite(detail.lineCount)
        ? detail.lineCount
        : undefined
    const coverage =
      typeof detail?.coverage === 'number' && Number.isFinite(detail.coverage)
        ? detail.coverage
        : undefined
    const wholeFile = Boolean(detail?.wholeFile)
    const next = ranTests ? 'then ran tests' : edited ? 'then edited' : 'then idled'
    const clock = formatTapeClock(t)
    out.push({
      t,
      clock,
      ...(chars != null ? { chars } : {}),
      ...(file ? { file } : {}),
      route,
      ...(fromSurface ? { fromSurface } : {}),
      ...(excerpt ? { excerpt } : {}),
      ...(lineCount != null ? { lineCount } : {}),
      ...(coverage != null ? { coverage } : {}),
      ...(wholeFile ? { wholeFile: true } : {}),
      before: { bucketId: bucket?.id ?? '', lastActions: beforeActions },
      after: { nextActions, ranTests, edited, idleMs },
      summary: burstSummary({
        source,
        chars,
        file,
        fromSurface,
        clock,
        next,
        ...(excerpt ? { excerpt } : {}),
        ...(lineCount != null ? { lineCount } : {}),
        wholeFile,
      }),
    })
  }
  return out
}

export function parseBucketNotes(raw: unknown): RecruiterBucketNote[] {
  if (!Array.isArray(raw)) return []
  const out: RecruiterBucketNote[] = []
  for (const item of raw.slice(0, 12)) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const id = String(row.id ?? '').trim()
    const summary = String(row.summary ?? '').trim()
    if (!id || !summary) continue
    const kind = String(row.kind ?? '') === 'idle' ? 'idle' : 'active'
    out.push({
      id,
      kind,
      start: String(row.start ?? ''),
      end: String(row.end ?? ''),
      startMs: typeof row.startMs === 'number' ? row.startMs : undefined,
      endMs: typeof row.endMs === 'number' ? row.endMs : undefined,
      summary: summary.slice(0, 180),
    })
  }
  return out
}

export function parsePasteBursts(raw: unknown): RecruiterPasteBurst[] {
  if (!Array.isArray(raw)) return []
  const out: RecruiterPasteBurst[] = []
  for (const item of raw.slice(0, 12)) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const t = typeof row.t === 'number' && Number.isFinite(row.t) ? row.t : NaN
    const summary = String(row.summary ?? '').trim()
    if (!Number.isFinite(t) || !summary) continue
    const before = rec(row.before)
    const after = rec(row.after)
    out.push({
      t,
      clock: String(row.clock ?? formatTapeClock(t)),
      chars: typeof row.chars === 'number' ? row.chars : undefined,
      file: typeof row.file === 'string' ? row.file : undefined,
      route:
        row.route === 'bot' ||
        row.route === 'internal' ||
        row.route === 'external' ||
        row.route === 'unknown'
          ? row.route
          : 'unknown',
      before: {
        bucketId: String(before?.bucketId ?? ''),
        lastActions: Array.isArray(before?.lastActions)
          ? before.lastActions.map((a) => String(a)).slice(0, 6)
          : [],
      },
      after: {
        nextActions: Array.isArray(after?.nextActions)
          ? after.nextActions.map((a) => String(a)).slice(0, 6)
          : [],
        ranTests: Boolean(after?.ranTests),
        edited: Boolean(after?.edited),
        idleMs: typeof after?.idleMs === 'number' ? after.idleMs : 0,
      },
      summary: summary.slice(0, 400),
      ...(typeof row.excerpt === 'string' && row.excerpt.trim()
        ? { excerpt: String(row.excerpt).trim().slice(0, 200) }
        : {}),
      ...(typeof row.lineCount === 'number' ? { lineCount: row.lineCount } : {}),
      ...(typeof row.coverage === 'number' ? { coverage: row.coverage } : {}),
      ...(row.wholeFile ? { wholeFile: true } : {}),
    })
  }
  return out
}

function share(n: number, d: number): number {
  if (d <= 0) return 0
  return Math.min(1, Math.max(0, n / d))
}

export function stageSessionMix(input: {
  phaseId: string
  toolRef: string
  bucket: 'codingMethod' | 'essay'
  digest: TapeDigest | null | undefined
}): RecruiterSessionMix | null {
  const digest = input.digest
  if (!digest) return null
  const copilotApply = digest.actions.filter((a) => a.action === 'copilot_apply').length
  const pasteEvents = uniqueInsertActions(digest.actions).filter((a) => a.action !== 'copilot_apply').length
  const humanTicks = Math.max(0, digest.patchCount ?? 0)
  const denom = copilotApply + humanTicks + pasteEvents
  if (denom <= 0) return null
  return {
    phaseId: input.phaseId,
    toolRef: input.toolRef,
    bucket: input.bucket,
    copilotApply,
    humanTicks,
    pasteEvents,
    copilotApplyShare: share(copilotApply, denom),
    humanTickShare: share(humanTicks, denom),
    pasteShare: share(pasteEvents, denom),
  }
}

export function weightSessionMixOverall(
  stages: RecruiterSessionMix[],
  byWeight: AttemptScorePackage['softGrade']['byWeight'] | undefined,
): RecruiterSessionMixOverall | null {
  if (!stages.length) return null
  const countByBucket = new Map<string, number>()
  for (const s of stages) {
    countByBucket.set(s.bucket, (countByBucket.get(s.bucket) ?? 0) + 1)
  }
  let copilot = 0
  let human = 0
  let paste = 0
  let wSum = 0
  for (const s of stages) {
    const bucketW = byWeight?.[s.bucket]?.weight ?? 0
    const n = countByBucket.get(s.bucket) ?? 1
    const w = n > 0 ? bucketW / n : 0
    if (w <= 0) continue
    copilot += s.copilotApplyShare * w
    human += s.humanTickShare * w
    paste += s.pasteShare * w
    wSum += w
  }
  if (wSum <= 0) {
    const n = stages.length
    copilot = stages.reduce((s, r) => s + r.copilotApplyShare, 0) / n
    human = stages.reduce((s, r) => s + r.humanTickShare, 0) / n
    paste = stages.reduce((s, r) => s + r.pasteShare, 0) / n
  } else {
    copilot /= wSum
    human /= wSum
    paste /= wSum
  }
  return {
    copilotApplyShare: copilot,
    humanTickShare: human,
    pasteShare: paste,
    stages,
  }
}

export function collectStageSessionMixes(input: {
  brief: Creator2BriefDocument
  digestByPhase: Record<string, TapeDigest | null | undefined>
  copilotPhaseIds?: ReadonlySet<string>
}): RecruiterSessionMix[] {
  const out: RecruiterSessionMix[] = []
  for (const phase of input.brief.phases) {
    if (phase.kind === 'discussion' || !('toolRef' in phase)) continue
    if (input.copilotPhaseIds && !input.copilotPhaseIds.has(phase.id)) continue
    const toolRef = String(phase.toolRef ?? '')
    const type = String(input.brief.tools[toolRef]?.type ?? '')
    const bucket: 'codingMethod' | 'essay' | null =
      type === 'coding' ? 'codingMethod' : type === 'doc' || type === 'writing' || type === 'essay' ? 'essay' : null
    if (!bucket) continue
    const mix = stageSessionMix({
      phaseId: phase.id,
      toolRef,
      bucket,
      digest: input.digestByPhase[phase.id],
    })
    if (mix) out.push(mix)
  }
  return out
}

export function mixesFromToolGrains(response: InterviewResponse): RecruiterSessionMix[] {
  const seen = new Set<string>()
  const out: RecruiterSessionMix[] = []
  for (const row of Object.values(response.analysis.tools ?? {})) {
    for (const grain of Object.values(row ?? {})) {
      const mix = rec(grain.result)?.sessionMix
      if (!mix || typeof mix !== 'object') continue
      const parsed = mix as RecruiterSessionMix
      const phaseId = String(parsed.phaseId ?? '').trim()
      if (!phaseId || seen.has(phaseId)) continue
      if (typeof parsed.copilotApplyShare !== 'number') continue
      seen.add(phaseId)
      out.push(parsed)
    }
  }
  return out
}

export function pasteBurstsFromToolGrains(response: InterviewResponse): RecruiterPasteBurst[] {
  const out: RecruiterPasteBurst[] = []
  const seen = new Set<string>()
  for (const row of Object.values(response.analysis.tools ?? {})) {
    for (const grain of Object.values(row ?? {})) {
      for (const burst of parsePasteBursts(rec(grain.result)?.pasteBursts)) {
        const key = `${burst.t}:${burst.file ?? ''}`
        if (seen.has(key)) continue
        seen.add(key)
        out.push(burst)
      }
    }
  }
  return out.slice(0, 12)
}

type RecruiterBucketCaptionSource = {
  kind: 'active' | 'idle'
  start?: string
  end?: string
  startMs?: number
  endMs?: number
  actionCounts?: Record<string, number>
  filesTouched?: string[]
  messages?: Array<{ id?: string; quote?: string }>
}

export function bucketCaption(
  bucket: RecruiterBucketCaptionSource,
  note?: RecruiterBucketNote | null,
): string {
  const overlay = String(note?.summary ?? '').trim()
  if (overlay && !/[×x]\d/.test(overlay) && !/\bIdle\b|\bActive\b/.test(overlay) && !/[—–]/.test(overlay)) {
    return overlay
  }
  const start =
    bucket.start ?? (typeof bucket.startMs === 'number' ? formatTapeClock(bucket.startMs) : '')
  const end = bucket.end ?? (typeof bucket.endMs === 'number' ? formatTapeClock(bucket.endMs) : '')
  if (bucket.kind === 'idle') {
    return start && end
      ? `They were idle from ${start} to ${end}, so this stretch is not coded work.`
      : 'They were idle, so this stretch is not coded work.'
  }
  const actions = humanActionCounts(bucket.actionCounts)
  const files = humanFilesTouched(bucket.filesTouched)
  if (actions && files) return `They ${actions} in ${files}.`
  if (actions) return `They ${actions}.`
  if (files) {
    return start && end
      ? `They edited ${files} from ${start} to ${end}.`
      : `They edited ${files}.`
  }
  return start && end
    ? `They were working from ${start} to ${end}.`
    : 'They were working in this stretch.'
}

function firstSentence(text: string, max = 160): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (!t) return ''
  const m = t.match(/^(.+?[.!?])(?:\s|$)/)
  return (m?.[1] ?? t).slice(0, max)
}

function listJoin(names: string[]): string {
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}

function countWord(n: number): string {
  const words = [
    'zero',
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine',
    'ten',
  ]
  return n >= 0 && n <= 10 ? words[n] : String(n)
}

export function stitchSittingThesis(input: {
  scored: AttemptScorePackage
  skipped: number
  phases?: ReadonlyArray<{
    title?: string
    kind?: string
    toolRef?: string
  }>
  tools?: Record<string, { type?: string } | undefined>
}): RecruiterSittingThesis {
  const live = (input.phases ?? []).filter((p) => p.kind !== 'wrap')
  const n = live.length
  const formPhase = live.find((p) => {
    const ref = String(p.toolRef ?? '')
    const t = String(input.tools?.[ref]?.type ?? '')
    return t === 'form' || t === 'form_quiz'
  })
  const names = live
    .map((p) => String(p.title ?? '').trim())
    .filter(Boolean)
  const forfeit =
    input.skipped > 0
      ? input.skipped === 1
        ? 'and one stage was forfeited'
        : `and ${countWord(input.skipped)} stages were forfeited`
      : ''
  let summary = ''
  if (n <= 0) {
    summary = forfeit
      ? `This interview has a recorded attempt, ${forfeit.replace(/^and /, '')}.`
      : 'This interview has a recorded attempt that is ready to read.'
  } else if (formPhase || input.scored.formGate) {
    const gateName = String(formPhase?.title ?? '').trim() || 'Eligibility'
    const after = names.filter((name) => name !== gateName).slice(0, 2)
    const tail = after.length
      ? ` before ${listJoin(after)}`
      : ' before the conversation and work stages'
    summary = `This interview has ${countWord(n)} stages, with ${gateName} as a pass or fail screen${tail}.`
    if (forfeit) summary = summary.replace(/\.$/, `, ${forfeit}.`)
  } else if (names.length >= 2) {
    summary = `This interview has ${countWord(n)} stages, and it runs across ${listJoin(names.slice(0, 3))}.`
    if (forfeit) summary = summary.replace(/\.$/, `, ${forfeit}.`)
  } else {
    summary = forfeit
      ? `This interview has ${countWord(n)} stages, ${forfeit}.`
      : `This interview has ${countWord(n)} stages.`
  }
  return {
    summary: [summary, outcomeSentence(input.scored), standoutSentence(input.scored)]
      .filter(Boolean)
      .join(' '),
    strengths: [],
    risks: [],
    followUps: [],
  }
}

/** How the sitting went overall — or why there is no overall to give. */
function outcomeSentence(scored: AttemptScorePackage): string {
  if (scored.resultStatus === 'unmarked') {
    const n = scored.grainCounts?.skipped ?? 0
    return n > 0
      ? `Marking did not complete: ${countWord(n)} ${n === 1 ? 'stage' : 'stages'} failed to return, so there is no overall score to read here.`
      : 'Marking did not complete, so there is no overall score to read here.'
  }
  if (scored.resultStatus === 'pending' || scored.resultStatus === 'partial') {
    return 'Marking is still running, so the overall figure below can still move.'
  }
  const pct = Math.round((scored.softGrade?.overall ?? 0) * 100)
  const band =
    pct >= 75 ? 'a strong showing' : pct >= 50 ? 'a mixed showing' : 'a weak showing'
  const gate = scored.formGate
    ? scored.formGate.passed === false
      ? ' The eligibility screen was not passed.'
      : ' The eligibility screen was passed.'
    : ''
  return `Across the weighted stages it reads as ${band} at ${pct}%.${gate}`
}

/** The one contrast worth leading with — best against weakest scored bucket. */
function standoutSentence(scored: AttemptScorePackage): string {
  if (scored.resultStatus === 'unmarked') return ''
  const buckets = Object.values(scored.softGrade?.byWeight ?? {}).filter(
    (b) => b.included && typeof b.unit === 'number',
  )
  if (buckets.length < 2) return ''
  const sorted = [...buckets].sort((a, b) => (b.unit ?? 0) - (a.unit ?? 0))
  const best = sorted[0]
  const worst = sorted[sorted.length - 1]
  if (!best || !worst || best === worst) return ''
  if ((best.unit ?? 0) - (worst.unit ?? 0) < 0.15) {
    return 'The stages score close to one another, so no single area carries the result.'
  }
  return `${best.label} is the strongest area and ${worst.label} the weakest, which is the contrast worth reading the sections for.`
}

export function collectTensions(input: {
  brief: {
    phases?: Array<{ id?: string; kind?: string; topicId?: string; toolRef?: string }>
    tools?: Record<string, { type?: string } | undefined>
    analysis?: { rollup?: RollupMaps | null }
  }
  response: InterviewResponse
  scored: AttemptScorePackage
}): RecruiterTension[] {
  const out: RecruiterTension[] = []
  const phases = input.brief.phases ?? []
  const tools = input.brief.tools ?? {}
  const talkPhases = phases.filter((p) => p.kind === 'discussion' || Boolean(p.topicId))
  const toolPhases = phases.filter((p) => Boolean(p.toolRef))
  const byWeight = input.scored.softGrade.byWeight
  const rollup = input.brief.analysis?.rollup
  const content = firstFolderRow(
    byWeight,
    foldersForTemplate('iv.content.v1', rollup),
    ['interviewContent'],
  )?.unit
  const tests = firstFolderRow(
    byWeight,
    foldersForTemplate('mark.code.tests.v1', rollup),
    ['codingTests'],
  )?.unit
  const method = firstFolderRow(
    byWeight,
    foldersForTemplate('mark.code.method.v1', rollup),
    ['codingMethod'],
  )?.unit
  const essay = firstFolderRow(
    byWeight,
    foldersForTemplate('mark.doc.essay.v1', rollup),
    ['essay'],
  )?.unit

  const talkSynth = Object.values(input.scored.artifacts.topicSynths)[0] ?? ''
  const codeSynth = Object.entries(input.scored.artifacts.toolSynths).find(([ref]) => {
    const t = String(tools[ref]?.type ?? '')
    return t === 'coding'
  })?.[1] ?? ''

  if (
    typeof content === 'number' &&
    typeof tests === 'number' &&
    content >= 0.5 &&
    tests <= 0.2
  ) {
    const talk = talkPhases[0]
    const code = toolPhases.find((p) => {
      const ref = String(p.toolRef ?? '')
      return String(tools[ref]?.type ?? '') === 'coding'
    })
    out.push({
      talkPhaseId: talk && 'id' in talk ? String(talk.id) : undefined,
      toolRef: code && 'toolRef' in code ? String(code.toolRef) : undefined,
      summary:
        firstSentence(talkSynth) && firstSentence(codeSynth)
          ? `${firstSentence(talkSynth)} Coding leftover: ${firstSentence(codeSynth)}`
          : 'Talk leftover reads stronger than the coding suite.',
    })
  }
  if (
    typeof content === 'number' &&
    typeof essay === 'number' &&
    content >= 0.5 &&
    essay <= 0.2
  ) {
    out.push({
      summary: 'Talk leftover is usable; the written stage scored thin.',
    })
  }
  if (typeof method === 'number' && typeof tests === 'number' && method >= 0.6 && tests <= 0.2) {
    out.push({
      summary: 'Method notes read stronger than hidden tests.',
    })
  }
  return out.slice(0, 4)
}

export function grainBoardSummary(result: unknown): { summary: string; detail: string } {
  const r = rec(result)
  return {
    summary: String(r?.boardSummary ?? '').trim(),
    detail: String(r?.boardSummaryDetail ?? '').trim(),
  }
}
