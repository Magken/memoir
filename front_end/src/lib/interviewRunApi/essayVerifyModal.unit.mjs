/**
 * Smoke: essay Verify modal from attempt fixture + page brief.
 * Run: npx tsx front_end/src/lib/interviewRunApi/essayVerifyModal.unit.mjs
 */
import assert from 'node:assert/strict'
import { INTERVIEW_PAGE_BRIEF_FIXTURE } from '../interviewBrief/interviewPageFixture.ts'
import {
  loadAttemptResponseFixture,
  TALK_VERIFY_ATTEMPT_FIXTURE_ID,
} from './fixtures/attempt-responses/loadAttemptResponseFixture.ts'
import { buildEssayVerifyModal } from './essayVerifyModal.ts'
import { isEssayVerifySectionKey } from './talkVerifyModal.ts'

const { response, scored, editorTapes } = await loadAttemptResponseFixture()

assert.ok(isEssayVerifySectionKey('essay'))
const modal = buildEssayVerifyModal({
  fixtureId: TALK_VERIFY_ATTEMPT_FIXTURE_ID,
  sectionKey: 'essay',
  sectionLabel: 'Essay',
  response,
  scored,
  brief: INTERVIEW_PAGE_BRIEF_FIXTURE,
  tapePacks: { fixture: editorTapes },
})

assert.equal(modal.readOnly, true)
assert.equal(modal.allowRun, false)
assert.equal(modal.mount.kind, 'doc')
assert.ok(modal.tape)
assert.equal(JSON.stringify(modal.tape).includes('answerKey'), false)
assert.match(String(modal.mount.document.markdown ?? ''), /naming the risk/)
assert.ok(modal.cards.some((c) => c.id.includes('mark.doc.essay.v1')), 'essay grain card')
assert.ok(modal.cards.length >= 1, 'card count')
assert.ok(modal.softBucket, 'essay soft bucket')
assert.match(modal.title, /ship-or-wait|memo|rate limiter|design|writing/i)

console.log('essayVerifyModal.unit: ok')
