/**
 * Next free-pass: stubs pending then returns without waiting for assess.
 * Leave-after-Start stubs the same pending grains without completing the phase.
 * Run: npx tsx front_end/src/lib/interviewRunApi/completeSection.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  writePendingAfterToolGrains,
  emptyInterviewResponse,
  getInterviewResponse,
  appendMarkTrace,
  failedMarkStages,
  skipPendingToolGrains,
  assembleAttemptRollup,
} from './interviewResponse.ts'
import {
  enqueueMarkJob,
  bumpMarkJobGeneration,
  currentMarkGeneration,
  awaitMarkJobs,
  markJobFailures,
  clearMarkJobFailures,
} from './markJobs.ts'
import { scheduleToolFinalTemplateIds, scheduleToolProcessTemplateIds } from './markSchedule.ts'
import { enqueueSectionMarks, watchdogShouldDefer } from './completeSection.ts'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => {
    store.set(k, String(v))
  },
  removeItem: (k) => {
    store.delete(k)
  },
}

globalThis.fetch = async () => {
  throw new Error('completeSection.unit: Edge is offline')
}

const doc = emptyInterviewResponse('fixture:complete')
const ids = scheduleToolFinalTemplateIds({ toolType: 'coding' })
assert.deepEqual(ids, [
  'mark.code.tests.v1',
  'mark.code.method.v1',
  'mark.code.structure.v1',
  'synth.tool.v1',
])
assert.ok(!ids.includes('mark.assist.use.v1'))
assert.ok(!scheduleToolProcessTemplateIds({ toolType: 'coding', assistChat: true }).includes('mark.assist.use.v1'))
assert.ok(!scheduleToolFinalTemplateIds({ toolType: 'coding', assistChat: true }).includes('mark.assist.use.v1'))
const next = writePendingAfterToolGrains(doc, { hostRef: 'tool.code', templateIds: ids })
assert.equal(next.analysis.tools['tool.code']['mark.code.tests.v1'].status, 'pending')

let finished = false
const gen = currentMarkGeneration()
const started = Date.now()
enqueueMarkJob(gen, async () => {
  await new Promise((r) => setTimeout(r, 80))
  finished = true
})
assert.ok(Date.now() - started < 50, 'enqueue must not await the job')
bumpMarkJobGeneration()
await new Promise((r) => setTimeout(r, 120))
assert.equal(finished, false)

{
  const briefId = 'fixture:leave-marks'
  getInterviewResponse(briefId)
  const brief = {
    phases: [{ id: 'ph.code', kind: 'tool', toolRef: 'tool.code' }],
    tools: { 'tool.code': { type: 'coding' } },
  }
  const landing = { sections: [] }
  await enqueueSectionMarks({
    briefId,
    landing,
    phaseId: 'ph.code',
    brief,
    stageStarted: true,
    isTalk: false,
  })
  const left = getInterviewResponse(briefId)
  assert.equal(left.completedPhaseIds.includes('ph.code'), false)
  assert.equal(left.analysis.tools['tool.code']['mark.code.tests.v1'].status, 'pending')
  assert.equal(left.analysis.tools['tool.code']['synth.tool.v1'].status, 'pending')
  bumpMarkJobGeneration()
}

// ── Step 1 gate: a failing stage names itself in the persisted trace ──────────────
{
  const briefId = 'fixture:mark-trace'
  const doc0 = getInterviewResponse(briefId)
  const traced = appendMarkTrace(doc0, {
    hostRef: 'tool.code',
    kind: 'coding_bundle',
    phaseId: 'ph.code',
    source: 'edge',
    totalMs: 1234,
    model: 'gpt-4.1',
    stages: [
      { stage: 'mark.code.tests.v1', status: 'ok', ms: 3 },
      { stage: 'mark.code.method.v1', status: 'failed', ms: 900, error: 'llm_timeout' },
      { stage: 'synth.tool.v1', status: 'skipped', ms: 0 },
    ],
  })
  assert.equal(traced.analysis.markTrace.length, 1, 'trace row persisted')
  assert.equal(
    getInterviewResponse(briefId).analysis.markTrace[0].stages.length,
    3,
    'trace survives a reload — console-only diagnostics cannot answer "which stage, hours ago?"',
  )

  const failed = failedMarkStages(getInterviewResponse(briefId))
  assert.deepEqual(
    failed.map((f) => `${f.stage}:${f.status}`),
    ['synth.tool.v1:skipped', 'mark.code.method.v1:failed'],
    'non-ok stages surface newest-first, ok stages stay out',
  )
  assert.equal(failed.find((f) => f.status === 'failed').error, 'llm_timeout')
}

// Negative case: without the append the trace stays empty, so the gate can fail.
{
  const briefId = 'fixture:mark-trace-empty'
  assert.deepEqual(getInterviewResponse(briefId).analysis.markTrace, [])
  assert.deepEqual(failedMarkStages(getInterviewResponse(briefId)), [])
}

// ── Scoped settle: one job must not strand the stages queued behind it ────────────
{
  const briefId = 'fixture:scoped-settle'
  let doc = getInterviewResponse(briefId)
  doc = writePendingAfterToolGrains(doc, {
    hostRef: 'tool.code',
    templateIds: ['mark.code.tests.v1', 'mark.code.method.v1', 'sig.clarity.v1'],
  })
  const after = skipPendingToolGrains(doc, 'tool.code', 'method failed', [
    'mark.code.method.v1',
  ])
  const row = after.analysis.tools['tool.code']
  assert.equal(row['mark.code.method.v1'].status, 'skipped', 'owned id settles')
  assert.equal(
    row['sig.clarity.v1'].status,
    'pending',
    'a later job keeps its pending grain — the mark chain is serial',
  )
  assert.equal(row['mark.code.tests.v1'].status, 'pending')
}

// ── Step 2 gate: a throwing assessTool leaves no pending grains ───────────────────
{
  const briefId = 'fixture:mark-failure'
  getInterviewResponse(briefId)
  const brief = {
    phases: [{ id: 'ph.code', kind: 'tool', toolRef: 'tool.code' }],
    tools: { 'tool.code': { type: 'coding' } },
  }
  clearMarkJobFailures()
  await enqueueSectionMarks({
    briefId,
    landing: { sections: [] },
    phaseId: 'ph.code',
    brief,
    stageStarted: true,
    isTalk: false,
    assessTool: async () => {
      throw new Error('boom_method_stage')
    },
    assess: async () => {
      throw new Error('boom_edge_assess')
    },
  })
  await awaitMarkJobs(8000)

  const done = getInterviewResponse(briefId)
  const pending = Object.entries(done.analysis.tools['tool.code'] ?? {})
    .filter(([, g]) => g.status === 'pending')
    .map(([id]) => id)
  assert.deepEqual(
    pending,
    [],
    `a throwing assessTool must settle its grains, not strand them: ${pending.join(', ')}`,
  )

  const trace = done.analysis.markTrace ?? []
  assert.ok(
    trace.some((r) => String(r.failed ?? '').includes('boom_method_stage')),
    `trace must name the failure, got ${JSON.stringify(trace.map((r) => r.failed))}`,
  )
  const methodSkip = done.analysis.tools['tool.code']['mark.code.method.v1']
  assert.equal(methodSkip.status, 'skipped')
  assert.match(
    methodSkip.justification,
    /boom_method_stage/,
    'the skip reason carries the real error, not a generic drain string',
  )
  // ── Step 3 gate: a job that throws still yields a settled rollup ────────────────
  // The old guard drained only when `markJobsInflightCount() === 0`, which is never
  // true inside a mark job — so an in-job rollup could not settle and the attempt
  // stayed stuck partial forever.
  const rollup = done.analysis.rollup
  assert.ok(rollup, 'a failed section still produces a rollup')
  assert.equal(rollup.status, 'filled')
  const anyPending = Object.values(done.analysis.tools ?? {}).some((row) =>
    Object.values(row).some((g) => g.status === 'pending'),
  )
  assert.equal(anyPending, false, 'nothing is left pending once the chain drains')

  assert.ok(
    markJobFailures().some((f) => f.error.includes('boom_method_stage')) ||
      trace.some((r) => String(r.failed ?? '').includes('boom_method_stage')),
    'the failure is recorded somewhere durable, not swallowed',
  )
  bumpMarkJobGeneration()
}

// Negative case for the settle mode: `never` must leave pending grains alone.
{
  const briefId = 'fixture:settle-never'
  let doc = getInterviewResponse(briefId)
  doc = writePendingAfterToolGrains(doc, {
    hostRef: 'tool.code',
    templateIds: ['mark.code.tests.v1'],
  })
  const brief = {
    phases: [{ id: 'ph.code', kind: 'tool', toolRef: 'tool.code' }],
    tools: { 'tool.code': { type: 'coding' } },
  }
  const kept = assembleAttemptRollup({ brief, response: doc, settleStranded: 'never' })
  assert.equal(
    kept.analysis.tools['tool.code']['mark.code.tests.v1'].status,
    'pending',
    'never must not settle a peer job\'s grain',
  )
  const settled = assembleAttemptRollup({
    brief,
    response: getInterviewResponse(briefId),
    settleStranded: 'always',
  })
  assert.equal(
    settled.analysis.tools['tool.code']['mark.code.tests.v1'].status,
    'skipped',
    'always settles regardless of in-flight count',
  )
}

// ── Step 4 gate: a never-settling after_turn returns within budget ───────────────
// Last: the never-settling promise it plants stays in the in-flight set, so any
// mark job after it would burn the full wait budget.
{
  const { awaitInFlightAfterTurns, trackAfterTurnWork } = await import('./discussionRunner.ts')

  assert.equal(await awaitInFlightAfterTurns(), 'settled', 'nothing in flight settles at once')

  // A promise that never resolves: with the old unbounded `while` loop this parked
  // every queued mark job forever, with no error and no trace.
  trackAfterTurnWork(new Promise(() => {}))
  const started = Date.now()
  const outcome = await awaitInFlightAfterTurns({ timeoutMs: 120 })
  const elapsed = Date.now() - started
  assert.equal(outcome, 'timeout', 'a never-settling after_turn must time out, not hang')
  assert.ok(elapsed < 2000, `must return within budget, took ${elapsed}ms`)

  const ac = new AbortController()
  ac.abort()
  assert.equal(
    await awaitInFlightAfterTurns({ signal: ac.signal, timeoutMs: 5000 }),
    'aborted',
    'an aborted job stops waiting immediately',
  )
}

{
  assert.equal(
    watchdogShouldDefer(1),
    true,
    'inflight jobs must defer the skip-pending drain',
  )
  assert.equal(watchdogShouldDefer(0), false, 'negative: idle watchdog may settle')
}

console.log('completeSection.unit.mjs: ok')
