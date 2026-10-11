/**
 * Canary e2e: unique tokens from grains through leftover, mix-why, radars, paste, Aid digest.
 * Run: npx tsx front_end/src/lib/interviewRunApi/resultsHomes.e2e.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { collectSittingRead } from './collectSittingRead.ts'
import { emptyInterviewResponse } from './interviewResponse.ts'
import { leftoverSectionProse, mixWhyFromSoftGrade, includedScoreDonutBuckets, contributingScoreDonutBuckets, pasteBurstAccount, applyPasteBurstsToIncidents } from './resultHomes.ts'
import { buildResultReviewPack } from './resultSectionReview.ts'
import { scoreAttempt } from './scoreAttempt.ts'
import { buildAssessorAidReport } from './buildAssessorAidReport.ts'
import { buildAidUserPrompt } from '../../../../back_end/supabase/functions/interview-assessor-aid/prompts/composeAid.ts'
import { retrieveAidPacks } from '../../../../back_end/supabase/functions/interview-assessor-aid/retrieveAidPacks.ts'

const LEFTOVER_SYNTH_CANARY = 'LEFTOVER_SYNTH_CANARY'
const GLANCE_INTRO_CANARY = 'GLANCE_INTRO_CANARY'
const MIX_CONTENT_CANARY = 'MIX_CONTENT_CANARY'
const STRUCTURE_NOTE_CANARY = 'STRUCTURE_NOTE_CANARY'
const PASTE_AFTER_EDIT_CANARY = 'then edited'
const AID_HERE_CANARY = 'Two-sum'

const brief = {
  schemaVersion: 1,
  kind: 'interview_brief',
  definition: { meta: { title: 'Homes canary' } },
  topicLibrary: [
    { id: 'topic.a', label: 'Opening', probes: [], analysis: { attachPack: 'pack.talk' } },
  ],
  phases: [
    { id: 'ph.talk', kind: 'discussion', topicId: 'topic.a', title: 'Opening' },
    { id: 'ph.code', kind: 'tool', toolRef: 'tool.code', title: AID_HERE_CANARY },
  ],
  tools: {
    'tool.code': { type: 'coding', title: AID_HERE_CANARY },
  },
  analysis: {},
}

const base = emptyInterviewResponse('fixture:results-homes')
const response = {
  ...base,
  completedPhaseIds: ['ph.talk', 'ph.code'],
  messages: [
    { id: 't1', phaseId: 'ph.talk', role: 'candidate', kind: 'answer', text: 'story', at: '', topicId: 'topic.a', probeId: null },
  ],
  analysis: {
    ...base.analysis,
    topics: {
      'topic.a': {
        status: 'filled',
        synthesisText: LEFTOVER_SYNTH_CANARY,
        targets: {},
        byTemplate: {
          'iv.delivery.v1': {
            templateId: 'iv.delivery.v1',
            hostRef: 'topic.a',
            grain: 'topic_end',
            order: 1,
            status: 'filled',
            result: { boardSummary: 'Stayed on-clock.' },
            justification: 'Stayed on-clock.',
            dimensions: [
              { key: 'clarity', label: 'Clarity', score: 'strong', notes: 'Clear.' },
              { key: 'composure', label: 'Composure', score: 'mixed', notes: 'Rushed once.' },
              { key: 'structure', label: 'Structure', score: 'mixed', notes: 'Linear.' },
            ],
          },
        },
      },
    },
    tools: {
      'tool.code': {
        'mark.code.structure.v1': {
          templateId: 'mark.code.structure.v1',
          hostRef: 'tool.code',
          grain: 'after_tool',
          order: 1,
          status: 'filled',
          result: { boardSummary: 'One file.', boardSummaryDetail: 'Named tmp.' },
          justification: 'One file.',
          dimensions: [
            { key: 'organization', label: 'Organization', score: 'mixed', notes: STRUCTURE_NOTE_CANARY },
            { key: 'naming', label: 'Naming', score: 'weak', notes: 'tmp.' },
            { key: 'modularity', label: 'Modularity', score: 'mixed', notes: 'One file.' },
          ],
        },
        'mark.code.method.v1': {
          templateId: 'mark.code.method.v1',
          hostRef: 'tool.code',
          grain: 'after_tool',
          order: 2,
          status: 'filled',
          result: { composite: 0.7 },
          justification: 'Worked.',
          dimensions: [
            { key: 'approach', label: 'Approach', score: 'strong', notes: 'Hash map.' },
            { key: 'clarity', label: 'Clarity', score: 'mixed', notes: 'Ok.' },
            { key: 'complexity', label: 'Complexity', score: 'mixed', notes: 'O(n).' },
          ],
        },
      },
    },
  },
}

const scored = scoreAttempt({ brief, response })
const sitting = collectSittingRead({ brief, response, scored })
const talkRow = sitting.find((row) => row.sectionId === 'ph.talk')
assert.ok(talkRow)
assert.match(talkRow.body, new RegExp(LEFTOVER_SYNTH_CANARY), 'synth in leftover body')
talkRow.brief = {
  ...(talkRow.brief ?? { intro: '', strengths: [], weaknesses: [], scoreWhy: '' }),
  intro: GLANCE_INTRO_CANARY,
}

const overview = {
  overall: scored.softGrade.overall,
  summary: 'Sitting-wide paragraph.',
  tags: [],
  sittingSections: sitting,
  securityTitle: 'Security',
  securityParagraphs: [],
  securityUnit: 0,
  securityChecks: [],
  securityCaptures: [],
  securityPoints: [],
  securityIncidents: [],
  securityFlags: [],
  securityDiagrams: null,
  clarityTitle: 'Clarity',
  clarityParagraphs: [],
  clarityUnit: 0,
  clarityChecks: [],
  clarityFindings: [],
  clarityFlags: [],
  clarityPoints: [],
  clarityDiagrams: null,
  sessionSeries: null,
  softGrade: {
    ...scored.softGrade,
    byWeight: {
      ...scored.softGrade.byWeight,
      interviewContent: {
        ...(scored.softGrade.byWeight.interviewContent ?? {
          label: 'Content',
          unit: 0.8,
          weight: 0.3,
          included: true,
          sources: [],
          summary: '',
        }),
        included: true,
        summary: MIX_CONTENT_CANARY,
        summaryDetail: LEFTOVER_SYNTH_CANARY,
      },
      codingTests: {
        ...(scored.softGrade.byWeight.codingTests ?? {
          label: 'Tests',
          unit: 0.8,
          weight: 0.25,
          included: true,
          sources: [],
          summary: '',
        }),
        included: true,
        summary: 'Cleared the full suite (4/4).',
      },
    },
  },
  resultStatus: 'marked',
  sessionMix: {
    copilotApplyShare: 0.15,
    humanTickShare: 0.5,
    pasteShare: 0.35,
    stages: [
      {
        phaseId: 'ph.code',
        toolRef: 'tool.code',
        bucket: 'codingMethod',
        copilotApply: 1,
        humanTicks: 10,
        pasteEvents: 7,
        copilotApplyShare: 0.15,
        humanTickShare: 0.5,
        pasteShare: 0.35,
      },
    ],
  },
}

const steps = [
  { id: 'ph.talk', title: 'Opening', kind: 'talk' },
  { id: 'ph.code', title: AID_HERE_CANARY, kind: 'coding' },
]
const pack = buildResultReviewPack({
  overview,
  steps,
  brief,
  attempt: {
    fixtureId: 'fixture:results-homes',
    response,
    scored,
    talkSectionsMeta: null,
    editorTapes: null,
  },
})

const leftover = leftoverSectionProse(talkRow)
assert.match(leftover, new RegExp(LEFTOVER_SYNTH_CANARY))
assert.ok(!leftover.includes(GLANCE_INTRO_CANARY), 'glance intro is not leftover')
assert.match(pack.sections['ph.talk'].summary, new RegExp(GLANCE_INTRO_CANARY))
assert.ok(!pack.sections['ph.talk'].summary.includes(LEFTOVER_SYNTH_CANARY), 'collapsed talk is glance, not leftover dump')
assert.equal(pack.sections['ph.talk'].scoreWhy, talkRow.brief.scoreWhy)
assert.ok(pack.sections['ph.code'].tags.some((t) => t.label === '50% typed'))
assert.ok(pack.sections['ph.code'].tags.some((t) => t.label === '15% bot'))
assert.ok(pack.sections['ph.code'].tags.some((t) => t.label === '35% paste'))
assert.match(pack.sections['ph.code'].summary, /coding stage/)
assert.ok(!pack.sections['ph.code'].summary.includes('Cleared the full suite (4/4)'), 'collapsed coding is not leftover dump')
assert.ok(!pack.sections['ph.code'].summary.includes('Editor changes:'), 'editor mix is chips, not leftover prose')
assert.ok(!pack.sections['ph.talk'].tags.some((t) => /typed|bot|paste/i.test(t.label)), 'negative: sitting-wide mix stays off talk chips')
assert.equal(leftoverSectionProse({ body: GLANCE_INTRO_CANARY, brief: { intro: GLANCE_INTRO_CANARY } }), '')

{
  const dropped = collectSittingRead({
    brief,
    response: {
      ...response,
      analysis: {
        ...response.analysis,
        topics: {
          'topic.a': { ...response.analysis.topics['topic.a'], synthesisText: '' },
        },
      },
    },
    scored,
  })
  const body = dropped.find((row) => row.sectionId === 'ph.talk')?.body ?? ''
  assert.ok(
    !body.includes(LEFTOVER_SYNTH_CANARY),
    'negative: drop synthesisText → leftover canary absent',
  )
}

const mix = mixWhyFromSoftGrade(overview.softGrade)
assert.ok(mix.some((row) => row.summary === MIX_CONTENT_CANARY))
assert.ok(!mix.some((row) => row.summary === LEFTOVER_SYNTH_CANARY), 'negative: mix-why is not leftover detail')

const slices = contributingScoreDonutBuckets(overview.softGrade.byWeight)
assert.ok(slices.length >= 1, 'donut has bucket slices')
assert.ok(!slices.some(([key]) => key === 'formMark'))
assert.ok(
  !slices.some(([, row]) => String(row?.label ?? '').includes(MIX_CONTENT_CANARY)),
  'mix canary is not a slice name',
)
assert.ok(
  !slices.some(([, row]) => String(row?.summary ?? '').includes(MIX_CONTENT_CANARY) && String(row?.label ?? '') === MIX_CONTENT_CANARY),
)
const includedBuckets = Object.entries(overview.softGrade.byWeight).filter(
  ([key, b]) => key !== 'formMark' && b.included && b.weight > 0,
)
assert.ok(
  slices.every(([key]) => !String(key).startsWith('mark.') && !String(key).startsWith('iv.')),
  'negative: slices are buckets not templates',
)
assert.ok(slices.length <= includedBuckets.length)
assert.ok(
  !slices.some(([, row]) => (Number(row?.unit) || 0) <= 0),
  'negative: zeroed buckets must not occupy the pie',
)
for (const [key, row] of includedBuckets) {
  if ((Number(row?.unit) || 0) > 0) continue
  assert.ok(!slices.some(([sliceKey]) => sliceKey === key), `negative: zeroed ${key} is not a donut slice`)
}

const codeReview = pack.sections['ph.code']
assert.ok(codeReview.radars.some((r) => r.templateId === 'mark.code.structure.v1'))
assert.ok(codeReview.radars.some((r) => r.axes.some((a) => a.notes === STRUCTURE_NOTE_CANARY)))
assert.ok(!pack.sections['ph.code'].summary.includes(STRUCTURE_NOTE_CANARY), 'axis notes are the radar Why home, not leftover')
assert.ok(!codeReview.radars.some((r) => r.templateId === 'iv.star.v1'), 'negative: STAR omitted on coding-without-STAR')
assert.ok(!codeReview.radars.some((r) => r.label === 'Delivery'), 'structure notes are not Talk Delivery')

const burst = {
  t: 12_000,
  clock: '0:12',
  file: 'src/solve.ts',
  route: 'unknown',
  before: { bucketId: 'b1', lastActions: ['run'] },
  after: { nextActions: [], ranTests: false, edited: true, idleMs: 0 },
  summary: 'Pasted, then edited.',
}
const pasteSentence = pasteBurstAccount(burst)
assert.match(pasteSentence, /ran tests/i)
assert.match(pasteSentence, /paste/i)
assert.match(pasteSentence, /src\/solve\.ts/)
assert.match(pasteSentence, new RegExp(PASTE_AFTER_EDIT_CANARY))
assert.ok(pasteSentence !== 'run', 'negative: a run tick is not the paste sentence')
assert.ok(!/run\s*[×x]\s*\d/.test(pasteSentence), 'negative: caption is a sentence, not a telegram')
const incidents = applyPasteBurstsToIncidents(
  [{ id: 'i1', kind: 'paste', t: 12_000, sectionId: 'ph.code', pre: { body: 'canned' } }],
  [burst],
)
assert.match(incidents[0].pre.body, new RegExp(PASTE_AFTER_EDIT_CANARY))

const report = buildAssessorAidReport({
  overview: {
    ...overview,
    securityIncidents: incidents,
  },
  review: pack,
  locus: { view: 'section', sectionId: 'ph.code', sectionTitle: AID_HERE_CANARY, stage: 'editor' },
})
assert.match(report.sections.find((s) => s.id === 'ph.talk')?.summary ?? '', new RegExp(LEFTOVER_SYNTH_CANARY))
assert.ok(
  !report.sections.find((s) => s.id === 'ph.talk')?.summary.includes(GLANCE_INTRO_CANARY),
  'Aid leftover is not the collapsed glance intro',
)
assert.ok(report.mix.includes(MIX_CONTENT_CANARY))
assert.ok(report.sections.find((s) => s.id === 'ph.code')?.axes.some((a) => a.notes === STRUCTURE_NOTE_CANARY))
assert.match(report.security.incidents[0]?.note ?? '', new RegExp(PASTE_AFTER_EDIT_CANARY))

const aidCtx = {
  title: AID_HERE_CANARY,
  readerPosition: `section "${AID_HERE_CANARY}" with Work open`,
  messages: [{ id: 'm1', role: 'candidate', text: 'here' }],
  report,
}
const aidNeeds = [
  { sourceId: 'here', id: 'ph.code', reason: 'open' },
  { sourceId: 'mix', reason: 'card' },
  { sourceId: 'section', id: 'ph.talk', reason: 'leftover' },
]
const prompt = buildAidUserPrompt({
  ctx: aidCtx,
  messages: [{ role: 'candidate', text: 'what happened here?' }],
  plan: {
    mode: 'report',
    situation: 'explain_here',
    homes: ['Here', 'Mix', 'Sections'],
    needs: aidNeeds,
    summary: 'open section, mix, leftover',
  },
  retrieved: retrieveAidPacks(aidCtx, aidNeeds),
  ask: 'what happened here?',
})
assert.match(prompt, /^# Retrieved/m)
assert.match(prompt, new RegExp(AID_HERE_CANARY))
assert.match(prompt, new RegExp(MIX_CONTENT_CANARY))
assert.match(prompt, new RegExp(LEFTOVER_SYNTH_CANARY))
assert.ok(!/@ ph\./.test(prompt), 'Aid retrieve must not dump phase ids as @ ph.')
assert.notEqual(prompt.trim(), JSON.stringify({ report }), 'negative: prompt is not raw stringify')

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '../../../..')
const resultSection = readFileSync(join(root, 'front_end/src/components/InterviewFlowResultSection.tsx'), 'utf8')
assert.match(resultSection, /data-home="glance"/)
assert.match(resultSection, /ResultRadarNotes/)
assert.match(resultSection, /review\.summary/)
assert.match(resultSection, /review\.scoreWhy/)
assert.doesNotMatch(resultSection, /data-home="leftover"/)
assert.doesNotMatch(resultSection, /theme-interview-result-review__axis-table/)
const reviewSrc = readFileSync(join(root, 'front_end/src/lib/interviewRunApi/resultSectionReview.ts'), 'utf8')
assert.match(reviewSrc, /sectionCollapsedSummary\(sitting\)/)
assert.match(reviewSrc, /sessionMixTags/)
assert.doesNotMatch(reviewSrc, /leftoverSectionProse\(sitting\)/)
assert.doesNotMatch(reviewSrc, /blendSectionLeftover/)
assert.doesNotMatch(reviewSrc, /brief\?\.intro \|\|/)
const overviewSrc = readFileSync(join(root, 'front_end/src/components/InterviewFlowOverviewSection.tsx'), 'utf8')
assert.doesNotMatch(overviewSrc, /Why the overall score looks like this/)
assert.doesNotMatch(overviewSrc, /data-home="mix-why"/)
assert.doesNotMatch(overviewSrc, /data-home="editor-mix"/)
assert.match(overviewSrc, /insertMarksFromIncidents/)
assert.match(overviewSrc, /is-bot-edit/)
assert.match(overviewSrc, /is-paste-internal/)
assert.match(overviewSrc, /Outside paste/)
assert.match(overviewSrc, /In-app paste/)
const repeaterSrc = readFileSync(join(root, 'front_end/src/components/InterviewOutputCardRepeater.tsx'), 'utf8')
assert.match(repeaterSrc, /contributingScoreDonutBuckets/)
assert.match(repeaterSrc, /buildScoreDonutOption/)
assert.doesNotMatch(repeaterSrc, /0\.0001/)
assert.doesNotMatch(repeaterSrc, /includedScoreDonutBuckets/)
const tapeSrc = readFileSync(join(root, 'front_end/src/components/InterviewEditorTapePlayer.tsx'), 'utf8')
assert.match(tapeSrc, /data-home="paste-account"/)
assert.match(tapeSrc, /pasteBurstAccount/)
assert.match(tapeSrc, /tape-player-caption/)
const codingVerify = readFileSync(join(root, 'front_end/src/components/InterviewCodingVerifyPanel.tsx'), 'utf8')
assert.match(codingVerify, /pasteBursts=\{extraPasteBurstsFromCards/)
const page = readFileSync(join(root, 'front_end/src/pages/InterviewPage.tsx'), 'utf8')
assert.match(page, /composeAssessorAid/)
assert.match(page, /assessorAidReportRef/)
assert.match(page, /buildAssessorAidContext/)
assert.match(page, /focusCardId:\s*focus\.focusCardId/)
const resultCard = readFileSync(join(root, 'front_end/src/components/InterviewResultCard.tsx'), 'utf8')
assert.match(resultCard, /buildAssessorAidReport/)

console.log('resultsHomes.e2e.mjs: ok')
