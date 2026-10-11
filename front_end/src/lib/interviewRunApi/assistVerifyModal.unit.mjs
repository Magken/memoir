/**
 * Assist Conversation modal — per-turn utterance cards + leave rollup.
 * Run: npx tsx front_end/src/lib/interviewRunApi/assistVerifyModal.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ASSIST_TURN_TEMPLATE_ID } from './assistTurnMarks.ts'
import { buildAssistVerifyModal } from './assistVerifyModal.ts'
import { cardsFromToolHost } from './toolVerifyShared.ts'

const brief = {
  schemaVersion: 1,
  kind: 'interview_brief',
  definition: {},
  topicLibrary: [],
  phases: [
    { id: 'ph.code', kind: 'coding', toolRef: 'tool.coding.x', title: 'Coding' },
  ],
  tools: {
    'tool.coding.x': { id: 'tool.coding.x' },
  },
}

function grain(status, extra = {}) {
  return {
    templateId: ASSIST_TURN_TEMPLATE_ID,
    hostRef: 'tool.coding.x',
    grain: 'after_turn',
    order: 1,
    status,
    result: null,
    dimensions: [
      { key: 'asked_well', label: 'Asked well', score: status === 'filled' ? 'weak' : '' },
      { key: 'over_reliance', label: 'Over-reliance', score: status === 'filled' ? 'strong' : '' },
      { key: 'applied_judgment', label: 'Applied judgment', score: status === 'filled' ? 'weak' : '' },
      { key: 'integrity', label: 'Integrity', score: status === 'filled' ? 'mixed' : '' },
    ],
    justification: status === 'filled' ? 'They asked Assist to scaffold the helper.' : '',
    ...extra,
  }
}

const scored = {
  contributions: [],
  artifacts: {},
  softGrade: { byWeight: {} },
}

{
  const response = {
    messages: [
      { id: 'assist-c-1', phaseId: 'ph.code', role: 'candidate', kind: 'assist', text: 'Please create helper.ts', at: 't1' },
      { id: 'assist-a-1', phaseId: 'ph.code', role: 'assistant', kind: 'assist', text: 'Created helper.ts', at: 't2' },
      { id: 'assist-c-2', phaseId: 'ph.code', role: 'candidate', kind: 'assist', text: 'Add the tests', at: 't3' },
    ],
    analysis: {
      tools: {
        'tool.coding.x': {
          [ASSIST_TURN_TEMPLATE_ID]: grain('filled', { grain: 'after_tool', justification: 'Stage rollup.' }),
          'mark.code.tests.v1': {
            templateId: 'mark.code.tests.v1',
            hostRef: 'tool.coding.x',
            grain: 'after_tool',
            order: 1,
            status: 'filled',
            result: null,
            dimensions: [],
            justification: 'All tests passed.',
          },
        },
      },
      turns: {
        'assist-c-1': { [ASSIST_TURN_TEMPLATE_ID]: grain('filled') },
        'assist-c-2': { [ASSIST_TURN_TEMPLATE_ID]: grain('filled', { justification: 'They asked for tests.' }) },
      },
    },
  }
  const modal = buildAssistVerifyModal({
    fixtureId: 'fix',
    sectionLabel: 'Coding',
    response,
    scored,
    brief,
    phaseId: 'ph.code',
    hostRef: 'tool.coding.x',
  })
  const utterances = modal.cards.filter((c) => c.kind === 'utterance')
  const rollup = modal.cards.filter((c) => c.kind === 'general')
  assert.equal(utterances.length, 2, 'N scored candidate turns → N utterance cards')
  assert.equal(rollup.length, 1, 'stage rollup is pinned')
  assert.equal(modal.cards[0]?.kind, 'utterance', 'per-turn marks come first')
  assert.equal(modal.cards.at(-1)?.kind, 'general', 'Package rollup is last')
  assert.equal(
    modal.cards[0]?.kind === 'general',
    false,
    'negative: overall Package must not lead the rail',
  )
  assert.equal(utterances[0]?.anchorMessageId, 'assist-c-1')
  assert.equal(utterances[1]?.anchorMessageId, 'assist-c-2')
  assert.equal(utterances.every((c) => c.scored === true), true)
  assert.ok(modal.messages.some((m) => m.id === 'assist-c-1'))

  const work = cardsFromToolHost(response, 'tool.coding.x')
  assert.equal(
    work.some((c) => c.templateId === ASSIST_TURN_TEMPLATE_ID),
    false,
    'Work host cards skip assist',
  )
  assert.ok(work.some((c) => c.templateId === 'mark.code.tests.v1'))
}

{
  const response = {
    messages: [
      { id: 'assist-c-1', phaseId: 'ph.code', role: 'candidate', kind: 'assist', text: 'Help', at: 't1' },
      { id: 'assist-c-2', phaseId: 'ph.code', role: 'candidate', kind: 'assist', text: 'Again', at: 't2' },
    ],
    analysis: {
      tools: {},
      turns: {
        'assist-c-1': { [ASSIST_TURN_TEMPLATE_ID]: grain('pending') },
        'assist-c-2': { [ASSIST_TURN_TEMPLATE_ID]: grain('pending') },
      },
    },
  }
  const modal = buildAssistVerifyModal({
    fixtureId: 'fix',
    sectionLabel: 'Coding',
    response,
    scored,
    brief,
    phaseId: 'ph.code',
    hostRef: 'tool.coding.x',
  })
  const utterances = modal.cards.filter((c) => c.kind === 'utterance')
  assert.equal(utterances.length, 2, 'pending turns still get location cards')
  assert.equal(
    utterances.every((c) => c.scored === false),
    true,
    'negative: pending turns are not fabricated scores',
  )
  assert.equal(
    utterances.some((c) => c.dimensions.some((d) => d.score === 'strong' || d.score === 'weak')),
    false,
    'negative: pending dimensions stay empty',
  )
}

{
  const here = dirname(fileURLToPath(import.meta.url))
  const strip = readFileSync(join(here, '../../components/InterviewVerifyMarkStrip.tsx'), 'utf8')
  assert.equal(
    /AssistTranscriptRail/.test(strip),
    false,
    'Work strip no longer mounts the Conversation assist rail',
  )
  assert.equal(
    /boardSummary \|\| card.justification/.test(strip),
    false,
    'Work strip does not dump boardSummary as a bare paragraph',
  )
  const talk = readFileSync(join(here, '../../components/InterviewTalkVerifyPanel.tsx'), 'utf8')
  assert.ok(/verify-mark-card/.test(talk), 'Talk marks are board bubbles, not Clarity beat rows')
  assert.ok(/theme-chat-part__text-body/.test(talk), 'collapsed mark summary lives in the bubble')
  assert.equal(
    /InterviewMarkBeatRow/.test(talk),
    false,
    'negative: Talk / Conversation must not render InterviewMarkBeatRow',
  )
  assert.equal(
    /InterviewVerifyContributionList/.test(talk),
    false,
    'negative: How each mark counts is not on Talk / Conversation',
  )
  assert.equal(
    /CascadeMenuButton/.test(talk),
    false,
    'negative: Copy / Download JSON is not on Talk / Conversation',
  )
  assert.equal(
    /copy_analysis_json/.test(talk),
    false,
    'negative: analysis JSON menu ids are gone',
  )
  assert.equal(
    /towardOverall/.test(talk) && /% of the attempt/.test(talk),
    false,
    'negative: expanded detail does not reprint grain % of the attempt',
  )
  assert.match(
    talk,
    /personaName\.trim\(\)\.toLowerCase\(\) === 'assist'/,
    'Assist Conversation is detected from personaName',
  )
  assert.match(
    talk,
    /data-talk-flush-assistant=\{isAssistChat \? undefined : 'true'\}/,
    'Assist keeps board bubbles; Talk still flushes assistant rows',
  )
  assert.match(
    talk,
    /InterviewVerifyQuestionOverview/,
    'Talk / Conversation lead uses the collapsed overview fold',
  )
  assert.match(
    talk,
    /type-h3 type-serif-italic/,
    'Talk / Conversation title matches the Work heading',
  )
  assert.match(
    talk,
    /if \(generalCards.length\) \{\s*\/\/[^\n]*\s*pairs\.push\(/,
    'Package / general pair is appended after utterance stretches',
  )
  assert.equal(
    /pairs\.unshift\(\{\s*id: 'general'/.test(talk),
    false,
    'negative: Package pair must not unshift to the top of the rail',
  )
  assert.match(talk, /DocArticleDivider/, 'Rollup is split from prior conversation by a hairline')
  assert.match(
    talk,
    /isRollup \? \([\s\S]*Rollup/,
    'Rollup title only mounts on the general pair',
  )
  assert.match(
    talk,
    /InterviewVerifyQuestionOverview[\s\S]*verify-focus-rule[\s\S]*DocArticleDivider[\s\S]*Back to conversation/,
    'a hairline sits between Overview of the section and Back to conversation',
  )
  {
    const between = talk.slice(
      talk.indexOf('InterviewVerifyQuestionOverview'),
      talk.indexOf('Back to conversation'),
    )
    assert.equal(
      /DocArticleDivider/.test(between),
      true,
      'the lead hairline is between overview and Back to conversation',
    )
    assert.equal(
      /verify-focus-bar/.test(between) && !/DocArticleDivider/.test(between),
      false,
      'negative: Back to conversation must not follow overview with no divider',
    )
  }
  assert.match(
    talk,
    /data-focus=\{expandedCardId \? 'true'/,
    'expanded lead drops the section hairline under Back to conversation',
  )
  {
    const css = readFileSync(
      join(here, '../../css/effects/interview-landing.css'),
      'utf8',
    )
    assert.match(
      css,
      /verify-lead\[data-focus='true'\][\s\S]{0,80}border-bottom:\s*0/,
      'focused lead has no hairline under Back to conversation',
    )
    assert.equal(
      /verify-lead\[data-focus='true'\][\s\S]{0,80}border-bottom:\s*var\(--theme-divider-line\)/.test(
        css,
      ),
      false,
      'negative: focused lead must not keep the section hairline',
    )
  }
  assert.match(talk, /function MarkSeeToggle/, 'See more / See less is Verify housing, not a caption')
  assert.equal(
    /function CollapseToggle/.test(talk),
    false,
    'negative: analysis See more is not the tiny chat caption toggle',
  )
  const expanded = talk.slice(talk.indexOf('function MarkingExpandedDetail'))
  assert.equal(
    /towardOverall/.test(expanded),
    false,
    'negative: expanded mark detail does not mention towardOverall',
  )
  assert.equal(
    /% of the attempt/.test(expanded),
    false,
    'negative: expanded mark detail does not print % of the attempt',
  )
  const review = readFileSync(join(here, './resultSectionReview.ts'), 'utf8')
  assert.ok(
    /buildAssistVerifyModal/.test(review),
    'Conversation for tool stages routes through assistVerifyModal',
  )
}

console.log('assistVerifyModal.unit.mjs: ok')
