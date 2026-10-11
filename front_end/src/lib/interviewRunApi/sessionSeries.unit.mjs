/**
 * Shared session clocks — cadence vs dictation stay separate.
 * Run: npx tsx front_end/src/lib/interviewRunApi/sessionSeries.unit.mjs
 */
import assert from 'node:assert/strict'
import { detectIncidents, sliceSeries, compileSessionSeries } from './sessionSeries.ts'
import { countTypedCommitForTests } from './sessionTelemetry/typing.ts'
import { emptyInterviewResponse } from './interviewResponse.ts'

const phase = {
  phaseId: 'ph.code',
  title: 'Coding',
  kind: 'coding',
  durationMs: 40000,
  cadence: {
    tickCount: 10,
    medianGapMs: 1200,
    p95GapMs: 4000,
    buckets: [
      { t0: 0, t1: 10000, tickCount: 6, medianGapMs: 1100, idleMs: 2000 },
      { t0: 10000, t1: 20000, tickCount: 1, medianGapMs: 4000, idleMs: 8000 },
      { t0: 20000, t1: 40000, tickCount: 3, medianGapMs: 900, idleMs: 1000 },
    ],
  },
  talk: { sendCount: 0, gapsMs: [], medianGapMs: 0, sendsAt: [] },
  dwell: { inEditorMs: 28000, inTalkMs: 0, visibleMs: 32000, leaves: [] },
  dictation: {
    sessions: [{ tStart: 25000, tEnd: 28000, durationMs: 3000, charCount: 40, surface: 'assist' }],
    totalMs: 3000,
  },
  events: [
    { t: 20000, kind: 'paste', quote: 'paste' },
    { t: 21000, kind: 'paste_route', quote: 'external:editor->editor' },
    { t: 22000, kind: 'run', quote: 'run' },
    { t: 25000, kind: 'dictation_start' },
    { t: 28000, kind: 'dictation_stop' },
    { t: 5000, kind: 'leave', quote: 'hidden' },
    { t: 8000, kind: 'offline' },
    { t: 9000, kind: 'online' },
    { t: 12000, kind: 'ip_change', quote: 'ip changed' },
    { t: 15000, kind: 'fullscreen_exit', quote: 'esc' },
    { t: 16000, kind: 'devtools', quote: 'Ctrl+Shift+I' },
    { t: 17000, kind: 'shortcut', quote: 'Ctrl+U' },
    { t: 18000, kind: 'copy_route', quote: 'editor|12 · Ctrl+C' },
    { t: 19000, kind: 'paste_route', quote: 'internal:chat->editor' },
    { t: 19500, kind: 'apply', quote: 'bot_edit' },
  ],
}

const slice = sliceSeries(phase, 20000)
assert.ok(slice.pre.tickCount >= 1)
assert.equal(slice.post.pasteCount, 2)
assert.equal(slice.post.sendCount, 0)
assert.ok(slice.post.dictationMs >= 0)

const incidents = detectIncidents([phase])
assert.ok(incidents.some((row) => row.kind === 'paste' && row.pre?.body && row.post?.body))
assert.ok(incidents.some((row) => row.kind === 'leave'))
assert.ok(incidents.some((row) => row.kind === 'reconnect'))
assert.ok(incidents.some((row) => row.kind === 'dictation'))
assert.ok(incidents.some((row) => row.kind === 'ip_change'))
assert.ok(incidents.some((row) => row.kind === 'fullscreen_exit'))
assert.ok(incidents.some((row) => row.kind === 'devtools'))
assert.ok(incidents.some((row) => row.kind === 'shortcut'))
assert.ok(incidents.some((row) => row.kind === 'copy_route'))
assert.ok(incidents.some((row) => row.kind === 'apply'))
assert.ok(incidents.some((row) => row.kind === 'paste_internal'))
assert.ok(
  !incidents.some((row) => row.kind === 'paste' && row.evidenceRefs?.[0]?.quote === 'bot_edit'),
  'negative: a bot edit is not a paste incident',
)
assert.ok(incidents.every((row) => (row.evidenceRefs ?? []).length >= 1))
const pasteIncident = incidents.find((row) => row.kind === 'paste')
assert.ok(pasteIncident?.pre?.body)
assert.match(pasteIncident.pre.body, /30 seconds/)
assert.ok(!/two minutes/i.test(pasteIncident.pre.body))

