/**
 * Blank memoir session: no objects, no splat, voice idle.
 * Run: npx tsx front_end/src/lib/memoir/session.unit.mjs
 */
import assert from 'node:assert/strict'
import { emptyMemoirSession, isBlankMemoirSession } from './session.ts'

const blank = emptyMemoirSession()

assert.equal(blank.objects.length, 0)
assert.equal(blank.splat.id, null)
assert.equal(blank.voice, 'idle')
assert.equal(isBlankMemoirSession(blank), true)

const withObject = {
  ...blank,
  objects: [{ id: 'chair', label: 'Chair' }],
}
assert.equal(
  isBlankMemoirSession(withObject),
  false,
  'negative: a session with an object is not blank',
)

const listening = { ...blank, voice: 'listening' }
assert.equal(
  isBlankMemoirSession(listening),
  false,
  'negative: a non-idle voice is not blank',
)

console.log('memoir session: ok')
