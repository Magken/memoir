/**
 * Editor History Capture — adapters, replay, store, sanitize.
 * Run: npx tsx front_end/src/lib/interviewRunApi/editorCapture/editorCapture.unit.mjs
 */
import assert from 'node:assert/strict'
import { codingCaptureAdapter } from './adapters/coding.ts'
import { docCaptureAdapter } from './adapters/doc.ts'
import { formCaptureAdapter } from './adapters/form.ts'
import {
  Capture,
  persistEditorTape,
  replayTape,
  replayTapeFinal,
  resetCaptureSession,
  setCaptureClockForTests,
} from './index.ts'
import { getEditorCaptureAdapter, listEditorCaptureKinds } from './registry.ts'
import {
  clearEditorTapes,
  loadEditorTape,
  saveEditorTape,
} from './store.ts'
import {
  clearInterviewResponse,
  emptyInterviewResponse,
  getInterviewResponse,
  saveInterviewResponse,
} from '../interviewResponse.ts'

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

assert.equal(getEditorCaptureAdapter('nope'), null)
assert.ok(listEditorCaptureKinds().includes('form'))
assert.ok(listEditorCaptureKinds().includes('coding'))
assert.ok(listEditorCaptureKinds().includes('doc'))

// --- form round-trip ---
const formLiveA = {
  schema: 'vurify/test-form',
  version: 1,
  id: 'tf.1',
  title: 'Screen',
  settings: {},
  sections: [],
  questions: [{ id: 'q1', kind: 'short_text', prompt: 'Name' }],
  answerKey: { q1: { text: 'SECRET' } },
  attempt: { responses: {} },
}
const formLiveB = {
  ...formLiveA,
  attempt: { responses: { q1: { text: 'Ada' } } },
}
const form0 = formCaptureAdapter.sanitize(formLiveA)
assert.equal(form0.answerKey, undefined)
assert.equal(JSON.stringify(form0).includes('SECRET'), false)
const form1 = formCaptureAdapter.sanitize(formLiveB)
const formPatches = formCaptureAdapter.diff(form0, form1)
assert.equal(formPatches.length, 1)
assert.equal(formPatches[0]?.op, 'set_response')
const formRe = formPatches.reduce((acc, p) => formCaptureAdapter.apply(acc, p), form0)
assert.deepEqual(formRe.responses, form1.responses)
assert.equal((formCaptureAdapter.inferActions?.(form0, form1) ?? []).some((a) => a.action === 'paste'), false)

const formEssay0 = formCaptureAdapter.sanitize({
  ...formLiveA,
  questions: [{ id: 'q1', kind: 'essay', prompt: 'Write' }],
  attempt: { responses: {} },
})
const formEssayPaste = formCaptureAdapter.sanitize({
  ...formLiveA,
  questions: [{ id: 'q1', kind: 'essay', prompt: 'Write' }],
  attempt: { responses: { q1: { kind: 'essay', value: `Ada ${'x'.repeat(80)}` } } },
})
const formPasteActs = formCaptureAdapter.inferActions?.(formEssay0, formEssayPaste) ?? []
assert.ok(formPasteActs.some((a) => a.action === 'paste'), 'form large insert is paste')

