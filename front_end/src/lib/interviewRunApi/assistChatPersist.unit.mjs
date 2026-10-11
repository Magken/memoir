/**
 * Copilot persist onto messages[] — Apply receipt + candidate send.
 * Run: npx tsx front_end/src/lib/interviewRunApi/assistChatPersist.unit.mjs
 */
import assert from 'node:assert/strict'
import { emptyInterviewResponse, saveInterviewResponse } from './interviewResponse.ts'
import {
  assistMessagesForPhase,
  assistTranscriptForPhase,
  persistAssistAssistantMessage,
  persistAssistCandidateMessage,
  persistCopilotApplyReceipt,
  isCopilotReceiptPersist,
  peelRuntimeFromPersisted,
  assistHistoryForCopilot,
} from './assistChatPersist.ts'

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

saveInterviewResponse(emptyInterviewResponse('fixture:copilot-ssot'))

const cand = persistAssistCandidateMessage({
  briefId: 'fixture:copilot-ssot',
  phaseId: 'ph.code',
  text: 'Rename the helper',
  id: 'assist-c-1',
})
assert.equal(cand.message.kind, 'answer')
assert.equal(cand.message.phaseId, 'ph.code')
assert.equal(cand.message.id, 'assist-c-1')

const emptyAsst = persistAssistAssistantMessage({
  briefId: 'fixture:copilot-ssot',
  phaseId: 'ph.code',
  text: '   ',
})
assert.equal(emptyAsst, null)

const asst = persistAssistAssistantMessage({
  briefId: 'fixture:copilot-ssot',
  phaseId: 'ph.code',
  text: 'I would rename parseRow.',
  id: 'assist-a-1',
})
assert.equal(asst?.message.kind, 'assist')

const apply = persistCopilotApplyReceipt({
  briefId: 'fixture:copilot-ssot',
  phaseId: 'ph.code',
  files: ['src/solve.ts'],
  id: 'assist-apply-1',
})
assert.equal(apply.message.kind, 'assist')
assert.equal(apply.message.compose?.situation, 'applied')
assert.match(apply.message.text, /src\/solve\.ts/)
assert.equal(apply.doc.messages.filter((m) => m.kind === 'assist').length, 2)

// The live Assist rail keeps receipts — they render as Check/X chips.
const rail = assistMessagesForPhase(apply.doc.messages, 'ph.code')
assert.ok(rail.some((m) => m.id === 'assist-c-1'))
assert.ok(rail.some((m) => m.id === 'assist-apply-1'))

// The Verify transcript drops them — read back as bubbles they are machine chatter.
const transcript = assistTranscriptForPhase(apply.doc.messages, 'ph.code')
assert.ok(transcript.some((m) => m.id === 'assist-c-1'), 'transcript keeps candidate speech')
assert.ok(transcript.some((m) => m.id === 'assist-a-1'), 'transcript keeps assistant speech')
assert.equal(
  transcript.some((m) => m.id === 'assist-apply-1'),
  false,
  'transcript drops apply receipts',
)

const peel = peelRuntimeFromPersisted(apply.doc.messages, 'ph.code')
assert.ok(peel.some((m) => m.id === 'assist-c-1'))
assert.ok(peel.some((m) => m.id === 'assist-a-1'))
assert.equal(peel.some((m) => m.id === 'assist-apply-1'), false, 'Check/X receipts must not hydrate as Sam bubbles')
assert.equal(isCopilotReceiptPersist(apply.message), true)

{
  const hist = assistHistoryForCopilot([
    { role: 'candidate', text: 'add incrementer in helpers.ts' },
    { role: 'assistant', text: '', parts: [{ type: 'planning', title: 'Questions' }] },
    {
      role: 'assistant',
      text: '',
      parts: [{ type: 'markdown', markdown: 'Proposed changes in src/helpers.ts.' }],
    },
  ])
  assert.equal(hist[1]?.text, '(Questions)')
  assert.match(hist[2]?.text ?? '', /Proposed changes/)
}

{
  const openerId = 'assist-open-ph.code'
  const first = persistAssistAssistantMessage({
    briefId: 'fixture:copilot-ssot',
    phaseId: 'ph.code',
    text: 'You are in the Consistent cache updater section, first recap.',
    id: openerId,
  })
  const second = persistAssistAssistantMessage({
    briefId: 'fixture:copilot-ssot',
    phaseId: 'ph.code',
    text: 'You are in the Consistent cache updater section, second recap.',
    id: openerId,
  })
  const sameId = second.doc.messages.filter((m) => m.id === openerId)
  assert.equal(sameId.length, 1, 'same opener id must upsert, not append')
  assert.match(sameId[0]?.text ?? '', /second recap/)
  const hydrated = peelRuntimeFromPersisted(second.doc.messages, 'ph.code')
  assert.equal(hydrated.filter((m) => m.id === openerId).length, 1)
  assert.ok(first.doc.messages.length >= 1)
}

console.log('assistChatPersist: ok')
