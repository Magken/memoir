/**
 * buildPriorTalkMemory — cross-Talk recall pack.
 * Run: npx tsx front_end/src/lib/interviewRunApi/buildPriorTalkMemory.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  buildPriorTalkMemory,
  currentPhaseMessages,
  priorPhaseMessages,
} from './buildPriorTalkMemory.ts'
import { emptyInterviewResponse } from './interviewResponse.ts'

const base = emptyInterviewResponse('fixture:memory')
const response = {
  ...base,
  messages: [
    {
      id: 'm1',
      phaseId: 'ph.own',
      topicId: 'topic.own',
      role: 'assistant',
      text: 'Tell me about ownership.',
      at: '2026-01-01T00:00:00.000Z',
      probeId: 'p1',
      kind: 'opener',
    },
    {
      id: 'm2',
      phaseId: 'ph.own',
      topicId: 'topic.own',
      role: 'candidate',
      text: 'I owned the API freeze and cut error rate 12%.',
      at: '2026-01-01T00:01:00.000Z',
      probeId: 'p1',
      kind: 'answer',
    },
    {
      id: 'm3',
      phaseId: 'ph.conflict',
      topicId: 'topic.conflict',
      role: 'candidate',
      text: 'Current conflict answer should not appear in prior memory.',
      at: '2026-01-01T00:02:00.000Z',
      probeId: 'p2',
      kind: 'answer',
    },
  ],
  analysis: {
    ...base.analysis,
    topics: {
      'topic.own': {
        byTemplate: {},
        synthesisText: 'Candidate owned an API freeze and moved error rate down about 12%.',
        targets: {},
        status: 'filled',
      },
      'topic.conflict': {
        byTemplate: {},
        synthesisText: 'Should not leak into current conflict memory as prior.',
        targets: {},
        status: 'filled',
      },
    },
  },
}

const mem = buildPriorTalkMemory({
  response,
  currentTopicId: 'topic.conflict',
  currentPhaseId: 'ph.conflict',
})
assert.equal(mem.hasMemory, true)
assert.ok(mem.note.includes('API freeze') || mem.note.includes('12%'))
assert.ok(mem.note.includes('topic.own'))
assert.ok(!mem.note.includes('Current conflict answer'))
assert.ok(!mem.note.includes('Should not leak'))
assert.ok(mem.bridge.length > 0)
assert.ok(/earlier you (shared|mentioned|said)/i.test(mem.bridge))

const emptyMem = buildPriorTalkMemory({
  response: emptyInterviewResponse('x'),
  currentTopicId: 'topic.x',
  currentPhaseId: 'ph.x',
})
assert.equal(emptyMem.hasMemory, false)
assert.equal(emptyMem.note, '')

assert.equal(currentPhaseMessages(response.messages, 'ph.conflict').length, 1)
assert.equal(priorPhaseMessages(response.messages, 'ph.conflict', 'topic.conflict').length, 2)

console.log('buildPriorTalkMemory: ok')
