/**
 * Results homes projectors — catalog radars, leftover vs glance, mix why, paste account.
 * Run: npx tsx front_end/src/lib/interviewRunApi/resultHomes.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { catalogTemplate } from '../interviewBrief/analysisTemplateCatalog.ts'
import { OUTPUT_KIND_LABELS } from '../interviewBrief/analysisTemplateShape.ts'
import {
  AXIS_NOTE_NOT_RECORDED,
  AXIS_NOTE_FAILED,
  RESULT_OUTPUT_KIND_HOMES,
  attachedTemplateIdsForStep,
  applyPasteBurstsToIncidents,
  buildCatalogRadars,
  buildPhaseResultHomes,
  grainForPhaseTemplate,
  leftoverSectionProse,
  mixWhyFromSoftGrade,
  mixWhyForPhase,
  blendSectionLeftover,
  includedScoreDonutBuckets,
  contributingScoreDonutBuckets,
  sessionMixAccount,
  sessionMixTags,
  sectionCollapsedSummary,
  axisDisplayReading,
  axisDisplayWhy,
  axisDisplayShown,
  stageMixForPhase,
  pasteBurstAccount,
  radarFromAttachedTemplate,
} from './resultHomes.ts'
import { resolveDocAssessment } from '../interviewBrief/writingDocCompose.ts'

const STRUCTURE_NOTE_CANARY = 'STRUCTURE_NOTE_CANARY'
const LEFTOVER_SYNTH_CANARY = 'LEFTOVER_SYNTH_CANARY'
const GLANCE_INTRO_CANARY = 'GLANCE_INTRO_CANARY'
const MIX_CONTENT_CANARY = 'MIX_CONTENT_CANARY'
const TESTS_WHY_CANARY = 'Cleared the full suite (4/4).'
const PASTE_AFTER_EDIT_CANARY = 'then edited'

const codingBrief = {
  schemaVersion: 1,
  kind: 'interview_brief',
  definition: {},
  topicLibrary: [{ id: 'topic.a', label: 'Opening', probes: [], analysis: { attachPack: 'pack.talk' } }],
  phases: [
    { id: 'ph.talk', kind: 'discussion', topicId: 'topic.a', title: 'Opening' },
    { id: 'ph.code', kind: 'tool', toolRef: 'tool.code', title: 'Two-sum' },
  ],
  tools: {
    'tool.code': {
      type: 'coding',
      title: 'Two-sum',
      analysis: {
        templateIds: [
          'mark.code.tests.v1',
          'mark.code.method.v1',
          'mark.code.structure.v1',
          'mark.code.approach.v1',
          'mark.code.authorship.v1',
          'synth.tool.v1',
        ],
      },
    },
  },
  analysis: {},
}

const structureCatalog = catalogTemplate('mark.code.structure.v1')
assert.ok(structureCatalog?.dimensions?.length >= 3, 'structure catalog axes')

const response = {
  messages: [{ id: 'm1', phaseId: 'ph.code', role: 'candidate', kind: 'answer', text: 'x', at: '', topicId: null, probeId: null }],
  analysis: {
    turns: {},
    tools: {
      'tool.code': {
        'mark.code.method.v1': {
          templateId: 'mark.code.method.v1',
          hostRef: 'tool.code',
          grain: 'after_tool',
          order: 1,
          status: 'filled',
          result: {},
          justification: '',
          dimensions: [
            { key: 'approach', label: 'Approach', score: 'strong', notes: 'Clear plan.' },
            { key: 'clarity', label: 'Clarity', score: 'mixed', notes: 'Names drifted.' },
            { key: 'complexity', label: 'Complexity', score: 'mixed', notes: 'O(n) enough.' },
          ],
        },
        'mark.code.approach.v1': {
          templateId: 'mark.code.approach.v1',
          hostRef: 'tool.code',
          grain: 'after_tool',
          order: 2,
          status: 'filled',
          result: {},
          justification: '',
          dimensions: [
            { key: 'exploration', label: 'Exploration', score: 'mixed', notes: 'Tried one path.' },
            { key: 'iteration', label: 'Iteration', score: 'weak', notes: 'Did not revise.' },
            { key: 'debugging', label: 'Debugging', score: 'mixed', notes: 'One log.' },
            { key: 'planfulness', label: 'Planfulness', score: 'mixed', notes: 'Jumped in.' },
          ],
        },
        'mark.code.authorship.v1': {
          templateId: 'mark.code.authorship.v1',
          hostRef: 'tool.code',
          grain: 'after_tool',
          order: 3,
          status: 'filled',
          result: {},
          justification: '',
          dimensions: [
            { key: 'human_agency', label: 'Human agency', score: 'mixed', notes: 'Typed after a paste.' },
          ],
        },
        'mark.code.structure.v1': {
          templateId: 'mark.code.structure.v1',
          hostRef: 'tool.code',
          grain: 'after_tool',
          order: 4,
          status: 'filled',
          result: {},
          justification: '',
          dimensions: [
            { key: 'organization', label: 'Organization', score: 'mixed', notes: STRUCTURE_NOTE_CANARY },
            { key: 'naming', label: 'Naming', score: 'weak', notes: 'tmp everywhere.' },
            { key: 'modularity', label: 'Modularity', score: 'mixed', notes: 'One file.' },
          ],
        },
      },
    },
    topics: {},
    rollup: null,
    partial: null,
  },
}

const ids = attachedTemplateIdsForStep(codingBrief, 'ph.code')
assert.ok(ids.includes('mark.code.structure.v1'), 'structure attached')
assert.ok(!ids.includes('iv.star.v1'), 'STAR not attached on coding')

const radars = buildCatalogRadars({ brief: codingBrief, phaseId: 'ph.code', response })
const labels = radars.map((r) => r.templateId)
assert.ok(labels.includes('mark.code.structure.v1'), 'structure radar present')
assert.ok(labels.includes('mark.code.approach.v1'), 'approach radar present')
assert.ok(labels.includes('mark.code.authorship.v1'), 'authorship table present')
assert.ok(!labels.includes('iv.star.v1'), 'negative: no STAR radar on coding-without-STAR')
assert.ok(!labels.includes('synth.tool.v1'), 'paragraph synth is leftover, not a radar')
assert.ok(!radars.some((r) => r.id.includes('coding-mix') || r.label === 'Coding' && r.axes.some((a) => a.key === 'suite')))

const structure = radars.find((r) => r.templateId === 'mark.code.structure.v1')
assert.ok(structure)
for (const dim of structureCatalog.dimensions) {
  assert.ok(
    structure.axes.some((a) => a.key === dim.key && a.label === dim.label),
    `structure axis ${dim.key}`,
  )
}
assert.ok(structure.axes.some((a) => a.notes === STRUCTURE_NOTE_CANARY))
assert.ok(structure.axes.length >= 3)

{
  const assistBrief = {
    ...codingBrief,
    tools: {
      'tool.code': {
        ...codingBrief.tools['tool.code'],
        assist: { chat: true },
      },
    },
  }
  const skippedLeave = {
    ...response,
    messages: [
      {
        id: 'm-assist',
        phaseId: 'ph.code',
        role: 'candidate',
        kind: 'answer',
        text: 'rename the helper',
        at: '',
        topicId: null,
        probeId: null,
      },
    ],
    analysis: {
      ...response.analysis,
      tools: {
        'tool.code': {
          ...response.analysis.tools['tool.code'],
          'mark.assist.use.v1': {
            templateId: 'mark.assist.use.v1',
            hostRef: 'tool.code',
            grain: 'after_tool',
            order: 22,
            status: 'skipped',
            result: null,
            justification: 'No assist messages on this stage.',
          },
        },
      },
      turns: {
        'm-assist': {
          'mark.assist.use.v1': {
            templateId: 'mark.assist.use.v1',
            hostRef: 'tool.code',
            grain: 'after_turn',
            order: 1,
            status: 'filled',
            justification: 'Pointed ask.',
            dimensions: [
              { key: 'asked_well', label: 'Asked well', score: 'strong', notes: 'Named the helper.' },
              { key: 'over_reliance', label: 'Over-reliance', score: 'mixed' },
              { key: 'applied_judgment', label: 'Applied judgment', score: 'strong' },
              { key: 'integrity', label: 'Integrity', score: 'strong' },
            ],
          },
        },
      },
    },
  }
  const assistRadars = buildCatalogRadars({
    brief: assistBrief,
    phaseId: 'ph.code',
    response: skippedLeave,
  })
  const assist = assistRadars.find((r) => r.templateId === 'mark.assist.use.v1')
  assert.ok(assist, 'assist radar is attached when peel chat is on')
  assert.equal(
    assist.axes.find((a) => a.key === 'asked_well')?.notes,
    'Named the helper.',
    'a skipped leave leftover must not hide the filled peel-turn axes',
  )
  assert.ok((assist.axes.find((a) => a.key === 'asked_well')?.unit ?? 0) > 0)
}

{
  const leftoverOnPhaseId = grainForPhaseTemplate(
    {
      messages: [],
      analysis: {
        turns: {},
        tools: {},
        topics: {
          'ph.talk': {
            status: 'filled',
            synthesisText: '',
            targets: {},
            byTemplate: {
              'iv.content.v1': {
                templateId: 'iv.content.v1',
                hostRef: 'topic.a',
                grain: 'topic_end',
                order: 1,
                status: 'filled',
                justification: 'They named the outage.',
                dimensions: [
                  { key: 'relevance', label: 'Relevance', score: 'strong', notes: 'Stayed on the incident.' },
                  { key: 'depth', label: 'Depth', score: 'mixed' },
                  { key: 'specificity', label: 'Specificity', score: 'mixed' },
                ],
              },
            },
          },
        },
        rollup: null,
        partial: null,
      },
    },
    { toolRef: null, topicId: 'topic.a', phaseId: 'ph.talk' },
    'iv.content.v1',
  )
  assert.equal(
    leftoverOnPhaseId?.dimensions?.find((d) => d.key === 'relevance')?.notes,
    'Stayed on the incident.',
    'Talk leftover keyed by phase id still reaches Results',
  )
}

const authorship = radars.find((r) => r.templateId === 'mark.code.authorship.v1')
assert.ok(authorship)
assert.equal(authorship.axes.length, 1, 'authorship: no fake third spoke')

{
  /* Omit structure grain → still listed, unit 0, absent note, not cloned from method. */
  const dropped = {
    ...response,
    analysis: {
      ...response.analysis,
      tools: {
        'tool.code': {
          ...response.analysis.tools['tool.code'],
        },
      },
    },
  }
  delete dropped.analysis.tools['tool.code']['mark.code.structure.v1']
  const methodRadar = radarFromAttachedTemplate({
    id: 'm',
    templateId: 'mark.code.method.v1',
    grain: response.analysis.tools['tool.code']['mark.code.method.v1'],
  })
  assert.ok(methodRadar)
  const methodUnit = methodRadar.axes.find((a) => a.key === 'approach')?.unit
  assert.ok(methodUnit > 0)
  const missing = buildCatalogRadars({ brief: codingBrief, phaseId: 'ph.code', response: dropped })
  const struct = missing.find((r) => r.templateId === 'mark.code.structure.v1')
  assert.ok(struct, 'attached structure still listed when grain omitted')
  assert.ok(struct.axes.every((a) => a.unit === 0), 'not cloned method unit')
  assert.ok(struct.axes.every((a) => a.notes === AXIS_NOTE_NOT_RECORDED))
}

