/**
 * Smoke: composeWritingDocument scaffold + marking matrix preview helper.
 * Run: node front_end/src/lib/interviewBrief/writingDocCompose.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  applyWritingLengthTimeToMarkdown,
  buildWritingMarkingMatrixPreview,
  composeWritingDocument,
  candidateWritingSeedMarkdown,
  fillEmptyWritingAnswer,
  persistWritingDocument,
  stripWritingPageBreaks,
  stripWritingPageBreakLexical,
  formatWritingLengthTimeBody,
  normalizeRubricDimension,
  resolveDocAssessment,
  syncWritingDocumentLengthTime,
  WRITING_FORMAT_DIMENSION_KEY,
  WRITING_LENGTH_TIME_PLACEHOLDER,
} from './writingDocCompose.ts'

const dim = normalizeRubricDimension(
  {
    key: 'clarity',
    label: 'Clarity',
    criterion: 'Clear call',
    weight: 0.4,
    structureIds: ['s2'],
    bands: [
      { id: 'w', label: 'Weak', descriptor: 'Vague' },
      { id: 's', label: 'Strong', descriptor: 'Clear' },
    ],
  },
  0,
)
assert.equal(dim.weight, 0.4)
assert.deepEqual(dim.structureIds, ['s2'])

const assessment = {
  kind: 'rubric',
  dimensions: [
    {
      key: 'clarity',
      label: 'Clarity',
      criterion: 'Unambiguous recommendation call',
      weight: 0.35,
      structureIds: ['s2'],
      bands: [
        { id: 'l', label: '1 — Limited', descriptor: 'No call' },
        { id: 's', label: '4 — Strong', descriptor: 'Clear call' },
      ],
    },
    {
      key: 'evidence',
      label: 'Evidence',
      criterion: 'Metric and rejected path',
      weight: 0.65,
      structureIds: ['s1', 's3'],
      bands: [
        { id: 'l', label: '1 — Limited', descriptor: 'Opinion only' },
        { id: 's', label: '4 — Strong', descriptor: 'Metric + alt' },
      ],
    },
  ],
}

const structure = [
  { id: 's1', label: 'Context', hint: 'What changed', minParagraphs: 1 },
  { id: 's2', label: 'Recommendation', hint: 'Ship or wait' },
  { id: 's3', label: 'Risks', hint: 'Watch list' },
]

const doc = composeWritingDocument({
  title: 'Ship memo',
  brief:
    'Recommend whether to ship a beta this quarter. Defend the call with evidence a hiring manager can skim.',
  structure,
  requirements: ['Name a metric', 'Name a rejected alternative'],
  assessment,
})

const md = doc.markdown ?? ''
assert.match(md, /##\s*Prompt\b/i)
assert.match(md, /##\s*Outline\b/i)
assert.match(md, /##\s*Requirements\b/i)
assert.doesNotMatch(md, /##\s*Length\s*&\s*time\b/i, 'omit Length & time when limits unset')
assert.doesNotMatch(md, /Set word range and timer/)
assert.match(md, /##\s*Your answer\b/i)
assert.match(md, /###\s*Context/i, 'Your answer stamps outline headings as the sitting template')
assert.match(md, /###\s*Recommendation/i)
assert.equal(doc.pageSetup?.pageSize, 'pageless')
assert.doesNotMatch(md, /##\s*Marking matrix/i, 'matrix must not live in DocEditor markdown')
assert.doesNotMatch(md, /\|\s*Criterion\s*\|\s*Weight\s*\|\s*Covers/i)
assert.doesNotMatch(md, /Evidence map/i)

const timed = composeWritingDocument({
  title: 'Ship memo',
  brief: 'x',
  structure: [],
  requirements: [],
  assessment: { kind: 'rubric', dimensions: [] },
  minWords: 180,
  maxWords: 500,
  timed: true,
  limitMinutes: 12,
})
assert.match(timed.markdown ?? '', /##\s*Length\s*&\s*time\b/i)
assert.match(timed.markdown ?? '', /180–500/)
assert.match(timed.markdown ?? '', /12 minutes/)
assert.doesNotMatch(timed.markdown ?? '', /Set word range and timer/)

assert.match(
  formatWritingLengthTimeBody({ minWords: 100, timed: true, limitMinutes: 5 }) ?? '',
  /at least 100/,
)

const withPlaceholder = [
  '## Prompt',
  'Hello',
  '',
  '## Length & time',
  WRITING_LENGTH_TIME_PLACEHOLDER,
  '',
  '## Your answer',
  '',
].join('\n')
const syncedMd = applyWritingLengthTimeToMarkdown(withPlaceholder, {
  minWords: 200,
  maxWords: 400,
  timed: true,
  limitMinutes: 10,
})
assert.match(syncedMd, /200–400/)
assert.match(syncedMd, /10 minutes/)
assert.doesNotMatch(syncedMd, /Set word range and timer/)

const syncedDoc = syncWritingDocumentLengthTime(
  { title: 'T', markdown: withPlaceholder, lexical: null },
  { minWords: 120, timed: true, limitMinutes: 8 },
)
assert.match(syncedDoc.markdown ?? '', /120/)
assert.match(syncedDoc.markdown ?? '', /8 minutes/)

const rows = buildWritingMarkingMatrixPreview({ structure, assessment })
assert.equal(rows.length, 2)
assert.equal(rows[0].weight, '0.35')
assert.equal(rows[0].covers, 'Recommendation')
assert.match(rows[1].covers, /Context/)
assert.match(rows[1].covers, /Risks/)
assert.equal(rows[0].bands[1].descriptor, 'Clear call')
assert.equal(rows[0].bands.length, 2)
assert.ok(!rows[0].bands.some((b) => `${b.label}: ${b.descriptor}`.includes(' · ')))

const preserved = composeWritingDocument({
  title: 'Ship memo',
  brief: 'x',
  structure: [],
  requirements: [],
  assessment: { kind: 'rubric', dimensions: [] },
  existing: {
    title: 'Existing',
    markdown: 'A'.repeat(80),
    lexical: null,
  },
})
assert.equal(preserved.markdown, 'A'.repeat(80), 'does not overwrite rich existing markdown body')

{
  const broken = fillEmptyWritingAnswer(
    '## Prompt\nDo the task.\n\n:::doc-page-break\n\n## Your answer\n\n',
    structure,
  )
  assert.doesNotMatch(broken, /:::doc-page-break/)
  assert.match(broken, /###\s*Context/)
  const seed = candidateWritingSeedMarkdown(broken, structure)
  assert.match(seed, /###\s*Context/)
  assert.doesNotMatch(seed, /##\s*Prompt/)
  assert.equal(stripWritingPageBreaks('Hello\n:::doc-page-break\nWorld'), 'Hello\n\nWorld')
}

{
  const lexical = {
    root: {
      type: 'root',
      children: [
        { type: 'heading', tag: 'h2', children: [{ type: 'text', text: 'Prompt' }] },
        { type: 'paragraph', children: [{ type: 'text', text: 'Keep this essay.' }] },
        { type: 'page-break', version: 1 },
      ],
    },
  }
  const poisoned = Array.from({ length: 12 }, () => ':::doc-page-break').join('\n\n')
  const kept = composeWritingDocument({
    title: 'Ship memo',
    brief: 'x',
    structure,
    requirements: [],
    assessment: { kind: 'rubric', dimensions: [] },
    existing: { title: 'Existing', markdown: poisoned, lexical },
  })
  assert.ok(kept.lexical, 'poisoned markdown sidecar must not discard live lexical')
  assert.doesNotMatch(JSON.stringify(kept.lexical), /"type":"page-break"/)
  assert.match(JSON.stringify(kept.lexical), /Keep this essay/)
  assert.equal(kept.pageSetup?.pageSize, 'pageless')

  const persisted = persistWritingDocument({
    title: 'T',
    markdown: `${poisoned}\n## Prompt\n`,
    lexical,
    pageSetup: { pageSize: 'A4', orientation: 'portrait', marginInches: 0.4 },
  })
  assert.equal(persisted.pageSetup.pageSize, 'pageless')
  assert.doesNotMatch(persisted.markdown ?? '', /:::doc-page-break/)
  const stripped = stripWritingPageBreakLexical(lexical)
  const root = stripped && typeof stripped === 'object' ? stripped.root : null
  const kids = root && typeof root === 'object' ? root.children : []
  assert.equal(Array.isArray(kids) && kids.some((n) => n && n.type === 'page-break'), false)
}

{
  const markdown = [
    'Hello',
    ':::doc-gif url=https://example.com/a.gif alt=demo',
    ':::doc-video title="Drill"',
    ':::doc-youtube id=dQw4w9WgXcQ title="Explainer"',
    '![Architecture](https://example.com/slo.png)',
    'Keep this sentence and a [link](https://example.com/slo).',
    '',
  ].join('\n')
  const lexical = {
    root: {
      type: 'root',
      children: [
        { type: 'paragraph', children: [{ type: 'text', text: 'Keep this essay.' }] },
        { type: 'doc-image', mediaKind: 'image', src: 'https://example.com/slo.png', altText: 'Architecture' },
        { type: 'doc-image', mediaKind: 'gif', src: 'https://example.com/a.gif', altText: 'demo' },
        { type: 'video-embed', videoId: 'dQw4w9WgXcQ', title: 'Explainer' },
        { type: 'video-embed', videoId: '', title: 'Drill' },
        { type: 'page-break', version: 1 },
      ],
    },
  }
  const persisted = persistWritingDocument({
    title: 'T',
    markdown,
    lexical,
    pageSetup: { pageSize: 'A4', orientation: 'portrait', marginInches: 0.4 },
  })
  assert.doesNotMatch(persisted.markdown ?? '', /:::doc-gif/)
  assert.doesNotMatch(persisted.markdown ?? '', /:::doc-video/)
  assert.doesNotMatch(persisted.markdown ?? '', /:::doc-youtube/)
  assert.doesNotMatch(persisted.markdown ?? '', /!\[Architecture\]/)
  assert.match(persisted.markdown ?? '', /\[link\]\(https:\/\/example\.com\/slo\)/)
  assert.match(persisted.markdown ?? '', /Keep this sentence/)
  const tree = JSON.stringify(persisted.lexical)
  assert.doesNotMatch(tree, /"type":"doc-image"/)
  assert.doesNotMatch(tree, /"type":"video-embed"/)
  assert.doesNotMatch(tree, /"type":"page-break"/)
  assert.match(tree, /Keep this essay/)
}

// ── resolveDocAssessment: the one matrix both grading and results read ──────────
{
  // Rubric with authored rows keeps them — weight, scope, gloss and depth intact.
  const authored = resolveDocAssessment({
    assessment: {
      kind: 'rubric',
      dimensions: [
        {
          key: 'argument',
          label: 'Argument quality',
          criterion: 'Is the claim defended?',
          weight: 0.7,
          structureIds: ['s1'],
          bands: [
            { id: 'b1', label: '1 - Thin', descriptor: 'Assertion only.' },
            { id: 'b2', label: '2 - Strong', descriptor: 'Defended.' },
          ],
        },
      ],
    },
  })
  assert.equal(authored.kind, 'rubric')
  assert.equal(authored.dimensions.length, 1)
  assert.equal(authored.dimensions[0].key, 'argument')
  assert.equal(authored.dimensions[0].weight, 0.7, 'authored weight survives')
  assert.deepEqual(authored.dimensions[0].structureIds, ['s1'], 'authored scope survives')
  assert.equal(authored.dimensions[0].criterion, 'Is the claim defended?')
  assert.equal(authored.dimensions[0].bands.length, 2, 'authored depth survives')

  // An un-authored rubric still has something to grade.
  const bare = resolveDocAssessment({ assessment: { kind: 'rubric' } })
  assert.equal(bare.kind, 'rubric')
  assert.ok(bare.dimensions.length >= 1)

  // Format: the author only ever writes notes, so those notes ARE the criterion.
  const fmt = resolveDocAssessment({
    assessment: {
      kind: 'format',
      formatNotes: 'Decision heading, Risks heading, under one page.',
    },
  })
  assert.equal(fmt.kind, 'format')
  assert.equal(fmt.dimensions.length, 1)
  assert.equal(fmt.dimensions[0].key, WRITING_FORMAT_DIMENSION_KEY)
  assert.equal(
    fmt.dimensions[0].criterion,
    'Decision heading, Risks heading, under one page.',
    'the format notes reach the marker as the axis gloss',
  )
  assert.equal(fmt.formatNotes, 'Decision heading, Risks heading, under one page.')
  assert.ok(fmt.dimensions[0].bands.length >= 2, 'format has a real band ladder')
  assert.ok(
    fmt.dimensions[0].bands.every((b) => b.descriptor.trim()),
    'every format band tells the marker what that level looks like',
  )
  // Negative: a format section must not be graded on the rubric preset. Marking format
  // compliance against "develops a position" is not what the author asked for.
  assert.notEqual(fmt.dimensions[0].key, 'task_response')
  assert.ok(
    !/develops a position/i.test(JSON.stringify(fmt.dimensions)),
    'format does not borrow the essay-quality band descriptors',
  )
  // No notes still grades, on the generic compliance gloss.
  const fmtBare = resolveDocAssessment({ assessment: { kind: 'format' } })
  assert.equal(fmtBare.dimensions[0].key, WRITING_FORMAT_DIMENSION_KEY)
  assert.ok(fmtBare.dimensions[0].criterion.trim().length > 0)
  // Respect authored rows if a bot or an earlier Rubric pass left some on a format tool.
  const fmtAuthored = resolveDocAssessment({
    assessment: {
      kind: 'format',
      formatNotes: 'notes',
      dimensions: [{ key: 'headings', label: 'Headings', bands: [{ id: 'a', label: 'ok' }] }],
    },
  })
  assert.equal(fmtAuthored.dimensions[0].key, 'headings')

  // Leftover bot tags that mean the Format picker, not the rubric matrix.
  const leftoverFormat = resolveDocAssessment({
    assessment: { kind: 'structure', formatNotes: 'Decision heading then Risks.' },
  })
  assert.equal(leftoverFormat.kind, 'format', 'structure is the format checklist leftover')
  assert.equal(leftoverFormat.dimensions[0].key, WRITING_FORMAT_DIMENSION_KEY)
  const leftoverChecklist = resolveDocAssessment({ assessment: { kind: 'checklist' } })
  assert.equal(leftoverChecklist.kind, 'format')
  // Negative: IELTS / criteria / matrix leftovers stay on the rubric matrix.
  const leftoverIelts = resolveDocAssessment({ assessment: { kind: 'ielts' } })
  assert.equal(leftoverIelts.kind, 'rubric')
  assert.notEqual(leftoverIelts.dimensions[0].key, WRITING_FORMAT_DIMENSION_KEY)
}

console.log('ok — writingDocCompose scaffold + matrix preview')
