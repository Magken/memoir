/**
 * Smoke: load Talk Verify attempt fixture + build modal/context.
 * Run: npx tsx front_end/src/lib/interviewRunApi/talkVerifyModal.unit.mjs
 */
import assert from 'node:assert/strict'
import { INTERVIEW_PAGE_BRIEF_FIXTURE } from '../interviewBrief/interviewPageFixture.ts'
import {
  loadAttemptResponseFixture,
  TALK_VERIFY_ATTEMPT_FIXTURE_ID,
} from './fixtures/attempt-responses/loadAttemptResponseFixture.ts'
import {
  buildTalkVerifyModal,
  isTalkVerifySectionKey,
  isCodingVerifySectionKey,
  isEssayVerifySectionKey,
  isFormVerifySectionKey,
} from './talkVerifyModal.ts'
import { talkVerifyBriefSections } from './talkVerifyFromBrief.ts'
import {
  buildAssessorAidContext,
  inferAssessorAidSituation,
} from './buildAssessorAidContext.ts'

const { response, scored, talkSectionsMeta } = await loadAttemptResponseFixture()
assert.ok(Array.isArray(response.messages) && response.messages.length > 0, 'fixture messages')
assert.equal(TALK_VERIFY_ATTEMPT_FIXTURE_ID, '2026-08-12-42f8ea34')

const briefTalkSections = talkVerifyBriefSections(INTERVIEW_PAGE_BRIEF_FIXTURE)
assert.ok(briefTalkSections.length >= 3, 'brief talk sections')
assert.match(briefTalkSections[0]?.title ?? '', /Opening:/i)

for (const key of ['interviewDelivery', 'interviewContent']) {
  assert.ok(isTalkVerifySectionKey(key), key)
  const modal = buildTalkVerifyModal({
    fixtureId: TALK_VERIFY_ATTEMPT_FIXTURE_ID,
    sectionKey: key,
    sectionLabel: key,
    response,
    scored,
    briefTalkSections,
    talkSectionsMeta,
  })
  assert.ok(modal.messages.length > 0, `${key} messages`)
  assert.equal(modal.title, 'Ownership and incident impact')
  assert.match(modal.description, /incident|owned|responsibility/i)
  assert.match(modal.depthLabel, /^Probe 1 of \d+/)
  assert.ok(modal.talkSections.length >= 3, `${key} talk sections`)
  assert.equal(modal.talkSections[0]?.title, 'Ownership and incident impact')
  assert.equal(modal.talkSections[1]?.title, 'Deep API and reliability ownership')
  assert.equal(modal.talkSections[2]?.title, 'Closing questions and next steps')
  assert.notEqual(modal.title.toLowerCase(), 'interview delivery')
  assert.ok(modal.cards.some((c) => c.kind === 'general'), `${key} general card`)
  assert.ok(modal.cards.some((c) => c.kind !== 'general'), `${key} grain cards`)
  const ctx = buildAssessorAidContext({ modal })
  assert.equal(ctx.fixtureId, TALK_VERIFY_ATTEMPT_FIXTURE_ID)
  assert.equal(ctx.messages.length, modal.messages.length)
  assert.equal(inferAssessorAidSituation('find that utterance'), 'locate_utterance')
}

assert.ok(isCodingVerifySectionKey('codingTests'))
assert.ok(isCodingVerifySectionKey('codingMethod'))
assert.ok(isEssayVerifySectionKey('essay'))
assert.ok(isFormVerifySectionKey('formMark'))
assert.equal(isTalkVerifySectionKey('codingTests'), false)

// Skipped clarify turn → unscored location card (does not count toward Soft Decision)
{
  const clarifyId = 'msg.clarify.unit'
  const mini = structuredClone(response)
  mini.messages = [
    {
      id: clarifyId,
      phaseId: 'ph.open',
      topicId: mini.messages[0]?.topicId ?? 'topic.open',
      role: 'candidate',
      text: 'Can you give an example?',
      probeId: null,
      kind: 'answer',
    },
  ]
  mini.analysis = {
    ...mini.analysis,
    turns: {
      [clarifyId]: {
        'iv.delivery.v1': {
          templateId: 'iv.delivery.v1',
          hostRef: 'topic.open',
          grain: 'after_turn',
          order: 1,
          status: 'skipped',
          result: null,
          dimensions: [],
          justification:
            'Not scored — candidate asked for clarification or an example (does not count toward Soft Decision).',
          evidence: ['Can you give an example?'],
          confidence: 'low',
        },
      },
    },
  }
  const modal = buildTalkVerifyModal({
    fixtureId: TALK_VERIFY_ATTEMPT_FIXTURE_ID,
    sectionKey: 'interviewDelivery',
    sectionLabel: 'Delivery',
    response: mini,
    scored,
    briefTalkSections,
    talkSectionsMeta,
  })
  const clarify = modal.cards.find((c) => c.id === `utterance:${clarifyId}:clarify`)
  assert.ok(clarify, 'clarify card')
  assert.equal(clarify.scored, false)
  assert.equal(clarify.title, 'Clarification')
  assert.equal(clarify.dimensions.length, 0)
  assert.match(clarify.justification ?? '', /not scored/i)
}

