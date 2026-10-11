/**
 * Shared session clocks for Clarity + Security. Action-tape JSON + telemetry + dictation
 * sessions + typed WPM + network digest. Leave = tab-hide only.
 */
import type { Creator2BriefDocument } from '../interviewBrief/creator2BriefTypes'
import type { EditorTape, EditorTapesPack } from './editorCapture/types'
import { digestEditorTape } from './editorCapture/tapeDigest'
import { loadEditorTape } from './editorCapture/store'
import { loadSessionTelemetry, sittingTypedWpm, type SessionTelemetry } from './sessionTelemetry'
import { gpsMismatchReason } from './sessionProbe/vpnHeuristic'
import type { InterviewResponse } from './talkTypes'
import {
  classifyTapeInsert,
  coveredByTimes,
  insertIncidentKind,
  uniqueInsertActions,
} from './insertSource'

export const SESSION_SERIES_SCHEMA = 'vurify/session-series.v1' as const
export const INCIDENT_WINDOW_MS = 30_000
const BUCKET_CAP = 24
const BUCKET_MS = 10_000

export type SessionSeriesEventKind =
  | 'paste'
  | 'paste_route'
  | 'run'
  | 'idle'
  | 'leave'
  | 'offline'
  | 'online'
  | 'apply'
  | 'dictation_start'
  | 'dictation_stop'
  | 'ip_change'
  | 'fullscreen_exit'
  | 'cover_closed'
  | 'devtools'
  | 'duplicate_tab'
  | 'copy_blocked'
  | 'copy_route'
  | 'shortcut'
  | 'policy_overlay_stripped'
  | 'framed'

export type SessionSeriesBucket = {
  t0: number
  t1: number
  tickCount: number
  medianGapMs: number
  idleMs: number
}

export type SessionWindowStats = {
  tickCount: number
  medianGapMs: number
  sendCount: number
  runCount: number
  pasteCount: number
  dictationMs: number
}

export type SessionDictationSession = {
  tStart: number
  tEnd: number
  durationMs: number
  charCount?: number
  surface?: string
}

export type SessionSeriesPhase = {
  phaseId: string
  title: string
  kind: string
  durationMs: number
  cadence: {
    tickCount: number
    medianGapMs: number
    p95GapMs: number
    buckets: SessionSeriesBucket[]
  }
  talk: { sendCount: number; gapsMs: number[]; medianGapMs: number; sendsAt: number[] }
  /** Per-section clocks from `sessionTelemetry.dwellByPhase[phaseId]`. Not sitting totals. */
  dwell: {
    inEditorMs: number
    inTalkMs: number
    visibleMs: number
    leaves: Array<{ t: number; kind: string }>
  }
  dictation: { sessions: SessionDictationSession[]; totalMs: number }
  events: Array<{ t: number; kind: SessionSeriesEventKind; quote?: string }>
}

export type SessionIncidentKind =
  | 'paste'
  | 'paste_internal'
  | 'apply'
  | 'leave'
  | 'reconnect'
  | 'dictation'
  | 'ip_change'
  | 'fullscreen_exit'
  | 'cover_window_closed'
  | 'devtools'
  | 'duplicate_tab'
  | 'copy_blocked'
  | 'copy_route'
  | 'shortcut'
  | 'policy_overlay_stripped'
  | 'framed'

export type SessionIncident = {
  id: string
  kind: SessionIncidentKind
  sectionId: string
  t: number
  preMs: number
  postMs: number
  slice: { pre: SessionWindowStats; post: SessionWindowStats }
  pre?: { body: string }
  post?: { body: string }
  tags?: Array<{ signal: 'good' | 'watch' | 'bad'; label: string; hint?: string }>
  evidenceRefs?: Array<{ kind: string; ref: string; t?: number; quote?: string }>
}

export type SessionNetworkPin = {
  t: number
  lat: number
  lon: number
  kind: 'ip' | 'gps'
  label: string
}

export type SessionNetworkDigest = {
  sampleCount: number
  reconnectCount: number
  medianRttMs: number | null
  vpnLikely: boolean
  reasons: string[]
  lastPlace: string | null
  pins: SessionNetworkPin[]
}

