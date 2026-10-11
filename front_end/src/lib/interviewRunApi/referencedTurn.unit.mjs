/**
 * Additive bind / always-on omit when unbound.
 * Run: npx tsx front_end/src/lib/interviewRunApi/referencedTurn.unit.mjs
 */
import assert from 'node:assert/strict'
import { bindReferencedStageNeeds } from './dayMemory/broaderContext.ts'
import {
  alwaysOnReferencedPatch,
  bindRefs,
  composeDayMeta,
  copilotDayReferencedSlice,
  retrieveReferencedArg,
} from './referencedTurn.ts'

const empty = alwaysOnReferencedPatch(null)
assert.deepEqual(empty, {})
assert.ok(!('referencedStages' in empty))

const evidence = {
  index: [
    {
      phaseId: 'ph.code',
      title: 'Two Sum',
      kind: 'coding',
      hostRef: 't.code',
      available: ['run', 'artifact'],
    },
  ],
  candidateSafe: { artifacts: [], runs: [{ phaseId: 'ph.code', passed: false, failingIds: ['t3'] }], synths: [] },
  assessor: { artifacts: [], runs: [], synths: [], grainNotes: [] },
}
assert.equal(alwaysOnReferencedPatch(evidence).referencedStages[0].phaseId, 'ph.code')
assert.ok(retrieveReferencedArg(evidence))
assert.equal(retrieveReferencedArg({ ...evidence, index: [] }), null)

const needs = bindRefs(
  [{ sourceId: 'candidate_cv', reason: 'id' }],
  evidence,
  'ph.talk',
)
assert.ok(needs.some((n) => n.sourceId === 'candidate_cv'))
assert.ok(needs.some((n) => n.phaseId === 'ph.code' || n.reason === 'referenced_stage'))

const unboundNeeds = bindReferencedStageNeeds(
  [{ sourceId: 'bot_notes', reason: 'x' }],
  [],
  'ph.talk',
)
assert.equal(unboundNeeds.length, 1)

const meta = composeDayMeta(
  { continuing: true, previousSectionTitle: 'Two Sum', standingNotes: null },
  evidence,
)
assert.equal(meta.referencedStages[0].phaseId, 'ph.code')
const unboundMeta = composeDayMeta(
  { continuing: false, previousSectionTitle: null },
  null,
)
assert.equal(unboundMeta.referencedStages, undefined)

const copilot = copilotDayReferencedSlice(evidence)
assert.ok(copilot.referencedStages)
assert.ok(copilot.candidateSafe)
assert.deepEqual(copilotDayReferencedSlice(null), {})

console.log('referencedTurn: ok')
