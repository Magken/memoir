/**
 * Ordinal maps + template roles + scoreAttempt soft grade.
 * Run: npx tsx front_end/src/lib/interviewRunApi/scoreAttempt.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ordinalToUnit, ORDINAL_MAPS_VERSION } from './ordinalMaps.ts'
import { resolveTemplateRole, builtinTemplateIds, isGradeRole } from './templateRoles.ts'
import {
  scoreAttempt,
  scoreGrainUnit,
  sittingResultStatus,
  sittingMarkingProgress,
} from './scoreAttempt.ts'
import { sittingResultHeadlinePending } from './fixtures/output-cards/outputCardFixture.ts'
import { expectedSoftBuckets } from './expectedSet.ts'
import { mapCreator2BriefToTimeline } from '../interviewBrief/mapCreator2BriefToTimeline.ts'

assert.equal(ORDINAL_MAPS_VERSION, 1)
assert.equal(ordinalToUnit({ templateId: 'iv.delivery.v1', dimKey: 'clarity', score: 'weak' }), 0)
assert.equal(ordinalToUnit({ templateId: 'iv.delivery.v1', dimKey: 'clarity', score: 'mixed' }), 0.5)
assert.equal(ordinalToUnit({ templateId: 'iv.delivery.v1', dimKey: 'clarity', score: 'strong' }), 1)
assert.equal(ordinalToUnit({ templateId: 'iv.star.v1', dimKey: 'situation', score: 'present' }), 1)
assert.equal(
  ordinalToUnit({ templateId: 'iv.ownership.v1', dimKey: 'blameShift', score: 'high' }),
  0,
)
assert.equal(
  ordinalToUnit({ templateId: 'iv.ownership.v1', dimKey: 'blameShift', score: 'low' }),
  1,
)
assert.equal(ordinalToUnit({ templateId: 'iv.delivery.v1', dimKey: 'clarity', score: 5 }), 1)
assert.equal(ordinalToUnit({ templateId: 'iv.delivery.v1', dimKey: 'clarity', score: 1 }), 0)
assert.equal(ordinalToUnit({ templateId: 'iv.delivery.v1', dimKey: 'clarity', score: '' }), null)

for (const id of builtinTemplateIds()) {
  const meta = resolveTemplateRole(id)
  assert.ok(meta.role, id)
}
assert.equal(resolveTemplateRole('sig.clarity.v1').decisionBucket, null)
assert.equal(resolveTemplateRole('sig.clarity.v1').role, 'collect.scalar')
assert.equal(isGradeRole(resolveTemplateRole('sig.clarity.v1').role), false)
assert.equal(resolveTemplateRole('synth.topic.v1').role, 'narrative.paragraph')
assert.equal(resolveTemplateRole('mark.code.structure.v1').decisionBucket, 'codingMethod')
assert.equal(resolveTemplateRole('mark.form.reasoning.v1').role, 'narrative.paragraph')
assert.equal(resolveTemplateRole('custom.tax', { outputKind: 'taxonomy' }).role, 'collect.taxonomy')
assert.equal(
  resolveTemplateRole('custom.enum.q', {
    outputKind: 'enum',
    enumValues: ['low', 'med', 'high'],
  }).role,
  'grade.enum',
)
assert.equal(
  resolveTemplateRole('custom.enum.tag', {
    outputKind: 'enum',
    enumValues: ['backend', 'frontend'],
  }).role,
  'collect.enum',
)

const deliveryGrain = {
  templateId: 'iv.delivery.v1',
  hostRef: 't1',
  grain: 'after_turn',
  order: 1,
  status: 'filled',
  dimensions: [
    { key: 'clarity', score: 'weak' },
    { key: 'composure', score: 'mixed' },
    { key: 'structure', score: 'strong' },
  ],
  confidence: 'med',
}
assert.equal(scoreGrainUnit('iv.delivery.v1', deliveryGrain), (0 + 0.5 + 1) / 3)

const response = {
  schema: 'vurify/interview-response',
  version: 1,
  briefId: 'unit',
  messages: [],
  completedPhaseIds: ['ph.talk', 'ph.code'],
  skippedPhaseIds: [],
  analysis: {
    turns: {
      m1: {
        'iv.delivery.v1': deliveryGrain,
      },
    },
    topics: {
      'topic.a': {
        status: 'filled',
        synthesisText: 'Narrative only — must not enter soft %.',
        targets: { owned: { key: 'owned', value: null, filled: false } },
        byTemplate: {
          'iv.content.v1': {
            templateId: 'iv.content.v1',
            hostRef: 'topic.a',
            grain: 'topic_end',
            order: 1,
            status: 'filled',
            confidence: 'med',
            dimensions: [
              { key: 'relevance', score: 'mixed' },
              { key: 'specificity', score: 'mixed' },
              { key: 'depth', score: 'mixed' },
            ],
          },
          'synth.topic.v1': {
            templateId: 'synth.topic.v1',
            hostRef: 'topic.a',
            grain: 'topic_end',
            order: 0,
            status: 'filled',
            justification: 'Topic summary',
            confidence: 'med',
          },
        },
      },
    },
    tools: {
      'tool.code': {
        'mark.code.tests.v1': {
          templateId: 'mark.code.tests.v1',
          hostRef: 'tool.code',
          grain: 'after_tool',
          order: 1,
          status: 'filled',
          confidence: 'high',
          result: {
            passedCount: 2,
            total: 4,
            score: 2,
            max: 4,
            boardSummary:
              'Partial pass on the suite (2/4) — enough signal to continue, not enough to call it settled.',
            boardSummaryDetail: 'Failing cases: c3, c4. Method scores stay separate.',
          },
        },
        'mark.code.method.v1': {
          templateId: 'mark.code.method.v1',
          hostRef: 'tool.code',
          grain: 'after_tool',
          order: 2,
          status: 'filled',
          confidence: 'med',
          dimensions: [
            { key: 'approach', score: 'weak' },
            { key: 'clarity', score: 'mixed' },
            { key: 'complexity', score: 'weak' },
          ],
          result: {
            boardSummary:
              'Approach stayed thin; clarity mixed while complexity never cleared the floor.',
            boardSummaryDetail: 'Approach weak · Clarity mixed · Complexity weak.',
          },
        },
        'mark.code.structure.v1': {
          templateId: 'mark.code.structure.v1',
          hostRef: 'tool.code',
          grain: 'after_tool',
          order: 3,
          status: 'filled',
          confidence: 'med',
          dimensions: [
            { key: 'organization', score: 'mixed' },
            { key: 'naming', score: 'mixed' },
            { key: 'modularity', score: 'weak' },
          ],
        },
        'synth.tool.v1': {
          templateId: 'synth.tool.v1',
          hostRef: 'tool.code',
          grain: 'after_tool',
          order: 4,
          status: 'filled',
          confidence: 'med',
          justification: 'Partial suite; method thin; structure mixed. Hidden cases still fail.',
        },
      },
      'tool.form': {
        'mark.form.key.v1': {
          templateId: 'mark.form.key.v1',
          hostRef: 'tool.form',
          grain: 'after_tool',
          order: 1,
          status: 'filled',
          confidence: 'high',
          result: {
            passed: false,
            score: 1,
            max: 2,
            gradedScore: 1,
            gradedMax: 2,
            ungradedIds: ['q.pref'],
            boardSummary:
              'Form gate missed (1/2 graded). This is a hard miss on keyed items.',
            boardSummaryDetail: 'Misses: authorization. This screen does not change the overall score.',
            byItem: [
              { questionId: 'q.auth', status: 'graded', earned: 1, max: 1 },
              {
                questionId: 'q.pref',
                status: 'ungraded',
                authorHint: 'author_forgot_scheme',
              },
            ],
          },
        },
      },
    },
    toolPackages: {
      'tool.code': {
        kind: 'coding',
        summary: 'Tests 2/4',
        boardSummary:
          'Approach stayed thin; clarity mixed while complexity never cleared the floor.',
        boardSummaryDetail: 'Failed: empty input, overflow. Approach weak · Clarity mixed · Complexity weak.',
      },
    },
  },
}

const brief = {
  topicLibrary: [{ id: 'topic.a', targets: [{ key: 'owned', required: true }] }],
  phases: [
    { id: 'ph.talk', kind: 'discussion', topicId: 'topic.a' },
    { id: 'ph.code', kind: 'tool', toolRef: 'tool.code' },
    { id: 'ph.form', kind: 'tool', toolRef: 'tool.form' },
  ],
  analysis: {
    rollup: {
      weights: {
        formMark: 'gate_only',
        codingTests: 0.25,
        codingMethod: 0.1,
        essay: 0.15,
        interviewDelivery: 0.2,
        interviewContent: 0.3,
      },
      weightSections: {
        interviewDelivery: ['ph.talk'],
        interviewContent: ['ph.talk'],
        codingTests: ['ph.code'],
        codingMethod: ['ph.code'],
      },
    },
  },
}

const scored = scoreAttempt({ brief, response })
assert.equal(scored.softGrade.method, 'expected_set_v2')
assert.ok(scored.softGrade.byWeight.interviewDelivery.included)
assert.ok(scored.softGrade.byWeight.interviewContent.included)
assert.ok(scored.softGrade.byWeight.codingTests.included)
// No doc/writing phase in this brief, so essay was never asked: not absence.
assert.equal(scored.softGrade.byWeight.essay.included, false)
assert.ok(scored.softGrade.excludedBuckets.includes('essay'))
assert.ok(!scored.softGrade.expectedBuckets.includes('essay'))
assert.equal(scored.artifacts.topicSynths['topic.a'].includes('Narrative'), true)
assert.equal(scored.artifacts.targetMisses.some((m) => m.key === 'owned'), true)
assert.equal(scored.formGate?.gradedMax, 2)
assert.equal(scored.formGate?.ungradedIds.includes('q.pref'), true)
// Collect/narrative must not push overall to NaN or invent essay weight
assert.ok(Number.isFinite(scored.softGrade.overall))
assert.ok(scored.softGrade.overall >= 0 && scored.softGrade.overall <= 1)
assert.match(scored.softGrade.byWeight.codingTests.summary, /suite|Partial|2\/4/i)
assert.ok(scored.softGrade.byWeight.codingTests.summaryDetail)
assert.match(scored.softGrade.byWeight.codingMethod.summary, /Approach|clarity|thin/i)
assert.ok(scored.softGrade.byWeight.codingMethod.axes?.length >= 2)
assert.ok(
  scored.softGrade.byWeight.codingMethod.sources.some((s) => s.templateId === 'mark.code.structure.v1'),
  'structure pulls codingMethod',
)
assert.ok(
  scored.softGrade.byWeight.codingMethod.axes?.some((a) => a.key === 'structure.organization'),
  'structure axes prefixed',
)
assert.ok(
  scored.softGrade.byWeight.codingMethod.axes?.some((a) => a.key === 'approach'),
  'method axes unprefixed',
)
assert.match(scored.artifacts.toolSynths['tool.code'], /Partial suite/)
assert.ok(
  scored.contributions.some(
    (c) => c.templateId === 'mark.code.tests.v1' && c.towardOverall > 0,
  ),
  'tests grain contributes to overall',
)
assert.equal(
  scored.contributions.some((c) => c.templateId === 'synth.tool.v1'),
  false,
  'synth stays 0% toward overall',
)
assert.match(scored.softGrade.byWeight.interviewContent.summary, /Narrative/)
assert.match(scored.softGrade.byWeight.essay.summary, /excluded|Soft Decision/i)

// Taxonomy custom must not enter soft
const taxResponse = {
  ...response,
  analysis: {
    ...response.analysis,
    tools: {
      ...response.analysis.tools,
      'tool.tax': {
        'custom.tax.v1': {
          templateId: 'custom.tax.v1',
          hostRef: 'tool.tax',
          grain: 'after_tool',
          order: 1,
          status: 'filled',
          confidence: 'med',
          result: { labels: ['latency', 'cost'] },
        },
      },
    },
  },
}
const taxScored = scoreAttempt({
  brief: {
    ...brief,
    analysis: {
      ...brief.analysis,
      overrides: {
        templateCards: {
          'custom.tax.v1': { outputKind: 'taxonomy' },
        },
      },
    },
  },
  response: taxResponse,
})
assert.ok(taxScored.artifacts.taxonomies['tool.tax:custom.tax.v1'])
assert.equal(taxScored.softGrade.overall, scored.softGrade.overall)

// grade.scalar + grade.enum paths
const scalarUnit = scoreGrainUnit('mark.doc.brief.v1', {
  templateId: 'mark.doc.brief.v1',
  hostRef: 't',
  grain: 'after_tool',
  order: 1,
  status: 'filled',
  confidence: 'med',
  result: { value: 0.75 },
})
assert.equal(scalarUnit, 0.75)

const enumScored = scoreAttempt({
  brief: {
    analysis: {
      overrides: {
        templateCards: {
          'custom.enum.q': {
            outputKind: 'enum',
            enumValues: ['low', 'med', 'high'],
            gradeable: true,
            decisionBucket: 'interviewContent',
          },
        },
      },
      rollup: brief.analysis.rollup,
    },
    phases: brief.phases,
    topicLibrary: brief.topicLibrary,
  },
  response: {
    ...response,
    analysis: {
      ...response.analysis,
      tools: {
        ...response.analysis.tools,
        'tool.enum': {
          'custom.enum.q': {
            templateId: 'custom.enum.q',
            hostRef: 'tool.enum',
            grain: 'after_tool',
            order: 1,
            status: 'filled',
            confidence: 'med',
            result: { value: 'high' },
          },
        },
      },
    },
  },
})
assert.ok(
  enumScored.softGrade.byWeight.interviewContent.sources.some(
    (s) => s.templateId === 'custom.enum.q',
  ),
)

// Authored essay bands (not catalog weak|mixed|strong) → unit + Soft Decision axes
const essayAuthored = {
  templateId: 'mark.doc.essay.v1',
  hostRef: 'tool.essay',
  grain: 'after_tool',
  order: 1,
  status: 'filled',
  confidence: 'high',
  dimensions: [
    { key: 'task_response', label: 'Task response', score: '4 — Strong', max: 4, bandId: 'strong' },
    { key: 'evidence', label: 'Evidence', score: '3 — Developing', max: 4, bandId: 'developing' },
  ],
  result: {
    composite: 0.75,
    boardSummary: 'Strong ship memo with a clear call.',
    boardSummaryDetail: 'Task response 4 · Evidence 3.',
  },
  justification: 'Strong ship memo.',
}
assert.equal(scoreGrainUnit('mark.doc.essay.v1', essayAuthored), 0.75)

const essayEmpty = {
  templateId: 'mark.doc.essay.v1',
  hostRef: 'tool.essay.empty',
  grain: 'after_tool',
  order: 1,
  status: 'filled',
  confidence: 'low',
  dimensions: [],
  result: { composite: 0, emptyMatrix: true },
  justification: 'No matrix.',
}
assert.equal(scoreGrainUnit('mark.doc.essay.v1', essayEmpty), null)

const essaySoft = scoreAttempt({
  brief: {
    ...brief,
    analysis: {
      ...brief.analysis,
      rollup: {
        weights: {
          ...brief.analysis.rollup.weights,
          essay: 0.2,
        },
      },
    },
  },
  response: {
    ...response,
    analysis: {
      ...response.analysis,
      tools: {
        ...response.analysis.tools,
        'tool.essay': {
          'mark.doc.essay.v1': essayAuthored,
        },
      },
      toolPackages: {
        'tool.essay': {
          boardSummary: 'Strong ship memo with a clear call.',
          boardSummaryDetail: 'Task response Strong · Evidence Developing.',
          assessorNotes: ['Covers recommendation'],
          gaps: ['risk_thin'],
          metaReview: { conflicts: ['tone_vs_brief'] },
          items: [{ id: 'evidence', label: 'Evidence', notes: 'Metric present', flaggedForReview: false }],
        },
      },
    },
  },
})
assert.equal(essaySoft.softGrade.byWeight.essay.included, true)
assert.ok((essaySoft.softGrade.byWeight.essay.axes?.length ?? 0) >= 2)
assert.match(essaySoft.softGrade.byWeight.essay.summary, /Strong ship memo/i)
assert.match(
  String(essaySoft.softGrade.byWeight.essay.summaryDetail ?? ''),
  /Gap:|Conflict:|Task response/i,
)

const emptyEssaySoft = scoreAttempt({
  brief: {
    ...brief,
    analysis: {
      ...brief.analysis,
      rollup: { weights: { ...brief.analysis.rollup.weights, essay: 0.2 } },
    },
  },
  response: {
    ...response,
    analysis: {
      ...response.analysis,
      tools: {
        'tool.essay.empty': { 'mark.doc.essay.v1': essayEmpty },
      },
    },
  },
})
assert.equal(emptyEssaySoft.softGrade.byWeight.essay.included, false)

// Scorecard: one source per template; skip stays out; prefixed axes; synth/targets as artifacts
{
  const skipId = 'm.clarify'
  const answerId = 'm.answer'
  const signalResponse = {
    ...response,
    messages: [
      {
        id: skipId,
        phaseId: 'ph.talk',
        topicId: 'topic.a',
        role: 'candidate',
        text: 'Who are you?',
        probeId: 'p1',
        kind: 'answer',
      },
      {
        id: answerId,
        phaseId: 'ph.talk',
        topicId: 'topic.a',
        role: 'candidate',
        text: 'I froze the API after two Sev-1s and error rate dropped 12%.',
        probeId: 'p1',
        kind: 'answer',
      },
    ],
    analysis: {
      ...response.analysis,
      turns: {
        [skipId]: {
          'iv.delivery.v1': {
            templateId: 'iv.delivery.v1',
            hostRef: 'topic.a',
            grain: 'after_turn',
            order: 1,
            status: 'skipped',
            dimensions: [],
            justification: 'Not scored — clarifying turn',
            evidence: ['Who are you?'],
            confidence: 'low',
          },
        },
        [answerId]: {
          'iv.delivery.v1': {
            templateId: 'iv.delivery.v1',
            hostRef: 'topic.a',
            grain: 'after_turn',
            order: 2,
            status: 'filled',
            confidence: 'med',
            dimensions: [
              { key: 'clarity', score: 'strong' },
              { key: 'composure', score: 'mixed' },
              { key: 'structure', score: 'strong' },
            ],
          },
        },
      },
      topics: {
        'topic.a': {
          status: 'filled',
          synthesisText: 'Owned the freeze and named a 12% drop.',
          targets: {
            owned_decision: { key: 'owned_decision', value: 'API freeze', filled: true },
            outcome_metric: { key: 'outcome_metric', value: null, filled: false },
          },
          byTemplate: {
            'iv.ownership.v1': {
              templateId: 'iv.ownership.v1',
              hostRef: 'topic.a',
              grain: 'topic_end',
              order: 1,
              status: 'filled',
              confidence: 'med',
              dimensions: [
                { key: 'agency', score: 'strong' },
                { key: 'blameShift', score: 'low' },
              ],
              justification: 'Named the freeze as theirs.',
            },
            'iv.star.v1': {
              templateId: 'iv.star.v1',
              hostRef: 'topic.a',
              grain: 'topic_end',
              order: 2,
              status: 'filled',
              confidence: 'med',
              dimensions: [
                { key: 'situation', score: 'present' },
                { key: 'task', score: 'thin' },
                { key: 'action', score: 'present' },
                { key: 'result', score: 'present' },
              ],
            },
            'synth.topic.v1': {
              templateId: 'synth.topic.v1',
              hostRef: 'topic.a',
              grain: 'topic_end',
              order: 0,
              status: 'filled',
              justification: 'Owned the freeze and named a 12% drop.',
              confidence: 'med',
            },
            'custom.oncall': {
              templateId: 'custom.oncall',
              hostRef: 'topic.a',
              grain: 'topic_end',
              order: 3,
              status: 'skipped',
              justification: 'No on-call evidence in this topic.',
              confidence: 'low',
              dimensions: [],
            },
          },
        },
      },
    },
  }
  const signalBrief = {
    ...brief,
    topicLibrary: [
      {
        id: 'topic.a',
        targets: [
          { key: 'owned_decision', required: true, label: 'Incident owner' },
          { key: 'outcome_metric', required: true, label: 'Outcome metric' },
        ],
      },
    ],
  }
  const signalScored = scoreAttempt({ brief: signalBrief, response: signalResponse })
  const deliverySources = signalScored.softGrade.byWeight.interviewDelivery.sources
  assert.equal(deliverySources.length, 1)
  assert.equal(deliverySources[0]?.templateId, 'iv.delivery.v1')
  assert.equal(deliverySources[0]?.hostRef, answerId)

  const doubled = structuredClone(signalResponse)
  doubled.analysis.turns[answerId]['iv.question.v1'] = {
    templateId: 'iv.question.v1',
    hostRef: 'topic.a',
    grain: 'after_turn',
    order: 2,
    status: 'filled',
    confidence: 'med',
    dimensions: [{ key: 'relevance', score: 'strong' }],
    justification: 'They asked what success looked like for the freeze. What does success look like?',
  }
  doubled.analysis.topics['topic.a'].byTemplate['iv.question.v1'] = {
    templateId: 'iv.question.v1',
    hostRef: 'topic.a',
    grain: 'topic_end',
    order: 3,
    status: 'filled',
    confidence: 'med',
    dimensions: [{ key: 'relevance', score: 'strong' }],
    justification: 'Across the talk they asked one on-topic freeze question. What does success look like?',
  }
  const noDouble = scoreAttempt({ brief: signalBrief, response: doubled })
  const questionSources = noDouble.softGrade.byWeight.interviewDelivery.sources.filter(
    (s) => s.templateId === 'iv.question.v1',
  )
  assert.equal(questionSources.length, 1, 'question scores from turns only')
  assert.equal(questionSources[0]?.hostRef, answerId)
  const contentSources = signalScored.softGrade.byWeight.interviewContent.sources
  assert.equal(contentSources.length, 2, `content sources=${contentSources.map((s) => s.templateId)}`)
  assert.ok(contentSources.some((s) => s.templateId === 'iv.ownership.v1'))
  assert.ok(contentSources.some((s) => s.templateId === 'iv.star.v1'))
  const axes = signalScored.softGrade.byWeight.interviewContent.axes ?? []
  assert.ok(axes.some((a) => a.key === 'ownership.agency'), JSON.stringify(axes))
  assert.ok(axes.some((a) => a.key === 'star.action'), JSON.stringify(axes))
  assert.match(signalScored.artifacts.topicSynths['topic.a'] ?? '', /freeze/)
  assert.ok(signalScored.artifacts.targets['topic.a']?.some((t) => t.key === 'owned_decision' && t.filled))
  assert.ok(signalScored.artifacts.targetMisses.some((m) => m.key === 'outcome_metric' && m.label === 'Outcome metric'))
}

{
  const weightBrief = {
    tools: { 'tool.code': { type: 'coding' } },
    analysis: {
      rollup: {
        weights: {
          codingTests: 0,
          codingMethod: 0.1,
          essay: 0,
          interviewDelivery: 0,
          interviewContent: 0,
        },
      },
    },
  }
  const grain = (templateId, unit) => ({
    templateId,
    hostRef: 'tool.code',
    grain: 'after_tool',
    order: 1,
    status: 'filled',
    confidence: 'med',
    result: { softComposite: unit },
  })
  const weightScored = scoreAttempt({
    brief: weightBrief,
    response: {
      schema: 'vurify/interview-response',
      version: 1,
      briefId: 'w',
      messages: [],
      completedPhaseIds: ['ph.code'],
      skippedPhaseIds: [],
      analysis: {
        turns: {},
        topics: {},
        tools: {
          'tool.code': {
            'mark.code.method.v1': grain('mark.code.method.v1', 0.8),
            'mark.code.structure.v1': grain('mark.code.structure.v1', 0.6),
            'mark.code.approach.v1': grain('mark.code.approach.v1', 0.5),
            'mark.assist.use.v1': grain('mark.assist.use.v1', 0.4),
          },
        },
      },
    },
  })
  const bucket = weightScored.softGrade.byWeight.codingMethod
  assert.ok(bucket.included)
  assert.equal(Math.round((bucket.unit ?? 0) * 1000) / 1000, 0.66)
  const approach = weightScored.contributions.find((c) => c.templateId === 'mark.code.approach.v1')
  const methodC = weightScored.contributions.find((c) => c.templateId === 'mark.code.method.v1')
  const assistOnTools = weightScored.contributions.find(
    (c) => c.templateId === 'mark.assist.use.v1',
  )
  assert.equal(assistOnTools, undefined)
  assert.equal(approach?.sourceWeight, 0.5)
  assert.equal(Math.round((approach?.share ?? 0) * 1000) / 1000, 0.2)
  assert.ok(
    (approach?.towardOverall ?? 1) < (methodC?.towardOverall ?? 0),
    'process mark must contribute less than method (sourceWeight 0.5)',
  )
}

{
  // mark.code.authorship.v1 is sourceWeight 0.5 into codingMethod (same as approach).
  const authBrief = {
    tools: { 'tool.code': { type: 'coding' } },
    analysis: {
      rollup: {
        weights: {
          codingTests: 0,
          codingMethod: 0.1,
          essay: 0,
          interviewDelivery: 0,
          interviewContent: 0,
        },
      },
    },
  }
  const grain = (templateId, unit) => ({
    templateId,
    hostRef: 'tool.code',
    grain: 'after_tool',
    order: 1,
    status: 'filled',
    confidence: 'med',
    result: { softComposite: unit },
  })
  const withAuth = scoreAttempt({
    brief: authBrief,
    response: {
      schema: 'vurify/interview-response',
      version: 1,
      briefId: 'w-auth',
      messages: [],
      completedPhaseIds: ['ph.code'],
      skippedPhaseIds: [],
      analysis: {
        turns: {},
        topics: {},
        tools: {
          'tool.code': {
            'mark.code.method.v1': grain('mark.code.method.v1', 0.8),
            'mark.code.structure.v1': grain('mark.code.structure.v1', 0.6),
            'mark.code.approach.v1': grain('mark.code.approach.v1', 0.5),
            'mark.code.authorship.v1': grain('mark.code.authorship.v1', 0.5),
          },
        },
      },
    },
  })
  const authC = withAuth.contributions.find((c) => c.templateId === 'mark.code.authorship.v1')
  assert.equal(authC?.sourceWeight, 0.5)
  assert.notEqual(Math.round((withAuth.softGrade.byWeight.codingMethod.unit ?? 0) * 1000) / 1000, 0.66)
}

{
  const assistBrief = {
    tools: { 'tool.code': { type: 'coding' } },
    analysis: {
      rollup: {
        weights: {
          codingTests: 0,
          codingMethod: 1,
          essay: 0,
          interviewDelivery: 0,
          interviewContent: 0,
        },
      },
    },
  }
  const dimGrain = (hostRef, unit) => ({
    templateId: 'mark.assist.use.v1',
    hostRef,
    grain: 'after_turn',
    order: 1,
    status: 'filled',
    confidence: 'med',
    dimensions: [
      { key: 'asked_well', score: unit >= 0.75 ? 'strong' : unit >= 0.4 ? 'mixed' : 'weak' },
      { key: 'over_reliance', score: 'mixed' },
      { key: 'applied_judgment', score: 'mixed' },
      { key: 'integrity', score: 'mixed' },
    ],
  })
  const method = {
    templateId: 'mark.code.method.v1',
    hostRef: 'tool.code',
    grain: 'after_tool',
    order: 1,
    status: 'filled',
    confidence: 'med',
    result: { softComposite: 0.8 },
  }
  const structure = {
    templateId: 'mark.code.structure.v1',
    hostRef: 'tool.code',
    grain: 'after_tool',
    order: 2,
    status: 'filled',
    confidence: 'med',
    result: { softComposite: 0.6 },
  }
  const turns = {}
  for (let i = 0; i < 8; i++) {
    turns[`m${i}`] = { 'mark.assist.use.v1': dimGrain('tool.code', 1) }
  }
  const scored = scoreAttempt({
    brief: assistBrief,
    response: {
      schema: 'vurify/interview-response',
      version: 1,
      briefId: 'assist',
      messages: [],
      completedPhaseIds: ['ph.code'],
      skippedPhaseIds: [],
      analysis: {
        turns,
        topics: {},
        tools: {
          'tool.code': {
            'mark.code.method.v1': method,
            'mark.code.structure.v1': structure,
            'mark.assist.use.v1': {
              templateId: 'mark.assist.use.v1',
              hostRef: 'tool.code',
              grain: 'after_tool',
              order: 22,
              status: 'filled',
              confidence: 'med',
              justification: 'Display leftover only.',
              result: { deepSummary: 'Two grafs.' },
              dimensions: [
                { key: 'asked_well', score: 'strong' },
                { key: 'over_reliance', score: 'strong' },
                { key: 'applied_judgment', score: 'strong' },
                { key: 'integrity', score: 'strong' },
              ],
            },
          },
        },
      },
    },
  })
  const assistSrc = scored.softGrade.byWeight.codingMethod.sources.filter(
    (s) => s.templateId === 'mark.assist.use.v1',
  )
  assert.equal(assistSrc.length, 1)
  assert.equal(scored.softGrade.byWeight.interviewDelivery.sources.length, 0)
  const assistC = scored.contributions.filter((c) => c.templateId === 'mark.assist.use.v1')
  assert.equal(assistC.length, 1)
  assert.equal(assistC[0].sourceWeight, 0.5)
  const methodShare = scored.contributions.find((c) => c.templateId === 'mark.code.method.v1')
  assert.ok((assistC[0].towardOverall ?? 1) < (methodShare?.towardOverall ?? 0))
}

assert.equal(sittingResultStatus(1, false), 'pending')
assert.equal(sittingResultStatus(1, true), 'partial')
assert.equal(sittingResultStatus(0, true), 'complete')
assert.equal(sittingResultStatus(0, false), 'complete')

{
  const pendingScored = scoreAttempt({
    brief: {
      phases: [{ id: 'ph.code', kind: 'tool', toolRef: 'tool.code' }],
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
    },
    response: {
      schema: 'vurify/interview-response',
      version: 1,
      briefId: 'pending',
      messages: [],
      completedPhaseIds: [],
      skippedPhaseIds: [],
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
              status: 'pending',
              result: null,
              justification: '',
              confidence: 'low',
            },
          },
        },
      },
    },
  })
  assert.ok(pendingScored.pendingCount > 0)
  assert.equal(pendingScored.resultStatus, 'pending')
}

{
  const signalPending = scoreAttempt({
    brief: {
      phases: [],
      tools: {},
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
    },
    response: {
      schema: 'vurify/interview-response',
      version: 1,
      briefId: 'signals',
      messages: [],
      completedPhaseIds: [],
      skippedPhaseIds: [],
      analysis: {
        turns: {},
        topics: {},
        tools: {},
        signals: {
          'sig.clarity.v1': {
            templateId: 'sig.clarity.v1',
            hostRef: 'attempt',
            grain: 'interview_end',
            order: 1,
            status: 'pending',
            result: null,
            justification: '',
          },
        },
      },
    },
  })
  assert.ok(signalPending.pendingCount > 0)
  assert.equal(signalPending.resultStatus, 'pending')
}

/* --- Stage 1: marking must never report an unmarked attempt as a real zero --- */

