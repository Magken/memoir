/**
 * Clarity sitting patterns — observational, never diagnostic, never extra time.
 * Run: npx tsx front_end/src/lib/interviewRunApi/clarityPatterns.unit.mjs
 */
import assert from 'node:assert/strict'
import { compileClarityPatterns } from './clarityPatterns.ts'
import { CHIP_SLANG } from './reportDialect.ts'

const brief = {
  phases: [
    { id: 'ph.talk', kind: 'discussion', topicId: 'topic.a', title: 'Opening' },
    { id: 'ph.code', kind: 'tool', toolRef: 'tool.code', title: 'Coding' },
    { id: 'ph.write', kind: 'tool', toolRef: 'tool.doc', title: 'Writing' },
  ],
  tools: {
    'tool.code': { type: 'coding', title: 'Coding', timing: { mode: 'timed', limitMinutes: 20 } },
    'tool.doc': { type: 'doc', title: 'Writing', timing: { mode: 'untimed' } },
  },
  topicLibrary: [{ id: 'topic.a', label: 'Opening' }],
}

function phase(partial) {
  return {
    durationMs: 50_000,
    cadence: { tickCount: 10, medianGapMs: 400, p95GapMs: 1200, buckets: [] },
    talk: { sendCount: 4, gapsMs: [], medianGapMs: 800, sendsAt: [] },
    dwell: { inEditorMs: 0, inTalkMs: 0, visibleMs: 0, leaves: [] },
    dictation: { sessions: [], totalMs: 0 },
    events: [],
    ...partial,
  }
}

const series = {
  schema: 'vurify/session-series.v1',
  byPhase: [
    phase({
      phaseId: 'ph.talk',
      title: 'Opening',
      kind: 'talk',
      dwell: { inEditorMs: 0, inTalkMs: 8_000, visibleMs: 10_000, leaves: [] },
      talk: { sendCount: 5, gapsMs: [12_000, 9_000, 40_000], medianGapMs: 12_000, sendsAt: [1, 2, 3, 4, 5] },
    }),
    phase({
      phaseId: 'ph.code',
      title: 'Coding',
      kind: 'coding',
      durationMs: 40_000,
      dwell: { inEditorMs: 30_000, inTalkMs: 0, visibleMs: 32_000, leaves: [] },
      cadence: {
        tickCount: 40,
        medianGapMs: 300,
        p95GapMs: 900,
        buckets: [
          { t0: 0, t1: 16_000, tickCount: 4, medianGapMs: 400, idleMs: 8_000 },
          { t0: 16_000, t1: 32_000, tickCount: 4, medianGapMs: 400, idleMs: 4_000 },
          { t0: 32_000, t1: 40_000, tickCount: 20, medianGapMs: 200, idleMs: 500 },
        ],
      },
      events: [
        { t: 12_000, kind: 'idle' },
        { t: 18_000, kind: 'run' },
        { t: 36_000, kind: 'paste' },
      ],
    }),
    phase({
      phaseId: 'ph.write',
      title: 'Writing',
      kind: 'doc',
      dwell: { inEditorMs: 4_000, inTalkMs: 0, visibleMs: 5_000, leaves: [] },
      dictation: {
        sessions: [{ tStart: 0, tEnd: 25_000, durationMs: 25_000 }],
        totalMs: 25_000,
      },
    }),
  ],
  incidents: [],
}

const telemetry = {
  visibleMs: 47_000,
  inEditorMs: 34_000,
  inTalkMs: 8_000,
  inWorkMs: 42_000,
  dwellRatio: 0.89,
  offlineMs: 0,
  reconnectCount: 0,
  eventCount: 4,
  trailCount: 12,
  typedWpm: null,
  typedWords: 2,
  sampleCount: 1,
}

