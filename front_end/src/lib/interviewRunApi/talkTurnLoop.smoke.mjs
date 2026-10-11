/**
 * FE turn-loop smoke: decide → fixture Edge JSON → InterviewResponse SSOT growth.
 * No live OpenAI. Run: npx tsx front_end/src/lib/interviewRunApi/talkTurnLoop.smoke.mjs
 */
import assert from 'node:assert/strict'
import comprehensive from '../interviewBrief/fixtures/creator2ComprehensiveBrief.json' with { type: 'json' }
import { afterTurnTemplateIds, buildTalkContext } from './buildTalkContext.ts'
import { decideTalkTurn } from './discussionDecide.ts'
import {
  composeCuesFromGrains,
  startTalkSession,
} from './discussionRunner.ts'
import {
  appendResponseMessage,
  clearInterviewResponse,
  emptyInterviewResponse,
  mergeFilledAfterTurnGrains,
  mergeFilledTopicEnd,
  persistTalkRuntime,
  saveInterviewResponse,
  writePendingAfterTurnGrains,
  writeTopicEndStub,
} from './interviewResponse.ts'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
}

import { VARIED_CANDIDATE_SAMPLES } from './variedCandidateCorpus.mjs'

const MATRIX = [
  {
    text: 'Who are you?',
    expectSituation: 'clarify',
    fixtureUtterance:
      'I am your interviewer for this conflict topic. Say you owned a priority fight - what call was yours?',
  },
  {
    text: 'What am I here for?',
    expectSituation: 'clarify',
    fixtureUtterance:
      'We are covering ownership on a concrete conflict. Like when priorities collided - what did you own?',
  },
  {
    text: 'Are you a bot?',
    expectSituation: 'clarify',
    fixtureUtterance:
      'I am your interviewer for this conflict topic. Like when priorities collided - what call was yours?',
  },
  {
    text: 'what is the salary',
    expectSituation: 'off_topic',
    fixtureUtterance:
      'Compensation is later. For now, what conflict did you own, and what did you decide?',
  },
  {
    text: 'Tell me about the company culture',
    expectSituation: 'off_topic',
    fixtureUtterance:
      'Culture can wait. Stay on the conflict - what call was yours alone?',
  },
  {
    text: 'can you give an example?',
    expectSituation: 'clarify',
    fixtureUtterance:
      'Sure - like when priorities collided with another team: what conflict did you own?',
  },
  {
    text: 'sdfsd',
    expectSituation: 'clarify',
    fixtureUtterance:
      'I am not sure I followed. Say you owned a launch - what did you personally decide?',
  },
  {
    text: 'which project',
    expectSituation: 'clarify',
    fixtureUtterance:
      'Any recent one works. Like when priorities collided - what conflict did you own?',
  },
  {
    text: 'We handled a priority fight as a team last quarter.',
    expectSituation: 'deepen',
    fixtureUtterance: 'You said we. What did you personally decide, and what changed because of you?',
  },
  {
    text: 'I decided the API freeze myself and tracked error rate down 12%.',
    expectSituation: null,
    fixtureUtterance: 'Thanks. That gives me what I need on this topic. Use Next when you are ready.',
  },
]

const briefId = 'fixture:turn-loop'
clearInterviewResponse(briefId)
const ctx = buildTalkContext({
  briefId,
  brief: comprehensive,
  phaseId: 'ph.conflict',
})
assert.ok(ctx)

