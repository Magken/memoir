/**
 * Collector sitting-read from grains — live Results without Edge narrative.
 * Run: npx tsx front_end/src/lib/interviewRunApi/collectSittingRead.unit.mjs
 */
import assert from 'node:assert/strict'
import { collectSittingRead } from './collectSittingRead.ts'
import { reportProseLooksFragment } from './reportDialect.ts'
import { emptyInterviewResponse } from './interviewResponse.ts'
import { scoreAttempt } from './scoreAttempt.ts'

const brief = {
  phases: [
    { id: 'ph.form', kind: 'tool', toolRef: 'tool.form', title: 'Eligibility' },
    { id: 'ph.talk', kind: 'discussion', topicId: 'topic.a', title: 'Opening' },
    { id: 'ph.code', kind: 'tool', toolRef: 'tool.code', title: 'Coding' },
    { id: 'ph.skip', kind: 'discussion', topicId: 'topic.b', title: 'Close' },
  ],
  tools: {
    'tool.form': { type: 'form', title: 'Form' },
    'tool.code': { type: 'coding', title: 'Coding' },
  },
  topicLibrary: [{ id: 'topic.a', label: 'Opening' }],
  definition: { meta: { title: 'Sitting read fixture', proposedMinutes: 45 } },
}

const response = {
  ...emptyInterviewResponse('fixture:sitting-read'),
  completedPhaseIds: ['ph.form', 'ph.talk', 'ph.code'],
  skippedPhaseIds: ['ph.skip'],
  analysis: {
    ...emptyInterviewResponse('fixture:sitting-read').analysis,
    topics: {
      'topic.a': {
        status: 'filled',
        synthesisText: 'Named the incidents as hers. Leftover dump should not become the Overview note.',
        targets: {},
        byTemplate: {
          'synth.topic.v1': {
            templateId: 'synth.topic.v1',
            hostRef: 'topic.a',
            grain: 'topic_end',
            order: 1,
            status: 'filled',
            result: { boardSummary: 'Named the incidents as hers.' },
            justification: 'Named the incidents as hers.',
          },
        },
      },
    },
    tools: {
      'tool.form': {
        'mark.form.key.v1': {
          templateId: 'mark.form.key.v1',
          hostRef: 'tool.form',
          grain: 'after_tool',
          order: 1,
          status: 'filled',
          result: { gradedScore: 14, gradedMax: 16, passed: true },
        },
      },
      'tool.code': {
        'mark.code.tests.v1': {
          templateId: 'mark.code.tests.v1',
          hostRef: 'tool.code',
          grain: 'after_tool',
          order: 1,
          status: 'filled',
          result: { passedCount: 9, total: 10, passed: true },
        },
        'mark.code.method.v1': {
          templateId: 'mark.code.method.v1',
          hostRef: 'tool.code',
          grain: 'after_tool',
          order: 2,
          status: 'filled',
          result: { composite: 0.75 },
        },
      },
    },
    toolPackages: {
      'tool.form': { boardSummary: 'Cleared the work-authorization screen.' },
      'tool.code': { boardSummary: 'Both drills finished inside the window.' },
    },
  },
}

const scored = scoreAttempt({ brief, response })
const rows = collectSittingRead({ brief, response, scored })

assert.equal(rows.length, 4)
assert.equal(rows[0].sectionId, 'ph.form')
assert.match(rows[0].body, /eligibility screen|work-authorization|form/i)
assert.ok(rows[0].tags.some((t) => t.label === '14 / 16' && t.hint === 'Form items'))
assert.match(rows[0].brief.intro, /Eligibility|pass or fail/i)
assert.ok(rows[0].brief.strengths.length >= 1 && rows[0].brief.strengths.length <= 3)
assert.match(rows[0].brief.scoreWhy, /eligibility screen|overall score/i)
assert.equal(rows[1].sectionId, 'ph.talk')
assert.match(rows[1].body, /incidents/)
assert.match(rows[1].body, /Leftover dump/, 'synthesisText stays when grain blocks exist')
assert.ok(!/Leftover dump/.test(JSON.stringify(rows[1].brief)), 'glance brief is not leftover')
assert.match(rows[1].brief.intro, /Opening|conversation/i)
assert.equal(rows[2].sectionId, 'ph.code')
assert.ok(rows[2].tags.some((t) => t.hint === 'Tests'))
assert.ok(rows[2].tags.some((t) => t.hint === 'Method'))
assert.match(rows[2].brief.scoreWhy, /Tests sit/i)
assert.equal(rows[3].sectionId, 'ph.skip')
assert.match(rows[3].body, /forfeit/i)
assert.match(rows[3].brief.weaknesses.join(' '), /forfeit/i)
assert.ok(
  rows.every((row) =>
    [row.brief.intro, row.brief.scoreWhy, ...row.brief.strengths, ...row.brief.weaknesses].every(
      (line) => !reportProseLooksFragment(line),
    ),
  ),
  'Overview brief lines must be complete sentences',
)
assert.ok(rows.every((row) => !/\bthe (?:day|sitting|board)\b/i.test(`${row.body} ${row.brief?.intro ?? ''} ${row.brief?.scoreWhy ?? ''}`)))