{
  const leftover = leftoverSectionProse({
    body: `### Structure\n\n${LEFTOVER_SYNTH_CANARY}`,
    detail: '',
    brief: { intro: GLANCE_INTRO_CANARY },
  })
  assert.match(leftover, new RegExp(LEFTOVER_SYNTH_CANARY))
  assert.ok(!leftover.includes(GLANCE_INTRO_CANARY), 'glance intro is not leftover')
}

{
  const introOnly = leftoverSectionProse({
    body: GLANCE_INTRO_CANARY,
    brief: { intro: GLANCE_INTRO_CANARY },
  })
  assert.equal(introOnly, '', 'negative: intro-only does not count as leftover')
}

{
  const mix = mixWhyFromSoftGrade({
    byWeight: {
      interviewContent: {
        included: true,
        label: 'Content',
        summary: MIX_CONTENT_CANARY,
        summaryDetail: LEFTOVER_SYNTH_CANARY,
      },
      formMark: { included: true, label: 'Form', summary: 'Gate only.' },
      codingTests: { included: false, label: 'Tests', summary: 'Should drop.' },
    },
  })
  assert.equal(mix.length, 1)
  assert.equal(mix[0].summary, MIX_CONTENT_CANARY)
  assert.ok(!mix.some((row) => row.bucket === 'formMark'))
  assert.notEqual(mix[0].summary, LEFTOVER_SYNTH_CANARY, 'negative: mix-why is not leftover detail')
  const slices = includedScoreDonutBuckets({
    interviewContent: { included: true, weight: 0.3, label: 'Content', summary: MIX_CONTENT_CANARY },
    formMark: { included: true, weight: 0.05, label: 'Form' },
    codingTests: { included: false, weight: 0.2, label: 'Tests' },
  })
  assert.equal(slices.length, 1)
  assert.equal(slices[0][0], 'interviewContent')
  assert.ok(!slices.some(([key]) => key === 'formMark'))
  assert.ok(!slices.some(([, row]) => String(row.label ?? '') === MIX_CONTENT_CANARY))
}

