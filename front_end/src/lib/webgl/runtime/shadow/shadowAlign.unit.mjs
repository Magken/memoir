/**
 * Key light sits above the ground catcher in toolkit space.
 * Run: npx tsx front_end/src/lib/webgl/runtime/shadow/shadowAlign.unit.mjs
 */
import assert from 'node:assert/strict'
import { WEBGL_SPACE } from '../space/webglSpace.ts'
import { SHADOW_ALIGN, keyLightOffset } from './shadowAlign.ts'

assert.equal(SHADOW_ALIGN.groundY, WEBGL_SPACE.groundY)
assert.deepEqual(SHADOW_ALIGN.key, WEBGL_SPACE.lights.key)
const offset = keyLightOffset()
assert.ok(offset[1] > 0, `key light must be above its target, dy=${offset[1]}`)
assert.equal(SHADOW_ALIGN.target[1], WEBGL_SPACE.groundY)

const buried = { ...SHADOW_ALIGN, key: [4, -1, 5] }
assert.ok(buried.key[1] < SHADOW_ALIGN.groundY, 'negative: a key light under the ground is misaligned')

console.log('shadowAlign: ok')
