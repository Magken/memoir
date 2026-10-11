/**
 * Bot notes helpers.
 * Run: npx tsx front_end/src/lib/interviewRunApi/dayMemory/botNotes.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  coercePersistNotes,
  formatStandingNotes,
  normalizeBotNotes,
  upsertBotNotes,
} from './botNotes.ts'

const merged = upsertBotNotes(
  [],
  [
    { kind: 'preferred_name', text: 'Call the candidate Sam.' },
    { kind: 'language', text: 'Prefer British English spelling.' },
  ],
  { phaseId: 'ph.1', source: 'talk' },
)
assert.equal(merged.length, 2)
assert.equal(merged[0]?.key, 'preferred_name')

const again = upsertBotNotes(
  merged,
  [{ kind: 'preferred_name', text: 'Prefer Sam over Samuel.' }],
  { source: 'assist' },
)
assert.equal(again.length, 2)
assert.ok(again[0]?.text.includes('Sam'))

const removed = upsertBotNotes(
  again,
  [{ kind: 'preferred_name', text: '', op: 'remove' }],
  { source: 'talk' },
)
assert.equal(removed.length, 1)
assert.equal(removed[0]?.kind, 'language')

const standing = formatStandingNotes(again)
assert.ok(standing && /preferred_name|Sam/i.test(standing))

const drafts = coercePersistNotes({
  persistNotes: [
    { kind: 'working_style', text: 'Keep answers short.' },
    { kind: 'preferred_name', op: 'remove' },
    { kind: 'nope', text: 'x' },
  ],
})
assert.equal(drafts.length, 2)
assert.equal(drafts[0]?.kind, 'working_style')
assert.equal(drafts[1]?.op, 'remove')

assert.equal(normalizeBotNotes(null).length, 0)
assert.equal(normalizeBotNotes(again).length, 2)

console.log('botNotes.unit: ok')