let response = saveInterviewResponse(emptyInterviewResponse(briefId))
let { state, response: r0 } = await startTalkSession({ ctx, response })
response = r0
assert.equal(response.messages.length, 1)
assert.equal(response.messages[0].compose?.model, 'authored_probe')
assert.ok(
  /Let's talk about|I'd like to hear about|Next up is/i.test(response.messages[0].text),
  'mid chat seed invites the section',
)
assert.ok(!/\bI'?m\b/i.test(response.messages[0].text), 'mid chat seed never re-introduces persona')
assert.notEqual(response.messages[0].text.trim(), ctx.opener.text.trim(), 'not raw probe alone')
assert.equal((response.messages[0].text.match(/\?/g) || []).length, 1, 'one ask')
assert.equal(state.openBeat, 'done')

for (const step of MATRIX) {
  const probe = ctx.topic.probes[state.activeProbeIndex] ?? null
  const cand = appendResponseMessage(response, {
    phaseId: ctx.phaseId,
    topicId: ctx.topicId,
    role: 'candidate',
    text: step.text,
    probeId: probe?.id ?? null,
    kind: 'answer',
  })
  response = cand.doc
  state = {
    ...state,
    candidateTurns: state.candidateTurns + 1,
    messages: [
      ...state.messages,
      {
        id: cand.message.id,
        role: 'candidate',
        text: step.text,
        at: Date.now(),
        probeId: probe?.id ?? null,
        kind: 'answer',
      },
    ],
  }

  response = writePendingAfterTurnGrains(response, {
    messageId: cand.message.id,
    hostRef: ctx.topicId,
    templateIds: ctx.topic.analysis.templateIds,
    order: state.candidateTurns,
  })

  const decision = decideTalkTurn({
    ctx,
    state:
      step.expectSituation === 'deepen' ||
      step.expectSituation === 'clarify' ||
      step.expectSituation === 'off_topic'
        ? { ...state, followUpsOnActiveProbe: 0 }
        : state,
    candidateText: step.text,
  })
  if (step.expectSituation) {
    assert.equal(
      decision.situation,
      step.expectSituation,
      `text=${JSON.stringify(step.text)} got ${decision.situation}`,
    )
  }

  const fixtureGrain = {
    templateId: 'iv.delivery.v1',
    hostRef: ctx.topicId,
    grain: 'after_turn',
    order: state.candidateTurns,
    status: 'filled',
    result: { overall: decision.signals.includes('gibberish') ? 1 : 3, max: 5 },
    dimensions: [
      {
        key: 'clarity',
        label: 'Clarity',
        score: decision.signals.includes('gibberish') ? 1 : 3,
        max: 5,
      },
    ],
    justification: decision.signals.includes('gibberish')
      ? 'No usable evidence; turn was gibberish.'
      : 'Partial ownership signal.',
    evidence: [step.text],
    confidence: decision.signals.includes('gibberish') ? 'low' : 'med',
  }
  const grains = { 'iv.delivery.v1': fixtureGrain }
  response = mergeFilledAfterTurnGrains(response, cand.message.id, grains)
  const cues = composeCuesFromGrains(grains)
  assert.ok(Array.isArray(cues))

  // Gauge decide payload shape sent to Edge
  const decideBody = {
    situation: decision.situation,
    missingGaps: decision.missingGaps,
    activeProbeId: decision.activeProbeId,
    nextProbeGoal: decision.nextProbeGoal,
    canPass: decision.canPass,
    signals: decision.signals,
    composeCues: cues,
  }
  assert.ok(Array.isArray(decideBody.signals))
  assert.ok(Array.isArray(decideBody.composeCues))

  state = decision.nextState
  const asst = appendResponseMessage(response, {
    phaseId: ctx.phaseId,
    topicId: ctx.topicId,
    role: 'assistant',
    text: step.fixtureUtterance,
    probeId: probe?.id ?? null,
    kind: decision.situation === 'close' ? 'close' : 'follow_up',
    compose: {
      situation: decision.situation,
      missingGaps: decision.missingGaps,
      sampleIdsUsed: ['fixture.loop'],
      model: 'fixture',
    },
  })
  response = asst.doc
  state = {
    ...state,
    messages: [
      ...state.messages,
      {
        id: asst.message.id,
        role: 'assistant',
        text: step.fixtureUtterance,
        at: Date.now(),
        probeId: probe?.id ?? null,
        kind: decision.situation === 'close' ? 'close' : 'follow_up',
      },
    ],
  }
  if (decision.situation === 'close') {
    state = { ...state, status: 'ready_to_pass' }
  }
  response = persistTalkRuntime(response, ctx, state)
}

assert.ok(response.messages.length >= 1 + MATRIX.length * 2)
assert.ok(Object.keys(response.analysis.turns).length >= 1)

if (state.status === 'ready_to_pass') {
  response = writeTopicEndStub(response, {
    topicId: ctx.topicId,
    targets: ctx.topic.targets.map((t) => ({ key: t.key })),
    templateIds: ctx.topic.analysis.templateIds,
  })
  response = mergeFilledTopicEnd(response, ctx.topicId, {
    synthesisText: 'Candidate clarified after gibberish then owned an API freeze with a metric.',
    targets: Object.fromEntries(
      ctx.topic.targets.map((t) => [t.key, { key: t.key, value: null, filled: false }]),
    ),
    byTemplate: {},
  })
  const topic = response.analysis.topics[ctx.topicId]
  assert.ok(topic)
  assert.equal(typeof topic.synthesisText, 'string')
  assert.ok(topic.targets && typeof topic.targets === 'object')
}

// Full SSOT dump gauge
const dump = JSON.parse(JSON.stringify(response))
assert.equal(dump.schemaVersion, 1)
assert.ok(dump.messages.every((m) => typeof m.text === 'string' && typeof m.role === 'string'))
assert.ok(dump.talkRuntime)
assert.ok(dump.analysis)

const ivIds = afterTurnTemplateIds(ctx.topic.analysis.templateIds)
assert.ok(Array.isArray(ivIds))

// Full corpus decide-only stress (fresh follow-up budget each line)
const decideState = { ...createFreshDecideState(ctx, state), followUpsOnActiveProbe: 0 }
let corpusFails = 0
for (const { text, expect } of VARIED_CANDIDATE_SAMPLES) {
  const d = decideTalkTurn({
    ctx,
    state: { ...decideState, followUpsOnActiveProbe: 0 },
    candidateText: text,
  })
  const allowed = expect.split('|')
  if (!allowed.includes(d.situation)) {
    corpusFails += 1
    console.error(`corpus FAIL ${JSON.stringify(text)} → ${d.situation} want ${expect}`)
  }
}
assert.equal(corpusFails, 0, `${corpusFails} corpus decide misses`)

console.log(
  `talkTurnLoop: ok (messages=${dump.messages.length}, turns=${Object.keys(dump.analysis.turns).length}, corpus=${VARIED_CANDIDATE_SAMPLES.length})`,
)

function createFreshDecideState(c, s) {
  return {
    ...s,
    status: 'active',
    activeProbeIndex: 0,
    followUpsOnActiveProbe: 0,
    probesAsked: 1,
    candidateTurns: 1,
  }
}
