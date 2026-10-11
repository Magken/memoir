/**
 * Mark beat projector — one home per sentence, artifact vs chat groups.
 * Run: npx tsx front_end/src/lib/interviewRunApi/markBeats.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  conversationGroups,
  markBeatFromCard,
  markBeatHeading,
  markBeatCardFixture,
  markGroupIdForTemplate,
  markGroupsForKind,
  markLaneForTemplate,
  repeatsPrior,
  synthesisBeat,
  workGroups,
} from './markBeats.ts'

const AXIS_WHY = 'The code is organized into logical sections with clear helpers.'
const LEAD = 'The implementation in src/solve.ts shows strong organization.'
const DETAIL_REPEAT = 'The implementation in src/solve.ts shows strong organization.'
const DETAIL_NEW = 'A later pass split parse from the accumulator so each helper has one job.'

{
  const card = markBeatCardFixture({
    id: 'grain:mark.code.structure.v1:tool.coding.x',
    title: 'Organization, naming, modularity',
    templateId: 'mark.code.structure.v1',
    boardSummary: LEAD,
    boardSummaryDetail: DETAIL_REPEAT,
    unit: 0.9,
    dimensions: [
      { key: 'organization', label: 'Organization', score: 'strong', notes: AXIS_WHY },
      { key: 'naming', label: 'Naming', score: 'strong', notes: 'Function names describe the work they do.' },
      { key: 'modularity', label: 'Modularity', score: 'mixed', notes: 'Parse and sum share one file.' },
    ],
  })
  const beat = markBeatFromCard(card)
  assert.equal(beat.lead, LEAD)
  assert.equal(beat.detail, undefined, 'detail that restates the lead is dropped')
  assert.equal(beat.axes.length, 3)
  assert.equal(beat.axes[0]?.reading, 'Strong')
  assert.equal(beat.axes[0]?.why, AXIS_WHY)
  assert.equal(beat.reading, 'Strong')
  const homes = [beat.lead, beat.detail ?? '', ...beat.axes.map((a) => a.why)]
  const seen = new Set()
  for (const text of homes) {
    if (!text) continue
    const key = text.trim().toLowerCase()
    assert.equal(seen.has(key), false, `sentence appears once: ${text}`)
    seen.add(key)
  }
}

{
  const card = markBeatCardFixture({
    id: 'grain:just',
    title: 'How they used Assist / Copilot',
    templateId: 'mark.assist.use.v1',
    justification: 'The candidate asked Assist to scaffold the helper and then pasted the result.',
    dimensions: [],
  })
  const beat = markBeatFromCard(card)
  assert.match(beat.lead, /asked Assist/)
  assert.equal(beat.axes.length, 0)
}

{
  const card = markBeatCardFixture({
    id: 'grain:slang',
    title: 'Delivery',
    templateId: 'iv.delivery.v1',
    unit: 0.2,
    dimensions: [{ key: 'clarity', label: 'Clarity', score: 'stall', notes: 'They trailed off twice.' }],
  })
  const beat = markBeatFromCard(card)
  assert.notEqual(beat.axes[0]?.reading.toLowerCase(), 'stall', 'slang reading is rejected')
  assert.equal(beat.axes[0]?.reading, 'Weak')
}

{
  const extra = markBeatCardFixture({
    id: 'grain:detail',
    title: 'Organization, naming, modularity',
    templateId: 'mark.code.structure.v1',
    boardSummary: LEAD,
    boardSummaryDetail: DETAIL_NEW,
  })
  const beat = markBeatFromCard(extra)
  assert.equal(beat.detail, DETAIL_NEW, 'new detail survives when there are no axis rows')
}

{
  const withAxes = markBeatCardFixture({
    id: 'grain:detail-axes',
    title: 'Organization, naming, modularity',
    templateId: 'mark.code.structure.v1',
    boardSummary: LEAD,
    boardSummaryDetail: DETAIL_NEW,
    dimensions: [{ key: 'organization', label: 'Organization', score: 'strong', notes: AXIS_WHY }],
  })
  assert.equal(
    markBeatFromCard(withAxes).detail,
    undefined,
    'detail that restates the finding is dropped when axes carry Why',
  )
}

{
  const noisy = markBeatCardFixture({
    id: 'grain:depth-noise',
    title: 'Approach, clarity, complexity',
    templateId: 'mark.code.method.v1',
    boardSummary: 'The solution handles empty input without extra machinery.',
    dimensions: [
      {
        key: 'approach',
        label: 'Approach',
        score: 'mixed',
        notes:
          'The candidate uses a stepwise parse. Shown in one separate moment. The cited evidence did not carry the claimed reading, so the mark was held down.',
      },
    ],
  })
  const beat = markBeatFromCard(noisy)
  assert.match(beat.axes[0]?.why ?? '', /stepwise parse/)
  assert.equal(/Shown in one separate moment/i.test(beat.axes[0]?.why ?? ''), false)
  assert.equal(/held down/i.test(beat.axes[0]?.why ?? ''), false)
}

assert.equal(repeatsPrior(DETAIL_REPEAT, [LEAD]), true)
assert.equal(repeatsPrior(DETAIL_NEW, [LEAD, AXIS_WHY]), false)
assert.equal(repeatsPrior('', [LEAD]), true, 'negative: empty detail is a repeat')

assert.equal(markLaneForTemplate('mark.code.tests.v1'), 'work')
assert.equal(markLaneForTemplate('mark.assist.use.v1'), 'conversation')
assert.equal(markLaneForTemplate('iv.delivery.v1'), 'conversation')
assert.equal(markLaneForTemplate('iv.content.v1'), 'conversation')
assert.equal(markGroupIdForTemplate('mark.code.tests.v1'), 'produced')
assert.equal(markGroupIdForTemplate('mark.code.approach.v1'), 'process')
assert.equal(markGroupIdForTemplate('mark.doc.authorship.v1'), 'process')
assert.equal(markGroupIdForTemplate('mark.assist.use.v1'), 'assist')

const mixed = [
  markBeatCardFixture({
    id: 't',
    title: 'Tests',
    templateId: 'mark.code.tests.v1',
  }),
  markBeatCardFixture({
    id: 'm',
    title: 'Method',
    templateId: 'mark.code.method.v1',
  }),
  markBeatCardFixture({
    id: 'a',
    title: 'Approach',
    templateId: 'mark.code.approach.v1',
  }),
  markBeatCardFixture({
    id: 'assist',
    title: 'Assist',
    templateId: 'mark.assist.use.v1',
  }),
  markBeatCardFixture({
    id: 'synth',
    title: 'Synth',
    templateId: 'synth.tool.v1',
    synthesisText: 'The stage asked for a working parse-and-sum.',
  }),
]

const codingGroups = markGroupsForKind('coding', mixed)
assert.deepEqual(
  codingGroups.map((g) => g.id),
  ['produced', 'process', 'assist'],
)
assert.equal(
  codingGroups.some((g) => g.cards.some((c) => c.templateId === 'synth.tool.v1')),
  false,
  'synth is not a mark group',
)
assert.equal(workGroups(mixed).every((g) => g.lane === 'work'), true)
assert.equal(
  workGroups(mixed).some((g) => g.cards.some((c) => c.templateId === 'mark.assist.use.v1')),
  false,
  'assist stays out of Work groups',
)
assert.equal(
  workGroups([
    ...mixed,
    markBeatCardFixture({
      id: 'package:notes',
      title: 'Assessor notes',
      justification: 'Display leftover - not an overall-score source.',
    }),
  ]).some((g) => g.cards.some((c) => c.id === 'package:notes')),
  false,
  'package leftover notes are not a Work beat',
)
assert.equal(conversationGroups(mixed).length, 1)
assert.equal(conversationGroups(mixed)[0]?.id, 'assist')
assert.equal(synthesisBeat(mixed), 'The stage asked for a working parse-and-sum.')
assert.equal(synthesisBeat(mixed.concat(mixed)), 'The stage asked for a working parse-and-sum.')

assert.equal(
  markBeatHeading('How they worked (exploration, iteration)', 'How they worked'),
  null,
)
assert.equal(
  markBeatHeading('How they wrote (exploration, iteration)', 'How they worked'),
  null,
)
assert.equal(
  markBeatHeading('Organization, naming, modularity', 'What they produced'),
  'Organization, naming, modularity',
)
assert.equal(
  markBeatHeading('Human agency vs dump/paste (coding)', 'How they worked'),
  'Human agency vs dump/paste',
)
assert.equal(
  markBeatHeading('How they worked', 'How they worked'),
  null,
  'negative: a restated family title is not a beat heading',
)

const talkCards = [
  markBeatCardFixture({
    id: 'd',
    title: 'Delivery',
    templateId: 'iv.delivery.v1',
  }),
  markBeatCardFixture({
    id: 'c',
    title: 'Substance',
    templateId: 'iv.content.v1',
  }),
  markBeatCardFixture({
    id: 'tests',
    title: 'Tests',
    templateId: 'mark.code.tests.v1',
  }),
]
const talkGroups = markGroupsForKind('talk', talkCards)
assert.deepEqual(talkGroups.map((g) => g.id), ['delivery', 'content'])
assert.equal(
  talkGroups.some((g) => g.cards.some((c) => c.templateId === 'mark.code.tests.v1')),
  false,
  'negative: Talk groups do not take Work rubrics',
)

console.log('markBeats.unit.mjs: ok')
