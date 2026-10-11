/**
 * Questionnaire bubble id remap + seal — FE flow regression.
 * Run: node front_end/src/lib/interviewEditApi/questionnaireBubble.unit.mjs
 */
import assert from 'node:assert/strict'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const {
  followMessageIdMap,
  messageMatchesMappedId,
  findBubbleIdByEditRun,
  resolveQuestionnaireBubbleId,
  sealPlanningParts,
  ownedBotRunPersistDecision,
} = await import('./questionnaireBubble.ts')

assert.equal(followMessageIdMap('local-1', { 'local-1': 'server-a' }), 'server-a')
assert.equal(
  followMessageIdMap('local-1', { 'local-1': 'server-a', 'server-a': 'server-b' }),
  'server-b',
)
assert.equal(messageMatchesMappedId('local-1', 'server-a', { 'local-1': 'server-a' }), true)
assert.equal(messageMatchesMappedId('server-a', 'local-1', { 'local-1': 'server-a' }), true)
assert.equal(messageMatchesMappedId('other', 'local-1', { 'local-1': 'server-a' }), false)

const messages = [
  {
    id: 'server-a',
    parts: [
      { type: 'thinking', text: '…', collapsed: true },
      {
        type: 'planning',
        title: 'Questions',
        questions: [{ id: 'q1', prompt: 'Pick', kind: 'single', options: [] }],
        answered: false,
        editRunId: 'edit-run-1',
      },
    ],
  },
]

assert.equal(findBubbleIdByEditRun(messages, 'edit-run-1'), 'server-a')
assert.equal(
  resolveQuestionnaireBubbleId({
    preferredId: 'local-1',
    editRunId: 'edit-run-1',
    idMap: { 'local-1': 'server-a' },
    messages,
  }),
  'server-a',
  'continue must target remapped bubble, not ghost local id',
)

assert.notEqual(
  resolveQuestionnaireBubbleId({
    preferredId: 'local-1',
    editRunId: 'edit-run-1',
    idMap: { 'local-1': 'server-a' },
    messages,
  }),
  'local-1',
)

const sealed = sealPlanningParts(messages[0].parts, 'edit-run-1', {
  answers: { q1: 'yes' },
  summary: 'Answered',
})
assert.equal(sealed[1].type, 'planning')
assert.equal(sealed[1].answered, true)
assert.equal(sealed[1].collapsed, true)

const sealedMsgs = [{ id: 'server-a', parts: sealed }]
assert.equal(
  sealedMsgs[0].parts.find((p) => p.type === 'planning' && !p.answered),
  undefined,
  'sealed planning must not be reopenable',
)

// Ask persist after continue started a new bot-run: finalize ask, do not clear continue.
{
  const d = ownedBotRunPersistDecision({
    ownedRunId: 'ask-run',
    currentRunId: 'continue-run',
    cancelledRunIds: new Set(),
  })
  assert.equal(d.finalize, true)
  assert.equal(d.clearCurrent, false, 'must not null continue runIdRef')
}
{
  const d = ownedBotRunPersistDecision({
    ownedRunId: 'ask-run',
    currentRunId: 'ask-run',
    cancelledRunIds: new Set(),
  })
  assert.equal(d.finalize, true)
  assert.equal(d.clearCurrent, true)
}
{
  const d = ownedBotRunPersistDecision({
    ownedRunId: 'ask-run',
    currentRunId: 'ask-run',
    cancelledRunIds: new Set(['ask-run']),
  })
  assert.equal(d.finalize, false, 'Stop-cancelled runs must not finalize')
  assert.equal(d.clearCurrent, true)
}