const none = compileClarityPatterns({
  brief,
  series,
  telemetry,
  declaration: { empty: true, preferNotToSay: false, labels: [], helps: [] },
  leftover: [
    { phaseId: 'ph.code', status: 'filled' },
    { phaseId: 'ph.write', status: 'skipped' },
  ],
  tapes: [
    { phaseId: 'ph.code', hopCount: 5, pasteCount: 1, applyCount: 0, runCount: 2, idleMs: 12_000, activeMs: 20_000, durationMs: 40_000 },
  ],
  talk: [{ phaseId: 'ph.talk', candidateTurns: 5, topicJumps: 1, medianGapMs: 12_000 }],
  completedPhaseIds: ['ph.talk', 'ph.code'],
  skippedPhaseIds: ['ph.write'],
  assistApplyCount: 0,
  assistTurnCount: 2,
})
assert.ok(none.length >= 18)
assert.equal(none.find((r) => r.id === 'support')?.reading, 'not observed')
assert.ok(!/they have adhd/i.test(JSON.stringify(none)))
assert.match(String(none.find((r) => r.id === 'task_split')?.reading), /Coding/)
assert.equal(none.find((r) => r.id === 'time_pressure')?.reading, 'late surge')
assert.match(String(none.find((r) => r.id === 'time_pressure')?.note), /Do not add minutes/)
assert.ok(!/extra time/i.test(none.find((r) => r.id === 'time_pressure')?.note ?? ''))
assert.ok(!/Soft Decision penalty/i.test(JSON.stringify(none)))
assert.equal(none.find((r) => r.id === 'pace_split')?.reading, 'mostly spoken')
assert.equal(none.find((r) => r.id === 'burst_idle')?.reading, 'bursts then pauses')
assert.equal(none.find((r) => r.id === 'channel_by_stage')?.reading, 'speech and typing split')
assert.equal(none.find((r) => r.id === 'talk_gaps')?.reading, 'long pause')
assert.match(String(none.find((r) => r.id === 'follow_thin')?.reading), /forfeit|thin leftover|still open/)
assert.match(String(none.find((r) => r.id === 'file_hops')?.reading), /\d+ files/)
assert.ok(!CHIP_SLANG.has(String(none.find((r) => r.id === 'file_hops')?.reading)))
for (const row of none) {
  assert.ok(!CHIP_SLANG.has(String(row.reading).toLowerCase()), row.id)
  assert.ok(!/dwellRatio|copy_route|ip_change|gate_only/.test(row.reading), row.id)
}
assert.ok(!/diagnos/i.test(none.find((r) => r.id === 'time_pressure')?.note ?? ''))

const declared = compileClarityPatterns({
  brief,
  series,
  telemetry: { ...telemetry, typedWords: 40, typedWpm: 38 },
  declaration: {
    empty: false,
    preferNotToSay: false,
    labels: ['ADHD (self-report)'],
    helps: ['Self-report: timed work can bunch at the end'],
    notes: 'Timers make me dump everything at the end.',
  },
})
assert.equal(declared.find((r) => r.id === 'support')?.reading, 'on file')
assert.match(String(declared.find((r) => r.id === 'support')?.note), /ADHD \(self-report\)/)
assert.match(String(declared.find((r) => r.id === 'support')?.note), /does not add minutes/)
assert.match(String(declared.find((r) => r.id === 'support')?.note), /not as a diagnosis|Do not diagnose/i)
assert.equal(declared.find((r) => r.id === 'pace_split')?.reading, 'spoken and typed')

const slow = compileClarityPatterns({
  brief,
  series: {
    ...series,
    byPhase: series.byPhase.map((p) =>
      p.phaseId === 'ph.code'
        ? {
            ...p,
            cadence: {
              ...p.cadence,
              buckets: [
                { t0: 0, t1: 12_000, tickCount: 0, medianGapMs: 0, idleMs: 12_000 },
                { t0: 12_000, t1: 40_000, tickCount: 20, medianGapMs: 300, idleMs: 2_000 },
              ],
            },
          }
        : p,
    ),
  },
  telemetry,
  declaration: { empty: true, preferNotToSay: false, labels: [], helps: [] },
})
assert.equal(slow.find((r) => r.id === 'start_latency')?.reading, 'slow start')

{
  const botOnly = compileClarityPatterns({
    brief,
    series: {
      ...series,
      byPhase: series.byPhase.map((p) =>
        p.phaseId === 'ph.code'
          ? { ...p, events: [{ t: 12_000, kind: 'apply', quote: 'bot_edit' }] }
          : p,
      ),
    },
    telemetry,
    declaration: { empty: true, preferNotToSay: false, labels: [], helps: [] },
    leftover: [{ phaseId: 'ph.code', status: 'filled' }],
    tapes: [
      { phaseId: 'ph.code', hopCount: 1, pasteCount: 0, applyCount: 1, runCount: 0, idleMs: 0, activeMs: 20_000, durationMs: 20_000 },
    ],
    talk: [],
    completedPhaseIds: ['ph.code'],
    skippedPhaseIds: [],
    assistApplyCount: 1,
    assistTurnCount: 1,
  })
  assert.equal(botOnly.find((r) => r.id === 'paste_edit')?.reading, 'no paste')
  assert.ok(!/they pasted/i.test(botOnly.find((r) => r.id === 'paste_edit')?.note ?? ''))
}

console.log('clarityPatterns.unit.mjs: ok')
