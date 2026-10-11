/**
 * Smoke: coding Verify modal from attempt fixture + page brief.
 * Run: npx tsx front_end/src/lib/interviewRunApi/codingVerifyModal.unit.mjs
 */
import assert from 'node:assert/strict'
import { INTERVIEW_PAGE_BRIEF_FIXTURE } from '../interviewBrief/interviewPageFixture.ts'
import {
  loadAttemptResponseFixture,
  TALK_VERIFY_ATTEMPT_FIXTURE_ID,
} from './fixtures/attempt-responses/loadAttemptResponseFixture.ts'
import { buildCodingVerifyModal } from './codingVerifyModal.ts'
import { findTimelinePhaseId } from './toolVerifyShared.ts'
import { isCodingVerifySectionKey } from './talkVerifyModal.ts'

const { response, scored, editorTapes } = await loadAttemptResponseFixture()

for (const key of ['codingTests', 'codingMethod']) {
  assert.ok(isCodingVerifySectionKey(key), key)
  const modal = buildCodingVerifyModal({
    fixtureId: TALK_VERIFY_ATTEMPT_FIXTURE_ID,
    sectionKey: key,
    sectionLabel: key,
    response,
    scored,
    brief: INTERVIEW_PAGE_BRIEF_FIXTURE,
    tapePacks: { fixture: editorTapes },
  })
  assert.equal(modal.readOnly, true, `${key} readOnly`)
  assert.equal(modal.allowRun, true, `${key} allowRun`)
  assert.equal(modal.mount.kind, 'coding', `${key} mount`)
  assert.ok(modal.tape, `${key} tape`)
  assert.equal(JSON.stringify(modal.tape).includes('HIDDEN'), false, `${key} tape no hidden`)
  assert.ok(
    modal.mount.workspace.files.some((f) => String(f.content ?? '').includes('return 1')),
    `${key} tape.final overlay`,
  )
  assert.ok(modal.assessRunTests.cases.length >= 3, `${key} assess cases`)
  assert.ok(
    modal.assessRunTests.cases.some((c) => c.hidden),
    `${key} includes hidden cases`,
  )
  assert.ok(
    modal.cards.some((c) => c.id.includes('mark.code.tests.v1')),
    `${key} tests card`,
  )
  assert.ok(
    modal.cards.some((c) => c.id.includes('mark.code.method.v1')),
    `${key} method card`,
  )
  assert.ok(modal.cards.length >= 2, `${key} card count`)
  assert.ok(modal.softBuckets.codingTests, `${key} codingTests bucket`)
  assert.ok(modal.softBuckets.codingMethod, `${key} codingMethod bucket`)
  assert.match(modal.title, /two-sum|coding/i)
}

const codingPhaseId = findTimelinePhaseId(INTERVIEW_PAGE_BRIEF_FIXTURE, 'coding')
assert.ok(codingPhaseId)
const pinned = buildCodingVerifyModal({
  fixtureId: TALK_VERIFY_ATTEMPT_FIXTURE_ID,
  sectionKey: 'codingTests',
  sectionLabel: 'Coding',
  response,
  scored,
  brief: INTERVIEW_PAGE_BRIEF_FIXTURE,
  tapePacks: { fixture: editorTapes },
  phaseId: codingPhaseId,
})
assert.equal(pinned.mount.kind, 'coding')
assert.ok(pinned.tape)
// The attempt fixture was recorded against another brief, so the phase toolRef is absent from
// analysis.tools. Pinning a phase must still bind by kind+slot rather than emptying the strip.
assert.ok(
  pinned.cards.some((c) => c.id.includes('mark.code.tests.v1')),
  'pinned phase keeps coding marks',
)

{
  const customBrief = structuredClone(INTERVIEW_PAGE_BRIEF_FIXTURE)
  const rollup = customBrief.analysis?.rollup ?? {}
  customBrief.analysis = {
    ...customBrief.analysis,
    rollup: {
      ...rollup,
      weights: { 'coding-output': 0.7, 'coding-approach': 0.3 },
      weightSections: {
        'coding-output': [codingPhaseId],
        'coding-approach': [codingPhaseId],
      },
      weightTemplates: {
        'coding-output': ['mark.code.tests.v1'],
        'coding-approach': ['mark.code.method.v1'],
      },
      weightLabels: { 'coding-output': 'Coding output', 'coding-approach': 'Coding approach' },
    },
  }
  const customModal = buildCodingVerifyModal({
    fixtureId: TALK_VERIFY_ATTEMPT_FIXTURE_ID,
    sectionKey: 'coding-output',
    sectionLabel: 'Coding output',
    response,
    scored,
    brief: customBrief,
    tapePacks: { fixture: editorTapes },
    phaseId: codingPhaseId,
  })
  assert.ok(customModal.softBuckets.codingTests, 'custom-folder brief still fills tests Verify')
  assert.ok(isCodingVerifySectionKey('codingTests'), 'old codingTests key still verifies')
}

console.log('codingVerifyModal.unit: ok')
