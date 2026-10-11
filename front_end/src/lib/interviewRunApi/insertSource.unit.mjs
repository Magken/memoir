/**
 * Bot edit vs in-app paste vs outside paste — do not confound the three.
 * Run: npx tsx front_end/src/lib/interviewRunApi/insertSource.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  classifyTapeInsert,
  insertIncidentKind,
  insertMarksFromIncidents,
  insertSourceLabel,
  uniqueInsertActions,
} from './insertSource.ts'

const applyThenSplice = uniqueInsertActions([
  { t: 400, action: 'run' },
  { t: 12000, action: 'copilot_apply', detail: { files: 1 } },
  { t: 12120, action: 'paste', detail: { path: 'src/solve.ts', chars: 80 } },
])
assert.equal(applyThenSplice.length, 1, `got ${applyThenSplice.length}`)
assert.equal(applyThenSplice[0].action, 'copilot_apply')
assert.equal(classifyTapeInsert(applyThenSplice[0].action), 'bot_edit')
assert.ok(
  !applyThenSplice.some((a) => a.action === 'paste'),
  'negative: a bot edit must not also count as a paste',
)

const internalRoute = uniqueInsertActions([
  { t: 8000, action: 'paste_route', detail: { from: 'internal', label: 'internal_assist_help', srcSurface: 'chat' } },
  { t: 8100, action: 'paste', detail: { chars: 40 } },
])
assert.equal(internalRoute.length, 1)
assert.equal(classifyTapeInsert(internalRoute[0].action, internalRoute[0].detail), 'internal_paste')
assert.equal(insertSourceLabel('internal_paste'), 'In-app paste')

const externalRoute = uniqueInsertActions([
  { t: 9000, action: 'paste_route', detail: { from: 'external', label: 'external_dump' } },
])
assert.equal(classifyTapeInsert(externalRoute[0].action, externalRoute[0].detail), 'external_paste')
assert.equal(insertIncidentKind('external_paste'), 'paste')
assert.equal(insertIncidentKind('internal_paste'), 'paste_internal')
assert.equal(insertIncidentKind('bot_edit'), 'apply')

const laterPaste = uniqueInsertActions([
  { t: 1000, action: 'copilot_apply' },
  { t: 8000, action: 'paste_route', detail: { from: 'external' } },
])
assert.equal(laterPaste.length, 2, 'negative: a paste seconds after a bot edit is still a paste')
assert.equal(laterPaste[1].action, 'paste_route')

const marks = insertMarksFromIncidents([
  { kind: 'apply', t: 1, sectionId: 'ph.code' },
  { kind: 'paste_internal', t: 2, sectionId: 'ph.code' },
  { kind: 'paste', t: 3, sectionId: 'ph.code' },
  { kind: 'leave', t: 4, sectionId: 'ph.code' },
])
assert.deepEqual(
  marks.map((m) => m.source),
  ['bot_edit', 'internal_paste', 'external_paste'],
)
assert.equal(insertSourceLabel('bot_edit'), 'Bot edit')
assert.equal(insertSourceLabel('external_paste'), 'Outside paste')

console.log('insertSource.unit.mjs: ok')