const chatSrc = readFileSync(
  join(__dirname, '../../components/InterviewCreatorChat.tsx'),
  'utf8',
)
assert.match(chatSrc, /resolveQuestionnaireBubbleId/)
assert.match(chatSrc, /messageIdMapRef/)
assert.match(chatSrc, /sealPlanningParts/)
assert.match(chatSrc, /liveSealed/)
assert.match(chatSrc, /ownedBotRunPersistDecision/)
assert.match(chatSrc, /continueEditRunIdRef/)
assert.match(chatSrc, /sendLockRef/)
assert.match(chatSrc, /messageMatchesMappedId/)
assert.match(chatSrc, /followMessageIdMap/)
assert.match(chatSrc, /turnRunId/)
assert.match(chatSrc, /cancelledBotRunIdsRef/)
assert.match(
  chatSrc,
  /import \{[\s\S]*?\bdispatchEditorAction\b[\s\S]*?\} from '\.\.\/lib\/editorContext\/actionRegistry'/,
  'Send must import dispatchEditorAction — a name-only mention is the ReferenceError',
)
const syncStart = chatSrc.indexOf('const ensureBoardSynced')
const syncEnd = chatSrc.indexOf('const withBoardPdfExtract')
assert.ok(syncStart >= 0 && syncEnd > syncStart, 'ensureBoardSynced block')
assert.match(
  chatSrc.slice(syncStart, syncEnd),
  /await dispatchEditorAction\(/,
  'flush-before-bot-turn must call the imported dispatcher',
)

{
  const checkAt = chatSrc.indexOf('function BoardCheckSuiteSheet')
  assert.ok(checkAt >= 0, 'Check Suite sheet exists')
  const stackAt = chatSrc.indexOf('theme-interview-creator-chat__composer-stack')
  const lockedAt = chatSrc.indexOf('locked={Boolean(activePlan) || planMounted}')
  assert.ok(stackAt >= 0 && lockedAt > stackAt, 'composer-stack wraps Check Suite then composer')
  const stack = chatSrc.slice(stackAt, lockedAt)
  assert.ok(stack.includes('BoardCheckSuiteSheet'), 'Check Suite lives in __composer-stack')
  assert.ok(chatSrc.includes('data-check-suite'), 'Check Suite uses plan-sheet merge classes')
  const sheetFn = chatSrc.slice(checkAt, chatSrc.indexOf('export function InterviewCreatorChat'))
  assert.ok(sheetFn.includes('plan-sheet-head'), 'Check Suite reuses questionnaire head')
  assert.ok(sheetFn.includes('plan-sheet-title'), 'Check Suite uses questionnaire title chrome')
  assert.ok(sheetFn.includes('plan-q-prompt'), 'Check Suite rows reuse questionnaire prompts')
  assert.ok(sheetFn.includes('AlertTriangle'), 'Check Suite head has a warning icon')
  assert.ok(sheetFn.includes('check-icon'), 'Check Suite warning icon class is wired')
  assert.ok(sheetFn.includes('check-rule'), 'Check Suite uses a warning divider')
  assert.ok(
    !sheetFn.includes('<span />'),
    'negative: Check Suite is one hairline, not two stacked spans',
  )
  assert.ok(
    !sheetFn.includes('guide-rule'),
    'negative: Check Suite must not reuse the single questionnaire guide-rule',
  )
  assert.ok(sheetFn.includes('plan-sheet-peek'), 'Check Suite minimize peek matches questionnaire')
  assert.match(
    sheetFn,
    /useState\(false\)/,
    'Check Suite starts expanded like Questions, not collapsed',
  )
  assert.ok(!sheetFn.includes('check-head'), 'negative: no custom compact check-head')
  assert.ok(!sheetFn.includes('<Badge'), 'negative: no warning Badge chrome')
  assert.ok(
    !/useState\(true\)/.test(sheetFn),
    'negative: Check Suite must not default-collapse like the old warning strip',
  )
  assert.ok(
    /checkWarnings\.length > 0/.test(chatSrc) || /checkOpen/.test(chatSrc),
    'hidden when warnings.length === 0',
  )
  assert.match(
    chatSrc,
    /peelCheckWarningsFromContext/,
    'bot apply re-reads live Check Suite from getContext',
  )
  assert.match(
    chatSrc,
    /setAppliedCheckWarnings/,
    'bot apply updates the sheet in the same turn',
  )
  assert.match(
    chatSrc,
    /shownCheckWarnings/,
    'Check Suite sheet reads the live list, not the first snapshot only',
  )
  assert.ok(
    !/if \(result\.body\) onBodyUpdatedRef\.current\?\.\(result\.body\)\s*$/m.test(chatSrc),
    'negative: applying a body must also refresh Check Suite, not only the editors',
  )
  assert.ok(lockedAt >= 0, 'negative: Check Suite does not set composer locked')
  assert.ok(
    !chatSrc.slice(lockedAt, lockedAt + 80).includes('checkMounted'),
    'composer locked stays questionnaire-only',
  )

  const cssSrc = readFileSync(
    join(__dirname, '../../css/effects/interview-creator-chat.css'),
    'utf8',
  )
  const checkCssAt = cssSrc.indexOf("[data-check-suite='true']")
  assert.ok(checkCssAt >= 0, 'Check Suite has a scoped warning dialect')
  const checkCss = cssSrc.slice(checkCssAt, cssSrc.indexOf('__plan-sheet-head {'))
  assert.match(checkCss, /--theme-warning/, 'Check Suite colour is warning, not questionnaire ink')
  assert.match(cssSrc, /__check-rule \{[\s\S]*?height: 1px/, 'Check Suite divider is one hairline')
  assert.ok(
    !cssSrc.includes('__check-rule > span'),
    'negative: Check Suite must not paint two stacked divider spans',
  )
  assert.ok(
    !checkCss.includes('__guide-rule'),
    'negative: Check Suite CSS must not restyle the single questionnaire rule',
  )
}

console.log('questionnaireBubble.unit.mjs: ok')