const MARK_WEIGHTS = {
  phases: [],
  tools: { 'tool.code': { type: 'coding' } },
  analysis: {
    rollup: {
      weights: { codingTests: 0.5, codingMethod: 0.5 },
    },
  },
}

function markResponse(briefId, tools, extra = {}) {
  return {
    schema: 'vurify/interview-response',
    version: 1,
    briefId,
    messages: [],
    completedPhaseIds: [],
    skippedPhaseIds: [],
    analysis: { turns: {}, topics: {}, tools, ...extra },
  }
}

function grain(templateId, status, result = null) {
  return {
    templateId,
    hostRef: 'tool.code',
    grain: 'after_tool',
    order: 1,
    status,
    result,
    justification: '',
    confidence: 'low',
  }
}

const TESTS_PASS = { passedCount: 4, total: 4, score: 4, max: 4 }

// Every stage died: no pending work left, but nothing was marked either.
{
  const allSkipped = scoreAttempt({
    brief: MARK_WEIGHTS,
    response: markResponse('all-skipped', {
      'tool.code': {
        'mark.code.tests.v1': grain('mark.code.tests.v1', 'skipped'),
        'mark.code.method.v1': grain('mark.code.method.v1', 'skipped'),
      },
    }),
  })
  assert.equal(allSkipped.pendingCount, 0)
  assert.equal(allSkipped.grainCounts.skipped, 2)
  assert.equal(allSkipped.grainCounts.filled, 0)
  assert.equal(allSkipped.resultStatus, 'unmarked')
  assert.equal(
    sittingResultHeadlinePending(allSkipped.resultStatus),
    true,
    'an unmarked attempt must not present its 0 as a headline score',
  )
  const progress = sittingMarkingProgress(allSkipped.grainCounts)
  assert.equal(progress.percent, 100)
  assert.equal(progress.skipped, 2)
}

