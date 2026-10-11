/**
 * Talk session seed + response growth (no Edge; decide covered separately).
 * Run: npx tsx front_end/src/lib/interviewRunApi/discussionRunner.unit.mjs
 */
import assert from 'node:assert/strict'
import comprehensive from '../interviewBrief/fixtures/creator2ComprehensiveBrief.json' with { type: 'json' }
import { buildTalkContext } from './buildTalkContext.ts'
import { decideTalkTurn } from './discussionDecide.ts'
import {
  finalizeTalkTopic,
  startTalkSession,
  trackAfterTurnWork,
  awaitInFlightAfterTurns,
} from './discussionRunner.ts'
import {
  appendResponseMessage,
  clearInterviewResponse,
  compactAfterTurnPack,
  emptyInterviewResponse,
  getInterviewResponse,
  mergeFilledAfterTurnGrains,
  persistTalkRuntime,
  saveInterviewResponse,
  writePendingAfterTurnGrains,
} from './interviewResponse.ts'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
}

const briefId = 'fixture:runner-unit'
clearInterviewResponse(briefId)
const ctx = buildTalkContext({
  briefId,
  brief: comprehensive,
  phaseId: 'ph.conflict',
})
assert.ok(ctx)

let response = saveInterviewResponse(emptyInterviewResponse(briefId))
let { state, response: r1, view } = await startTalkSession({ ctx, response })
response = r1
assert.equal(state.messages.length, 1)
assert.equal(state.messages[0].kind, 'opener')
assert.equal(view.canPass, false)
assert.ok(response.talkRuntime)
assert.equal(response.messages[0].compose?.model, 'authored_probe')
assert.ok(
  /Let's talk about|I'd like to hear about|Next up is/i.test(state.messages[0].text),
  'mid peel opener invites the section',
)
assert.ok(!/^We're now on/i.test(state.messages[0].text), 'mid peel is not an agenda stamp')
assert.ok(
  !/(?:^|\n)I need (a specific|one concrete|you to)/i.test(state.messages[0].text),
  'mid peel is not homework',
)
assert.ok(!/\bI'?m\b/i.test(state.messages[0].text), 'mid peel never re-introduces persona')
assert.ok(
  state.messages[0].text.includes(ctx.opener.text.replace(/\s+/g, ' ').trim().replace(/[.?!]$/, '')) ||
    /conflict|disagreement|owned/i.test(state.messages[0].text),
  'peel opener still carries probe ask',
)
assert.notEqual(state.messages[0].text.trim(), ctx.opener.text.trim(), 'not raw probe alone')
assert.ok(!/Morgan/i.test(state.messages[0].text), 'no hardcoded Morgan')
assert.equal((state.messages[0].text.match(/\?/g) || []).length, 1, 'one ask on mid open')
assert.equal(state.openBeat, 'done')

// Simulate candidate append + decide (Edge not called in this unit)
const candText = 'We handled a priority fight as a team last quarter.'
const appended = appendResponseMessage(response, {
  phaseId: ctx.phaseId,
  topicId: ctx.topicId,
  role: 'candidate',
  text: candText,
  probeId: ctx.topic.probes[0]?.id ?? null,
  kind: 'answer',
})
response = appended.doc
state = {
  ...state,
  candidateTurns: 1,
  messages: [
    ...state.messages,
    {
      id: appended.message.id,
      role: 'candidate',
      text: candText,
      at: Date.now(),
      probeId: ctx.topic.probes[0]?.id ?? null,
      kind: 'answer',
    },
  ],
}
response = writePendingAfterTurnGrains(response, {
  messageId: appended.message.id,
  hostRef: ctx.topicId,
  templateIds: ctx.topic.analysis.templateIds,
  order: 1,
})
assert.ok(Object.keys(response.analysis.turns).length >= 1)
const dims = response.analysis.turns[appended.message.id]
const firstIv = Object.keys(dims).find((k) => k.startsWith('iv.'))
assert.ok(firstIv)
assert.ok(Array.isArray(dims[firstIv].dimensions))

const decision = decideTalkTurn({ ctx, state, candidateText: candText })
assert.equal(decision.situation, 'deepen')
assert.equal(view.canPass, false)

state = { ...decision.nextState, status: 'ready_to_pass' }
response = persistTalkRuntime(response, ctx, state)
response = finalizeTalkTopic({ ctx, state, response })
assert.ok(response.analysis.topics[ctx.topicId])
assert.equal(response.analysis.topics[ctx.topicId].status, 'stubbed')

{
  const lastId = appended.message.id
  const delayed = new Promise((resolve) => {
    setTimeout(() => {
      mergeFilledAfterTurnGrains(getInterviewResponse(briefId), lastId, {
        [firstIv]: {
          templateId: firstIv,
          hostRef: ctx.topicId,
          grain: 'after_turn',
          order: 1,
          status: 'filled',
          result: { overall: 'mixed', max: 1 },
          dimensions: [{ key: 'clarity', label: 'Clarity', score: 'mixed', max: 1 }],
          justification: 'They named a freeze call in this send. I froze the API.',
          evidence: ['I froze the API'],
          evidenceRefs: [{ kind: 'message', ref: lastId, quote: 'I froze the API' }],
          confidence: 'med',
        },
      })
      resolve()
    }, 40)
  })
  trackAfterTurnWork(delayed)
  await awaitInFlightAfterTurns()
  const pack = compactAfterTurnPack(getInterviewResponse(briefId), ctx.topicId)
  assert.equal(pack[lastId]?.[firstIv]?.status, 'filled', 'last-send grain merged before topic_end pack')
}

console.log('discussionRunner: ok')
