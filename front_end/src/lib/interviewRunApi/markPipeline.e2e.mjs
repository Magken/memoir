/**
 * Offline end-to-end marking run: one brief with talk, coding, doc, and form stages,
 * two candidates of different effort, and a scripted assessor. No Edge, no API key.
 *
 * This is the gate the rewrite exists for. Every earlier unit checks one seam; this one
 * runs the real chain - stub pending grains, enqueue the mark jobs, merge what comes
 * back, settle what does not, roll up, score - and then asks the only question that
 * matters to a candidate: given the same brief, does effort beat absence?
 *
 * It used to not. The denominator was whatever the candidate produced, so forfeiting a
 * stage removed it from the weights instead of scoring it zero, and a sparse attempt
 * with two polished sections outranked a thorough attempt that tried everything and did
 * middling work. Anything that reintroduces a renormalising denominator, or lets a stage
 * disappear rather than score, fails here.
 *
 * Run: npx tsx front_end/src/lib/interviewRunApi/markPipeline.e2e.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  appendResponseMessage,
  emptyInterviewResponse,
  getInterviewResponse,
  clearInterviewResponse,
  mergeFilledAfterTurnGrains,
  mergeFilledTopicEnd,
  syncResponseProgress,
} from './interviewResponse.ts'
import { awaitMarkJobs, bumpMarkJobGeneration, clearMarkJobFailures } from './markJobs.ts'
import { enqueueSectionMarks } from './completeSection.ts'
import { scoreAttempt } from './scoreAttempt.ts'

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
  throw new Error('markPipeline.e2e: no network in the offline gate')
}

// ── the brief ────────────────────────────────────────────────────────────────────────
const BRIEF = {
  topicLibrary: [{ id: 'topic.a', targets: [{ key: 'incident' }, { key: 'outcome' }] }],
  phases: [
    { id: 'ph.talk', kind: 'discussion', topicId: 'topic.a', title: 'Opening' },
    { id: 'ph.code', kind: 'tool', toolRef: 'tool.code', title: 'Coding' },
    { id: 'ph.doc', kind: 'tool', toolRef: 'tool.doc', title: 'Memo' },
    { id: 'ph.form', kind: 'tool', toolRef: 'tool.form', title: 'Screening' },
  ],
  tools: {
    'tool.code': { type: 'coding' },
    'tool.doc': { type: 'doc' },
    'tool.form': { type: 'form_quiz' },
  },
  analysis: {
    rollup: {
      weights: {
        interviewDelivery: 0.2,
        interviewContent: 0.2,
        codingTests: 0.2,
        codingMethod: 0.2,
        essay: 0.2,
      },
      weightSections: {
        interviewDelivery: ['ph.talk'],
        interviewContent: ['ph.talk'],
        codingTests: ['ph.code'],
        codingMethod: ['ph.code'],
        essay: ['ph.doc'],
      },
    },
  },
}

/** The form stage is a gate, not a weighted bucket — see `expectedSoftBuckets`. */
const WEIGHTED_BUCKETS = ['interviewDelivery', 'interviewContent', 'codingTests', 'codingMethod', 'essay']

const grain = (templateId, hostRef, over = {}) => ({
  templateId,
  hostRef,
  grain: 'after_tool',
  order: 1,
  status: 'filled',
  confidence: 'high',
  ...over,
})

const talkGrain = (templateId, topicId, unit, keys) => ({
  templateId,
  hostRef: topicId,
  grain: 'topic_end',
  order: 1,
  status: 'filled',
  confidence: 'high',
  result: { composite: unit },
  dimensions: keys.map((key) => ({ key, label: key, score: ordinal(unit) })),
})

const ordinal = (unit) => (unit >= 0.9 ? 'strong' : unit <= 0.1 ? 'weak' : 'mixed')

const methodDims = (unit) =>
  ['approach', 'clarity', 'complexity'].map((key) => ({
    key,
    label: key,
    score: ordinal(unit),
  }))

