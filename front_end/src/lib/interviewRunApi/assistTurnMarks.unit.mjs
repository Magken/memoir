/**
 * Assist after_turn stubs — not catalog afterTurnEligible.
 * Run: npx tsx front_end/src/lib/interviewRunApi/assistTurnMarks.unit.mjs
 */
import assert from 'node:assert/strict'
import { afterTurnTemplateIds } from './buildTalkContext.ts'
import { emptyInterviewResponse, saveInterviewResponse } from './interviewResponse.ts'
import {
  ASSIST_TURN_TEMPLATE_ID,
  assistMarkThreadSlice,
  compactAssistTurnsForLeave,
  mergeFilledAssistTurnGrains,
  skipPendingAssistTurnGrains,
  writePendingAssistTurnGrains,
} from './assistTurnMarks.ts'

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

assert.deepEqual(afterTurnTemplateIds([ASSIST_TURN_TEMPLATE_ID]), [])

saveInterviewResponse(emptyInterviewResponse('fixture:assist-turn'))
let doc = emptyInterviewResponse('fixture:assist-turn')
doc = {
  ...doc,
  messages: [
    {
      id: 'msg.ask',
      phaseId: 'ph.code',
      topicId: null,
      role: 'candidate',
      text: 'Rename helper',
      at: new Date().toISOString(),
      probeId: null,
      kind: 'answer',
    },
  ],
}
doc = writePendingAssistTurnGrains(doc, {
  messageId: 'msg.ask',
  hostRef: 'tool.code',
  order: 1,
})
assert.equal(doc.analysis.turns['msg.ask'][ASSIST_TURN_TEMPLATE_ID].status, 'pending')
assert.equal(doc.analysis.turns['msg.ask'][ASSIST_TURN_TEMPLATE_ID].hostRef, 'tool.code')

doc = mergeFilledAssistTurnGrains(doc, 'msg.ask', {
  [ASSIST_TURN_TEMPLATE_ID]: {
    templateId: ASSIST_TURN_TEMPLATE_ID,
    hostRef: 'tool.code',
    grain: 'after_turn',
    order: 1,
    status: 'filled',
    result: null,
    justification: 'Pointed ask on this send. They named the helper rather than dumping a rewrite.',
    evidence: ['Rename helper'],
    evidenceRefs: [{ kind: 'message', ref: 'msg.ask', quote: 'Rename helper' }],
    confidence: 'med',
  },
})
assert.equal(doc.analysis.turns['msg.ask'][ASSIST_TURN_TEMPLATE_ID].grain, 'after_turn')
const packed = compactAssistTurnsForLeave(doc, 'tool.code')
assert.ok(packed['msg.ask'])

doc = writePendingAssistTurnGrains(doc, {
  messageId: 'msg.ask2',
  hostRef: 'tool.code',
  order: 2,
})
doc = {
  ...doc,
  messages: [
    ...doc.messages,
    {
      id: 'msg.ask2',
      phaseId: 'ph.code',
      topicId: null,
      role: 'candidate',
      text: 'again',
      at: new Date().toISOString(),
      probeId: null,
      kind: 'answer',
    },
  ],
}
doc = skipPendingAssistTurnGrains(doc, 'ph.code')
assert.equal(doc.analysis.turns['msg.ask2'][ASSIST_TURN_TEMPLATE_ID].status, 'skipped')
assert.equal(doc.analysis.turns['msg.ask'][ASSIST_TURN_TEMPLATE_ID].status, 'filled')

const thread = assistMarkThreadSlice(doc.messages, 'ph.code')
assert.equal(thread[0]?.at, doc.messages[0]?.at, 'assist_turn thread must carry message at')

console.log('assistTurnMarks: ok')
