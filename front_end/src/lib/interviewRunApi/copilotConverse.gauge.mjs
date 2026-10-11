/**
 * Conversational hop-trace for the helpers.ts incrementer sitting.
 * Replays the 1–200 → 200–400 → “hi I just asked” → “the new one” thread.
 * No Edge, no OpenAI. Run: npx tsx front_end/src/lib/interviewRunApi/copilotConverse.gauge.mjs
 */
import assert from 'node:assert/strict'
import { inferCopilotIntent, inferCopilotThreadIntent } from '../../../../back_end/supabase/functions/interview-copilot-edit/inferCopilotIntent.ts'
import { isCopilotFollowThrough } from '../../../../back_end/supabase/functions/interview-copilot-edit/allowlist.ts'
import {
  priorCandidate,
  isCopilotFirstTurn,
  peelTurns,
} from '../../../../back_end/supabase/functions/interview-copilot-edit/copilotPeel.ts'
import { scoreCopilotScope } from '../../../../back_end/supabase/functions/interview-copilot-edit/copilotScopeGate.ts'
import {
  fallbackNamedHelperOp,
  namedIncrementCanSalvageBite,
  parseIncrementRange,
  parseLoopCount,
  parseCaseLabels,
} from '../../../../back_end/supabase/functions/interview-copilot-edit/namedHelperFallback.ts'
import {
  deterministicAssistReply,
  isComposeDud,
} from '../../../../back_end/supabase/functions/interview-copilot-edit/copilotCompose.ts'

const write = { write: true, spoilers: true }

const ASK1 =
  'Mm My TypeScript helper function file help me implement an incrementer that increments from one to two hundred as a placeholder function'
const ASK2 =
  'Can you help me increment or implement another function increment from 200 to 400? This is a different function, a new one please.'
const ASK3 = 'hi I just asked for an edit'
const ASK4 = 'the new one'

const helpersDoc = {
  kind: 'coding',
  generation: 1,
  snapshotHash: 'h',
  selection: { path: 'src/helpers.ts' },
  coding: {
    activeId: 'src/helpers.ts',
    files: [
      {
        path: 'src/helpers.ts',
        content:
          'export const seed = 0\n\nexport function* incrementOneTo200() {\n  for (let i = 1; i <= 200; i++) yield i\n}\n',
      },
      { path: 'src/solve.ts', content: 'export function solve() {}\n' },
    ],
  },
}

const sittingAfterAsk2 = [
  { role: 'assistant', text: 'Hi there. Looks like you are working on the helpers file and had a question about defining an incrementer function.' },
  { role: 'candidate', text: ASK1 },
  { role: 'assistant', text: 'Proposed a generator function incrementOneTo200 in src/helpers.ts to yield numbers from 1 to 200, one at a time.' },
  { role: 'candidate', text: ASK2 },
]

const sittingAfterAsk3 = [
  ...sittingAfterAsk2,
  { role: 'assistant', text: 'That is more than one turn. Pick one next part - a helper, loop, question, or heading. I will take the rest when you ask again.' },
  { role: 'assistant', text: 'No change to apply. Name a specific edit if you still want one.' },
  { role: 'candidate', text: ASK3 },
]

const sittingAfterAsk4 = [
  ...sittingAfterAsk3,
  { role: 'assistant', text: 'Would you like the new function to be named increment200To400, or do you have a different name in mind?' },
  { role: 'candidate', text: ASK4 },
]

const hops = []
function hop(id, label, value) {
  hops.push({ id, label, value })
  console.log(`hop  ${id}  ${label}  ${JSON.stringify(value)}`)
}

{
  hop('T1.intent', 'ASK1 intent', inferCopilotIntent(ASK1, write).kind)
  hop('T1.range', 'ASK1 range', parseIncrementRange(ASK1))
  hop('T1.first', 'first turn after opener+ASK1', isCopilotFirstTurn(sittingAfterAsk2.slice(0, 2), ASK1))
}