/** Scripted assessor for one tool stage. `unit` is 0..1 of the deterministic max. */
function scriptedTool(hostRef, kind, unit) {
  const grains =
    kind === 'coding'
      ? {
          'mark.code.tests.v1': grain('mark.code.tests.v1', hostRef, {
            result: { passed: unit >= 1, score: Math.round(unit * 4), max: 4 },
          }),
          'mark.code.method.v1': grain('mark.code.method.v1', hostRef, {
            result: { dimensions: Object.fromEntries(methodDims(unit).map((d) => [d.key, d.score])) },
            dimensions: methodDims(unit),
          }),
        }
      : kind === 'doc'
        ? {
            'mark.doc.essay.v1': grain('mark.doc.essay.v1', hostRef, {
              result: { composite: unit, wordCount: 320, limitsOk: true },
            }),
          }
        : {
            'mark.form.key.v1': grain('mark.form.key.v1', hostRef, {
              result: { passed: unit >= 0.5, score: Math.round(unit * 10), max: 10 },
            }),
          }
  return async () => ({
    hostRef,
    kind,
    model: 'scripted',
    totalMs: 1,
    stages: Object.keys(grains).map((stage) => ({ stage, status: 'ok', ms: 1 })),
    result: { grains },
  })
}

/** Clarity/tape doubles: filled, so a stage is never left half-marked by the harness. */
const scriptedAssess = async ({ body }) => ({
  grains: {
    'sig.clarity.v1': {
      templateId: 'sig.clarity.v1',
      hostRef: String(body?.hostRef ?? 'attempt'),
      grain: 'after_tool',
      order: 90,
      status: 'filled',
      confidence: 'med',
      result: { unit: 0.7 },
    },
  },
})

/**
 * Drive one attempt through the real chain.
 *
 * `plan[phaseId]` is a unit in 0..1 to attempt at that level, the string `'forfeit'` to
 * skip the stage, or `'fail'` to make the assessor throw.
 */
async function runAttempt(briefId, plan) {
  clearInterviewResponse(briefId)
  clearMarkJobFailures()
  emptyInterviewResponse(briefId)

  const completed = []
  const skipped = []

  for (const phase of BRIEF.phases) {
    const step = plan[phase.id]
    if (step === 'forfeit') {
      skipped.push(phase.id)
      continue
    }
    completed.push(phase.id)

    if (phase.kind === 'discussion') {
      // interviewDelivery is scored per turn, not at topic end, so a talk stage with no
      // after_turn grains reads as an unmarked bucket however good the synthesis is.
      const { doc, message } = appendResponseMessage(getInterviewResponse(briefId), {
        phaseId: phase.id,
        topicId: phase.topicId,
        role: 'candidate',
        text: 'We capped the retries after the ingest outage and the queue drained.',
        probeId: null,
        kind: 'answer',
      })
      mergeFilledAfterTurnGrains(doc, message.id, {
        'iv.delivery.v1': {
          ...talkGrain('iv.delivery.v1', message.id, step, ['clarity', 'composure', 'structure']),
          grain: 'after_turn',
        },
      })
      mergeFilledTopicEnd(getInterviewResponse(briefId), phase.topicId, {
        synthesisText: 'They walked through one incident and what changed after it.',
        targets: {
          incident: { key: 'incident', value: 'ingest outage', filled: true },
          outcome: { key: 'outcome', value: 'retries capped', filled: true },
        },
        byTemplate: {
          'iv.content.v1': talkGrain('iv.content.v1', phase.topicId, step, [
            'relevance',
            'specificity',
            'depth',
          ]),
          'synth.topic.v1': {
            templateId: 'synth.topic.v1',
            hostRef: phase.topicId,
            grain: 'topic_end',
            order: 3,
            status: 'filled',
            confidence: 'high',
            result: null,
          },
        },
      })
      continue
    }

    const kind = BRIEF.tools[phase.toolRef].type === 'coding' ? 'coding' : BRIEF.tools[phase.toolRef].type === 'doc' ? 'doc' : 'form'
    await enqueueSectionMarks({
      briefId,
      landing: { sections: [] },
      phaseId: phase.id,
      brief: BRIEF,
      stageStarted: true,
      isTalk: false,
      assess: scriptedAssess,
      assessTool:
        step === 'fail'
          ? async () => {
              throw new Error('scripted_stage_failure')
            }
          : scriptedTool(phase.toolRef, kind, step),
    })
    await awaitMarkJobs(8000)
    bumpMarkJobGeneration()
  }

  syncResponseProgress(getInterviewResponse(briefId), completed, skipped)
  const response = getInterviewResponse(briefId)
  return { response, scored: scoreAttempt({ brief: BRIEF, response }) }
}

