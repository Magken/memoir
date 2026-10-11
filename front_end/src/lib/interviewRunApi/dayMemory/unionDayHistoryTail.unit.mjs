/**
 * Union lean dayHistoryTail with retrieve hits.
 * Run: npx tsx front_end/src/lib/interviewRunApi/dayMemory/unionDayHistoryTail.unit.mjs
 */
import assert from 'node:assert/strict'
import { unionDayHistoryTail } from './unionDayHistoryTail.ts'

const lean = [
  { role: 'candidate', text: 'I owned the outage.', phaseId: 'ph.talk' },
  { role: 'assistant', text: 'What was the blast radius?', phaseId: 'ph.talk' },
]

assert.deepEqual(
  unionDayHistoryTail(lean, { dayHits: [], phaseHits: [] }),
  lean,
  'empty retrieve keeps lean tail',
)

const extra = unionDayHistoryTail(lean, {
  dayHits: [{ role: 'candidate', text: 'CV name Jordan', phaseId: 'ph.talk', at: 't' }],
  phaseHits: [],
})
assert.equal(extra.length, 3)
assert.ok(extra.some((r) => r.text === 'I owned the outage.'))
assert.ok(extra.some((r) => r.text === 'CV name Jordan'))

const dup = unionDayHistoryTail(lean, {
  dayHits: [{ role: 'candidate', text: 'I owned the outage.', phaseId: 'ph.talk' }],
  phaseHits: [],
})
assert.equal(dup.length, 2, 'duplicate lean+retrieve rows collapse')

console.log('unionDayHistoryTail: ok')
