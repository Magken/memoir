/**
 * Analysis return-format matrix — Edge normalize + FE merge contracts.
 * Run via front_end:test:talk-runtime.
 */
import assert from 'node:assert/strict'
import { dirname, join } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import {
  clearInterviewResponse,
  drainPendingAfterTurnGrains,
  emptyInterviewResponse,
  mergeFilledAfterTurnGrains,
  mergeFilledTopicEnd,
  mergeToolAssessResult,
  saveInterviewResponse,
  writePendingAfterTurnGrains,
} from './interviewResponse.ts'

const root = dirname(fileURLToPath(import.meta.url))
const normalizePath = join(
  root,
  '../../../../back_end/supabase/functions/interview-talk-turn/normalizeAnalysis.ts',
)
const { normalizeAfterTurnGrains, normalizeTopicEndByTemplate } = await import(
  pathToFileURL(normalizePath).href
)

// --- Edge normalize ---
{
  const bare = normalizeAfterTurnGrains({
    data: {
      templateId: 'iv.delivery.v1',
      hostRef: 'topic.x',
      grain: 'after_turn',
      order: 1,
      status: 'filled',
      result: { overall: 'weak', max: 1 },
      dimensions: [{ key: 'clarity', label: 'Clarity', score: 'weak', max: 1 }],
      justification: 'Vague team framing.',
      evidence: ['we did it'],
      confidence: 'med',
    },
    templateIds: ['iv.delivery.v1', 'iv.question.v1'],
    hostRef: 'topic.x',
    order: 1,
  })
  assert.equal(bare.bareUnwrapped, true)
  assert.equal(bare.grains['iv.delivery.v1'].status, 'filled')
  assert.equal(bare.grains['iv.question.v1'].status, 'skipped')
  assert.equal(bare.omitted, 1)
}

{
  const wire = normalizeAfterTurnGrains({
    data: {
      grains: {
        'iv.delivery.v1': {
          templateId: 'iv.delivery.v1',
          status: 'filled',
          justification: 'Clear personal call.',
          dimensions: [],
          evidence: [],
          confidence: 'high',
        },
      },
    },
    templateIds: ['iv.delivery.v1'],
    hostRef: 't',
    order: 2,
  })
  assert.equal(wire.omitted, 0)
  assert.equal(wire.bareUnwrapped, false)
  assert.ok(wire.grains['iv.delivery.v1'])
}

{
  const topic = normalizeTopicEndByTemplate({
    data: {
      byTemplate: {
        'synth.topic.v1': {
          templateId: 'synth.topic.v1',
          status: 'filled',
          justification: 'Enough signal.',
          dimensions: [],
          evidence: [],
          confidence: 'med',
        },
      },
    },
    templateIds: ['synth.topic.v1', 'iv.ownership.v1'],
    hostRef: 'topic.conflict',
  })
  assert.equal(topic.byTemplate['synth.topic.v1'].status, 'filled')
  assert.equal(topic.byTemplate['iv.ownership.v1'].status, 'skipped')
  assert.equal(topic.omitted, 1)
}

// --- FE merge ---
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

const briefId = 'fixture:analysis-return-formats'
clearInterviewResponse(briefId)
let doc = saveInterviewResponse(emptyInterviewResponse(briefId))
const messageId = 'msg_cand_1'

doc = writePendingAfterTurnGrains(doc, {
  messageId,
  hostRef: 'topic.conflict',
  templateIds: ['iv.delivery.v1', 'iv.question.v1'],
  order: 1,
})

doc = mergeFilledAfterTurnGrains(
  doc,
  messageId,
  {
    'iv.delivery.v1': {
      templateId: 'iv.delivery.v1',
      hostRef: 'topic.conflict',
      grain: 'after_turn',
      order: 1,
      status: 'filled',
      result: { overall: 'mixed', max: 1 },
      dimensions: [],
      justification: 'Mixed clarity.',
      evidence: ['ok'],
      confidence: 'med',
    },
    'iv.question.v1': {
      templateId: 'iv.question.v1',
      hostRef: 'topic.conflict',
      grain: 'after_turn',
      order: 1,
      status: 'skipped',
      result: null,
      dimensions: [],
      justification: 'Clarify-only; question not requested as filled.',
      evidence: [],
      confidence: 'low',
    },
    // Must not merge non-after_turn templates onto the turn row.
    'iv.ownership.v1': {
      templateId: 'iv.ownership.v1',
      hostRef: 'topic.conflict',
      grain: 'after_turn',
      order: 1,
      status: 'filled',
      result: { overall: 'weak', max: 1 },
      dimensions: [],
      justification: 'Should be ignored.',
      evidence: [],
      confidence: 'low',
    },
  },
  ['iv.delivery.v1', 'iv.question.v1'],
)