{
  const pendingResponse = {
    ...response,
    analysis: {
      ...response.analysis,
      tools: {
        ...response.analysis.tools,
        'tool.code': {
          'mark.code.tests.v1': {
            templateId: 'mark.code.tests.v1',
            hostRef: 'tool.code',
            grain: 'after_tool',
            order: 1,
            status: 'pending',
            result: null,
            justification: '',
          },
        },
      },
    },
  }
  const pendingScored = scoreAttempt({ brief, response: pendingResponse })
  const pendingRows = collectSittingRead({
    brief,
    response: pendingResponse,
    scored: pendingScored,
  })
  const code = pendingRows.find((r) => r.sectionId === 'ph.code')
  assert.ok(code.tags.some((t) => t.label === 'Marking' && t.hint === 'Marking'))
  assert.ok(!code.tags.some((t) => t.hint === 'Tests'))
}

{
  const sigOnly = {
    ...response,
    analysis: {
      ...response.analysis,
      tools: {
        ...response.analysis.tools,
        'tool.code': {
          ...response.analysis.tools['tool.code'],
          'sig.clarity.v1': {
            templateId: 'sig.clarity.v1',
            hostRef: 'tool.code',
            grain: 'after_tool',
            order: 9,
            status: 'pending',
            result: null,
            justification: '',
          },
        },
      },
    },
  }
  const sigRows = collectSittingRead({
    brief,
    response: sigOnly,
    scored: scoreAttempt({ brief, response: sigOnly }),
  })
  const code = sigRows.find((r) => r.sectionId === 'ph.code')
  assert.ok(code.tags.some((t) => t.hint === 'Tests'), 'clarity leftover is not a score stop')
  assert.ok(!code.tags.some((t) => t.hint === 'Marking'))
}

{
  const dumpResponse = {
    ...response,
    analysis: {
      ...response.analysis,
      tools: {
        ...response.analysis.tools,
        'tool.form': {
          'mark.form.key.v1': {
            templateId: 'mark.form.key.v1',
            hostRef: 'tool.form',
            grain: 'after_tool',
            order: 1,
            status: 'filled',
            result: {
              gradedScore: 0,
              gradedMax: 1,
              passed: false,
              byItem: [{ questionId: 'q.email', status: 'miss', earned: 0, max: 1 }],
            },
            justification: 'Missed the contact email.',
            dimensions: [
              { key: 'gate', label: 'Gate', score: 'miss', notes: 'The contact email was empty.' },
            ],
          },
        },
        'tool.code': {
          'mark.code.tests.v1': {
            templateId: 'mark.code.tests.v1',
            hostRef: 'tool.code',
            grain: 'after_tool',
            order: 1,
            status: 'filled',
            result: {
              passedCount: 0,
              total: 2,
              status: 'runtime_error',
              failing: ['t1', 't2'],
              boardSummary: 'The program crashed with 0/2 cases passed.',
            },
            justification: 'The program crashed.',
          },
          'mark.code.method.v1': {
            templateId: 'mark.code.method.v1',
            hostRef: 'tool.code',
            grain: 'after_tool',
            order: 2,
            status: 'filled',
            result: { boardSummary: 'The solve function only throws not implemented.' },
            justification: 'The solve function only throws not implemented.',
            dimensions: [
              { key: 'approach', label: 'Approach', score: 'weak', notes: 'No plan past a stub throw.' },
            ],
          },
        },
      },
      toolPackages: {
        'tool.form': {
          items: [{ id: 'q.email', label: 'Work email' }],
        },
      },
    },
  }
  const dumpRows = collectSittingRead({
    brief,
    response: dumpResponse,
    scored: scoreAttempt({ brief, response: dumpResponse }),
  })
  const form = dumpRows.find((r) => r.sectionId === 'ph.form')
  const code = dumpRows.find((r) => r.sectionId === 'ph.code')
  assert.match(String(form.body), /### /)
  assert.match(form.brief.weaknesses.join(' '), /Work email/)
  assert.ok(!/q\.email/.test(String(form.body)))
  assert.ok(!/q\.email/.test(String(form.detail ?? '')))
  assert.ok(!/q\.email/.test(JSON.stringify(form.brief)))
  assert.ok(!/Missed items: q\./.test(JSON.stringify(form)))
  assert.match(String(code.body), /### /)
  assert.match(code.brief.weaknesses.join(' '), /hidden test/)
  assert.ok(!/Failing cases: t1/.test(JSON.stringify(code)))
  assert.ok(!/runtime_error/.test(String(code.body)))
  assert.ok(!/runtime_error/.test(JSON.stringify(code.brief)))
  assert.ok(!/No plan past a stub throw/.test(String(code.body)), 'axis notes are the radar Why home')
  assert.ok(
    !/solve function only throws/.test(String(code.body)),
    'dimension leftover is radar Why, not collapsed leftover',
  )
  assert.ok(code.brief.weaknesses.length >= 1)
  assert.ok(form.brief.weaknesses.length >= 1)
}

console.log('collectSittingRead.unit: ok')