// Some marked, some died: a real score, and marking is over.
{
  const partial = scoreAttempt({
    brief: MARK_WEIGHTS,
    response: markResponse('part-skipped', {
      'tool.code': {
        'mark.code.tests.v1': grain('mark.code.tests.v1', 'filled', TESTS_PASS),
        'mark.code.method.v1': grain('mark.code.method.v1', 'skipped'),
      },
    }),
  })
  assert.equal(partial.pendingCount, 0)
  assert.equal(partial.grainCounts.filled, 1)
  assert.equal(partial.grainCounts.skipped, 1)
  assert.equal(partial.resultStatus, 'complete')
  assert.equal(sittingResultHeadlinePending(partial.resultStatus), false)
  assert.equal(sittingMarkingProgress(partial.grainCounts).percent, 100)
}

// Still marking: half the grains have landed, so the bar can show a real percentage.
{
  const midway = scoreAttempt({
    brief: MARK_WEIGHTS,
    response: markResponse('midway', {
      'tool.code': {
        'mark.code.tests.v1': grain('mark.code.tests.v1', 'filled', TESTS_PASS),
        'mark.code.method.v1': grain('mark.code.method.v1', 'pending'),
      },
    }),
  })
  assert.equal(midway.resultStatus, 'partial')
  const progress = sittingMarkingProgress(midway.grainCounts, 1)
  assert.equal(progress.total, 2)
  assert.equal(progress.settled, 1)
  assert.equal(progress.percent, 50)
  assert.equal(progress.inflightJobs, 1)
}

