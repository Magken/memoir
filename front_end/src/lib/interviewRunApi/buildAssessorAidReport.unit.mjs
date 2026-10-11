/**
 * Assessor Aid report pack — the card, the reader's position, and report-question routing.
 * Regression guard: the Aid used to get one Verify modal and could not answer about the card.
 * Run: npx tsx front_end/src/lib/interviewRunApi/buildAssessorAidReport.unit.mjs
 */
import assert from 'node:assert/strict'
import { buildAssessorAidReport, describeAidLocus } from './buildAssessorAidReport.ts'
import {
  buildAssessorAidContext,
  inferAssessorAidSituation,
  formatAidPackDiag,
} from './buildAssessorAidContext.ts'

const overview = {
  overall: 0.68,
  summary: 'Capable engineer, stronger talking a system through than writing one.',
  tags: [],
  sittingSections: [
    { sectionId: 'p.talk', body: 'Discussion leftover body', brief: { intro: 'Talked ownership.' } },
  ],
  securityTitle: 'Security overview',
  securityParagraphs: ['Clean on identity.', 'Two integrity events.'],
  securityUnit: 0.74,
  securityChecks: [{ id: 'c1', check: 'Identity', reading: 'Held', note: 'no reconnect' }],
  securityCaptures: [],
  securityPoints: [],
  securityIncidents: [
    { id: 'i1', kind: 'paste', sectionId: 'p.code', t: 1200, preMs: 0, postMs: 0, pre: { body: 'They ran tests, then pasted, then edited.' } },
  ],
  securityFlags: [{ id: 'f1', signal: 'watch', label: 'Paste', why: 'matches submission' }],
  securityDiagrams: null,
  clarityTitle: 'Clarity overview',
  clarityParagraphs: ['Brief was thin on input format.'],
  clarityUnit: 0.62,
  clarityChecks: [],
  clarityFindings: [{ sectionId: 'p.code', body: 'Re-read for 4 minutes.', tags: [] }],
  clarityFlags: [],
  clarityPoints: [],
  clarityDiagrams: null,
  sessionSeries: null,
  softGrade: {
    overall: 0.68,
    byWeight: {
      interviewContent: {
        included: true,
        label: 'Content',
        summary: 'Content carries the mix because ownership was the only full story.',
        unit: 0.8,
        weight: 0.4,
      },
    },
  },
  resultStatus: 'marked',
  sittingThesis: {
    summary: 'A capable engineer who reasons out loud better than they write.',
    strengths: ['Named a concrete migration risk'],
    risks: ['Never revised the brute force'],
    followUps: ['Probe on tradeoffs'],
  },
}

const review = {
  sections: {
    'p.code': {
      stepId: 'p.code',
      kind: 'coding',
      title: 'Two-sum',
      summary: 'Brute force passed, never revised.',
      scoreWhy: 'Tests sit at 60% on the overall score.',
      tags: [{ signal: 'watch', label: '3/5', hint: 'Tests' }],
      radars: [
        {
          id: 'r1',
          label: 'Coding',
          face: 'work',
          axes: [
            { key: 'tests', label: 'Tests', unit: 0.6, score: 'mixed', notes: 'Both hidden cases failed.' },
            { key: 'method', label: 'Method', unit: 0.4 },
          ],
        },
        {
          id: 'r2',
          label: 'Assist',
          face: 'conversation',
          templateId: 'mark.assist.use.v1',
          axes: [{ key: 'asked_well', label: 'Asked well', unit: 0.8, notes: 'Named the helper.' }],
        },
      ],
      canChat: false,
      canEditor: true,
      attemptPhaseId: 'p.code',
    },
  },
  talk: {},
  coding: {},
  essay: {},
  form: {},
}

// --- the whole card is present, not just one section ------------------------------------
const report = buildAssessorAidReport({ overview, review, locus: { view: 'overview' } })
assert.equal(report.overallPercent, '68%', 'overall percent')
assert.equal(report.security.percent, '74%', 'security percent')
assert.equal(report.clarity.percent, '62%', 'clarity percent')
assert.equal(report.security.incidents.length, 1, 'security incident carried')
assert.equal(report.security.incidents[0].kind, 'paste', 'incident kind')
assert.equal(report.clarity.findings.length, 1, 'clarity finding carried')
assert.ok(report.thesis?.includes('reasons out loud'), 'thesis carried')
assert.deepEqual(report.strengths, ['Named a concrete migration risk'], 'strengths carried')
assert.equal(report.sections.length, 1, 'section carried')
assert.equal(report.sections[0].axes.length, 3, 'axes carried')
assert.equal(report.sections[0].axes[0].percent, '60%', 'axis percent')
assert.equal(report.sections[0].axes[0].notes, 'Both hidden cases failed.', 'axis notes carried')
assert.equal(report.sections[0].axes[0].face, 'work')
assert.equal(report.sections[0].axes[2].face, 'conversation')
assert.equal(report.sections[0].scoreWhy, 'Tests sit at 60% on the overall score.', 'scoreWhy carried')
assert.deepEqual(report.followUps, ['Probe on tradeoffs'], 'follow-ups carried')
assert.match(report.sections[0].summary, /Brute force passed/, 'section leftover not glance intro')
assert.ok(report.mix.some((line) => /Content carries the mix/.test(line)), 'mix why present')
assert.match(report.security.incidents[0].note ?? '', /pasted/, 'incident note is burst text')

