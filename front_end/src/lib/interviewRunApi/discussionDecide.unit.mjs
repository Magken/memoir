/**
 * Local exit-budget decide (no OpenAI) — failure transcripts + new signals.
 * Run: npx tsx front_end/src/lib/interviewRunApi/discussionDecide.unit.mjs
 */
import assert from 'node:assert/strict'
import comprehensive from '../interviewBrief/fixtures/creator2ComprehensiveBrief.json' with { type: 'json' }
import { buildTalkContext } from './buildTalkContext.ts'
import { classifyCandidateSignals, isThinUtterance, classifyNameCheckReply } from './candidateSignals.ts'
import { decideTalkTurn } from './discussionDecide.ts'
import { alreadyDugOwnershipFromMessages, composeCuesFromDecide, createTalkRuntimeState, startTalkSession } from './discussionRunner.ts'
import { clearInterviewResponse, emptyInterviewResponse, saveInterviewResponse } from './interviewResponse.ts'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
}

const briefId = 'fixture:decide-unit'
clearInterviewResponse(briefId)
const ctx = buildTalkContext({
  briefId,
  brief: comprehensive,
  phaseId: 'ph.conflict',
})
assert.ok(ctx)

let response = saveInterviewResponse(emptyInterviewResponse(briefId))
let { state } = await startTalkSession({ ctx, response })

// Gibberish must clarify — never deepen
state = { ...state, candidateTurns: 1 }
let d = decideTalkTurn({
  ctx,
  state,
  candidateText: 'sdfsd',
})
assert.equal(d.situation, 'clarify', `gibberish → clarify, got ${d.situation}`)
assert.ok(d.signals.includes('gibberish'), `signals=${d.signals.join(',')}`)

// Meta "which project?" → clarify
d = decideTalkTurn({
  ctx,
  state,
  candidateText: 'which project',
})
assert.equal(d.situation, 'clarify', `meta → clarify, got ${d.situation}`)
assert.ok(d.signals.includes('meta_clarify'))

// "what are you saying?" → clarify (not deepen)
d = decideTalkTurn({
  ctx,
  state,
  candidateText: 'what are you saying?',
})
assert.equal(d.situation, 'clarify')

// Collective we → deepen
d = decideTalkTurn({
  ctx,
  state,
  candidateText: 'We handled a priority fight as a team last quarter.',
})
assert.equal(d.situation, 'deepen')
assert.ok(d.missingGaps.length >= 1)
assert.equal(d.canPass, false)
assert.ok(d.signals.includes('collective_we'))

// Second consecutive we-answer stays deepen (do not flip situation)
state = {
  ...state,
  followUpsOnActiveProbe: 1,
  messages: [
    ...state.messages,
    {
      id: 'a_own',
      role: 'assistant',
      text: '*Priority* fight as a team - I still hear we. What call did you make that others disagreed with?',
      at: Date.now() - 2000,
      probeId: ctx.topic.probes[0]?.id ?? null,
      kind: 'follow_up',
    },
    {
      id: 'c_we1',
      role: 'candidate',
      text: 'We handled a priority fight as a team last quarter.',
      at: Date.now() - 1500,
      probeId: ctx.topic.probes[0]?.id ?? null,
      kind: 'answer',
    },
  ],
}
d = decideTalkTurn({
  ctx,
  state,
  candidateText: 'We froze deploys and cut MTTR from 90 minutes to 20.',
})
assert.equal(d.situation, 'deepen', `2nd we-turn stays deepen, got ${d.situation}`)
assert.equal(
  alreadyDugOwnershipFromMessages(state.messages, ctx.topic.probes[0]?.id ?? null),
  true,
  'prior ownership dig is already_dug',
)
{
  const varyCues = composeCuesFromDecide({
    situation: d.situation,
    signals: d.signals,
    missingGaps: d.missingGaps,
    alreadyDugOwnership: true,
    ownershipPushed: true,
  })
  assert.ok(varyCues.includes('vary_ask'), `2nd we-turn cues=${varyCues.join(',')}`)
  assert.ok(varyCues.includes('already_dug_ownership'))
  assert.ok(!varyCues.includes('deepen_ownership'), 'do not restamp deepen_ownership')
}
assert.equal(
  alreadyDugOwnershipFromMessages(
    [{ role: 'assistant', text: ctx.opener.text, kind: 'opener', probeId: ctx.topic.probes[0]?.id }],
    ctx.topic.probes[0]?.id ?? null,
  ),
  false,
  'opener is not already_dug',
)

