/**
 * Copilot live apply merge — form / coding / doc. Assistant/Coach refuse.
 * Run via npm run front_end:test:gate-mounts-assist
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  applyLiveEditorAssist,
  applyCopilotPendingOps,
  isDeniedCodingAssistPath,
  mergeCodingLiveAssist,
  mergeDocLiveAssist,
  mergeFormLiveAssist,
  parseLiveEditorApply,
} from './applyLiveEditorAssist.ts'
import { resolveGateToolMount } from './resolveGateToolMount.ts'
import { sanitizeFormLiveComposition } from './sanitizeLiveComposition.ts'

const here = dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  readFileSync(
    join(here, '../interviewBrief/fixtures/creator2ComprehensiveBrief.json'),
    'utf8',
  ),
)

{
  assert.equal(parseLiveEditorApply({ kind: 'form' }, 'form'), null)
  const formApply = parseLiveEditorApply(
    { kind: 'form', responses: [{ questionId: 'q.auth', value: { kind: 'mcq_single', optionId: 'yes' } }] },
    'form',
  )
  assert.ok(formApply && formApply.kind === 'form')
  assert.equal(parseLiveEditorApply(formApply, 'coding'), null)
}

{
  const mount = resolveGateToolMount({ brief: fixture, phaseId: 'ph.eligible' })
  assert.ok(mount && mount.kind === 'form')
  const q = mount.document.questions.find((row) => row.id === 'q.auth') ?? mount.document.questions[0]
  assert.ok(q, 'eligibility question')
  const optionId =
    q && 'options' in q && Array.isArray(q.options) ? q.options[0]?.id : 'opt'
  const next = mergeFormLiveAssist(mount.document, [
    { questionId: q.id, value: { kind: 'mcq_single', optionId } },
  ])
  assert.equal(next.attempt?.responses?.[q.id]?.kind, 'mcq_single')
  const seed = sanitizeFormLiveComposition(next)
  const row = seed.snapshot.responses.find((r) => r.questionId === q.id)
  assert.ok(row, 'sanitized snapshot includes questionId')
  assert.equal(row.questionId, q.id)

  const alias = mergeFormLiveAssist(mount.document, [
    { questionId: q.id, value: { single: optionId } },
  ])
  const aliasRow = alias.attempt?.responses?.[q.id]
  assert.equal(aliasRow?.kind, 'mcq_single')
  assert.equal(aliasRow && 'optionId' in aliasRow ? aliasRow.optionId : null, optionId)
}

{
  const mount = resolveGateToolMount({ brief: fixture, phaseId: 'ph.code' })
  assert.ok(mount && mount.kind === 'coding')
  const target = (mount.workspace.files ?? []).find((f) => !isDeniedCodingAssistPath(f.path))
  assert.ok(target, 'candidate coding file')
  const merged = mergeCodingLiveAssist(mount.workspace, [
    { path: target.path, contents: 'export function solve() { return 1 }' },
    { path: 'tests/cases.json', contents: '{"secret":true}' },
    { path: 'reference/solve.ts', contents: 'cheat' },
  ])
  assert.equal(merged.applied, 1)
  assert.ok(merged.denied.includes('tests/cases.json'))
  const applied = merged.payload.files.find((f) => f.path === target.path)
  assert.match(applied?.content ?? '', /return 1/)
  assert.ok(
    !(merged.payload.files ?? []).some((f) => f.path === 'tests/cases.json'),
    'did not add hidden cases.json',
  )
}

{
  const mount = resolveGateToolMount({ brief: fixture, phaseId: 'ph.essay' })
  assert.ok(mount && mount.kind === 'doc')
  const next = mergeDocLiveAssist(mount.document, {
    markdown: '# Draft\n\nCandidate body.',
    title: 'Design note',
  })
  assert.equal(next.title, 'Design note')
  assert.match(String(next.markdown ?? ''), /Candidate body/)
}

{
  const formMount = resolveGateToolMount({ brief: fixture, phaseId: 'ph.eligible' })
  assert.ok(formMount && formMount.kind === 'form')
  const q = formMount.document.questions[0]
  const apply = {
    kind: 'form',
    responses: [{ questionId: q.id, value: { kind: 'short_text', value: 'nope' } }],
  }
  const refused = await applyLiveEditorAssist({
    kind: 'form',
    apply,
    write: false,
    getContext: () => ({ document: formMount.document, mode: 'take' }),
    loadContext: () => {
      throw new Error('must not load')
    },
  })
  assert.equal(refused.ok, false)
  assert.equal(refused.reason, 'no_write')

  let loaded = null
  const ok = await applyLiveEditorAssist({
    kind: 'form',
    apply,
    write: true,
    getContext: () => ({ document: formMount.document, mode: 'take' }),
    loadContext: (payload) => {
      loaded = payload
    },
  })
  assert.equal(ok.ok, true)
  assert.ok(loaded && loaded.document.attempt?.responses?.[q.id])
}

{
  const mount = resolveGateToolMount({ brief: fixture, phaseId: 'ph.code' })
  assert.ok(mount && mount.kind === 'coding')
  const deniedOnly = await applyLiveEditorAssist({
    kind: 'coding',
    apply: { kind: 'coding', files: [{ path: 'tests/cases.json', contents: '{}' }] },
    write: true,
    getContext: () => mount.workspace,
    loadContext: () => {
      throw new Error('must not load hidden')
    },
  })
  assert.equal(deniedOnly.ok, false)
  assert.equal(deniedOnly.reason, 'denied_path')
}

{
  const mount = resolveGateToolMount({ brief: fixture, phaseId: 'ph.code' })
  assert.ok(mount && mount.kind === 'coding')
  const target = (mount.workspace.files ?? []).find((f) => !isDeniedCodingAssistPath(f.path))
  assert.ok(target, 'candidate coding file')
  const { Capture, resetCaptureSession, setCaptureClockForTests } = await import('./editorCapture/recorder.ts')
  let t = 2_000_000
  setCaptureClockForTests(() => t)
  resetCaptureSession()
  Capture.start({
    briefId: 'fixture:bot-edit',
    attemptId: 'local:fixture:bot-edit',
    phaseId: 'ph.code',
    kind: 'coding',
    live: mount.workspace,
  })
  t += 40
  const deniedTape = await applyLiveEditorAssist({
    kind: 'coding',
    apply: { kind: 'coding', files: [{ path: 'tests/cases.json', contents: '{}' }] },
    write: true,
    getContext: () => mount.workspace,
    loadContext: () => {
      throw new Error('must not load hidden')
    },
  })
  assert.equal(deniedTape.ok, false)
  assert.ok(
    !(Capture.peek()?.events ?? []).some((e) => e.type === 'action' && e.action === 'copilot_apply'),
    'negative: a denied apply must not record a bot edit',
  )
  let loaded = null
  t += 80
  const ok = await applyLiveEditorAssist({
    kind: 'coding',
    apply: {
      kind: 'coding',
      files: [{ path: target.path, contents: `export function solve() { return 1 }\n${'x'.repeat(80)}` }],
    },
    write: true,
    getContext: () => mount.workspace,
    loadContext: (payload) => {
      loaded = payload
    },
  })
  assert.equal(ok.ok, true)
  assert.ok(loaded, 'successful apply must load the workspace')
  t += 80
  Capture.tick({ kind: 'coding', live: loaded })
  const tape = Capture.flush()
  assert.ok(tape)
  assert.equal(
    tape.events.filter((e) => e.type === 'action' && e.action === 'copilot_apply').length,
    1,
  )
  assert.ok(
    !tape.events.some((e) => e.type === 'action' && e.action === 'paste'),
    'negative: a bot apply must not also record a paste',
  )
  setCaptureClockForTests(null)
}

{
  const mount = resolveGateToolMount({ brief: fixture, phaseId: 'ph.code' })
  assert.ok(mount && mount.kind === 'coding')
  const target = (mount.workspace.files ?? []).find((f) => !isDeniedCodingAssistPath(f.path))
  assert.ok(target, 'candidate coding file')
  const { Capture, resetCaptureSession, setCaptureClockForTests } = await import('./editorCapture/recorder.ts')
  let t = 3_000_000
  setCaptureClockForTests(() => t)
  resetCaptureSession()
  Capture.start({
    briefId: 'fixture:bot-edit-ops',
    attemptId: 'local:fixture:bot-edit-ops',
    phaseId: 'ph.code',
    kind: 'coding',
    live: mount.workspace,
  })
  const old = String(target.content ?? '')
  const next = `${old}\n${'x'.repeat(80)}`
  let loaded = null
  t += 80
  const ok = await applyCopilotPendingOps({
    kind: 'coding',
    write: true,
    ops: [{ op: 'search_replace', path: target.path, old, new: next }],
    getContext: () => mount.workspace,
    loadContext: (payload) => {
      loaded = payload
    },
  })
  assert.equal(ok.ok, true, `applyCopilotPendingOps failed: ${ok.ok === false ? ok.reason : ''}`)
  assert.ok(loaded)
  t += 80
  Capture.tick({ kind: 'coding', live: loaded })
  const tape = Capture.flush()
  assert.ok(tape)
  assert.equal(
    tape.events.filter((e) => e.type === 'action' && e.action === 'copilot_apply').length,
    1,
  )
  assert.ok(
    !tape.events.some((e) => e.type === 'action' && e.action === 'paste'),
    'negative: GateToolLive applyCopilotPendingOps must not also record a paste',
  )
  setCaptureClockForTests(null)
}

{
  const src = readFileSync(join(here, 'applyLiveEditorAssist.ts'), 'utf8')
  assert.match(src, /Capture\.action\('copilot_apply'/)
  const noteAt = src.indexOf("Capture.action('copilot_apply'")
  const loadAt = src.indexOf('await input.loadContext(merged.payload)')
  assert.ok(noteAt >= 0 && loadAt > noteAt, 'bot edit must be on the tape before loadContext')
  const page = readFileSync(join(here, '../../pages/InterviewPage.tsx'), 'utf8')
  assert.match(page, /Capture\.tick\(/)
  assert.ok(!/looksLikePaste/.test(page), 'InterviewPage must not classify paste itself')
  const live = readFileSync(join(here, '../../components/InterviewGateToolLive.tsx'), 'utf8')
  assert.match(live, /applyCopilotPendingOps/)
}

console.log('applyLiveEditorAssist.unit: ok')
