/**
 * InterviewResponse append / grain / export.
 * Run: npx tsx front_end/src/lib/interviewRunApi/interviewResponse.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  appendResponseMessage,
  clearInterviewResponse,
  emptyInterviewResponse,
  exportInterviewResponseJson,
  resetPhaseInResponse,
  saveInterviewResponse,
  writePendingAfterTurnGrains,
  writeSkippedAfterTurnGrains,
  writeTopicEndStub,
  mergeFilledAfterTurnGrains,
  drainPendingAfterTurnGrains,
  compactAfterTurnPack,
  mergeToolAssessResult,
  mergeFilledTopicEnd,
} from './interviewResponse.ts'

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

const briefId = 'fixture:response-unit'
clearInterviewResponse(briefId)
let doc = saveInterviewResponse(emptyInterviewResponse(briefId))

const cand = appendResponseMessage(doc, {
  phaseId: 'ph.conflict',
  topicId: 'topic.conflict',
  role: 'candidate',
  text: 'We shipped a gateway migration as a team.',
  probeId: 'p.conflict.1',
  kind: 'answer',
})
doc = cand.doc
assert.equal(doc.messages.length, 1)
assert.equal(doc.messageRange.firstId, cand.message.id)

doc = writePendingAfterTurnGrains(doc, {
  messageId: cand.message.id,
  hostRef: 'topic.conflict',
  templateIds: ['iv.delivery.v1', 'iv.ownership.v1', 'synth.topic.v1'],
  order: 1,
})
const grains = doc.analysis.turns[cand.message.id]
assert.ok(grains['iv.delivery.v1'])
// after_turn keeps delivery/question only — ownership waits for topic_end
assert.equal(grains['iv.ownership.v1'], undefined)
assert.equal(grains['synth.topic.v1'], undefined)
assert.equal(grains['iv.delivery.v1'].status, 'pending')

const skipMsg = appendResponseMessage(doc, {
  phaseId: 'ph.conflict',
  topicId: 'topic.conflict',
  role: 'candidate',
  text: 'What are you asking exactly?',
  probeId: 'p.conflict.1',
  kind: 'answer',
})
doc = skipMsg.doc
doc = writeSkippedAfterTurnGrains(doc, {
  messageId: skipMsg.message.id,
  hostRef: 'topic.conflict',
  templateIds: ['iv.delivery.v1'],
  order: 2,
  evidence: ['What are you asking exactly?'],
})
assert.equal(doc.analysis.turns[skipMsg.message.id]['iv.delivery.v1'].status, 'skipped')
assert.equal(
  doc.analysis.turns[skipMsg.message.id]['iv.delivery.v1'].evidence[0],
  'What are you asking exactly?',
)

// merge honors skipped; drains leftover pending; rejects ownership on after_turn
doc = writePendingAfterTurnGrains(doc, {
  messageId: cand.message.id,
  hostRef: 'topic.conflict',
  templateIds: ['iv.delivery.v1'],
  order: 1,
})
doc = mergeFilledAfterTurnGrains(doc, cand.message.id, {
  'iv.delivery.v1': {
    templateId: 'iv.delivery.v1',
    hostRef: 'topic.conflict',
    grain: 'after_turn',
    order: 1,
    status: 'skipped',
    result: null,
    dimensions: [],
    justification: 'Model skipped delivery on this turn.',
    evidence: [],
    confidence: 'low',
  },
  'iv.ownership.v1': {
    templateId: 'iv.ownership.v1',
    hostRef: 'topic.conflict',
    grain: 'after_turn',
    order: 1,
    status: 'filled',
    result: { overall: 'weak', max: 1 },
    dimensions: [],
    justification: 'Must not land on after_turn.',
    evidence: [],
    confidence: 'low',
  },
})
assert.equal(doc.analysis.turns[cand.message.id]['iv.delivery.v1'].status, 'skipped')
assert.equal(doc.analysis.turns[cand.message.id]['iv.ownership.v1'], undefined)

doc = mergeFilledAfterTurnGrains(doc, cand.message.id, {
  'custom.oncall': {
    templateId: 'custom.oncall',
    hostRef: 'topic.conflict',
    grain: 'after_turn',
    order: 1,
    status: 'filled',
    result: { overall: 'mixed', max: 1 },
    dimensions: [],
    justification: 'Named the on-call rotation. We rotate weekly.',
    evidence: ['We rotate weekly.'],
    evidenceRefs: [{ kind: 'message', ref: cand.message.id, quote: 'We rotate weekly.' }],
    confidence: 'med',
  },
})
assert.equal(doc.analysis.turns[cand.message.id]['custom.oncall'].status, 'filled')
assert.equal(doc.analysis.turns[cand.message.id]['custom.oncall'].evidenceRefs[0].ref, cand.message.id)

const pendingOnly = appendResponseMessage(doc, {
  phaseId: 'ph.conflict',
  topicId: 'topic.conflict',
  role: 'candidate',
  text: 'Still thinking.',
  probeId: 'p.conflict.1',
  kind: 'answer',
})
doc = pendingOnly.doc
doc = writePendingAfterTurnGrains(doc, {
  messageId: pendingOnly.message.id,
  hostRef: 'topic.conflict',
  templateIds: ['iv.delivery.v1'],
  order: 3,
})
doc = drainPendingAfterTurnGrains(doc, pendingOnly.message.id)
assert.equal(doc.analysis.turns[pendingOnly.message.id]['iv.delivery.v1'].status, 'skipped')

doc = mergeToolAssessResult(doc, 'ph.form', {
  grains: {
    'mark.form.key.v1': {
      templateId: 'mark.form.key.v1',
      hostRef: 'ph.form',
      grain: 'after_tool',
      order: 1,
      status: 'skipped',
      result: null,
      justification: 'Empty form.',
      evidence: [],
      confidence: 'low',
    },
  },
})
assert.equal(doc.analysis.tools['ph.form']['mark.form.key.v1'].status, 'skipped')

doc = writeTopicEndStub(doc, {
  topicId: 'topic.conflict',
  targets: [{ key: 'conflict_example' }],
  templateIds: ['iv.delivery.v1', 'synth.topic.v1', 'custom.oncall'],
})
assert.equal(doc.analysis.topics['topic.conflict'].status, 'stubbed')
assert.ok(doc.analysis.topics['topic.conflict'].byTemplate['custom.oncall'])
assert.ok(doc.analysis.topics['topic.conflict'].byTemplate['synth.topic.v1'])
assert.equal(doc.analysis.topics['topic.conflict'].synthesisText, null)
assert.equal(doc.analysis.topics['topic.conflict'].targets.conflict_example.filled, false)

doc = mergeFilledTopicEnd(doc, 'topic.conflict', {
  synthesisText: 'Named a concrete incident.',
  targets: {
    conflict_example: { key: 'conflict_example', value: 'rollback', filled: true },
  },
  byTemplate: {
    'iv.delivery.v1': {
      templateId: 'iv.delivery.v1',
      hostRef: 'topic.conflict',
      grain: 'topic_end',
      order: 0,
      status: 'filled',
      result: null,
      justification: 'Clear.',
      confidence: 'med',
    },
    'synth.topic.v1': {
      templateId: 'synth.topic.v1',
      hostRef: 'topic.conflict',
      grain: 'topic_end',
      order: 1,
      status: 'filled',
      result: { boardSummary: 'Named a concrete incident.' },
      justification: 'Named a concrete incident.',
    },
    'custom.oncall': {
      templateId: 'custom.oncall',
      hostRef: 'topic.conflict',
      grain: 'topic_end',
      order: 2,
      status: 'filled',
      result: null,
      justification: 'On-call note.',
    },
  },
})
assert.equal(doc.analysis.topics['topic.conflict'].status, 'filled')
doc = writeTopicEndStub(doc, {
  topicId: 'topic.conflict',
  targets: [{ key: 'conflict_example' }],
  templateIds: ['iv.delivery.v1', 'synth.topic.v1', 'custom.oncall'],
})
assert.equal(doc.analysis.topics['topic.conflict'].status, 'filled')
assert.equal(doc.analysis.topics['topic.conflict'].byTemplate['iv.delivery.v1'].status, 'filled')
assert.equal(doc.analysis.topics['topic.conflict'].synthesisText, 'Named a concrete incident.')
assert.equal(doc.analysis.topics['topic.conflict'].targets.conflict_example.filled, true)

const packed = compactAfterTurnPack(doc, 'topic.conflict')
assert.ok(packed[cand.message.id]?.['custom.oncall'])
assert.equal(packed[cand.message.id]['custom.oncall'].status, 'filled')

const exported = exportInterviewResponseJson(briefId)
const parsed = JSON.parse(exported)
assert.equal(parsed.messages.length, 3)
assert.ok(parsed.analysis.turns[cand.message.id])
assert.ok(parsed.analysis.turns[skipMsg.message.id])
assert.equal(parsed.analysis.turns[skipMsg.message.id]['iv.delivery.v1'].status, 'skipped')
assert.equal(parsed.analysis.turns[pendingOnly.message.id]['iv.delivery.v1'].status, 'skipped')
assert.equal(parsed.analysis.tools['ph.form']['mark.form.key.v1'].status, 'skipped')

doc = resetPhaseInResponse(doc, 'ph.conflict', 'topic.conflict')
assert.equal(doc.messages.length, 0)
assert.equal(doc.analysis.topics['topic.conflict'], undefined)

{
  const fresh = saveInterviewResponse(emptyInterviewResponse('fixture:response-upsert'))
  const a = appendResponseMessage(fresh, {
    id: 'assist-open-ph.x',
    phaseId: 'ph.x',
    topicId: null,
    role: 'assistant',
    text: 'first opener',
    probeId: null,
    kind: 'assist',
  })
  const b = appendResponseMessage(a.doc, {
    id: 'assist-open-ph.x',
    phaseId: 'ph.x',
    topicId: null,
    role: 'assistant',
    text: 'second opener',
    probeId: null,
    kind: 'assist',
  })
  assert.equal(b.doc.messages.filter((m) => m.id === 'assist-open-ph.x').length, 1)
  assert.equal(b.doc.messages.find((m) => m.id === 'assist-open-ph.x')?.text, 'second opener')
}

{
  const depthDoc = saveInterviewResponse(emptyInterviewResponse('fixture:depth-persist'))
  const pending = writePendingAfterTurnGrains(depthDoc, {
    messageId: 'm-shell',
    hostRef: 'topic.x',
    templateIds: ['iv.delivery.v1'],
    order: 1,
  })
  assert.ok(
    pending.analysis.turns['m-shell']['iv.delivery.v1'].dimensions?.every((d) => d.depth == null),
    'pending shells do not fabricate depth',
  )
  const filled = mergeFilledAfterTurnGrains(
    pending,
    'm-shell',
    {
      'iv.delivery.v1': {
        templateId: 'iv.delivery.v1',
        hostRef: 'topic.x',
        grain: 'after_turn',
        order: 1,
        status: 'filled',
        result: null,
        dimensions: [
          {
            key: 'clarity',
            label: 'Clarity',
            score: 'mixed',
            depth: { position: 2, rungIndex: 1, instanceCount: 1, decisiveCount: 0 },
          },
        ],
        justification: 'Clear.',
        evidence: ['ok'],
        confidence: 'med',
      },
    },
    ['iv.delivery.v1'],
  )
  assert.equal(
    filled.analysis.turns['m-shell']['iv.delivery.v1'].dimensions[0].depth.position,
    2,
  )
  const bare = mergeFilledAfterTurnGrains(
    filled,
    'm-bare',
    {
      'iv.delivery.v1': {
        templateId: 'iv.delivery.v1',
        hostRef: 'topic.x',
        grain: 'after_turn',
        order: 2,
        status: 'filled',
        result: null,
        dimensions: [{ key: 'clarity', label: 'Clarity', score: 'strong' }],
        justification: 'No depth.',
        evidence: ['ok'],
        confidence: 'med',
      },
    },
    ['iv.delivery.v1'],
  )
  assert.equal(bare.analysis.turns['m-bare']['iv.delivery.v1'].dimensions[0].depth, undefined)
}

console.log('interviewResponse: ok')