// A corrupt topic missing byTemplate must not throw the whole score.
{
  const corrupt = scoreAttempt({
    brief: MARK_WEIGHTS,
    response: markResponse(
      'corrupt',
      {},
      { topics: { 'topic.a': { status: 'filled' } }, signals: {} },
    ),
  })
  assert.equal(corrupt.grainCounts.total, 0)
  assert.equal(corrupt.pendingCount, 0)
}

// Direct status table.
assert.equal(sittingResultStatus(0, false, 0), 'complete')
assert.equal(sittingResultStatus(0, false, 3), 'unmarked')
assert.equal(sittingResultStatus(0, true, 3), 'complete')
assert.equal(sittingResultStatus(2, false, 1), 'pending')
assert.equal(sittingResultStatus(2, true, 1), 'partial')
assert.equal(sittingMarkingProgress({ filled: 0, pending: 0, skipped: 0, total: 0 }).percent, 100)

// ── Step 5 fairness gate: absence must cost, not shrink the denominator ──────────
// Two candidates, identical Talk marks. One also attempted coding and did badly;
// the other forfeited coding entirely. Under the old renormalising denominator the
// forfeiter scored higher, because their empty bucket was dropped and the weights
// were rescaled onto the stages they did attempt.
{
  const fairBrief = {
    topicLibrary: [{ id: 'topic.a', targets: [] }],
    phases: [
      { id: 'ph.talk', kind: 'discussion', topicId: 'topic.a' },
      { id: 'ph.code', kind: 'tool', toolRef: 'tool.code' },
    ],
    tools: { 'tool.code': { type: 'coding' } },
    analysis: {
      rollup: {
        weights: { codingTests: 0.5, interviewContent: 0.5 },
        weightSections: { codingTests: ['ph.code'], interviewContent: ['ph.talk'] },
      },
    },
  }

  const talkOnlyAnalysis = {
    turns: {},
    tools: {},
    toolPackages: {},
    signals: {},
    topics: {
      'topic.a': {
        status: 'filled',
        targets: {},
        byTemplate: {
          'synth.topic.v1': {
            templateId: 'synth.topic.v1',
            hostRef: 'topic.a',
            grain: 'topic_end',
            order: 1,
            status: 'filled',
            confidence: 'high',
            result: { composite: 0.8 },
            dimensions: [{ key: 'content', label: 'Content', score: 'strong' }],
          },
        },
      },
    },
    rollup: null,
    partial: null,
  }

  const attempted = scoreAttempt({
    brief: fairBrief,
    response: {
      schemaVersion: 1,
      briefId: 'fixture:fair',
      attemptId: 'a1',
      startedAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      phasePointer: null,
      completedPhaseIds: ['ph.talk', 'ph.code'],
      skippedPhaseIds: [],
      messages: [],
      messageRange: { firstId: null, lastId: null },
      talkRuntime: null,
      analysis: {
        ...talkOnlyAnalysis,
        tools: {
          'tool.code': {
            'mark.code.tests.v1': {
              templateId: 'mark.code.tests.v1',
              hostRef: 'tool.code',
              grain: 'after_tool',
              order: 1,
              status: 'filled',
              confidence: 'high',
              result: { passed: false, score: 1, max: 4 },
            },
          },
        },
      },
    },
  })

  const forfeited = scoreAttempt({
    brief: fairBrief,
    response: {
      schemaVersion: 1,
      briefId: 'fixture:fair',
      attemptId: 'a2',
      startedAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      phasePointer: null,
      completedPhaseIds: ['ph.talk'],
      skippedPhaseIds: ['ph.code'],
      messages: [],
      messageRange: { firstId: null, lastId: null },
      talkRuntime: null,
      analysis: talkOnlyAnalysis,
    },
  })

  assert.ok(
    forfeited.softGrade.expectedBuckets.includes('codingTests'),
    'the brief authored a coding stage, so it stays in the denominator when skipped',
  )
  assert.equal(
    forfeited.softGrade.byWeight.codingTests.included,
    true,
    'a forfeited authored bucket is included at 0, not dropped',
  )
  assert.equal(forfeited.softGrade.byWeight.codingTests.unit, 0)
  assert.equal(
    forfeited.softGrade.byWeight.codingTests.zeroedBy,
    'absent_skipped',
    'the zero is attributed to the candidate skipping, not to a marking failure',
  )
  assert.ok(
    forfeited.softGrade.overall < attempted.softGrade.overall,
    `forfeiting must not beat attempting: forfeited ${forfeited.softGrade.overall} vs attempted ${attempted.softGrade.overall}`,
  )
  assert.equal(
    forfeited.resultStatus !== 'unmarked',
    true,
    'a real 0 is a result, not an unmarked attempt',
  )
}

