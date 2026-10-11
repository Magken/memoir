/**
 * buildToolAssessBody — form answerKey rehydrate + coding hidden redaction.
 * Run: npx tsx front_end/src/lib/interviewRunApi/buildToolAssessBody.unit.mjs
 */
import assert from 'node:assert/strict'
import comprehensive from '../interviewBrief/fixtures/creator2ComprehensiveBrief.json' with { type: 'json' }
import { mapCreator2BriefToTimeline } from '../interviewBrief/mapCreator2BriefToTimeline.ts'
import { buildToolAssessBody, assessAimForPhase } from './buildToolAssessBody.ts'
import { resolveDocAssessment } from '../interviewBrief/writingDocCompose.ts'
import { afterTurnTemplateIds, topicEndTemplateIds } from './buildTalkContext.ts'

const formPhase = comprehensive.phases.find((p) => p.kind === 'tool' && p.toolRef?.includes('form'))
assert.ok(formPhase, 'form phase')

const built = buildToolAssessBody({
  brief: comprehensive,
  phaseId: formPhase.id,
  artifact: {
    kind: 'form',
    document: {
      title: 'Live',
      questions: [],
      attempt: {
        startedAt: null,
        submittedAt: null,
        responses: { q1: { optionId: 'yes' } },
      },
    },
  },
  codeRun: null,
})
assert.ok(built)
assert.equal(built.body.kind, 'form')
assert.ok(built.body.document, 'document present')
const doc = built.body.document
assert.ok(
  doc.answerKey != null ||
    (doc.questions && doc.questions.some((q) => q && typeof q === 'object')),
  'authored form fields present for scoring',
)
assert.deepEqual(built.body.responses, { q1: { optionId: 'yes' } })

const ids = [
  'iv.delivery.v1',
  'iv.ownership.v1',
  'iv.content.v1',
  'synth.topic.v1',
  'iv.question.v1',
]
assert.deepEqual(afterTurnTemplateIds(ids), ['iv.delivery.v1', 'iv.question.v1'])
assert.deepEqual(afterTurnTemplateIds(['mark.assist.use.v1']), [])
assert.deepEqual(topicEndTemplateIds(ids), [
  'iv.ownership.v1',
  'iv.content.v1',
  'synth.topic.v1',
  'sig.clarity.v1',
])
assert.deepEqual(topicEndTemplateIds([...ids, 'custom.oncall-ownership']), [
  'iv.ownership.v1',
  'iv.content.v1',
  'synth.topic.v1',
  'custom.oncall-ownership',
  'sig.clarity.v1',
])

const timeline = mapCreator2BriefToTimeline(comprehensive)
const codingStep = timeline.steps.find((s) => s.codingEditor?.tests?.cases?.length)
assert.ok(codingStep, 'coding step with cases')
const authoredCases = codingStep.codingEditor.tests.cases
const hiddenAuthored = authoredCases.find((c) => c.hidden) ?? {
  ...authoredCases[0],
  id: 'unit_hidden_case',
  hidden: true,
}
const visibleAuthored = authoredCases.find((c) => !c.hidden) ?? authoredCases[0]

const codingBuilt = buildToolAssessBody({
  brief: comprehensive,
  phaseId: codingStep.id,
  artifact: {
    kind: 'coding',
    payload: {
      schemaVersion: 1,
      files: [{ path: 'src/solve.ts', content: 'export function solve() { return 1 }' }],
    },
    activeLanguage: 'typescript',
  },
  codeRun: {
    passed: false,
    passedCount: 0,
    total: 2,
    status: 'ok',
    cases: [
      {
        id: visibleAuthored.id,
        name: visibleAuthored.name ?? 'visible',
        passed: false,
        message: 'assert failed',
      },
      {
        id: hiddenAuthored.id,
        name: hiddenAuthored.name ?? 'hidden',
        passed: false,
        message: 'expected [1,2] got []',
      },
    ],
    lines: [`FAIL ${hiddenAuthored.id} expected [1,2]`, 'suite done'],
  },
})
assert.ok(codingBuilt)
assert.equal(codingBuilt.body.kind, 'coding_bundle')
assert.match(String(codingBuilt.body.source), /src\/solve\.ts:1\|/)
const hiddenCase = (codingBuilt.body.runData?.cases ?? []).find((c) => c.id === hiddenAuthored.id)
assert.ok(hiddenCase)
assert.equal(hiddenCase.hidden, true)
assert.equal(hiddenCase.message, 'Hidden case failed')
assert.doesNotMatch(String(hiddenCase.message), /expected|\[1,\s*2\]/)
const lines = codingBuilt.body.runData?.lines ?? []
assert.ok(lines.every((l) => !/expected/i.test(String(l))), 'lines redact expected')

{
  const bound = {
    ...codingBuilt,
    body: {
      ...codingBuilt.body,
      ...( { referencedEvidence: { runs: [{ failingIds: ['t3'] }] } } ),
    },
  }
  assert.ok(bound.body.referencedEvidence)
  assert.equal(codingBuilt.body.referencedEvidence, undefined, 'deterministic body omits pack unless set')
}

