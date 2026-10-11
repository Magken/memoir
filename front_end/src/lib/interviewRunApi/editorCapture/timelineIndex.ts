/**
 * Derived session history index — buckets + clickable tags.
 * Not stored on InterviewResponse. Assessor atlas has no file bodies / secrets.
 */
import type { InterviewResponseMessage } from '../talkTypes'
import { CAPTURE_IDLE_GAP_MS } from './recorder'
import { actionTicks, tapeDurationMs } from './replay'
import type { EditorTape } from './types'

export const TIMELINE_IDLE_GAP_MS = CAPTURE_IDLE_GAP_MS
export const TIMELINE_MAX_BUCKETS = 12

const SECRET_PATH_RE = /(^|\/)(reference|tests)(\/|$)|cases\.json$|answerKey/i

export type TimelineBucketKind = 'active' | 'idle'

export type TimelineBucket = {
  id: string
  startMs: number
  endMs: number
  kind: TimelineBucketKind
  actionCounts: Record<string, number>
  filesTouched: string[]
  messageIds: string[]
}

export type TimelineTagKind = 'action' | 'message' | 'applied' | 'llm'

export type TimelineTag = {
  t: number
  kind: TimelineTagKind
  label: string
  action?: string
  messageId?: string
}

export type TimelineAtlasBucket = {
  id: string
  start: string
  end: string
  startMs: number
  endMs: number
  kind: TimelineBucketKind
  actionCounts: Record<string, number>
  filesTouched: string[]
  messages: Array<{ id: string; quote: string }>
}

export type TimelineIndex = {
  durationMs: number
  truncated: boolean
  buckets: TimelineBucket[]
  tags: TimelineTag[]
  atlas: {
    duration: string
    durationMs: number
    truncated: boolean
    buckets: TimelineAtlasBucket[]
    tags: Array<{ t: number; clock: string; label: string; kind: string }>
  }
}

export type TimelineLlmTag = {
  t?: number
  label?: string
  kind?: string
}

function authorSafePath(path: string): boolean {
  return Boolean(path) && !SECRET_PATH_RE.test(path)
}

export function formatTapeClock(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

function uniqueSorted(nums: number[]): number[] {
  return [...new Set(nums.filter((n) => Number.isFinite(n) && n >= 0))].sort((a, b) => a - b)
}

type Span = { kind: TimelineBucketKind; start: number; end: number }

function clusterSpans(times: number[], duration: number, idleGap: number): Span[] {
  const end = Math.max(0, duration)
  if (end <= 0) return [{ kind: 'active', start: 0, end: 0 }]
  if (!times.length) {
    return [{ kind: end >= idleGap ? 'idle' : 'active', start: 0, end }]
  }
  const clusters: Array<{ start: number; end: number }> = []
  let cs = times[0]!
  let ce = times[0]!
  for (let i = 1; i < times.length; i += 1) {
    const t = times[i]!
    if (t - ce < idleGap) ce = Math.max(ce, t)
    else {
      clusters.push({ start: cs, end: ce })
      cs = t
      ce = t
    }
  }
  clusters.push({ start: cs, end: ce })

  const spans: Span[] = []
  const first = clusters[0]!
  if (first.start > 0) {
    spans.push({
      kind: first.start >= idleGap ? 'idle' : 'active',
      start: 0,
      end: first.start,
    })
  }
  for (let i = 0; i < clusters.length; i += 1) {
    const c = clusters[i]!
    const activeEnd = c.end <= c.start ? Math.min(c.start + 1, end) : c.end
    spans.push({ kind: 'active', start: c.start, end: Math.min(activeEnd, end) })
    const next = clusters[i + 1]
    if (next) {
      const gap = next.start - c.end
      if (gap >= idleGap) {
        spans.push({ kind: 'idle', start: c.end, end: next.start })
      } else if (next.start > spans[spans.length - 1]!.end) {
        spans[spans.length - 1]!.end = next.start
      }
    } else if (c.end < end) {
      const gap = end - c.end
      spans.push({
        kind: gap >= idleGap ? 'idle' : 'active',
        start: c.end,
        end,
      })
    }
  }
  if (!spans.length) return [{ kind: 'active', start: 0, end }]
  const last = spans[spans.length - 1]!
  if (last.end < end) last.end = end
  return spans.filter((s) => s.end >= s.start)
}

function mergeToCap(spans: Span[], cap: number): Span[] {
  if (spans.length <= cap) return spans
  const next = spans.map((s) => ({ ...s }))
  while (next.length > cap) {
    let minI = 0
    let minDur = Number.POSITIVE_INFINITY
    for (let i = 0; i < next.length; i += 1) {
      const dur = next[i]!.end - next[i]!.start
      if (dur < minDur) {
        minDur = dur
        minI = i
      }
    }
    const neighbor = minI === 0 ? 1 : minI - 1
    const a = next[Math.min(minI, neighbor)]!
    const b = next[Math.max(minI, neighbor)]!
    a.end = Math.max(a.end, b.end)
    a.start = Math.min(a.start, b.start)
    a.kind = a.kind === 'idle' && b.kind === 'idle' ? 'idle' : 'active'
    next.splice(Math.max(minI, neighbor), 1)
  }
  return next
}

function pathFromDetail(detail: Record<string, unknown> | undefined): string | null {
  const path = typeof detail?.path === 'string' ? detail.path : null
  if (path && authorSafePath(path)) return path
  const files = detail?.files
  if (Array.isArray(files)) {
    const first = files.find((f) => typeof f === 'string' && authorSafePath(f))
    if (typeof first === 'string') return first
  }
  return null
}

function messageT(startedAt: string, at: string, durationMs: number): number {
  const start = Date.parse(startedAt)
  const when = Date.parse(at)
  if (!Number.isFinite(start) || !Number.isFinite(when)) return 0
  return Math.max(0, Math.min(durationMs, when - start))
}

function quoteOf(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 80)
}