{
  const soft = {
    byWeight: {
      codingTests: {
        included: true,
        label: 'Tests',
        summary: TESTS_WHY_CANARY,
      },
      codingMethod: {
        included: true,
        label: 'Method',
        summary: MIX_CONTENT_CANARY,
      },
      interviewContent: {
        included: true,
        label: 'Content',
        summary: 'Talk only.',
      },
      formMark: { included: true, label: 'Form', summary: 'Gate only.' },
    },
  }
  const codeWhy = mixWhyForPhase(soft, codingBrief, 'ph.code')
  assert.ok(codeWhy.some((row) => row.summary === TESTS_WHY_CANARY))
  assert.ok(codeWhy.some((row) => row.summary === MIX_CONTENT_CANARY))
  assert.ok(
    !codeWhy.some((row) => row.summary === 'Talk only.'),
    'negative: talk mix-why stays off coding leftover',
  )
  const talkWhy = mixWhyForPhase(soft, codingBrief, 'ph.talk')
  assert.ok(talkWhy.some((row) => row.summary === 'Talk only.'))
  assert.ok(!talkWhy.some((row) => row.summary === TESTS_WHY_CANARY))
  const stageMix = {
    phaseId: 'ph.code',
    toolRef: 'tool.code',
    bucket: 'codingMethod',
    copilotApply: 1,
    humanTicks: 10,
    pasteEvents: 7,
    copilotApplyShare: 0.15,
    humanTickShare: 0.5,
    pasteShare: 0.35,
  }
  const blended = blendSectionLeftover({
    leftover: `### Structure\n\n${LEFTOVER_SYNTH_CANARY}`,
    mixWhy: codeWhy,
    mix: stageMix,
  })
  assert.match(blended, new RegExp(LEFTOVER_SYNTH_CANARY))
  assert.match(blended, /Cleared the full suite \(4\/4\)/)
  assert.match(blended, /Editor changes: 50% typed, 15% bot edits, 35% paste/)
  const sittingWide = {
    copilotApplyShare: 0.99,
    humanTickShare: 0.01,
    pasteShare: 0,
    stages: [stageMix],
  }
  assert.equal(stageMixForPhase(sittingWide, 'ph.code')?.phaseId, 'ph.code')
  assert.equal(stageMixForPhase(sittingWide, 'ph.talk'), null)
  const already = blendSectionLeftover({
    leftover: TESTS_WHY_CANARY,
    mixWhy: [{ bucket: 'codingTests', label: 'Tests', summary: TESTS_WHY_CANARY }],
  })
  assert.equal(already, TESTS_WHY_CANARY, 'negative: mix-why already in leftover is not duplicated')
}

{
  const zeroedCoding = contributingScoreDonutBuckets({
    codingTests: { included: true, weight: 0.25, unit: 0, label: 'Tests' },
    codingMethod: { included: true, weight: 0.1, unit: 0, label: 'Method' },
    interviewDelivery: { included: true, weight: 0.2, unit: 0.5, label: 'Delivery' },
    formMark: { included: true, weight: 0.05, unit: 1, label: 'Form' },
  })
  assert.equal(zeroedCoding.length, 1)
  assert.equal(zeroedCoding[0][0], 'interviewDelivery')
  assert.ok(!zeroedCoding.some(([key]) => key.startsWith('coding')), 'negative: zeroed coding buckets must not occupy the pie')
  const emptySitting = contributingScoreDonutBuckets({
    codingTests: { included: true, weight: 0.25, unit: 0 },
    codingMethod: { included: true, weight: 0.1, unit: 0 },
  })
  assert.equal(emptySitting.length, 0)
  const includedZeros = includedScoreDonutBuckets({
    codingTests: { included: true, weight: 0.25, unit: 0 },
    codingMethod: { included: true, weight: 0.1, unit: 0 },
  })
  assert.equal(includedZeros.length, 2)
}

