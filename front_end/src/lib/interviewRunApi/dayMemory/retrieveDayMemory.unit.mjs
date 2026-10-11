/**
 * retrieveDayMemory unit tests.
 * Run: npx tsx front_end/src/lib/interviewRunApi/dayMemory/retrieveDayMemory.unit.mjs
 */
import assert from 'node:assert/strict'
import { emptyInterviewResponse } from '../interviewResponse.ts'
import { retrieveDayMemory } from './retrieveDayMemory.ts'
import { emptyMemoryPlan } from './types.ts'

const base = emptyInterviewResponse('fixture:day-memory')
const response = {
  ...base,
  messages: [
    {
      id: 'm1',
      phaseId: 'ph.own',
      topicId: 'topic.own',
      role: 'assistant',
      text: 'Tell me about ownership.',
      at: '2026-01-01T00:00:00.000Z',
      probeId: 'p1',
      kind: 'opener',
    },
    {
      id: 'm2',
      phaseId: 'ph.own',
      topicId: 'topic.own',
      role: 'candidate',
      text: 'I owned the API freeze and cut auth risk on the platform.',
      at: '2026-01-01T00:01:00.000Z',
      probeId: 'p1',
      kind: 'answer',
    },
    {
      id: 'm3',
      phaseId: 'ph.eligible',
      topicId: null,
      role: 'assistant',
      text: 'Next up is Eligibility.',
      at: '2026-01-01T00:02:00.000Z',
      probeId: null,
      kind: 'assist',
    },
  ],
  analysis: {
    ...base.analysis,
    topics: {
      'topic.own': {
        byTemplate: {},
        synthesisText: 'Candidate owned an API freeze and reduced auth risk.',
        targets: {},
        status: 'filled',
      },
    },
  },
}

{
  const empty = retrieveDayMemory({
    plan: emptyMemoryPlan(),
    response,
    currentPhaseId: 'ph.eligible',
    cv: { hasCv: true, preferredName: 'Jordan', displayName: 'Jordan Lee', note: 'Candidate: preferred "Jordan".', source: 'sample', rapportHook: '' },
  })
  assert.equal(empty.candidateCvNote, null)
  assert.equal(empty.dayHits.length, 0)
  assert.equal(empty.sourceIdsUsed.length, 0)
}

{
  const withCv = retrieveDayMemory({
    plan: {
      confidence: 'high',
      needs: [{ sourceId: 'candidate_cv', reason: 'identity' }],
    },
    response,
    currentPhaseId: 'ph.eligible',
    cv: {
      hasCv: true,
      preferredName: 'Jordan',
      displayName: 'Jordan Lee',
      note: 'Candidate: preferred "Jordan" (display "Jordan Lee").',
      source: 'sample',
      rapportHook: '',
    },
  })
  assert.ok(withCv.candidateCvNote?.includes('Jordan'))
  assert.deepEqual(withCv.sourceIdsUsed, ['candidate_cv'])
}

{
  const day = retrieveDayMemory({
    plan: {
      confidence: 'high',
      needs: [{ sourceId: 'day_transcript', query: 'auth risk', reason: 'recall' }],
    },
    response,
    currentPhaseId: 'ph.eligible',
  })
  assert.ok(day.dayHits.some((h) => /auth risk/i.test(h.text)))
  assert.ok(!day.dayHits.some((h) => h.phaseId === 'ph.eligible'))
  assert.ok(day.sourceIdsUsed.includes('day_transcript'))
}

{
  const synth = retrieveDayMemory({
    plan: {
      confidence: 'med',
      needs: [{ sourceId: 'topic_synthesis', reason: 'summary' }],
    },
    response,
    currentPhaseId: 'ph.eligible',
  })
  assert.ok(synth.topicSynths.some((t) => /API freeze/i.test(t.text)))
}

{
  const phase = retrieveDayMemory({
    plan: {
      confidence: 'high',
      needs: [
        {
          sourceId: 'phase_transcript',
          query: 'ownership',
          reason: 'named section',
        },
      ],
    },
    response,
    currentPhaseId: 'ph.eligible',
    sectionIndex: [
      { phaseId: 'ph.own', title: 'Opening: ownership' },
      { phaseId: 'ph.eligible', title: 'Eligibility' },
    ],
  })
  assert.ok(phase.phaseHits.some((h) => h.phaseId === 'ph.own'))
  assert.ok(!phase.phaseHits.some((h) => h.phaseId === 'ph.eligible'))
}

{
  const withNotes = {
    ...response,
    botNotes: [
      {
        id: 'n1',
        kind: 'preferred_name',
        key: 'preferred_name',
        text: 'Call the candidate Sam.',
        at: '2026-01-01T00:00:00.000Z',
        source: 'talk',
      },
    ],
  }
  const pack = retrieveDayMemory({
    plan: {
      confidence: 'high',
      needs: [{ sourceId: 'bot_notes', reason: 'standing' }],
    },
    response: withNotes,
    currentPhaseId: 'ph.eligible',
  })
  assert.ok(pack.botNotes.some((n) => /Sam/i.test(n)))
  assert.ok(pack.sourceIdsUsed.includes('bot_notes'))
}

console.log('retrieveDayMemory.unit: ok')
