/**
 * Attempt report layers.
 * Run: npx tsx front_end/src/lib/interviewRunApi/attemptReport.unit.mjs
 */
import assert from 'node:assert/strict'
import { assembleAttemptReport } from './attemptReport.ts'
import { scoreAttempt } from './scoreAttempt.ts'

const response = {
  schemaVersion: 1,
  briefId: 'unit',
  attemptId: 'att.1',
  startedAt: '2026-08-21T00:00:00.000Z',
  updatedAt: '2026-08-21T00:10:00.000Z',
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
    rollup: null,
    partial: null,
  },
}

const brief = {
  phases: [{ id: 'ph.code', kind: 'tool', title: 'Coding', toolRef: 'tool.code' }],
  tools: { 'tool.code': { type: 'coding' } },
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

const scored = scoreAttempt({ brief, response })
const report = assembleAttemptReport({ brief, response, scored })
assert.equal(report.schema, 'vurify/attempt-report')
assert.ok(report.layer1.contributions.some((c) => c.templateId === 'mark.code.tests.v1'))
assert.ok(report.layer1.charts.bucketBars.length >= 1)
assert.ok(report.layer2['ph.code'])
assert.equal(report.status, 'complete')

{
  const pending = {
    ...response,
    analysis: {
      ...response.analysis,
      tools: {
        'tool.code': {
          ...response.analysis.tools['tool.code'],
          'mark.code.method.v1': {
            templateId: 'mark.code.method.v1',
            hostRef: 'tool.code',
            grain: 'after_tool',
            order: 2,
            status: 'pending',
            result: null,
            justification: '',
            confidence: 'low',
          },
        },
      },
    },
  }
  const pendingReport = assembleAttemptReport({ brief, response: pending })
  assert.equal(pendingReport.status, 'partial')
  assert.ok(pendingReport.layer1.pendingCount > 0)
}

console.log('attemptReport.unit.mjs: ok')
