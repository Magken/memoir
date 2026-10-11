/**
 * Camera frustum line strips.
 * Run: npx tsx front_end/src/lib/webgl/runtime/helpers/frustumLines.unit.mjs
 */
import assert from 'node:assert/strict'
import { frustumLineStrips } from './frustumLines.ts'

const strips = frustumLineStrips([0, 0, 2], [0, 0, 0], 0.1)
assert.equal(strips.length, 5, 'four eye rays plus the near rect')
assert.deepEqual(strips[0][0], [0, 0, 2], 'strips start at the camera')
assert.ok(strips[4].length === 5, 'near rect is closed')

const degenerate = frustumLineStrips([0, 1, 0], [0, 0, 0], 0.1)
assert.equal(degenerate.length, 5, 'straight-down look still yields a frustum')

const empty = frustumLineStrips([0, 0, 0], [0, 0, 0], 0.1)
assert.equal(empty.length, 5)
assert.notEqual(empty[1][1][0], undefined)

const bad = frustumLineStrips([1, 0, 0], [2, 0, 0], 0)
assert.ok(
  bad.every((strip) => strip.length >= 2),
  'zero size still returns segments',
)

console.log('frustumLines: ok')