// --- coding round-trip (one file + helper) ---
const codeA = {
  title: 'ws',
  activeId: 'src/solve.ts',
  openIds: ['src/solve.ts'],
  files: [
    { path: 'src/solve.ts', language: 'typescript', content: 'export function solve() {\n  return 1\n}\n' },
    { path: 'tests/cases.json', language: 'json', content: '{"expected":"HIDDEN"}' },
    { path: 'tests/reference.ts', language: 'typescript', content: 'oracle' },
  ],
}
const codeB = {
  title: 'ws',
  activeId: 'src/parse.ts',
  openIds: ['src/solve.ts', 'src/parse.ts'],
  files: [
    {
      path: 'src/solve.ts',
      language: 'typescript',
      content: 'import { parse } from "./parse.ts"\nexport function solve() {\n  return parse(1)\n}\n',
    },
    { path: 'src/parse.ts', language: 'typescript', content: 'export function parse(n) { return n }\n' },
    { path: 'tests/cases.json', language: 'json', content: '{"expected":"HIDDEN"}' },
  ],
}
const c0 = codingCaptureAdapter.sanitize(codeA)
assert.equal(c0.files.some((f) => f.path.includes('cases.json')), false)
assert.equal(JSON.stringify(c0).includes('HIDDEN'), false)
const c1 = codingCaptureAdapter.sanitize(codeB)
const cPatches = codingCaptureAdapter.diff(c0, c1)
assert.ok(cPatches.some((p) => p.op === 'create_file' && p.path === 'src/parse.ts'))
assert.ok(cPatches.some((p) => p.op === 'splice' && p.path === 'src/solve.ts'))
let cFrame = c0
for (const p of cPatches) cFrame = codingCaptureAdapter.apply(cFrame, p)
assert.equal(
  cFrame.files.find((f) => f.path === 'src/solve.ts')?.content,
  c1.files.find((f) => f.path === 'src/solve.ts')?.content,
)
assert.equal(cFrame.files.find((f) => f.path === 'src/parse.ts')?.content, 'export function parse(n) { return n }\n')
const inferred = codingCaptureAdapter.inferActions?.(c0, c1) ?? []
assert.ok(inferred.some((a) => a.action === 'open_file'))

const pasteNext = codingCaptureAdapter.sanitize({
  ...codeB,
  files: codeB.files.map((f) =>
    f.path === 'src/solve.ts'
      ? { ...f, content: `${f.content}${'x'.repeat(80)}` }
      : f,
  ),
})
const pasteActs = codingCaptureAdapter.inferActions?.(c1, pasteNext) ?? []
assert.ok(pasteActs.some((a) => a.action === 'paste'))
const pasteDetail = pasteActs.find((a) => a.action === 'paste')?.detail ?? {}
assert.equal(pasteDetail.path, 'src/solve.ts')
assert.ok(String(pasteDetail.excerpt ?? '').length >= 40)
assert.ok(!('clipboard' in pasteDetail), 'negative: paste detail must not store clipboard text')
assert.ok(pasteActs.some((a) => a.action === 'paste_route'))

// --- doc round-trip ---
const doc0 = docCaptureAdapter.sanitize({ markdown: 'Start', title: 'Essay', pageSetup: {} })
const doc1 = docCaptureAdapter.sanitize({ markdown: 'Start writing now.', title: 'Essay', pageSetup: {} })
const dPatches = docCaptureAdapter.diff(doc0, doc1)
assert.ok(dPatches.some((p) => p.op === 'splice'))
let dFrame = doc0
for (const p of dPatches) dFrame = docCaptureAdapter.apply(dFrame, p)
assert.equal(dFrame.markdown, 'Start writing now.')

const fromLexical = docCaptureAdapter.sanitize({
  lexical: {
    root: {
      children: [
        { type: 'paragraph', children: [{ type: 'text', text: 'From lexical' }] },
      ],
    },
  },
  pageSetup: {},
})
assert.match(String(fromLexical.markdown), /From lexical/)