{
  const rich = detectIncidents([
    {
      ...phase,
      events: [
        {
          t: 20000,
          kind: 'paste',
          quote: 'external | whole-file | src/solve.ts | export function parseAndSum(lines) {',
        },
        { t: 22000, kind: 'run', quote: 'run' },
      ],
    },
  ])
  const hit = rich.find((row) => row.kind === 'paste')
  assert.match(hit?.pre?.body ?? '', /Coding/)
  assert.match(hit?.pre?.body ?? '', /parseAndSum/)
  assert.match(hit?.post?.body ?? '', /ran tests/)
  assert.ok(!/clipboard/i.test(JSON.stringify(hit)), 'negative: incident must not dump clipboard text')
}

const commit = countTypedCommitForTests('hello world ')
assert.equal(commit.words, 2)
assert.equal(commit.pending, '')

const speakOnly = {
  ...phase,
  phaseId: 'ph.talk',
  events: [
    { t: 1000, kind: 'dictation_start' },
    { t: 4000, kind: 'dictation_stop' },
  ],
}
assert.ok(!detectIncidents([speakOnly]).some((row) => row.kind === 'dictation'))

{
  const startedAt = '2026-09-04T12:00:00.000Z'
  const brief = {
    phases: [{ id: 'ph.code', kind: 'tool', toolRef: 'tool.code', title: 'Coding' }],
    tools: { 'tool.code': { type: 'coding', title: 'Coding' } },
  }
  const tape = {
    schema: 'vurify/editor-tape',
    schemaVersion: 1,
    briefId: 'fixture:series-insert',
    attemptId: 'a',
    phaseId: 'ph.code',
    kind: 'coding',
    startedAt,
    endedAt: null,
    durationMs: 20000,
    initial: {},
    events: [
      { t: 12000, type: 'action', action: 'copilot_apply', detail: { files: 1 } },
      { t: 12120, type: 'action', action: 'paste', detail: { path: 'src/solve.ts', chars: 80 } },
    ],
    final: {},
  }
  const compiled = compileSessionSeries({
    brief,
    response: { ...emptyInterviewResponse('fixture:series-insert'), startedAt },
    telemetry: null,
    tapes: { schema: 'vurify/editor-tapes', schemaVersion: 1, byKind: {}, byPhaseId: { 'ph.code': tape } },
  })
  const events = compiled.byPhase[0]?.events ?? []
  assert.ok(events.some((row) => row.kind === 'apply'))
  assert.ok(
    !events.some((row) => row.kind === 'paste' || row.kind === 'paste_route'),
    'negative: compile must not keep an inferred paste next to a bot edit',
  )
  const incidents = detectIncidents(compiled.byPhase)
  assert.ok(incidents.some((row) => row.kind === 'apply'))
  assert.ok(
    !incidents.some((row) => row.kind === 'paste' || row.kind === 'paste_internal'),
    'negative: a compiled bot edit must not become a paste incident',
  )
}

{
  const startedAt = '2026-09-04T12:00:00.000Z'
  const brief = {
    phases: [{ id: 'ph.code', kind: 'tool', toolRef: 'tool.code', title: 'Coding' }],
    tools: { 'tool.code': { type: 'coding', title: 'Coding' } },
  }
  const tape = {
    schema: 'vurify/editor-tape',
    schemaVersion: 1,
    briefId: 'fixture:series-insert',
    attemptId: 'a',
    phaseId: 'ph.code',
    kind: 'coding',
    startedAt,
    endedAt: null,
    durationMs: 20000,
    initial: {},
    events: [
      {
        t: 8000,
        type: 'action',
        action: 'paste_route',
        detail: { from: 'internal', srcSurface: 'chat', destSurface: 'editor' },
      },
    ],
    final: {},
  }
  const compiled = compileSessionSeries({
    brief,
    response: { ...emptyInterviewResponse('fixture:series-insert'), startedAt },
    telemetry: {
      startedAt,
      events: [{ t: 8100, phaseId: 'ph.code', kind: 'paste_route', note: 'internal:chat->editor' }],
    },
    tapes: { schema: 'vurify/editor-tapes', schemaVersion: 1, byKind: {}, byPhaseId: { 'ph.code': tape } },
  })
  const routes = (compiled.byPhase[0]?.events ?? []).filter((row) => row.kind === 'paste_route')
  assert.equal(routes.length, 1, `got ${routes.length} paste_route events`)
  const incidents = detectIncidents(compiled.byPhase)
  assert.equal(
    incidents.filter((row) => row.kind === 'paste_internal').length,
    1,
    'negative: tape + telemetry of the same in-app paste is one incident',
  )
}

console.log('sessionSeries.unit.mjs: ok')
