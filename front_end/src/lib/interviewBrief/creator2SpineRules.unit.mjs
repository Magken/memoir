import assert from 'node:assert/strict'
import {
  earlierPhaseOptions,
  earlierTopicOptions,
  earlierToolOptions,
  forwardJumpOptions,
  isForwardJump,
  priorSpineSets,
  scrubWhenToEarlier,
} from './creator2SpineRules.ts'

const phases = [
  { id: 'ph.a', title: 'A' },
  { id: 'ph.b', title: 'B' },
  { id: 'ph.c', title: 'C' },
]

assert.deepEqual(
  earlierPhaseOptions(phases, 'ph.b').map((p) => p.id),
  ['ph.a'],
)
assert.deepEqual(
  forwardJumpOptions(phases, 'ph.a').map((p) => p.id),
  ['ph.b', 'ph.c'],
)
assert.equal(isForwardJump(['ph.a', 'ph.b', 'ph.c'], 'ph.a', 'ph.c'), true)
assert.equal(isForwardJump(['ph.a', 'ph.b', 'ph.c'], 'ph.c', 'ph.a'), false)

const talks = [
  { id: 'ph.a', title: 'Warmup', topicId: 'topic.warmup' },
  { id: 'ph.b', title: 'Conflict', topicId: 'topic.conflict' },
]
assert.deepEqual(
  earlierTopicOptions(talks, 'ph.b').map((t) => t.id),
  ['topic.warmup'],
)
assert.deepEqual(earlierTopicOptions(talks, 'ph.a'), [])

const tools = [
  { id: 'ph.form', title: 'Form', toolRef: 'tool.form' },
  { id: 'ph.code', title: 'Code', toolRef: 'tool.code' },
]
assert.deepEqual(
  earlierToolOptions(tools, 'ph.code').map((t) => t.id),
  ['tool.form'],
)

{
  const spine = [
    { id: 'ph.form', toolRef: 'tool.form' },
    { id: 'ph.talk', topicId: 'topic.a' },
    { id: 'ph.late', topicId: 'topic.b' },
  ]
  const prior = priorSpineSets(spine, 'ph.late')
  const scrubbed = scrubWhenToEarlier(
    {
      all: [
        { toolPassed: 'tool.form' },
        { targetEquals: { topicId: 'topic.b', key: 'x', value: '1' } },
        { phaseCompleted: 'ph.talk' },
      ],
    },
    prior,
  )
  assert.deepEqual(scrubbed, {
    all: [{ toolPassed: 'tool.form' }, { phaseCompleted: 'ph.talk' }],
  })

  const draftKept = scrubWhenToEarlier(
    {
      all: [{ toolPassed: '' }, { phaseCompleted: '' }],
    },
    prior,
  )
  assert.deepEqual(draftKept, {
    all: [{ toolPassed: '' }, { phaseCompleted: '' }],
  })
}

console.log('creator2SpineRules.unit: ok')
