/**
 * broaderContext helpers.
 * Run: npx tsx front_end/src/lib/interviewRunApi/dayMemory/broaderContext.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  bindPriorSectionNeeds,
  broaderContextPlan,
  coerceNeedRetrievalNeeds,
  mergeMemoryNeeds,
  mergeRetrievedPacks,
  resolvePreviousPhaseId,
  sectionIndexFromLanding,
} from './broaderContext.ts'
import { emptyRetrievedMemoryPack } from './types.ts'

const sections = sectionIndexFromLanding([
  { id: 'ph.motivation', title: 'Motivation and interests' },
  { id: 'ph.form', title: 'Eligibility form' },
  { id: 'ph.coding', title: 'Coding challenge' },
])
assert.equal(sections.length, 3)

const prev = resolvePreviousPhaseId({
  currentPhaseId: 'ph.form',
  sectionIndex: sections,
})
assert.equal(prev, 'ph.motivation')

const plan = broaderContextPlan('what did we cover before?', {
  continuing: true,
  previousSectionTitle: 'Motivation and interests',
  currentPhaseId: 'ph.form',
  sectionIndex: sections,
})
assert.ok(plan.needs.some((n) => n.sourceId === 'candidate_cv'))
assert.ok(plan.needs.some((n) => n.sourceId === 'bot_notes'))
assert.ok(plan.needs.some((n) => n.sourceId === 'phase_transcript'))
assert.ok(
  plan.needs.some(
    (n) => n.sourceId === 'phase_transcript' && n.phaseId === 'ph.motivation',
  ),
)
assert.ok(plan.needs.length <= 3)

const bound = bindPriorSectionNeeds(
  [{ sourceId: 'phase_transcript', reason: 'named', query: 'eligibility' }],
  { sectionIndex: sections, currentPhaseId: 'ph.coding' },
)
assert.equal(bound[0]?.phaseId, 'ph.form')

const merged = mergeMemoryNeeds(
  [{ sourceId: 'candidate_cv', reason: 'a' }],
  [
    { sourceId: 'candidate_cv', reason: 'dup' },
    { sourceId: 'topic_synthesis', reason: 'b' },
  ],
)
assert.equal(merged.length, 2)

const needs = coerceNeedRetrievalNeeds({
  needs: [
    { sourceId: 'candidate_cv', reason: 'identity' },
    { sourceId: 'nope', reason: 'x' },
  ],
})
assert.equal(needs.length, 1)
assert.equal(needs[0].sourceId, 'candidate_cv')

{
  const many = coerceNeedRetrievalNeeds(
    {
      needs: [
        { sourceId: 'candidate_cv', reason: 'a' },
        { sourceId: 'bot_notes', reason: 'b' },
        { sourceId: 'day_transcript', reason: 'c' },
        { sourceId: 'tool_run', reason: 'd', phaseId: 'ph.code' },
        { sourceId: 'stage_artifact', reason: 'e', phaseId: 'ph.code' },
      ],
    },
    true,
  )
  assert.equal(many.length, 5, 'bound compose expand may keep 5 needs')
}

const a = emptyRetrievedMemoryPack()
a.candidateCvNote = 'Candidate: preferred "Jordan".'
a.sourceIdsUsed = ['candidate_cv']
const b = emptyRetrievedMemoryPack()
b.dayHits = [{ phaseId: 'ph.1', role: 'candidate', text: 'owned API freeze' }]
b.sourceIdsUsed = ['day_transcript']
const pack = mergeRetrievedPacks(a, b)
assert.equal(pack.candidateCvNote?.includes('Jordan'), true)
assert.equal(pack.dayHits.length, 1)
assert.ok(pack.sourceIdsUsed.includes('candidate_cv'))
assert.ok(pack.sourceIdsUsed.includes('day_transcript'))

console.log('broaderContext.unit: ok')