{
  const sentence = sessionMixAccount({
    copilotApplyShare: 0.15,
    humanTickShare: 0.8,
    pasteShare: 0.05,
    stages: [],
  })
  assert.equal(sentence, 'Editor changes: 80% typed, 15% bot edits, 5% paste.')
  assert.equal(sessionMixAccount(null), null)
}

{
  const burst = {
    t: 12_000,
    clock: '0:12',
    file: 'src/solve.ts',
    route: 'unknown',
    before: { bucketId: 'b1', lastActions: ['run'] },
    after: { nextActions: ['open_file'], ranTests: false, edited: true, idleMs: 0 },
    summary: 'Pasted ~80 chars into src/solve.ts at 0:12, then edited.',
  }
  const sentence = pasteBurstAccount(burst)
  assert.match(sentence, /ran tests/i)
  assert.match(sentence, /paste/i)
  assert.match(sentence, /edited/i)
  assert.ok(sentence.includes(PASTE_AFTER_EDIT_CANARY) || /then edited/.test(sentence))
  assert.match(sentence, /src\/solve\.ts/)
  assert.ok(!/run\s*[×x]\s*\d/.test(sentence), 'negative: caption is a sentence, not a telegram')
  assert.ok(!/[—–]/.test(sentence))
  assert.ok(!/[—–]/.test(AXIS_NOTE_FAILED))
  const withExcerpt = pasteBurstAccount({
    ...burst,
    route: 'external',
    wholeFile: true,
    excerpt: 'export function parseAndSum(lines) {',
    lineCount: 40,
    chars: 900,
  })
  assert.match(withExcerpt, /whole file/)
  assert.match(withExcerpt, /parseAndSum/)
  assert.ok(!/clipboard/i.test(withExcerpt), 'negative: paste account must not mention clipboard text')
}

{
  const runTick = { t: 400, action: 'run' }
  const sentence = pasteBurstAccount({
    t: 12_000,
    clock: '0:12',
    route: 'unknown',
    before: { bucketId: 'b1', lastActions: ['run'] },
    after: { nextActions: [], ranTests: false, edited: true, idleMs: 0 },
    summary: 'Pasted.',
  })
  assert.ok(!new RegExp(`^${runTick.action}$`).test(sentence), 'negative: a run tick is not the paste sentence')
}

{
  const incidents = [
    { id: 'i1', kind: 'paste', t: 12_050, sectionId: 'ph.code', pre: { body: 'In the two minutes leading up to this.' } },
    { id: 'i2', kind: 'leave', t: 5_000, sectionId: 'ph.code', pre: { body: 'Left the tab.' } },
  ]
  const overlay = applyPasteBurstsToIncidents(incidents, [
    {
      t: 12_000,
      clock: '0:12',
      route: 'unknown',
      before: { bucketId: 'b1', lastActions: ['run'] },
      after: { nextActions: [], ranTests: false, edited: true, idleMs: 0 },
      summary: 'Pasted, then edited.',
    },
  ])
  assert.match(overlay[0].pre.body, /paste/i)
  assert.match(overlay[0].pre.body, /edited/i)
  assert.equal(overlay[1].pre.body, 'Left the tab.')
}

{
  const bot = pasteBurstAccount({
    t: 12_000,
    clock: '0:12',
    file: 'src/solve.ts',
    route: 'bot',
    before: { bucketId: 'b1', lastActions: ['run'] },
    after: { nextActions: ['run'], ranTests: true, edited: false, idleMs: 0 },
    summary: '',
  })
  assert.match(bot, /Bot edit/)
  assert.ok(!/Outside paste/.test(bot), 'negative: a bot edit account is not an outside paste')
}

{
  const incidents = [
    { id: 'i1', kind: 'apply', t: 12_050, sectionId: 'ph.code', pre: { body: 'In the two minutes leading up to this.' } },
    { id: 'i2', kind: 'leave', t: 5_000, sectionId: 'ph.code', pre: { body: 'Left the tab.' } },
  ]
  const overlay = applyPasteBurstsToIncidents(incidents, [
    {
      t: 12_000,
      clock: '0:12',
      file: 'src/solve.ts',
      route: 'bot',
      before: { bucketId: 'b1', lastActions: ['run'] },
      after: { nextActions: ['run'], ranTests: true, edited: false, idleMs: 0 },
      summary: 'Bot edit. They applied a bot edit into src/solve.ts at 0:12, then ran tests.',
    },
  ])
  assert.match(overlay[0].pre.body, /Bot edit/)
  assert.ok(!/Outside paste/.test(overlay[0].pre.body), 'negative: an apply overlay is not an outside paste')
  assert.equal(overlay[1].pre.body, 'Left the tab.')
}

{
  for (const kind of Object.keys(OUTPUT_KIND_LABELS)) {
    assert.ok(
      RESULT_OUTPUT_KIND_HOMES[kind],
      `outputKind ${kind} has a display home`,
    )
  }
}

