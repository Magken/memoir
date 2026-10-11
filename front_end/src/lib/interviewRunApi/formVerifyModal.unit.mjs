/**
 * Smoke: form Verify modal from attempt fixture + page brief.
 * Run: npx tsx front_end/src/lib/interviewRunApi/formVerifyModal.unit.mjs
 */
import assert from 'node:assert/strict'
import { INTERVIEW_PAGE_BRIEF_FIXTURE } from '../interviewBrief/interviewPageFixture.ts'
import {
  loadAttemptResponseFixture,
  TALK_VERIFY_ATTEMPT_FIXTURE_ID,
} from './fixtures/attempt-responses/loadAttemptResponseFixture.ts'
import { buildFormVerifyModal } from './formVerifyModal.ts'
import { isFormVerifySectionKey } from './talkVerifyModal.ts'

const { response, scored, editorTapes } = await loadAttemptResponseFixture()

assert.ok(isFormVerifySectionKey('formMark'))
const modal = buildFormVerifyModal({
  fixtureId: TALK_VERIFY_ATTEMPT_FIXTURE_ID,
  sectionKey: 'formMark',
  sectionLabel: 'Form',
  response,
  scored,
  brief: INTERVIEW_PAGE_BRIEF_FIXTURE,
  tapePacks: { fixture: editorTapes },
})

assert.equal(modal.readOnly, true)
assert.ok(modal.tape)
assert.equal(JSON.stringify(modal.tape).includes('answerKey'), false, 'tape never has answerKey')
assert.ok(modal.document.answerKey, 'answerKey present')
assert.ok(Object.keys(modal.document.answerKey).length > 0, 'answerKey non-empty')
assert.ok(modal.formGate, 'formGate')
assert.equal(modal.formGate.passed, false)
assert.equal(modal.formGate.gradedScore, 4)
assert.equal(modal.formGate.gradedMax, 16)
assert.match(modal.description, /fail/i)
assert.match(modal.description, /4\/16/)
assert.ok(modal.cards.some((c) => c.id.includes('mark.form.key.v1')), 'form key card')
assert.ok(modal.cards.length >= 1, 'card count')
assert.match(modal.title, /eligibility|authorization|screening/i)
assert.ok(
  Array.isArray(modal.document.attempt?.scores) && modal.document.attempt.scores.length > 0,
  'attempt scores from grain',
)

console.log('formVerifyModal.unit: ok')