const codeAim = assessAimForPhase(comprehensive, 'ph.code')
assert.match(codeAim.roleTitle, /engineer/i, 'tape-path aim still carries the role')
assert.ok(codeAim.phaseTitle, 'tape-path aim names the phase')
assert.equal(assessAimForPhase(comprehensive, 'ph.missing').phaseTitle, '', 'unknown phase does not invent a title')
const stubAim = assessAimForPhase(
  {
    phases: [{ id: 'ph.code', kind: 'tool', toolRef: 'tool.code', title: 'Two sum' }],
    tools: { 'tool.code': { type: 'coding', title: 'Two sum', instructions: 'Return two indices.' } },
    definition: { meta: { roleTitle: 'Engineer' } },
  },
  'ph.code',
)
assert.equal(stubAim.phaseTitle, 'Two sum')
assert.match(stubAim.phaseInstructions, /indices/)
assert.equal(stubAim.roleTitle, 'Engineer')

// ── The essay marking matrix that is SENT is the one the results table reads ────
// These used to be derived separately: transport normalised through the timeline
// (which injects a default axis when the author wrote none) while the results read the
// raw brief. They disagreed on exactly the sections with no authored rows, so a real
// mark rendered as zeroed catalog axes. Same resolver on both sides or it drifts again.
{
  const docBrief = (assessment) => ({
    schemaVersion: 1,
    kind: 'interview_brief',
    definition: {},
    topicLibrary: [],
    analysis: {},
    phases: [{ id: 'ph.write', kind: 'tool', toolRef: 'tool.essay', title: 'Memo' }],
    tools: {
      'tool.essay': {
        type: 'doc',
        title: 'Memo',
        instructions: 'Write a memo.',
        prompt: { brief: 'Write a memo.', structure: [{ id: 's1', label: 'Decision' }], requirements: [] },
        assessment,
      },
    },
  })
  const sentMatrix = (assessment) => {
    const built = buildToolAssessBody({
      brief: docBrief(assessment),
      phaseId: 'ph.write',
      artifact: { kind: 'doc', document: { markdown: '## Your answer\n' + 'word '.repeat(40) } },
      codeRun: null,
    })
    return built?.body?.assessment
  }

  // Authored rubric: exactly the author's rows, with weight, scope, gloss and bands.
  const rubric = sentMatrix({
    kind: 'rubric',
    dimensions: [
      {
        key: 'argument',
        label: 'Argument quality',
        criterion: 'Is the claim defended?',
        weight: 0.7,
        structureIds: ['s1'],
        bands: [
          { id: 'b1', label: '1 - Thin', descriptor: 'Assertion only.' },
          { id: 'b2', label: '2 - Strong', descriptor: 'Defended.' },
        ],
      },
    ],
  })
  assert.equal(rubric.kind, 'rubric')
  assert.deepEqual(rubric.dimensions.map((d) => d.key), ['argument'])
  assert.equal(rubric.dimensions[0].weight, 0.7, 'the marker is told the authored weight')
  assert.deepEqual(rubric.dimensions[0].structureIds, ['s1'], 'the marker is told the scope')
  assert.equal(rubric.dimensions[0].criterion, 'Is the claim defended?')
  assert.equal(rubric.dimensions[0].bands.length, 2, 'the marker is given the authored depth')
  assert.ok(
    rubric.dimensions[0].bands.every((b) => typeof b.descriptor === 'string'),
    'band descriptors travel, not just labels',
  )

  // Format: graded on compliance against the author's notes.
  const fmt = sentMatrix({ kind: 'format', formatNotes: 'Decision heading, under one page.' })
  assert.equal(fmt.kind, 'format')
  assert.deepEqual(fmt.dimensions.map((d) => d.key), ['format_compliance'])
  assert.equal(fmt.dimensions[0].criterion, 'Decision heading, under one page.')
  assert.equal(fmt.formatNotes, 'Decision heading, under one page.')
  // Negative: the old behaviour graded a format section on the rubric preset.
  assert.ok(
    !fmt.dimensions.some((d) => d.key === 'task_response'),
    'a format section is not graded on the rubric preset',
  )

  // Parity: whatever is sent is what the results resolver reads, for every kind.
  for (const assessment of [
    { kind: 'rubric', dimensions: [{ key: 'a', label: 'A', bands: [{ id: 'x', label: '1' }] }] },
    { kind: 'rubric' },
    { kind: 'format', formatNotes: 'Headings required.' },
    { kind: 'format' },
    undefined,
  ]) {
    const sent = sentMatrix(assessment)
    const resolved = resolveDocAssessment(docBrief(assessment).tools['tool.essay'])
    assert.deepEqual(
      sent.dimensions.map((d) => d.key),
      resolved.dimensions.map((d) => d.key),
      `sent matrix and results matrix agree for ${JSON.stringify(assessment)}`,
    )
  }
}

console.log('buildToolAssessBody: ok')