export type SessionTypingDigest = {
  committedWords: number
  activeMs: number
  wpm: number | null
}

export type SessionSeries = {
  schema: typeof SESSION_SERIES_SCHEMA
  byPhase: SessionSeriesPhase[]
  incidents: SessionIncident[]
  network?: SessionNetworkDigest
  typing?: SessionTypingDigest
  pointerTrail?: Array<{ t: number; x: number; y: number }>
}

function median(nums: number[]): number {
  if (!nums.length) return 0
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2
}

function percentile(nums: number[], p: number): number {
  if (!nums.length) return 0
  const s = [...nums].sort((a, b) => a - b)
  const i = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1))
  return s[i]!
}

function phaseTitle(brief: Creator2BriefDocument, phaseId: string): string {
  const p = brief.phases.find((row) => row.id === phaseId)
  return String(p?.title ?? phaseId)
}

function phaseKind(brief: Creator2BriefDocument, phaseId: string): string {
  const p = brief.phases.find((row) => row.id === phaseId)
  if (!p) return 'other'
  if (p.kind === 'discussion' || 'topicId' in p) return 'talk'
  const toolRef = 'toolRef' in p ? String(p.toolRef ?? '') : ''
  const t = String(brief.tools[toolRef]?.type ?? '')
  if (t === 'form' || t === 'form_quiz') return 'form'
  if (t === 'coding') return 'coding'
  if (t === 'doc') return 'doc'
  return 'other'
}

function bucketsFromGaps(
  durationMs: number,
  ticksAt: number[],
  dictation: SessionDictationSession[] = [],
): SessionSeriesBucket[] {
  const span = Math.max(durationMs, ticksAt[ticksAt.length - 1] ?? 0, BUCKET_MS)
  const size = Math.max(BUCKET_MS, Math.ceil(span / BUCKET_CAP))
  const out: SessionSeriesBucket[] = []
  for (let t0 = 0; t0 < span && out.length < BUCKET_CAP; t0 += size) {
    const t1 = t0 + size
    const hits = ticksAt.filter((t) => t >= t0 && t < t1)
    const hitGaps: number[] = []
    for (let i = 1; i < hits.length; i += 1) {
      const a = hits[i - 1]!
      const b = hits[i]!
      const gap = Math.max(0, b - a - overlapMs(a, b, dictation))
      if (gap > 0) hitGaps.push(gap)
    }
    const idleMs = hits.length ? Math.max(0, size - hits.length * 80 - overlapMs(t0, t1, dictation)) : size
    out.push({
      t0,
      t1,
      tickCount: hits.length,
      medianGapMs: hitGaps.length ? Math.round(median(hitGaps)) : 0,
      idleMs: Math.min(size, idleMs),
    })
  }
  return out
}

function overlapMs(from: number, to: number, sessions: SessionDictationSession[]): number {
  let sum = 0
  for (const s of sessions) {
    const a = Math.max(from, s.tStart)
    const b = Math.min(to, s.tEnd)
    if (b > a) sum += b - a
  }
  return sum
}

function gapsExcludingDictation(ticksAt: number[], sessions: SessionDictationSession[]): number[] {
  const gaps: number[] = []
  for (let i = 1; i < ticksAt.length; i += 1) {
    const a = ticksAt[i - 1]!
    const b = ticksAt[i]!
    const gap = Math.max(0, b - a - overlapMs(a, b, sessions))
    if (gap > 0) gaps.push(gap)
  }
  return gaps
}

function pairDictation(
  events: Array<{ t: number; kind: string; surface?: string; charCount?: number }>,
): SessionDictationSession[] {
  const out: SessionDictationSession[] = []
  let open: { t: number; surface?: string } | null = null
  for (const ev of events) {
    if (ev.kind === 'dictation_start') {
      open = { t: ev.t, surface: ev.surface }
    } else if (ev.kind === 'dictation_stop' && open) {
      const durationMs = Math.max(0, ev.t - open.t)
      out.push({
        tStart: open.t,
        tEnd: ev.t,
        durationMs,
        ...(typeof ev.charCount === 'number' ? { charCount: ev.charCount } : {}),
        ...(open.surface ? { surface: open.surface } : {}),
      })
      open = null
    }
  }
  return out
}

