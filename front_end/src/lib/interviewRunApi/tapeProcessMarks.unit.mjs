/**
 * Process job: tape_process Edge then digest fallback. Never includes assist-use.
 * Run: npx tsx front_end/src/lib/interviewRunApi/tapeProcessMarks.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterTurnTemplateIds } from './buildTalkContext.ts'
import { digestProcessGrains, fillProcessGrainsFromTape } from './tapeProcessMarks.ts'
import { emptyInterviewResponse, saveInterviewResponse } from './interviewResponse.ts'
import { saveEditorTape, clearEditorTapes } from './editorCapture/store.ts'

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

const digestOnly = digestProcessGrains({
  hostRef: 'tool.code',
  processIds: ['mark.code.approach.v1', 'mark.assist.use.v1'],
  digest: null,
})
assert.deepEqual(afterTurnTemplateIds(['mark.code.approach.v1']), [])
assert.ok(digestOnly['mark.code.approach.v1'])
assert.ok(!digestOnly['mark.assist.use.v1'])

const briefId = 'fixture:tape-process'
clearEditorTapes(briefId)
saveInterviewResponse(emptyInterviewResponse(briefId))
saveEditorTape({
  schema: 'vurify/editor-tape',
  schemaVersion: 1,
  briefId,
  attemptId: 'a',
  phaseId: 'ph.code',
  kind: 'coding',
  startedAt: '2026-08-21T00:00:00.000Z',
  endedAt: '2026-08-21T00:01:00.000Z',
  durationMs: 20000,
  initial: { files: [] },
  final: { files: [] },
  events: [
    { t: 400, type: 'action', action: 'run' },
    { t: 12000, type: 'action', action: 'paste' },
  ],
})

const llmTrail =
  'They opened with a run at 0:00 then sat idle until a paste at 0:12. The idle bucket is empty time, not coding. A second burst follows the stall. The trail cites those buckets rather than hidden tests. Planfulness is mixed because the stall is long. Debugging shows as the early run, not a later rewrite.'

let capturedKind = ''
let capturedAim = null
const llm = await fillProcessGrainsFromTape({
  briefId,
  phaseId: 'ph.code',
  hostRef: 'tool.code',
  processIds: ['mark.code.approach.v1'],
  tapeKind: 'coding',
  aim: { phaseTitle: 'Two sum', phaseInstructions: 'Return indices of two numbers that add to target.' },
  assess: async ({ body }) => {
    capturedKind = String(body.kind)
    capturedAim = body.aim
    assert.equal(body.kind, 'tape_process')
    assert.ok(body.timelineIndex)
    assert.ok(!JSON.stringify(body.timelineIndex).includes('SECRET'))
    return {
      grains: {
        'mark.code.approach.v1': {
          templateId: 'mark.code.approach.v1',
          hostRef: 'tool.code',
          grain: 'after_tool',
          order: 20,
          status: 'filled',
          result: { tags: [{ t: 400, label: 'First run' }] },
          justification: llmTrail,
          evidence: ['run at 0:00'],
          evidenceRefs: [{ kind: 'tape_action', ref: 'run', t: 400 }],
          confidence: 'med',
        },
      },
      package: null,
    }
  },
})
assert.equal(capturedKind, 'tape_process')
assert.equal(capturedAim?.phaseTitle, 'Two sum')
assert.equal(llm.source, 'llm')
assert.equal(llm.grains['mark.code.approach.v1'].justification, llmTrail)
assert.equal(llm.grains['mark.assist.use.v1'], undefined)

const failed = await fillProcessGrainsFromTape({
  briefId,
  phaseId: 'ph.code',
  hostRef: 'tool.code',
  processIds: ['mark.code.approach.v1'],
  tapeKind: 'coding',
  assess: async () => {
    throw new Error('missing_openai_key')
  },
})
assert.equal(failed.source, 'digest')
assert.ok(
  !String(failed.grains['mark.code.approach.v1'].justification).includes(
    'Process read from the session tape digest',
  ),
)
assert.match(failed.grains['mark.code.approach.v1'].justification, /run|tape|paste/i)
assert.ok(failed.grains['mark.code.approach.v1'].result?.boardSummary)
assert.ok(Array.isArray(failed.grains['mark.code.approach.v1'].result?.bucketNotes))

clearEditorTapes(briefId)

const completeSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'completeSection.ts'), 'utf8')
assert.match(
  completeSrc,
  /aim:\s*assessAimForPhase\(brief,\s*input\.phaseId\)/,
  'section complete must send the aim on tape_process, not only on coding_bundle',
)

console.log('tapeProcessMarks.unit.mjs: ok')