// Meta identity / purpose → clarify (not deepen)
for (const text of ['Who are you?', 'What am I here for?', 'why are we doing this']) {
  d = decideTalkTurn({ ctx, state, candidateText: text })
  assert.equal(d.situation, 'clarify', `${JSON.stringify(text)} → clarify, got ${d.situation}`)
  assert.ok(
    d.signals.includes('meta_clarify'),
    `${JSON.stringify(text)} signals=${d.signals.join(',')}`,
  )
}

// Company culture / salary → off_topic
d = decideTalkTurn({
  ctx,
  state,
  candidateText: 'Tell me about the company culture',
})
assert.equal(d.situation, 'off_topic')

d = decideTalkTurn({
  ctx,
  state,
  candidateText: 'what is the salary',
})
assert.equal(d.situation, 'off_topic')

// Rich ownership answer should not clarify
d = decideTalkTurn({
  ctx,
  state,
  candidateText:
    'I led the checkout rewrite and cut p99 by 40ms after a fight with PM.',
})
assert.ok(
  d.situation === 'move_probe' ||
    d.situation === 'probe_gap' ||
    d.situation === 'follow_up' ||
    d.situation === 'close' ||
    d.situation === 'deepen',
  `rich answer got ${d.situation}`,
)
assert.ok(!d.signals.includes('gibberish'))

// 1–3 word / no-substance → clarify (elastic), never deepen
for (const text of ['yeah', 'the outage', 'we did', 'I worked on it.']) {
  d = decideTalkTurn({ ctx, state, candidateText: text })
  assert.equal(d.situation, 'clarify', `${JSON.stringify(text)} → clarify, got ${d.situation}`)
  assert.equal(
    isThinUtterance(text, d.signals),
    true,
    `${JSON.stringify(text)} should be thin`,
  )
  const elasticCues = composeCuesFromDecide({
    situation: d.situation,
    signals: d.signals,
    missingGaps: d.missingGaps,
    elastic: true,
  })
  assert.ok(elasticCues.includes('elastic'), `${JSON.stringify(text)} cues=${elasticCues.join(',')}`)
  assert.ok(!elasticCues.includes('deepen_ownership'))
}

d = decideTalkTurn({
  ctx,
  state,
  candidateText: 'We kind of handled stuff somehow.',
})
assert.equal(d.situation, 'clarify', `hedge-only we → clarify, got ${d.situation}`)

// Named short we-story still deepens
d = decideTalkTurn({
  ctx,
  state,
  candidateText: 'Our team shipped it together last sprint.',
})
assert.equal(d.situation, 'deepen', `mini we-story stays deepen, got ${d.situation}`)

// Cumulative gaps: earlier ownership answer fills personal_decision
state = {
  ...state,
  messages: [
    ...state.messages,
    {
      id: 'c_prior',
      role: 'candidate',
      text: 'I decided the API freeze myself last quarter.',
      at: Date.now() - 1000,
      probeId: ctx.topic.probes[0]?.id ?? null,
      kind: 'answer',
    },
  ],
  candidateTurns: 2,
}
d = decideTalkTurn({
  ctx,
  state,
  candidateText: 'Error rate dropped about 12% after that freeze.',
})
assert.ok(
  !d.missingGaps.some((g) => /personal decision/i.test(g)),
  `cumulative ownership should clear personal_decision, gaps=${d.missingGaps.join(',')}`,
)