// ── Step 6 gate: our failure and the candidate's absence must not look alike ─────
{
  const brief6 = {
    topicLibrary: [{ id: 'topic.a', targets: [] }],
    phases: [
      { id: 'ph.talk', kind: 'discussion', topicId: 'topic.a' },
      { id: 'ph.code', kind: 'tool', toolRef: 'tool.code' },
    ],
    tools: { 'tool.code': { type: 'coding' } },
    analysis: {
      rollup: {
        weights: { codingTests: 0.5, interviewContent: 0.5 },
        weightSections: { codingTests: ['ph.code'], interviewContent: ['ph.talk'] },
      },
    },
  }
  // The candidate completed the coding stage; the assessor died, so its grains
  // settled as skipped. Same 0 as a forfeit, but not the same fact.
  const markDied = scoreAttempt({
    brief: brief6,
    response: {
      schemaVersion: 1,
      briefId: 'fixture:mark-died',
      attemptId: 'a4',
      startedAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      phasePointer: null,
      completedPhaseIds: ['ph.talk', 'ph.code'],
      skippedPhaseIds: [],
      messages: [],
      messageRange: { firstId: null, lastId: null },
      talkRuntime: null,
      analysis: {
        turns: {},
        topics: {},
        toolPackages: {},
        signals: {},
        tools: {
          'tool.code': {
            'mark.code.tests.v1': {
              templateId: 'mark.code.tests.v1',
              hostRef: 'tool.code',
              grain: 'after_tool',
              order: 1,
              status: 'skipped',
              result: null,
              justification: 'Marking failed for this stage (llm_timeout).',
              confidence: 'low',
            },
          },
        },
        rollup: null,
        partial: null,
      },
    },
  })
  assert.equal(
    markDied.softGrade.byWeight.codingTests.zeroedBy,
    'mark_failed',
    'a completed stage with no usable mark is our failure, not the candidate\'s absence',
  )
  assert.equal(
    markDied.resultStatus,
    'needs_review',
    'a score we broke must not ship as complete',
  )
  // Every other authored bucket in this fixture is also unmarked on a completed
  // phase, so they carry the same reason — the attribution rule is uniform.
  assert.ok(
    markDied.softGrade.zeroedBuckets.some((z) => z.bucket === 'codingTests'),
    'the broken bucket is named, not just counted',
  )
  assert.ok(
    markDied.softGrade.zeroedBuckets.every((z) => z.reason === 'mark_failed'),
    `completed phases with no marks are all our failure: ${JSON.stringify(markDied.softGrade.zeroedBuckets)}`,
  )
}

