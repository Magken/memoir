/**
 * Result overview Summary is one finding per spine section.
 * Run: npx tsx front_end/src/lib/interviewRunApi/fixtures/output-cards/outputCardFixture.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  buildOverviewScoreRows,
  buildResultOverview,
  collapsedMetaTags,
  SAMPLE_OUTPUT_CARDS,
  sittingResultHeadlinePending,
  sittingResultNeedsReview,
} from './outputCardFixture.ts'
import { sittingReadReport } from '../../sittingReadMarkup.ts'
import { mixWhyFromSoftGrade } from '../../resultHomes.ts'

const EM_DASH = /[—–]/
const MD_LINK = /\[[^\]]+\]\(#[^)]+\)/

const card = SAMPLE_OUTPUT_CARDS[0]
assert.ok(card)
const overview = buildResultOverview(card)

assert.equal(overview.overall, 0.82)
assert.equal(overview.summary, card.summary)
assert.ok(overview.tags.length >= 6)

assert.ok(overview.sittingSections.length >= 3 && overview.sittingSections.length <= 8)
assert.equal(overview.sittingSections[0].sectionId, 'ph.eligible')
assert.ok(overview.sittingSections.every((row) => row.sectionId.startsWith('ph.')))
assert.ok(overview.sittingSections.some((row) => row.sectionId === 'ph.code'))
assert.ok(!overview.sittingSections.some((row) => MD_LINK.test(row.body)))

const coded = overview.sittingSections.find((r) => r.sectionId === 'ph.code')
const tagged = sittingReadReport(coded)
assert.ok(tagged.tags.some((t) => t.signal === 'good' && /90%/.test(t.label) && t.hint === 'Tests'))
assert.ok(tagged.tags.some((t) => t.signal === 'watch' && /75%/.test(t.label) && t.hint === 'Method'))
assert.ok(!/\[\[tag:/.test(coded.body))

const gate = overview.sittingSections.find((r) => r.sectionId === 'ph.eligible')
assert.ok(sittingReadReport(gate).tags.some((t) => t.label === '14 / 16'))
assert.ok(!/\[\[tag:/.test(gate.body))
assert.match(gate.brief.intro, /pass or fail/i)
assert.match(gate.brief.scoreWhy, /eligibility screen|overall score/i)
assert.match(coded.brief.scoreWhy, /Tests sit/i)
assert.ok(coded.brief.strengths.length <= 3)
assert.ok(coded.brief.weaknesses.length <= 3)

const warmup = overview.sittingSections.find((r) => r.sectionId === 'ph.warmup')
assert.ok(sittingReadReport(warmup).tags.some((t) => /%/.test(t.label)))

const scoreRows = buildOverviewScoreRows(
  overview.sittingSections,
  [
    { id: 'ph.eligible', title: 'Eligibility', kind: 'form' },
    { id: 'ph.warmup', title: 'Opening', kind: 'talk' },
    { id: 'ph.conflict', title: 'Conflict', kind: 'talk' },
    { id: 'ph.code', title: 'Fibonacci coding challenge', kind: 'coding' },
    { id: 'ph.essay', title: 'Ship-or-wait product memo', kind: 'doc' },
    { id: 'ph.close', title: 'Closing', kind: 'talk' },
  ],
  { formGate: overview.formGate, softGrade: overview.softGrade },
)
assert.equal(scoreRows.length, overview.sittingSections.length)
assert.ok(scoreRows.every((row) => row.reading && row.reading !== '—'))
const codingRow = scoreRows.find((row) => row.id === 'ph.code')
assert.equal(codingRow?.measure, 'Coding')
assert.equal(codingRow?.reading, '90% · 75%')
assert.ok(!/\bmin\b/i.test(codingRow?.reading ?? ''))
assert.ok(!/copilot/i.test(scoreRows.map((row) => row.reading).join(' ')))
assert.ok(!scoreRows.some((row) => /eligibility gate|inside the limit|session integrity/i.test(row.measure)))
assert.equal(overview.softGrade.overall, 0.82)

assert.ok(overview.securityParagraphs.length >= 2)
assert.match(overview.securityParagraphs.join(' '), /82%/)
assert.match(overview.securityParagraphs.join(' '), /1\.2s/)
assert.ok(!/47 wpm/i.test(overview.securityParagraphs.join(' ')))
assert.match(overview.securityParagraphs.join(' '), /cursor/i)
assert.match(overview.securityParagraphs.join(' '), /cadence/i)
assert.match(overview.securityParagraphs.join(' '), /dictation/i)
assert.match(overview.securityParagraphs.join(' '), /paste/i)
assert.match(overview.securityParagraphs.join(' '), /cannot prove a VPN/i)
assert.match(overview.securityParagraphs.join(' '), /3 \/ 3/)
assert.equal(overview.securityUnit, 0.86)
assert.ok(overview.securityChecks.length >= 4)
assert.ok(overview.securityChecks.some((row) => row.id === 'cursor' && /%/.test(row.reading)))
assert.ok(overview.securityChecks.some((row) => row.id === 'typing' && /median gap/i.test(row.reading)))
assert.ok(!overview.securityChecks.some((row) => /wpm/i.test(`${row.check} ${row.reading}`)))
assert.ok(overview.securityChecks.some((row) => row.id === 'dictation' && /not observed/i.test(row.reading)))
assert.ok(overview.securityChecks.some((row) => row.id === 'vpn' && /reconnect/i.test(row.reading)))
assert.ok(overview.securityChecks.some((row) => row.id === 'recordings' && /\d+\s*\/\s*\d+/.test(row.reading)))
assert.ok(overview.securityCaptures.length >= 1)
assert.ok(overview.securityCaptures.every((row) => overview.sittingSections.some((s) => s.sectionId === row.sectionId)))
assert.ok(!overview.securityCaptures.some((row) => /talk|video|webcam|camera|face/i.test(row.capture)))
assert.ok(overview.securityCaptures.every((row) => /tape/i.test(row.capture)))
assert.ok(overview.securityCaptures.every((row) => row.note.trim().length > 0))
assert.ok(overview.clarityFindings.length >= 2)
assert.ok(overview.clarityFindings.every((row) => row.sectionId.startsWith('ph.') && row.body.trim()))
assert.ok(overview.clarityFindings.some((row) => (row.evidenceRefs ?? []).some((r) => r.kind === 'tape_action' || r.kind === 'message')))
assert.ok(overview.securityIncidents.length >= 1)
assert.equal(overview.securityIncidents[0].kind, 'paste')
assert.ok(overview.securityIncidents[0].pre?.body)
assert.ok(overview.securityIncidents[0].post?.body)
assert.ok(overview.sessionSeries)
assert.ok(overview.securityDiagrams)
assert.match(overview.securityDiagrams.location, /street map/)
assert.match(overview.securityDiagrams.pointer, /not a street map/)
assert.match(overview.securityDiagrams.incidents, /clock for Coding/)
assert.ok(!/On-stage trail|median gap clocks/i.test(Object.values(overview.securityDiagrams).join(' ')))
assert.ok(overview.clarityDiagrams)
assert.match(overview.clarityDiagrams.cadence, /typical pause/)
assert.match(overview.clarityDiagrams.pace, /idle versus typing/)
assert.ok(!/median gap clocks/i.test(`${overview.clarityDiagrams.cadence} ${overview.clarityDiagrams.pace}`))
assert.ok((overview.sessionSeries?.network?.pins?.length ?? 0) >= 1)
assert.ok((overview.sessionSeries?.pointerTrail?.length ?? 0) >= 2)
const seriesPhases = overview.sessionSeries?.byPhase
assert.ok(Array.isArray(seriesPhases) && seriesPhases.length >= 2)
assert.ok(
  new Set(seriesPhases.map((p) => p.dwell.visibleMs)).size >= 2,
  'byPhase dwell is per section, not sitting totals copied onto every phase',
)
assert.ok(overview.clarityChecks.length >= 3)
assert.ok(overview.clarityChecks.some((row) => /\d+\s*\/\s*\d+/.test(row.reading)))
assert.ok(overview.clarityChecks.some((row) => /%/.test(row.reading)))
assert.ok(overview.clarityChecks.every((row) => row.note.trim().length > 0))
assert.ok(!overview.clarityChecks.some((row) => /webcam|face|camera|adhd|diagnosis/i.test(`${row.check} ${row.note}`)))

const copy = [
  overview.summary,
  ...overview.sittingSections.map((r) => r.body),
  ...overview.securityParagraphs,
  ...overview.securityChecks.flatMap((row) => [row.check, row.reading, row.note]),
  ...overview.securityCaptures.flatMap((row) => [row.capture, row.note]),
  ...overview.clarityParagraphs,
  ...overview.clarityChecks.flatMap((row) => [row.check, row.reading, row.note]),
].join('\n')
assert.ok(!EM_DASH.test(copy))
assert.ok(!/lorem|placeholder/i.test(copy))
assert.ok(!/in frame|webcam|face stayed|off-camera|swapped person|talk video/i.test(copy))

{
  const thin = buildResultOverview({
    ...card,
    meta: {
      ...card.meta,
      clarityChecks: [
        { id: 'stages', check: 'Stage order', reading: '2 / 2' },
        { id: 'pace_split', check: 'Spoken vs typed', reading: 'mixed', note: 'Channels split.' },
      ],
      securityChecks: [{ id: 'cursor', check: 'On-stage dwell', reading: 'not observed' }],
    },
  })
  assert.equal(thin.clarityChecks.length, 2)
  assert.equal(thin.clarityChecks[0]?.note, '')
  assert.equal(thin.securityChecks.length, 1)
  assert.equal(thin.securityChecks[0]?.note, '')
}

// `needs_review` says part of the score is our marking defect, not the candidate's
// performance. It used to fall through every status branch and render as a clean gate.
{
  const reviewCard = { ...card, resultStatus: 'needs_review' }
  const reviewGate = collapsedMetaTags(reviewCard).find((t) => t.id === 'gate')
  assert.equal(reviewGate?.label, 'Needs review')
  assert.equal(reviewGate?.signal, 'bad')
  assert.equal(
    sittingResultHeadlinePending('needs_review'),
    false,
    'the overall is real arithmetic and must still be shown, just flagged',
  )
  assert.equal(sittingResultNeedsReview('needs_review'), true)

  // Negative: a complete sitting keeps the gate's own verdict and is never flagged.
  const cleanGate = collapsedMetaTags({ ...card, resultStatus: 'complete' }).find(
    (t) => t.id === 'gate',
  )
  assert.notEqual(cleanGate?.label, 'Needs review')
  assert.equal(sittingResultNeedsReview('complete'), false)
  assert.equal(sittingResultNeedsReview(undefined), false)
}

{
  const markingCard = { ...card, resultStatus: 'pending' }
  const gate = collapsedMetaTags(markingCard).find((t) => t.id === 'gate')
  assert.equal(gate?.label, 'Marking')
  assert.equal(gate?.signal, 'watch')
  const markingRows = buildOverviewScoreRows(
    [
      {
        sectionId: 'ph.code',
        body: 'Coding recorded.',
        tags: [{ signal: 'watch', label: 'Marking', hint: 'Marking' }],
      },
    ],
    [
      { id: 'ph.code', title: 'First coding', kind: 'coding' },
      { id: 'ph.code2', title: 'Second coding', kind: 'coding' },
    ],
    { formGate: overview.formGate, softGrade: overview.softGrade },
  )
  assert.equal(markingRows[0]?.reading, '—')
  const mixedRows = buildOverviewScoreRows(
    [
      {
        sectionId: 'ph.code',
        body: 'Coding recorded.',
        tags: [
          { signal: 'good', label: '82%', hint: 'Tests' },
          { signal: 'watch', label: 'Marking', hint: 'Marking' },
        ],
      },
    ],
    [{ id: 'ph.code', title: 'First coding', kind: 'coding' }],
    { formGate: overview.formGate, softGrade: overview.softGrade },
  )
  assert.equal(mixedRows[0]?.reading, '82%')
}

{
  const mix = mixWhyFromSoftGrade(overview.softGrade)
  const included = Object.entries(overview.softGrade?.byWeight ?? {}).filter(
    ([key, bucket]) => key !== 'formMark' && bucket?.included && String(bucket.summary ?? '').trim(),
  )
  assert.equal(mix.length, included.length)
  assert.ok(!mix.some((row) => row.bucket === 'formMark'))
}

console.log('outputCardFixture.unit: ok')
