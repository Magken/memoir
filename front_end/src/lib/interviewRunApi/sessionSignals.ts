/**
 * Session-clarity / security atlas + collector fallback + Edge fill.
 * Interview-end grains live on analysis.signals. Not a Soft Decision source.
 */
import type { Creator2BriefDocument } from '../interviewBrief/creator2BriefTypes'
import { ASSIST_TURN_TEMPLATE_ID } from './assistTurnMarks'
import { buildTimelineIndex } from './editorCapture/timelineIndex'
import { digestEditorTape } from './editorCapture/tapeDigest'
import type { EditorTapesPack } from './editorCapture/types'
import {
  assembleAttemptRollup,
  getInterviewResponse,
  saveInterviewResponse,
} from './interviewResponse'
import { currentMarkGeneration, enqueueMarkJob } from './markJobs'
import { ordinalToUnit } from './ordinalMaps'
import { digestHasEditorWork } from './processMarks'
import { pasteBurstsFromToolGrains } from './recruiterProcess'
import { applyPasteBurstsToIncidents } from './resultHomes'
import { classifyTapeInsert, uniqueInsertActions } from './insertSource'
import { chipReadingOk, humanVpnReason, stripReportProse } from './reportDialect'
import {
  digestSessionTelemetry,
  flushSessionTelemetry,
  loadSessionTelemetry,
  type SessionTelemetry,
} from './sessionTelemetry'
import { sessionTelemetryIndexEntry } from './sessionTelemetry/store'
import { runInterviewToolAssess } from './toolAssessEdgeClient'
import type {
  AnalysisGrainStub,
  InterviewResponse,
} from './talkTypes'
import type {
  InterviewOutputMeta,
  OverviewClarityDiagrams,
  OverviewSecurityCapture,
  OverviewSecurityCheck,
  OverviewSecurityDiagrams,
  OverviewSignalFlag,
  OutputMetaSignal,
} from './fixtures/output-cards/outputCardFixture'
import { compileClarityPatterns } from './clarityPatterns'
import { digestSittingDeclaration } from './sittingDeclaration'
import { CLARITY_TEMPLATE_ID, SECURITY_TEMPLATE_ID } from './signalHost'
import {
  compileSessionSeries,
  pickTapeForSeries,
  pickTelemetryForSeries,
  type SessionSeries,
} from './sessionSeries'
import type { SittingReadSection, SittingReadTag } from './sittingReadMarkup'

export { CLARITY_TEMPLATE_ID, SECURITY_TEMPLATE_ID }
export const SESSION_SIGNAL_HOST = 'attempt'
export const SESSION_SIGNAL_IDS = [CLARITY_TEMPLATE_ID, SECURITY_TEMPLATE_ID] as const

const FORBIDDEN_ATLAS_KEYS = new Set([
  'source',
  'markdown',
  'candidateMarkdown',
  'answerKey',
  'expected',
  'files',
  'oracle',
  'coach',
  'ip',
])

const SECRET_RE = /answerKey|expected|oracle|hidden|SECRET/i

export type SessionPhaseKind = 'talk' | 'form' | 'coding' | 'doc' | 'other'

export type SessionMatrixAxis = {
  key: string
  unit: number
  label: string
}

export type SessionPhaseRow = {
  phaseId: string
  title: string
  kind: SessionPhaseKind
  hostRef: string | null
  completed: boolean
  skipped: boolean
  matrix: SessionMatrixAxis[]
}

export type SessionSignalAtlas = {
  schema: 'vurify/session-signal-atlas.v1'
  leftover: Array<{
    phaseId: string
    topicId: string
    templateId: string
    status: string
    boardSummary: string
    quote?: string
  }>
  pasteEvidence: Array<{
    phaseId: string
    file?: string
    chars?: number
    excerpt?: string
    lineCount?: number
    wholeFile?: boolean
    route?: string
  }>
  assist: {
    applyCount: number
    turns: Array<{
      messageId: string
      phaseId: string
      status: string
      asked_well?: string
      over_reliance?: string
      applied_judgment?: string
      integrity?: string
    }>
  }
  tapes: Array<{
    phaseId: string
    kind: string
    durationMs: number
    idleMs: number
    activeMs: number
    hopCount: number
    pasteCount: number
    applyCount: number
    runCount: number
    cadence: { tickCount: number; medianGapMs: number; p95GapMs: number }
    filesTouched: string[]
  }>
  talk: Array<{
    phaseId: string
    candidateTurns: number
    topicJumps: number
    medianGapMs: number
  }>
  telemetry: ReturnType<typeof digestSessionTelemetry>
  phases: SessionPhaseRow[]
  collectors: {
    clarityUnit: number
    securityUnit: number
    checks: OverviewSecurityCheck[]
    captures: OverviewSecurityCapture[]
  }
  sessionSeries: SessionSeries
  declaration: import('./sittingDeclaration').SittingDeclarationDigest
  patterns: OverviewSecurityCheck[]
}

