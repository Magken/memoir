/**
 * Live attempt-package wrap + marking/ready.
 * Run: npx tsx front_end/src/lib/interviewRunApi/attemptPackage.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  assembleAttemptPackage,
  ATTEMPT_PACKAGE_SCHEMA,
  attemptPackageStatus,
  collectPendingPackageGrains,
} from './attemptPackage.ts'

const response = {
  schemaVersion: 1,
  briefId: 'unit',
  attemptId: 'att.1',
  startedAt: '2026-08-26T00:00:00.000Z',
  updatedAt: '2026-08-26T00:10:00.000Z',
  phasePointer: null,
  completedPhaseIds: ['ph.code'],
  skippedPhaseIds: [],
  messages: [],
  messageRange: { firstId: null, lastId: null },
  talkRuntime: null,
  analysis: {
    turns: {},
    topics: {},
    tools: {
      'tool.code': {
        'mark.code.tests.v1': {
          templateId: 'mark.code.tests.v1',
          hostRef: 'tool.code',
          grain: 'after_tool',
          order: 1,
          status: 'filled',
          result: { gradedScore: 2, gradedMax: 2 },
          justification: 'pass',
          confidence: 'high',
        },
      },
    },
    signals: {
      'sig.clarity.v1': {
        templateId: 'sig.clarity.v1',
        hostRef: 'attempt',
        grain: 'interview_end',
        order: 90,
        status: 'pending',
        result: null,
        justification: '',
      },
    },
    rollup: null,
    partial: null,
  },
}

const brief = {
  phases: [{ id: 'ph.code', kind: 'tool', title: 'Coding', toolRef: 'tool.code' }],
  tools: { 'tool.code': { type: 'coding' } },
  topicLibrary: [],
  analysis: {
    rollup: {
      weights: {
        codingTests: 0.25,
        codingMethod: 0.1,
        essay: 0.15,
        interviewDelivery: 0.2,
        interviewContent: 0.3,
      },
    },
  },
}

const tapes = {
  schema: 'vurify/editor-tapes',
  schemaVersion: 1,
  briefId: 'unit',
  byKind: {},
  byPhaseId: {},
}

assert.equal(attemptPackageStatus({ inflightJobs: 1 }), 'marking')
assert.equal(attemptPackageStatus({ inflightJobs: 0 }), 'ready')
assert.equal(attemptPackageStatus({ inflightJobs: 0, pendingCount: 2 }), 'marking')

const pending = collectPendingPackageGrains(response)
assert.ok(pending.some((g) => g.templateId === 'sig.clarity.v1' && g.host === 'signals'))

const markingPack = assembleAttemptPackage({
  briefId: 'unit',
  brief,
  response,
  editorTapes: tapes,
  sessionTelemetry: null,
  inflightJobs: 1,
  exportedAt: '2026-08-26T00:10:00.000Z',
})
assert.equal(markingPack.schema, ATTEMPT_PACKAGE_SCHEMA)
assert.equal(markingPack.status, 'marking')
assert.ok(markingPack.editorTapes)
assert.ok(markingPack.report)
assert.equal(markingPack.response.attemptId, 'att.1')

const idlePending = assembleAttemptPackage({
  briefId: 'unit',
  brief,
  response,
  editorTapes: tapes,
  sessionTelemetry: null,
  inflightJobs: 0,
  exportedAt: '2026-08-26T00:10:00.000Z',
})
assert.equal(idlePending.status, 'marking')
assert.ok(idlePending.marking.pendingCount > 0)

const readyResponse = {
  ...response,
  analysis: {
    ...response.analysis,
    signals: {
      'sig.clarity.v1': {
        ...response.analysis.signals['sig.clarity.v1'],
        status: 'filled',
        justification: 'collector',
        result: { unit: 0.8 },
      },
    },
  },
}
const readyPack = assembleAttemptPackage({
  briefId: 'unit',
  brief,
  response: readyResponse,
  editorTapes: tapes,
  sessionTelemetry: null,
  inflightJobs: 0,
  exportedAt: '2026-08-26T00:10:00.000Z',
})
assert.equal(readyPack.status, 'ready')
assert.equal(readyPack.marking.pendingCount, 0)
assert.ok(readyPack.sessionSeries)
assert.ok(readyPack.signalAtlas)

const telemetry = {
  schema: 'vurify/session-telemetry.v1',
  schemaVersion: 1,
  briefId: 'unit',
  attemptId: 'att.1',
  startedAt: '2026-08-26T00:00:00.000Z',
  updatedAt: '2026-08-26T00:10:00.000Z',
  visibleMs: 1000,
  inEditorMs: 0,
  inTalkMs: 400,
  offlineMs: 0,
  reconnectCount: 1,
  events: [],
  networkSamples: [
    {
      t: 10,
      phaseId: 'ph.code',
      city: 'Lagos',
      region: 'LA',
      country: 'Nigeria',
      rttMs: 42,
      vpnLikely: false,
      reasons: [],
    },
  ],
  pointerTrail: [{ t: 20, phaseId: 'ph.code', x: 0.4, y: 0.6 }],
  typing: [{ surface: 'talk', committedWords: 12, activeMs: 20_000, wpm: 36 }],
}
const packed = assembleAttemptPackage({
  briefId: 'unit',
  brief,
  response: readyResponse,
  editorTapes: tapes,
  sessionTelemetry: telemetry,
  inflightJobs: 0,
  exportedAt: '2026-08-26T00:10:00.000Z',
})
assert.equal(packed.sessionTelemetry?.networkSamples?.length, 1)
assert.equal(packed.sessionTelemetry?.pointerTrail?.length, 1)
assert.equal(packed.sessionTelemetry?.typing?.[0]?.wpm, 36)
assert.equal(packed.intakeDeclarations.schema, 'vurify/intake-declarations.v1')
assert.equal(packed.intakeDeclarations.terms, null)
assert.equal(packed.intakeDeclarations.supportNote, null)
assert.ok(!JSON.stringify(readyResponse.messages ?? []).includes('Lagos'))

console.log('attemptPackage.unit.mjs: ok')