{
  const customBrief = {
    schemaVersion: 1,
    kind: 'interview_brief',
    definition: {},
    topicLibrary: [
      {
        id: 'topic.a',
        label: 'Opening',
        probes: [],
        analysis: { templateIds: ['custom.impact'] },
      },
    ],
    phases: [{ id: 'ph.talk', kind: 'discussion', topicId: 'topic.a', title: 'Opening' }],
    tools: {},
    analysis: {
      overrides: {
        templateCards: {
          'custom.impact': {
            outputKind: 'dimensions',
            dimensions: [
              { key: 'impact', label: 'Impact', options: ['absent', 'emerging', 'consistent'] },
            ],
          },
        },
      },
    },
  }
  const grain = {
    templateId: 'custom.impact',
    hostRef: 'topic.a',
    grain: 'topic_end',
    order: 1,
    status: 'filled',
    result: {},
    justification: '',
    dimensions: [
      {
        key: 'impact',
        label: 'Impact',
        score: 'emerging',
        notes: 'Named one outcome.',
        depth: { position: 2, rungIndex: 1, instanceCount: 1, decisiveCount: 0 },
      },
    ],
  }
  const radar = radarFromAttachedTemplate({
    id: 'ph.talk:custom.impact',
    templateId: 'custom.impact',
    grain,
    brief: customBrief,
  })
  assert.ok(radar, 'custom dimensions template produces a radar')
  assert.ok(radar.axes.some((a) => a.label === 'Impact'))
  assert.equal(radar.axes[0].score, 'emerging')
  assert.ok(!/Strong|Solid|Mixed|Thin|Weak/.test(radar.axes[0].score ?? ''))
}

{
  const taxBrief = {
    schemaVersion: 1,
    kind: 'interview_brief',
    definition: {},
    topicLibrary: [
      {
        id: 'topic.a',
        label: 'Opening',
        probes: [],
        analysis: { templateIds: ['custom.tax'] },
      },
    ],
    phases: [{ id: 'ph.talk', kind: 'discussion', topicId: 'topic.a', title: 'Opening' }],
    tools: {},
    analysis: {
      overrides: {
        templateCards: { 'custom.tax': { outputKind: 'taxonomy', taxonomy: ['curious', 'confident'] } },
      },
    },
  }
  const homes = buildPhaseResultHomes({
    brief: taxBrief,
    phaseId: 'ph.talk',
    response: {
      messages: [],
      analysis: {
        turns: {},
        tools: {},
        topics: {
          'topic.a': {
            status: 'filled',
            synthesisText: '',
            targets: {},
            byTemplate: {
              'custom.tax': {
                templateId: 'custom.tax',
                hostRef: 'topic.a',
                grain: 'topic_end',
                order: 1,
                status: 'filled',
                result: { labels: ['curious', 'confident'] },
                justification: '',
              },
            },
          },
        },
      },
    },
  })
  assert.ok(homes.taxonomies[0]?.labels.includes('curious'), 'taxonomy grain produces chips')
}

