/**
 * Delivery regression gauge: depth units vs the pre-P6 ordinal path.
 * Seeded from the same talk after_turn shape markPipeline.e2e.mjs uses.
 * Run via front_end:test:mark-pipeline.
 */
import assert from 'node:assert/strict'
import { scoreAttempt } from './scoreAttempt.ts'

const BRIEF = {
  topicLibrary: [{ id: 'topic.a', targets: [] }],
  phases: [{ id: 'ph.talk', kind: 'discussion', topicId: 'topic.a', title: 'Opening' }],
  analysis: {
    rollup: {
      weights: { interviewDelivery: 1 },
      weightSections: { interviewDelivery: ['ph.talk'] },
    },
  },
}

function deliveryGrain(depthByKey) {
  const keys = ['clarity', 'composure', 'structure']
  return {
    templateId: 'iv.delivery.v1',
    hostRef: 'm1',
    grain: 'after_turn',
    order: 1,
    status: 'filled',
    confidence: 'med',
    dimensions: keys.map((key) => {
      const depth = depthByKey?.[key]
      return {
        key,
        label: key,
        score: 'mixed',
        ...(depth ? { depth } : {}),
      }
    }),
  }
}

function scoreDelivery(depthByKey) {
  const grain = deliveryGrain(depthByKey)
  const response = {
    schema: 'vurify/interview-response',
    version: 1,
    briefId: 'gauge:delivery',
    messages: [
      {
        id: 'm1',
        phaseId: 'ph.talk',
        topicId: 'topic.a',
        role: 'candidate',
        kind: 'answer',
        text: 'We named the freeze and what changed after it.',
        at: '',
      },
    ],
    completedPhaseIds: ['ph.talk'],
    skippedPhaseIds: [],
    analysis: {
      turns: { m1: { 'iv.delivery.v1': grain } },
      topics: {},
      tools: {},
    },
  }
  return scoreAttempt({ brief: BRIEF, response }).softGrade.byWeight.interviewDelivery.unit
}

const supported = {
  clarity: { position: 3, rungIndex: 1, instanceCount: 2, decisiveCount: 0 },
  composure: { position: 3, rungIndex: 1, instanceCount: 2, decisiveCount: 0 },
  structure: { position: 2, rungIndex: 1, instanceCount: 1, decisiveCount: 0 },
}
const withDepth = scoreDelivery(supported)
const ordinal = scoreDelivery(null)
assert.ok(typeof withDepth === 'number' && typeof ordinal === 'number')
const drop = ordinal - withDepth
assert.ok(
  drop <= 0.10,
  `Delivery mean must not fall more than 0.10 vs ordinal path: ordinal ${ordinal} depth ${withDepth} drop ${drop}`,
)

const gestureOnly = {
  clarity: { position: 1, rungIndex: 0, instanceCount: 1, decisiveCount: 0 },
  composure: { position: 1, rungIndex: 0, instanceCount: 1, decisiveCount: 0 },
  structure: { position: 1, rungIndex: 0, instanceCount: 1, decisiveCount: 0 },
}
const gesture = scoreDelivery(gestureOnly)
const gestureDrop = ordinal - gesture
assert.ok(
  gestureDrop > 0.10,
  `negative: a genuine all-gesture attempt must fall further than the tolerance: drop ${gestureDrop}`,
)

console.log('depthDelivery.gauge: ok')
