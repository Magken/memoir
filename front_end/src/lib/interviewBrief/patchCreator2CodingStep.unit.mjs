/**
 * Unit checks for Creator 2 coding / writing section patches.
 * Run: npx tsx front_end/src/lib/interviewBrief/patchCreator2CodingStep.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mapCreator2BriefToTimeline } from './mapCreator2BriefToTimeline.ts'
import { patchCreator2CodingStep } from './patchCreator2CodingStep.ts'
import { patchCreator2DocStep } from './patchCreator2DocStep.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  readFileSync(join(__dirname, 'fixtures/creator2ComprehensiveBrief.json'), 'utf8'),
)

{
  const mapped = mapCreator2BriefToTimeline(structuredClone(fixture))
  const coding = mapped.steps.find((s) => s.id === 'ph.code')
  assert.ok(coding?.codingEditor, 'coding step should expose codingEditor')
  assert.equal(coding.codingEditor.tests.entryPoint, 'twoSum')
  assert.equal(coding.codingEditor.tests.cases.length, 3)
  assert.deepEqual(coding.codingEditor.tests.cases[0].args, [
    [2, 7, 11, 15],
    9,
  ])
  assert.equal(coding.codingEditor.tests.cases[0].compare, 'deep_equal')
  assert.equal(coding.codingEditor.tests.cases[0].hidden, false)
  assert.ok(
    coding.codingEditor.tests.referenceSolution?.includes('twoSum'),
    'reference solution should be present',
  )
  assert.ok(
    coding.codingEditor.workspace.files.some((f) => f.path.includes('solve')),
    'coding workspace should include solve file',
  )
  assert.ok(
    coding.codingEditor.workspace.files.some((f) => f.path === 'tests/cases.json'),
    'coding workspace should include tests/cases.json',
  )
  assert.deepEqual(coding.codingEditor.languages, ['typescript', 'python'])
  assert.equal(coding.codingEditor.defaultLanguage, 'typescript')
  assert.ok(
    coding.tags?.some((t) => t.label === 'TS' && t.glyph === 'lang'),
    'timeline should expose a TS language tag',
  )
  assert.ok(
    coding.tags?.some((t) => t.label === 'PY' && t.glyph === 'lang'),
    'timeline should expose a PY language tag',
  )
  assert.ok(
    coding.codingEditor.workspace.files.some((f) => f.path === 'tests/reference.ts'),
    'coding workspace should include tests/reference.ts',
  )
  assert.ok(
    coding.tags.some((t) => t.id.endsWith('.tag.tests')),
    'coding should have live test-count tag',
  )
}

{
  const doc = structuredClone(fixture)
  const mapped = mapCreator2BriefToTimeline(doc)
  const coding = mapped.steps.find((s) => s.id === 'ph.code')
  assert.ok(coding?.codingEditor)
  const casesPayload = {
    runner: 'hidden_cases_v1',
    entryPoint: 'twoSum',
    cases: [
      ...coding.codingEditor.tests.cases,
      {
        id: 't4',
        name: 'large',
        description: 'Larger array',
        args: [[1, 2, 3, 4, 5, 6], 11],
        expected: [4, 5],
        compare: 'deep_equal',
        hidden: true,
        timeoutMs: 3000,
      },
    ],
  }
  const next = {
    ...coding.codingEditor,
    sectionTitle: 'Two-sum deep dive',
    languages: ['typescript', 'python', 'go'],
    defaultLanguage: 'python',
    workspace: {
      ...coding.codingEditor.workspace,
      files: [
        ...coding.codingEditor.workspace.files.filter(
          (f) => f.path !== 'tests/cases.json' && f.path !== 'src/extra.ts',
        ),
        {
          path: 'tests/cases.json',
          language: 'json',
          content: `${JSON.stringify(casesPayload, null, 2)}\n`,
        },
        {
          path: 'src/extra.ts',
          language: 'typescript',
          content: 'export const EXTRA = 1\n',
        },
      ],
    },
    timed: true,
    limitMinutes: 25,
  }
  const patched = patchCreator2CodingStep(doc, 'ph.code', next)
  const phase = patched.phases.find((p) => p.id === 'ph.code')
  const tool = patched.tools['tool.coding.1']
  assert.equal(phase?.title, 'Two-sum deep dive')
  assert.equal(tool?.title, 'Two-sum deep dive')
  assert.deepEqual(tool?.languages, ['typescript', 'python', 'go'])
  assert.equal(tool?.defaultLanguage, 'python')
  assert.equal(tool?.tests?.entryPoint, 'twoSum')
  assert.equal(tool?.tests?.cases?.length, 4)
  assert.equal(tool?.tests?.cases?.[3]?.name, 'large')
  assert.deepEqual(tool?.tests?.cases?.[3]?.args, [[1, 2, 3, 4, 5, 6], 11])
  assert.equal(tool?.tests?.cases?.[3]?.hidden, true)
  const inline = tool?.artifact?.inline
  assert.ok(inline && typeof inline === 'object')
  assert.ok(
    /** @type {{ files?: { path: string }[] }} */ (inline).files?.some(
      (f) => f.path === 'src/extra.ts',
    ),
    'patched artifact should keep new file',
  )
  assert.ok(
    /** @type {{ files?: { path: string }[] }} */ (inline).files?.some(
      (f) => f.path === 'tests/cases.json',
    ),
    'patched artifact should keep cases.json',
  )
  assert.equal(tool?.timing?.limitMinutes, 25)

  const remapped = mapCreator2BriefToTimeline(patched)
  const again = remapped.steps.find((s) => s.id === 'ph.code')
  assert.ok(again?.codingEditor)
  assert.equal(again.codingEditor.tests.cases.length, 4)
  assert.equal(again.codingEditor.tests.entryPoint, 'twoSum')
  assert.ok(
    again.codingEditor.workspace.files.some((f) => f.path === 'src/extra.ts'),
    'map roundtrip should preserve coding files',
  )
}