// --- the reader's position marks exactly one section ------------------------------------
const reading = buildAssessorAidReport({
  overview,
  review,
  locus: { view: 'section', sectionId: 'p.code', sectionTitle: 'Two-sum', stage: 'editor' },
})
assert.equal(reading.sections[0].reading, true, 'open section flagged')
assert.equal(
  describeAidLocus(reading.locus),
  'section "Two-sum" with Work open',
  'locus reads as a sentence',
)
assert.equal(
  describeAidLocus({ view: 'overview' }),
  'the report Overview (no section expanded)',
  'overview locus',
)
assert.equal(report.sections[0].reading, undefined, 'overview locus flags no section')

// --- the context carries the card and the position --------------------------------------
const modal = {
  fixtureId: 'fx',
  sectionKey: 'interviewDelivery',
  sectionLabel: 'Discussion',
  title: 'Discussion',
  description: 'd',
  depthLabel: 'Conversation',
  cards: [],
}
const ctx = buildAssessorAidContext({ modal, report: reading })
assert.ok(ctx.report, 'context carries report')
assert.equal(ctx.readerPosition, 'section "Two-sum" with Work open', 'context carries position')
const bare = buildAssessorAidContext({ modal })
assert.equal(bare.report, undefined, 'no report key when none supplied')
assert.equal(bare.readerPosition, undefined, 'no position key when none supplied')
const focused = buildAssessorAidContext({
  modal,
  report: reading,
  focusCardId: 'card.own',
  focusMessageId: 'msg.1',
  focusPrompt: 'Tell me about Ownership',
})
assert.equal(focused.focusCardId, 'card.own', 'focus card reaches the pack')
assert.equal(focused.focusMessageId, 'msg.1', 'focus message reaches the pack')
assert.equal(focused.focusPrompt, 'Tell me about Ownership', 'focus prompt reaches the pack')

const sittingOnly = buildAssessorAidReport({
  overview: {
    ...overview,
    sittingSections: [
      {
        sectionId: 'p.talk',
        body: 'Discussion leftover body',
        brief: { intro: 'Talked ownership.', strengths: [], weaknesses: [], scoreWhy: 'SITTING_SCORE_WHY' },
      },
    ],
  },
  locus: { view: 'overview' },
})
assert.equal(sittingOnly.sections[0].scoreWhy, 'SITTING_SCORE_WHY', 'sitting fallback keeps scoreWhy')

// --- report questions route to the report register --------------------------------------
const routes = [
  ['Why is the security score low?', 'explain_security'],
  ['Did they paste anything?', 'explain_security'],
  ['What did the clarity section find?', 'explain_clarity'],
  ['Was the brief confusing?', 'explain_clarity'],
  ['What am I looking at?', 'explain_here'],
  ['Explain this section', 'explain_here'],
  ['Give me the overall verdict', 'explain_report'],
  ['Summarise the report', 'explain_report'],
  ['Should we hire them?', 'recommend'],
  ['What do you think, proceed?', 'recommend'],
  ['Recommend a follow-up', 'recommend'],
  ['Where did they say that?', 'locate_utterance'],
  ['Explain the delivery grain', 'explain_grain'],
  ['what is the score', 'explain_grain'],
  ['hi', 'clarify'],
]
for (const [text, want] of routes) {
  assert.equal(inferAssessorAidSituation(text), want, `route: ${text}`)
}
assert.notEqual(
  inferAssessorAidSituation('what is the score'),
  'explain_clarity',
  'negative: score words must not route to session Clarity',
)

{
  const packed = formatAidPackDiag({
    fixtureId: 'fx',
    sectionKey: 'p.code',
    sectionLabel: 'Parse and sum drill',
    title: 'Parse and sum drill',
    description: '',
    depthLabel: '',
    personaName: 'Assessor Aid',
    softBucket: null,
    messages: [{ id: 'msg.1', role: 'candidate', text: 'owned the freeze' }],
    cards: [],
    report: {
      overallPercent: '39%',
      thesis: 'Four stages, Eligibility first.',
      mix: [],
      followUps: [],
      declarations: [],
      security: { incidents: [], flags: [] },
      clarity: { percent: '', paragraphs: [] },
      sections: [{ id: 'ph.code', title: 'Parse and sum drill', kind: 'coding', summary: '', tags: [], axes: [], hasConversation: false, hasWork: true, reading: true }],
      locus: { view: 'section', sectionId: 'ph.code', sectionTitle: 'Parse and sum drill' },
    },
    readerPosition: 'section "Parse and sum drill" with Work open',
  })
  assert.ok(packed.some((l) => /overall: 39%/.test(l)), 'pack diag names overall from the results card')
  assert.ok(packed.some((l) => /\[open\]/.test(l)), 'pack diag marks the open section')
  assert.equal(
    packed.join('\n').includes('owned the freeze'),
    false,
    'negative: pack snapshot is titles and percents, not sitting speech',
  )
}

console.log('buildAssessorAidReport.unit: ok')
