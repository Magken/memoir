/**
 * Copilot day pack lean path (no Edge).
 * Run: npx tsx front_end/src/lib/interviewRunApi/dayMemory/retrieveCopilotDayMemory.unit.mjs
 */
import assert from 'node:assert/strict'
import { retrieveCopilotDayMemory } from './retrieveCopilotDayMemory.ts'

const leanDay = {
  continuing: true,
  previousSectionTitle: 'Ownership',
  priorNote: 'owned the outage',
  standingNotes: 'prefers Jordan',
  dayHistoryTail: [
    { role: 'candidate', text: 'I owned the outage.', phaseId: 'ph.talk' },
  ],
}

const lean = await retrieveCopilotDayMemory({
  briefId: 'fixture',
  brief: null,
  phaseId: 'ph.code',
  candidateText: 'add a guard in parse.ts',
  leanDay,
  sectionIds: [{ phaseId: 'ph.talk', title: 'Ownership' }],
  gateTitle: 'Coding',
  response: { messages: [], botNotes: [] },
})

assert.equal(lean.standingNotes, 'prefers Jordan')
assert.equal(lean.priorNote, 'owned the outage')
assert.ok(lean.dayHistoryTail?.some((r) => r.text === 'I owned the outage.'))
assert.equal(lean.candidateCvNote ?? null, null, 'edit ask must not fetch CV')

console.log('retrieveCopilotDayMemory: ok')