assert.equal(doc.analysis.turns[messageId]['iv.delivery.v1'].status, 'filled')
assert.equal(doc.analysis.turns[messageId]['iv.question.v1'].status, 'skipped')
assert.equal(doc.analysis.turns[messageId]['iv.ownership.v1'], undefined)

doc = writePendingAfterTurnGrains(doc, {
  messageId: 'msg_pending',
  hostRef: 'topic.conflict',
  templateIds: ['iv.delivery.v1'],
  order: 2,
})
doc = drainPendingAfterTurnGrains(doc, 'msg_pending', ['iv.delivery.v1'])
assert.equal(doc.analysis.turns.msg_pending['iv.delivery.v1'].status, 'skipped')

doc = mergeFilledTopicEnd(doc, 'topic.conflict', {
  synthesisText: 'Owned a freeze.',
  targets: { owned_decision: { key: 'owned_decision', value: 'freeze', filled: true } },
  byTemplate: {
    'synth.topic.v1': {
      templateId: 'synth.topic.v1',
      hostRef: 'topic.conflict',
      grain: 'topic_end',
      order: 0,
      status: 'filled',
      result: null,
      justification: 'Enough.',
      evidence: [],
      confidence: 'med',
    },
  },
})
// Seed a pending stub then merge empty byTemplate → should skip-drain
{
  let stubDoc = saveInterviewResponse({
    ...doc,
    analysis: {
      ...doc.analysis,
      topics: {
        'topic.drain': {
          byTemplate: {
            'iv.content.v1': {
              templateId: 'iv.content.v1',
              hostRef: 'topic.drain',
              grain: 'topic_end',
              order: 0,
              status: 'pending',
              result: null,
              justification: '',
            },
          },
          synthesisText: null,
          targets: {},
          status: 'stubbed',
        },
      },
    },
  })
  stubDoc = mergeFilledTopicEnd(stubDoc, 'topic.drain', {
    synthesisText: 'Thin.',
    targets: {},
    byTemplate: {},
  })
  assert.equal(stubDoc.analysis.topics['topic.drain'].byTemplate['iv.content.v1'].status, 'skipped')
}

doc = mergeToolAssessResult(doc, 'ph.coding', {
  grains: {
    'mark.code.tests.v1': {
      templateId: 'mark.code.tests.v1',
      hostRef: 'ph.coding',
      grain: 'after_tool',
      order: 1,
      status: 'skipped',
      result: null,
      justification: 'Never ran.',
      evidence: [],
      confidence: 'low',
    },
  },
})
assert.equal(doc.analysis.tools['ph.coding']['mark.code.tests.v1'].status, 'skipped')

