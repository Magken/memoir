/**
 * Talk send-to-settle trace — sample interview + canned compose queue.
 * Proves compose is not run twice when the model emits both utterance and needRetrieval.
 * Run: npx tsx front_end/src/lib/interviewRunApi/talkComposeTrace.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import comprehensive from '../interviewBrief/fixtures/creator2ComprehensiveBrief.json' with { type: 'json' }
import { settleTalkNeedRetrieval } from '../../../../back_end/supabase/functions/interview-talk-turn/needRetrieval.ts'
import { buildTalkContext } from './buildTalkContext.ts'
import { decideTalkTurn } from './discussionDecide.ts'
import { emptyRetrievedMemoryPack } from './dayMemory/types.ts'
import { appendResponseMessage, emptyInterviewResponse } from './interviewResponse.ts'
import { runTalkComposePasses } from './talkComposePasses.ts'
import { stripToFinalAsk } from './stripToFinalAsk.ts'
import { shouldAcceptTalkSend, stabilizeTalkViewIds } from './talkViewSettle.ts'

const here = dirname(fileURLToPath(import.meta.url))
const repo = join(here, '../../../..')
const rows = []

function hop(name, fn) {
  try {
    fn()
    rows.push(`ok ${name}`)
  } catch (e) {
    rows.push(`FAIL ${name}`)
    console.error(`FAIL ${name}`, e instanceof Error ? e.message : e)
    throw e
  }
}

async function hopAsync(name, fn) {
  try {
    await fn()
    rows.push(`ok ${name}`)
  } catch (e) {
    rows.push(`FAIL ${name}`)
    console.error(`FAIL ${name}`, e instanceof Error ? e.message : e)
    throw e
  }
}

const A = 'What did you personally decide on that freeze?'
const B = 'Walk me through the metric you moved after the freeze.'
const OPENER = 'Next up is Conflict. Tell me about a time you owned a hard call.'
const NEED = { needs: [{ sourceId: 'candidate_cv', reason: 'asked_cv' }] }
const TWO_ASK =
  'Thanks for that. What project was that? What did you personally decide?'

function fixtureMeta(situation = 'deepen') {
  return {
    situation,
    sampleIdsUsed: ['fixture.trace'],
    model: 'fixture',
    missingGaps: [],
  }
}

function queueCompose(script) {
  const q = [...script]
  const calls = []
  return {
    calls,
    compose: async ({ retrievalPass, onUtteranceDelta }) => {
      const next = q.shift()
      if (!next) throw new Error(`compose queue empty at retrievalPass=${retrievalPass}`)
      calls.push({
        retrievalPass,
        utterance: next.utterance,
        needRetrieval: Boolean(next.needRetrieval),
      })
      const text = next.utterance || ''
      if (Array.isArray(next.deltas) && next.deltas.length) {
        let full = ''
        for (const d of next.deltas) {
          full += d
          onUtteranceDelta?.(d, full)
        }
      } else if (text) {
        onUtteranceDelta?.(text, text)
      }
      return {
        utterance: text,
        composeMeta: fixtureMeta(next.situation),
        needRetrieval: next.needRetrieval ?? null,
      }
    },
  }
}

function printTree(id, tree) {
  console.log(`  ${id}`)
  console.log(`    decide=${tree.situation} compose=${tree.composeCount} settle=${JSON.stringify(tree.settled)}`)
  console.log(`    deltas=${JSON.stringify(tree.deltas)}`)
  console.log(`    passes=${JSON.stringify(tree.passes)}`)
}

const briefId = 'fixture:talk-compose-trace'
const ctx = buildTalkContext({
  briefId,
  brief: comprehensive,
  phaseId: 'ph.conflict',
})
assert.ok(ctx, 'sample interview must yield a TalkContext')

let response = emptyInterviewResponse(briefId)
const opener = appendResponseMessage(response, {
  phaseId: ctx.phaseId,
  topicId: ctx.topicId,
  role: 'assistant',
  text: OPENER,
  probeId: ctx.opener.probeId,
  kind: 'opener',
})
response = opener.doc

const candText = 'We handled a priority fight as a team last quarter.'
const cand = appendResponseMessage(response, {
  phaseId: ctx.phaseId,
  topicId: ctx.topicId,
  role: 'candidate',
  text: candText,
  probeId: ctx.topic.probes[0]?.id ?? null,
  kind: 'answer',
})
response = cand.doc

const state = {
  phaseId: ctx.phaseId,
  status: 'active',
  activeProbeIndex: 0,
  followUpsOnActiveProbe: 0,
  probesAsked: 1,
  candidateTurns: 1,
  startedAt: Date.now(),
  softTimeSent: false,
  draft: '',
  messages: [
    {
      id: opener.message.id,
      role: 'assistant',
      text: OPENER,
      at: Date.now(),
      probeId: ctx.opener.probeId,
      kind: 'opener',
    },
    {
      id: cand.message.id,
      role: 'candidate',
      text: candText,
      at: Date.now(),
      probeId: ctx.topic.probes[0]?.id ?? null,
      kind: 'answer',
    },
  ],
  openBeat: 'done',
}

const decision = decideTalkTurn({ ctx, state, candidateText: candText })

await hopAsync('T1.clean', async () => {
  const q = queueCompose([{ utterance: A, deltas: ['What did you ', 'personally decide on that freeze?'] }])
  const painted = []
  const out = await runTalkComposePasses({
    compose: q.compose,
    retrieved: emptyRetrievedMemoryPack(),
    onUtteranceDelta: (_d, full) => painted.push(full),
  })
  const settled = stripToFinalAsk(out.composed.utterance)
  const tree = {
    situation: decision.situation,
    composeCount: q.calls.length,
    deltas: painted,
    settled,
    passes: out.trace.map((t) => ({
      pass: t.pass,
      needRetrieval: t.needRetrieval,
      utteranceChars: t.utteranceChars,
    })),
  }
  printTree('T1.clean', tree)
  assert.equal(q.calls.length, 1, `T1 compose count got ${q.calls.length}`)
  assert.equal(settled, A)
  assert.ok(
    painted.every((d) => A.startsWith(d) || d.endsWith('freeze?')),
    `T1 deltas prefixes got ${JSON.stringify(painted)}`,
  )
})

await hopAsync('T2.both-fields', async () => {
  const q = queueCompose([
    { utterance: A, needRetrieval: NEED, deltas: [A] },
    { utterance: B, deltas: [B] },
  ])
  const painted = []
  const out = await runTalkComposePasses({
    compose: q.compose,
    retrieved: emptyRetrievedMemoryPack(),
    onUtteranceDelta: (_d, full) => painted.push(full),
  })
  const tree = {
    situation: decision.situation,
    composeCount: q.calls.length,
    deltas: painted,
    settled: out.composed.utterance,
    passes: out.trace.map((t) => ({ pass: t.pass, needRetrieval: t.needRetrieval })),
  }
  printTree('T2.both-fields', tree)
  assert.equal(
    q.calls.length,
    1,
    `T2 must not run pass 1 got ${JSON.stringify(out.trace)}`,
  )
  assert.equal(out.composed.utterance, A)
  assert.equal(painted.includes(B), false, `T2 must not paint B got ${JSON.stringify(painted)}`)
})

await hopAsync('T3.need-only', async () => {
  const q = queueCompose([
    { utterance: '', needRetrieval: NEED },
    { utterance: B, deltas: [B] },
  ])
  const painted = []
  const out = await runTalkComposePasses({
    compose: q.compose,
    retrieved: emptyRetrievedMemoryPack(),
    onUtteranceDelta: (_d, full) => painted.push(full),
  })
  const tree = {
    situation: decision.situation,
    composeCount: q.calls.length,
    deltas: painted,
    settled: out.composed.utterance,
    passes: out.trace.map((t) => ({
      pass: t.pass,
      retrievalPass: t.retrievalPass,
      needRetrieval: t.needRetrieval,
    })),
  }
  printTree('T3.need-only', tree)
  assert.equal(q.calls.length, 2, `T3 legal expand got ${q.calls.length}`)
  assert.equal(q.calls[1].retrievalPass, 1)
  assert.deepEqual(painted, [B], `T3 paints only B got ${JSON.stringify(painted)}`)
})

hop('T4.settle-scrub', () => {
  const streamed = TWO_ASK
  const settled = stripToFinalAsk(streamed)
  printTree('T4.settle-scrub', {
    situation: 'clarify',
    composeCount: 1,
    deltas: [streamed],
    settled,
    passes: [{ pass: 0, needRetrieval: false }],
  })
  assert.equal(settled.includes('What project was that?'), false, 'first ask dropped')
  assert.match(settled, /personally decide/)
  assert.notEqual(settled, streamed, 'settle is a scrub, not a second compose')
})

hop('T5.open-both', () => {
  const settled = settleTalkNeedRetrieval(
    { utterance: OPENER, needRetrieval: NEED },
    0,
  )
  printTree('T5.open-both', {
    situation: 'open',
    composeCount: 1,
    deltas: [OPENER],
    settled: settled.utteranceRaw,
    passes: [{ pass: 0, needRetrieval: Boolean(settled.needs) }],
  })
  assert.equal(settled.needs, null, 'opener utterance wins over needRetrieval')
  assert.equal(settled.utteranceRaw, OPENER)
  assert.equal(settled.utteranceRaw.includes('authored_probe'), false)
})

hop('T6.send-race', () => {
  assert.equal(
    shouldAcceptTalkSend({ busy: false, sending: false, text: candText }),
    true,
    'first send accepted',
  )
  assert.equal(
    shouldAcceptTalkSend({ busy: false, sending: true, text: candText }),
    false,
    'second send before busy paints is rejected',
  )
  assert.equal(
    shouldAcceptTalkSend({ busy: true, sending: false, text: candText }),
    false,
    'busy still blocks',
  )
  assert.equal(
    shouldAcceptTalkSend({ busy: false, sending: false, text: '   ' }),
    false,
    'negative: blank is not a send',
  )
})

hop('T7.settle-length', () => {
  const stubCtx = ctx
  const prev = {
    context: stubCtx,
    canPass: false,
    depthLabel: '',
    busy: true,
    state: {
      ...state,
      messages: [
        { id: 'opt_1', role: 'candidate', text: candText, at: 1, probeId: null, kind: 'answer' },
        { id: 'stream_1', role: 'assistant', text: A, at: 0, probeId: null, kind: 'follow_up' },
      ],
    },
  }
  const next = {
    context: stubCtx,
    canPass: false,
    depthLabel: '',
    busy: false,
    state: {
      ...state,
      messages: [
        { id: 'real_c', role: 'candidate', text: candText, at: 9, probeId: null, kind: 'answer' },
        { id: 'real_a', role: 'assistant', text: A, at: 10, probeId: null, kind: 'follow_up' },
      ],
    },
  }
  const stable = stabilizeTalkViewIds(prev, next)
  assert.equal(stable.state.messages[1].id, 'stream_1', 'matching length keeps stream id')
  assert.equal(
    stable.state.messages.filter((m) => m.role === 'assistant').length,
    1,
    'no duplicate assistant',
  )

  const divergeNext = {
    ...next,
    state: {
      ...next.state,
      messages: [
        { id: 'real_c', role: 'candidate', text: candText, at: 9, probeId: null, kind: 'answer' },
      ],
    },
  }
  const diverged = stabilizeTalkViewIds(prev, divergeNext)
  assert.equal(
    diverged.state.messages.filter((m) => m.role === 'assistant').length,
    0,
    'length-diverge must not invent a second assistant',
  )
})

hop('source.runner-uses-passes', () => {
  const runner = readFileSync(join(here, 'discussionRunner.ts'), 'utf8')
  assert.match(runner, /runTalkComposePasses\(/, 'applyTalkTurn uses the compose-pass helper')
  assert.equal(
    (runner.match(/edgeComposeTalk\(/g) || []).length <= 3,
    true,
    'turn compose is not inlined twice after extract',
  )
  assert.equal(/retrievalPass:\s*1/.test(runner), false, 'pass 1 is not inlined in the runner')
})

hop('source.interview-page-send', () => {
  const page = readFileSync(join(repo, 'front_end/src/pages/InterviewPage.tsx'), 'utf8')
  assert.match(page, /talkSendingRef/, 'send-in-flight ref exists')
  assert.match(page, /shouldAcceptTalkSend/, 'send guard is compared at the use site')
  assert.match(page, /talkSendingRef\.current = true/, 'ref is set before runTalkTurn')
  assert.match(page, /talkSendingRef\.current = false/, 'ref clears in finally')
  assert.match(page, /stabilizeTalkViewIds/, 'settle keeps stream ids')
})

hop('source.assist-pass0-hold', () => {
  const assist = readFileSync(join(here, 'dayMemory/runAssistMemoryCompose.ts'), 'utf8')
  const pass0 = assist.slice(
    assist.indexOf('retrievalPass: 0'),
    assist.indexOf('profile.mark(\'compose_pass0\''),
  )
  assert.equal(
    /onUtteranceDelta/.test(pass0),
    false,
    'Assist pass 0 must not stream deltas',
  )
  assert.match(assist, /shouldExpandComposePass1/, 'Assist uses the same expand gate')
  const pass1 = assist.slice(assist.indexOf('retrievalPass: 1'))
  assert.match(pass1, /onUtteranceDelta/, 'Assist pass 1 may stream')
})

hop('source.aid-pass0-hold', () => {
  const aid = readFileSync(
    join(repo, 'back_end/supabase/functions/interview-assessor-aid/index.ts'),
    'utf8',
  )
  const fn = aid.slice(aid.indexOf('async function retrieveThenCompose'), aid.indexOf('Deno.serve'))
  const extra = fn.indexOf('if (composed.extraNeeds)')
  const first = fn.slice(fn.indexOf('composeAidAfterPlan'), extra)
  assert.equal(/onDelta:/.test(first), false, 'Aid pass 0 does not stream')
  assert.match(fn.slice(extra), /onDelta: input\.onDelta/, 'Aid pass 1 streams')
})

hop('source.copilot-no-pass1-speech', () => {
  const copilotFe = readFileSync(join(here, 'copilotEditEdgeClient.ts'), 'utf8')
  assert.equal(
    /retrievalPass:\s*1/.test(copilotFe),
    false,
    'Copilot FE client has no Talk-style pass-1 speech loop',
  )
})

hop('source.edge-settle', () => {
  const edge = readFileSync(
    join(repo, 'back_end/supabase/functions/interview-talk-turn/index.ts'),
    'utf8',
  )
  assert.match(edge, /settleTalkNeedRetrieval/, 'stream and buffered compose settle needs')
  const client = readFileSync(join(here, 'talkEdgeClient.ts'), 'utf8')
  assert.match(
    client,
    /Do not push it/,
    'client must not push scrubbed done utterance through the live stream',
  )
})

console.log(`talkComposeTrace: ok (${rows.length} hops)`)
