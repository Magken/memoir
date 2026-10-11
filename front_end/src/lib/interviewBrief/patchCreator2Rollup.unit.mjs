import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mapCreator2BriefToTimeline } from './mapCreator2BriefToTimeline.ts'
import { analysisScheduleEntries, patchCreator2Rollup } from './patchCreator2Rollup.ts'
import { uniqueRollupSlug } from './rollupFolders.ts'
import {
  rebalanceSoftWeights,
  inferWeightSections,
  evenSoftShares,
  ensureSectionTemplateWeights,
  rebalanceSectionTemplateWeights,
} from './rollupWeights.ts'

const here = dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  readFileSync(join(here, 'fixtures/creator2ComprehensiveBrief.json'), 'utf8'),
)

const mapped = mapCreator2BriefToTimeline(structuredClone(fixture))
const wrap = mapped.steps.find((s) => s.kind === 'wrap')
assert.ok(wrap?.wrapEditor, 'rollup step exposes wrapEditor')
assert.equal(wrap.wrapEditor.templateId, 'rollup.attempt.v1')
assert.ok(wrap.wrapEditor.weights.length > 0)
assert.equal(fixture.analysis.rollup?.weightTemplates, undefined)
assert.ok(fixture.analysis.rollup?.weights?.['coding-work'])
assert.equal(fixture.analysis.rollup?.weights?.codingTests, undefined)
assert.ok(
  wrap.wrapEditor.weights.every((row) => !row.templateIds?.length),
  'Theme comprehensive Decision is section chips only',
)

const phaseId = fixture.phases?.[0]?.id
const patched = patchCreator2Rollup(structuredClone(fixture), {
  templateId: 'rollup.attempt.v1',
  weights: [
    { key: 'formMark', label: 'Form gate', value: 'gate_only', sectionIds: phaseId ? [phaseId] : [] },
    {
      key: 'codingTests',
      label: 'Coding tests',
      value: 0.4,
      sectionIds: phaseId ? [phaseId, phaseId] : [],
    },
    { key: 'codingMethod', label: 'Coding approach', value: 0.6, sectionIds: phaseId ? [phaseId] : [] },
  ],
})

assert.equal(patched.analysis.rollup?.templateId, 'rollup.attempt.v1')
assert.equal(patched.analysis.rollup?.weightTemplates, undefined)
assert.deepEqual(patched.analysis.rollup?.weights, {
  formMark: 'gate_only',
  codingTests: 0.4,
  codingMethod: 0.6,
})
if (phaseId) {
  assert.ok(patched.analysis.rollup?.weightSections?.codingTests?.includes(phaseId))
  assert.ok(patched.analysis.rollup?.weightSections?.codingMethod?.includes(phaseId))
}

{
  const customPatched = patchCreator2Rollup(structuredClone(fixture), {
    templateId: 'rollup.attempt.v1',
    weights: [
      {
        key: 'coding-output',
        label: 'Coding output',
        value: 0.5,
        sectionIds: phaseId ? [phaseId] : [],
      },
      {
        key: 'talk',
        label: 'Conversation',
        value: 0.5,
        sectionIds: [],
      },
    ],
  })
  assert.equal(customPatched.analysis.rollup?.weights?.['coding-output'], 0.5)
  assert.equal(
    customPatched.analysis.rollup?.weightTemplates,
    undefined,
    'Wrap save must not write folder template chips',
  )
  assert.equal(customPatched.analysis.rollup?.weightLabels?.['coding-output'], 'Coding output')
  if (phaseId) {
    assert.deepEqual(customPatched.analysis.rollup?.weightSections?.['coding-output'], [phaseId])
  }
  const remapped = mapCreator2BriefToTimeline(customPatched)
  const wrapCustom = remapped.steps.find((s) => s.kind === 'wrap')
  const row = wrapCustom?.wrapEditor?.weights.find((w) => w.key === 'coding-output')
  assert.equal(row?.label, 'Coding output')
  assert.equal(row?.templateIds, undefined)
}

{
  const skipped = patchCreator2Rollup(structuredClone(fixture), {
    templateId: 'rollup.attempt.v1',
    weights: [
      { key: '   ', label: 'Ghost', value: 0.4, sectionIds: [], templateIds: [] },
      { key: 'talk', label: 'Conversation', value: 1, sectionIds: [], templateIds: [] },
    ],
  })
  assert.equal(Object.prototype.hasOwnProperty.call(skipped.analysis.rollup?.weights ?? {}, ''), false)
  assert.equal(skipped.analysis.rollup?.weights?.talk, 1)
  assert.equal(Object.keys(skipped.analysis.rollup?.weights ?? {}).includes(''), false)
}

assert.equal(uniqueRollupSlug('', []), '')
assert.equal(uniqueRollupSlug('   ', ['talk']), '')
assert.equal(uniqueRollupSlug('Coding output', []), 'coding-output')
assert.equal(uniqueRollupSlug('Coding output', ['coding-output']), 'coding-output-2')


