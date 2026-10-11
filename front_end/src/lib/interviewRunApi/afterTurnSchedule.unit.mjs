/**
 * After-turn schedule: many templates, one family, or none per utterance.
 * Run: npx tsx front_end/src/lib/interviewRunApi/afterTurnSchedule.unit.mjs
 */
import assert from 'node:assert/strict'
import { planAfterTurnForUtterance } from './afterTurnSchedule.ts'

const IDS = ['iv.delivery.v1', 'iv.question.v1']

function plan(partial) {
  return planAfterTurnForUtterance({
    pendingFirstProbe: false,
    text: '',
    wordCount: 0,
    situation: 'follow_up',
    signals: [],
    afterTurnIds: IDS,
    ...partial,
  })
}

function words(text) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

{
  const text =
    'I owned the rollback on Saturday because the replica lagged. Does that match what you wanted?'
  const p = plan({
    text,
    wordCount: words(text),
    signals: ['question', 'substantive'],
  })
  assert.equal(p.mode, 'mixed')
  assert.deepEqual(p.scoreIds, IDS)
  assert.deepEqual(p.skipIds, [])
}

{
  const text =
    'I froze the API Saturday after the replica lagged and the error rate dropped twelve percent.'
  const p = plan({
    text,
    wordCount: words(text),
    signals: ['substantive'],
  })
  assert.equal(p.mode, 'answer')
  assert.deepEqual(p.scoreIds, ['iv.delivery.v1'])
  assert.deepEqual(p.skipIds, ['iv.question.v1'])
}

{
  const p = plan({
    text: 'what do you mean?',
    wordCount: 4,
    situation: 'clarify',
    signals: ['meta_clarify', 'question'],
  })
  assert.equal(p.mode, 'clarify')
  assert.deepEqual(p.scoreIds, ['iv.question.v1'])
  assert.deepEqual(p.skipIds, ['iv.delivery.v1'])
}

{
  const p = plan({
    text: 'which project',
    wordCount: 2,
    situation: 'clarify',
    signals: ['meta_clarify'],
  })
  assert.equal(p.mode, 'clarify')
  assert.deepEqual(p.scoreIds, ['iv.question.v1'])
}

{
  const p = plan({ text: 'yeah', wordCount: 1, situation: 'clarify', signals: [] })
  assert.equal(p.mode, 'none')
  assert.deepEqual(p.scoreIds, [])
  assert.deepEqual(p.skipIds, IDS)
}

{
  const p = plan({
    text: 'hi',
    wordCount: 1,
    situation: 'clarify',
    signals: ['social_rapport'],
  })
  assert.equal(p.mode, 'none')
}

{
  const p = plan({
    text: "what's the salary?",
    wordCount: 4,
    situation: 'off_topic',
    signals: ['question'],
  })
  assert.equal(p.mode, 'none', 'logistics off-topic is unsubstantiated')
}

{
  const p = plan({ pendingFirstProbe: true, text: 'yes', wordCount: 1 })
  assert.equal(p.mode, 'none')
  assert.equal(p.reason, 'name_check')
}

console.log('afterTurnSchedule: ok')