export function bucketAt(index: TimelineIndex, t: number): TimelineBucket | null {
  const ms = Math.max(0, t)
  for (const b of index.buckets) {
    if (ms >= b.startMs && ms <= b.endMs) return b
  }
  return index.buckets[index.buckets.length - 1] ?? null
}

/** Skip-idle history playhead steps (active bucket starts + tags that are not sitting in idle). */
export function historyPlaySteps(index: TimelineIndex): number[] {
  const times: number[] = []
  for (const b of index.buckets) {
    if (b.kind === 'active') times.push(b.startMs)
  }
  for (const tag of index.tags) {
    const b = bucketAt(index, tag.t)
    if (b?.kind === 'idle') continue
    times.push(tag.t)
  }
  return uniqueSorted(times)
}

/** Next skip-idle play step after t, or null at the end. Never lands on an idle bucket. */
export function nextHistoryPlayStep(index: TimelineIndex, t: number): number | null {
  const steps = historyPlaySteps(index)
  for (const s of steps) {
    if (s <= t + 0.5) continue
    const b = bucketAt(index, s)
    if (b?.kind === 'idle') continue
    return s
  }
  return null
}

export function mergeLlmTags(index: TimelineIndex, extra: TimelineLlmTag[] | undefined): TimelineIndex {
  if (!extra?.length) return index
  const tags = [...index.tags]
  const seen = new Set(tags.map((t) => `${t.t}|${t.label}`))
  for (const raw of extra.slice(0, 8)) {
    const t = typeof raw.t === 'number' && Number.isFinite(raw.t) ? Math.max(0, raw.t) : NaN
    const label = String(raw.label ?? '').trim().slice(0, 48)
    if (!Number.isFinite(t) || !label) continue
    const key = `${t}|${label}`
    if (seen.has(key)) continue
    seen.add(key)
    tags.push({ t, kind: 'llm', label })
  }
  tags.sort((a, b) => a.t - b.t || a.label.localeCompare(b.label))
  return { ...index, tags }
}

export function llmTagsFromMarkingCards(
  cards: ReadonlyArray<{ tapeTags?: TimelineLlmTag[] | null }>,
): TimelineLlmTag[] {
  const out: TimelineLlmTag[] = []
  for (const card of cards) {
    for (const tag of card.tapeTags ?? []) out.push(tag)
  }
  return out.slice(0, 8)
}