const end = analysisScheduleEntries(patched.analysis.schedule).find((e) => e.when === 'interview_end')
assert.deepEqual(end?.templateIds, ['rollup.attempt.v1'])

{
  const objectSched = structuredClone(fixture)
  objectSched.analysis.schedule = {
    interview_end: { when: 'interview_end', templateIds: ['rollup.old.v1'] },
  }
  const fromObject = patchCreator2Rollup(objectSched, {
    templateId: 'rollup.attempt.v1',
    weights: [{ key: 'coding-work', label: 'Coding', value: 1, sectionIds: phaseId ? [phaseId] : [] }],
  })
  const stamped = analysisScheduleEntries(fromObject.analysis.schedule).find(
    (e) => e.when === 'interview_end',
  )
  assert.deepEqual(stamped?.templateIds, ['rollup.attempt.v1'])
  assert.equal(
    Array.isArray(fromObject.analysis.schedule),
    false,
    'object schedule from Edge merge must stay an object',
  )
}

{
  const parked = patchCreator2Rollup(structuredClone(fixture), {
    templateId: 'rollup.attempt.v1',
    weights: [
      { key: 'coding-work', label: 'Coding', value: 1, sectionIds: ['ph.code'] },
      { key: 'formMark', label: 'Form', value: 0, sectionIds: ['ph.eligible'] },
    ],
  })
  assert.equal(parked.analysis.rollup?.weights?.formMark, 0)
  assert.ok(parked.analysis.rollup?.weightSections?.formMark?.includes('ph.eligible'))
  assert.equal(parked.analysis.rollup?.sectionWeights?.['ph.eligible'], 0)
  assert.equal(
    parked.analysis.rollup?.sectionWeights?.['ph.code'],
    undefined,
    'negative: counted section must not be parked at 0',
  )
}

const again = mapCreator2BriefToTimeline(patched)
const wrap2 = again.steps.find((s) => s.kind === 'wrap')
assert.equal(wrap2?.wrapEditor?.weights.find((w) => w.key === 'codingTests')?.value, 0.4)
assert.ok(
  Array.isArray(wrap2?.wrapEditor?.weights.find((w) => w.key === 'codingTests')?.sectionIds),
  'mapped weight rows carry sectionIds',
)

{
  const start = {
    formMark: 'gate_only',
    codingTests: 0.25,
    codingMethod: 0.1,
    essay: 0.15,
    interviewDelivery: 0.2,
    interviewContent: 0.3,
  }
  const raised = rebalanceSoftWeights(start, 'codingTests', 0.4)
  assert.equal(raised.formMark, 'gate_only')
  const softSum =
    Number(raised.codingTests) +
    Number(raised.codingMethod) +
    Number(raised.essay) +
    Number(raised.interviewDelivery) +
    Number(raised.interviewContent)
  assert.ok(Math.abs(softSum - 1) < 1e-6, `soft sum ${softSum}`)
  assert.equal(Number(raised.codingTests), 0.4)

  const toOne = rebalanceSoftWeights(start, 'essay', 1)
  assert.equal(Number(toOne.essay), 1)
  assert.equal(Number(toOne.codingTests), 0)
  assert.equal(Number(toOne.interviewContent), 0)

  const fromZero = rebalanceSoftWeights(
    { codingTests: 0, codingMethod: 0, essay: 0 },
    'codingTests',
    0.5,
  )
  assert.ok(Math.abs(Number(fromZero.codingTests) + Number(fromZero.codingMethod) + Number(fromZero.essay) - 1) < 1e-6)

  const parked = rebalanceSoftWeights(
    { 'coding-work': 0.5, write: 0.5, screening: 0 },
    'coding-work',
    0.6,
  )
  assert.equal(parked.screening, 0, 'unweighted folder must stay 0 when siblings rebalance')
  assert.ok(Math.abs(Number(parked['coding-work']) + Number(parked.write) - 1) < 1e-6)
}