const pendingIds = (response) =>
  Object.entries(response.analysis.tools ?? {}).flatMap(([host, row]) =>
    Object.entries(row)
      .filter(([, g]) => g.status === 'pending')
      .map(([id]) => `${host}/${id}`),
  )

// ── thorough but mediocre vs sparse but polished ─────────────────────────────────────
const thorough = await runAttempt('e2e:thorough', {
  'ph.talk': 0.5,
  'ph.code': 0.5,
  'ph.doc': 0.5,
  'ph.form': 0.5,
})
const sparse = await runAttempt('e2e:sparse', {
  'ph.talk': 1,
  'ph.code': 'forfeit',
  'ph.doc': 'forfeit',
  'ph.form': 1,
})

assert.deepEqual(pendingIds(thorough.response), [], 'a complete attempt leaves nothing pending')
assert.deepEqual(pendingIds(sparse.response), [], 'a forfeiting attempt leaves nothing pending')
assert.ok(thorough.response.analysis.rollup, 'the chain produced a rollup')
assert.ok(sparse.response.analysis.rollup, 'a forfeiting attempt still rolls up')

// The headline. Middling work on four stages must beat excellent work on two.
assert.ok(
  thorough.scored.softGrade.overall > sparse.scored.softGrade.overall,
  `effort must beat absence: thorough ${thorough.scored.softGrade.overall} vs sparse ${sparse.scored.softGrade.overall}`,
)

// What makes that true, stated separately so a regression names its own cause: the
// denominator comes from the brief, so it cannot shrink to fit what was attempted.
assert.deepEqual(
  [...thorough.scored.softGrade.expectedBuckets].sort(),
  [...sparse.scored.softGrade.expectedBuckets].sort(),
  'both candidates are scored against the same expected set',
)
for (const bucket of ['codingTests', 'codingMethod', 'essay']) {
  const row = sparse.scored.softGrade.byWeight[bucket]
  assert.equal(row.included, true, `${bucket} stays in the denominator when forfeited`)
  assert.equal(row.unit, 0, `${bucket} scores 0, not nothing`)
  assert.equal(row.zeroedBy, 'absent_skipped', `${bucket} names the candidate's absence`)
}

// ── an empty submission is a fact to mark, not a stage that vanishes ─────────────────
// The assessor returns its thin-evidence floor rather than a low-confidence discard.
const empty = await runAttempt('e2e:empty-coding', {
  'ph.talk': 0.5,
  'ph.code': 0,
  'ph.doc': 0.5,
  'ph.form': 0.5,
})
const emptyCoding = empty.scored.softGrade.byWeight.codingTests
assert.equal(emptyCoding.included, true, 'an attempted-but-empty stage is scored')
assert.equal(emptyCoding.unit, 0)
assert.equal(
  emptyCoding.zeroedBy,
  undefined,
  'a real 0 from a real mark is not attributed to absence or failure',
)
assert.ok(
  empty.scored.softGrade.overall < thorough.scored.softGrade.overall,
  'an empty coding stage costs what it should',
)

// ── our failure must look different from the candidate's ─────────────────────────────
const broken = await runAttempt('e2e:mark-failed', {
  'ph.talk': 0.5,
  'ph.code': 'fail',
  'ph.doc': 0.5,
  'ph.form': 0.5,
})
const brokenCoding = broken.scored.softGrade.byWeight.codingTests
assert.equal(brokenCoding.included, true)
assert.equal(brokenCoding.unit, 0)
assert.equal(
  brokenCoding.zeroedBy,
  'mark_failed',
  'a stage the candidate completed and we failed to mark is our failure',
)
assert.equal(
  broken.scored.resultStatus,
  'needs_review',
  'a score we broke must not ship as complete',
)
const trace = broken.response.analysis.markTrace ?? []
assert.ok(
  trace.some((r) => String(r.failed ?? '').includes('scripted_stage_failure')),
  `the failing stage names itself in the trace, got ${JSON.stringify(trace.map((r) => r.failed))}`,
)

