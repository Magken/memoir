/**
 * Assessor Aid first bubble is generated from the pack, not a chrome tour.
 * Run: npx tsx front_end/src/lib/interviewRunApi/runAssessorAidOpen.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  aidReportIsReady,
  composeAssessorAidOpenerUtterance,
} from './composeAssessorAidOpenerUtterance.ts'
import { runAssessorAidOpen, waitForAidReport, aidUtteranceIsTranscriptEcho, peelForAidCompose } from './runAssessorAidOpen.ts'
import {
  aidConversationNeedsOpen,
  isCannedAidOpener,
  loadAssessorAidConversation,
} from './assessorAidConversationFixture.ts'

const TOUR = /\b(Happy to (help|walk)|Want me to|marking rail|sticky|overlay|which grain)\b/i
const STUB = /This pack is in front of you|This pack is the/
const EM_DASH = /[\u2014\u2013]/

const report = {
  overallPercent: '68%',
  thesis: 'Stronger talking a system through than writing one.',
  summary: 'Capable engineer.',
  strengths: ['Named a concrete migration risk'],
  risks: ['Never revised the brute force'],
  followUps: ['Probe on tradeoffs'],
  declarations: [],
  security: { title: '', percent: '', paragraphs: [], checks: [], incidents: [], flags: [], points: [] },
  clarity: { title: '', percent: '', paragraphs: [], checks: [], findings: [], flags: [], points: [] },
  sections: [
    {
      id: 'p.code',
      title: 'Two-sum',
      kind: 'coding',
      summary: 'Brute force passed.',
      tags: [],
      axes: [],
      hasConversation: false,
      hasWork: true,
      reading: true,
    },
  ],
  mix: [],
  locus: { view: 'section', sectionId: 'p.code', sectionTitle: 'Two-sum', stage: 'editor' },
}

assert.equal(aidReportIsReady(null), false, 'negative: missing report is not ready')
assert.equal(aidReportIsReady(report), true)

const packed = composeAssessorAidOpenerUtterance({ report })
assert.match(packed, /I'm Assessor Aid/)
assert.match(packed, /68%/)
assert.match(packed, /Stronger talking/)
assert.match(packed, /Named a concrete migration risk/)
assert.match(packed, /Never revised/)
assert.match(packed, /Probe on tradeoffs/)
assert.equal(TOUR.test(packed), false, `fallback opener must not tour chrome, got ${packed}`)
assert.equal(STUB.test(packed), false, `fallback opener must not be the greeter stub, got ${packed}`)
assert.equal(EM_DASH.test(packed), false, 'fallback opener uses ASCII hyphen')

const bare = composeAssessorAidOpenerUtterance({})
assert.equal(bare, '', 'negative: empty pack must not invent a greeter')
assert.equal(STUB.test(bare), false)

assert.equal(
  isCannedAidOpener(
    'Happy to walk this interview with you. The sections are in the overlay — which one should we open?',
  ),
  true,
  'old Results greeting is canned',
)
assert.equal(
  isCannedAidOpener(
    'Happy to walk Soft Decision markings with you. The transcript is on the left and the marking rail on the right - which grain or utterance should we open?',
  ),
  true,
  'old Talk greeting is canned',
)
assert.equal(
  isCannedAidOpener(
    'This pack is in front of you. Ask about a section, a mark, Security, or whether to proceed.',
  ),
  true,
  'empty-pack greeter is canned',
)
assert.equal(
  isCannedAidOpener(
    'Hello, I was initially confused so I asked the copilot for some help. To elaborate more and give me, you know, additional test case scenarios',
  ),
  true,
  'Copilot first-person sitting line stored as Aid opener is canned',
)
assert.equal(isCannedAidOpener(packed), false, 'negative: pack opener is not canned')
assert.equal(aidConversationNeedsOpen([]), true)
assert.equal(
  aidConversationNeedsOpen([
    { id: 'a', role: 'assistant', text: 'Happy to walk this interview with you. The sections are in the overlay — which one should we open?' },
  ]),
  true,
  'canned-only thread must regenerate',
)
assert.equal(
  aidConversationNeedsOpen([
    {
      id: 'a',
      role: 'assistant',
      text: 'This pack is in front of you. Ask about a section, a mark, Security, or whether to proceed.',
    },
  ]),
  true,
  'stub opener must regenerate',
)
assert.equal(
  aidConversationNeedsOpen([
    {
      id: 'a',
      role: 'assistant',
      text: 'Hello, I was initially confused so I asked the copilot for some help.',
    },
  ]),
  true,
  'Copilot speech stored as Aid opener must regenerate',
)
assert.equal(
  aidConversationNeedsOpen([{ id: 'a', role: 'assistant', text: packed }]),
  false,
  'negative: a real opener is not regenerated',
)

{
  let ticks = 0
  const waited = await waitForAidReport(
    () => {
      ticks += 1
      return ticks >= 3 ? report : null
    },
    { timeoutMs: 1000, intervalMs: 5 },
  )
  assert.equal(waited?.overallPercent, '68%', 'waitForAidReport returns once the pack is ready')
  const timedOut = await waitForAidReport(() => null, { timeoutMs: 20, intervalMs: 5 })
  assert.equal(timedOut, null, 'negative: missing report times out as null')
}

const modal = {
  fixtureId: 'fx',
  sectionKey: 'results',
  sectionLabel: 'Results',
  title: 'Results',
  description: 'd',
  depthLabel: 'Results',
  cards: [],
}

let seenSituation = ''
let seenMessages = /** @type {unknown} */ (null)
const opened = await runAssessorAidOpen(
  {
    fixtureKey: 'fx-open-unit',
    sectionKey: 'results',
    briefId: 'fx-open-unit',
    modal,
    report,
  },
  {
    compose: async (input) => {
      seenSituation = String(input.situation ?? '')
      seenMessages = input.messages
      return {
        utterance: "I'm Assessor Aid.\n\n68% overall. Stronger talking a system through than writing one.\n\n- **Hold** - Named a concrete migration risk",
        composeMeta: { situation: 'open', model: 'test', sampleIdsUsed: [] },
      }
    },
  },
)
assert.equal(seenSituation, 'open', 'Edge open uses situation=open')
assert.deepEqual(seenMessages, [], 'first bubble sends an empty peel')
assert.equal(opened.from, 'edge')
assert.match(opened.utterance, /68%/)
assert.match(opened.utterance, /\n/, 'Edge opener keeps markdown newlines')
assert.equal(TOUR.test(opened.utterance), false)