{
  const three = evenSoftShares(['a', 'b', 'c'])
  const threeSum = three.a + three.b + three.c
  assert.ok(Math.abs(threeSum - 1) < 1e-9, `even three ${threeSum}`)
  assert.equal(evenSoftShares(['only']).only, 1)

  const ids = ['mark.code.tests.v1', 'mark.code.method.v1', 'mark.code.approach.v1']
  const coerced = ensureSectionTemplateWeights(ids, {
    'mark.code.tests.v1': 1,
    'mark.code.method.v1': 1,
    'mark.code.approach.v1': 1,
  })
  assert.equal(
    coerced['mark.code.tests.v1'] === 1 &&
      coerced['mark.code.method.v1'] === 1 &&
      coerced['mark.code.approach.v1'] === 1,
    false,
  )
  assert.ok(
    Math.abs(
      coerced['mark.code.tests.v1'] +
        coerced['mark.code.method.v1'] +
        coerced['mark.code.approach.v1'] -
        1,
    ) < 1e-9,
  )

  const missing = ensureSectionTemplateWeights(ids, undefined)
  assert.deepEqual(missing, coerced)

  const keptZero = ensureSectionTemplateWeights(ids, {
    'mark.code.tests.v1': 0,
    'mark.code.method.v1': 1,
    'mark.code.approach.v1': 1,
  })
  assert.equal(keptZero['mark.code.tests.v1'], 0)
  assert.ok(Math.abs(keptZero['mark.code.method.v1'] + keptZero['mark.code.approach.v1'] - 1) < 1e-9)

  const ratios = ensureSectionTemplateWeights(ids.slice(0, 2), {
    'mark.code.tests.v1': 0.7,
    'mark.code.method.v1': 0.3,
  })
  assert.equal(ratios['mark.code.tests.v1'], 0.7)
  assert.equal(ratios['mark.code.method.v1'], 0.3)

  const raised = rebalanceSectionTemplateWeights(
    ids,
    {
      'mark.code.tests.v1': 0.34,
      'mark.code.method.v1': 0.33,
      'mark.code.approach.v1': 0.33,
    },
    'mark.code.tests.v1',
    0.5,
  )
  assert.equal(raised['mark.code.tests.v1'], 0.5)
  assert.equal(
    raised['mark.code.method.v1'] === 0.5 && raised['mark.code.approach.v1'] === 0.5,
    false,
  )
  assert.ok(
    Math.abs(
      raised['mark.code.tests.v1'] + raised['mark.code.method.v1'] + raised['mark.code.approach.v1'] - 1,
    ) < 1e-6,
  )
  assert.equal(raised['mark.code.tests.v1'] > raised['mark.code.method.v1'], true)

  const freeze = rebalanceSectionTemplateWeights(
    ids,
    {
      'mark.code.tests.v1': 0.5,
      'mark.code.method.v1': 0.5,
      'mark.code.approach.v1': 0,
    },
    'mark.code.tests.v1',
    0.7,
  )
  assert.equal(freeze['mark.code.approach.v1'], 0)
  assert.ok(Math.abs(freeze['mark.code.tests.v1'] + freeze['mark.code.method.v1'] - 1) < 1e-6)

  const solo = ensureSectionTemplateWeights(['mark.code.tests.v1'], { 'mark.code.tests.v1': 1 })
  assert.equal(solo['mark.code.tests.v1'], 1)
}

{
  const inferred = inferWeightSections({
    phases: [
      { id: 'ph.open', kind: 'discussion', isOpening: true, title: 'Settle in' },
      { id: 'ph.form', kind: 'tool', toolRef: 't.form', title: 'Eligibility' },
      { id: 'ph.own', kind: 'discussion', title: 'Ownership under pressure' },
      { id: 'ph.code', kind: 'tool', toolRef: 't.code' },
      { id: 'ph.doc', kind: 'tool', toolRef: 't.doc' },
      { id: 'ph.close', kind: 'discussion', isClosing: true, title: 'Close' },
    ],
    tools: {
      't.form': { type: 'form_quiz' },
      't.code': { type: 'coding' },
      't.doc': { type: 'doc' },
    },
  })
  assert.deepEqual(inferred.formMark, ['ph.form'])
  assert.deepEqual(inferred.codingTests, ['ph.code'])
  assert.deepEqual(inferred.codingMethod, ['ph.code'])
  assert.deepEqual(inferred.essay, ['ph.doc'])
  assert.deepEqual(inferred.interviewContent, ['ph.open', 'ph.own'])
  assert.deepEqual(inferred.interviewDelivery, ['ph.open', 'ph.own', 'ph.close'])
}

{
  const wrapSrc = readFileSync(
    join(here, '../../components/InterviewFlowWrapEditor.tsx'),
    'utf8',
  )
  assert.equal(
    wrapSrc.includes('KNOWN_WEIGHT_KEYS.filter'),
    false,
    'Wrap editor must not cap folders to the six seed keys',
  )
  assert.match(wrapSrc, /uniqueRollupSlug\(addName/)
  assert.equal(
    wrapSrc.includes('openWeightsToAdd'),
    false,
    'header Plus leftover must be gone',
  )
  assert.equal(wrapSrc.includes('toggleTemplate'), false, 'no folder template chips')
  assert.equal(wrapSrc.includes('gradeTemplateOptions'), false, 'no grade-template chip list')
  assert.equal(
    wrapSrc.includes('theme-interview-flow-talk__attach-weights'),
    false,
    'Decision section chips stay wrapping — attach-weights is host template rows only',
  )
  assert.match(wrapSrc, /label="Folder name"/)
}

console.log('patchCreator2Rollup.unit: ok')