{
  const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../../components/InterviewFlowResultSection.tsx'),
    'utf8',
  )
  // Per-answer homes live here; the radar/axis beats moved to
  // InterviewFlowReportBeats.tsx, asserted below. Keeping the two apart pins
  // where each half lives, so a future move fails loudly instead of silently.
  assert.match(src, /function ResultTaxonomyChips/)
  assert.match(src, /function ResultEnumChoice/)
  assert.match(src, /function ResultScalarReadout/)
  assert.match(src, /function ResultPassFailBadge/)
  assert.match(src, /data-home="glance"/)
  assert.doesNotMatch(src, /data-home="leftover"/)
  assert.doesNotMatch(src, /axis\.score\?\.trim\(\) \|\| unitBand/)
  assert.doesNotMatch(src, /axis\.criterion\?\.trim\(\) \?/)
  assert.doesNotMatch(
    src,
    /axisDisplayReading/,
    'axis readings belong to the report beats — a copy back here means two homes for one reading',
  )

  const beats = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../../components/InterviewFlowReportBeats.tsx'),
    'utf8',
  )
  assert.match(beats, /axisDisplayReading/)
  assert.match(beats, /axisDisplayWhy/)
  assert.match(beats, /data-home="radar-why"/)
  assert.match(beats, /Tooltip content=\{axis\.criterion\?\.trim\(\) \|\| axis\.label\}/)
  assert.match(beats, /center: \['50%', '62%'\]/)
  assert.match(beats, /radius: '48%'/)
  const css = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../../css/effects/interview-result-card.css'),
    'utf8',
  )
  assert.match(
    css,
    /theme-interview-result-review__radar-beat \{[\s\S]*?padding-block: 0\.75rem/,
    'radar beat pads off the hairline so the first tags and title are not flush with the divider',
  )
  assert.match(
    css,
    /theme-interview-result-review__axis-row:first-child \{\s*padding-block-start: 0;/,
    'first axis row still aligns with the beat title; the beat padding, not the row, clears the divider',
  )
}

// ── Essay radar reads the AUTHORED criterion table, not the catalog ─────────────
// The essay rubric is authored on the doc tool (`tools[ref].assessment`), which is not
// where `briefCard` looks. The writing assessor scores those authored rows, so the
// catalog's relevance/structure/depth keys never matched a grain row and every essay
// painted three zeroed "not scored" axes over a real per-criterion mark.
{
  const essayBrief = {
    schemaVersion: 1,
    kind: 'interview_brief',
    definition: {},
    topicLibrary: [],
    phases: [{ id: 'ph.write', kind: 'tool', toolRef: 'tool.essay', title: 'Essay' }],
    tools: {
      'tool.essay': {
        type: 'doc',
        assessment: {
          kind: 'rubric',
          dimensions: [
            {
              key: 'argument',
              label: 'Argument quality',
              criterion: 'Is the central claim defended with evidence?',
              weight: 0.5,
              bands: [
                { id: 'b1', label: '1 - Thin', descriptor: 'Assertion only.' },
                { id: 'b2', label: '2 - Mixed', descriptor: 'Some support.' },
                { id: 'b3', label: '3 - Strong', descriptor: 'Defended throughout.' },
              ],
            },
            {
              key: 'evidence',
              label: 'Use of evidence',
              criterion: 'Named, checkable facts.',
              weight: 0.5,
              bands: [
                { id: 'b1', label: '1 - Thin', descriptor: 'None.' },
                { id: 'b2', label: '2 - Mixed', descriptor: 'Some.' },
                { id: 'b3', label: '3 - Strong', descriptor: 'Concrete.' },
              ],
            },
          ],
        },
      },
    },
  }
  const essayGrain = {
    templateId: 'mark.doc.essay.v1',
    hostRef: 'tool.essay',
    grain: 'after_tool',
    status: 'filled',
    result: { composite: 0.75 },
    dimensions: [
      { key: 'argument', label: 'Argument quality', score: '3 - Strong', max: 3, notes: 'Claim held up.' },
      { key: 'evidence', label: 'Use of evidence', score: '2 - Mixed', max: 3, notes: 'Two named figures.' },
    ],
  }
  const radar = radarFromAttachedTemplate({
    id: 'ph.write:mark.doc.essay.v1',
    templateId: 'mark.doc.essay.v1',
    grain: essayGrain,
    brief: essayBrief,
    toolRef: 'tool.essay',
  })
  assert.ok(radar, 'essay rubric produces a radar')
  assert.deepEqual(
    radar.axes.map((a) => a.key),
    ['argument', 'evidence'],
    'axes are the authored criteria',
  )
  assert.deepEqual(
    radar.axes.map((a) => a.label),
    ['Argument quality', 'Use of evidence'],
  )
  // The mark actually lands instead of reading zero.
  assert.equal(radar.axes[0].unit, 1, 'top band of three maps to a full unit')
  assert.equal(radar.axes[1].unit, 0.5, 'middle band of three maps to half')
  assert.equal(radar.axes[0].score, '3 - Strong')
  assert.equal(radar.axes[1].notes, 'Two named figures.')
  // The authored gloss reaches the reviewer, so "what was this row for" is answerable.
  assert.equal(radar.axes[0].criterion, 'Is the central claim defended with evidence?')
  assert.equal(axisDisplayWhy(radar.axes[0]), 'Claim held up.')
  assert.notEqual(axisDisplayWhy(radar.axes[0]), radar.axes[0].criterion)
  // Negative: the catalog axes must not come back, and nothing may read "not scored".
  for (const stale of ['relevance', 'structure', 'depth']) {
    assert.ok(!radar.axes.some((a) => a.key === stale), `catalog axis ${stale} is gone`)
  }
  assert.ok(
    !radar.axes.some((a) => /not scored/i.test(a.notes ?? '')),
    'a scored essay shows no not-scored axis',
  )

  // A doc tool with nothing authored resolves to the same default row the assessor is
  // given, not to the catalog axes — that is the whole point of the shared resolver.
  const bare = radarFromAttachedTemplate({
    id: 'ph.write:mark.doc.essay.v1',
    templateId: 'mark.doc.essay.v1',
    grain: null,
    brief: { ...essayBrief, tools: { 'tool.essay': { type: 'doc' } } },
    toolRef: 'tool.essay',
  })
  assert.deepEqual(
    bare.axes.map((a) => a.key),
    resolveDocAssessment({ type: 'doc' }).dimensions.map((d) => d.key),
    'an un-authored doc tool shows the axis it will actually be graded on',
  )
  assert.ok(
    !bare.axes.some((a) => ['relevance', 'structure', 'depth'].includes(a.key)),
    'catalog axes are not what a doc section reports',
  )
  // Negative: the authored table belongs to the essay rubric only — a sibling doc
  // template must not borrow another mark's axes.
  const approach = radarFromAttachedTemplate({
    id: 'ph.write:mark.doc.approach.v1',
    templateId: 'mark.doc.approach.v1',
    grain: null,
    brief: essayBrief,
    toolRef: 'tool.essay',
  })
  assert.ok(
    !approach.axes.some((a) => a.key === 'argument'),
    'authored essay rows do not leak into other doc templates',
  )
}

// ── A FORMAT essay shows the compliance axis it was graded on ───────────────────
// The format editor has no criterion list, so the raw brief has no dimensions. Reading
// the raw brief left this section on catalog axes while the grain held a real mark.
{
  const fmtBrief = {
    schemaVersion: 1,
    kind: 'interview_brief',
    definition: {},
    topicLibrary: [],
    phases: [{ id: 'ph.write', kind: 'tool', toolRef: 'tool.essay', title: 'Memo' }],
    tools: {
      'tool.essay': {
        type: 'doc',
        assessment: { kind: 'format', formatNotes: 'Decision heading, under one page.' },
      },
    },
  }
  const radar = radarFromAttachedTemplate({
    id: 'ph.write:mark.doc.essay.v1',
    templateId: 'mark.doc.essay.v1',
    grain: {
      templateId: 'mark.doc.essay.v1',
      status: 'filled',
      result: { composite: 0.66 },
      dimensions: [
        {
          key: 'format_compliance',
          label: 'Format compliance',
          score: '3 — Mostly to format',
          max: 4,
          notes: 'Decision heading present, ran slightly long.',
        },
      ],
    },
    brief: fmtBrief,
    toolRef: 'tool.essay',
  })
  assert.deepEqual(radar.axes.map((a) => a.key), ['format_compliance'])
  assert.ok(radar.axes[0].unit > 0, 'the format mark lands instead of reading zero')
  assert.equal(radar.axes[0].criterion, 'Decision heading, under one page.')
  assert.equal(radar.axes[0].notes, 'Decision heading present, ran slightly long.')
  assert.equal(axisDisplayWhy(radar.axes[0]), 'Decision heading present, ran slightly long.')
  assert.notEqual(axisDisplayWhy(radar.axes[0]), radar.axes[0].criterion)
  // Negative: the catalog axes must not be what a format section reports.
  for (const stale of ['relevance', 'structure', 'depth']) {
    assert.ok(!radar.axes.some((a) => a.key === stale), `catalog axis ${stale} is gone`)
  }
}

// ── A matrix edited after marking still shows what was marked ───────────────────
// Renaming a criterion, or re-typing a section between Rubric and Format, leaves stored
// grains keyed to the old rows. Printing zeroed axes over real marks reads as a fail.
{
  const renamedBrief = {
    schemaVersion: 1,
    kind: 'interview_brief',
    definition: {},
    topicLibrary: [],
    phases: [{ id: 'ph.write', kind: 'tool', toolRef: 'tool.essay', title: 'Memo' }],
    tools: {
      'tool.essay': {
        type: 'doc',
        assessment: {
          kind: 'rubric',
          dimensions: [
            {
              key: 'renamed_since',
              label: 'Renamed since marking',
              bands: [
                { id: 'b1', label: '1 - Thin' },
                { id: 'b2', label: '2 - Strong' },
              ],
            },
          ],
        },
      },
    },
  }
  const staleGrain = {
    templateId: 'mark.doc.essay.v1',
    status: 'filled',
    dimensions: [
      { key: 'old_key', label: 'What was actually marked', score: '3 — Competent', max: 4, notes: 'Held up.' },
    ],
  }
  const radar = radarFromAttachedTemplate({
    id: 'ph.write:mark.doc.essay.v1',
    templateId: 'mark.doc.essay.v1',
    grain: staleGrain,
    brief: renamedBrief,
    toolRef: 'tool.essay',
  })
  assert.deepEqual(radar.axes.map((a) => a.key), ['old_key'], 'falls back to the marked rows')
  assert.equal(radar.axes[0].label, 'What was actually marked')
  // Band prefix carries the unit when the ladder that produced it is gone: 3 of 4.
  assert.ok(Math.abs(radar.axes[0].unit - 2 / 3) < 1e-9, 'unit read from the band prefix')
  assert.equal(radar.axes[0].notes, 'Held up.')

  // Negative: the fallback is last-resort only. When the matrix still matches, the
  // authored rows govern and unmarked ones stay visible as not-scored.
  const matching = radarFromAttachedTemplate({
    id: 'ph.write:mark.doc.essay.v1',
    templateId: 'mark.doc.essay.v1',
    grain: {
      templateId: 'mark.doc.essay.v1',
      status: 'filled',
      dimensions: [{ key: 'renamed_since', label: 'Renamed since marking', score: '2 - Strong', max: 2 }],
    },
    brief: renamedBrief,
    toolRef: 'tool.essay',
  })
  assert.deepEqual(matching.axes.map((a) => a.key), ['renamed_since'], 'authored rows still win')

  // Negative: an unmarked essay keeps its authored axes and says so — the fallback must
  // not fire just because nothing was scored.
  const unmarked = radarFromAttachedTemplate({
    id: 'ph.write:mark.doc.essay.v1',
    templateId: 'mark.doc.essay.v1',
    grain: { templateId: 'mark.doc.essay.v1', status: 'skipped', dimensions: [] },
    brief: renamedBrief,
    toolRef: 'tool.essay',
  })
  assert.deepEqual(unmarked.axes.map((a) => a.key), ['renamed_since'])
  assert.equal(unmarked.axes[0].unit, 0)
  assert.ok(/not/i.test(unmarked.axes[0].notes ?? ''), 'an unmarked axis still says so')
  assert.equal(unmarked.axes[0].absent, true)
}

{
  const glance = sectionCollapsedSummary({
    brief: {
      intro: GLANCE_INTRO_CANARY,
      strengths: ['They finished the hidden suite.'],
      weaknesses: [],
      scoreWhy: 'Tests sit at 90% on the overall score.',
    },
  })
  assert.match(glance, new RegExp(GLANCE_INTRO_CANARY.replace(/[.!?]+$/, '')))
  assert.match(glance, /\*\*Strength:\*\* They finished the hidden suite/)
  assert.equal(
    sectionCollapsedSummary({
      brief: { intro: '', strengths: [], weaknesses: [], scoreWhy: '' },
    }),
    '',
  )
  const leftoverOnly = leftoverSectionProse({
    body: `### Structure\n\n${LEFTOVER_SYNTH_CANARY}`,
    brief: { intro: GLANCE_INTRO_CANARY },
  })
  assert.ok(
    !sectionCollapsedSummary({
      brief: {
        intro: GLANCE_INTRO_CANARY,
        strengths: [],
        weaknesses: [],
        scoreWhy: '',
      },
    }).includes(LEFTOVER_SYNTH_CANARY),
    'negative: leftover dump is not the collapsed summary',
  )
  assert.match(leftoverOnly, new RegExp(LEFTOVER_SYNTH_CANARY))
}

{
  const mixTags = sessionMixTags({
    humanTickShare: 0.5,
    copilotApplyShare: 0.3,
    pasteShare: 0.2,
  })
  assert.deepEqual(
    mixTags.map((t) => t.label),
    ['50% typed', '30% bot', '20% paste'],
  )
  assert.equal(sessionMixTags(null).length, 0)
  assert.equal(sessionMixTags({ humanTickShare: 0, copilotApplyShare: 0, pasteShare: 0 }).length, 0)
}

{
  const scored = {
    key: 'argument',
    label: 'Argument quality',
    unit: 1,
    score: '3 - Strong',
    notes: 'Claim held up.',
    criterion: 'Is the central claim defended with evidence?',
    instanceCount: 1,
  }
  assert.equal(axisDisplayReading(scored), 'Strong')
  assert.equal(axisDisplayWhy(scored), 'Claim held up.')
  assert.equal(axisDisplayShown(scored), '1 moment')
  const emptyNotes = {
    ...scored,
    notes: '',
  }
  assert.equal(axisDisplayWhy(emptyNotes), '', 'scored with no notes stays empty — never the rubric')
  assert.notEqual(axisDisplayWhy(emptyNotes), emptyNotes.criterion)
  assert.notEqual(axisDisplayReading(emptyNotes), emptyNotes.criterion)
  const absent = {
    key: 'asked_well',
    label: 'Asked well',
    unit: 0,
    absent: true,
    notes: AXIS_NOTE_NOT_RECORDED,
    score: 'Weak',
  }
  assert.equal(axisDisplayReading(absent), 'Not scored')
  assert.equal(axisDisplayWhy(absent), AXIS_NOTE_NOT_RECORDED)
  assert.notEqual(axisDisplayReading(absent), 'Weak')
}

{
  const PROCESS_WHY_CANARY = 'Sat idle after the first file hop.'
  const radar = radarFromAttachedTemplate({
    id: 'ph.code:mark.code.approach.v1',
    templateId: 'mark.code.approach.v1',
    brief: codingBrief,
    toolRef: 'tool.code',
    grain: {
      templateId: 'mark.code.approach.v1',
      hostRef: 'tool.code',
      grain: 'after_tool',
      order: 2,
      status: 'filled',
      justification: '',
      result: {
        notes: {
          exploration: PROCESS_WHY_CANARY,
          iteration: 'Did not revise after the stall.',
        },
      },
      dimensions: [
        { key: 'exploration', label: 'Exploration', score: 'weak' },
        { key: 'iteration', label: 'Iteration', score: 'weak' },
        { key: 'debugging', label: 'Debugging', score: 'weak' },
        { key: 'planfulness', label: 'Planfulness', score: 'weak' },
      ],
    },
  })
  assert.ok(radar)
  const exploration = radar.axes.find((a) => a.key === 'exploration')
  const debugging = radar.axes.find((a) => a.key === 'debugging')
  assert.equal(
    exploration?.notes,
    PROCESS_WHY_CANARY,
    'stored process sittings recover Why from result.notes when the axis string was never copied',
  )
  assert.equal(axisDisplayWhy(exploration), PROCESS_WHY_CANARY)
  assert.equal(debugging?.notes, '')
  assert.equal(axisDisplayWhy(debugging), '')
  assert.ok(
    (exploration?.unit ?? 0) > 0,
    'scored Weak must not sit on the radar origin next to Not scored',
  )
}

{
  const assistEmptyNotes = radarFromAttachedTemplate({
    id: 'ph.code:mark.assist.use.v1',
    templateId: 'mark.assist.use.v1',
    brief: codingBrief,
    toolRef: 'tool.code',
    grain: {
      templateId: 'mark.assist.use.v1',
      hostRef: 'tool.code',
      grain: 'after_tool',
      order: 22,
      status: 'filled',
      justification: 'ASSIST_JUST_CANARY they asked to scaffold the helper.',
      result: {},
      dimensions: [
        { key: 'asked_well', label: 'Asked well', score: 'weak' },
        { key: 'over_reliance', label: 'Over-reliance', score: 'strong' },
        { key: 'applied_judgment', label: 'Applied judgment', score: 'weak' },
        { key: 'integrity', label: 'Integrity', score: 'mixed' },
      ],
    },
  })
  assert.ok(assistEmptyNotes)
  const asked = assistEmptyNotes.axes.find((a) => a.key === 'asked_well')
  assert.equal(asked?.absent, false)
  assert.match(
    axisDisplayWhy(asked),
    /ASSIST_JUST_CANARY/,
    'Assist Why falls back to leftover justification when axis notes were never stored',
  )
}

{
  const contentEmpty = radarFromAttachedTemplate({
    id: 'ph.talk:iv.content.v1',
    templateId: 'iv.content.v1',
    brief: codingBrief,
    grain: {
      templateId: 'iv.content.v1',
      hostRef: 'topic.a',
      grain: 'topic_end',
      order: 1,
      status: 'filled',
      justification: 'CONTENT_JUST_CANARY they never named the incident.',
      result: null,
      dimensions: [],
    },
  })
  assert.ok(contentEmpty)
  const relevance = contentEmpty.axes.find((a) => a.key === 'relevance')
  assert.equal(relevance?.absent, false, 'filled leftover with no axis rows is still a Weak mark')
  assert.equal(axisDisplayReading(relevance), 'Weak')
  assert.match(axisDisplayWhy(relevance), /CONTENT_JUST_CANARY/)
}

{
  const overviewSrc = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../../components/InterviewFlowOverviewSection.tsx'),
    'utf8',
  )
  assert.match(overviewSrc, /OverviewDonut overview=\{overview\}/)
  assert.match(overviewSrc, /OverviewFacts rows=\{scoreRows\}/)
  assert.doesNotMatch(overviewSrc, /data-home="mix-why"/)
  assert.doesNotMatch(overviewSrc, /data-home="editor-mix"/)
  assert.doesNotMatch(overviewSrc, /Why the overall score looks like this/)
  assert.doesNotMatch(overviewSrc, /function OverviewMixWhy/)
  const reviewSrc = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), './resultSectionReview.ts'),
    'utf8',
  )
  assert.match(reviewSrc, /sectionCollapsedSummary/)
  assert.match(reviewSrc, /sessionMixTags/)
  assert.doesNotMatch(reviewSrc, /blendSectionLeftover/)
  assert.doesNotMatch(reviewSrc, /mixWhyForPhase/)
}

console.log('resultHomes.unit.mjs: ok')