{
  const mapped = mapCreator2BriefToTimeline(structuredClone(fixture))
  const writing = mapped.steps.find((s) => s.id === 'ph.essay')
  assert.ok(writing?.docEditor, 'essay step should expose docEditor')
  assert.equal(writing.docEditor.prompt.structure.length, 3)
  assert.equal(writing.docEditor.assessment.kind, 'rubric')
  assert.equal(writing.docEditor.assessment.dimensions.length, 3)
  assert.ok(
    writing.docEditor.prompt.requirements.includes('Name at least one algorithm'),
  )
}

{
  const doc = structuredClone(fixture)
  const mapped = mapCreator2BriefToTimeline(doc)
  const writing = mapped.steps.find((s) => s.id === 'ph.essay')
  assert.ok(writing?.docEditor)
  const next = {
    ...writing.docEditor,
    sectionTitle: 'Rate limiter essay',
    minWords: 150,
    maxWords: 500,
    prompt: {
      ...writing.docEditor.prompt,
      brief: 'Design a distributed rate limiter.',
      requirements: [...writing.docEditor.prompt.requirements, 'Mention sharding'],
    },
    assessment: {
      ...writing.docEditor.assessment,
      dimensions: [
        ...writing.docEditor.assessment.dimensions,
        {
          key: 'clarity',
          label: 'Clarity',
          criterion: 'How clearly the response communicates ideas.',
          bands: [
            {
              id: 'weak',
              label: '1 — Weak',
              descriptor: 'Meaning is frequently unclear.',
            },
            {
              id: 'strong',
              label: '2 — Strong',
              descriptor: 'Ideas are clear and precise throughout.',
            },
          ],
        },
      ],
    },
    document: {
      ...writing.docEditor.document,
      title: 'Rate limiter essay',
      markdown: '## Answer\n\nStarter.\n',
    },
  }
  const patched = patchCreator2DocStep(doc, 'ph.essay', next)
  const phase = patched.phases.find((p) => p.id === 'ph.essay')
  const tool = patched.tools['tool.doc.essay.optional']
  assert.equal(phase?.title, 'Rate limiter essay')
  assert.equal(tool?.title, 'Rate limiter essay')
  assert.equal(tool?.minWords, 150)
  assert.equal(tool?.maxWords, 500)
  assert.equal(tool?.prompt?.brief, 'Design a distributed rate limiter.')
  assert.ok(tool?.prompt?.requirements?.includes('Mention sharding'))
  assert.equal(tool?.assessment?.dimensions?.length, 4)
  const inline = tool?.artifact?.inline
  assert.ok(inline && typeof inline === 'object')
  assert.equal(/** @type {{ title?: string }} */ (inline).title, 'Rate limiter essay')

  const remapped = mapCreator2BriefToTimeline(patched)
  const again = remapped.steps.find((s) => s.id === 'ph.essay')
  assert.ok(again?.docEditor)
  assert.equal(again.docEditor.prompt.brief, 'Design a distributed rate limiter.')
  assert.equal(again.docEditor.assessment.dimensions.length, 4)
  assert.equal(again.docEditor.document.title, 'Rate limiter essay')
}

console.log('patchCreator2CodingStep.unit.mjs: ok')