export function buildTimelineIndex(input: {
  tape: EditorTape
  messages?: readonly InterviewResponseMessage[]
  phaseId?: string
}): TimelineIndex {
  const tape = input.tape
  const durationMs = tapeDurationMs(tape)
  const ticks = actionTicks(tape)
  const workTimes = uniqueSorted(
    ticks.filter((row) => row.action !== 'idle').map((row) => row.t),
  )
  const spans = mergeToCap(
    clusterSpans(workTimes, durationMs, TIMELINE_IDLE_GAP_MS),
    TIMELINE_MAX_BUCKETS,
  )

  const buckets: TimelineBucket[] = spans.map((span, i) => ({
    id: `b${i + 1}`,
    startMs: span.start,
    endMs: span.end,
    kind: span.kind,
    actionCounts: {},
    filesTouched: [],
    messageIds: [],
  }))

  const filesByBucket = buckets.map(() => new Set<string>())
  const messagesByBucket = buckets.map(() => new Set<string>())

  const bucketIndexAt = (t: number): number => {
    for (let i = 0; i < buckets.length; i += 1) {
      const b = buckets[i]!
      if (t >= b.startMs && t <= b.endMs) return i
    }
    return buckets.length - 1
  }

  const assignToBucket = (t: number): TimelineBucket | null => {
    const i = bucketIndexAt(t)
    return i >= 0 ? buckets[i] ?? null : null
  }

  const ACTION_LABEL: Record<string, string> = {
    open_file: 'File',
    language: 'Language',
    run: 'Run',
    undo: 'Undo',
    redo: 'Redo',
    paste: 'Paste',
    copilot_apply: 'Applied',
    idle: 'Idle',
  }

  const tags: TimelineTag[] = []
  const applyMessageIds = new Set<string>()

  for (const tick of ticks) {
    const b = assignToBucket(tick.t)
    if (b) {
      b.actionCounts[tick.action] = (b.actionCounts[tick.action] ?? 0) + 1
      const path = pathFromDetail(tick.detail)
      const i = bucketIndexAt(tick.t)
      if (path && i >= 0) filesByBucket[i]?.add(path)
    }
    if (tick.action === 'idle') continue
    const messageId =
      typeof tick.detail?.messageId === 'string' ? tick.detail.messageId.trim() : ''
    if (tick.action === 'copilot_apply' && messageId) applyMessageIds.add(messageId)
    tags.push({
      t: tick.t,
      kind: tick.action === 'copilot_apply' ? 'applied' : 'action',
      label: ACTION_LABEL[tick.action] ?? tick.action,
      action: tick.action,
      ...(messageId ? { messageId } : {}),
    })
  }

  const phaseId = String(input.phaseId || tape.phaseId || '').trim()
  const quotes = new Map<string, string>()
  for (const m of input.messages ?? []) {
    if (phaseId && m.phaseId !== phaseId) continue
    if (m.kind !== 'assist' && m.kind !== 'answer' && m.role !== 'candidate') continue
    const t = messageT(tape.startedAt, m.at, durationMs)
    const b = assignToBucket(t)
    if (b) messagesByBucket[bucketIndexAt(t)]?.add(m.id)
    quotes.set(m.id, quoteOf(m.text))
    if (applyMessageIds.has(m.id)) continue
    const applied = m.compose?.situation === 'applied'
    tags.push({
      t,
      kind: applied ? 'applied' : 'message',
      label: applied ? 'Applied' : m.role === 'candidate' ? 'You' : 'Assist',
      messageId: m.id,
    })
  }

  buckets.forEach((b, i) => {
    b.filesTouched = [...(filesByBucket[i] ?? [])].slice(0, 8)
    b.messageIds = [...(messagesByBucket[i] ?? [])]
  })

  tags.sort((a, b) => a.t - b.t || a.label.localeCompare(b.label))

  const atlasBuckets: TimelineAtlasBucket[] = buckets.map((b) => ({
    id: b.id,
    start: formatTapeClock(b.startMs),
    end: formatTapeClock(b.endMs),
    startMs: b.startMs,
    endMs: b.endMs,
    kind: b.kind,
    actionCounts: b.actionCounts,
    filesTouched: b.filesTouched,
    messages: b.messageIds.map((id) => ({ id, quote: quotes.get(id) ?? '' })).filter((m) => m.quote),
  }))

  const index: TimelineIndex = {
    durationMs,
    truncated: Boolean(tape.truncated),
    buckets,
    tags,
    atlas: {
      duration: formatTapeClock(durationMs),
      durationMs,
      truncated: Boolean(tape.truncated),
      buckets: atlasBuckets,
      tags: tags.slice(0, 40).map((tag) => ({
        t: tag.t,
        clock: formatTapeClock(tag.t),
        label: tag.label,
        kind: tag.kind,
      })),
    },
  }

  return index
}
