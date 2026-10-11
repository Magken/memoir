/**
 * Sitting-read markup: parse chips and lift them off the finding body.
 * Run: npx tsx front_end/src/lib/interviewRunApi/sittingReadMarkup.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  isSittingReadScoreLabel,
  parseSittingReadBody,
  sittingReadReport,
  sittingReadScoreReading,
  sittingReadFindingMarkdown,
  normalizeSittingRead,
} from './sittingReadMarkup.ts'
import { sittingReadChipHint, completeRatioSignal } from './outputMetaTagIcon.ts'

const coded =
  'Both drills finished inside the window. [[tag:good|20 min]] [[tag:good|90%]] [[tag:watch|75%]]'
const report = sittingReadReport(coded)
assert.equal(report.prose, 'Both drills finished inside the window.')
assert.equal(report.tags.length, 3)
assert.equal(report.tags[0].label, '20 min')
assert.equal(report.tags[2].signal, 'watch')

const mid = 'Ownership landed in the [[tag:good|80%]] band.'
assert.equal(sittingReadReport(mid).prose, 'Ownership landed in the band.')
assert.equal(sittingReadReport(mid).tags[0].label, '80%')

const pieces = parseSittingReadBody(coded)
assert.ok(pieces.some((p) => p.kind === 'tag' && p.label === '90%'))
assert.ok(pieces.some((p) => p.kind === 'text'))

const explicit = sittingReadReport({
  sectionId: 'ph.code',
  body: 'Both drills finished inside the window.',
  tags: [
    { signal: 'good', label: '20 min', hint: 'Time' },
    { signal: 'watch', label: '75%', hint: 'Method' },
  ],
})
assert.equal(explicit.prose, 'Both drills finished inside the window.')
assert.equal(explicit.tags[1].label, '75%')
assert.equal(explicit.tags[1].hint, 'Method')

assert.equal(sittingReadScoreReading(explicit.tags), '75%')
assert.equal(isSittingReadScoreLabel('20 min'), false)
assert.equal(isSittingReadScoreLabel('90%'), true)
assert.equal(
  isSittingReadScoreLabel('Copilot 40% / human 60%', 'Session mix'),
  false,
)
assert.equal(
  sittingReadScoreReading([
    { signal: 'good', label: '90%', hint: 'Tests' },
    { signal: 'watch', label: 'Copilot 40% / human 60%', hint: 'Session mix' },
  ]),
  '90%',
)

const codingTags = [
  { label: '20 min' },
  { label: '90%' },
  { label: '75%' },
]
assert.equal(
  sittingReadChipHint('90%', { kind: 'coding', tags: codingTags, index: 1 }),
  'Hidden tests',
)
assert.equal(
  sittingReadChipHint('75%', { kind: 'coding', tags: codingTags, index: 2 }),
  'Approach mark',
)
assert.equal(
  sittingReadChipHint('20 min', { kind: 'coding', tags: codingTags, index: 0 }),
  'Time',
)
assert.equal(
  sittingReadChipHint('90%', {
    hint: 'Tests',
    kind: 'coding',
    tags: codingTags,
    index: 1,
  }),
  'Tests',
)

assert.equal(
  sittingReadChipHint('47 wpm', { tags: [], index: 0 }),
  'Typing',
)

const markdownBody = `### How they speak

Clear and paced.

- **Clarity:** Named the freeze in one sentence.

> I froze the API`
const markdownReport = sittingReadReport({
  sectionId: 'ph.talk',
  body: markdownBody,
  tags: [{ signal: 'good', label: '88%', hint: 'Delivery' }],
})
assert.match(markdownReport.prose, /### How they speak/)
assert.match(markdownReport.prose, /- \*\*Clarity:\*\*/)
assert.match(markdownReport.prose, /> I froze the API/)
assert.ok(markdownReport.prose.includes('\n'))

const nested = normalizeSittingRead([
  {
    sectionId: 'ph.code',
    body: '### Tests\n\nBoth drills finished.',
    intro: 'Coding expects working solutions against the hidden and visible suite.',
    strengths: ['Both drills finished.'],
    weaknesses: ['Method trails the suite.'],
    scoreWhy: 'Tests sit at 90% on the overall score; method trails at 75%.',
    tags: [{ signal: 'good', label: '90%', hint: 'Tests' }],
  },
])
assert.equal(nested[0].brief.intro.startsWith('Coding expects'), true)
assert.equal(nested[0].brief.strengths.length, 1)
assert.equal(nested[0].brief.weaknesses.length, 1)
assert.match(nested[0].body, /### Tests/)

{
  const md = sittingReadFindingMarkdown({
    intro: 'Coding is a coding stage that expects working solutions against the hidden and visible suite.',
    strengths: ['They finished both drills inside the window.'],
    weaknesses: ['Method trails the suite.'],
    scoreWhy: 'Tests sit at 90%.',
  })
  assert.match(md, /Coding is a coding stage/)
  assert.match(md, /\*\*Strength:\*\*/)
  assert.match(md, /\*\*Weakness:\*\*/)
  assert.ok(!/### Tests/.test(md), 'negative: leftover headings are not the finding')
  assert.equal(sittingReadFindingMarkdown(undefined, '### Tests\n\nDump.'), '### Tests')
}

assert.equal(completeRatioSignal('5 / 5'), 'good')
assert.equal(completeRatioSignal('5 / 5 sections'), 'good')
assert.equal(completeRatioSignal('5 / 5 · 100%'), 'good')
assert.equal(completeRatioSignal('0 / 5'), 'bad')
assert.equal(completeRatioSignal('3 / 5'), 'watch')
assert.equal(completeRatioSignal('5 / 5 min'), null)

console.log('sittingReadMarkup.unit: ok')
