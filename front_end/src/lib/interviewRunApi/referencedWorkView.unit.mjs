/**
 * Candidate-visible referenced-section views — earlier-only, no answerKey.
 * Run: npx tsx front_end/src/lib/interviewRunApi/referencedWorkView.unit.mjs
 */
import assert from 'node:assert/strict'
import { emptyInterviewResponse } from './interviewResponse.ts'
import { buildReferencedWorkViews } from './referencedWorkView.ts'

const brief = {
  phases: [
    { id: 'ph.form', title: 'Eligibility', kind: 'tool', toolRef: 't.form' },
    { id: 'ph.code', title: 'Two Sum', kind: 'tool', toolRef: 't.code' },
    {
      id: 'ph.talk',
      title: 'Debrief',
      kind: 'discussion',
      topicId: 'tp.debrief',
      references: { phaseIds: ['ph.code', 'ph.form'] },
    },
  ],
  tools: {
    't.form': { type: 'form_quiz' },
    't.code': { type: 'coding' },
  },
  topicLibrary: [{ id: 'tp.debrief', probes: [] }],
}

const response = emptyInterviewResponse('fixture:ref-view')
response.messages.push({
  id: 'm1',
  phaseId: 'ph.code',
  topicId: null,
  role: 'candidate',
  text: 'I used a hashmap',
  at: new Date().toISOString(),
  probeId: null,
  kind: 'answer',
})

const views = buildReferencedWorkViews({
  brief,
  briefId: 'fixture:ref-view',
  consumingPhaseId: 'ph.talk',
  response,
  loadTape: () => null,
})
assert.equal(views.length, 2)
assert.equal(views[0].phaseId, 'ph.code')
assert.equal(views[0].kind, 'coding')
assert.equal(views[0].empty, true, 'no tape → coding view is empty, not the seed workspace')
assert.equal(views[0].codingTape, null)
assert.equal(views[1].phaseId, 'ph.form')
assert.equal(views[1].empty, true)

const codingTape = {
  schema: 'vurify/editor-tape',
  schemaVersion: 1,
  briefId: 'fixture:ref-view',
  attemptId: 'a1',
  phaseId: 'ph.code',
  kind: 'coding',
  startedAt: '2026-08-31T00:00:00.000Z',
  endedAt: '2026-08-31T00:01:00.000Z',
  durationMs: 60_000,
  initial: {
    files: [
      {
        path: 'src/solve.ts',
        language: 'typescript',
        content: 'export const solve = () => 1',
      },
    ],
    activeId: 'src/solve.ts',
  },
  events: [{ t: 60_000, type: 'session_end' }],
  final: {
    files: [
      {
        path: 'src/solve.ts',
        language: 'typescript',
        content: 'export const solve = () => 2',
      },
    ],
    activeId: 'src/solve.ts',
  },
}

const taped = buildReferencedWorkViews({
  brief,
  briefId: 'fixture:ref-view',
  consumingPhaseId: 'ph.talk',
  response,
  loadTape: (_b, phaseId) => (phaseId === 'ph.code' ? codingTape : null),
})
assert.equal(taped[0].empty, false)
assert.equal(taped[0].codingTape?.phaseId, 'ph.code')
assert.ok(taped[0].codingRunTests)
assert.ok(
  taped[0].codingWorkspace?.files?.some((f) => f.path === 'src/solve.ts'),
  'tape overlay keeps the captured solve file',
)

const talkBrief = {
  ...brief,
  phases: [
    {
      id: 'ph.open',
      title: 'Opening',
      kind: 'discussion',
      topicId: 'tp.open',
    },
    {
      id: 'ph.later',
      title: 'Follow-up',
      kind: 'discussion',
      topicId: 'tp.later',
      references: { phaseIds: ['ph.open'] },
    },
  ],
}
const talkResponse = emptyInterviewResponse('fixture:ref-talk')
talkResponse.messages.push(
  {
    id: 'a1',
    phaseId: 'ph.open',
    topicId: 'tp.open',
    role: 'assistant',
    text: 'Tell me about a project.',
    at: new Date().toISOString(),
    probeId: 'p1',
    kind: 'opener',
  },
  {
    id: 'c1',
    phaseId: 'ph.open',
    topicId: 'tp.open',
    role: 'candidate',
    text: 'I owned the cache hotfix.',
    at: new Date().toISOString(),
    probeId: 'p1',
    kind: 'answer',
  },
)
const talkViews = buildReferencedWorkViews({
  brief: talkBrief,
  briefId: 'fixture:ref-talk',
  consumingPhaseId: 'ph.later',
  response: talkResponse,
  loadTape: () => null,
})
assert.equal(talkViews.length, 1)
assert.equal(talkViews[0].empty, false)
assert.equal(talkViews[0].talkTurns.length, 2)
assert.doesNotMatch(JSON.stringify(talkViews), /answerKey|oracle|hidden expected/i)

assert.deepEqual(
  buildReferencedWorkViews({
    brief,
    briefId: 'fixture:ref-view',
    consumingPhaseId: 'ph.form',
    response,
    loadTape: () => null,
  }),
  [],
)

console.log('referencedWorkView: ok')
