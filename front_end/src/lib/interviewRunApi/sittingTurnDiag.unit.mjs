/**
 * Assessor Aid / Assist / Copilot peel DIAG logs to [interview-peel] on failure.
 * Run: npx tsx front_end/src/lib/interviewRunApi/sittingTurnDiag.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { logSittingTurnDebug } from './sittingTurnDiag.ts'

const errors = []
const logs = []
const origError = console.error
const origLog = console.log
console.error = (...args) => {
  errors.push(args)
}
console.log = (...args) => {
  logs.push(args)
}
try {
  logSittingTurnDebug({
    surface: 'aid',
    userMessage: 'hi',
    replyMarkdown: 'Hello, I was initially',
    error: new Error('compose_empty'),
    meta: { situation: 'clarify' },
  })
} finally {
  console.error = origError
  console.log = origLog
}

assert.equal(errors[0]?.[0], '[interview-peel]', 'Aid failures always log [interview-peel]')
assert.equal(errors[0]?.[1], 'aid', 'Aid peel names surface aid')
assert.match(String(errors[0]?.[2]?.message ?? ''), /compose_empty/)

const okErrors = []
console.error = (...args) => {
  okErrors.push(args)
}
try {
  logSittingTurnDebug({
    surface: 'aid',
    userMessage: 'hi',
    replyMarkdown: "I'm Assessor Aid. 39% overall.",
    meta: { situation: 'clarify' },
  })
} finally {
  console.error = origError
}
assert.equal(okErrors.length, 0, 'negative: a successful Aid reply does not console.error')

{
  const prevStore = globalThis.localStorage
  globalThis.localStorage = {
    getItem: () => '1',
    setItem() {},
    removeItem() {},
    clear() {},
    key: () => null,
    length: 0,
  }
  const dump = []
  console.log = (...args) => {
    dump.push(args)
  }
  try {
    logSittingTurnDebug({
      surface: 'aid',
      userMessage: 'hi',
      replyMarkdown: "I'm Assessor Aid. 39% overall.",
      meta: {
        situation: 'clarify',
        model: 'gpt-4.1',
        from: 'edge',
        homes: ['Overall'],
        needs: ['overall'],
        retrieved: ['overall'],
        injectMiss: [],
        packDiag: ['overall: 39%', 'sections (1):', '  - Parse and sum drill [open]'],
      },
    })
  } finally {
    console.log = origLog
    if (prevStore) globalThis.localStorage = prevStore
    else delete globalThis.localStorage
  }
  const dumped = String(dump[0]?.[0] ?? '')
  assert.match(dumped, /FROM: edge/, 'Aid DIAG names whether Edge composed')
  assert.match(dumped, /SITUATION: clarify/)
  assert.match(dumped, /MODEL: gpt-4.1/)
  assert.match(dumped, /homes=Overall/, 'Aid DIAG prints plan homes, not Assist pkgs')
  assert.match(dumped, /needs=overall/, 'Aid DIAG prints plan needs')
  assert.match(dumped, /retrieved=overall/, 'Aid DIAG prints bound retrieve keys')
  assert.match(dumped, /injectMiss=—/, 'Aid DIAG prints bind misses')
  assert.equal(
    /pkgs=/.test(dumped),
    false,
    'negative: Aid PLAN row must not show Assist packageCount',
  )
  assert.equal(
    /VERDICT: peel_empty/.test(dumped),
    false,
    'negative: Aid DIAG must not treat missing Copilot peel as empty',
  )
  const packDump = String(dump[1]?.[0] ?? '')
  assert.match(packDump, /PART 2\/2 \(RESULTS PACK/, 'Aid DIAG dumps the results board like Vurex PART 3')
  assert.match(packDump, /overall: 39%/)
  assert.equal(
    /owned the freeze/.test(packDump),
    false,
    'negative: pack snapshot is titles and percents, not sitting speech',
  )
}

{
  const prevStore = globalThis.localStorage
  globalThis.localStorage = {
    getItem: () => '1',
    setItem() {},
    removeItem() {},
    clear() {},
    key: () => null,
    length: 0,
  }
  const dump = []
  console.log = (...args) => {
    dump.push(args)
  }
  try {
    logSittingTurnDebug({
      surface: 'aid',
      userMessage: 'what is wrong with Ownership?',
      replyMarkdown: 'This attempt is at 39%.',
      meta: {
        situation: 'clarify',
        from: 'edge',
        needs: ['mark:card.own'],
        retrieved: ['overall'],
        injectMiss: ['mark:card.own'],
        homes: ['Overall'],
      },
    })
  } finally {
    console.log = origLog
    if (prevStore) globalThis.localStorage = prevStore
    else delete globalThis.localStorage
  }
  const dumped = String(dump[0]?.[0] ?? '')
  assert.match(dumped, /needs=mark:card.own/)
  assert.match(dumped, /retrieved=overall/)
  assert.match(dumped, /injectMiss=mark:card.own/)
  assert.equal(
    /retrieved=mark:card.own/.test(dumped),
    false,
    'negative: DIAG must show when the named mark was not bound',
  )
}

{
  const prevStore = globalThis.localStorage
  globalThis.localStorage = {
    getItem: () => '1',
    setItem() {},
    removeItem() {},
    clear() {},
    key: () => null,
    length: 0,
  }
  const dump = []
  console.log = (...args) => {
    dump.push(args)
  }
  const peel = []
  console.error = (...args) => {
    peel.push(args)
  }
  try {
    logSittingTurnDebug({
      surface: 'aid',
      userMessage: 'hi',
      replyMarkdown: '',
      error: Object.assign(new Error('http_503'), { code: 'unknown' }),
      meta: { situation: 'explain_report' },
    })
  } finally {
    console.log = origLog
    console.error = origError
    if (prevStore) globalThis.localStorage = prevStore
    else delete globalThis.localStorage
  }
  const dumped = String(dump[0]?.[0] ?? '')
  assert.match(dumped, /ERROR: http_503/, 'a Kong 503 must not print as ERROR: unknown')
  assert.equal(
    /ERROR: unknown\b/.test(dumped),
    false,
    'negative: gateway HTML must not collapse to unknown',
  )
}

{
  const here = dirname(fileURLToPath(import.meta.url))
  const page = readFileSync(join(here, '../../pages/InterviewPage.tsx'), 'utf8')
  const sendStart = page.indexOf('const handleAssessorAidSend')
  const sendEnd = page.indexOf('const expireCopilotPending')
  assert.ok(sendStart >= 0 && sendEnd > sendStart, 'Aid send exists')
  const send = page.slice(sendStart, sendEnd)
  const catchAt = send.indexOf('.catch')
  assert.ok(catchAt >= 0, 'Aid send has a catch')
  const afterCatch = send.slice(catchAt)
  assert.equal(
    /composeAidPackFallback/.test(afterCatch),
    false,
    'negative: send catch must not ship pack fallback as a successful reply',
  )
  assert.match(afterCatch, /surface:\s*['"]aid['"]/)
  assert.match(send, /peelForAidCompose/)
  assert.match(send, /logSittingTurnDebug/)
  const thenAt = send.indexOf('.then')
  assert.ok(thenAt >= 0 && thenAt < catchAt, 'success logs before catch')
  assert.match(send.slice(thenAt, catchAt), /from:\s*result.composeMeta.from/)
  assert.match(send.slice(thenAt, catchAt), /surface:\s*['"]aid['"]/)
  assert.match(send, /formatAidPackDiag/, 'send dumps the results pack into DIAG like Vurex board snapshot')
  assert.match(send.slice(thenAt, catchAt), /packDiag/)
}

console.log('sittingTurnDiag.unit.mjs: ok')