const fell = await runAssessorAidOpen(
  {
    fixtureKey: 'fx-open-fallback',
    sectionKey: 'results',
    briefId: 'fx-open-fallback',
    modal,
    report,
  },
  {
    compose: async () => {
      throw new Error('missing_openai_key')
    },
  },
)
assert.equal(fell.from, 'fallback')
assert.match(fell.utterance, /68%/)
assert.match(fell.utterance, /I'm Assessor Aid/)
assert.equal(TOUR.test(fell.utterance), false, `fallback must still be a pack read, got ${fell.utterance}`)
assert.equal(STUB.test(fell.utterance), false)

{
  const copilotLine =
    'Hello, I was initially confused so I asked the copilot for some help. To elaborate more and give me, you know, additional test case scenarios'
  const echoed = await runAssessorAidOpen(
    {
      fixtureKey: 'fx-open-echo',
      sectionKey: 'results',
      briefId: 'fx-open-echo',
      modal: {
        ...modal,
        messages: [
          {
            id: 'm.copilot',
            role: 'candidate',
            text: copilotLine,
            at: '',
            topicId: null,
            probeId: null,
            kind: 'answer',
          },
        ],
      },
      report,
    },
    {
      compose: async () => ({
        utterance: copilotLine,
        composeMeta: { situation: 'open', model: 'test', sampleIdsUsed: [] },
      }),
    },
  )
  assert.equal(echoed.from, 'fallback', 'transcript echo must not ship as the Aid opener')
  assert.match(echoed.utterance, /68%/)
  assert.equal(
    /asked the copilot/.test(echoed.utterance),
    false,
    'negative: Copilot peel speech is not the Aid bubble',
  )
  assert.equal(
    aidUtteranceIsTranscriptEcho('Hello, I was initially', [
      {
        id: 'm.copilot',
        role: 'candidate',
        text: copilotLine,
      },
    ]),
    true,
    'a streamed prefix of a sitting line is still an echo',
  )
  const stripped = peelForAidCompose(
    [
      { role: 'assistant', text: copilotLine },
      { role: 'candidate', text: 'hi' },
    ],
    [{ role: 'candidate', text: copilotLine }],
  )
  assert.equal(stripped.length, 1, 'sitting-line Aid opener is stripped from compose peel')
  assert.equal(stripped[0]?.text, 'hi')
  const cannedOnly = peelForAidCompose(
    [
      { role: 'assistant', text: copilotLine },
      { role: 'candidate', text: 'hi' },
    ],
    [],
  )
  assert.equal(cannedOnly.length, 1, 'canned Copilot opener is stripped even without a transcript match')
  const kept = peelForAidCompose(
    [
      {
        role: 'assistant',
        text: "I'm Assessor Aid.\n\n68% overall. Stronger talking a system through than writing one.\n\n- **Hold** - Named a concrete migration risk",
      },
      { role: 'candidate', text: 'hi' },
    ],
    [{ role: 'candidate', text: copilotLine }],
  )
  assert.equal(kept.length, 2, 'negative: a pack Aid opener stays on the peel')
}

{
  let threw = false
  try {
    await runAssessorAidOpen(
      {
        fixtureKey: 'fx-open-empty',
        sectionKey: 'results',
        briefId: 'fx-open-empty',
        modal,
      },
      {
        compose: async () => {
          throw new Error('missing_openai_key')
        },
      },
    )
  } catch {
    threw = true
  }
  assert.equal(threw, true, 'empty pack must not persist a greeter')
  const stored = loadAssessorAidConversation('fx-open-empty', 'results')
  assert.equal(
    STUB.test(stored.messages.map((row) => row.text).join('\n')),
    false,
    'negative: empty-pack greeter must not be saved',
  )
}

{
  const here = dirname(fileURLToPath(import.meta.url))
  const page = readFileSync(join(here, '../../pages/InterviewPage.tsx'), 'utf8')
  assert.match(page, /runAssessorAidOpen/)
  assert.match(page, /waitForAidReport/)
  assert.equal(
    /Happy to walk/.test(page),
    false,
    'negative: InterviewPage must not seed Happy-to-walk Aid greetings',
  )
  assert.equal(
    /marking rail/.test(page),
    false,
    'negative: InterviewPage must not tour the marking rail in Aid openers',
  )
  assert.equal(
    /pack is in front of you/.test(page),
    false,
    'negative: InterviewPage must not seed the empty-pack greeter',
  )
  const sendStart = page.indexOf('const handleAssessorAidSend')
  const sendEnd = page.indexOf('const expireCopilotPending')
  assert.ok(sendStart >= 0 && sendEnd > sendStart, 'Aid send exists')
  const send = page.slice(sendStart, sendEnd)
  assert.match(send, /peelForAidCompose/)
  assert.equal(
    /composeAidPackFallback/.test(send),
    false,
    'negative: send must not replace Edge compose with the pack fallback',
  )
  const enteredStart = page.indexOf('const handleResultSpineEntered')
  const enteredEnd = page.indexOf('const handleAssessorAidReport')
  assert.ok(enteredStart >= 0 && enteredEnd > enteredStart, 'Results open and onReport both exist')
  const entered = page.slice(enteredStart, enteredEnd)
  const waitAt = entered.indexOf('waitForAidReport')
  const openAt = entered.indexOf('runAssessorAidOpen')
  assert.ok(
    waitAt >= 0 && waitAt < openAt,
    'Results open waits for the report before composing',
  )
  const runSrc = readFileSync(join(here, 'runAssessorAidOpen.ts'), 'utf8')
  assert.match(runSrc, /situation:\s*['"]open['"]/, 'runAssessorAidOpen composes situation open')
  assert.match(runSrc, /messages:\s*\[\]/, 'open compose sends empty peel')
  assert.equal(
    runSrc.includes("replace(/\\s+/g, ' ')"),
    false,
    'negative: Aid opener must not flatten markdown to one line',
  )
  const composeSrc = readFileSync(join(here, 'composeAssessorAidOpenerUtterance.ts'), 'utf8')
  assert.equal(
    composeSrc.includes('Ask about a section, a mark, Security, or whether to proceed.'),
    false,
    'negative: fallback composer must not author the greeter stub',
  )
  const clientSrc = readFileSync(join(here, 'assessorAidEdgeClient.ts'), 'utf8')
  assert.match(clientSrc, /code === 'compose_empty'/, 'Aid client maps Edge compose_empty')
  assert.match(
    clientSrc,
    /planSource: payload.composeMeta/,
    'Aid client keeps planSource on composeMeta for DIAG',
  )
  assert.match(clientSrc, /phaseTrace:/, 'Aid client keeps phaseTrace on composeMeta')
  assert.match(clientSrc, /homes: Array.isArray/, 'Aid client keeps plan homes on composeMeta')
  assert.match(clientSrc, /needs: Array.isArray/, 'Aid client keeps plan needs on composeMeta')
  assert.match(clientSrc, /retrieved: Array.isArray/, 'Aid client keeps retrieved keys on composeMeta')
  assert.match(clientSrc, /injectMiss: Array.isArray/, 'Aid client keeps injectMiss on composeMeta')
}

console.log('runAssessorAidOpen.unit.mjs: ok')
