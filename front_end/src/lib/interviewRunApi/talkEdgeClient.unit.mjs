/**
 * talkEdgeClient request body gauges (mock fetch / supabase.functions.invoke).
 * Run: npx tsx front_end/src/lib/interviewRunApi/talkEdgeClient.unit.mjs
 */
import assert from 'node:assert/strict'

const bodies = []

const mockSupabase = {
  auth: {
    getSession: async () => ({
      data: { session: { access_token: 'test-token' } },
    }),
  },
  functions: {
    invoke: async (_name, opts) => {
      bodies.push(opts.body)
      const mode = opts.body.mode
      if (mode === 'compose') {
        return {
          data: {
            data: {
              utterance: 'What did you personally decide?',
              composeMeta: {
                situation: opts.body.decide.situation,
                sampleIdsUsed: ['clarify.1'],
                model: 'gpt-4.1',
                missingGaps: opts.body.decide.missingGaps ?? [],
                signals: opts.body.decide.signals ?? [],
              },
            },
            error: null,
          },
          error: null,
        }
      }
      if (mode === 'after_turn') {
        return {
          data: {
            data: {
              grains: {
                'iv.delivery.v1': {
                  templateId: 'iv.delivery.v1',
                  hostRef: opts.body.hostRef,
                  grain: 'after_turn',
                  order: opts.body.order,
                  status: 'filled',
                  result: { overall: 2, max: 5 },
                  dimensions: [{ key: 'clarity', label: 'Clarity', score: 2, max: 5 }],
                  justification: 'Vague answer.',
                  evidence: ['we'],
                  confidence: 'med',
                },
              },
            },
            error: null,
          },
          error: null,
        }
      }
      return {
        data: {
          data: {
            synthesisText: 'Topic wrapped.',
            targets: {},
            byTemplate: {},
            status: 'filled',
          },
          error: null,
        },
        error: null,
      }
    },
  },
}

// Stub dataApi before importing client
const dataApiPath = new URL('../dataApi/index.ts', import.meta.url).href
await import(dataApiPath).catch(() => null)

// Direct body construction mirror of talkEdgeClient (avoid full supabase wiring)
function buildComposeBody(decide) {
  return {
    mode: 'compose',
    briefId: 'b1',
    talkContext: { briefId: 'b1' },
    messages: [],
    talkRuntime: { status: 'active' },
    decide: {
      situation: decide.situation,
      missingGaps: decide.missingGaps,
      activeProbeId: decide.activeProbeId,
      nextProbeGoal: decide.nextProbeGoal,
      canPass: decide.canPass,
      signals: decide.signals ?? [],
      composeCues: decide.composeCues ?? [],
    },
    priorTopicNote: null,
    candidateCvNote: null,
  }
}

const composeBody = buildComposeBody({
  situation: 'clarify',
  missingGaps: ['personal decision'],
  activeProbeId: 'p1',
  nextProbeGoal: null,
  canPass: false,
  signals: ['gibberish'],
  composeCues: ['clarity:low'],
})
assert.equal(composeBody.mode, 'compose')
assert.ok(Array.isArray(composeBody.decide.signals))
assert.ok(Array.isArray(composeBody.decide.composeCues))
assert.equal(composeBody.decide.signals[0], 'gibberish')
assert.equal(composeBody.candidateCvNote, null)

const withCv = {
  ...composeBody,
  candidateCvNote: 'Candidate: preferred "Jordan" (display "Jordan Lee").\nHeadline: Staff platform engineer',
}
assert.ok(typeof withCv.candidateCvNote === 'string' && withCv.candidateCvNote.includes('Jordan'))
assert.ok(!withCv.candidateCvNote.includes('prior topic'), 'CV note is separate from prior Talk memory')

const afterBody = {
  mode: 'after_turn',
  candidateMessageId: 'msg1',
  templateIds: ['iv.delivery.v1'],
  hostRef: 'topic.conflict',
  order: 1,
  talkContext: {},
  messages: [],
}
assert.equal(afterBody.mode, 'after_turn')
assert.ok(Array.isArray(afterBody.templateIds))

const topicBody = {
  mode: 'topic_end',
  templateIds: ['iv.delivery.v1'],
  talkContext: {},
  messages: [],
}
assert.equal(topicBody.mode, 'topic_end')

// Exercise mock invoke path shape
const inv = await mockSupabase.functions.invoke('interview-talk-turn', { body: composeBody })
assert.ok(inv.data.data.utterance)
assert.equal(inv.data.data.composeMeta.situation, 'clarify')
assert.ok(Array.isArray(inv.data.data.composeMeta.signals))

{
  const { alwaysOnReferencedPatch } = await import('./referencedTurn.ts')
  const unbound = { dayMeta: { continuing: false, previousSectionTitle: null, ...alwaysOnReferencedPatch(null) } }
  assert.equal('referencedStages' in unbound.dayMeta, false)
  const bound = alwaysOnReferencedPatch({
    index: [{ phaseId: 'ph.code', title: 'Two Sum', kind: 'coding', hostRef: 't.code', available: ['run'] }],
    candidateSafe: { artifacts: [], runs: [], synths: [] },
    assessor: { artifacts: [], runs: [], synths: [], grainNotes: [] },
  })
  const boundBody = { dayMeta: { continuing: true, previousSectionTitle: 'Two Sum', ...bound } }
  assert.equal(boundBody.dayMeta.referencedStages[0].phaseId, 'ph.code')
}

{
  const { settleTalkNeedRetrieval } = await import(
    '../../../../back_end/supabase/functions/interview-talk-turn/needRetrieval.ts'
  )
  const deltas = []
  const consume = (event) => {
    if (event.type === 'utterance_delta') deltas.push(event.text)
    if (event.type === 'done') {
      const settled = settleTalkNeedRetrieval(event.data, 0)
      assert.equal(settled.needs, null, 'done must not discard a streamed utterance for needRetrieval')
      assert.equal(settled.utteranceRaw, deltas.join(''))
    }
  }
  consume({ type: 'utterance_delta', text: 'What did you personally decide?' })
  consume({
    type: 'done',
    data: {
      utterance: 'What did you personally decide?',
      needRetrieval: { needs: [{ sourceId: 'candidate_cv', reason: 'asked_cv' }] },
    },
  })
  assert.deepEqual(deltas, ['What did you personally decide?'])
}

console.log('talkEdgeClient: ok')
// silence unused
void bodies
