/**
 * buildTalkContext against staff + comprehensive fixtures.
 * Run: npx tsx front_end/src/lib/interviewRunApi/buildTalkContext.unit.mjs
 */
import assert from 'node:assert/strict'
import staff from '../interviewBrief/fixtures/staffSecurityEngineer80mHardenedLoop.json' with { type: 'json' }
import comprehensive from '../interviewBrief/fixtures/creator2ComprehensiveBrief.json' with { type: 'json' }
import {
  afterTurnTemplateIds,
  buildTalkContext,
  impliedToolTemplateIds,
  lockedToolTemplateIds,
  scheduleTalkTemplates,
  topicEndTemplateIds,
} from './buildTalkContext.ts'

const conflict = buildTalkContext({
  briefId: 'fixture:comprehensive',
  brief: comprehensive,
  phaseId: 'ph.conflict',
})
assert.ok(conflict, 'conflict TalkContext')
assert.equal(conflict.topicId, 'topic.conflict')
assert.equal(conflict.topic.depth.maxFollowUps, 3)
assert.equal(conflict.topic.depth.maxProbes, 3)
assert.equal(conflict.topic.depth.minCandidateTurns, 2)
assert.equal(conflict.topic.depth.targetMinutes, 10)
assert.ok(conflict.topic.behaviourPromptOverride)
assert.ok(conflict.topic.targets.length >= 2)
assert.equal(conflict.opener.probeId, 'p.conflict.1')
assert.equal(conflict.opener.source, 'authored_probe')
assert.ok(conflict.opener.text.includes('conflict') || conflict.opener.text.includes('disagreement'))
assert.ok(conflict.topic.analysis.templateIds.includes('iv.delivery.v1'))
assert.ok(conflict.topic.analysis.templateIds.includes('iv.ownership.v1'))
assert.deepEqual(afterTurnTemplateIds(conflict.topic.analysis.templateIds), [
  'iv.delivery.v1',
])
assert.ok(topicEndTemplateIds(conflict.topic.analysis.templateIds).includes('iv.ownership.v1'))
assert.ok(topicEndTemplateIds(conflict.topic.analysis.templateIds).includes('sig.clarity.v1'))
assert.ok(
  topicEndTemplateIds(conflict.topic.analysis.templateIds).every(
    (id) =>
      id === 'sig.clarity.v1' ||
      id.startsWith('synth.') ||
      id.startsWith('custom.') ||
      (id.startsWith('iv.') && id !== 'iv.delivery.v1' && id !== 'iv.question.v1'),
  ),
)

const ownership = buildTalkContext({
  briefId: 'fixture:staff',
  brief: staff,
  phaseId: 'ph.k5wuze',
})
assert.ok(ownership, 'staff ownership TalkContext')
assert.equal(ownership.topicId, 'topic.890lut')
assert.equal(ownership.opener.probeId, 'pr.own1')
assert.equal(ownership.opener.source, 'authored_probe')
assert.deepEqual(ownership.topic.targets, [])
assert.ok(ownership.topic.analysis.templateIds.length >= 1)
const ownershipSched = scheduleTalkTemplates(ownership.topic.analysis.templateIds, staff)
assert.equal(
  ownershipSched.dropped.filter((id) => id.startsWith('custom.')).length,
  0,
  `custom.* must not drop: ${ownershipSched.dropped.join(',')}`,
)
assert.ok(ownershipSched.topicEnd.some((id) => id.startsWith('custom.')))
assert.deepEqual(impliedToolTemplateIds('form_quiz'), [
  'mark.form.key.v1',
  'mark.form.reasoning.v1',
  'synth.tool.v1',
])
assert.deepEqual(impliedToolTemplateIds('coding'), [
  'mark.code.tests.v1',
  'mark.code.method.v1',
  'mark.code.structure.v1',
  'mark.code.approach.v1',
  'mark.code.authorship.v1',
  'synth.tool.v1',
])
assert.deepEqual(impliedToolTemplateIds('coding', { assistChat: true }), [
  'mark.code.tests.v1',
  'mark.code.method.v1',
  'mark.code.structure.v1',
  'mark.code.approach.v1',
  'mark.code.authorship.v1',
  'mark.assist.use.v1',
  'synth.tool.v1',
])
assert.deepEqual(impliedToolTemplateIds('doc'), [
  'mark.doc.essay.v1',
  'mark.doc.approach.v1',
  'mark.doc.authorship.v1',
  'synth.tool.v1',
])
assert.ok(!impliedToolTemplateIds('form_quiz', { assistChat: true }).includes('mark.assist.use.v1'))

assert.deepEqual(
  lockedToolTemplateIds({ toolType: 'coding', stored: ['mark.code.tests.v1'] }),
  impliedToolTemplateIds('coding'),
)
assert.deepEqual(
  lockedToolTemplateIds({ toolType: 'form_quiz' }),
  impliedToolTemplateIds('form_quiz'),
)
assert.deepEqual(
  impliedToolTemplateIds('writing'),
  impliedToolTemplateIds('doc'),
  'leftover tool.type writing must lock the essay bundle',
)
assert.deepEqual(impliedToolTemplateIds('essay'), impliedToolTemplateIds('doc'))
assert.deepEqual(impliedToolTemplateIds('code'), impliedToolTemplateIds('coding'))
assert.deepEqual(impliedToolTemplateIds('leetcode'), impliedToolTemplateIds('coding'))
assert.deepEqual(impliedToolTemplateIds('form'), impliedToolTemplateIds('form_quiz'))

const opening = buildTalkContext({
  briefId: 'fixture:staff',
  brief: staff,
  phaseId: 'ph.0qloid',
})
assert.ok(opening)
assert.equal(opening.isOpening, true)
assert.equal(opening.opener.probeId, 'pr.open.1')

const missing = buildTalkContext({
  briefId: 'fixture:staff',
  brief: staff,
  phaseId: 'ph.fi4fpq',
})
assert.equal(missing, null, 'tool phase is not Talk')

{
  const cards = conflict.topic.analysis.cards ?? []
  assert.ok(cards.length >= 1, 'TalkContext attaches resolved cards')
  const delivery = cards.find((c) => c.id === 'iv.delivery.v1')
  assert.ok(delivery, 'catalog card is resolved')
  assert.ok(delivery.dimensions.some((d) => d.label === 'Clarity'))
  const impact = cards.find((c) => c.id === 'custom.impact')
  if (impact) {
    assert.equal(impact.title, 'Impact evidence rubric')
    assert.ok(impact.dimensions.some((d) => d.label === 'Impact'))
  }
}

console.log('buildTalkContext: ok')
