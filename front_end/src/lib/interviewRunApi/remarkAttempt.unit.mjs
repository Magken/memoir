/**
 * Remark re-enqueues marks on a stored sitting — never restart.
 * Run: npx tsx front_end/src/lib/interviewRunApi/remarkAttempt.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  bumpMarkJobGeneration,
  currentMarkGeneration,
  awaitMarkJobs,
} from './markJobs.ts'
import {
  emptyInterviewResponse,
  getInterviewResponse,
  saveInterviewResponse,
  writePendingAfterToolGrains,
  writeTopicEndStub,
} from './interviewResponse.ts'
import { saveEditorTape } from './editorCapture/store.ts'
import { EDITOR_TAPE_SCHEMA } from './editorCapture/types.ts'
import { remarkAttempt } from './remarkAttempt.ts'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => {
    store.set(k, String(v))
  },
  removeItem: (k) => {
    store.delete(k)
  },
}

globalThis.fetch = async () => {
  throw new Error('remarkAttempt.unit: Edge is offline')
}

const here = dirname(fileURLToPath(import.meta.url))

{
  const briefId = 'fixture:remark-empty'
  getInterviewResponse(briefId)
  const brief = {
    phases: [{ id: 'ph.code', kind: 'tool', toolRef: 'tool.code' }],
    tools: { 'tool.code': { type: 'coding' } },
    topicLibrary: [],
    definition: { persona: { name: 'A', voice: '' } },
  }
  const gen = currentMarkGeneration()
  const out = await remarkAttempt({ briefId, brief })
  assert.equal(out.enqueued, false, 'empty sitting does not enqueue')
  assert.equal(out.reason, 'no_sitting')
  assert.equal(currentMarkGeneration(), gen, 'empty sitting must not bump mark generation')
  assert.deepEqual(
    getInterviewResponse(briefId).analysis.tools,
    {},
    'negative: unfinished attempt with no stored work does not stub marks',
  )
}

{
  const briefId = 'fixture:remark-coding'
  bumpMarkJobGeneration()
  let doc = saveInterviewResponse(emptyInterviewResponse(briefId))
  doc = saveInterviewResponse({
    ...doc,
    completedPhaseIds: ['ph.code'],
    analysis: {
      ...doc.analysis,
      tools: {
        'tool.code': {
          'mark.code.tests.v1': {
            templateId: 'mark.code.tests.v1',
            hostRef: 'tool.code',
            grain: 'after_tool',
            order: 0,
            status: 'filled',
            result: { boardSummary: 'old mark' },
            justification: 'old mark',
          },
        },
      },
    },
  })
  saveEditorTape({
    schema: EDITOR_TAPE_SCHEMA,
    schemaVersion: 1,
    briefId,
    attemptId: doc.attemptId,
    phaseId: 'ph.code',
    kind: 'coding',
    startedAt: doc.startedAt,
    endedAt: doc.updatedAt,
    durationMs: 12,
    initial: {},
    events: [],
    final: {
      title: 'solve',
      files: [{ path: 'solve.ts', language: 'ts', content: 'REMARK_TAPE_CANARY' }],
      openIds: ['solve.ts'],
      activeId: 'solve.ts',
    },
  })
  const brief = {
    phases: [{ id: 'ph.code', kind: 'tool', toolRef: 'tool.code', title: 'Parse' }],
    tools: { 'tool.code': { type: 'coding', title: 'Parse' } },
    topicLibrary: [],
    definition: { persona: { name: 'A', voice: '' } },
  }
  let captured = null
  const kinds = []
  const gen = currentMarkGeneration()
  const out = await remarkAttempt({
    briefId,
    brief,
    assessTool: async (args) => {
      captured = args.artifact
      return {
        hostRef: 'tool.code',
        result: {
          grains: {
            'mark.code.tests.v1': {
              templateId: 'mark.code.tests.v1',
              hostRef: 'tool.code',
              grain: 'after_tool',
              order: 0,
              status: 'filled',
              result: { boardSummary: 'REMARK_MARK_CANARY' },
              justification: 'REMARK_MARK_CANARY',
            },
          },
        },
        codeRun: null,
        stages: [{ stage: 'mark.code.tests.v1', status: 'ok', ms: 1 }],
        kind: 'coding_bundle',
        totalMs: 1,
      }
    },
    assess: async (args) => {
      kinds.push(args.body?.kind ?? args.kind)
      return { grains: {} }
    },
  })
  assert.equal(out.enqueued, true)
  assert.equal(currentMarkGeneration(), gen, 'Remark must not bump generation / restart')
  const pending = getInterviewResponse(briefId).analysis.tools['tool.code']['mark.code.tests.v1']
  assert.equal(pending.status, 'pending', 'Remark stubs filled leftover so assess re-runs')
  await awaitMarkJobs(8000)
  assert.equal(captured?.kind, 'coding')
  assert.match(String(captured?.payload?.files?.[0]?.content ?? ''), /REMARK_TAPE_CANARY/)
  const filled = getInterviewResponse(briefId).analysis.tools['tool.code']['mark.code.tests.v1']
  assert.equal(filled.status, 'filled')
  assert.match(String(filled.justification), /REMARK_MARK_CANARY/)
  assert.ok(
    kinds.includes('session_clarity') || kinds.includes('session_security') || kinds.includes('tape_process'),
    `session/tape assess must run after section marks, got ${kinds.join(',')}`,
  )
}

{
  const briefId = 'fixture:remark-talk'
  bumpMarkJobGeneration()
  let doc = saveInterviewResponse(emptyInterviewResponse(briefId))
  doc = saveInterviewResponse({
    ...doc,
    completedPhaseIds: ['ph.talk'],
    analysis: {
      ...doc.analysis,
      topics: {
        'topic.a': {
          status: 'filled',
          synthesisText: 'old leftover',
          targets: { k: { key: 'k', value: 'v', filled: true } },
          byTemplate: {
            'iv.delivery.v1': {
              templateId: 'iv.delivery.v1',
              hostRef: 'topic.a',
              grain: 'topic_end',
              order: 0,
              status: 'filled',
              result: { boardSummary: 'old talk' },
              justification: 'old talk',
            },
          },
        },
      },
    },
  })
  const brief = {
    phases: [{ id: 'ph.talk', kind: 'discussion', topicId: 'topic.a', title: 'Opening' }],
    tools: {},
    topicLibrary: [
      {
        id: 'topic.a',
        label: 'Opening',
        probes: [{ id: 'p1', goal: 'How?', required: true, order: 0 }],
        targets: [{ key: 'k', label: 'K' }],
        analysis: { templateIds: ['iv.delivery.v1'] },
      },
    ],
    definition: { persona: { name: 'A', voice: '' }, probeDefaults: {} },
    analysis: { attachPacks: {} },
  }
  const out = await remarkAttempt({ briefId, brief })
  assert.equal(out.enqueued, true)
  const topic = getInterviewResponse(briefId).analysis.topics['topic.a']
  assert.equal(topic.status, 'stubbed')
  assert.ok(
    Object.values(topic.byTemplate).some((g) => g.status === 'pending'),
    'Remark re-stubs Talk leftover even when the topic was already filled',
  )
  bumpMarkJobGeneration()
}

{
  let doc = emptyInterviewResponse('fixture:reset-filled-neg')
  doc = writePendingAfterToolGrains(doc, {
    hostRef: 'tool.code',
    templateIds: ['mark.code.tests.v1'],
  })
  doc.analysis.tools['tool.code']['mark.code.tests.v1'].status = 'filled'
  const kept = writePendingAfterToolGrains(doc, {
    hostRef: 'tool.code',
    templateIds: ['mark.code.tests.v1'],
  })
  assert.equal(
    kept.analysis.tools['tool.code']['mark.code.tests.v1'].status,
    'filled',
    'negative: default stub must not wipe a filled grain',
  )
  const reset = writePendingAfterToolGrains(doc, {
    hostRef: 'tool.code',
    templateIds: ['mark.code.tests.v1'],
    resetFilled: true,
  })
  assert.equal(reset.analysis.tools['tool.code']['mark.code.tests.v1'].status, 'pending')

  let talk = emptyInterviewResponse('fixture:reset-topic-neg')
  talk = writeTopicEndStub(talk, {
    topicId: 'topic.a',
    targets: [{ key: 'k' }],
    templateIds: ['iv.delivery.v1'],
  })
  talk.analysis.topics['topic.a'].byTemplate['iv.delivery.v1'].status = 'filled'
  talk.analysis.topics['topic.a'].status = 'filled'
  const talkKept = writeTopicEndStub(talk, {
    topicId: 'topic.a',
    targets: [{ key: 'k' }],
    templateIds: ['iv.delivery.v1'],
  })
  assert.equal(
    talkKept.analysis.topics['topic.a'].byTemplate['iv.delivery.v1'].status,
    'filled',
    'negative: default topic stub must not wipe a filled leftover',
  )
}

{
  const src = readFileSync(join(here, '../../components/InterviewFinishedScene.tsx'), 'utf8')
  assert.match(src, /remarkAttempt/, 'complete page imports remarkAttempt')
  assert.match(src, />\s*Remark\s*</, 'complete page renders Remark')
  assert.match(
    src,
    /theme-interview-gate--finished[\s\S]*>\s*Remark\s*</,
    'Remark sits on Interview complete, not the Verify overlay header',
  )
  const overlaySrc = src.slice(0, src.indexOf('export function InterviewFinishedScene'))
  assert.doesNotMatch(overlaySrc, />\s*Remark\s*</, 'negative: Remark is not on the Verify overlay')
  assert.equal(/runRestartAttempt/.test(src), false, 'Remark must not restart')
  assert.equal(/runOpenAttempt/.test(src), false, 'Remark must not open a new attempt')
  assert.equal(/bumpMarkJobGeneration/.test(src), false, 'Remark must not abort in-flight by bumping generation')
}

console.log('remarkAttempt.unit.mjs: ok')
