/**
 * Creator 2 map ↔ patch identity checks (form / coding / doc / talk / shelf).
 * Run: npx tsx front_end/src/lib/interviewBrief/creator2RoundTrip.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mapCreator2BriefToTimeline } from './mapCreator2BriefToTimeline.ts'
import { patchCreator2FormStep } from './patchCreator2FormStep.ts'
import { patchCreator2CodingStep } from './patchCreator2CodingStep.ts'
import { patchCreator2DocStep } from './patchCreator2DocStep.ts'
import { patchCreator2TalkStep } from './patchCreator2TalkStep.ts'
import { patchCreator2AnalysisShelf } from './patchCreator2AnalysisShelf.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  readFileSync(join(__dirname, 'fixtures/creator2ComprehensiveBrief.json'), 'utf8'),
)

function assertFormStable(before, after, label) {
  assert.ok(before?.formEditor, `${label}: form editor present before`)
  assert.ok(after?.formEditor, `${label}: form editor present after`)
  assert.equal(after.formEditor.sectionTitle, before.formEditor.sectionTitle, label)
  assert.equal(after.formEditor.packLabel, before.formEditor.packLabel, label)
  assert.equal(after.formEditor.isGate, before.formEditor.isGate, label)
  assert.equal(after.formEditor.timed, before.formEditor.timed, label)
  assert.equal(after.formEditor.estimatedMinutes, before.formEditor.estimatedMinutes, label)
  assert.equal(after.formEditor.document.questions.length, before.formEditor.document.questions.length, label)
  assert.equal(after.formEditor.onFail, before.formEditor.onFail, label)
}

{
  const doc = structuredClone(fixture)
  const mapped = mapCreator2BriefToTimeline(doc)
  const form = mapped.steps.find((s) => s.id === 'ph.eligible')
  assert.ok(form?.formEditor, 'eligibility form step should map')
  assert.equal(form.formEditor.isGate, true)
  assert.equal(form.formEditor.estimatedMinutes, form.minutes)
  assert.ok(form.formEditor.document.questions.length >= 1)

  const patched = patchCreator2FormStep(doc, 'ph.eligible', form.formEditor)
  const remapped = mapCreator2BriefToTimeline(patched)
  assertFormStable(form, remapped.steps.find((s) => s.id === 'ph.eligible'), 'form no-op')

  const next = {
    ...form.formEditor,
    sectionTitle: 'Eligibility screen',
    packLabel: 'Gate pack',
    summaryBlurb: 'Must clear before depth.',
    estimatedMinutes: 7,
    timed: true,
    limitMinutes: 7,
  }
  const titled = patchCreator2FormStep(doc, 'ph.eligible', next)
  const titledMapped = mapCreator2BriefToTimeline(titled)
  const titledStep = titledMapped.steps.find((s) => s.id === 'ph.eligible')
  assert.equal(titledStep.formEditor.sectionTitle, 'Eligibility screen')
  assert.equal(titledStep.formEditor.packLabel, 'Gate pack')
  assert.equal(titledStep.formEditor.estimatedMinutes, 7)
  assert.equal(titledStep.formEditor.timed, true)
  assert.equal(titledStep.formEditor.limitMinutes, 7)
  assert.equal(titled.tools['tool.form.eligibility'].timing.mode, 'timed')
  assert.equal(titled.tools['tool.form.eligibility'].passThreshold?.mode, 'required_items')

  const ungated = patchCreator2FormStep(doc, 'ph.eligible', {
    ...form.formEditor,
    isGate: false,
  })
  assert.equal(ungated.tools['tool.form.eligibility'].passThreshold, undefined)
  const ungatedMapped = mapCreator2BriefToTimeline(ungated)
  assert.equal(ungatedMapped.steps.find((s) => s.id === 'ph.eligible').formEditor.isGate, false)
}

{
  const doc = structuredClone(fixture)
  const mapped = mapCreator2BriefToTimeline(doc)
  const coding = mapped.steps.find((s) => s.id === 'ph.code')
  assert.ok(coding?.codingEditor)
  const patched = patchCreator2CodingStep(doc, 'ph.code', coding.codingEditor)
  const remapped = mapCreator2BriefToTimeline(patched)
  const again = remapped.steps.find((s) => s.id === 'ph.code')
  assert.equal(again.codingEditor.sectionTitle, coding.codingEditor.sectionTitle)
  assert.equal(again.codingEditor.tests.cases.length, coding.codingEditor.tests.cases.length)
  assert.deepEqual(again.codingEditor.languages, coding.codingEditor.languages)
}

{
  const doc = structuredClone(fixture)
  const mapped = mapCreator2BriefToTimeline(doc)
  const writing = mapped.steps.find((s) => s.id === 'ph.essay')
  assert.ok(writing?.docEditor)
  const patched = patchCreator2DocStep(doc, 'ph.essay', writing.docEditor)
  const remapped = mapCreator2BriefToTimeline(patched)
  const again = remapped.steps.find((s) => s.id === 'ph.essay')
  assert.equal(again.docEditor.sectionTitle, writing.docEditor.sectionTitle)
  assert.equal(again.docEditor.assessment.dimensions.length, writing.docEditor.assessment.dimensions.length)
  assert.equal(again.docEditor.minWords, writing.docEditor.minWords)
}

{
  const doc = structuredClone(fixture)
  const mapped = mapCreator2BriefToTimeline(doc)
  const talk = mapped.steps.find((s) => s.id === 'ph.conflict')
  assert.ok(talk?.talkEditor)
  const patched = patchCreator2TalkStep(doc, 'ph.conflict', talk.talkEditor)
  const remapped = mapCreator2BriefToTimeline(patched)
  const again = remapped.steps.find((s) => s.id === 'ph.conflict')
  assert.equal(again.talkEditor.sectionTitle, talk.talkEditor.sectionTitle)
  assert.equal(again.talkEditor.probes.length, talk.talkEditor.probes.length)
  assert.equal(again.talkEditor.templateIds.length, talk.talkEditor.templateIds.length)
}

{
  const doc = structuredClone(fixture)
  const mapped = mapCreator2BriefToTimeline(doc)
  assert.ok(mapped.analysisShelf)
  const result = patchCreator2AnalysisShelf(doc, mapped.analysisShelf)
  assert.equal(result.warning, undefined, result.warning)
  const remapped = mapCreator2BriefToTimeline(result.doc)
  assert.deepEqual(remapped.analysisShelf.libraryIds, mapped.analysisShelf.libraryIds)
}

console.log('creator2RoundTrip.unit.mjs: ok')
