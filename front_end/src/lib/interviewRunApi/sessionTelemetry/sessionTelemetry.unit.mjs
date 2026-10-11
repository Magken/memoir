/**
 * Session telemetry dwell math — no OpenAI.
 * Run: npx tsx front_end/src/lib/interviewRunApi/sessionTelemetry/sessionTelemetry.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  bindTelemetryHost,
  clearSessionTelemetry,
  digestSessionTelemetry,
  loadSessionTelemetry,
  pauseSessionTelemetry,
  recordDictationSession,
  resetTelemetrySession,
  resumeSessionTelemetry,
  setPointerForTests,
  setTelemetryPhase,
  startSessionTelemetry,
  tickTelemetryForTests,
  recordTypedInsert,
  countTypedCommitForTests,
  sittingTypedWpm,
  syncTypingLive,
} from './index.ts'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => {
    store.set(k, String(v))
  },
  removeItem: (k) => {
    store.delete(k)
  },
}

const briefId = 'fixture:telemetry'
clearSessionTelemetry(briefId)
resetTelemetrySession()

startSessionTelemetry({
  briefId,
  attemptId: 'local:t',
  phaseId: 'ph.code',
})

tickTelemetryForTests(1000)
let doc = loadSessionTelemetry(briefId)
assert.ok(doc)
assert.ok(doc.visibleMs >= 1000)
assert.equal(doc.inEditorMs, 0)

const host = {
  listeners: {},
  addEventListener(type, fn) {
    this.listeners[type] = fn
  },
  removeEventListener(type) {
    delete this.listeners[type]
  },
  contains() {
    return false
  },
}
bindTelemetryHost(host, 'editor')
host.listeners.pointerenter()
tickTelemetryForTests(2000)
doc = loadSessionTelemetry(briefId)
assert.ok(doc.inEditorMs >= 2000)
const digest = digestSessionTelemetry(doc)
assert.ok(digest.dwellRatio != null)
assert.ok(digest.dwellRatio > 0.5)
assert.ok(digest.inWorkMs >= 2000)

host.listeners.pointerleave()
setTelemetryPhase('ph.talk')
tickTelemetryForTests(1500)
doc = loadSessionTelemetry(briefId)
assert.ok(doc.dwellByPhase?.['ph.code']?.inEditorMs >= 2000)
assert.ok(doc.dwellByPhase?.['ph.talk']?.visibleMs >= 1500)
assert.equal(doc.dwellByPhase?.['ph.talk']?.inEditorMs ?? 0, 0)
assert.ok(
  (doc.dwellByPhase?.['ph.code']?.visibleMs ?? 0) !==
    (doc.dwellByPhase?.['ph.talk']?.visibleMs ?? 0),
)
assert.ok(doc.visibleMs >= (doc.dwellByPhase?.['ph.code']?.visibleMs ?? 0) + (doc.dwellByPhase?.['ph.talk']?.visibleMs ?? 0) - 1)

const visibleBeforePause = doc.visibleMs
pauseSessionTelemetry()
tickTelemetryForTests(5000)
doc = loadSessionTelemetry(briefId)
assert.equal(doc.visibleMs, visibleBeforePause)

recordDictationSession('dictation_start', { surface: 'talk' })
tickTelemetryForTests(1500)
recordDictationSession('dictation_stop', { surface: 'talk', charCount: 24 })
doc = loadSessionTelemetry(briefId)
assert.ok(doc.events.some((e) => e.kind === 'dictation_start' && e.surface === 'talk'))
assert.ok(doc.events.some((e) => e.kind === 'dictation_stop' && e.charCount === 24))
assert.ok(!JSON.stringify(doc).includes('audio'))

resumeSessionTelemetry()
setPointerForTests(0.4, 0.6, 'editor')
tickTelemetryForTests(250)
doc = loadSessionTelemetry(briefId)
assert.ok((doc.pointerTrail?.length ?? 0) >= 1)
assert.ok(digestSessionTelemetry(doc).trailCount >= 1)

assert.deepEqual(countTypedCommitForTests('hello world '), { words: 2, pending: '' })
syncTypingLive({ briefId, attemptId: 'local:t', paused: false, dictationOn: false })
const typedAt = Date.now()
recordTypedInsert(briefId, 'talk', 'one ', typedAt)
recordTypedInsert(briefId, 'talk', 'two ', typedAt + 1000)
recordTypedInsert(briefId, 'talk', 'three ', typedAt + 2000)
recordTypedInsert(briefId, 'talk', 'four ', typedAt + 3000)
recordTypedInsert(briefId, 'talk', 'five ', typedAt + 4000)
recordTypedInsert(briefId, 'talk', 'six ', typedAt + 5000)
doc = loadSessionTelemetry(briefId)
const talkTyping = (doc.typing ?? []).find((row) => row.surface === 'talk')
assert.ok((talkTyping?.committedWords ?? 0) >= 6)
assert.ok(talkTyping?.wpm != null)
assert.equal(sittingTypedWpm(doc.typing).wpm, talkTyping?.wpm)
syncTypingLive({ dictationOn: true, paused: false })
assert.equal(recordTypedInsert(briefId, 'talk', 'ignored ', typedAt + 6000), null)

pauseSessionTelemetry()
const trailBefore = doc.pointerTrail?.length ?? 0
tickTelemetryForTests(250)
doc = loadSessionTelemetry(briefId)
assert.equal(doc.pointerTrail?.length ?? 0, trailBefore)

resetTelemetrySession()
clearSessionTelemetry(briefId)
console.log('sessionTelemetry.unit.mjs: ok')