export function emptyWindowStats(): SessionWindowStats {
  return { tickCount: 0, medianGapMs: 0, sendCount: 0, runCount: 0, pasteCount: 0, dictationMs: 0 }
}

export function sliceSeries(
  phase: SessionSeriesPhase | null | undefined,
  t: number,
  preMs = INCIDENT_WINDOW_MS,
  postMs = INCIDENT_WINDOW_MS,
): { pre: SessionWindowStats; post: SessionWindowStats } {
  if (!phase) return { pre: emptyWindowStats(), post: emptyWindowStats() }
  const windowOf = (from: number, to: number): SessionWindowStats => {
    const events = phase.events.filter((e) => e.t >= from && e.t < to)
    const buckets = phase.cadence.buckets.filter((b) => b.t1 > from && b.t0 < to)
    const dictationMs = phase.dictation.sessions
      .filter((s) => s.tEnd > from && s.tStart < to)
      .reduce((sum, s) => sum + Math.min(s.tEnd, to) - Math.max(s.tStart, from), 0)
    return {
      tickCount: buckets.reduce((s, b) => s + b.tickCount, 0),
      medianGapMs: Math.round(median(buckets.map((b) => b.medianGapMs).filter(Boolean))),
      sendCount: (phase.talk.sendsAt ?? []).filter((at) => at >= from && at < to).length,
      runCount: events.filter((e) => e.kind === 'run').length,
      pasteCount: events.filter((e) => e.kind === 'paste' || e.kind === 'paste_route').length,
      dictationMs: Math.max(0, Math.round(dictationMs)),
    }
  }
  return {
    pre: windowOf(Math.max(0, t - preMs), t),
    post: windowOf(t, t + postMs),
  }
}