{
  hop('T2.intent', 'ASK2 intent', inferCopilotIntent(ASK2, write).kind)
  hop('T2.range', 'ASK2 range', parseIncrementRange(ASK2))
  const scopeEmpty = scoreCopilotScope({
    userMessage: ASK2,
    doc: helpersDoc,
    ops: [],
    packageCount: 0,
    caps: write,
    historyText: ASK1,
  })
  hop('T2.scopeEmpty', 'ASK2 empty-ops scope', scopeEmpty.action)
  const huge = {
    op: 'line_hunk',
    path: 'src/helpers.ts',
    start: 20,
    end: 19,
    text: `export function nums() { return [${Array.from({ length: 201 }, (_, i) => 200 + i).join(',')}] }`,
  }
  const scopeHuge = scoreCopilotScope({
    userMessage: ASK2,
    doc: helpersDoc,
    ops: [huge],
    packageCount: 3,
    caps: write,
    historyText: ASK1,
  })
  hop('T2.scopeHuge', 'ASK2 oversize LLM ops', { action: scopeHuge.action, sheet: scopeHuge.sheet ?? null })
  hop('T2.salvage', 'named incrementer salvages bite', namedIncrementCanSalvageBite(helpersDoc, ASK2, ASK1))
  const op = fallbackNamedHelperOp(helpersDoc, ASK2, ASK1)
  hop('T2.hunk', 'fallback hunk', op && op.op === 'line_hunk' ? op.text.trim().split('\n')[0] : null)
  hop('T2.first', 'not first turn on ASK2', isCopilotFirstTurn(sittingAfterAsk2, ASK2))
}

{
  const prior = priorCandidate(sittingAfterAsk3, ASK3)
  hop('T3.prior', 'prior substance for ASK3', prior === ASK2)
  hop('T3.follow', 'ASK3 is follow-through', isCopilotFollowThrough(ASK3))
  hop('T3.thread', 'ASK3 thread intent', inferCopilotThreadIntent(ASK3, write, prior).kind)
}

{
  const prior = priorCandidate(sittingAfterAsk4, ASK4)
  hop('T4.prior', 'prior substance for ASK4', prior)
  hop('T4.skipHi', 'ASK4 does not latch onto hi-I-just-asked', prior !== ASK3 && !/hi I just asked/i.test(prior))
  hop('T4.follow', 'ASK4 is follow-through', isCopilotFollowThrough(ASK4))
  hop('T4.thread', 'ASK4 thread intent', inferCopilotThreadIntent(ASK4, write, prior).kind)
  hop('T4.first', 'not first turn on ASK4', isCopilotFirstTurn(sittingAfterAsk4, ASK4))
  hop('T4.peel', 'peel still has ASK2', peelTurns(sittingAfterAsk4, ASK4).some((t) => t.text === ASK2))
  const dud = deterministicAssistReply('clarify', 'coding', { hasThread: true, priorAsk: prior })
  hop('T4.dudQuote', 'thread dud quotes ASK2 not ASK3', dud)
  hop(
    'T4.nameAsk',
    'name-confirm compose is dud',
    isComposeDud(
      'Would you like the new function to be named increment200To400, or do you have a different name in mind?',
      'assist',
    ),
  )
}

assert.equal(inferCopilotIntent(ASK1, write).kind, 'edit')
assert.deepEqual(parseIncrementRange(ASK1), { start: 1, end: 200 })
assert.equal(inferCopilotIntent(ASK2, write).kind, 'edit')
assert.deepEqual(parseIncrementRange(ASK2), { start: 200, end: 400 })
assert.equal(
  scoreCopilotScope({
    userMessage: ASK2,
    doc: helpersDoc,
    ops: [],
    packageCount: 0,
    caps: write,
    historyText: ASK1,
  }).action,
  'ok',
  'a second named helper on the bound file is substance-ok',
)
assert.equal(namedIncrementCanSalvageBite(helpersDoc, ASK2, ASK1), true)
{
  const op = fallbackNamedHelperOp(helpersDoc, ASK2, ASK1)
  assert.ok(op && op.op === 'line_hunk')
  assert.match(op.text, /increment200To400/)
  assert.match(op.text, /i = 200/)
  assert.equal(/incrementOneTo400/.test(op.text), false)
}
assert.equal(isCopilotFirstTurn(sittingAfterAsk2, ASK2), false)
assert.equal(priorCandidate(sittingAfterAsk3, ASK3), ASK2)
assert.equal(inferCopilotThreadIntent(ASK3, write, ASK2).kind, 'edit')
assert.equal(priorCandidate(sittingAfterAsk4, ASK4), ASK2)
assert.equal(priorCandidate(sittingAfterAsk4, ASK4).includes('hi I just asked'), false)
assert.equal(inferCopilotThreadIntent(ASK4, write, ASK2).kind, 'edit')
assert.equal(isCopilotFollowThrough(ASK4), true)
assert.equal(isCopilotFirstTurn(sittingAfterAsk4, ASK4), false)
{
  const dud = deterministicAssistReply('clarify', 'coding', {
    hasThread: true,
    priorAsk: priorCandidate(sittingAfterAsk4, ASK4),
  })
  assert.match(dud, /200 to 400/)
  assert.equal(/hi I just asked/i.test(dud), false)
}
assert.equal(
  isComposeDud(
    'Would you like the new function to be named increment200To400, or do you have a different name in mind?',
    'assist',
  ),
  true,
)