// Burn follow-ups then move / close
state = createTalkRuntimeState(ctx)
state = {
  ...state,
  status: 'active',
  candidateTurns: ctx.topic.depth.minCandidateTurns,
  followUpsOnActiveProbe: ctx.topic.depth.maxFollowUps,
  activeProbeIndex: Math.max(0, probeCapIndex(ctx) - 1),
  probesAsked: probeCapIndex(ctx),
}
d = decideTalkTurn({
  ctx,
  state,
  candidateText:
    'I decided the API freeze myself and tracked error rate down 12% after the conflict.',
})
assert.ok(
  d.situation === 'close' || d.situation === 'move_probe',
  `expected close or move_probe, got ${d.situation}`,
)

const sigs = classifyCandidateSignals('idk')
assert.ok(sigs.includes('non_answer') || sigs.includes('gibberish'))

{
  assert.equal(classifyNameCheckReply('no').kind, 'reject')
  assert.equal(classifyNameCheckReply('yes').kind, 'affirm')
  assert.equal(classifyNameCheckReply('popi').kind, 'name')
  assert.equal(classifyNameCheckReply('popi').name?.toLowerCase(), 'popi')
  assert.equal(classifyNameCheckReply('call me Sam').kind, 'name')
  assert.equal(classifyNameCheckReply('you did not ask for my preferred name').kind, 'other')
}

{
  const nothing = classifyCandidateSignals('nothing]')
  assert.ok(nothing.includes('non_answer'), `nothing] signals=${nothing.join(',')}`)
  d = decideTalkTurn({ ctx, state, candidateText: 'nothing]' })
  assert.equal(d.situation, 'clarify', `nothing] → clarify, got ${d.situation}`)
}

{
  const capState = {
    ...createTalkRuntimeState(ctx),
    status: 'active',
    candidateTurns: 2,
    followUpsOnActiveProbe: ctx.topic.depth.maxFollowUps,
    activeProbeIndex: 0,
    probesAsked: 1,
  }
  d = decideTalkTurn({ ctx, state: capState, candidateText: 'yeah' })
  assert.equal(d.situation, 'clarify', `thin at follow-up cap stays clarify, got ${d.situation}`)
  assert.equal(d.nextState.activeProbeIndex, 0, 'thin must not skip to the next probe')
}

// Social rapport: greetings are conversation, not smash — clarify + meld cue, never gibberish
for (const text of ['hi', "hi'", 'hello', 'thanks', 'how are you', 'sorry one sec']) {
  const socialSigs = classifyCandidateSignals(text)
  assert.ok(
    socialSigs.includes('social_rapport'),
    `${JSON.stringify(text)} → social_rapport, got ${socialSigs.join(',')}`,
  )
  assert.ok(
    !socialSigs.includes('gibberish'),
    `${JSON.stringify(text)} must not be gibberish`,
  )
  assert.ok(
    !socialSigs.includes('non_answer'),
    `${JSON.stringify(text)} must not be non_answer`,
  )
  d = decideTalkTurn({ ctx, state, candidateText: text })
  assert.equal(d.situation, 'clarify', `${JSON.stringify(text)} → clarify, got ${d.situation}`)
  assert.ok(d.signals.includes('social_rapport'))
}

{
  const mixed =
    'I owned the rollback on Saturday because the replica lagged. Does that match what you wanted?'
  const mixedSigs = classifyCandidateSignals(mixed)
  assert.ok(mixedSigs.includes('question'), `long mixed send still flags question, got ${mixedSigs.join(',')}`)
}

console.log('discussionDecide: ok')

function probeCapIndex(c) {
  const n = c.topic.probes.length
  const max = c.topic.depth.maxProbes
  if (max == null || max <= 0) return n
  return Math.min(n, max)
}
