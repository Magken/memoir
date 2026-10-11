/**
 * Result-spine review pack: sitting tags + radars, Talk slice, phase align.
 * Run: npx tsx front_end/src/lib/interviewRunApi/resultSectionReview.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildResultOverview, SAMPLE_OUTPUT_CARDS } from './fixtures/output-cards/outputCardFixture.ts'
import {
  alignAttemptPhaseId,
  buildResultReviewPack,
  fillResultReviewStage,
  parseResultReviewEditId,
  defaultResultReviewMode,
  talkPhaseIdsFromResponse,
} from './resultSectionReview.ts'
import { sliceTalkVerifyModal } from './talkVerifyModal.ts'

const card = SAMPLE_OUTPUT_CARDS[0]
assert.ok(card)
const overview = buildResultOverview(card)

const steps = [
  { id: 'ph.eligible', title: 'Eligibility', kind: 'form' },
  { id: 'ph.warmup', title: 'Opening', kind: 'talk' },
  { id: 'ph.conflict', title: 'Conflict', kind: 'talk' },
  { id: 'ph.code', title: 'Coding', kind: 'coding' },
  { id: 'ph.essay', title: 'Writing', kind: 'doc' },
  { id: 'ph.close', title: 'Closing', kind: 'talk' },
]

const pack = buildResultReviewPack({
  overview,
  steps,
  brief: { schemaVersion: 1, kind: 'interview_brief', definition: {}, topicLibrary: [], phases: [] },
})

const warmup = pack.sections['ph.warmup']
assert.ok(warmup)
assert.ok(warmup.tags.some((tag) => tag.hint === 'Delivery'))
assert.ok(warmup.radars.some((radar) => radar.label === 'Delivery' && radar.axes.length >= 3))
assert.equal(
  warmup.radars.find((radar) => radar.label === 'Delivery')?.face,
  'conversation',
  'Talk charts are Conversation, not Work',
)
assert.equal(warmup.canEditor, false)
assert.match(warmup.summary, /Opening is a conversation/)
assert.match(warmup.summary, /\*\*Strength:\*\*/)
assert.match(warmup.scoreWhy, /Delivery sits/)
assert.ok(!/### How they speak/.test(warmup.summary), 'collapsed summary is glance, not leftover dump')

const conflict = pack.sections['ph.conflict']
assert.ok(conflict)
assert.ok(conflict.radars.some((radar) => radar.axes.length >= 3))

const coding = pack.sections['ph.code']
assert.ok(coding)
assert.equal(coding.canEditor, true)
assert.ok(coding.tags.some((tag) => tag.hint === 'Tests'))
assert.ok(coding.radars.length >= 1)
assert.ok(
  coding.radars.every((radar) => radar.face !== 'conversation'),
  'theme coding charts are Work, not Assist utterance radars',
)
assert.match(coding.summary, /Coding is a coding stage/)
assert.match(coding.scoreWhy, /Tests sit/)
assert.ok(!/### Tests/.test(coding.summary), 'collapsed coding is not leftover dump')

const form = pack.sections['ph.eligible']
assert.ok(form)
assert.equal(form.canEditor, true)
assert.equal(form.radars.length, 0)
assert.ok(form.tags.some((tag) => /14/.test(tag.label)))

// ── Every output kind is design-reviewable on SAMPLE packs ──────────────────────
// The non-radar homes used to be hardcoded empty without a live response, so taxonomy
// chips, enum ladders, scalar readouts and pass/fail badges rendered nothing on Theme.
assert.ok(warmup.taxonomies.length >= 1, 'talk preview shows taxonomy chips')
assert.ok(warmup.enums.length >= 1, 'talk preview shows an enum ladder')
{
  const ladder = warmup.enums[0]
  assert.ok(ladder.enumValues.includes(ladder.value), 'the marked rung is on its own ladder')
}
assert.ok(form.passFails.length >= 1, 'form preview shows a pass/fail badge')
assert.ok(coding.passFails.length >= 1, 'coding preview shows a pass/fail badge')
{
  const doc = pack.sections['ph.write'] ?? pack.sections['ph.doc']
  if (doc) assert.ok(doc.scalars.length >= 1, 'doc preview shows a scalar readout')
}
// Negative: preview shapes must never reach a live sitting — live homes come from
// real grains only, so a response with no analysis renders nothing rather than samples.
{
  const livePack = buildResultReviewPack({
    overview,
    steps,
    brief: { schemaVersion: 1, kind: 'interview_brief', definition: {}, topicLibrary: [], phases: [] },
    attempt: {
      fixtureId: 'live',
      response: {
        messages: [],
        analysis: { turns: {}, tools: {}, topics: {} },
        completedPhaseIds: [],
        skippedPhaseIds: [],
      },
      scored: { artifacts: undefined },
    },
  })
  assert.equal(livePack.sections['ph.warmup'].taxonomies.length, 0)
  assert.equal(livePack.sections['ph.eligible'].passFails.length, 0)
}

const fakeResponse = {
  messages: [
    { id: 'a', phaseId: 'ph.t1', role: 'assistant', kind: 'opener', text: 'Hi', at: '', topicId: 't', probeId: null },
    { id: 'b', phaseId: 'ph.t1', role: 'candidate', kind: 'answer', text: 'Ok', at: '', topicId: 't', probeId: null },
    { id: 'c', phaseId: 'ph.t2', role: 'assistant', kind: 'opener', text: 'Next', at: '', topicId: 'u', probeId: null },
  ],
  completedPhaseIds: ['ph.t1', 'ph.form1', 'ph.t2', 'ph.code1', 'ph.doc1'],
}

assert.deepEqual(talkPhaseIdsFromResponse(fakeResponse), ['ph.t1', 'ph.t2'])
assert.equal(
  alignAttemptPhaseId(steps[1], steps, fakeResponse),
  'ph.t1',
)
assert.equal(
  alignAttemptPhaseId(steps[2], steps, fakeResponse),
  'ph.t2',
)
assert.equal(
  alignAttemptPhaseId(steps[0], steps, fakeResponse),
  'ph.form1',
)
assert.equal(
  alignAttemptPhaseId(steps[3], steps, fakeResponse),
  'ph.code1',
)

const liveResponse = {
  messages: [
    { id: 'x', phaseId: 'ph.conflict', role: 'assistant', kind: 'opener', text: 'Hi', at: '', topicId: 't', probeId: null },
    { id: 'y', phaseId: 'ph.conflict', role: 'candidate', kind: 'answer', text: 'Ok', at: '', topicId: 't', probeId: null },
  ],
  completedPhaseIds: ['ph.conflict', 'ph.code'],
  skippedPhaseIds: ['ph.warmup'],
}
assert.equal(alignAttemptPhaseId(steps[2], steps, liveResponse), 'ph.conflict')
assert.equal(alignAttemptPhaseId(steps[1], steps, liveResponse), 'ph.warmup')
assert.equal(alignAttemptPhaseId(steps[3], steps, liveResponse), 'ph.code')

const sliced = sliceTalkVerifyModal(
  {
    fixtureId: 'x',
    sectionKey: 'interviewDelivery',
    sectionLabel: 'Conversation',
    title: 'All',
    description: '',
    depthLabel: 'Discussion',
    personaName: 'Alex',
    talkSections: [
      { topicId: 't', phaseId: 'ph.t1', title: 'One', description: '', depthLabel: '', messageIds: ['a', 'b'] },
      { topicId: 'u', phaseId: 'ph.t2', title: 'Two', description: '', depthLabel: '', messageIds: ['c'] },
    ],
    messages: fakeResponse.messages,
    softBucket: null,
    cards: [
      { id: '1', kind: 'utterance', anchorMessageId: 'b', messageIds: ['b'], title: 'Delivery', lane: 'delivery', emphasized: true, dimensions: [], evidence: [] },
      { id: '2', kind: 'utterance', anchorMessageId: 'c', messageIds: ['c'], title: 'Delivery', lane: 'delivery', emphasized: true, dimensions: [], evidence: [] },
    ],
    packageJson: {},
  },
  'ph.t1',
  { title: 'Opening' },
)
assert.ok(sliced)
assert.equal(sliced.title, 'Opening')
assert.equal(sliced.messages.length, 2)
assert.equal(sliced.cards.length, 1)

assert.equal(Object.keys(pack.talk).length, 0)
assert.equal(Object.keys(pack.coding).length, 0)
assert.equal(Object.keys(pack.essay).length, 0)
assert.equal(Object.keys(pack.form).length, 0)
fillResultReviewStage(pack, 'ph.code', 'editor')
assert.equal(Object.keys(pack.coding).length, 0)

assert.deepEqual(parseResultReviewEditId('ph.code::editor'), { stepId: 'ph.code', mode: 'editor' })
assert.deepEqual(parseResultReviewEditId('ph.warmup::chat'), { stepId: 'ph.warmup', mode: 'chat' })
assert.equal(parseResultReviewEditId('ph.warmup'), null)
assert.equal(defaultResultReviewMode({ canChat: true, canEditor: true }), 'editor')
assert.equal(defaultResultReviewMode({ canChat: false, canEditor: true }), 'editor')
assert.equal(defaultResultReviewMode({ canChat: true, canEditor: false }), 'chat')
assert.equal(defaultResultReviewMode({ canChat: false, canEditor: false }), 'editor')
assert.equal(
  defaultResultReviewMode({ canChat: true, canEditor: true }) === 'chat',
  false,
  'negative: a section with Work must not open Conversation first',
)

// ── The marked enum rung does not depend on colour ──────────────────────────────
// Source gate, not behaviour: `InterviewFlowResultSection.tsx` pulls a CSS import
// chain (markdown → katex) so the module cannot be imported under node, and there is
// no DOM renderer in this suite. Asserting the guard in source is the only option
// here — if a component test host ever lands, replace this with a render assertion.
{
  const src = readFileSync(
    new URL('../../components/InterviewFlowResultSection.tsx', import.meta.url),
    'utf8',
  )
  const enumBlock = src.slice(
    src.indexOf('function ResultEnumChoice'),
    src.indexOf('function ResultScalarReadout'),
  )
  assert.ok(enumBlock.length > 0, 'ResultEnumChoice must still exist')
  assert.match(enumBlock, /aria-current=\{chosen \? 'true' : undefined\}/)
  assert.match(enumBlock, /font-semibold/, 'the marked rung needs a non-colour cue')
  assert.match(enumBlock, /sr-only/, 'the marked rung needs an accessible name')
  // Negative: the old colour-only ternary must not come back.
  assert.doesNotMatch(
    enumBlock,
    /chosen \? 'type-body-sm' : 'type-body-sm type-muted'/,
    'colour alone cannot carry the verdict',
  )
  assert.match(
    src,
    /import \{ useMemo \} from 'react'/,
    'Expand stage calls useMemo — it must be imported (missing import crashed Results)',
  )
  assert.match(src, /const filled = useMemo\(/, 'useMemo is used at the Expand fill site')
  assert.match(src, /flashMessageId = highlightMessageId \?\? pending\?\.messageId/)
  assert.match(src, /showFaceHeads/, 'collapsed charts split Work vs Conversation when both exist')
  assert.match(src, /workRadars\.map\(radarArticle\)/)
  assert.match(src, /chatRadars\.map\(radarArticle\)/)
  assert.equal(
    /review\.radars\.map\(\(radar\) =>/.test(src),
    false,
    'negative: collapsed radars must not paint Work and Conversation as one unlabeled stack',
  )
}

{
  const beats = readFileSync(
    new URL('../../components/InterviewFlowReportBeats.tsx', import.meta.url),
    'utf8',
  )
  const css = readFileSync(
    new URL('../../css/effects/interview-result-card.css', import.meta.url),
    'utf8',
  )
  assert.match(
    beats,
    /theme-interview-result-review__mark-host[\s\S]*theme-interview-result-review__mark-row/,
    'each mark keeps a host around copy + rail',
  )
  assert.equal(
    /__mark-host \{[\s\S]*?container-type/.test(css),
    false,
    'negative: container-type on mark-host traps sticky inside the row, so the radar never pins like the Overview donut',
  )
  const defaultRow = css.slice(css.indexOf('.theme-interview-result-review__mark-row {'))
  const defaultRowBlock = defaultRow.slice(0, defaultRow.indexOf('}', defaultRow.indexOf('grid-template-columns')) + 1)
  assert.match(
    defaultRowBlock,
    /grid-template-columns:\s*minmax\(0,\s*1fr\)/,
    'narrow Conversation rail stacks copy above the radar',
  )
  assert.equal(
    /minmax\(12rem,\s*16rem\)/.test(defaultRowBlock),
    false,
    'negative: a 12rem radar column must not sit beside copy in a 15rem Talk rail',
  )
  assert.match(
    css,
    /overview__aside \{[\s\S]*?align-items:\s*center/,
    'Work radar sits in the same centred aside column as the Overview donut',
  )
  const groupBlock = beats.slice(beats.indexOf('function InterviewMarkGroupView'))
  const workBeatBlock = beats.slice(
    beats.indexOf('function MarkWorkAxes'),
    beats.indexOf('function InterviewMarkGroupView'),
  )
  const boardBlock = beats.slice(beats.indexOf('function InterviewMarkBoardView'))
  assert.match(
    boardBlock,
    /OverviewBeatStack[\s\S]*groups\.map[\s\S]*InterviewMarkGroupView/,
    'What they produced and How they worked are split by the same Overview hairline as beats',
  )
  assert.equal(
    /mark-board">\s*\{groups\.map/.test(boardBlock),
    false,
    'negative: stacking families with only gap leaves What they produced butted against How they worked',
  )
  assert.equal(
    /IntersectionObserver/.test(boardBlock),
    false,
    'negative: swapping one radar with IntersectionObserver teleports the chart instead of sequential sticky',
  )
  assert.equal(
    /activeBeatId/.test(boardBlock),
    false,
    'negative: one active radar for the whole board is the teleport',
  )
  assert.match(
    workBeatBlock,
    /DocArticleLayout[\s\S]*variant="sidebar"[\s\S]*overview__aside[\s\S]*ResultRadar[\s\S]*ResultRadarKey/,
    'each Work beat keeps its own Overview aside (chart then table) so the next radar sticks when this one releases',
  )
  assert.match(
    workBeatBlock,
    /theme-interview-flow-overview__beat-title type-body-lg[\s\S]*BeatTagRow/,
    'Work beats match Overview: hierarchical beat title, then chips under it, then prose',
  )
  assert.equal(
    /theme-interview-flow-templates-section__subhead/.test(workBeatBlock),
    false,
    'negative: SubSectionHead on Work beats was the lost one-liner ladder',
  )
  assert.equal(
    /guide-rule/.test(workBeatBlock),
    false,
    'negative: a guide-rule under every beat title is not Overview hierarchy',
  )
  assert.equal(
    /mark-subhead-row/.test(workBeatBlock),
    false,
    'negative: chips must not sit on the heading row opposite the title',
  )
  assert.equal(
    /<OverviewBeat[\s>]/.test(workBeatBlock),
    false,
    'negative: OverviewBeat’s body-lg title + chip + markdown indent is the disorganised Work ladder',
  )
  assert.match(
    workBeatBlock,
    /theme-interview-flow-overview__beat/,
    'Work beats sit in the Overview beat stack so hairlines and titles share the same ladder',
  )
  assert.equal(
    /DocArticleLayout/.test(boardBlock),
    false,
    'negative: one sidebar around every family forces a single swapped radar',
  )
  const groupOnly = groupBlock.slice(0, groupBlock.indexOf('function InterviewMarkBoardView'))
  assert.match(
    groupOnly,
    /theme-interview-flow-timeline__title type-h3 type-serif-italic/,
    'family headings are the same timeline title as Overview / Security / Clarity',
  )
  assert.equal(
    /type-body-lg/.test(groupOnly.slice(0, groupOnly.indexOf('OverviewBeatStack'))),
    false,
    'negative: body-lg on How they worked made it look like the beat title',
  )
  assert.match(
    groupOnly,
    /OverviewBeatStack/,
    'in-family beats use Overview hairlines so one-liners are not lost between titles',
  )
  assert.match(
    groupOnly,
    /markBeatHeading\(beat\.title, group\.title\)/,
    'beat titles strip parentheticals and skip restating How they worked',
  )
  assert.equal(
    /InterviewMarkBeatRow/.test(groupOnly),
    false,
    'Work copy does not stack a Conversation rail beside the Overview aside',
  )
  assert.match(
    workBeatBlock,
    /function MarkWorkAxes[\s\S]*type-label[\s\S]*BeatTagRow/,
    'axis names are labels with Clarity chips underneath, not a trailing Tag on the heading row',
  )
  assert.equal(
    /space-between/.test(css.slice(css.indexOf('__mark-copy'), css.indexOf('__mark-host'))),
    false,
    'negative: Clarity tags are under the title, not space-between on the far edge',
  )
  const railBlock = beats.slice(beats.indexOf('function InterviewMarkBeatRow'))
  assert.equal(
    /mark-rail theme-interview-result-review__radar-col/.test(railBlock),
    false,
    'negative: radar-col unsticks under 60rem and would drop Work sticky on a typical overlay',
  )
  assert.match(
    beats,
    /function MarkBeatCopy[\s\S]*ResultRadarNotes/,
    'Why prose stays with the beat, not under the chart',
  )
  assert.equal(
    /overview__aside[\s\S]*ResultRadarNotes/.test(workBeatBlock),
    false,
    'negative: the rail must not dump axis Why under the radar',
  )
  assert.match(
    css,
    /result-review-stage > \.theme-interview-flow-overview \{[\s\S]*?max-width:\s*36rem/,
    'Security / Clarity edit shells stay at Creator measure',
  )
  const toolOverview = css.slice(
    css.indexOf('.theme-interview-landing__verify-tool'),
  )
  const toolOverviewBlock = toolOverview.slice(
    toolOverview.indexOf('.theme-interview-flow-overview {'),
    toolOverview.indexOf('}', toolOverview.indexOf('.theme-interview-flow-overview {')) + 1,
  )
  assert.match(
    toolOverviewBlock,
    /max-width:\s*none/,
    'Work marks use the full overlay column, not the 36rem one-column shell',
  )
  assert.equal(
    /max-width:\s*36rem/.test(toolOverviewBlock),
    false,
    'negative: the 36rem cap left an empty left column and squashed copy | radar into one track',
  )
}

{
  const coding = readFileSync(
    new URL('../../components/InterviewCodingVerifyPanel.tsx', import.meta.url),
    'utf8',
  )
  const landing = readFileSync(
    new URL('../../css/effects/interview-landing.css', import.meta.url),
    'utf8',
  )
  const leadStart = coding.indexOf('className="theme-interview-landing__verify-lead"')
  const leadEnd = coding.indexOf('<InterviewVerifyQuestionOverview>')
  const lead = coding.slice(leadStart, leadEnd)
  assert.ok(leadStart >= 0 && leadEnd > leadStart, 'Work header and question overview still exist')
  assert.match(lead, /modal\.title/)
  assert.equal(
    /modal\.description/.test(lead),
    false,
    'exercise prompt is not in the Work header — Overview of the question holds it',
  )
  assert.equal(
    /depthLabel/.test(coding),
    false,
    'negative: “Coding verify · 2 visible · 2 hidden” is not a Work heading',
  )
  assert.equal(
    /verify-tool-divider/.test(coding),
    false,
    'negative: a spare divider node is not the section break — the lead hairline is',
  )
  assert.equal(
    /Coding verify/.test(coding),
    false,
    'negative: stage chrome must not reprint “Coding verify” under the title',
  )
  assert.match(
    coding,
    /verify-lead[\s\S]*InterviewVerifyQuestionOverview[\s\S]*<\/header>/,
    'Overview of the question sits with the title, not after a divider',
  )
  const essay = readFileSync(
    new URL('../../components/InterviewEssayVerifyPanel.tsx', import.meta.url),
    'utf8',
  )
  const form = readFileSync(
    new URL('../../components/InterviewFormVerifyPanel.tsx', import.meta.url),
    'utf8',
  )
  assert.equal(/depthLabel/.test(essay), false, 'negative: Writing verify · N criteria is not a heading')
  assert.equal(/verify-tool-divider/.test(essay), false)
  assert.equal(/depthLabel/.test(form), false, 'negative: Form verify · N questions is not a heading')
  assert.equal(/verify-tool-divider/.test(form), false)
  const leadOpen = landing.indexOf('.theme-interview-landing__verify-lead {')
  const leadRule = landing.slice(leadOpen, landing.indexOf('}', leadOpen) + 1)
  assert.match(
    leadRule,
    /border-bottom:\s*var\(--theme-divider-line\)/,
    'hairline after Overview of the question, before the marks section',
  )
  assert.equal(
    /border-bottom:\s*0/.test(leadRule),
    false,
    'negative: a zeroed lead border left the marks butted up under the overview fold',
  )
  const question = landing.slice(
    landing.indexOf('.theme-interview-landing__verify-question {'),
    landing.indexOf('.theme-interview-landing__verify-question-toggle'),
  )
  assert.match(question, /border-bottom:\s*0/, 'no hairline between the title and Overview of the question')
  assert.match(
    landing,
    /verify-question \.theme-interview-gate \{[\s\S]*?text-align:\s*left/,
    'Overview of the question does not inherit the sitting gate’s centered column',
  )
}

{
  const stage = readFileSync(
    new URL('../../components/InterviewFlowResultSection.tsx', import.meta.url),
    'utf8',
  )
  const live = readFileSync(
    new URL('../../components/InterviewLanding.tsx', import.meta.url),
    'utf8',
  )
  const coding = readFileSync(
    new URL('../../components/InterviewCodingVerifyPanel.tsx', import.meta.url),
    'utf8',
  )
  assert.match(
    stage,
    /InterviewCodingVerifyPanel[\s\S]*inPageScroll/,
    'Results Work is the overlay page, same scroller as Overview',
  )
  assert.match(
    coding,
    /inPageScroll \? \(\s*inner\s*\)/,
    'Results Work does not wrap marks in ThemeScroll — Overview has none',
  )
  const pageBranch = coding.slice(coding.indexOf('{inPageScroll ?'), coding.indexOf(') : ('))
  assert.equal(
    /ThemeScroll|scrollClouds/.test(pageBranch),
    false,
    'negative: scrollClouds overflow:hidden is what stopped Work sticky while Overview’s donut pinned',
  )
  assert.match(
    coding,
    /scrollClouds/,
    'live Verify still uses a tool ThemeScroll',
  )
  assert.equal(
    /inPageScroll/.test(live),
    false,
    'negative: live Verify keeps its own tool scroll — inPageScroll would leave that overlay with nothing to scroll',
  )
  const strip = readFileSync(
    new URL('../../components/InterviewVerifyMarkStrip.tsx', import.meta.url),
    'utf8',
  )
  assert.match(
    strip,
    /InterviewMarkBoardView[\s\S]*groups=\{groups\}/,
    'Work strip still mounts the board (families + per-beat sticky asides)',
  )
  assert.equal(
    /InterviewMarkGroupView/.test(strip),
    false,
    'negative: the strip must not mount a sticky aside on How they worked alone',
  )
  assert.match(
    stage,
    /InterviewTalkVerifyPanel[\s\S]*hideStageMeta/,
    'Results still passes hideStageMeta (API leftover; overview fold owns description)',
  )
  assert.equal(
    /hideStageMeta/.test(live),
    false,
    'negative: live Talk Verify does not pass hideStageMeta',
  )
  const talkPanel = readFileSync(
    new URL('../../components/InterviewTalkVerifyPanel.tsx', import.meta.url),
    'utf8',
  )
  assert.match(
    talkPanel,
    /verify-mark-card/,
    'Results Conversation uses Talk marker bubbles',
  )
  assert.equal(
    /InterviewMarkBeatRow/.test(talkPanel),
    false,
    'negative: Conversation marks are not Clarity beat rows',
  )
  assert.equal(
    /InterviewVerifyContributionList/.test(talkPanel),
    false,
    'negative: How each mark counts is not on Conversation',
  )
  assert.equal(
    /CascadeMenuButton/.test(talkPanel),
    false,
    'negative: Copy / Download JSON is not on Conversation',
  )
  assert.match(
    talkPanel,
    /InterviewVerifyQuestionOverview/,
    'Conversation lead can fold Overview of the section',
  )
  const finished = readFileSync(
    new URL('../../components/InterviewFinishedScene.tsx', import.meta.url),
    'utf8',
  )
  const headerCss = readFileSync(
    new URL('../../css/effects/interview-result-card.css', import.meta.url),
    'utf8',
  )
  const header = finished.slice(
    finished.indexOf('<header className="theme-interview-creator__builder-header">'),
    finished.indexOf('<InterviewResultBoundary'),
  )
  assert.match(
    header,
    /builder-header-lead[\s\S]*Back[\s\S]*builder-header-actions[\s\S]*Work[\s\S]*Conversation/,
    'Back left, Work / Conversation right at md — Creator header, not a wrapped left cluster',
  )
  assert.match(
    header,
    /theme-interview-creator__manage-divider/,
    'the switch uses the usual header manage-divider, not the short toolbar-rule',
  )
  const lead = header.slice(0, header.indexOf('builder-header-actions'))
  assert.equal(
    /Work|Conversation/.test(lead),
    false,
    'negative: parking the switch in the lead wraps it under Back',
  )
  assert.equal(
    /size="sm"/.test(header),
    false,
    'negative: sm Work / Conversation were shorter than Back',
  )
  assert.equal(
    /toolbar-rule/.test(header),
    false,
    'negative: section toolbar-rule is 1.05rem and reads as a tick',
  )
  const switchCss = headerCss.slice(
    headerCss.indexOf('.theme-interview-landing__verify-header-switch {'),
    headerCss.indexOf(
      '}',
      headerCss.indexOf('.theme-interview-landing__verify-header-switch {'),
    ) + 1,
  )
  assert.match(switchCss, /align-items:\s*center/)
  assert.equal(
    /align-items:\s*stretch/.test(switchCss),
    false,
    'negative: stretch made Work / Conversation taller than Back',
  )
  const timeline = readFileSync(
    new URL('../../components/InterviewFlowTimeline.tsx', import.meta.url),
    'utf8',
  )
  assert.match(
    timeline,
    /showOverview \? brief\.steps\.filter\(\(step\) => step\.kind !== 'wrap'\)/,
    'Results day omits Decision package — that rollup already lives in Overview',
  )
  assert.match(
    timeline,
    /visibleSteps.map\(\(step/,
    'Results / Creator day list uses visibleSteps',
  )
  assert.equal(
    /brief\.steps\.map\(\(step, index\)/.test(timeline),
    false,
    'negative: Results day must not map brief.steps (that reintroduces Decision package)',
  )
  {
    const toc = timeline.slice(
      timeline.indexOf('const tocEntries'),
      timeline.indexOf('const tocSortableIds'),
    )
    assert.match(toc, /for \(const step of visibleSteps\)/, 'Contents uses visibleSteps')
    assert.equal(
      /for \(const step of brief.steps\)/.test(toc),
      false,
      'negative: Results Contents must not list Decision package',
    )
  }
  {
    const tocCss = headerCss.slice(
      headerCss.indexOf('@media (min-width: 64rem)'),
      headerCss.indexOf('@media (max-width: 40rem)'),
    )
    assert.match(
      tocCss,
      /verify-spine-page[\s\S]*doc-article-shell__toc[\s\S]*top:\s*4rem/,
      'Results Contents sticks below the sticky Back header',
    )
    assert.equal(
      /doc-article-shell__toc[\s\S]*top:\s*0\.75rem/.test(tocCss),
      false,
      'negative: Contents top: 0.75rem slides under the sticky header',
    )
  }
  {
    const asidePin = headerCss.slice(
      headerCss.indexOf('Contents, Overview donut'),
    )
    assert.match(
      asidePin,
      /verify-spine-page[\s\S]*doc-article__layout-aside[\s\S]*top:\s*4rem/,
      'Overview donut sticks below the sticky Back header',
    )
    assert.equal(
      /layout-aside[\s\S]{0,280}top:\s*1(?:\.15)?rem/.test(asidePin),
      false,
      'negative: donut top: 1rem clips into the sticky header',
    )
  }
  assert.match(
    headerCss,
    /builder-header-actions \{[\s\S]*grid-column:\s*3/,
    'Work / Conversation pin to the right Creator column, not the centre track',
  )
  assert.equal(
    /grid-template-columns:\s*minmax\(0,\s*1fr\) auto;/.test(headerCss),
    false,
    'negative: a 2-column overlay cannot beat Creator’s unlayered 3-column grid, so the switch sat in the centre',
  )
}

{
  const beats = readFileSync(
    new URL('../../components/InterviewFlowReportBeats.tsx', import.meta.url),
    'utf8',
  )
  const overview = readFileSync(
    new URL('../../components/InterviewFlowOverviewSection.tsx', import.meta.url),
    'utf8',
  )
  const stage = readFileSync(
    new URL('../../components/InterviewFlowResultSection.tsx', import.meta.url),
    'utf8',
  )
  const talk = readFileSync(
    new URL('../../components/InterviewTalkVerifyPanel.tsx', import.meta.url),
    'utf8',
  )
  const bodyCss = readFileSync(
    new URL('../../css/effects/interview-result-card.css', import.meta.url),
    'utf8',
  )
  assert.match(
    beats,
    /type-body mb-0 theme-interview-result-review__axis-why/,
    'axis Why sentences use type-body, same as the lead above them',
  )
  assert.equal(
    /type-body-sm mb-0 theme-interview-result-review__axis-why/.test(beats),
    false,
    'negative: type-body-sm Why sat next to a type-body lead',
  )
  assert.match(
    beats,
    /type-body mb-0 theme-interview-flow-overview__beat-score/,
    'Work / Clarity score-why sentences use type-body',
  )
  assert.equal(
    /type-body-sm mb-0 theme-interview-flow-overview__beat-score/.test(beats),
    false,
    'negative: score-why must not drop to type-body-sm under the lead',
  )
  assert.match(
    overview,
    /type-body mb-0 theme-interview-flow-overview__beat-score/,
    'Overview score-why uses type-body',
  )
  assert.match(
    stage,
    /type-body mb-0 theme-interview-flow-overview__beat-score/,
    'Collapsed spine score-why uses type-body',
  )
  assert.match(
    talk,
    /theme-chat-part__text-body type-body whitespace-pre-line/,
    'Conversation mark summaries are type-body',
  )
  assert.equal(
    /theme-chat-part__text-body type-body-sm/.test(talk),
    false,
    'negative: mark summaries must not use type-body-sm beside type-body bubbles',
  )
  assert.match(
    talk,
    /type-body mb-0 theme-interview-landing__verify-mark-synth/,
    'expanded mark synthesis is type-body',
  )
  assert.equal(
    /type-caption mb-0 theme-interview-landing__verify-mark-synth/.test(talk),
    false,
    'negative: caption-size synthesis sat under a type-body summary',
  )
  const beatMd = bodyCss.slice(
    bodyCss.indexOf('.theme-interview-flow-overview__beat-md .theme-md-chat__p'),
    bodyCss.indexOf('.theme-interview-flow-overview__beat-tags'),
  )
  assert.match(
    beatMd,
    /font-size:\s*1rem/,
    'Overview / spine beat markdown paragraphs match type-body',
  )
  assert.equal(
    /font-size:\s*0\.875rem/.test(beatMd),
    false,
    'negative: chat-density 0.875rem beat MD sat under type-body intros',
  )
  const talkBody = bodyCss.slice(
    bodyCss.indexOf('theme-interview-talk-page.theme-interview-landing__verify-talk-page'),
  )
  assert.match(
    talkBody,
    /font-size:\s*1rem/,
    'Results Conversation bubbles match type-body',
  )
  assert.equal(
    /font-size:\s*1\.0625rem/.test(talkBody),
    false,
    'negative: live-Talk 1.0625rem must not leak into Results Conversation',
  )
}

console.log('resultSectionReview.unit: ok')