{
  const topicId = response.messages.find((m) => m.topicId)?.topicId ?? 'topic.open'
  const withTopic = structuredClone(response)
  withTopic.messages = [
    {
      id: 'msg.cand.topic',
      phaseId: 'ph.open',
      topicId,
      role: 'candidate',
      text: 'I froze the API.',
      probeId: null,
      kind: 'answer',
    },
  ]
  withTopic.analysis.topics = {
    [topicId]: {
      status: 'filled',
      synthesisText: 'Short reviewer paragraph.',
      targets: {
        owned_decision: {
          key: 'owned_decision',
          value: 'API freeze',
          filled: true,
          evidenceRefs: [{ kind: 'message', ref: 'msg.from-ref', quote: 'I froze the API.' }],
        },
        outcome_metric: { key: 'outcome_metric', value: null, filled: false },
      },
      byTemplate: {
        'iv.ownership.v1': {
          templateId: 'iv.ownership.v1',
          hostRef: topicId,
          grain: 'topic_end',
          order: 1,
          status: 'filled',
          dimensions: [{ key: 'agency', score: 'strong' }],
          justification: 'Named the freeze.',
          evidence: ['API freeze'],
          confidence: 'med',
        },
        'custom.oncall': {
          templateId: 'custom.oncall',
          hostRef: topicId,
          grain: 'topic_end',
          order: 2,
          status: 'skipped',
          justification: 'No on-call evidence.',
          evidence: [],
          confidence: 'low',
          dimensions: [],
        },
        'synth.topic.v1': {
          templateId: 'synth.topic.v1',
          hostRef: topicId,
          grain: 'topic_end',
          order: 0,
          status: 'filled',
          justification: 'Short reviewer paragraph.',
          confidence: 'med',
        },
      },
    },
  }
  const labeledSections = [
    ...briefTalkSections,
    {
      phaseId: 'ph.open',
      topicId,
      title: 'Open',
      description: '',
      probeCount: 1,
      maxFollowUps: 0,
      targets: [
        { key: 'owned_decision', label: 'Incident owner' },
        { key: 'outcome_metric', label: 'Outcome metric' },
      ],
    },
  ]
  const modal = buildTalkVerifyModal({
    fixtureId: TALK_VERIFY_ATTEMPT_FIXTURE_ID,
    sectionKey: 'interviewContent',
    sectionLabel: 'Content',
    response: withTopic,
    scored,
    briefTalkSections: labeledSections,
    talkSectionsMeta,
  })
  assert.ok(modal.cards.some((c) => c.id === `topic:${topicId}:iv.ownership.v1` && c.scored !== false))
  const skipCard = modal.cards.find((c) => c.id === `topic:${topicId}:custom.oncall`)
  assert.ok(skipCard, 'custom skip card')
  assert.equal(skipCard.scored, false)
  assert.ok(modal.cards.some((c) => c.id === `topic:${topicId}:targets`))
  const targetCard = modal.cards.find((c) => c.id === `topic:${topicId}:targets`)
  assert.ok(targetCard.messageIds.includes('msg.from-ref'))
  assert.equal(targetCard.dimensions.find((d) => d.key === 'owned_decision')?.label, 'Incident owner')
  assert.ok(!targetCard.dimensions.some((d) => d.label === 'owned_decision' || d.label === 'outcome_metric'))
  assert.ok(modal.cards.some((c) => c.id === `topic:${topicId}:synth` && c.scored === false))
}

{
  const topicId = response.messages[0]?.topicId || 'topic.open'
  const pending = structuredClone(response)
  pending.analysis.topics = {
    [topicId]: {
      status: 'stubbed',
      synthesisText: null,
      targets: {},
      byTemplate: {
        'iv.ownership.v1': {
          templateId: 'iv.ownership.v1',
          hostRef: topicId,
          grain: 'topic_end',
          order: 1,
          status: 'pending',
          result: null,
          justification: '',
        },
      },
    },
  }
  pending.messages = pending.messages.filter((m) => m.topicId === topicId).slice(0, 2)
  const modal = buildTalkVerifyModal({
    fixtureId: TALK_VERIFY_ATTEMPT_FIXTURE_ID,
    sectionKey: 'interviewContent',
    sectionLabel: 'Content',
    response: pending,
    scored,
    briefTalkSections,
    talkSectionsMeta,
  })
  const leftover = modal.cards.find((c) => c.id === `topic:${topicId}:iv.ownership.v1`)
  assert.ok(leftover, 'pending leftover card')
  assert.equal(leftover.scored, false)
  assert.equal(leftover.status, 'pending')
}

console.log('talkVerifyModal.unit: ok')
