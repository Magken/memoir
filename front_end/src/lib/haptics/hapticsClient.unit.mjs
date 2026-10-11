/**
 * The buzz page only accepts a port plus numbered Dots.
 * Run: node --experimental-strip-types front_end/src/lib/haptics/hapticsClient.unit.mjs
 */
import assert from 'node:assert/strict'
import { buzzBody, parseHapticDots } from './hapticsClient.ts'

const found = parseHapticDots({
  port: 'COM7',
  dots: [{ address: 1, skinTemperature: 23.5 }, { address: 2, skinTemperature: 24 }],
})
assert.equal(found.port, 'COM7')
assert.deepEqual(found.dots.map((dot) => dot.address), [1, 2])

assert.throws(() => parseHapticDots({ error: 'controller missing' }), /controller missing/)
assert.throws(() => parseHapticDots({ port: 'COM7', dots: [{ address: '1' }] }), /Bad dots response/)
assert.throws(() => parseHapticDots(null), /Bad dots response/, 'negative: an empty body is not a kit')

assert.deepEqual(buzzBody(3), { address: 3, milliseconds: 500, intensity: 1, frequency: 170 })
assert.equal('address' in buzzBody(), false, 'negative: Buzz all does not name one Dot')

console.log('hapticsClient: ok')