function rec(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function clip(s: string, n: number): string {
  return s.replace(/\s+/g, ' ').trim().slice(0, n)
}

function median(nums: number[]): number {
  if (!nums.length) return 0
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2
}

function mean(nums: number[]): number {
  if (!nums.length) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

function signalFor(unit: number, invertWatch = false): OutputMetaSignal {
  if (invertWatch) {
    if (unit >= 0.75) return 'good'
    if (unit >= 0.4) return 'watch'
    return 'bad'
  }
  if (unit >= 0.7) return 'good'
  if (unit >= 0.4) return 'watch'
  return 'bad'
}

function phaseKind(brief: Creator2BriefDocument, phaseId: string): SessionPhaseKind {
  const phase = brief.phases.find((p) => p.id === phaseId)
  if (!phase) return 'other'
  if (phase.kind === 'discussion') return 'talk'
  const type = String(brief.tools[phase.toolRef ?? '']?.type ?? '')
  if (type === 'form' || type === 'form_quiz') return 'form'
  if (type === 'coding') return 'coding'
  if (type === 'doc') return 'doc'
  return 'other'
}

function phaseTitle(brief: Creator2BriefDocument, phaseId: string): string {
  // A missing optional section must not throw: this runs inside a mark job, where
  // a TypeError used to be swallowed and the whole clarity mark silently vanished.
  const phase = (brief.phases ?? []).find((p) => p.id === phaseId)
  if (phase?.title?.trim()) return phase.title.trim()
  if (phase?.toolRef && brief.tools?.[phase.toolRef]?.title) {
    return brief.tools[phase.toolRef]!.title
  }
  const topic = (brief.topicLibrary ?? []).find((t) => t.id === phase?.topicId)
  return topic?.label?.trim() || phaseId
}

function dimScore(g: AnalysisGrainStub | undefined, key: string): string | undefined {
  const d = g?.dimensions?.find((x) => x.key === key)
  return d ? String(d.score ?? '').trim() || undefined : undefined
}

export function atlasHasSecretLeak(atlas: unknown): boolean {
  try {
    return SECRET_RE.test(JSON.stringify(atlas))
  } catch {
    return true
  }
}

function stripSecrets<T>(raw: T): T {
  try {
    return JSON.parse(
      JSON.stringify(raw, (key, value) => {
        if (FORBIDDEN_ATLAS_KEYS.has(key)) return undefined
        if (typeof value === 'string' && SECRET_RE.test(value)) return undefined
        return value
      }),
    ) as T
  } catch {
    return raw
  }
}

export function compileSessionSignalAtlas(input: {
  brief: Creator2BriefDocument
  response: InterviewResponse
  telemetry?: SessionTelemetry | null
  tapes?: EditorTapesPack | null
}): SessionSignalAtlas {
  const { brief, response } = input
  const leftover: SessionSignalAtlas['leftover'] = []
  for (const [topicId, topic] of Object.entries(response.analysis.topics ?? {})) {
    const phase = brief.phases.find((p) => p.topicId === topicId)
    const phaseId = phase?.id ?? topicId
    for (const [templateId, grain] of Object.entries(topic.byTemplate ?? {})) {
      if (templateId.startsWith('sig.')) continue
      const result = rec(grain.result)
      const boardSummary = clip(
        String(result?.boardSummary ?? grain.justification ?? ''),
        220,
      )
      const quote = clip(String(grain.evidence?.[0] ?? grain.evidenceRefs?.[0]?.quote ?? ''), 80)
      leftover.push({
        phaseId,
        topicId,
        templateId,
        status: grain.status,
        boardSummary,
        ...(quote ? { quote } : {}),
      })
    }
  }
  for (const [hostRef, grains] of Object.entries(response.analysis.tools ?? {})) {
    const phase = brief.phases.find((p) => p.kind === 'tool' && 'toolRef' in p && p.toolRef === hostRef)
    const phaseId = phase?.id ?? hostRef
    for (const [templateId, grain] of Object.entries(grains ?? {})) {
      if (templateId.startsWith('sig.') || templateId.startsWith('synth.')) continue
      const result = rec(grain.result)
      const boardSummary = clip(
        String(result?.boardSummary ?? grain.justification ?? ''),
        220,
      )
      if (!boardSummary) continue
      const quote = clip(String(grain.evidence?.[0] ?? grain.evidenceRefs?.[0]?.quote ?? ''), 80)
      leftover.push({
        phaseId,
        topicId: hostRef,
        templateId,
        status: grain.status,
        boardSummary,
        ...(quote ? { quote } : {}),
      })
    }
  }

  let applyCount = 0
  let pasteInternal = 0
  let pasteExternal = 0
  const assistTurns: SessionSignalAtlas['assist']['turns'] = []
  for (const [messageId, row] of Object.entries(response.analysis.turns ?? {})) {
    const g = row?.[ASSIST_TURN_TEMPLATE_ID]
    if (!g) continue
    const msg = response.messages.find((m) => m.id === messageId)
    assistTurns.push({
      messageId,
      phaseId: msg?.phaseId || g.hostRef,
      status: g.status,
      asked_well: dimScore(g, 'asked_well'),
      over_reliance: dimScore(g, 'over_reliance'),
      applied_judgment: dimScore(g, 'applied_judgment'),
      integrity: dimScore(g, 'integrity'),
    })
  }

  const tapes: SessionSignalAtlas['tapes'] = []
  const pasteEvidence: SessionSignalAtlas['pasteEvidence'] = []
  let anyEditorWork = false
  for (const phase of brief.phases) {
    if (phase.kind !== 'tool') continue
    const tape = pickTapeForSeries(response.briefId, phase.id, input.tapes)
    if (!tape) continue
    const digest = digestEditorTape(tape)
    const index = buildTimelineIndex({
      tape,
      messages: response.messages,
      phaseId: phase.id,
    })
    let idleMs = 0
    let activeMs = 0
    for (const b of index.buckets) {
      const span = Math.max(0, b.endMs - b.startMs)
      if (b.kind === 'idle') idleMs += span
      else activeMs += span
    }
    const inserts = uniqueInsertActions(digest?.actions ?? [])
    const pasteCount = inserts.filter((a) => a.action !== 'copilot_apply').length
    for (const a of inserts) {
      const source = classifyTapeInsert(a.action, a.detail)
      if (source === 'internal_paste') pasteInternal += 1
      else if (source === 'external_paste') pasteExternal += 1
    }
    const apply = inserts.filter((a) => a.action === 'copilot_apply').length
    applyCount += apply
    if (digest && digestHasEditorWork(digest)) anyEditorWork = true
    for (const a of inserts) {
      const detail = rec(a.detail)
      const excerpt = clip(String(detail?.excerpt ?? ''), 200)
      if (!excerpt && !detail?.wholeFile && !detail?.path) continue
      const source = classifyTapeInsert(a.action, a.detail)
      pasteEvidence.push({
        phaseId: phase.id,
        ...(typeof detail?.path === 'string' ? { file: detail.path } : {}),
        ...(typeof detail?.chars === 'number' ? { chars: detail.chars } : {}),
        ...(excerpt ? { excerpt } : {}),
        ...(typeof detail?.lineCount === 'number' ? { lineCount: detail.lineCount } : {}),
        ...(detail?.wholeFile ? { wholeFile: true } : {}),
        ...(source ? { route: source } : {}),
      })
    }
    tapes.push({
      phaseId: phase.id,
      kind: tape.kind,
      durationMs: tape.durationMs,
      idleMs,
      activeMs,
      hopCount: digest?.filesTouched?.length ?? 0,
      pasteCount,
      applyCount: apply,
      runCount: digest?.actions.filter((a) => a.action === 'run').length ?? 0,
      cadence: digest?.cadence ?? { tickCount: 0, medianGapMs: 0, p95GapMs: 0 },
      filesTouched: (digest?.filesTouched ?? []).slice(0, 12),
    })
  }

  const talk: SessionSignalAtlas['talk'] = []
  const byPhase = new Map<string, InterviewResponse['messages']>()
  for (const m of response.messages) {
    if (m.kind === 'assist') continue
    const list = byPhase.get(m.phaseId) ?? []
    list.push(m)
    byPhase.set(m.phaseId, list)
  }
  for (const [phaseId, msgs] of byPhase) {
    if (phaseKind(brief, phaseId) !== 'talk') continue
    const cand = msgs.filter((m) => m.role === 'candidate')
    const gaps: number[] = []
    for (let i = 1; i < cand.length; i++) {
      const a = Date.parse(cand[i - 1]!.at)
      const b = Date.parse(cand[i]!.at)
      if (Number.isFinite(a) && Number.isFinite(b) && b > a) gaps.push(b - a)
    }
    const topics = new Set(msgs.map((m) => m.topicId).filter(Boolean))
    talk.push({
      phaseId,
      candidateTurns: cand.length,
      topicJumps: Math.max(0, topics.size - 1),
      medianGapMs: Math.round(median(gaps)),
    })
  }

  const telemetryDoc = pickTelemetryForSeries(response.briefId, input.telemetry)
  const telemetry = digestSessionTelemetry(telemetryDoc)
  const completed = new Set(response.completedPhaseIds)
  const skipped = new Set(response.skippedPhaseIds)
  const toolPhases = brief.phases.filter((p) => p.kind === 'tool')
  const tapesPresent = tapes.length
  const toolTotal = toolPhases.length

  const leftoverFilled = leftover.filter((r) => r.status === 'filled').length
  const leftoverTotal = leftover.length
  const artifactUnit =
    leftoverTotal + Object.keys(response.analysis.tools ?? {}).length
      ? mean([
          leftoverTotal ? leftoverFilled / leftoverTotal : 0.7,
          ...Object.values(response.analysis.tools ?? {}).map((row) => {
            const grains = Object.values(row)
            if (!grains.length) return 0.5
            return grains.filter((g) => g.status === 'filled').length / grains.length
          }),
        ])
      : 0.6

  const hopMean = mean(tapes.map((t) => t.hopCount))
  const focusUnit = clamp01(1 - hopMean / 8 - mean(talk.map((t) => t.topicJumps)) / 4)
  const idleShare = mean(
    tapes.map((t) => {
      const d = t.idleMs + t.activeMs
      return d > 0 ? t.idleMs / d : 0
    }),
  )
  const paceUnit = clamp01(1 - idleShare)
  const closed = brief.phases.filter(
    (p) => completed.has(p.id) || skipped.has(p.id),
  ).length
  const followUnit = brief.phases.length
    ? clamp01(completed.size / Math.max(1, closed || brief.phases.length))
    : 0.5
  const assistUnits = assistTurns
    .map((t) =>
      ordinalToUnit({
        templateId: ASSIST_TURN_TEMPLATE_ID,
        dimKey: 'applied_judgment',
        score: t.applied_judgment,
      }),
    )
    .filter((n): n is number => n != null)
  const assistUnit = assistUnits.length ? mean(assistUnits) : null
  const authoredIds = brief.phases.map((p) => p.id)
  const closedOrder = authoredIds.filter((id) => completed.has(id) || skipped.has(id))
  let holes = 0
  for (let i = 1; i < closedOrder.length; i++) {
    const a = authoredIds.indexOf(closedOrder[i - 1]!)
    const b = authoredIds.indexOf(closedOrder[i]!)
    if (b > a + 1) holes += 1
  }
  const continuityUnit = clamp01(1 - holes / Math.max(1, authoredIds.length))
  const clarityParts = [focusUnit, paceUnit, followUnit, artifactUnit, continuityUnit]
  if (assistUnit != null) clarityParts.push(assistUnit)
  const clarityUnit = clamp01(mean(clarityParts))

  const dwellRatio = telemetry.dwellRatio
  const cursorUnit = dwellRatio == null ? 0 : clamp01(dwellRatio)
  const pasteShare = mean(
    tapes.map((t) => {
      const ticks = Math.max(1, t.cadence.tickCount)
      return t.pasteCount / ticks
    }),
  )
  const typingUnit = tapes.length && anyEditorWork
    ? clamp01(1 - pasteShare * 0.6 - idleShare * 0.4)
    : undefined
  const recUnit = toolTotal ? tapesPresent / toolTotal : 1

  const cadenceMs = median(tapes.map((t) => t.cadence.medianGapMs).filter((n) => n > 0))
  const pasteTotal = tapes.reduce((s, t) => s + t.pasteCount, 0)
  const burstLines = pasteBurstsFromToolGrains(response)
    .slice(0, 3)
    .map((b) => b.summary)
    .filter(Boolean)
  const botBit =
    applyCount > 0
      ? `${applyCount} bot edit${applyCount === 1 ? '' : 's'} (Copilot or Assist apply)`
      : ''
  const pasteParts = [
    pasteInternal
      ? `${pasteInternal} in-app paste${pasteInternal === 1 ? '' : 's'}`
      : '',
    pasteExternal
      ? `${pasteExternal} outside paste${pasteExternal === 1 ? '' : 's'}`
      : '',
  ].filter(Boolean)
  const pasteNote =
    pasteTotal === 0
      ? botBit
        ? `There were no paste actions on the editor recordings. ${botBit}. A bot edit is not a paste.`
        : 'There were no paste actions on the editor recordings.'
      : burstLines.length
        ? burstLines.join(' ')
        : `There were ${pasteParts.join(' and ') || `${pasteTotal} paste${pasteTotal === 1 ? '' : 's'}`} on the editor recordings${botBit ? `, plus ${botBit}` : ''}. These routes are observational. Never count a bot edit as a paste.`
  const sessionSeries = compileSessionSeries({
    brief,
    response,
    telemetry: input.telemetry,
    tapes: input.tapes,
  })
  const declaration = digestSittingDeclaration(response.sittingDeclaration)
  const patterns = compileClarityPatterns({
    brief,
    series: sessionSeries,
    telemetry,
    declaration,
    leftover,
    tapes,
    talk,
    completedPhaseIds: response.completedPhaseIds,
    skippedPhaseIds: response.skippedPhaseIds,
    assistApplyCount: applyCount,
    assistTurnCount: assistTurns.length,
  })
  const dictationSessions = sessionSeries.byPhase.flatMap((p) => p.dictation.sessions)
  const dictationMs = sessionSeries.byPhase.reduce((s, p) => s + p.dictation.totalMs, 0)
  const dictationReading = dictationSessions.length
    ? `${dictationSessions.length} session${dictationSessions.length === 1 ? '' : 's'} · ${Math.round(dictationMs / 1000)}s`
    : 'not observed'
  const telEvents = telemetryDoc?.events ?? []
  const countKind = (kinds: string[]) => telEvents.filter((e) => kinds.includes(e.kind)).length
  const inspectN = countKind(['devtools_shortcut', 'devtools_open', 'devtools_console_trap'])
  const viewSourceN = countKind(['view_source'])
  const newSurfaceN = countKind(['new_surface'])
  const copyBlockN = countKind(['copy_blocked', 'cut_blocked'])
  const copyOkN = countKind(['copy_route'])
  const printSaveN = countKind(['print_blocked', 'save_blocked'])
  const hotkeyParts = [
    inspectN ? `${inspectN} inspect` : '',
    viewSourceN ? `${viewSourceN} view source` : '',
    newSurfaceN ? `${newSurfaceN} new tab` : '',
    copyBlockN ? `${copyBlockN} copy blocked` : '',
    copyOkN ? `${copyOkN} copy` : '',
    printSaveN ? `${printSaveN} print/save` : '',
  ].filter(Boolean)
  const hotkeyReading = hotkeyParts.length ? hotkeyParts.join(' · ') : 'none observed'
  const hotkeyWatch = inspectN + viewSourceN + newSurfaceN + copyBlockN + printSaveN > 0
  const hotkeyNote = hotkeyParts.length
    ? `Keyboard shortcuts recorded on this interview: inspect (F12, Ctrl/Cmd+Shift+I/J/C/K, Cmd+Alt+I), view source, new tab or window, copy or cut, and print or save. Paste stays on Paste bursts. Editor and composer Ctrl/Cmd+C/V/X are not blocked.`
    : 'No inspect, view-source, new-tab, copy, or print/save shortcuts were recorded. Paste stays on Paste bursts.'
  const trailCount = telemetry.trailCount
  const typed = sessionSeries.typing
  const net = sessionSeries.network
  const reconnect = telemetry.reconnectCount
  const vpnLikely = Boolean(net?.vpnLikely)
  const vpnReasons = net?.reasons ?? []
  const place = net?.lastPlace
  const rtt = net?.medianRttMs
  const networkUnit = clamp01(1 - reconnect / 4 - (vpnLikely ? 0.15 : 0))
  const securityUnit = clamp01(
    mean(
      [
        dwellRatio == null ? 0.5 : cursorUnit,
        typingUnit,
        networkUnit,
        recUnit,
      ].filter((n): n is number => typeof n === 'number'),
    ),
  )
  const vpnReadingParts = [
    telemetry.sampleCount
      ? vpnLikely
        ? 'VPN likely'
        : 'no VPN signal'
      : 'not observed',
    place || null,
    rtt != null ? `${rtt}ms` : null,
    `${reconnect} reconnect${reconnect === 1 ? '' : 's'}`,
  ].filter(Boolean)
  const cursorReading =
    dwellRatio == null
      ? 'not observed'
      : trailCount
        ? `${Math.round(cursorUnit * 100)}% · trail ${trailCount} pts`
        : `${Math.round(cursorUnit * 100)}%`
  const typingReading =
    typed?.wpm != null
      ? cadenceMs > 0
        ? `${typed.wpm} WPM · ${Math.round(cadenceMs / 100) / 10}s median gap`
        : `${typed.wpm} WPM`
      : cadenceMs > 0
        ? `${Math.round(cadenceMs / 100) / 10}s median gap`
        : 'not observed'
  const checks: OverviewSecurityCheck[] = [
    {
      id: 'cursor',
      check: 'Time on the work',
      reading: cursorReading,
      unit: dwellRatio == null ? undefined : cursorUnit,
      note:
        dwellRatio == null
          ? 'Time on the live work was not recorded for this attempt.'
          : trailCount
            ? `They kept pointer or focus on the live stage for ${Math.round(cursorUnit * 100)}% of visible time. The path has ${trailCount} samples.`
            : `They kept pointer or focus on the live stage (brief, editor, Conversation, or Assist) for ${Math.round(cursorUnit * 100)}% of visible time.`,
      signal: dwellRatio == null ? 'watch' : signalFor(cursorUnit),
    },
    {
      id: 'typing',
      check: 'Typing',
      reading: typingReading,
      unit: typingUnit,
      note:
        typed?.wpm != null
          ? `Typed words per minute from keystrokes (excludes dictation and paste). Cadence median gap ${cadenceMs > 0 ? `${Math.round(cadenceMs / 100) / 10}s` : 'not observed'}.`
          : cadenceMs > 0 && anyEditorWork
            ? `Cadence uses editor tick gaps and paste/idle share (${Math.round(pasteShare * 100)}% paste). Typed WPM not observed.`
            : 'No typed bursts or editor cadence ticks were recorded.',
      signal: typed?.wpm != null || (cadenceMs > 0 && anyEditorWork) ? signalFor(typingUnit ?? 0) : 'watch',
    },
    {
      id: 'dictation',
      check: 'Dictation',
      reading: dictationReading,
      note: dictationSessions.length
        ? `Speech-to-text ran for ${dictationReading} on Conversation or Assist compose. There is no audio recording.`
        : 'No dictation session ran on this attempt. Not observed is not proof of typing.',
      signal: dictationSessions.length ? 'good' : 'watch',
    },
    {
      id: 'vpn',
      check: 'Network',
      reading: vpnReadingParts.join(' · '),
      unit: networkUnit,
      note: telemetry.sampleCount
        ? vpnLikely
          ? `A VPN is likely from ${vpnReasons.map(humanVpnReason).join(', ') || 'network signals'}. The map uses the address we see (VPN exit if present). There ${reconnect === 1 ? 'was 1 reconnect' : `were ${reconnect} reconnects`}.`
          : `No VPN signal on ${telemetry.sampleCount} probe sample${telemetry.sampleCount === 1 ? '' : 's'}. There ${reconnect === 1 ? 'was 1 reconnect' : `were ${reconnect} reconnects`}.`
        : `The browser only reports online or offline. There ${reconnect === 1 ? 'was 1 reconnect' : `were ${reconnect} reconnects`}. Location was not observed.`,
      signal: telemetry.sampleCount === 0 ? 'watch' : signalFor(networkUnit),
    },
    {
      id: 'paste',
      check: 'Paste bursts',
      reading: `${pasteTotal} paste${pasteTotal === 1 ? '' : 's'}`,
      unit: anyEditorWork ? clamp01(1 - pasteShare) : undefined,
      note: pasteNote,
      signal: anyEditorWork ? signalFor(clamp01(1 - pasteShare)) : 'watch',
    },
    {
      id: 'hotkeys',
      check: 'Shortcuts',
      reading: hotkeyReading,
      note: hotkeyNote,
      signal: hotkeyWatch ? 'watch' : 'good',
    },
    {
      id: 'recordings',
      check: 'Session recordings',
      reading: `${tapesPresent} / ${Math.max(toolTotal, tapesPresent)}`,
      note: 'Form, coding, and writing keep an editor recording you can replay. Conversation does not.',
      signal: tapesPresent >= toolTotal && toolTotal > 0 ? 'good' : signalFor(recUnit),
    },
  ]

  const captures: OverviewSecurityCapture[] = tapes.map((t) => ({
    sectionId: t.phaseId,
    capture: t.kind === 'doc' ? 'Writing tape' : t.kind === 'form' ? 'Form tape' : 'Editor tape',
    note: `${phaseTitle(brief, t.phaseId)} has an editor recording (${Math.round(t.durationMs / 1000)}s).`,
  }))

  const phases: SessionPhaseRow[] = brief.phases.map((p) => {
    const tape = tapes.find((t) => t.phaseId === p.id)
    const talkRow = talk.find((t) => t.phaseId === p.id)
    const d = (tape?.idleMs ?? 0) + (tape?.activeMs ?? 0)
    const idle = d > 0 ? (tape?.idleMs ?? 0) / d : 0
    return {
      phaseId: p.id,
      title: phaseTitle(brief, p.id),
      kind: phaseKind(brief, p.id),
      hostRef: p.toolRef ?? null,
      completed: completed.has(p.id),
      skipped: skipped.has(p.id),
      matrix: [
        { key: 'focus', unit: clamp01(1 - (tape?.hopCount ?? 0) / 8 - (talkRow?.topicJumps ?? 0) / 4), label: 'Focus vs scatter' },
        { key: 'pace', unit: clamp01(1 - idle), label: 'Pace vs stall' },
        { key: 'followThrough', unit: completed.has(p.id) ? 1 : skipped.has(p.id) ? 0.2 : 0.5, label: 'Follow-through' },
        { key: 'assistJudgment', unit: assistUnit ?? 0.5, label: 'Assist judgment' },
        { key: 'artifact', unit: artifactUnit, label: 'Artifact usability' },
        { key: 'continuity', unit: continuityUnit, label: 'Continuity' },
      ],
    }
  })

  const atlas: SessionSignalAtlas = {
    schema: 'vurify/session-signal-atlas.v1',
    leftover,
    pasteEvidence: pasteEvidence.slice(0, 12),
    assist: { applyCount, turns: assistTurns },
    tapes,
    talk,
    telemetry,
    phases,
    collectors: { clarityUnit, securityUnit, checks, captures },
    sessionSeries,
    declaration,
    patterns,
  }
  return stripSecrets(atlas)
}

function cannedClarity(atlas: SessionSignalAtlas): string {
  const n = atlas.phases.filter((p) => p.completed).length
  const t = atlas.phases.length
  const named = atlas.phases.map((p) => p.title).join(', ')
  const observed = atlas.patterns
    .filter((c) => c.id !== 'support' && c.reading !== 'not observed')
    .slice(0, 4)
    .map((c) => `${c.check} ${c.reading}`)
    .join('; ')
  const head = `They finished ${n} of ${t} stages (${named}). This reading is how the session ran, not how they speak, not a diagnosis, and not an overall score. The timer was not extended.`
  const glance = observed ? `What we saw includes ${observed}.` : ''
  return [head, glance].filter(Boolean).join('\n\n')
}

function cannedDiagrams(atlas: SessionSignalAtlas): OverviewSecurityDiagrams {
  const net = atlas.sessionSeries.network
  const pins = net?.pins ?? []
  const place = net?.lastPlace
  const trail = atlas.sessionSeries.pointerTrail?.length ?? 0
  const phase =
    atlas.sessionSeries.byPhase.find((p) =>
      atlas.sessionSeries.incidents.some((i) => i.sectionId === p.phaseId),
    ) ?? atlas.sessionSeries.byPhase[0]
  const location = pins.length
    ? net?.vpnLikely
      ? `This street map shows the city on the address we saw${place ? ` (${place})` : ''}. A VPN looks likely, so the pin is the exit, not a home address. Drag the map to look around.`
      : `This street map shows the city on the address we saw${place ? ` (${place})` : ''}${pins.some((p) => p.kind === 'gps') ? ', plus the GPS pin they allowed' : ''}. Drag the map to look around. The browser cannot prove a home address.`
    : 'No location pin was recorded. The map stays empty until a network probe or GPS sample exists.'
  const pointer = trail
    ? `This drawing is not a street map. It is the path of the pointer on the live interview page (${trail} samples). The top of the box is the top of the page. It is not a camera.`
    : 'No pointer path was recorded on the live page.'
  const incidents = phase
    ? `This is the clock for ${phase.title}. Color along the line is typing versus idle. The list under the chart names paste, leaving the tab, or a reconnect. Click a row to open that stage.`
    : 'No stage clock was recorded, so this chart has nothing to plot.'
  return { location, pointer, incidents }
}

function cannedClarityDiagrams(atlas: SessionSignalAtlas): OverviewClarityDiagrams {
  const phases = atlas.sessionSeries.byPhase.filter(
    (p) => p.cadence.tickCount || p.talk.sendCount,
  )
  const named = phases.map((p) => p.title).join(', ') || 'the stages they opened'
  const wpm = atlas.sessionSeries.typing?.wpm
  const wpmBit =
    wpm != null
      ? ` Typed speed on this attempt was ${wpm} words per minute from keystrokes only.`
      : ''
  const cadence = phases.length
    ? `Each bar is the typical pause between keystrokes on ${named}. A taller bar means they waited longer between keys. It is not a typing-speed score and it does not change the overall mark.${wpmBit}`
    : 'No keystroke pauses were recorded, so this chart has nothing to plot.'
  const strip = atlas.sessionSeries.byPhase.find((p) => p.cadence.buckets.length)
  const pace = strip
    ? `This chart is idle versus typing along ${strip.title}. Idle is a pause with no keys, not coded work. Pick another section from the list above the chart.`
    : 'No section clock was recorded, so this chart has nothing to plot.'
  return { cadence, pace }
}

function asClarityDiagrams(raw: unknown): OverviewClarityDiagrams | undefined {
  const r = rec(raw)
  if (!r) return undefined
  const cadence = stripReportProse(r.cadence)
  const pace = stripReportProse(r.pace)
  if (!cadence && !pace) return undefined
  const fallback: OverviewClarityDiagrams = {
    cadence: 'No keystroke pauses were recorded, so this chart has nothing to plot.',
    pace: 'No section clock was recorded, so this chart has nothing to plot.',
  }
  return {
    cadence: cadence || fallback.cadence,
    pace: pace || fallback.pace,
  }
}

function asDiagrams(raw: unknown): OverviewSecurityDiagrams | undefined {
  const r = rec(raw)
  if (!r) return undefined
  const location = stripReportProse(r.location)
  const pointer = stripReportProse(r.pointer)
  const incidents = stripReportProse(r.incidents)
  if (!location && !pointer && !incidents) return undefined
  const fallback: OverviewSecurityDiagrams = {
    location: 'No location pin was recorded.',
    pointer: 'No pointer path was recorded on the live page.',
    incidents: 'No stage clock was recorded, so this chart has nothing to plot.',
  }
  return {
    location: location || fallback.location,
    pointer: pointer || fallback.pointer,
    incidents: incidents || fallback.incidents,
  }
}

function cannedSecurity(atlas: SessionSignalAtlas): string {
  const c = atlas.collectors.checks
  const cursorRaw = c.find((r) => r.id === 'cursor')?.reading ?? 'not observed'
  const net = c.find((r) => r.id === 'vpn')?.reading ?? 'not observed'
  const typing = c.find((r) => r.id === 'typing')?.reading ?? 'not observed'
  const recordings = c.find((r) => r.id === 'recordings')?.reading ?? 'not observed'
  const cursorShare = cursorRaw.split(' · ')[0] || cursorRaw
  const cursorLine =
    cursorShare === 'not observed'
      ? 'Time on the live work was not recorded.'
      : `They stayed on the live work for ${cursorShare} of visible time.`
  const typingLine =
    typing === 'not observed'
      ? 'Typing cadence was not recorded.'
      : `Typing cadence is ${typing}.`
  return `${cursorLine} ${typingLine} Network reads ${net}. Session recordings are ${recordings} for form, coding, and writing. Conversation does not keep an editor recording.`
}

function asSittingTags(raw: unknown): SittingReadTag[] {
  if (!Array.isArray(raw)) return []
  const out: SittingReadTag[] = []
  for (const item of raw) {
    const r = rec(item)
    if (!r) continue
    const signal = r.signal
    const label = String(r.label ?? '').trim()
    if ((signal !== 'good' && signal !== 'watch' && signal !== 'bad') || !label) continue
    const hint = String(r.hint ?? '').trim()
    out.push(hint ? { signal, label, hint } : { signal, label })
    if (out.length >= 8) break
  }
  return out
}

function asEvidenceRefs(
  raw: unknown,
): Array<{ kind: string; ref: string; t?: number; quote?: string }> {
  if (!Array.isArray(raw)) return []
  const out: Array<{ kind: string; ref: string; t?: number; quote?: string }> = []
  for (const item of raw) {
    const r = rec(item)
    if (!r) continue
    const kind = String(r.kind ?? '').trim()
    const ref = String(r.ref ?? '').trim()
    if (!kind || !ref) continue
    const t = typeof r.t === 'number' && Number.isFinite(r.t) ? r.t : undefined
    const quote = String(r.quote ?? '').trim()
    out.push({ kind, ref, ...(t != null ? { t } : {}), ...(quote ? { quote } : {}) })
    if (out.length >= 16) break
  }
  return out
}

function twoParagraphs(text: string): string {
  const parts = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length >= 2) return `${parts[0]}\n\n${parts.slice(1).join('\n\n')}`
  return text.trim()
}

type HostClarityRow = {
  sectionId: string
  title: string
  grain: AnalysisGrainStub
}

export function collectHostClarityGrains(input: {
  brief: Creator2BriefDocument
  response: InterviewResponse
}): HostClarityRow[] {
  const out: HostClarityRow[] = []
  const seen = new Set<string>()
  for (const phase of input.brief.phases) {
    if (phase.kind === 'discussion' && 'topicId' in phase && phase.topicId) {
      const grain = input.response.analysis.topics?.[phase.topicId]?.byTemplate?.[CLARITY_TEMPLATE_ID]
      if (grain && (grain.status === 'filled' || grain.status === 'skipped')) {
        out.push({ sectionId: phase.id, title: phaseTitle(input.brief, phase.id), grain })
        seen.add(phase.id)
      }
    }
    if (phase.kind === 'tool' && 'toolRef' in phase && phase.toolRef) {
      const grain = input.response.analysis.tools?.[phase.toolRef]?.[CLARITY_TEMPLATE_ID]
      if (grain && (grain.status === 'filled' || grain.status === 'skipped')) {
        out.push({ sectionId: phase.id, title: phaseTitle(input.brief, phase.id), grain })
        seen.add(phase.id)
      }
    }
  }
  return out.filter((row) => seen.has(row.sectionId))
}

function findingFromHost(row: HostClarityRow): SittingReadSection & {
  evidenceRefs?: Array<{ kind: string; ref: string; t?: number; quote?: string }>
} {
  const result = rec(row.grain.result)
  const body = twoParagraphs(
    String(result?.boardSummaryDetail ?? result?.boardSummary ?? ''),
  )
  const tags = asSittingTags(result?.tags)
  const evidenceRefs = asEvidenceRefs(row.grain.evidenceRefs ?? result?.evidenceRefs)
  return {
    sectionId: row.sectionId,
    body: body || `${row.title} has a host clarity grain.`,
    ...(tags.length ? { tags } : {}),
    ...(evidenceRefs.length ? { evidenceRefs } : {}),
  }
}

function collectorFindings(atlas: SessionSignalAtlas): Array<
  SittingReadSection & {
    evidenceRefs?: Array<{ kind: string; ref: string; t?: number; quote?: string }>
  }
> {
  return atlas.phases.map((p) => {
    const leftover = atlas.leftover.find((r) => r.phaseId === p.phaseId && r.status === 'filled')
    const tape = atlas.tapes.find((t) => t.phaseId === p.phaseId)
    const talk = atlas.talk.find((t) => t.phaseId === p.phaseId)
    const dictation = atlas.sessionSeries.byPhase.find((s) => s.phaseId === p.phaseId)?.dictation
    const tags: SittingReadTag[] = []
    if (tape) {
      const idleShare =
        tape.idleMs + tape.activeMs > 0 ? tape.idleMs / (tape.idleMs + tape.activeMs) : 0
      tags.push({
        signal: idleShare > 0.45 ? 'watch' : 'good',
        label: `${Math.round(tape.cadence.medianGapMs / 100) / 10}s between keys`,
        hint: 'Typical pause between keystrokes on this recording',
      })
      tags.push({
        signal: idleShare > 0.45 ? 'watch' : 'good',
        label: `${Math.round(idleShare * 100)}% idle`,
        hint: 'Share of this recording with no typing',
      })
    }
    if (talk) {
      tags.push({
        signal: 'good',
        label: `${talk.candidateTurns} send${talk.candidateTurns === 1 ? '' : 's'}`,
        hint: 'Conversation replies on this stage',
      })
    }
    if (dictation?.sessions.length) {
      tags.push({
        signal: 'good',
        label: `${dictation.sessions.length} dictation`,
        hint: 'Voice typing sessions on this stage',
      })
    }
    const idleShare =
      tape && tape.idleMs + tape.activeMs > 0 ? tape.idleMs / (tape.idleMs + tape.activeMs) : 0
    const bits: string[] = []
    if (tape) {
      bits.push(
        `${p.title} tape ran ${Math.round(tape.durationMs / 1000)}s with ${tape.pasteCount} paste, ${tape.runCount} run, ${tape.hopCount} file${tape.hopCount === 1 ? '' : 's'} touched. Idle ${Math.round((tape.idleMs ?? 0) / 1000)}s (${Math.round(idleShare * 100)}%) stays idle - that is not coded work.`,
      )
    }
    if (talk) {
      bits.push(
        `Conversation on ${p.title}: ${talk.candidateTurns} candidate send${talk.candidateTurns === 1 ? '' : 's'}, median gap ${Math.round(talk.medianGapMs / 100) / 10}s${talk.topicJumps ? `, ${talk.topicJumps} topic jump${talk.topicJumps === 1 ? '' : 's'}` : ''}.`,
      )
    }
    if (dictation?.totalMs) {
      bits.push(`Dictation clocks on ${p.title}: ${Math.round(dictation.totalMs / 1000)}s.`)
    }
    if (p.skipped) {
      bits.push(`${p.title} was forfeited. That is on the skip list. It does not rewrite the overall score or add time elsewhere.`)
    } else if (p.completed) {
      bits.push(`${p.title} closed.`)
    }
    if (!bits.length) {
      bits.push(
        `${p.title} has session clocks only, with no marker notes and no editor recording. That absence is not a clean bill of health and not a diagnosis.`,
      )
    }
    const body = bits.join(' ')
    const evidenceRefs = leftover?.quote
      ? [{ kind: 'message' as const, ref: leftover.topicId, quote: leftover.quote }]
      : tape
        ? [{ kind: 'tape_action' as const, ref: p.phaseId, t: 0, quote: 'tape' }]
        : [{ kind: 'case' as const, ref: p.phaseId, quote: p.title }]
    return { sectionId: p.phaseId, body, ...(tags.length ? { tags } : {}), evidenceRefs }
  })
}

export function composeClarityGrain(input: {
  atlas: SessionSignalAtlas
  hosts: HostClarityRow[]
  hostRef?: string
}): AnalysisGrainStub {
  const hostRef = input.hostRef ?? SESSION_SIGNAL_HOST
  const filledBySection = new Map(
    input.hosts
      .filter((h) => h.grain.status === 'filled')
      .map((h) => [h.sectionId, findingFromHost(h)]),
  )
  const collectorBySection = new Map(collectorFindings(input.atlas).map((f) => [f.sectionId, f]))
  const findings = input.atlas.phases.map(
    (p) => filledBySection.get(p.phaseId) ?? collectorBySection.get(p.phaseId),
  ).filter((row): row is NonNullable<typeof row> => Boolean(row))
  const glance = cannedClarity(input.atlas)
  const byPhase = input.atlas.phases.map((p) => ({
    phaseId: p.phaseId,
    title: p.title,
    matrix: p.matrix,
  }))
  const flags = asFlags(
    input.hosts.flatMap((h) => {
      const list = rec(h.grain.result)?.flags
      return Array.isArray(list) ? list : []
    }),
  )
  return {
    templateId: CLARITY_TEMPLATE_ID,
    hostRef,
    grain: 'interview_end',
    order: 90,
    status: 'filled',
    result: {
      boardSummary: glance,
      unit: input.atlas.collectors.clarityUnit,
      checks: clarityChecks(input.atlas),
      byPhase,
      sections: findings,
      sessionSeries: input.atlas.sessionSeries,
      declaration: input.atlas.declaration,
      patterns: input.atlas.patterns,
      diagrams: cannedClarityDiagrams(input.atlas),
      ...(flags ? { flags } : {}),
    },
    dimensions: input.atlas.phases[0]?.matrix.map((a) => ({
      key: a.key,
      label: a.label,
      score: Math.round(a.unit * 100) / 100,
    })),
    justification: [cannedClarity(input.atlas), ...findings.map((f) => f.body)]
      .filter(Boolean)
      .join('\n\n'),
    evidenceRefs: findings.flatMap((f) => f.evidenceRefs ?? []).slice(0, 16),
    confidence: filledBySection.size ? 'med' : 'low',
  }
}

function clarityChecks(atlas: SessionSignalAtlas): OverviewSecurityCheck[] {
  const done = atlas.phases.filter((p) => p.completed).length
  const total = atlas.phases.length
  const skippedTitles = atlas.phases.filter((p) => p.skipped).map((p) => p.title)
  const openTitles = atlas.phases.filter((p) => !p.completed && !p.skipped).map((p) => p.title)
  const axis = (key: string) => {
    const units = atlas.phases
      .map((p) => p.matrix.find((m) => m.key === key)?.unit)
      .filter((n): n is number => typeof n === 'number')
    return units.length ? mean(units) : atlas.collectors.clarityUnit
  }
  const artifact = axis('artifact')
  const pace = axis('pace')
  const focus = axis('focus')
  const leftoverFilled = atlas.leftover.filter((r) => r.status === 'filled').length
  const leftoverTotal = atlas.leftover.length
  const idleBits = atlas.tapes
    .map((t) => {
      const share = t.idleMs + t.activeMs > 0 ? t.idleMs / (t.idleMs + t.activeMs) : 0
      const title = atlas.phases.find((p) => p.phaseId === t.phaseId)?.title ?? t.phaseId
      return `${title} idle ${Math.round(share * 100)}% over ${Math.round(t.durationMs / 1000)}s`
    })
    .join('; ')
  const named = atlas.phases.map((p) => p.title).join(', ')
  return [
    ...atlas.patterns,
    {
      id: 'stages',
      check: 'Stage order',
      reading: `${done} / ${total}`,
      note:
        done === total
          ? `They closed all ${total} stages in the order they were given (${named}). Continuity here is that order, not a flexibility score. This check does not add time and does not rewrite the overall score.`
          : `They closed ${done} of ${total} (${named}).${skippedTitles.length ? ` They forfeited ${skippedTitles.join(', ')}.` : ''}${openTitles.length ? ` They still have ${openTitles.join(', ')} open.` : ''} A skip is a skip. Read the notes on the stages they finished. This check does not add time or rewrite marks.`,
      signal: done >= total && total > 0 ? 'good' : signalFor(done / Math.max(1, total)),
    },
    {
      id: 'answers',
      check: 'Answer usability',
      reading: `${Math.round(artifact * 100)}%`,
      unit: artifact,
      note: leftoverTotal
        ? `A marker can read notes on ${leftoverFilled} of ${leftoverTotal} stages (${Math.round(artifact * 100)}% usable work left). This is whether something usable was left, not how they speak, and not a bump to coding, form, or Conversation marks.`
        : `No stage notes are listed yet. The ${Math.round(artifact * 100)}% usability reading comes from session clocks only. This is not how they speak and not an overall-score source.`,
      signal: signalFor(artifact),
    },
    {
      id: 'record',
      check: 'Record',
      reading: `${Math.round(pace * 100)}%`,
      unit: pace,
      note: idleBits
        ? `Pace vs stall from tape idle. ${idleBits}. Idle stays idle - a pause is not coded work. A stall on the tape does not extend the timer and does not change the overall score.`
        : 'Pace vs stall from tape idle share, but no tool tape idle clocks were present. Idle stays idle. This reading does not add time.',
      signal: signalFor(pace),
    },
    {
      id: 'typical',
      check: 'Work-state',
      reading: `${Math.round(atlas.collectors.clarityUnit * 100)}%`,
      unit: atlas.collectors.clarityUnit,
      note: `This is a work-state reading for the Clarity panel only: focus ${Math.round(focus * 100)}%, pace, follow-through, artifact, continuity. Observation sits beside marks; it does not replace them. A support note does not raise or lower this number. The overall score still uses the stage notes and tool marks.`,
      signal: signalFor(atlas.collectors.clarityUnit),
    },
  ]
}

export function collectorSignalGrains(input: {
  atlas: SessionSignalAtlas
  hostRef?: string
  hosts?: HostClarityRow[]
}): Record<string, AnalysisGrainStub> {
  const hostRef = input.hostRef ?? SESSION_SIGNAL_HOST
  const atlas = input.atlas
  const byPhase = atlas.phases.map((p) => ({
    phaseId: p.phaseId,
    title: p.title,
    matrix: p.matrix,
  }))
  const clarity = composeClarityGrain({
    atlas,
    hosts: input.hosts ?? [],
    hostRef,
  })
  const incidents = atlas.sessionSeries.incidents
  const security: AnalysisGrainStub = {
    templateId: SECURITY_TEMPLATE_ID,
    hostRef,
    grain: 'interview_end',
    order: 91,
    status: 'filled',
    result: {
      boardSummary: cannedSecurity(atlas).slice(0, 220),
      unit: atlas.collectors.securityUnit,
      checks: atlas.collectors.checks,
      byPhase,
      incidents,
      sessionSeries: atlas.sessionSeries,
      diagrams: cannedDiagrams(atlas),
    },
    justification: cannedSecurity(atlas),
    evidenceRefs: incidents.flatMap((row) => row.evidenceRefs ?? []).slice(0, 16),
    confidence: 'low',
  }
  return {
    [CLARITY_TEMPLATE_ID]: clarity,
    [SECURITY_TEMPLATE_ID]: security,
  }
}

/** Collector until a sitting grain is filled. Pending stubs do not wipe Overview. */
export function overviewSignalGrains(input: {
  brief: Creator2BriefDocument
  response: InterviewResponse
  telemetry?: SessionTelemetry | null
  tapes?: EditorTapesPack | null
}): { atlas: SessionSignalAtlas; grains: Record<string, AnalysisGrainStub> } {
  const atlas = compileSessionSignalAtlas(input)
  const hosts = collectHostClarityGrains(input)
  const grains = collectorSignalGrains({ atlas, hosts })
  for (const [id, grain] of Object.entries(input.response.analysis.signals ?? {})) {
    if (grain?.status === 'filled') grains[id] = grain
  }
  return { atlas, grains }
}

export function mergeSessionSignals(
  doc: InterviewResponse,
  grains: Record<string, AnalysisGrainStub>,
): InterviewResponse {
  const signals = { ...(doc.analysis.signals ?? {}) }
  for (const [id, grain] of Object.entries(grains)) {
    const incoming = grain.status
    const status: AnalysisGrainStub['status'] =
      incoming === 'skipped' || incoming === 'pending' ? incoming : 'filled'
    signals[id] = {
      ...signals[id],
      ...grain,
      templateId: grain.templateId || id,
      hostRef: grain.hostRef || SESSION_SIGNAL_HOST,
      grain: 'interview_end',
      status,
    }
  }
  return saveInterviewResponse({
    ...doc,
    analysis: { ...doc.analysis, signals },
  })
}

function asChecks(raw: unknown): OverviewSecurityCheck[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: OverviewSecurityCheck[] = []
  for (const item of raw) {
    const r = rec(item)
    if (!r) continue
    const id = String(r.id ?? '').trim()
    const check = String(r.check ?? '').trim()
    const reading = String(r.reading ?? '').trim()
    const note = String(r.note ?? '').trim()
    if (!id || !check || !reading) continue
    const unit = typeof r.unit === 'number' && Number.isFinite(r.unit) ? r.unit : undefined
    const signal = r.signal === 'good' || r.signal === 'watch' || r.signal === 'bad' ? r.signal : undefined
    out.push({ id, check, reading, note, ...(unit != null ? { unit } : {}), ...(signal ? { signal } : {}) })
    if (out.length >= 24) break
  }
  return out.length ? out : undefined
}

function mergeSecurityChecks(
  collector: OverviewSecurityCheck[] | undefined,
  edge: OverviewSecurityCheck[] | undefined,
): OverviewSecurityCheck[] | undefined {
  if (!edge?.length) return collector
  if (!collector?.length) {
    return edge.map((row) =>
      chipReadingOk(row.reading || '') ? row : { ...row, reading: 'not observed' },
    )
  }
  const byId = new Map(collector.map((row) => [row.id, row]))
  const seen = new Set(edge.map((row) => row.id))
  const extra = collector.filter((row) => row.id === 'hotkeys' && !seen.has('hotkeys'))
  const mapped = edge.map((row) => {
    const prior = byId.get(row.id)
    const reading = chipReadingOk(row.reading || '') ? row.reading : prior?.reading || 'not observed'
    return { ...row, reading }
  })
  return extra.length ? [...mapped, ...extra] : mapped
}

const CLARITY_NOTE_MIN = 80

function mergeClarityChecks(
  collector: OverviewSecurityCheck[],
  edge: OverviewSecurityCheck[] | undefined,
): OverviewSecurityCheck[] {
  if (!collector.length) return edge ?? []
  if (!edge?.length) return collector
  const byId = new Map(edge.map((row) => [row.id, row]))
  const merged = collector.map((row) => {
    const incoming = byId.get(row.id)
    if (!incoming) return row.id === 'support' ? { ...row, signal: 'good' as const } : row
    const incomingNote = (incoming.note ?? '').trim()
    const keepCollector =
      incomingNote.length < CLARITY_NOTE_MIN ||
      incomingNote.split(/[.!?]/).filter((part) => part.trim().length > 8).length < 2
    return {
      ...row,
      reading: chipReadingOk(incoming.reading || '') ? incoming.reading : row.reading,
      note: keepCollector ? row.note : incomingNote,
      signal: row.id === 'support' ? 'good' : (incoming.signal ?? row.signal),
      ...(incoming.unit != null ? { unit: incoming.unit } : {}),
    }
  })
  const known = new Set(collector.map((row) => row.id))
  for (const incoming of edge) {
    if (known.has(incoming.id)) continue
    const note = (incoming.note ?? '').trim()
    if (note.length < CLARITY_NOTE_MIN) continue
    merged.push(
      incoming.id === 'support'
        ? { ...incoming, signal: 'good', reading: chipReadingOk(incoming.reading || '') ? incoming.reading : 'not observed' }
        : { ...incoming, reading: chipReadingOk(incoming.reading || '') ? incoming.reading : 'not observed' },
    )
  }
  return merged
}

function asFlags(raw: unknown): OverviewSignalFlag[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: OverviewSignalFlag[] = []
  for (const item of raw) {
    const r = rec(item)
    if (!r) continue
    const id = String(r.id ?? '').trim()
    const label = String(r.label ?? '').trim()
    const why = String(r.why ?? '').trim()
    const signal = r.signal === 'good' || r.signal === 'watch' || r.signal === 'bad' ? r.signal : 'watch'
    if (!id || !label) continue
    const refs = asEvidenceRefs(r.evidenceRefs)
    out.push({
      id,
      signal,
      label,
      why,
      ...(String(r.quote ?? '').trim() ? { quote: String(r.quote).trim() } : {}),
      ...(refs.length ? { evidenceRefs: refs } : {}),
    })
    if (out.length >= 8) break
  }
  return out.length ? out : undefined
}

function asFindings(raw: unknown): InterviewOutputMeta['clarityFindings'] {
  if (!Array.isArray(raw)) return undefined
  const out: NonNullable<InterviewOutputMeta['clarityFindings']> = []
  for (const item of raw) {
    const r = rec(item)
    if (!r) continue
    const sectionId = String(r.sectionId ?? '').trim()
    const body = String(r.body ?? '').trim()
    if (!sectionId || !body) continue
    const tags = asSittingTags(r.tags)
    const evidenceRefs = asEvidenceRefs(r.evidenceRefs)
    out.push({
      sectionId,
      body,
      ...(tags.length ? { tags } : {}),
      ...(evidenceRefs.length ? { evidenceRefs } : {}),
    })
  }
  return out.length ? out : undefined
}

function asIncidents(raw: unknown): InterviewOutputMeta['securityIncidents'] {
  if (!Array.isArray(raw)) return undefined
  const out: NonNullable<InterviewOutputMeta['securityIncidents']> = []
  for (const item of raw) {
    const r = rec(item)
    if (!r) continue
    const id = String(r.id ?? '').trim()
    const kind = String(r.kind ?? '').trim()
    const sectionId = String(r.sectionId ?? '').trim()
    const t = typeof r.t === 'number' && Number.isFinite(r.t) ? r.t : NaN
    if (!id || !kind || !sectionId || !Number.isFinite(t)) continue
    const pre = rec(r.pre)
    const post = rec(r.post)
    out.push({
      id,
      kind,
      sectionId,
      t,
      preMs: typeof r.preMs === 'number' ? r.preMs : 30_000,
      postMs: typeof r.postMs === 'number' ? r.postMs : 30_000,
      ...(pre?.body ? { pre: { body: String(pre.body) } } : {}),
      ...(post?.body ? { post: { body: String(post.body) } } : {}),
      ...(asSittingTags(r.tags).length ? { tags: asSittingTags(r.tags) } : {}),
      ...(asEvidenceRefs(r.evidenceRefs).length ? { evidenceRefs: asEvidenceRefs(r.evidenceRefs) } : {}),
    })
  }
  return out.length ? out : undefined
}

function phaseAtlas(
  atlas: SessionSignalAtlas,
  phaseId: string,
  extra?: { response: InterviewResponse; hostRef: string },
): Record<string, unknown> {
  const toolMarks: Array<{ templateId: string; status: string; quote: string }> = []
  const grains = extra?.hostRef ? extra.response.analysis.tools?.[extra.hostRef] : undefined
  for (const [templateId, grain] of Object.entries(grains ?? {})) {
    if (templateId.startsWith('sig.')) continue
    const quote = clip(String(rec(grain.result)?.boardSummary ?? grain.justification ?? ''), 120)
    if (!quote) continue
    toolMarks.push({ templateId, status: grain.status, quote })
  }
  return {
    schema: atlas.schema,
    leftover: atlas.leftover.filter((r) => r.phaseId === phaseId),
    pasteEvidence: atlas.pasteEvidence.filter((r) => r.phaseId === phaseId),
    assist: {
      applyCount: atlas.assist.applyCount,
      turns: atlas.assist.turns.filter((t) => t.phaseId === phaseId),
    },
    tapes: atlas.tapes.filter((t) => t.phaseId === phaseId),
    talk: atlas.talk.filter((t) => t.phaseId === phaseId),
    telemetry: atlas.telemetry,
    phases: atlas.phases.filter((p) => p.phaseId === phaseId),
    toolMarks: toolMarks.slice(0, 12),
    sessionSeries: {
      schema: atlas.sessionSeries.schema,
      byPhase: atlas.sessionSeries.byPhase.filter((p) => p.phaseId === phaseId),
      incidents: atlas.sessionSeries.incidents.filter((i) => i.sectionId === phaseId),
    },
    declaration: atlas.declaration,
    patterns: atlas.patterns,
  }
}

export async function fillHostClarity(input: {
  briefId: string
  brief: Creator2BriefDocument
  phaseId: string
  hostRef: string
  assess?: typeof runInterviewToolAssess
}): Promise<Record<string, AnalysisGrainStub>> {
  const response = getInterviewResponse(input.briefId)
  const atlas = compileSessionSignalAtlas({ brief: input.brief, response })
  const assess = input.assess ?? runInterviewToolAssess
  try {
    const result = await assess({
      body: {
        kind: 'session_clarity',
        briefId: input.briefId,
        hostRef: input.hostRef,
        grain: 'after_tool',
        atlas: phaseAtlas(atlas, input.phaseId, { response, hostRef: input.hostRef }),
      },
    })
    const incoming = result.grains[CLARITY_TEMPLATE_ID]
    if (incoming && incoming.status !== 'pending') {
      return { [CLARITY_TEMPLATE_ID]: { ...incoming, grain: 'after_tool', hostRef: input.hostRef } }
    }
  } catch {
    /* collector fallback */
  }
  const hosts: HostClarityRow[] = []
  const fallback = composeClarityGrain({ atlas, hosts, hostRef: input.hostRef })
  const seriesPhase = atlas.sessionSeries.byPhase.find((p) => p.phaseId === input.phaseId)
  const finding = collectorFindings(atlas).find((f) => f.sectionId === input.phaseId)
  return {
    [CLARITY_TEMPLATE_ID]: {
      ...fallback,
      hostRef: input.hostRef,
      grain: 'after_tool',
      result: {
        boardSummary: clip(finding?.body ?? cannedClarity(atlas), 220),
        boardSummaryDetail: finding?.body,
        tags: finding?.tags ?? [],
        unit: (() => {
          const row = atlas.phases.find((p) => p.phaseId === input.phaseId)
          if (!row?.matrix.length) return atlas.collectors.clarityUnit
          return clamp01(mean(row.matrix.map((m) => m.unit)))
        })(),
        sessionSeries: seriesPhase
          ? { schema: atlas.sessionSeries.schema, byPhase: [seriesPhase], incidents: [] }
          : atlas.sessionSeries,
      },
      justification: finding?.body ?? cannedClarity(atlas),
      evidenceRefs: finding?.evidenceRefs,
      status: 'filled',
    },
  }
}

export async function fillSessionSignals(input: {
  briefId: string
  brief: Creator2BriefDocument
  assess?: typeof runInterviewToolAssess
}): Promise<{ grains: Record<string, AnalysisGrainStub>; source: 'llm' | 'digest' }> {
  flushSessionTelemetry()
  const response = getInterviewResponse(input.briefId)
  const atlas = compileSessionSignalAtlas({ brief: input.brief, response })
  const hosts = collectHostClarityGrains({ brief: input.brief, response })
  const fallback = collectorSignalGrains({ atlas, hosts })
  const assess = input.assess ?? runInterviewToolAssess
  const grains: Record<string, AnalysisGrainStub> = { ...fallback }
  let usedLlm = false
  const filledHosts = hosts.filter((h) => h.grain.status === 'filled')
  if (!filledHosts.length) {
    try {
      const result = await assess({
        body: {
          kind: 'session_clarity',
          briefId: input.briefId,
          hostRef: SESSION_SIGNAL_HOST,
          grain: 'interview_end',
          atlas: {
            schema: atlas.schema,
            leftover: atlas.leftover,
            pasteEvidence: atlas.pasteEvidence,
            assist: atlas.assist,
            tapes: atlas.tapes,
            talk: atlas.talk,
            telemetry: atlas.telemetry,
            phases: atlas.phases,
            sessionSeries: atlas.sessionSeries,
            declaration: atlas.declaration,
            patterns: atlas.patterns,
          },
        },
      })
      const incoming = result.grains[CLARITY_TEMPLATE_ID]
      if (incoming && incoming.status === 'filled') {
        const composed = rec(grains[CLARITY_TEMPLATE_ID]?.result) ?? {}
        grains[CLARITY_TEMPLATE_ID] = {
          ...incoming,
          result: {
            ...composed,
            ...(rec(incoming.result) ?? {}),
            checks: mergeClarityChecks(
              asChecks(composed.checks) ?? clarityChecks(atlas),
              asChecks(rec(incoming.result)?.checks),
            ),
            sections: composed.sections ?? rec(incoming.result)?.sections,
            sessionSeries: atlas.sessionSeries,
            declaration: atlas.declaration,
            patterns: atlas.patterns,
            diagrams:
              asClarityDiagrams(rec(incoming.result)?.diagrams) ??
              asClarityDiagrams(composed.diagrams) ??
              cannedClarityDiagrams(atlas),
          },
        }
        usedLlm = true
      }
    } catch {
      /* collector compose */
    }
  }
  try {
    const result = await assess({
      body: {
        kind: 'session_security',
        briefId: input.briefId,
        hostRef: SESSION_SIGNAL_HOST,
        grain: 'interview_end',
        atlas: {
          schema: atlas.schema,
          leftover: atlas.leftover,
          pasteEvidence: atlas.pasteEvidence,
          assist: atlas.assist,
          tapes: atlas.tapes,
          talk: atlas.talk,
          telemetry: atlas.telemetry,
          phases: atlas.phases,
          sessionSeries: atlas.sessionSeries,
          incidents: atlas.sessionSeries.incidents,
        },
      },
    })
    const incoming = result.grains[SECURITY_TEMPLATE_ID]
    if (incoming && incoming.status !== 'pending') {
      const collector = rec(grains[SECURITY_TEMPLATE_ID]?.result) ?? {}
      const live = rec(incoming.result) ?? {}
      grains[SECURITY_TEMPLATE_ID] = {
        ...incoming,
        result: {
          ...collector,
          ...live,
          checks: live.checks ?? collector.checks,
          incidents: Array.isArray(live.incidents) && live.incidents.length
            ? live.incidents
            : collector.incidents,
          sessionSeries: atlas.sessionSeries,
          diagrams: asDiagrams(live.diagrams) ?? collector.diagrams ?? cannedDiagrams(atlas),
        },
      }
      if (incoming.status === 'filled') usedLlm = true
    }
  } catch {
    /* collector fallback */
  }
  mergeSessionSignals(getInterviewResponse(input.briefId), grains)
  const tel = loadSessionTelemetry(input.briefId)
  if (tel) {
    const doc = getInterviewResponse(input.briefId)
    saveInterviewResponse({
      ...doc,
      sessionTelemetry: sessionTelemetryIndexEntry(tel),
    })
  }
  return { grains, source: usedLlm ? 'llm' : 'digest' }
}

export function enqueueSessionSignals(input: {
  briefId: string
  brief: Creator2BriefDocument
  assess?: typeof runInterviewToolAssess
}): void {
  const gen = currentMarkGeneration()
  enqueueMarkJob(gen, async (signal) => {
    if (signal.aborted) return
    await fillSessionSignals({
      briefId: input.briefId,
      brief: input.brief,
      assess: input.assess,
    })
    assembleAttemptRollup({
      brief: input.brief,
      response: getInterviewResponse(input.briefId),
    })
  })
}

export function metaFromSessionSignals(
  doc: InterviewResponse,
  atlas?: SessionSignalAtlas | null,
): Pick<
  InterviewOutputMeta,
  | 'securityUnit'
  | 'securitySummary'
  | 'securityChecks'
  | 'securityCaptures'
  | 'securityIncidents'
  | 'securityFlags'
  | 'securityDiagrams'
  | 'clarityUnit'
  | 'claritySummary'
  | 'clarityChecks'
  | 'clarityFindings'
  | 'clarityFlags'
  | 'clarityDiagrams'
  | 'sessionSeries'
> {
  const clarity = doc.analysis.signals?.[CLARITY_TEMPLATE_ID]
  const security = doc.analysis.signals?.[SECURITY_TEMPLATE_ID]
  const cRes = rec(clarity?.result)
  const sRes = rec(security?.result)
  const clarityChecksLive = mergeClarityChecks(
    atlas ? clarityChecks(atlas) : [],
    asChecks(cRes?.checks),
  )
  const securityChecksLive = mergeSecurityChecks(atlas?.collectors.checks, asChecks(sRes?.checks))
  const series = (cRes?.sessionSeries ?? sRes?.sessionSeries ?? atlas?.sessionSeries) as
    | SessionSeries
    | undefined
  return {
    securityUnit:
      typeof sRes?.unit === 'number'
        ? sRes.unit
        : (atlas?.collectors.securityUnit ?? 0),
    securitySummary:
      String(sRes?.boardSummary ?? security?.justification ?? '').trim() || undefined,
    securityChecks: securityChecksLive,
    securityCaptures: atlas?.collectors.captures,
    securityIncidents: applyPasteBurstsToIncidents(
      asIncidents(sRes?.incidents) ?? atlas?.sessionSeries.incidents ?? [],
      pasteBurstsFromToolGrains(doc),
    ),
    securityFlags: asFlags(sRes?.flags),
    securityDiagrams:
      asDiagrams(sRes?.diagrams) ?? (atlas ? cannedDiagrams(atlas) : undefined),
    clarityUnit:
      typeof cRes?.unit === 'number'
        ? cRes.unit
        : (atlas?.collectors.clarityUnit ?? 0),
    claritySummary:
      String(cRes?.boardSummary ?? clarity?.justification ?? '').trim() || undefined,
    clarityChecks: clarityChecksLive.length ? clarityChecksLive : undefined,
    clarityFindings: asFindings(cRes?.sections),
    clarityFlags: asFlags(cRes?.flags),
    clarityDiagrams:
      asClarityDiagrams(cRes?.diagrams) ?? (atlas ? cannedClarityDiagrams(atlas) : undefined),
    sessionSeries: series ?? null,
  }
}
