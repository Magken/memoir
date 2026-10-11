/**
 * Referenced-stage evidence packs — earlier-only, no answerKey/oracle dump.
 * Run: npx tsx front_end/src/lib/interviewRunApi/referencedEvidence.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  buildReferencedEvidence,
  referencedPhaseIdsFromBrief,
} from './referencedEvidence.ts'
import { emptyInterviewResponse } from './interviewResponse.ts'

const brief = {
  phases: [
    { id: 'ph.form', title: 'Eligibility', kind: 'tool', toolRef: 't.form' },
    { id: 'ph.code', title: 'Two Sum', kind: 'tool', toolRef: 't.code' },
    {
      id: 'ph.talk',
      title: 'Debrief',
      kind: 'discussion',
      topicId: 'tp.debrief',
      references: { phaseIds: ['ph.code', 'ph.essay'] },
    },
    { id: 'ph.essay', title: 'Writing', kind: 'tool', toolRef: 't.doc' },
  ],
  tools: {
    't.form': { type: 'form_quiz' },
    't.code': { type: 'coding' },
    't.doc': { type: 'doc' },
  },
  topicLibrary: [{ id: 'tp.debrief', probes: [] }],
}

assert.deepEqual(referencedPhaseIdsFromBrief(brief, 'ph.talk'), ['ph.code'])
assert.deepEqual(referencedPhaseIdsFromBrief(brief, 'ph.form'), [])

const response = emptyInterviewResponse('fixture:ref')
response.messages.push({
  id: 'm1',
  phaseId: 'ph.code',
  topicId: null,
  role: 'candidate',
  text: 'twoSum t3 failed',
  at: new Date().toISOString(),
  probeId: null,
  kind: 'answer',
})
const pack = buildReferencedEvidence({
  brief,
  consumingPhaseId: 'ph.talk',
  response,
})
assert.equal(pack.index.length, 1)
assert.equal(pack.index[0].phaseId, 'ph.code')
const blob = JSON.stringify(pack)
assert.doesNotMatch(blob, /answerKey|oracle|hidden expected/i)
assert.ok(pack.candidateSafe)
assert.ok(pack.assessor)

{
  const marked = emptyInterviewResponse('fixture:ref')
  marked.analysis.tools['t.code'] = {
    'synth.tool.v1': {
      templateId: 'synth.tool.v1',
      status: 'filled',
      justification: 'Method mixed; candidate used two pointers.',
    },
  }
  const withTrail = buildReferencedEvidence({
    brief,
    consumingPhaseId: 'ph.talk',
    response: marked,
  })
  assert.equal(
    withTrail.candidateSafe.synths.length,
    0,
    'candidateSafe omits marker-trail justification when boardSummary is absent',
  )
  assert.ok(
    withTrail.assessor.grainNotes.some((g) => /two pointers/i.test(g.note)),
    'assessor grainNotes may keep reviewer justification',
  )
}

const unbound = buildReferencedEvidence({
  brief: { ...brief, phases: brief.phases.map((p) => ({ ...p, references: undefined })) },
  consumingPhaseId: 'ph.talk',
  response,
})
assert.equal(unbound.index.length, 0)

console.log('referencedEvidence: ok')