// Negative case: the same shape with the stage skipped is the candidate's absence,
// so it scores 0 without dragging a human into review.
assert.equal(sittingResultStatus(0, true, 1, 0), 'complete')
assert.equal(sittingResultStatus(0, true, 1, 1), 'needs_review')
assert.equal(sittingResultStatus(2, true, 1, 1), 'partial', 'still-pending wins over review')

// ── An axis label we could not read is our defect, not a candidate's zero ────────
// `grainUnit` scores an unmapped label 0 by fallback, which drags the overall down
// for a parsing failure. It must reach a human rather than ship as a clean result.
assert.equal(sittingResultStatus(0, true, 0, 0, 1), 'needs_review')
// Negative: no unmapped axes leaves the clean path clean.
assert.equal(sittingResultStatus(0, true, 0, 0, 0), 'complete')
{
  const unreadableLabel = scoreAttempt({
    brief: {
      phases: [{ id: 'ph.talk', kind: 'talk', topicId: 'topic.a' }],
      analysis: {
        rollup: { weights: { interviewContent: 1 } },
        overrides: { templateCards: { 'custom.axes': { outputKind: 'dimensions' } } },
      },
    },
    response: {
      analysis: {
        turns: {},
        tools: {},
        topics: {
          'topic.a': {
            byTemplate: {
              'custom.axes': {
                templateId: 'custom.axes',
                status: 'filled',
                result: null,
                dimensions: [{ key: 'a', score: 'excellent' }],
              },
            },
          },
        },
      },
      completedPhaseIds: ['ph.talk'],
      skippedPhaseIds: [],
    },
  })
  assert.deepEqual(unreadableLabel.softGrade.unmappedAxes, ['custom.axes:a'])
  assert.equal(
    unreadableLabel.resultStatus,
    'needs_review',
    'a label the scorer could not map must not ship as a settled score',
  )
}

// ── Pending after-turn marks are not absence ─────────────────────────────────────
// Delivery is fed entirely from `analysis.turns`, keyed by message id. The pending
// guard has to match those grains on `hostRef` or it never sees them, and the bucket
// zeroes as `mark_failed` while its marks are still in flight.
{
  const deliveryInFlight = scoreAttempt({
    brief: {
      phases: [{ id: 'ph.talk', kind: 'talk', topicId: 'topic.a' }],
      analysis: { rollup: { weights: { interviewDelivery: 0.5, interviewContent: 0.5 } } },
    },
    response: {
      analysis: {
        turns: {
          'msg-1': {
            'iv.delivery.v1': {
              templateId: 'iv.delivery.v1',
              hostRef: 'topic.a',
              status: 'pending',
              result: null,
              dimensions: [],
            },
          },
        },
        tools: {},
        topics: {},
      },
      completedPhaseIds: ['ph.talk'],
      skippedPhaseIds: [],
    },
  })
  assert.equal(
    deliveryInFlight.softGrade.byWeight.interviewDelivery.zeroedBy,
    undefined,
    'a bucket whose marks are still running has not failed — it is not finished',
  )
  assert.equal(deliveryInFlight.softGrade.byWeight.interviewDelivery.included, false)

  // Negative: once that grain settles as skipped, nothing is in flight and the
  // bucket zeroes for real.
  const deliveryDrained = scoreAttempt({
    brief: {
      phases: [{ id: 'ph.talk', kind: 'talk', topicId: 'topic.a' }],
      analysis: { rollup: { weights: { interviewDelivery: 0.5, interviewContent: 0.5 } } },
    },
    response: {
      analysis: {
        turns: {
          'msg-1': {
            'iv.delivery.v1': {
              templateId: 'iv.delivery.v1',
              hostRef: 'topic.a',
              status: 'skipped',
              result: null,
              dimensions: [],
            },
          },
        },
        tools: {},
        topics: {},
      },
      completedPhaseIds: ['ph.talk'],
      skippedPhaseIds: [],
    },
  })
  assert.equal(
    deliveryDrained.softGrade.byWeight.interviewDelivery.zeroedBy,
    'mark_failed',
    'a completed talk phase that produced no delivery mark is our failure',
  )
}

// Negative case: a bucket the brief never authored must stay excluded, so the
// expected-set rule cannot quietly zero every candidate on stages nobody ran.
{
  const talkOnlyBrief = {
    topicLibrary: [{ id: 'topic.a', targets: [] }],
    phases: [{ id: 'ph.talk', kind: 'discussion', topicId: 'topic.a' }],
    tools: {},
    analysis: { rollup: { weights: { codingTests: 0.5, interviewContent: 0.5 } } },
  }
  const scoredTalkOnly = scoreAttempt({
    brief: talkOnlyBrief,
    response: {
      schemaVersion: 1,
      briefId: 'fixture:talk-only',
      attemptId: 'a3',
      startedAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      phasePointer: null,
      completedPhaseIds: ['ph.talk'],
      skippedPhaseIds: [],
      messages: [],
      messageRange: { firstId: null, lastId: null },
      talkRuntime: null,
      analysis: {
        turns: {},
        tools: {},
        toolPackages: {},
        signals: {},
        topics: {},
        rollup: null,
        partial: null,
      },
    },
  })
  assert.ok(
    !scoredTalkOnly.softGrade.expectedBuckets.includes('codingTests'),
    'no coding stage authored means coding is not asked, so it is not absence',
  )
  assert.equal(scoredTalkOnly.softGrade.byWeight.codingTests.included, false)
}