// The candidate's forfeit, by contrast, is a finished attempt with a real 0 in it.
assert.notEqual(sparse.scored.resultStatus, 'needs_review')
assert.notEqual(sparse.scored.resultStatus, 'unmarked')

// ── a brief with no coding stage is untouched ────────────────────────────────────────
// The expected set is authored, not universal: zeroing every candidate on stages the
// brief never ran would be the same unfairness pointed the other way.
{
  const talkAndDoc = {
    ...BRIEF,
    phases: BRIEF.phases.filter((p) => p.id === 'ph.talk' || p.id === 'ph.doc'),
  }
  const briefId = 'e2e:no-coding'
  clearInterviewResponse(briefId)
  emptyInterviewResponse(briefId)
  mergeFilledTopicEnd(getInterviewResponse(briefId), 'topic.a', {
    synthesisText: 'One incident, clearly told.',
    targets: {},
    byTemplate: {
      'synth.topic.v1': {
        templateId: 'synth.topic.v1',
        hostRef: 'topic.a',
        grain: 'topic_end',
        order: 1,
        status: 'filled',
        confidence: 'high',
        result: { composite: 0.6 },
      },
    },
  })
  await enqueueSectionMarks({
    briefId,
    landing: { sections: [] },
    phaseId: 'ph.doc',
    brief: talkAndDoc,
    stageStarted: true,
    isTalk: false,
    assess: scriptedAssess,
    assessTool: scriptedTool('tool.doc', 'doc', 0.6),
  })
  await awaitMarkJobs(8000)
  bumpMarkJobGeneration()
  syncResponseProgress(getInterviewResponse(briefId), ['ph.talk', 'ph.doc'], [])

  const scored = scoreAttempt({ brief: talkAndDoc, response: getInterviewResponse(briefId) })
  assert.equal(
    scored.softGrade.expectedBuckets.includes('codingTests'),
    false,
    'a bucket the brief never authored stays out of the denominator',
  )
  assert.equal(
    scored.softGrade.byWeight.codingTests?.included ?? false,
    false,
    'codingTests is not applicable here, so it must not score 0',
  )
  assert.ok(scored.softGrade.overall > 0, 'the stages that did run still score')
}

// ── scoring changes are versioned, not silently restated ─────────────────────────────
// Overalls from before the expected-set denominator are not comparable to these.
assert.equal(thorough.scored.softGrade.method, 'expected_set_v2')

{
  const customBrief = {
    ...BRIEF,
    analysis: {
      rollup: {
        weights: { talk: 0.4, build: 0.3, write: 0.3 },
        weightSections: {
          talk: ['ph.talk'],
          build: ['ph.code'],
          write: ['ph.doc'],
        },
        weightTemplates: {
          talk: ['iv.delivery.v1', 'iv.content.v1'],
          build: ['mark.code.tests.v1', 'mark.code.method.v1'],
          write: ['mark.doc.essay.v1'],
        },
        weightLabels: { talk: 'Conversation', build: 'Build', write: 'Write' },
      },
    },
  }
  const customThorough = scoreAttempt({ brief: customBrief, response: thorough.response })
  const customSparse = scoreAttempt({ brief: customBrief, response: sparse.response })
  assert.deepEqual(
    [...customThorough.softGrade.expectedBuckets].sort(),
    ['build', 'talk', 'write'],
  )
  assert.equal(customThorough.softGrade.byWeight.codingTests, undefined)
  assert.ok(customThorough.softGrade.byWeight.talk?.included)
  assert.ok(customThorough.softGrade.byWeight.build?.included)
  assert.ok(customThorough.softGrade.byWeight.write?.included)
  assert.ok(
    customThorough.softGrade.overall > customSparse.softGrade.overall,
    `custom folders: effort still beats absence (${customThorough.softGrade.overall} vs ${customSparse.softGrade.overall})`,
  )
  assert.equal(customSparse.softGrade.byWeight.build?.unit, 0)
  assert.equal(customSparse.softGrade.byWeight.write?.unit, 0)

  const withGhost = {
    ...customBrief,
    analysis: {
      rollup: {
        ...customBrief.analysis.rollup,
        weights: { talk: 0.5, ghost: 0.5 },
        weightTemplates: { talk: ['iv.delivery.v1', 'iv.content.v1'] },
        weightLabels: { talk: 'Conversation', ghost: 'Ghost' },
      },
    },
  }
  const ghosted = scoreAttempt({ brief: withGhost, response: thorough.response })
  assert.equal(ghosted.softGrade.byWeight.ghost?.included, true)
  assert.equal(ghosted.softGrade.byWeight.ghost?.unit, 0)
}