// Depth round-trip through normalize + merge. Negative: silence and pending shells stay bare.
{
  const depthRow = {
    key: 'clarity',
    label: 'Clarity',
    score: 'mixed',
    depth: { position: 2, rungIndex: 1, instanceCount: 1, decisiveCount: 0 },
  }
  const after = normalizeAfterTurnGrains({
    data: {
      templateId: 'iv.delivery.v1',
      hostRef: 'topic.x',
      grain: 'after_turn',
      order: 3,
      status: 'filled',
      result: { overall: 'mixed', max: 1 },
      dimensions: [depthRow],
      justification: 'Clear enough.',
      evidence: ['we named the freeze'],
      evidenceRefs: [{ kind: 'message', ref: 'm-depth', quote: 'we named the freeze in the first sentence.' }],
      confidence: 'med',
    },
    templateIds: ['iv.delivery.v1'],
    hostRef: 'topic.x',
    order: 3,
  })
  assert.deepEqual(after.grains['iv.delivery.v1'].dimensions[0].depth, depthRow.depth)

  const topicDepth = normalizeTopicEndByTemplate({
    data: {
      byTemplate: {
        'iv.ownership.v1': {
          templateId: 'iv.ownership.v1',
          status: 'filled',
          justification: 'Owned the freeze.',
          dimensions: [depthRow],
          evidence: ['freeze'],
          evidenceRefs: [{ kind: 'message', ref: 'm-depth', quote: 'we named the freeze in the first sentence.' }],
          confidence: 'med',
        },
      },
    },
    templateIds: ['iv.ownership.v1'],
    hostRef: 'topic.conflict',
  })
  assert.deepEqual(topicDepth.byTemplate['iv.ownership.v1'].dimensions[0].depth, depthRow.depth)

  doc = mergeFilledAfterTurnGrains(
    doc,
    'msg_depth',
    {
      'iv.delivery.v1': after.grains['iv.delivery.v1'],
    },
    ['iv.delivery.v1'],
  )
  assert.deepEqual(doc.analysis.turns.msg_depth['iv.delivery.v1'].dimensions[0].depth, depthRow.depth)

  doc = mergeFilledTopicEnd(doc, 'topic.depth', {
    synthesisText: 'Owned a freeze.',
    targets: {},
    byTemplate: {
      'iv.ownership.v1': topicDepth.byTemplate['iv.ownership.v1'],
    },
  })
  assert.deepEqual(
    doc.analysis.topics['topic.depth'].byTemplate['iv.ownership.v1'].dimensions[0].depth,
    depthRow.depth,
  )

  doc = mergeToolAssessResult(doc, 'ph.method', {
    grains: {
      'mark.code.method.v1': {
        templateId: 'mark.code.method.v1',
        hostRef: 'ph.method',
        grain: 'after_tool',
        order: 1,
        status: 'filled',
        result: {},
        dimensions: [depthRow],
        justification: 'Approach mixed.',
        evidence: ['hash map'],
        confidence: 'med',
      },
    },
  })
  assert.deepEqual(
    doc.analysis.tools['ph.method']['mark.code.method.v1'].dimensions[0].depth,
    depthRow.depth,
  )

  const silent = normalizeAfterTurnGrains({
    data: {
      templateId: 'iv.delivery.v1',
      hostRef: 'topic.x',
      status: 'filled',
      dimensions: [{ key: 'clarity', label: 'Clarity', score: 'strong' }],
      justification: 'No depth block.',
      evidence: ['ok'],
      confidence: 'med',
    },
    templateIds: ['iv.delivery.v1'],
    hostRef: 'topic.x',
    order: 4,
  })
  assert.equal(silent.grains['iv.delivery.v1'].dimensions[0].depth, undefined)
  assert.equal(silent.grains['iv.delivery.v1'].dimensions[0].score, 'strong')

  const pending = writePendingAfterTurnGrains(doc, {
    messageId: 'msg_shell',
    hostRef: 'topic.conflict',
    templateIds: ['iv.delivery.v1'],
    order: 9,
  })
  const shell = pending.analysis.turns.msg_shell['iv.delivery.v1']
  assert.equal(shell.status, 'pending')
  assert.ok(shell.dimensions?.length)
  assert.ok(
    shell.dimensions.every((d) => d.depth == null),
    'pending catalog shells must not fabricate depth',
  )
}

{
  const capped = normalizeAfterTurnGrains({
    data: {
      templateId: 'iv.delivery.v1',
      hostRef: 'topic.x',
      status: 'filled',
      dimensions: [
        {
          key: 'clarity',
          label: 'Clarity',
          score: 'strong',
          depth: {
            instances: [
              {
                ref: { kind: 'message', ref: 'm1', quote: 'ok' },
                decisiveness: 'gesture',
              },
            ],
          },
        },
      ],
      justification: 'Claimed strong on a gesture.',
      evidence: ['ok'],
      evidenceRefs: [{ kind: 'message', ref: 'm1', quote: 'ok' }],
      confidence: 'med',
    },
    templateIds: ['iv.delivery.v1'],
    hostRef: 'topic.x',
    order: 5,
  })
  assert.notEqual(
    capped.grains['iv.delivery.v1'].dimensions[0].score,
    'strong',
    'top rung on one gesture is capped on after_turn',
  )
  assert.ok(capped.grains['iv.delivery.v1'].gaps?.includes('depth_capped'))
}

console.log('analysisReturnFormats: ok')
