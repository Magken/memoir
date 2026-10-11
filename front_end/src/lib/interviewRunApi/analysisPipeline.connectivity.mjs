/**
 * Analysis pipeline connectivity — one sample interview, every hop.
 *
 * Sample: `interviewBrief/fixtures/staffSecurityEngineer80mAnalysisConnectivity.json`
 * (Staff 80m loop with every output kind attached — not live-generated).
 *
 * Creator persist → Edge card coerce → Talk load → assessor prompts →
 * normalize/merge → score → Results homes.
 *
 * Unique canaries must survive. A drop at any hop fails this file.
 * Run via front_end:test:talk-runtime.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import sample from '../interviewBrief/fixtures/staffSecurityEngineer80mAnalysisConnectivity.json' with { type: 'json' }
import {
  resolveTemplateCardMeta,
  serializeTemplateCardMeta,
} from '../interviewBrief/analysisLabels.ts'
import { parseTemplateShapeFields } from '../interviewBrief/analysisTemplateShape.ts'
import {
  afterTurnTemplateIds,
  buildTalkContext,
  scheduleTalkTemplates,
  topicEndTemplateIds,
} from './buildTalkContext.ts'
import {
  clearInterviewResponse,
  emptyInterviewResponse,
  mergeFilledAfterTurnGrains,
  mergeFilledTopicEnd,
} from './interviewResponse.ts'
import { buildPhaseResultHomes } from './resultHomes.ts'
import { scoreAttempt } from './scoreAttempt.ts'
import { isOrderedQualityEnum } from './ordinalMaps.ts'
import { resolveTemplateRole } from './templateRoles.ts'

const root = dirname(fileURLToPath(import.meta.url))
const { normalizeAfterTurnGrains, normalizeTopicEndByTemplate } = await import(
  pathToFileURL(
    join(root, '../../../../back_end/supabase/functions/interview-talk-turn/normalizeAnalysis.ts'),
  ).href
)
const {
  buildAfterTurnUserPrompt,
  buildTopicEndGradeUserPrompt,
  buildTopicEndRollupSystemPrompt,
  rubricCardBlock,
} = await import(
  pathToFileURL(
    join(root, '../../../../back_end/supabase/functions/interview-talk-turn/prompts/analyzeTurn.ts'),
  ).href
)
const { normalizeTemplateCard } = await import(
  pathToFileURL(
    join(root, '../../../../back_end/supabase/functions/interview-brief-edit/merge.ts'),
  ).href
)

const PHASE_ID = 'ph.k5wuze'
const TOPIC_ID = 'topic.890lut'
const MSG_ID = 'msg.cand.connectivity'
const BRIEF_ID = 'connectivity:staff-ownership'

const IMPACT_ID = 'custom.impact'
const IMPACT_TITLE = 'Impact evidence rubric CANARY'
const IMPACT_AXIS = 'Impact'
const IMPACT_NOTE = 'One named instance of a metric they moved.'
const SCALAR_ID = 'custom.incident-count'
const SCALAR_TITLE = 'Incident count score CANARY'
const SCALAR_CRITERION = 'Named distinct incidents, not vibes.'
const THEME_CROSS = 'cross-team'
const ENUM_CRITICAL = 'critical'
const GATE_TITLE = 'Discussion evidence gate'
const NOTE_CANARY = 'Residual ownership concern CANARY'
const ONCALL_TITLE = 'On-call ownership stress'

const impactAuthored = {
  title: IMPACT_TITLE,
  subtitle: 'Runs on end of section',
  details: 'Score named impact evidence on this discussion.',
  outputKind: 'dimensions',
  storageKey: IMPACT_ID,
  justificationPolicy: 'always_required',
  dimensions: [
    {
      key: 'impact',
      label: IMPACT_AXIS,
      options: ['absent', 'emerging', 'consistent'],
      defaultOption: 'mixed',
      optionNotes: ['Not shown in the answer.', IMPACT_NOTE, 'Several named instances.'],
      evidenceModel: 'accumulative',
    },
  ],
  taxonomy: [],
  maxPerTurn: 3,
  enumValues: [],
}

const scalarAuthored = {
  title: SCALAR_TITLE,
  subtitle: 'Runs on end of section',
  details: 'Count distinct named incidents in the story.',
  criterion: SCALAR_CRITERION,
  outputKind: 'scalar',
  storageKey: SCALAR_ID,
  justificationPolicy: 'always_required',
  dimensions: [],
  taxonomy: [],
  maxPerTurn: 3,
  enumValues: [],
}

// --- H1 Creator persist: serialize / parse / library patch ---
{
  const parsed = parseTemplateShapeFields(IMPACT_ID, {
    outputKind: 'dimensions',
    dimensions: [
      {
        key: 'impact',
        label: IMPACT_AXIS,
        options: ['absent', 'emerging', 'consistent'],
        optionNotes: ['Not shown in the answer.', IMPACT_NOTE, 'Several named instances.'],
        evidenceModel: 'accumulative',
      },
    ],
  })
  assert.equal(parsed.dimensions[0]?.optionNotes?.[1], IMPACT_NOTE)
  const round = serializeTemplateCardMeta(IMPACT_ID, {
    ...impactAuthored,
    ...parsed,
  })
  assert.equal(round.title, IMPACT_TITLE)
  assert.equal(round.dimensions[0]?.optionNotes?.[1], IMPACT_NOTE)
  assert.equal(round.dimensions[0]?.evidenceModel, 'accumulative')
}

{
  const round = serializeTemplateCardMeta(SCALAR_ID, scalarAuthored)
  assert.equal(round.criterion, SCALAR_CRITERION, 'H1: serialize must keep scalar criterion')
  assert.equal(round.outputKind, 'scalar')
}

{
  const emptyOwn = resolveTemplateCardMeta('iv.ownership.v1', {
    title: 'iv.ownership.v1',
    details: '',
    outputKind: 'dimensions',
  })
  assert.ok(
    emptyOwn.dimensions.some((d) => d.key === 'blameShift'),
    'H1 negative: empty override must not wipe catalog blameShift',
  )
  assert.equal(
    emptyOwn.dimensions.find((d) => d.key === 'blameShift')?.polarity,
    'negative',
  )
  const emptyDelivery = resolveTemplateCardMeta('iv.delivery.v1', {
    title: 'iv.delivery.v1',
    details: '',
    outputKind: 'dimensions',
  })
  assert.equal(
    emptyDelivery.dimensions.find((d) => d.key === 'clarity')?.evidenceModel,
    'manner',
    'H1: catalog Clarity stays manner when the stored card is title-only',
  )
}

// --- H2 Edge coerce ---
{
  const impact = normalizeTemplateCard(
    {
      title: IMPACT_TITLE,
      details: 'Score named impact evidence on this discussion.',
      outputKind: 'dimensions',
      dimensions: [
        {
          key: 'impact',
          label: IMPACT_AXIS,
          options: ['absent', 'emerging', 'consistent'],
          optionNotes: ['Not shown.', IMPACT_NOTE, 'Several named instances.'],
          evidenceModel: 'accumulative',
        },
      ],
    },
    'rubric',
  )
  assert.equal(impact.title, IMPACT_TITLE)
  assert.equal(impact.dimensions[0].optionNotes[1], IMPACT_NOTE)
  assert.equal(impact.dimensions[0].evidenceModel, 'accumulative')

  const scalar = normalizeTemplateCard(
    {
      title: SCALAR_TITLE,
      details: 'Count distinct named incidents in the story.',
      outputKind: 'scalar',
      criterion: SCALAR_CRITERION,
    },
    null,
  )
  assert.equal(scalar.outputKind, 'scalar')
  assert.equal(scalar.criterion, SCALAR_CRITERION, 'H2: Edge coerce must keep scalar criterion')
}

assert.equal(
  sample.analysis.overrides.templateCards[SCALAR_ID].criterion,
  SCALAR_CRITERION,
  'H1: sample interview persist must keep scalar criterion',
)
assert.equal(
  sample.analysis.overrides.templateCards[IMPACT_ID].title,
  IMPACT_TITLE,
)
assert.ok(
  sample.analysis.overrides.templateCards['iv.ownership.v1'].dimensions.some(
    (d) => d.key === 'blameShift',
  ),
  'H1: sample persist must fill catalog axes onto a title-only ownership card',
)
assert.ok(
  sample.topicLibrary
    .find((t) => t.id === TOPIC_ID)
    ?.analysis?.templateIds.includes(IMPACT_ID),
  'H1: sample ownership Talk attaches the impact rubric',
)

// --- H3 Talk load + schedule ---
const talk = buildTalkContext({
  briefId: BRIEF_ID,
  brief: sample,
  phaseId: PHASE_ID,
})
assert.ok(talk, 'H3: discussion loads for the ownership phase')
assert.equal(talk.topicId, TOPIC_ID)
assert.equal(talk.opener.source, 'authored_probe')
assert.ok(talk.topic.probes.length >= 2, 'H3: authored probes load')
assert.ok(talk.topic.analysis.templateIds.includes(IMPACT_ID))
assert.ok(talk.topic.analysis.templateIds.includes(SCALAR_ID))
assert.ok(talk.topic.analysis.templateIds.includes('iv.ownership.v1'))
assert.ok(talk.topic.analysis.templateIds.includes('custom.incident-themes'))
assert.ok(talk.topic.analysis.templateIds.includes('custom.severity-band'))
assert.ok(talk.topic.analysis.templateIds.includes('custom.evidence-gate'))
assert.ok(talk.topic.analysis.templateIds.includes('custom.reviewer-note'))

const cards = talk.topic.analysis.cards ?? []
const cardById = Object.fromEntries(cards.map((c) => [c.id, c]))
assert.equal(cardById[IMPACT_ID]?.title, IMPACT_TITLE, 'H3: Talk cards carry authored impact title')
assert.equal(cardById[IMPACT_ID]?.dimensions?.[0]?.optionNotes?.[1], IMPACT_NOTE)
assert.equal(cardById[IMPACT_ID]?.dimensions?.[0]?.evidenceModel, 'accumulative')
assert.equal(cardById[SCALAR_ID]?.criterion, SCALAR_CRITERION, 'H3: Talk cards carry scalar criterion')
assert.equal(
  cardById[IMPACT_ID]?.details,
  'Score named impact evidence on this discussion.',
  'H3: Talk cards carry authored details',
)
assert.equal(cardById[IMPACT_ID]?.subtitle, undefined, 'H3: subtitle chrome stops at the Creator')
assert.equal(cardById[SCALAR_ID]?.title, SCALAR_TITLE)
assert.ok(cardById['custom.incident-themes']?.taxonomy?.includes(THEME_CROSS))
assert.ok(cardById['custom.severity-band']?.enumValues?.includes(ENUM_CRITICAL))
assert.equal(cardById['custom.evidence-gate']?.title, GATE_TITLE)
assert.equal(cardById['custom.evidence-gate']?.outputKind, 'passFail')
assert.equal(cardById['custom.reviewer-note']?.outputKind, 'paragraph')
assert.equal(cardById['custom.oncall-ownership']?.title, ONCALL_TITLE)
assert.equal(
  cardById['iv.delivery.v1']?.dimensions?.find((d) => d.key === 'clarity')?.evidenceModel,
  'manner',
)
assert.equal(
  cardById['iv.ownership.v1']?.dimensions?.find((d) => d.key === 'blameShift')?.polarity,
  'negative',
)
assert.ok(
  !cards.some((c) => c.id === 'rollup.attempt.v1'),
  'H3: Talk cards are attached ids only',
)

const sched = scheduleTalkTemplates(talk.topic.analysis.templateIds, sample)
assert.equal(
  sched.dropped.filter((id) => id.startsWith('custom.')).length,
  0,
  `H3: custom.* must not drop: ${sched.dropped.join(',')}`,
)
assert.deepEqual(afterTurnTemplateIds(talk.topic.analysis.templateIds, sample), [
  'iv.delivery.v1',
])
assert.ok(sched.topicEnd.includes(IMPACT_ID))
assert.ok(sched.topicEnd.includes(SCALAR_ID))
assert.ok(sched.topicEnd.includes('custom.incident-themes'))
assert.ok(sched.topicEnd.includes('custom.severity-band'))
assert.ok(sched.topicEnd.includes('custom.evidence-gate'))
assert.ok(sched.topicEnd.includes('custom.reviewer-note'))
assert.ok(!sched.afterTurn.includes(IMPACT_ID), 'H3: leftover custom rubric is topic_end, not after_turn')

// --- H4 prompts ---
const afterPrompt = buildAfterTurnUserPrompt({
  talkContext: talk,
  messages: [],
  candidateMessageId: MSG_ID,
  templateIds: sched.afterTurn,
  hostRef: TOPIC_ID,
  order: 1,
})
assert.match(afterPrompt, /clarity/i)
assert.match(afterPrompt, /manner/)
const afterBlock = rubricCardBlock(sched.afterTurn, talk)
assert.match(afterBlock, /clarity/i)
// H4: authored `details` is marker framing (what this judges, what it does not) and
// must survive to the prompt. `subtitle` is scheduling chrome and must not.
assert.match(
  afterBlock,
  /Scores clarity, composure, and structure while the candidate talks/,
  'H4: after_turn prompt must carry the authored template details',
)
assert.doesNotMatch(afterBlock, /Runs on each answer/, 'H4: subtitle chrome is not marker context')
assert.doesNotMatch(afterBlock, new RegExp(IMPACT_TITLE))
assert.doesNotMatch(afterBlock, new RegExp(IMPACT_NOTE))
assert.doesNotMatch(afterBlock, new RegExp(SCALAR_CRITERION))
assert.doesNotMatch(afterBlock, new RegExp(GATE_TITLE))
assert.doesNotMatch(afterBlock, /Several named instances/)

const impactPrompt = buildTopicEndGradeUserPrompt({
  talkContext: talk,
  messages: [],
  templateId: IMPACT_ID,
  hostRef: TOPIC_ID,
})
assert.match(impactPrompt, new RegExp(IMPACT_TITLE))
assert.match(impactPrompt, new RegExp(IMPACT_AXIS))
assert.match(impactPrompt, /emerging/)
assert.match(impactPrompt, new RegExp(IMPACT_NOTE))
assert.match(impactPrompt, /accumulative/)
assert.match(
  impactPrompt,
  /Score named impact evidence on this discussion/,
  'H4: topic_end prompt must carry the authored template details',
)

const scalarPrompt = buildTopicEndGradeUserPrompt({
  talkContext: talk,
  messages: [],
  templateId: SCALAR_ID,
  hostRef: TOPIC_ID,
})
assert.match(scalarPrompt, new RegExp(SCALAR_TITLE))
assert.match(scalarPrompt, new RegExp(SCALAR_CRITERION), 'H4: topic_end prompt must carry scalar criterion')

const themePrompt = buildTopicEndGradeUserPrompt({
  talkContext: talk,
  messages: [],
  templateId: 'custom.incident-themes',
  hostRef: TOPIC_ID,
})
assert.match(themePrompt, /Incident story themes/)
assert.match(themePrompt, new RegExp(THEME_CROSS))

const enumPrompt = buildTopicEndGradeUserPrompt({
  talkContext: talk,
  messages: [],
  templateId: 'custom.severity-band',
  hostRef: TOPIC_ID,
})
assert.match(enumPrompt, /Incident severity band/)
assert.match(enumPrompt, new RegExp(ENUM_CRITICAL))

const gatePrompt = buildTopicEndGradeUserPrompt({
  talkContext: talk,
  messages: [],
  templateId: 'custom.evidence-gate',
  hostRef: TOPIC_ID,
})
assert.match(gatePrompt, new RegExp(GATE_TITLE))
assert.match(gatePrompt, /passFail/)

const notePrompt = buildTopicEndGradeUserPrompt({
  talkContext: talk,
  messages: [],
  templateId: 'custom.reviewer-note',
  hostRef: TOPIC_ID,
})
assert.match(notePrompt, /Reviewer narrative note/)
assert.match(notePrompt, /paragraph/)

assert.doesNotMatch(
  buildTopicEndRollupSystemPrompt('iv.delivery.v1'),
  /Every axis needs a depth block/,
  'H4 negative: leave-time rollup must not require depth',
)

assert.equal(
  resolveTemplateRole(IMPACT_ID, { outputKind: 'dimensions' }).decisionBucket,
  'interviewContent',
)
assert.equal(
  resolveTemplateRole('custom.incident-themes', { outputKind: 'taxonomy' }).role,
  'collect.taxonomy',
  'H4 negative: taxonomy must not enter Soft Decision',
)
assert.equal(
  resolveTemplateRole(SCALAR_ID, { outputKind: 'scalar' }).decisionBucket,
  'interviewContent',
  'H4: Talk scalar grades into discussion content, not essay',
)
assert.ok(
  isOrderedQualityEnum(['low', 'medium', 'high', 'critical']),
  'H4: staff severity ladder is an ordered quality enum',
)
assert.equal(
  resolveTemplateRole('custom.severity-band', {
    outputKind: 'enum',
    enumValues: ['low', 'medium', 'high', 'critical'],
  }).role,
  'grade.enum',
)

// --- H5 normalize + merge ---
clearInterviewResponse(BRIEF_ID)
let doc = emptyInterviewResponse(BRIEF_ID)
doc = {
  ...doc,
  completedPhaseIds: [PHASE_ID],
  messages: [
    {
      id: MSG_ID,
      phaseId: PHASE_ID,
      topicId: TOPIC_ID,
      role: 'candidate',
      text: 'I owned the pager rotation and moved MTTD from 40 minutes to 12.',
      at: new Date().toISOString(),
      probeId: 'pr.own1',
      kind: 'answer',
    },
  ],
}

const afterNorm = normalizeAfterTurnGrains({
  data: {
    grains: {
      'iv.delivery.v1': {
        templateId: 'iv.delivery.v1',
        status: 'filled',
        justification: 'Named the metric they moved.',
        dimensions: [
          {
            key: 'clarity',
            label: 'Clarity',
            score: 'strong',
            max: 1,
            depth: {
              rung: 'strong',
              exemplars: [{ kind: 'message', ref: MSG_ID, quote: 'moved MTTD from 40 minutes to 12' }],
              lapses: [],
            },
          },
        ],
        evidence: ['moved MTTD from 40 minutes to 12'],
        evidenceRefs: [{ kind: 'message', ref: MSG_ID, quote: 'moved MTTD from 40 minutes to 12' }],
        confidence: 'high',
      },
    },
  },
  templateIds: sched.afterTurn,
  hostRef: TOPIC_ID,
  order: 1,
  cards: talk.topic.analysis.cards,
})
assert.equal(afterNorm.grains['iv.delivery.v1'].status, 'filled')
assert.ok(afterNorm.grains['iv.delivery.v1'].dimensions?.[0]?.depth)

doc = mergeFilledAfterTurnGrains(
  doc,
  MSG_ID,
  afterNorm.grains,
  sched.afterTurn,
)
assert.equal(doc.analysis.turns[MSG_ID]['iv.delivery.v1'].status, 'filled')
assert.ok(doc.analysis.turns[MSG_ID]['iv.delivery.v1'].dimensions?.[0]?.depth)

const leftoverIds = topicEndTemplateIds(talk.topic.analysis.templateIds, sample)
const topicNorm = normalizeTopicEndByTemplate({
  data: {
    byTemplate: {
      [IMPACT_ID]: {
        templateId: IMPACT_ID,
        status: 'filled',
        justification: 'One named MTTD movement.',
        dimensions: [
          {
            key: 'impact',
            label: IMPACT_AXIS,
            score: 'emerging',
            max: 1,
            depth: {
              rung: 'emerging',
              instances: [
                {
                  ref: { kind: 'message', ref: MSG_ID, quote: 'moved MTTD from 40 minutes to 12' },
                  decisiveness: 'demonstrated',
                },
              ],
            },
          },
        ],
        evidence: ['moved MTTD from 40 minutes to 12'],
        evidenceRefs: [{ kind: 'message', ref: MSG_ID, quote: 'moved MTTD from 40 minutes to 12' }],
        confidence: 'med',
      },
      'custom.incident-themes': {
        templateId: 'custom.incident-themes',
        status: 'filled',
        result: { labels: ['ownership', THEME_CROSS, 'metrics'] },
        justification: 'Ownership plus cross-team coordination.',
        confidence: 'med',
      },
      'custom.severity-band': {
        templateId: 'custom.severity-band',
        status: 'filled',
        result: { value: ENUM_CRITICAL },
        justification: 'High-severity platform page.',
        confidence: 'med',
      },
      'custom.evidence-gate': {
        templateId: 'custom.evidence-gate',
        status: 'filled',
        result: { passed: true, reason: 'Named metric and personal ownership.' },
        justification: 'Enough evidence to continue.',
        confidence: 'high',
      },
      'custom.reviewer-note': {
        templateId: 'custom.reviewer-note',
        status: 'filled',
        result: { paragraph: NOTE_CANARY },
        justification: NOTE_CANARY,
        confidence: 'med',
      },
      [SCALAR_ID]: {
        templateId: SCALAR_ID,
        status: 'filled',
        result: { score: 3, max: 5 },
        justification: 'Three named incidents.',
        confidence: 'med',
      },
      'custom.oncall-ownership': {
        templateId: 'custom.oncall-ownership',
        status: 'filled',
        dimensions: [
          { key: 'composed', label: 'Stays composed', score: 'strong', max: 1 },
          { key: 'owns_outcome', label: 'Owns the outcome', score: 'mixed', max: 1 },
        ],
        justification: 'Owned the pager rotation.',
        confidence: 'med',
      },
      'iv.content.v1': {
        templateId: 'iv.content.v1',
        status: 'filled',
        dimensions: [{ key: 'relevance', label: 'Relevance', score: 'strong', max: 1 }],
        justification: 'On-topic incident story.',
        confidence: 'med',
      },
      'synth.topic.v1': {
        templateId: 'synth.topic.v1',
        status: 'filled',
        justification: 'Candidate owned a platform page and named a metric.',
        confidence: 'med',
      },
    },
  },
  templateIds: leftoverIds,
  hostRef: TOPIC_ID,
  cards: talk.topic.analysis.cards,
})
assert.equal(topicNorm.byTemplate[IMPACT_ID].status, 'filled')
assert.equal(topicNorm.byTemplate[IMPACT_ID].dimensions[0].score, 'emerging')
assert.ok(topicNorm.byTemplate[IMPACT_ID].dimensions[0].depth)

doc = mergeFilledTopicEnd(doc, TOPIC_ID, {
  synthesisText: 'Candidate owned a platform page and named a metric.',
  targets: {},
  byTemplate: topicNorm.byTemplate,
})
assert.equal(doc.analysis.topics[TOPIC_ID].byTemplate[IMPACT_ID].status, 'filled')
assert.equal(doc.analysis.topics[TOPIC_ID].byTemplate[SCALAR_ID].result.score, 3)
assert.equal(doc.analysis.topics[TOPIC_ID].byTemplate['custom.reviewer-note'].justification, NOTE_CANARY)
assert.ok(
  doc.analysis.topics[TOPIC_ID].byTemplate['custom.incident-themes'].result.labels.includes(THEME_CROSS),
)

// --- H6 score ---
const scored = scoreAttempt({ brief: sample, response: doc })
assert.equal(
  scored.artifacts.taxonomies[`${TOPIC_ID}:custom.incident-themes`]?.labels.includes(THEME_CROSS),
  true,
  'H6: discussion taxonomy must land in score artifacts',
)
assert.equal(
  scored.artifacts.enums[`${TOPIC_ID}:custom.severity-band`]?.value,
  ENUM_CRITICAL,
  'H6: discussion enum must land in score artifacts',
)
// Soft buckets are author-defined (`byWeight` is Record<string, …>), and this
// brief declares coding-work / write / conversation rather than the default
// interviewDelivery / interviewContent pair. Resolve the bucket off the brief so
// a renamed weight fails here by name instead of reading undefined and looking
// like a rubric that fed nothing.
const CONTENT_BUCKET = 'conversation'
assert.ok(
  Object.keys(sample.analysis?.rollup?.weights ?? {}).includes(CONTENT_BUCKET),
  `H6: fixture brief declares the ${CONTENT_BUCKET} soft weight`,
)
const contentBucket = scored.softGrade.byWeight[CONTENT_BUCKET]
assert.ok(contentBucket, `H6: scoring produced the ${CONTENT_BUCKET} soft bucket`)
const contentIds = (contentBucket.sources ?? []).map((s) => s.templateId)
assert.ok(contentIds.includes(IMPACT_ID), 'H6: authored emerging rubric feeds the content bucket')
assert.ok(contentIds.includes(SCALAR_ID), 'H6: Talk scalar feeds the content bucket')
assert.ok(contentIds.includes('custom.severity-band'), 'H6: ordered severity enum grades')
assert.ok(
  !contentIds.includes('custom.incident-themes'),
  'H6 negative: taxonomy must not enter Soft Decision',
)
assert.ok(
  !contentIds.includes('custom.reviewer-note'),
  'H6 negative: paragraph leftover must not enter Soft Decision',
)
assert.ok(contentBucket.unit > 0)
assert.ok(
  !(scored.softGrade.unmappedAxes ?? []).some((id) => String(id).includes('impact')),
  'H6: emerging must map, not flag as unmapped',
)

// --- H7 Results homes ---
const homes = buildPhaseResultHomes({
  brief: sample,
  phaseId: PHASE_ID,
  response: doc,
  artifacts: scored.artifacts,
})
assert.ok(
  homes.radars.some((r) => r.templateId === IMPACT_ID && r.label === IMPACT_TITLE),
  'H7: radar uses the authored impact title',
)
assert.ok(
  homes.radars.some((r) => r.templateId === IMPACT_ID && r.axes.some((a) => a.score === 'emerging')),
)
assert.ok(
  homes.radars.some((r) => r.templateId === 'custom.oncall-ownership' && r.label === ONCALL_TITLE),
)
assert.ok(
  homes.taxonomies.some((t) => t.labels.includes(THEME_CROSS)),
  'H7: taxonomy chips',
)
assert.ok(
  homes.enums.some((e) => e.value === ENUM_CRITICAL && e.enumValues.includes(ENUM_CRITICAL)),
  'H7: enum ladder',
)
const scalarHome = homes.scalars.find((s) => s.id.endsWith(SCALAR_ID))
assert.ok(scalarHome, 'H7: scalar readout')
assert.equal(scalarHome.score, 3)
assert.equal(scalarHome.criterion, SCALAR_CRITERION, 'H7: scalar home carries authored criterion')
assert.equal(scalarHome.label, SCALAR_TITLE)
assert.ok(
  homes.passFails.some((g) => g.label === GATE_TITLE && g.passed === true),
  'H7: pass/fail badge',
)

{
  const src = readFileSync(
    join(root, '../../components/InterviewFlowTemplatesSection.tsx'),
    'utf8',
  )
  assert.match(src, /meta\.criterion/, 'H1 source: Creator scalar field is wired')
}

clearInterviewResponse(BRIEF_ID)
console.log('analysisPipeline.connectivity.mjs: ok')
