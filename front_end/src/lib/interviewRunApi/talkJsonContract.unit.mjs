/**
 * InterviewResponse + decide JSON contract gauges (no Edge).
 * Run: npx tsx front_end/src/lib/interviewRunApi/talkJsonContract.unit.mjs
 */
import assert from 'node:assert/strict'
import comprehensive from '../interviewBrief/fixtures/creator2ComprehensiveBrief.json' with { type: 'json' }
import { buildTalkContext } from './buildTalkContext.ts'
import { decideTalkTurn } from './discussionDecide.ts'
import { composeCuesFromDecide, composeCuesFromGrains, startTalkSession } from './discussionRunner.ts'
import {
  clearInterviewResponse,
  emptyInterviewResponse,
  saveInterviewResponse,
} from './interviewResponse.ts'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
}

const briefId = 'fixture:json-contract'
clearInterviewResponse(briefId)
const ctx = buildTalkContext({
  briefId,
  brief: comprehensive,
  phaseId: 'ph.conflict',
})
assert.ok(ctx)

let response = saveInterviewResponse(emptyInterviewResponse(briefId))
const started = await startTalkSession({ ctx, response })
response = started.response
const state = started.state

assert.equal(response.schemaVersion, 1)
assert.ok(Array.isArray(response.messages))
assert.ok(response.talkRuntime)
assert.ok(response.analysis && typeof response.analysis.turns === 'object')
assert.ok(typeof response.analysis.topics === 'object')
assert.ok(Array.isArray(response.completedPhaseIds))
assert.ok(Array.isArray(response.skippedPhaseIds))

const opener = response.messages[0]
assert.ok(opener)
assert.equal(opener.role, 'assistant')
assert.ok(opener.compose)
assert.equal(opener.compose.situation, 'open')
assert.equal(typeof opener.compose.model, 'string')
assert.ok(Array.isArray(opener.compose.sampleIdsUsed))
assert.ok(Array.isArray(opener.compose.missingGaps))

const decision = decideTalkTurn({
  ctx,
  state: { ...state, candidateTurns: 1 },
  candidateText: 'sdfsd',
})
assert.equal(typeof decision.situation, 'string')
assert.ok(Array.isArray(decision.missingGaps))
assert.ok(Array.isArray(decision.signals))
assert.ok(decision.signals.includes('gibberish'))

const decidePayload = {
  situation: decision.situation,
  missingGaps: decision.missingGaps,
  activeProbeId: decision.activeProbeId,
  nextProbeGoal: decision.nextProbeGoal,
  canPass: decision.canPass,
  signals: decision.signals,
  composeCues: ['clarity:low', 'no_usable_evidence'],
}
for (const key of [
  'situation',
  'missingGaps',
  'activeProbeId',
  'nextProbeGoal',
  'canPass',
  'signals',
  'composeCues',
]) {
  assert.ok(key in decidePayload, `decide missing ${key}`)
}

const cues = composeCuesFromGrains({
  'iv.delivery.v1': {
    templateId: 'iv.delivery.v1',
    hostRef: 't',
    grain: 'after_turn',
    order: 1,
    status: 'filled',
    result: null,
    dimensions: [{ key: 'clarity', label: 'Clarity', score: 1, max: 5 }],
    justification: 'No usable evidence',
    evidence: [],
    confidence: 'low',
  },
})
assert.ok(cues.includes('clarity:low'))
assert.ok(cues.includes('no_usable_evidence'))

const decideCues = composeCuesFromDecide({
  situation: 'deepen',
  signals: ['collective_we', 'vague'],
  missingGaps: ['personal decision'],
})
assert.ok(decideCues.includes('ownership:low'))
assert.ok(decideCues.includes('clarity:low'))
assert.ok(decideCues.includes('deepen_ownership'))
assert.ok(decideCues.some((c) => c.startsWith('gap:')))

const varyCues = composeCuesFromDecide({
  situation: 'deepen',
  signals: ['collective_we'],
  missingGaps: ['personal decision'],
  alreadyDugOwnership: true,
  ownershipPushed: true,
})
assert.ok(varyCues.includes('vary_ask'))
assert.ok(varyCues.includes('already_dug_ownership'))
assert.ok(varyCues.includes('ownership:pushed'))
assert.ok(!varyCues.includes('deepen_ownership'))

const elasticCues = composeCuesFromDecide({
  situation: 'clarify',
  signals: ['short', 'vague'],
  missingGaps: ['any concrete answer'],
  elastic: true,
  alreadyThin: true,
})
assert.ok(elasticCues.includes('elastic'))
assert.ok(elasticCues.includes('vary_ask'))
assert.ok(!elasticCues.includes('deepen_ownership'))

console.log('talkJsonContract: ok')
