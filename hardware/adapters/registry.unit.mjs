/**
 * SDK slots: voice is filled with Sensory TSSV, the rest stay empty; unknown slots are rejected.
 * Run: npx tsx hardware/adapters/registry.unit.mjs
 */
import assert from 'node:assert/strict'
import { emptyMemoirSession } from '../../front_end/src/lib/memoir/session.ts'
import { applyAdapterResult, readSdkRegistry } from './contract.ts'
import {
  authenticateArgs,
  enrollArgs,
  parseTranscript,
  speechArgs,
  triggerArgs,
  tssvLicenseActive,
  TSSV_LICENSE_EXPIRES,
} from '../sdk/voice/tssv.ts'

const registry = readSdkRegistry()
const ids = registry.slots.map((slot) => slot.id)

assert.deepEqual(ids, ['voice', 'splat-capture', 'object-gen'])
const voice = registry.slots.find((slot) => slot.id === 'voice')
assert.equal(voice.status, 'filled')
assert.equal(voice.package, 'sensory-tssv@3.15.11')
for (const slot of registry.slots.filter((entry) => entry.id !== 'voice')) {
  assert.equal(slot.status, 'empty')
  assert.equal(slot.package, null, `${slot.id} must not name a package yet`)
}

const session = emptyMemoirSession()
const listening = applyAdapterResult(session, { slotId: 'voice', voice: 'listening' })
assert.equal(listening.voice, 'listening', 'the voice slot writes the voice state')
assert.equal(session.voice, 'idle', 'negative: the input session is not mutated')
assert.equal(applyAdapterResult(session, { slotId: 'voice' }), session, 'no voice field leaves the session as is')
assert.equal(
  applyAdapterResult(session, { slotId: 'object-gen', voice: 'speaking' }),
  session,
  'negative: an empty slot cannot write the voice state',
)
assert.throws(
  () => applyAdapterResult(session, { slotId: 'missing' }),
  /Unknown hardware slot: missing/,
  'negative: a slot that is not in the registry is rejected',
)

assert.deepEqual(speechArgs('a.wav', 'm.mod'), ['--model', 'm.mod', '--mode', 'stream', '--input-file', 'a.wav'])
assert.deepEqual(triggerArgs('a.wav', 't.trg'), ['--trigger-model', 't.trg', '--threshold', 'MEDIUM', 'a.wav'])
assert.deepEqual(triggerArgs('a.wav', 't.trg', 'LOWEST', 'r.trg').slice(2, 4), ['--revalidation-model', 'r.trg'])
assert.ok(enrollArgs('user1', ['e1.wav'], 'u.bin').includes('+user1'))
assert.throws(() => enrollArgs('bad user', ['e1.wav'], 'u.bin'), /User id/, 'negative: unsafe user id')
assert.throws(() => enrollArgs('user1', [], 'u.bin'), /at least one/, 'negative: no recordings')
assert.deepEqual(authenticateArgs('c.wav', 'u.bin').slice(-1), ['c.wav'])
assert.equal(
  parseTranscript('   scoring key      : client1\n   hypothesis       : yes it was gabriel himself\n   total CPU time   : 1.70 seconds\n'),
  'yes it was gabriel himself',
)
assert.equal(parseTranscript('   scoring key : client1\n'), '', 'negative: no hypothesis line, no words')
assert.equal(tssvLicenseActive(new Date('2026-10-31T00:00:00Z')), true)
assert.equal(tssvLicenseActive(new Date(TSSV_LICENSE_EXPIRES)), false, 'negative: dead at the expiry instant')

console.log('hardware registry: ok')