{
  const here = dirname(fileURLToPath(import.meta.url))
  const sample = JSON.parse(
    readFileSync(join(here, '../interviewBrief/fixtures/tieredDecisionSample.json'), 'utf8'),
  )
  assert.equal(sample.analysis.rollup.weightTemplates, undefined)
  const filled = {
    messages: [
      {
        id: 'm1',
        phaseId: 'ph.talk',
        topicId: 'topic.debrief',
        role: 'candidate',
        text: 'I hashed the array.',
        at: 't',
        probeId: null,
        kind: 'answer',
      },
    ],
    completedPhaseIds: ['ph.talk', 'ph.code', 'ph.doc'],
    skippedPhaseIds: [],
    analysis: {
      turns: {
        m1: {
          'iv.delivery.v1': {
            templateId: 'iv.delivery.v1',
            hostRef: 'm1',
            grain: 'after_turn',
            status: 'filled',
            confidence: 'med',
            dimensions: [
              { key: 'clarity', score: 'strong' },
              { key: 'composure', score: 'strong' },
              { key: 'structure', score: 'strong' },
            ],
          },
        },
      },
      topics: {
        'topic.debrief': {
          status: 'filled',
          synthesisText: 'Debrief',
          targets: {},
          byTemplate: {
            'iv.content.v1': {
              templateId: 'iv.content.v1',
              hostRef: 'topic.debrief',
              grain: 'topic_end',
              status: 'filled',
              confidence: 'med',
              dimensions: [
                { key: 'relevance', score: 'mixed' },
                { key: 'specificity', score: 'mixed' },
                { key: 'depth', score: 'mixed' },
              ],
            },
          },
        },
      },
      tools: {
        'tool.code': {
          'mark.code.tests.v1': {
            templateId: 'mark.code.tests.v1',
            hostRef: 'tool.code',
            grain: 'after_tool',
            status: 'filled',
            confidence: 'high',
            result: { passedCount: 2, total: 4, score: 2, max: 4 },
          },
          'mark.code.method.v1': {
            templateId: 'mark.code.method.v1',
            hostRef: 'tool.code',
            grain: 'after_tool',
            status: 'filled',
            confidence: 'med',
            dimensions: [
              { key: 'approach', score: 'weak' },
              { key: 'clarity', score: 'weak' },
              { key: 'complexity', score: 'weak' },
            ],
          },
        },
        'tool.doc': {
          'mark.doc.essay.v1': grain('mark.doc.essay.v1', 'tool.doc', {
            result: { composite: 1 },
            dimensions: [{ key: 'task', label: 'Task', score: '3', max: 3 }],
          }),
        },
      },
    },
  }
  const effort = scoreAttempt({ brief: sample, response: filled })
  const unansweredWrite = scoreAttempt({
    brief: sample,
    response: {
      ...filled,
      analysis: {
        ...filled.analysis,
        tools: { 'tool.code': filled.analysis.tools['tool.code'] },
      },
    },
  })
  assert.ok(
    effort.softGrade.overall > unansweredWrite.softGrade.overall,
    `tiered sample: effort still beats absence (${effort.softGrade.overall} vs ${unansweredWrite.softGrade.overall})`,
  )
  assert.equal(unansweredWrite.softGrade.byWeight.write.unit, 0)
  assert.equal(unansweredWrite.softGrade.byWeight.write.included, true)
  assert.ok(unansweredWrite.softGrade.expectedBuckets.includes('write'))
  assert.ok(Math.abs(effort.softGrade.overall - 0.7) < 1e-9, `tiered sample overall 0.7, got ${effort.softGrade.overall}`)
}

console.log('markPipeline.e2e: ok')
