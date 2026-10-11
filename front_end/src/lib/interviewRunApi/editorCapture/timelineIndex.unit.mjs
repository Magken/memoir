/**
 * Derived timeline index — idle split, cap 12, message join, no file bodies.
 * Run: npx tsx front_end/src/lib/interviewRunApi/editorCapture/timelineIndex.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  TIMELINE_MAX_BUCKETS,
  buildTimelineIndex,
  nextHistoryPlayStep,
} from './timelineIndex.ts'

function tape(events, extra = {}) {
  return {
    schema: 'vurify/editor-tape',
    schemaVersion: 1,
    briefId: 'b',
    attemptId: 'a',
    phaseId: 'ph.code',
    kind: 'coding',
    startedAt: '2026-08-21T00:00:00.000Z',
    endedAt: '2026-08-21T00:05:00.000Z',
    durationMs: extra.durationMs ?? 60_000,
    truncated: extra.truncated ?? false,
    initial: { files: [{ path: 'src/solve.ts', content: 'SECRET_BODY' }] },
    final: { files: [{ path: 'src/solve.ts', content: 'SECRET_BODY' }] },
    events,
    ...extra,
  }
}

const idleSplit = buildTimelineIndex({
  tape: tape([
    { t: 1_000, type: 'action', action: 'open_file', detail: { path: 'src/solve.ts' } },
    { t: 1_400, type: 'action', action: 'run' },
    { t: 20_000, type: 'action', action: 'paste', detail: { path: 'src/solve.ts' } },
    { t: 20_400, type: 'action', action: 'run' },
  ]),
})
assert.ok(idleSplit.buckets.some((b) => b.kind === 'idle'))
assert.ok(idleSplit.buckets.some((b) => b.kind === 'active'))
assert.ok(idleSplit.tags.some((t) => t.action === 'run'))
assert.ok(!JSON.stringify(idleSplit.atlas).includes('SECRET_BODY'))
assert.ok(idleSplit.atlas.buckets.some((b) => b.filesTouched.includes('src/solve.ts')))
assert.equal(
  idleSplit.atlas.buckets.some((b) => b.filesTouched.some((p) => p.includes('cases.json'))),
  false,
)

const many = []
for (let i = 0; i < 20; i += 1) {
  many.push({ t: i * 10_000, type: 'action', action: 'run' })
}
const capped = buildTimelineIndex({ tape: tape(many, { durationMs: 200_000 }) })
assert.ok(capped.buckets.length <= TIMELINE_MAX_BUCKETS)

const truncated = buildTimelineIndex({
  tape: tape(
    [
      { t: 12_345, type: 'action', action: 'run' },
      { t: 12_900, type: 'action', action: 'paste', detail: { path: 'src/solve.ts' } },
    ],
    { truncated: true, durationMs: 12_900 },
  ),
})
assert.equal(truncated.truncated, true)
assert.ok(truncated.tags.some((t) => t.t === 12_345))
assert.ok(truncated.atlas.truncated)

const applyJoin = buildTimelineIndex({
  tape: tape([
    {
      t: 4_000,
      type: 'action',
      action: 'copilot_apply',
      detail: { messageId: 'msg.apply', files: ['src/solve.ts'] },
    },
  ]),
  phaseId: 'ph.code',
  messages: [
    {
      id: 'msg.apply',
      phaseId: 'ph.code',
      topicId: null,
      role: 'assistant',
      kind: 'assist',
      text: 'Applied parse helper',
      at: '2026-08-21T00:00:04.000Z',
      probeId: null,
      compose: { situation: 'applied', missingGaps: [], sampleIdsUsed: [], model: 'x' },
    },
  ],
})
assert.ok(applyJoin.tags.some((t) => t.kind === 'applied' && t.messageId === 'msg.apply'))
assert.equal(applyJoin.tags.filter((t) => t.messageId === 'msg.apply').length, 1)

const msgJoin = buildTimelineIndex({
  tape: tape([{ t: 2_000, type: 'action', action: 'open_file', detail: { path: 'src/solve.ts' } }]),
  phaseId: 'ph.code',
  messages: [
    {
      id: 'msg.ask',
      phaseId: 'ph.code',
      topicId: null,
      role: 'candidate',
      kind: 'answer',
      text: 'Can you rename the helper?',
      at: '2026-08-21T00:00:02.500Z',
      probeId: null,
    },
    {
      id: 'msg.other',
      phaseId: 'ph.essay',
      topicId: null,
      role: 'candidate',
      kind: 'answer',
      text: 'wrong phase',
      at: '2026-08-21T00:00:02.500Z',
      probeId: null,
    },
  ],
})
assert.ok(msgJoin.tags.some((t) => t.messageId === 'msg.ask' && t.label === 'You'))
assert.equal(msgJoin.tags.some((t) => t.messageId === 'msg.other'), false)
const askBucket = msgJoin.buckets.find((b) => b.messageIds.includes('msg.ask'))
assert.ok(askBucket)
assert.ok(msgJoin.atlas.buckets.some((b) => b.messages.some((m) => m.id === 'msg.ask')))

const secretFile = buildTimelineIndex({
  tape: tape([
    { t: 500, type: 'action', action: 'open_file', detail: { path: 'tests/cases.json' } },
    { t: 800, type: 'action', action: 'open_file', detail: { path: 'src/solve.ts' } },
  ]),
})
assert.ok(!secretFile.atlas.buckets.some((b) => b.filesTouched.some((p) => p.includes('cases.json'))))
assert.ok(!JSON.stringify(secretFile.atlas).includes('answerKey'))

const play = buildTimelineIndex({
  tape: tape([
    { t: 500, type: 'action', action: 'run' },
    { t: 20_000, type: 'action', action: 'paste' },
  ]),
})
const idle = play.buckets.find((b) => b.kind === 'idle')
assert.ok(idle)
const stepped = nextHistoryPlayStep(play, idle.startMs - 1)
if (stepped != null) {
  const landed = play.buckets.find((b) => stepped >= b.startMs && stepped <= b.endMs)
  assert.notEqual(landed?.kind, 'idle')
}

console.log('timelineIndex.unit.mjs: ok')
