/**
 * Tape digest leak + cadence units.
 * Run: npx tsx front_end/src/lib/interviewRunApi/editorCapture/tapeDigest.unit.mjs
 */
import assert from 'node:assert/strict'
import { digestEditorTape, digestHasSecretLeak } from './tapeDigest.ts'

const tape = {
  schema: 'vurify/editor-tape',
  schemaVersion: 1,
  briefId: 'b',
  attemptId: 'a',
  phaseId: 'ph.code',
  kind: 'coding',
  startedAt: '2026-08-21T00:00:00.000Z',
  endedAt: '2026-08-21T00:01:00.000Z',
  durationMs: 60000,
  initial: { files: [] },
  final: {
    files: [
      { path: 'src/solve.ts', language: 'typescript', content: 'ok' },
      { path: 'tests/cases.json', language: 'json', content: '{"expected":"HIDDEN"}' },
    ],
  },
  events: [
    { t: 0, type: 'action', action: 'open_file', detail: { path: 'src/solve.ts' } },
    { t: 400, type: 'action', action: 'paste', detail: { path: 'src/solve.ts' } },
    { t: 900, type: 'action', action: 'run' },
    {
      t: 1200,
      type: 'checkpoint',
      checkpoint: { answerKey: 'SECRET', files: [{ path: 'src/solve.ts' }] },
    },
  ],
}

const digest = digestEditorTape(tape)
assert.ok(digest)
assert.equal(digestHasSecretLeak(digest), false)
assert.ok(!JSON.stringify(digest).includes('answerKey'))
assert.ok(!JSON.stringify(digest).includes('HIDDEN'))
assert.ok(!digest.filesTouched?.some((p) => p.includes('cases.json')))
assert.ok(digest.filesTouched?.includes('src/solve.ts'))
assert.equal(digest.cadence.tickCount >= 3, true)
assert.equal(digest.patchCount, 0)
assert.ok(digest.actions.some((a) => a.action === 'run'))

{
  const patched = digestEditorTape({
    ...tape,
    events: [
      {
        t: 200,
        type: 'patch',
        patches: [{ op: 'replace', path: 'src/solve.ts' }],
      },
    ],
  })
  assert.equal(patched?.patchCount, 1)
  assert.ok(patched?.filesTouched?.includes('src/solve.ts'))
}

{
  const starter = digestEditorTape({
    ...tape,
    events: [{ t: 0, type: 'checkpoint', checkpoint: { files: [{ path: 'src/solve.ts' }] } }],
  })
  assert.equal(starter?.patchCount, 0)
  assert.ok(!starter?.filesTouched?.length, 'negative: starter snapshot files are not work')
}

console.log('tapeDigest.unit.mjs: ok')