// --- recorder + replay ---
let t = 1_000_000
setCaptureClockForTests(() => t)
resetCaptureSession()
const started = Capture.start({
  briefId: 'fixture:capture-unit',
  attemptId: 'local:fixture:capture-unit',
  phaseId: 'ph.code',
  kind: 'coding',
  live: codeA,
})
assert.ok(started)
t += 200
Capture.tick({ kind: 'coding', live: codeB })
t += 50
Capture.action('run')
t += 80
Capture.action('copilot_apply', { files: 1 })
t += 120
Capture.tick({
  kind: 'coding',
  live: {
    ...codeB,
    files: codeB.files.map((f) =>
      f.path === 'src/parse.ts'
        ? { ...f, content: `export function parse(n) { return n + 1 }\n${'x'.repeat(80)}` }
        : f,
    ),
  },
})
const tape = Capture.flush()
assert.ok(tape)
assert.equal(tape.kind, 'coding')
assert.ok(tape.events.some((e) => e.type === 'action' && e.action === 'run'))
assert.equal(
  tape.events.filter((e) => e.type === 'action' && e.action === 'copilot_apply').length,
  1,
)
const applyAt = tape.events.find((e) => e.type === 'action' && e.action === 'copilot_apply')?.t ?? 0
assert.ok(
  !tape.events.some((e) => e.type === 'action' && e.action === 'paste' && e.t >= applyAt),
  'negative: a bot edit tick must not also record a paste',
)
assert.ok(tape.events.some((e) => e.type === 'session_end'))
const reconstructed = replayTapeFinal(tape)
assert.deepEqual(reconstructed.files, tape.final.files)
assert.equal(
  reconstructed.files.find((f) => f.path === 'src/parse.ts')?.content,
  `export function parse(n) { return n + 1 }\n${'x'.repeat(80)}`,
)
assert.equal(JSON.stringify(tape).includes('HIDDEN'), false)

// unknown kind does not crash
resetCaptureSession()
assert.equal(
  Capture.start({
    briefId: 'x',
    attemptId: 'x',
    phaseId: 'ph.x',
    kind: 'draw',
    live: {},
  }),
  null,
)
Capture.tick({ kind: 'draw', live: {} })
Capture.action('run')
assert.equal(Capture.flush(), null)

// --- store + InterviewResponse index + restart clear ---
const briefId = tape.briefId
clearInterviewResponse(briefId)
saveInterviewResponse(emptyInterviewResponse(briefId))
persistEditorTape(tape)
const loaded = loadEditorTape(briefId, tape.phaseId)
assert.ok(loaded)
assert.equal(loaded.kind, 'coding')
const indexed = getInterviewResponse(briefId)
assert.equal(indexed.editorTapes?.[tape.phaseId]?.kind, 'coding')
assert.ok((indexed.editorTapes?.[tape.phaseId]?.eventCount ?? 0) > 0)
clearInterviewResponse(briefId)
assert.equal(loadEditorTape(briefId, tape.phaseId), null)
assert.deepEqual(getInterviewResponse(briefId).editorTapes, {})

// truncated still has final
t = 5_000_000
setCaptureClockForTests(() => t)
resetCaptureSession()
Capture.start({
  briefId: 'fixture:trunc',
  attemptId: 'a',
  phaseId: 'ph.doc',
  kind: 'doc',
  live: { markdown: '', title: 't', pageSetup: {} },
})
let body = ''
for (let i = 0; i < 4_100; i += 1) {
  t += 200
  body = `word${i}`
  Capture.tick({ kind: 'doc', live: { markdown: body, title: 't', pageSetup: {} } })
}
const docTape = Capture.flush()
assert.ok(docTape)
assert.equal(docTape.truncated, true)
assert.equal(docTape.final.markdown, body)
assert.ok(docTape.events.length <= 4_002)

saveEditorTape(docTape)
assert.equal(loadEditorTape('fixture:trunc', 'ph.doc')?.kind, 'doc')
clearEditorTapes('fixture:trunc')

setCaptureClockForTests(null)
resetCaptureSession()

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const packPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../fixtures/attempt-responses/2026-08-12-42f8ea34/editor-tapes.json',
)
const pack = JSON.parse(readFileSync(packPath, 'utf8'))
for (const kind of ['form', 'coding', 'doc']) {
  const fixtureTape = pack.byKind[kind]
  assert.ok(fixtureTape, kind)
  const frame = replayTapeFinal(fixtureTape)
  assert.deepEqual(frame, fixtureTape.final, `${kind} fixture replay`)
}

console.log('editorCapture.unit.mjs ok')