function joinClauses(parts: string[]): string {
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]!
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`
}

function typingClause(medianGapMs: number): string {
  if (!medianGapMs) return 'they were not typing'
  const seconds = Math.round(medianGapMs / 100) / 10
  if (seconds <= 1) return 'they were typing steadily'
  if (seconds <= 4) return `they were typing in short bursts, about ${seconds} seconds apart`
  return `they were typing slowly, leaving about ${seconds} seconds between keystrokes`
}

/**
 * Fallback narrative when the assessor's own account is unavailable.
 *
 * This used to emit "Before: 1.4s median gap, no paste, 2 run, no dictation." — a reviewer
 * reading the security section got stat soup rather than an account of what happened.
 * The fallback is still a fallback, but it has to be a sentence.
 */
function cannedWindow(when: 'before' | 'after', stats: SessionWindowStats): string {
  const clauses = [typingClause(stats.medianGapMs)]
  if (stats.pasteCount > 0) {
    clauses.push(
      stats.pasteCount === 1 ? 'they pasted once' : `they pasted ${stats.pasteCount} times`,
    )
  }
  if (stats.runCount > 0) {
    clauses.push(stats.runCount === 1 ? 'they ran the code once' : `they ran the code ${stats.runCount} times`)
  }
  if (stats.sendCount > 0) {
    clauses.push(
      stats.sendCount === 1 ? 'they sent one message' : `they sent ${stats.sendCount} messages`,
    )
  }
  if (stats.dictationMs > 0) {
    clauses.push(`they dictated for about ${Math.max(1, Math.round(stats.dictationMs / 1000))} seconds`)
  }
  const lead =
    when === 'before'
      ? 'In the 30 seconds leading up to this'
      : 'In the 30 seconds that followed'
  if (clauses.length === 1 && !stats.medianGapMs) {
    return when === 'before'
      ? 'Nothing was recorded in the 30 seconds leading up to this.'
      : 'Nothing was recorded in the 30 seconds that followed.'
  }
  return `${lead}, ${joinClauses(clauses)}.`
}

function incidentBodies(
  phase: SessionSeriesPhase,
  kind: SessionIncidentKind,
  _t: number,
  quote: string | undefined,
  slice: { pre: SessionWindowStats; post: SessionWindowStats },
): { pre: string; post: string } {
  const fallback = {
    pre: cannedWindow('before', slice.pre),
    post: cannedWindow('after', slice.post),
  }
  const pasteLike = kind === 'paste' || kind === 'paste_internal'
  if (!pasteLike) return fallback
  const title = String(phase.title ?? '').trim() || 'this section'
  const raw = String(quote ?? '').trim()
  const parts = raw.split(' | ').map((p) => p.trim()).filter(Boolean)
  const whole = parts.includes('whole-file')
  const excerpt = parts.filter((p) => p !== 'whole-file' && p !== 'paste' && p !== 'paste_route' && p !== 'internal' && p !== 'external' && !p.includes('->')).pop() ?? ''
  const path = parts.find((p) => p.includes('/') || p.endsWith('.ts') || p.endsWith('.js')) ?? ''
  if (!excerpt && !whole && !path) return fallback
  const landed = whole ? 'the whole file' : 'a large insert'
  const where = path ? ` into ${path}` : ''
  const quoteBit = excerpt ? `, starting with "${excerpt.slice(0, 80).replace(/\s+/g, ' ')}"` : ''
  const nextRun = slice.post.runCount > 0
  return {
    pre: `On ${title} they pasted ${landed}${where}${quoteBit}.`,
    post: nextRun
      ? `On ${title} they ran tests after that paste.`
      : cannedWindow('after', slice.post),
  }
}

export function detectIncidents(byPhase: SessionSeriesPhase[]): SessionIncident[] {
  const out: SessionIncident[] = []
  for (const phase of byPhase) {
    const push = (kind: SessionIncidentKind, t: number, quote?: string) => {
      const slice = sliceSeries(phase, t)
      const id = `${kind}:${phase.phaseId}:${t}`
      if (out.some((row) => row.id === id)) return
      const bodies = incidentBodies(phase, kind, t, quote, slice)
      out.push({
        id,
        kind,
        sectionId: phase.phaseId,
        t,
        preMs: INCIDENT_WINDOW_MS,
        postMs: INCIDENT_WINDOW_MS,
        slice,
        pre: { body: bodies.pre },
        post: { body: bodies.post },
        evidenceRefs: [
          {
            kind: kind === 'dictation' ? 'case' : 'tape_action',
            ref: kind === 'dictation' ? phase.phaseId : kind,
            t,
            quote: quote ?? kind,
          },
        ],
      })
    }
    for (const ev of phase.events) {
      if (ev.kind === 'apply') push('apply', ev.t, ev.quote)
      if (ev.kind === 'paste') push('paste', ev.t, ev.quote)
      if (ev.kind === 'paste_route') {
        const source = ev.quote?.startsWith('internal') ? 'internal_paste' : 'external_paste'
        push(insertIncidentKind(source), ev.t, ev.quote)
      }
      if (ev.kind === 'leave') push('leave', ev.t, ev.quote)
      if (ev.kind === 'fullscreen_exit') push('fullscreen_exit', ev.t, ev.quote)
      if (ev.kind === 'cover_closed') push('cover_window_closed', ev.t, ev.quote)
      if (ev.kind === 'devtools') push('devtools', ev.t, ev.quote)
      if (ev.kind === 'duplicate_tab') push('duplicate_tab', ev.t, ev.quote)
      if (ev.kind === 'copy_blocked') push('copy_blocked', ev.t, ev.quote)
      if (ev.kind === 'copy_route') push('copy_route', ev.t, ev.quote)
      if (ev.kind === 'shortcut') push('shortcut', ev.t, ev.quote)
      if (ev.kind === 'policy_overlay_stripped') push('policy_overlay_stripped', ev.t, ev.quote)
      if (ev.kind === 'framed') push('framed', ev.t, ev.quote)
      if (ev.kind === 'ip_change') push('ip_change', ev.t, ev.quote)
      if (ev.kind === 'dictation_start') {
        const afterTrigger = phase.events.some(
          (row) =>
            (row.kind === 'paste' || row.kind === 'leave') &&
            ev.t >= row.t &&
            ev.t - row.t <= INCIDENT_WINDOW_MS,
        )
        if (afterTrigger) push('dictation', ev.t, ev.quote)
      }
    }
    const offs = phase.events.filter((e) => e.kind === 'offline')
    const ons = phase.events.filter((e) => e.kind === 'online')
    for (const off of offs) {
      const on = ons.find((row) => row.t >= off.t)
      if (on) push('reconnect', on.t, 'online')
    }
  }
  return out.slice(0, 48)
}

/** When set (including `null`), skip the live localStorage sidecar. */
export type SessionClockSidecars = {
  telemetry?: SessionTelemetry | null
  tapes?: EditorTapesPack | null
}

export function pickTapeForSeries(
  briefId: string,
  phaseId: string,
  tapes?: EditorTapesPack | null,
): EditorTape | null {
  if (tapes !== undefined) return tapes?.byPhaseId?.[phaseId] ?? null
  return loadEditorTape(briefId, phaseId)
}

export function pickTelemetryForSeries(
  briefId: string,
  telemetry?: SessionTelemetry | null,
): SessionTelemetry | null {
  if (telemetry !== undefined) return telemetry
  return loadSessionTelemetry(briefId)
}

export function compileSessionSeries(input: {
  brief: Creator2BriefDocument
  response: InterviewResponse
  telemetry?: SessionTelemetry | null
  tapes?: EditorTapesPack | null
}): SessionSeries {
  const brief = input.brief
  const response = input.response
  const tel = pickTelemetryForSeries(response.briefId, input.telemetry)
  const sittingOrigin = Number.isFinite(Date.parse(tel?.startedAt ?? ''))
    ? Date.parse(tel!.startedAt)
    : Date.parse(response.startedAt)
  const byPhase: SessionSeriesPhase[] = brief.phases.map((p) => {
    const tape = pickTapeForSeries(response.briefId, p.id, input.tapes)
    const digest = digestEditorTape(tape)
    const tapeOrigin = tape && Number.isFinite(Date.parse(tape.startedAt)) ? Date.parse(tape.startedAt) : NaN
    const tapeShift =
      Number.isFinite(sittingOrigin) && Number.isFinite(tapeOrigin) ? Math.max(0, tapeOrigin - sittingOrigin) : 0
    const durationMs = digest?.durationMs ?? 0
    const ticksAt: number[] = []
    for (const a of digest?.actions ?? []) ticksAt.push(a.t + tapeShift)
    const events: SessionSeriesPhase['events'] = []
    const inserts = uniqueInsertActions(digest?.actions ?? [])
    const tapePasteTs = inserts
      .filter((a) => a.action !== 'copilot_apply')
      .map((a) => a.t + tapeShift)
    for (const a of inserts) {
      const source = classifyTapeInsert(a.action, a.detail)
      if (source === 'bot_edit') {
        events.push({ t: a.t + tapeShift, kind: 'apply', quote: 'bot_edit' })
        continue
      }
      if (a.action === 'paste_route') {
        const from = typeof a.detail?.from === 'string' ? a.detail.from : ''
        const excerpt = typeof a.detail?.excerpt === 'string' ? a.detail.excerpt.trim() : ''
        const path = typeof a.detail?.path === 'string' ? a.detail.path : ''
        const whole = Boolean(a.detail?.wholeFile)
        const quote = [from || 'external', whole ? 'whole-file' : '', path, excerpt]
          .filter(Boolean)
          .join(' | ')
        events.push({
          t: a.t + tapeShift,
          kind: 'paste_route',
          quote,
        })
        continue
      }
      if (a.action === 'paste') {
        const excerpt = typeof a.detail?.excerpt === 'string' ? a.detail.excerpt.trim() : ''
        const path = typeof a.detail?.path === 'string' ? a.detail.path : ''
        const whole = Boolean(a.detail?.wholeFile)
        events.push({
          t: a.t + tapeShift,
          kind: 'paste',
          quote: [whole ? 'whole-file' : '', path, excerpt || a.action].filter(Boolean).join(' | '),
        })
      }
    }
    for (const a of digest?.actions ?? []) {
      if (a.action === 'run' || a.action === 'idle') {
        events.push({
          t: a.t + tapeShift,
          kind: a.action,
          quote: a.action,
        })
      }
    }
    const telEvents = (tel?.events ?? []).filter((e) => e.phaseId === p.id)
    for (const ev of telEvents) {
      // Tab hide is a leave. Pointer/focus leaving the editor is normal
      // (brief, Run, Assist, referenced-section view modal).
      if (ev.kind === 'hidden') {
        events.push({ t: ev.t, kind: 'leave', quote: ev.kind })
      }
      if (ev.kind === 'offline' || ev.kind === 'online') {
        events.push({ t: ev.t, kind: ev.kind })
      }
      if (ev.kind === 'dictation_start' || ev.kind === 'dictation_stop') {
        events.push({ t: ev.t, kind: ev.kind, quote: ev.surface })
      }
      if (ev.kind === 'fullscreen_exit') {
        events.push({ t: ev.t, kind: 'fullscreen_exit', quote: ev.note })
      }
      if (ev.kind === 'cover_closed' || ev.kind === 'cover_minimized') {
        events.push({ t: ev.t, kind: 'cover_closed', quote: ev.note })
      }
      if (ev.kind === 'devtools_open' || ev.kind === 'devtools_console_trap' || ev.kind === 'devtools_shortcut') {
        events.push({ t: ev.t, kind: 'devtools', quote: ev.note || ev.kind })
      }
      if (ev.kind === 'duplicate_tab') {
        events.push({ t: ev.t, kind: 'duplicate_tab', quote: ev.note })
      }
      if (ev.kind === 'copy_blocked' || ev.kind === 'cut_blocked') {
        events.push({ t: ev.t, kind: 'copy_blocked', quote: ev.note })
      }
      if (ev.kind === 'copy_route') {
        events.push({ t: ev.t, kind: 'copy_route', quote: ev.note })
      }
      if (
        ev.kind === 'print_blocked' ||
        ev.kind === 'save_blocked' ||
        ev.kind === 'view_source' ||
        ev.kind === 'new_surface'
      ) {
        events.push({ t: ev.t, kind: 'shortcut', quote: ev.note || ev.kind })
      }
      if (ev.kind === 'paste_route') {
        if (coveredByTimes(ev.t, tapePasteTs)) continue
        events.push({ t: ev.t, kind: 'paste_route', quote: ev.note })
      }
      if (ev.kind === 'policy_overlay_stripped') {
        events.push({ t: ev.t, kind: 'policy_overlay_stripped' })
      }
      if (ev.kind === 'framed') {
        events.push({ t: ev.t, kind: 'framed' })
      }
    }
    const samples = tel?.networkSamples ?? []
    for (let i = 1; i < samples.length; i += 1) {
      const prev = samples[i - 1]
      const cur = samples[i]
      if (!prev?.ip || !cur?.ip || prev.ip === cur.ip) continue
      const onThisPhase =
        cur.phaseId === p.id ||
        (cur.phaseId === 'preflight' && brief.phases[0]?.id === p.id)
      if (onThisPhase) events.push({ t: cur.t, kind: 'ip_change', quote: 'ip changed' })
    }
    events.sort((a, b) => a.t - b.t)
    const dictation = pairDictation(
      telEvents.map((e) => ({
        t: e.t,
        kind: e.kind,
        surface: e.surface,
        charCount: e.charCount,
      })),
    )
    const sends = (response.messages ?? []).filter(
      (m) => m.phaseId === p.id && m.role === 'candidate',
    )
    const sendTs = sends
      .map((m) => Date.parse(m.at))
      .filter((n) => Number.isFinite(n))
      .map((n) => (Number.isFinite(sittingOrigin) ? Math.max(0, n - sittingOrigin) : n))
    const sendGaps: number[] = []
    for (let i = 1; i < sendTs.length; i += 1) {
      sendGaps.push(Math.max(0, sendTs[i]! - sendTs[i - 1]!))
    }
    const leaves = telEvents
      .filter((e) => e.kind === 'hidden')
      .map((e) => ({ t: e.t, kind: e.kind }))
    let cadenceDuration = durationMs
    let cadenceTicks = ticksAt
    if (!ticksAt.length && sendTs.length) {
      cadenceTicks = sendTs
      cadenceDuration = sendTs[sendTs.length - 1] ?? 0
    }
    const keyboardGaps = gapsExcludingDictation(cadenceTicks, dictation)
    return {
      phaseId: p.id,
      title: phaseTitle(brief, p.id),
      kind: phaseKind(brief, p.id),
      durationMs: cadenceDuration,
      cadence: {
        tickCount: digest?.cadence.tickCount ?? cadenceTicks.length,
        medianGapMs: keyboardGaps.length
          ? Math.round(median(keyboardGaps))
          : (digest?.cadence.medianGapMs ?? 0),
        p95GapMs: keyboardGaps.length
          ? Math.round(percentile(keyboardGaps, 95))
          : (digest?.cadence.p95GapMs ?? 0),
        buckets: bucketsFromGaps(cadenceDuration, cadenceTicks, dictation),
      },
      talk: {
        sendCount: sends.length,
        gapsMs: sendGaps.slice(0, 32),
        medianGapMs: Math.round(median(sendGaps)),
        sendsAt: sendTs.slice(0, 48),
      },
      dwell: {
        inEditorMs: tel?.dwellByPhase?.[p.id]?.inEditorMs ?? 0,
        inTalkMs: tel?.dwellByPhase?.[p.id]?.inTalkMs ?? 0,
        visibleMs: tel?.dwellByPhase?.[p.id]?.visibleMs ?? 0,
        leaves: leaves.slice(0, 24),
      },
      dictation: {
        sessions: dictation,
        totalMs: dictation.reduce((s, row) => s + row.durationMs, 0),
      },
      events: events.slice(0, 80),
    }
  })
  const typed = sittingTypedWpm(tel?.typing)
  const network = compileNetworkDigest(tel)
  const pointerTrail = (tel?.pointerTrail ?? []).slice(-800).map((p) => ({
    t: p.t,
    x: p.x,
    y: p.y,
  }))
  return {
    schema: SESSION_SERIES_SCHEMA,
    byPhase,
    incidents: detectIncidents(byPhase),
    ...(network ? { network } : {}),
    typing: typed,
    ...(pointerTrail.length ? { pointerTrail } : {}),
  }
}

function compileNetworkDigest(tel: SessionTelemetry | null): SessionNetworkDigest | undefined {
  if (!tel) return undefined
  const samples = tel.networkSamples ?? []
  if (!samples.length && !tel.gps) return undefined
  const rtts = samples
    .map((s) => s.rttMs)
    .filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
  const reasons = new Set<string>()
  for (const s of samples) {
    for (const r of s.reasons ?? []) reasons.add(r)
  }
  const ips = samples.map((s) => s.ip).filter((ip): ip is string => Boolean(ip))
  if (new Set(ips).size > 1) reasons.add('ip_change')
  const lastGeo = [...samples].reverse().find((s) => s.lat != null && s.lon != null)
  const gps = tel.gps ?? samples.find((s) => s.gps)?.gps
  const gpsReason = gpsMismatchReason(gps, lastGeo)
  if (gpsReason) reasons.add(gpsReason)
  const last = samples[samples.length - 1]
  const lastPlace = last
    ? [last.city, last.region || last.country].filter(Boolean).join(', ') || null
    : null
  const pins: SessionNetworkPin[] = []
  for (const s of samples) {
    if (s.lat == null || s.lon == null) continue
    pins.push({
      t: s.t,
      lat: s.lat,
      lon: s.lon,
      kind: 'ip',
      label: [s.city, s.country].filter(Boolean).join(', ') || 'IP',
    })
  }
  if (gps) {
    pins.push({ t: last?.t ?? 0, lat: gps.lat, lon: gps.lon, kind: 'gps', label: 'GPS' })
  }
  return {
    sampleCount: samples.length,
    reconnectCount: tel.reconnectCount,
    medianRttMs: rtts.length ? Math.round(median(rtts)) : null,
    vpnLikely: Boolean(last?.vpnLikely) || reasons.size > 0,
    reasons: [...reasons],
    lastPlace,
    pins: pins.slice(0, 24),
  }
}