{
  const customGrain = {
    templateId: 'custom.impact',
    hostRef: 'topic.a',
    grain: 'topic_end',
    order: 1,
    status: 'filled',
    confidence: 'low',
    dimensions: [
      {
        key: 'impact',
        score: 'emerging',
        depth: { position: 2, rungIndex: 1, instanceCount: 1, decisiveCount: 0 },
      },
    ],
  }
  const customBrief = {
    topicLibrary: [{ id: 'topic.a', targets: [] }],
    phases: [{ id: 'ph.talk', kind: 'discussion', topicId: 'topic.a' }],
    analysis: {
      rollup: { weights: { interviewContent: 1 } },
      overrides: {
        templateCards: {
          'custom.impact': {
            outputKind: 'dimensions',
            decisionBucket: 'interviewContent',
            dimensions: [
              { key: 'impact', options: ['absent', 'emerging', 'consistent'], weight: 1 },
            ],
          },
        },
      },
    },
  }
  const customResponse = {
    schema: 'vurify/interview-response',
    version: 1,
    briefId: 'unit-depth',
    messages: [],
    completedPhaseIds: ['ph.talk'],
    skippedPhaseIds: [],
    analysis: {
      turns: {},
      topics: {
        'topic.a': {
          status: 'filled',
          synthesisText: '',
          targets: {},
          byTemplate: { 'custom.impact': customGrain },
        },
      },
      tools: {},
    },
  }
  assert.equal(scoreGrainUnit('custom.impact', customGrain, customBrief), 0.4)
  const scoredCustom = scoreAttempt({ brief: customBrief, response: customResponse })
  assert.equal(scoredCustom.softGrade.byWeight.interviewContent.unit, 0.4)
  assert.equal(scoredCustom.softGrade.depthStandardVersion, 1)

  const fiveRungBrief = {
    ...customBrief,
    analysis: {
      ...customBrief.analysis,
      overrides: {
        templateCards: {
          'custom.impact': {
            outputKind: 'dimensions',
            decisionBucket: 'interviewContent',
            dimensions: [{ key: 'impact', options: ['a', 'b', 'c', 'd', 'e'], weight: 1 }],
          },
        },
      },
    },
  }
  assert.equal(
    scoreGrainUnit('custom.impact', customGrain, customBrief),
    scoreGrainUnit('custom.impact', customGrain, fiveRungBrief),
    'same evidence, different rung counts, same unit',
  )

  const weightedBrief = {
    ...customBrief,
    analysis: {
      ...customBrief.analysis,
      overrides: {
        templateCards: {
          'custom.impact': {
            outputKind: 'dimensions',
            decisionBucket: 'interviewContent',
            dimensions: [
              { key: 'impact', options: ['absent', 'emerging', 'consistent'], weight: 3 },
              { key: 'scale', options: ['absent', 'emerging', 'consistent'], weight: 1 },
            ],
          },
        },
      },
    },
  }
  const twoAxis = {
    ...customGrain,
    confidence: 'med',
    dimensions: [
      {
        key: 'impact',
        score: 'consistent',
        depth: { position: 5, rungIndex: 2, instanceCount: 3, decisiveCount: 1 },
      },
      {
        key: 'scale',
        score: 'absent',
        depth: { position: 0, rungIndex: 0, instanceCount: 0, decisiveCount: 0 },
      },
    ],
  }
  const equal = scoreGrainUnit('custom.impact', twoAxis, customBrief)
  const weighted = scoreGrainUnit('custom.impact', twoAxis, weightedBrief)
  assert.ok(weighted > equal, `authored weights must move the unit: ${weighted} vs ${equal}`)

  const unmappedGrain = {
    templateId: 'iv.delivery.v1',
    hostRef: 'm1',
    grain: 'after_turn',
    order: 1,
    status: 'filled',
    confidence: 'med',
    dimensions: [{ key: 'clarity', score: 'emerging' }],
  }
  const flagged = scoreAttempt({
    brief: {
      topicLibrary: [{ id: 'topic.a', targets: [] }],
      phases: [{ id: 'ph.talk', kind: 'discussion', topicId: 'topic.a' }],
      analysis: { rollup: { weights: { interviewDelivery: 1 } } },
    },
    response: {
      schema: 'vurify/interview-response',
      version: 1,
      briefId: 'unit-unmapped',
      messages: [{ id: 'm1', phaseId: 'ph.talk', role: 'candidate', kind: 'answer', text: 'x', at: '' }],
      completedPhaseIds: ['ph.talk'],
      skippedPhaseIds: [],
      analysis: {
        turns: { m1: { 'iv.delivery.v1': unmappedGrain } },
        topics: {},
        tools: {},
      },
    },
  })
  assert.ok(
    (flagged.softGrade.unmappedAxes ?? []).some((id) => id.includes('clarity')),
    'unmapped authored label is flagged instead of silently dropped',
  )
}

// ── Tiered weighting: template → section → bucket → overall ─────────────────────
// The ladder used to be flat inside a bucket: every source blended by template weight,
// so a section carrying five templates outvoted a section carrying one on count alone.
{
  const essayTool = (ref) => ({
    type: 'doc',
    assessment: {
      kind: 'rubric',
      dimensions: [{ key: 'k', label: 'K', bands: [{ id: 'b1', label: '1' }, { id: 'b2', label: '2' }] }],
    },
    __ref: ref,
  })
  const twoSectionBrief = (rollup) => ({
    schemaVersion: 1,
    kind: 'interview_brief',
    definition: {},
    topicLibrary: [],
    phases: [
      { id: 'ph.a', kind: 'tool', toolRef: 'tool.a', title: 'Essay A' },
      { id: 'ph.b', kind: 'tool', toolRef: 'tool.b', title: 'Essay B' },
    ],
    tools: { 'tool.a': essayTool('a'), 'tool.b': essayTool('b') },
    analysis: { rollup: { weights: { essay: 1 }, ...rollup } },
  })
  // Section A: one template at 1.0. Section B: one template at 0.0.
  const essayGrain = (composite) => ({
    templateId: 'mark.doc.essay.v1',
    grain: 'after_tool',
    status: 'filled',
    result: { composite },
    dimensions: [{ key: 'k', label: 'K', score: '2', max: 2 }],
  })
  const twoSectionResponse = {
    messages: [],
    analysis: {
      turns: {},
      topics: {},
      tools: {
        'tool.a': { 'mark.doc.essay.v1': { ...essayGrain(1), hostRef: 'tool.a' } },
        'tool.b': { 'mark.doc.essay.v1': { ...essayGrain(0), hostRef: 'tool.b' } },
      },
    },
    completedPhaseIds: ['ph.a', 'ph.b'],
    skippedPhaseIds: [],
  }

  // Equal sections by default: 1.0 and 0.0 average to 0.5.
  const even = scoreAttempt({ brief: twoSectionBrief({}), response: twoSectionResponse })
  assert.ok(
    Math.abs(even.softGrade.byWeight.essay.unit - 0.5) < 1e-9,
    `sections count equally by default, got ${even.softGrade.byWeight.essay.unit}`,
  )

  // Tier 2: authored section weight shifts the bucket toward the heavier section.
  const tilted = scoreAttempt({
    brief: twoSectionBrief({ sectionWeights: { 'ph.a': 3, 'ph.b': 1 } }),
    response: twoSectionResponse,
  })
  assert.ok(
    Math.abs(tilted.softGrade.byWeight.essay.unit - 0.75) < 1e-9,
    `3:1 sections give 0.75, got ${tilted.softGrade.byWeight.essay.unit}`,
  )

  // Tier 2 zero: the weak section is recorded but does not count.
  const droppedSection = scoreAttempt({
    brief: twoSectionBrief({ sectionWeights: { 'ph.b': 0 } }),
    response: twoSectionResponse,
  })
  assert.equal(droppedSection.softGrade.byWeight.essay.unit, 1, 'a 0-weight section does not count')
  assert.ok(
    droppedSection.softGrade.byWeight.essay.sources.length >= 2,
    'the excluded section still shows in the report',
  )

  // Tier 1 zero: the same, one template down.
  const droppedTemplate = scoreAttempt({
    brief: twoSectionBrief({ templateWeights: { 'ph.b': { 'mark.doc.essay.v1': 0 } } }),
    response: twoSectionResponse,
  })
  assert.equal(droppedTemplate.softGrade.byWeight.essay.unit, 1, 'a 0-weight template does not count')

  // Zeroing everything is an EXCLUSION, not a zero. Scoring 0 here would punish the
  // candidate for the author's weighting.
  const allOff = scoreAttempt({
    brief: twoSectionBrief({ sectionWeights: { 'ph.a': 0, 'ph.b': 0 } }),
    response: twoSectionResponse,
  })
  assert.equal(allOff.softGrade.byWeight.essay.included, false, 'fully weighted-off bucket is excluded')
  assert.notEqual(allOff.softGrade.byWeight.essay.unit, 0, 'weighted off is not the same as scored zero')
  assert.ok(allOff.softGrade.excludedBuckets.includes('essay'))

  // The legend adds up to the grade: contributions sum to the bucket's share of overall.
  const contribs = even.contributions.filter((c) => c.bucket === 'essay')
  const shareSum = contribs.reduce((s, c) => s + c.share, 0)
  assert.ok(Math.abs(shareSum - 1) < 1e-9, `bucket shares sum to 1, got ${shareSum}`)
  const towardSum = contribs.reduce((s, c) => s + c.towardOverall, 0)
  const essayNorm = even.softGrade.byWeight.essay.weight
  assert.ok(
    Math.abs(towardSum - essayNorm * even.softGrade.byWeight.essay.unit) < 1e-9,
    'contributions reconcile with the bucket unit and its normalised weight',
  )
}