{
  const LOOP =
    'hi pls in my ts file can you add a helper funnction template for a for loop that loops 200 times?'
  hop('T5.intent', 'for-loop 200 times is edit', inferCopilotIntent(LOOP, write).kind)
  hop('T5.loop', 'loop count', parseLoopCount(LOOP))
  const loopOp = fallbackNamedHelperOp(helpersDoc, LOOP)
  hop('T5.hunk', 'loop hunk name', loopOp && loopOp.op === 'line_hunk' ? /loop200Times/.test(loopOp.text) : false)
  hop('T5.sample', 'not sampleCase', loopOp ? /sampleCase/.test(loopOp.text) : true)
  hop('T5.follow', 'ps add it is follow-through', isCopilotFollowThrough('ps add it'))
  const recaps = Array.from({ length: 10 }, (_, i) => ({
    role: 'assistant',
    text: `You are in the Consistent cache updater section ${i}. Your task is to implement the updateCache function that updates a distributed cache while ensuring consistency across nodes.`,
  }))
  const longSitting = [...recaps, { role: 'candidate', text: LOOP }]
  hop('T5.peel', 'helper ask survives recaps', peelTurns(longSitting, 'ps add it').some((t) => t.text === LOOP))
  hop('T5.first', 'not first turn after recaps', isCopilotFirstTurn(longSitting, 'ps add it'))
  assert.equal(inferCopilotIntent(LOOP, write).kind, 'edit')
  assert.equal(parseLoopCount(LOOP), 200)
  assert.ok(loopOp && loopOp.op === 'line_hunk')
  assert.match(loopOp.text, /loop200Times/)
  assert.equal(/sampleCase/.test(loopOp.text), false)
  assert.equal(isCopilotFollowThrough('ps add it'), true)
  assert.equal(peelTurns(longSitting, 'ps add it').some((t) => t.text === LOOP), true)
  assert.equal(isCopilotFirstTurn(longSitting, 'ps add it'), false)
}

{
  const CASE_ASK =
    'help me write. Case Statement with three cases. Just name them case one, case two and case three in the helper function .py'
  const pyDoc = {
    kind: 'coding',
    generation: 1,
    snapshotHash: 'h',
    selection: { path: 'src/helpers.ts' },
    coding: {
      activeId: 'src/helpers.ts',
      files: [
        { path: 'src/helpers.ts', content: 'export const seed = 0\n' },
        { path: 'src/helpers.py', content: 'def is_newer_version(current, incoming):\n    return False\n' },
        { path: 'src/solve.ts', content: 'export function updateCache() {}\n' },
      ],
    },
  }
  hop('T6.intent', 'three-case helper is edit', inferCopilotIntent(CASE_ASK, write).kind)
  hop('T6.labels', 'case labels', parseCaseLabels(CASE_ASK))
  hop('T6.salvage', 'oversize packages salvage', namedIncrementCanSalvageBite(pyDoc, CASE_ASK))
  const caseOp = fallbackNamedHelperOp(pyDoc, CASE_ASK)
  hop('T6.path', 'bound py helper', caseOp && caseOp.path)
  hop('T6.sample', 'not sample_case', caseOp ? /sample_case/.test(caseOp.text) : true)
  assert.equal(inferCopilotIntent(CASE_ASK, write).kind, 'edit')
  assert.deepEqual(parseCaseLabels(CASE_ASK), ['case one', 'case two', 'case three'])
  assert.equal(namedIncrementCanSalvageBite(pyDoc, CASE_ASK), true)
  assert.ok(caseOp && caseOp.op === 'line_hunk')
  assert.equal(caseOp.path, 'src/helpers.py')
  assert.match(caseOp.text, /case "case one"/)
  assert.equal(/sample_case/.test(caseOp.text), false)
}

console.log(`copilotConverse.gauge: ${hops.length} hops ok`)
