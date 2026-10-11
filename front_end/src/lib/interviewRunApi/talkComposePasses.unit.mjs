/**
 * Talk compose pass loop — 1-pass clean vs legal 2-pass need-only vs both-fields skip.
 * Run: npx tsx front_end/src/lib/interviewRunApi/talkComposePasses.unit.mjs
 */
import assert from 'node:assert/strict'
import { emptyRetrievedMemoryPack } from './dayMemory/types.ts'
import {
  runTalkComposePasses,
  shouldExpandComposePass1,
} from './talkComposePasses.ts'

const A = 'What did you personally decide on that freeze?'
const B = 'Walk me through the metric you moved after the freeze.'
const NEED = {
  needs: [{ sourceId: 'candidate_cv', reason: 'asked_cv' }],
}

function fixtureMeta() {
  return {
    situation: 'clarify',
    sampleIdsUsed: ['fixture'],
    model: 'fixture',
    missingGaps: [],
  }
}

function queueCompose(rows) {
  const q = [...rows]
  const calls = []
  return {
    calls,
    compose: async ({ retrievalPass, onUtteranceDelta }) => {
      const next = q.shift()
      if (!next) throw new Error(`compose queue empty at retrievalPass=${retrievalPass}`)
      calls.push({ retrievalPass, utterance: next.utterance, needRetrieval: Boolean(next.needRetrieval) })
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
        composeMeta: fixtureMeta(),
        needRetrieval: next.needRetrieval ?? null,
      }
    },
  }
}

{
  assert.equal(
    shouldExpandComposePass1({ moreNeeds: [], utterance: A }),
    false,
    'negative: clean utterance must not expand',
  )
  assert.equal(
    shouldExpandComposePass1({ moreNeeds: NEED.needs, utterance: '' }),
    true,
    'empty + needs is a legal expand',
  )
  assert.equal(
    shouldExpandComposePass1({ moreNeeds: NEED.needs, utterance: A }),
    false,
    'spoken reply drops needRetrieval expand',
  )
  assert.equal(
    shouldExpandComposePass1({
      moreNeeds: NEED.needs,
      utterance: A,
      skipPass1WhenUtterance: false,
    }),
    true,
    'old both-fields path expands when skip is off',
  )
  assert.equal(
    shouldExpandComposePass1({
      pendingFirstProbe: true,
      moreNeeds: NEED.needs,
      utterance: '',
    }),
    false,
    'day-1 first probe never expands',
  )
}

{
  const q = queueCompose([{ utterance: A, deltas: [A] }])
  const painted = []
  const out = await runTalkComposePasses({
    compose: q.compose,
    retrieved: emptyRetrievedMemoryPack(),
    onUtteranceDelta: (_d, full) => painted.push(full),
  })
  assert.equal(out.trace.length, 1, `clean compose count got ${out.trace.length}`)
  assert.equal(q.calls.length, 1, `clean calls got ${JSON.stringify(q.calls)}`)
  assert.equal(out.composed.utterance, A)
  assert.deepEqual(painted, [A])
  assert.ok(
    out.trace[0].deltas.every((d) => A.startsWith(d)),
    `deltas must be prefixes of A got ${JSON.stringify(out.trace[0].deltas)}`,
  )
}

{
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
  assert.equal(out.trace.length, 2, `need-only compose count got ${out.trace.length}`)
  assert.equal(q.calls[0].retrievalPass, 0)
  assert.equal(q.calls[1].retrievalPass, 1)
  assert.deepEqual(painted, [B], `need-only must paint only B got ${JSON.stringify(painted)}`)
  assert.equal(out.composed.utterance, B)
}

{
  const q = queueCompose([
    { utterance: A, needRetrieval: NEED, deltas: [A] },
    { utterance: B, deltas: [B] },
  ])
  const out = await runTalkComposePasses({
    compose: q.compose,
    retrieved: emptyRetrievedMemoryPack(),
  })
  assert.equal(
    out.trace.length,
    1,
    `both-fields must not re-compose got ${JSON.stringify(out.trace)}`,
  )
  assert.equal(out.composed.utterance, A)
  assert.equal(q.calls.length, 1)
}

{
  const q = queueCompose([
    { utterance: A, needRetrieval: NEED, deltas: [A] },
    { utterance: B, deltas: [B] },
  ])
  const painted = []
  const out = await runTalkComposePasses({
    compose: q.compose,
    retrieved: emptyRetrievedMemoryPack(),
    skipPass1WhenUtterance: false,
    onUtteranceDelta: (_d, full) => painted.push(full),
  })
  assert.equal(
    out.trace.length,
    2,
    `skip off reproduces the overwrite got ${out.trace.length}`,
  )
  assert.deepEqual(painted, [A, B], `overwrite paints A then B got ${JSON.stringify(painted)}`)
  assert.equal(out.composed.utterance, B)
}

console.log('talkComposePasses: ok')
