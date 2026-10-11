/**
 * Varied decide gauge — large corpus of complex + meta candidate lines (no Edge).
 * Run: npx tsx front_end/src/lib/interviewRunApi/variedDecide.gauge.mjs
 */
import assert from 'node:assert/strict'
import { classifyCandidateSignals } from './candidateSignals.ts'
import { decideTalkTurn } from './discussionDecide.ts'
import { buildTalkContext } from './buildTalkContext.ts'
import { startTalkSession } from './discussionRunner.ts'
import {
  clearInterviewResponse,
  emptyInterviewResponse,
  saveInterviewResponse,
} from './interviewResponse.ts'
import comprehensive from '../interviewBrief/fixtures/creator2ComprehensiveBrief.json' with { type: 'json' }
import { VARIED_CANDIDATE_SAMPLES } from './variedCandidateCorpus.mjs'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
}

const briefId = 'fixture:varied-gauge'
clearInterviewResponse(briefId)
const ctx = buildTalkContext({
  briefId,
  brief: comprehensive,
  phaseId: 'ph.conflict',
})
let response = saveInterviewResponse(emptyInterviewResponse(briefId))
let { state } = await startTalkSession({ ctx, response })
state = { ...state, candidateTurns: 1, followUpsOnActiveProbe: 0 }

let failed = 0
for (const { text, expect } of VARIED_CANDIDATE_SAMPLES) {
  const signals = classifyCandidateSignals(text)
  const d = decideTalkTurn({
    ctx,
    state: { ...state, followUpsOnActiveProbe: 0 },
    candidateText: text,
  })
  const allowed = expect.split('|')
  if (!allowed.includes(d.situation)) {
    failed += 1
    console.error(
      `FAIL ${JSON.stringify(text)} → ${d.situation}, want ${expect}; signals=${signals.join(',')}`,
    )
  } else {
    console.log(
      `ok ${d.situation.padEnd(12)} | ${signals.join(',') || '(none)'} | ${JSON.stringify(text)}`,
    )
  }
}

assert.equal(failed, 0, `${failed} varied samples misrouted`)
console.log(`variedDecide.gauge: ok (${VARIED_CANDIDATE_SAMPLES.length} samples)`)
