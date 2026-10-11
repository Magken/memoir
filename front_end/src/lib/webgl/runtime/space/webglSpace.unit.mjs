/**
 * Toolkit space SSOT.
 * Run: node front_end/src/lib/webgl/runtime/space/webglSpace.unit.mjs
 */
import assert from 'node:assert/strict'
import { WEBGL_SPACE, isOnGround, viewportPercent } from './webglSpace.ts'

assert.equal(WEBGL_SPACE.unit, 'm')
assert.equal(WEBGL_SPACE.up, 'y')
assert.equal(WEBGL_SPACE.groundY, 0)
assert.equal(WEBGL_SPACE.lookAt[1] > WEBGL_SPACE.groundY, true, 'lookAt must sit above the ground plane')
assert.equal(WEBGL_SPACE.lights.key[1] > WEBGL_SPACE.groundY, true, 'key light must be above the ground')
assert.deepEqual(viewportPercent(75, 50), { x: 0.75, y: 0.5 })
assert.equal(isOnGround(0), true)
assert.equal(isOnGround(-0.5), false, 'negative: a buried subject is not on the ground')

console.log('webglSpace: ok')