{
  const customBrief = {
    ...brief,
    analysis: {
      rollup: {
        weights: { 'coding-output': 1 },
        weightSections: { 'coding-output': ['ph.code'] },
        weightTemplates: { 'coding-output': ['mark.code.tests.v1'] },
        weightLabels: { 'coding-output': 'Coding output' },
      },
    },
  }
  const customScored = scoreAttempt({ brief: customBrief, response })
  assert.ok(customScored.softGrade.byWeight['coding-output']?.included)
  assert.equal(customScored.softGrade.byWeight.codingTests, undefined)
  assert.equal(customScored.softGrade.byWeight['coding-output'].label, 'Coding output')
  assert.ok(
    !customScored.softGrade.expectedBuckets.includes('interviewDelivery'),
    'custom-only weights must not inject interviewDelivery',
  )
  assert.ok(scored.softGrade.byWeight.codingTests.included, 'old six-key brief still uses catalog codingTests')

  const expectedCustom = expectedSoftBuckets(customBrief)
  assert.equal(expectedCustom.has('interviewDelivery'), false)
  assert.equal(expectedCustom.has('coding-output'), true)
  const expectedOld = expectedSoftBuckets(brief)
  assert.ok(expectedOld.has('interviewDelivery'))
  assert.ok(expectedOld.has('codingTests'))

  const emptyWrite = expectedSoftBuckets({
    phases: [{ id: 'ph.talk', kind: 'discussion', topicId: 'topic.a' }],
    analysis: {
      rollup: {
        weights: { talk: 0.5, write: 0.5 },
        weightTemplates: { talk: ['iv.delivery.v1'] },
      },
    },
  })
  assert.equal(emptyWrite.has('interviewDelivery'), false)
  assert.ok(emptyWrite.has('write'), 'empty authored custom folder stays in the expected set')
}

{
  const sectionBrief = {
    ...brief,
    analysis: {
      rollup: {
        weights: { 'coding-work': 1 },
        weightSections: { 'coding-work': ['ph.code'] },
        weightLabels: { 'coding-work': 'Coding' },
      },
    },
  }
  const sectionScored = scoreAttempt({ brief: sectionBrief, response })
  assert.ok(sectionScored.softGrade.byWeight['coding-work']?.included)
  assert.ok(
    sectionScored.softGrade.byWeight['coding-work'].sources.some(
      (s) => s.templateId === 'mark.code.tests.v1',
    ),
    'grain on ph.code joins the folder that lists ph.code with no weightTemplates',
  )
  assert.equal(sectionScored.softGrade.byWeight.codingTests, undefined)

  const sixKeyAssign = {
    ...brief,
    analysis: {
      rollup: {
        ...brief.analysis.rollup,
        weightTemplates: {
          codingTests: ['mark.code.tests.v1'],
          codingMethod: ['mark.code.method.v1', 'mark.code.structure.v1'],
        },
      },
    },
  }
  const sixScored = scoreAttempt({ brief: sixKeyAssign, response })
  assert.ok(sixScored.softGrade.byWeight.codingTests?.included, 'six-key + weightTemplates still uses catalog folder')
  assert.ok(
    sixScored.softGrade.byWeight.codingTests.sources.every((s) => s.templateId === 'mark.code.tests.v1'),
    'tests grain stays in codingTests when weightTemplates assign folders',
  )

  const methodZero = scoreAttempt({
    brief: {
      ...sectionBrief,
      analysis: {
        rollup: {
          ...sectionBrief.analysis.rollup,
          templateWeights: {
            'ph.code': { 'mark.code.method.v1': 0, 'mark.code.structure.v1': 0 },
          },
        },
      },
    },
    response,
  })
  const testsUnit = methodZero.softGrade.byWeight['coding-work'].sources.find(
    (s) => s.templateId === 'mark.code.tests.v1',
  )?.unit
  assert.ok(testsUnit != null)
  assert.ok(
    methodZero.softGrade.byWeight['coding-work'].sources.some((s) => s.templateId === 'mark.code.method.v1'),
    'zero-weight method still appears in sources',
  )
  assert.ok(
    Math.abs(methodZero.softGrade.byWeight['coding-work'].unit - testsUnit) < 1e-9,
    'method weight 0 does not move the coding-work folder unit',
  )
}

{
  const here = dirname(fileURLToPath(import.meta.url))
  const sample = JSON.parse(
    readFileSync(join(here, '../interviewBrief/fixtures/tieredDecisionSample.json'), 'utf8'),
  )
  const weights = sample.analysis.rollup.weights
  assert.equal(weights.codingTests, undefined)
  assert.equal(sample.analysis.rollup.weightTemplates, undefined)
  const mapped = mapCreator2BriefToTimeline(sample)
  const wrap = mapped.steps.find((s) => s.kind === 'wrap')
  assert.ok(wrap?.wrapEditor?.weights.every((row) => !row.templateIds?.length), 'Decision is section chips only')
  assert.equal(mapped.steps.find((s) => s.id === 'ph.talk')?.talkEditor?.templateWeights?.['iv.delivery.v1'], 0)

  const filled = {
    messages: [
      {
        id: 'm1',
        phaseId: 'ph.talk',
        topicId: 'topic.debrief',
        role: 'candidate',
        text: 'I hashed the array.',
        at: 't',
        probeId: null,
        kind: 'answer',
      },
    ],
    completedPhaseIds: ['ph.talk', 'ph.code', 'ph.doc'],
    skippedPhaseIds: [],
    analysis: {
      turns: {
        m1: {
          'iv.delivery.v1': {
            templateId: 'iv.delivery.v1',
            hostRef: 'm1',
            grain: 'after_turn',
            status: 'filled',
            confidence: 'med',
            dimensions: [
              { key: 'clarity', score: 'strong' },
              { key: 'composure', score: 'strong' },
              { key: 'structure', score: 'strong' },
            ],
          },
        },
      },
      topics: {
        'topic.debrief': {
          status: 'filled',
          synthesisText: 'Debrief',
          targets: {},
          byTemplate: {
            'iv.content.v1': {
              templateId: 'iv.content.v1',
              hostRef: 'topic.debrief',
              grain: 'topic_end',
              status: 'filled',
              confidence: 'med',
              dimensions: [
                { key: 'relevance', score: 'mixed' },
                { key: 'specificity', score: 'mixed' },
                { key: 'depth', score: 'mixed' },
              ],
            },
          },
        },
      },
      tools: {
        'tool.code': {
          'mark.code.tests.v1': {
            templateId: 'mark.code.tests.v1',
            hostRef: 'tool.code',
            grain: 'after_tool',
            status: 'filled',
            confidence: 'high',
            result: { passedCount: 2, total: 4, score: 2, max: 4 },
          },
          'mark.code.method.v1': {
            templateId: 'mark.code.method.v1',
            hostRef: 'tool.code',
            grain: 'after_tool',
            status: 'filled',
            confidence: 'med',
            dimensions: [
              { key: 'approach', score: 'weak' },
              { key: 'clarity', score: 'weak' },
              { key: 'complexity', score: 'weak' },
            ],
          },
        },
        'tool.doc': {
          'mark.doc.essay.v1': {
            templateId: 'mark.doc.essay.v1',
            hostRef: 'tool.doc',
            grain: 'after_tool',
            status: 'filled',
            confidence: 'high',
            result: { composite: 1 },
            dimensions: [{ key: 'task', label: 'Task', score: '3', max: 3 }],
          },
        },
      },
    },
  }
  const scored = scoreAttempt({ brief: sample, response: filled })
  const approach = scored.softGrade.byWeight['coding-approach']
  const write = scored.softGrade.byWeight.write
  assert.ok(approach?.included)
  assert.ok(write?.included)
  assert.ok(
    Math.abs(approach.unit - 0.5) < 1e-9,
    `coding-approach hand-compute 0.5, got ${approach.unit}`,
  )
  assert.ok(Math.abs(write.unit - 1) < 1e-9, `write hand-compute 1, got ${write.unit}`)
  assert.ok(
    Math.abs(scored.softGrade.overall - 0.7) < 1e-9,
    `overall 0.6*0.5 + 0.4*1 = 0.7, got ${scored.softGrade.overall}`,
  )
  assert.ok(
    approach.sources.some((s) => s.templateId === 'iv.delivery.v1'),
    'zero-weight delivery still in sources',
  )
  const deliveryToward = scored.contributions.find(
    (c) => c.templateId === 'iv.delivery.v1' && c.bucket === 'coding-approach',
  )
  assert.ok(deliveryToward)
  assert.equal(deliveryToward.towardOverall, 0)

  const unanswered = scoreAttempt({
    brief: sample,
    response: {
      ...filled,
      analysis: {
        ...filled.analysis,
        tools: { 'tool.code': filled.analysis.tools['tool.code'] },
      },
    },
  })
  assert.equal(unanswered.softGrade.byWeight.write.unit, 0)
  assert.equal(unanswered.softGrade.byWeight.write.included, true)
  assert.ok(unanswered.softGrade.expectedBuckets.includes('write'))
}

console.log('scoreAttempt: ok')
