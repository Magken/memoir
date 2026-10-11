/**
 * Arrow + ADS pan; W is not a pan key. Screen pan moves camera and target together.
 * Run: npx tsx front_end/src/lib/webgl/runtime/controls/keyPan.unit.mjs
 */
import assert from 'node:assert/strict'
import { PerspectiveCamera, Vector3 } from 'three'
import { panOrbitByPixels, panPixelsForCode } from './keyPan.ts'

assert.deepEqual(panPixelsForCode('ArrowLeft'), panPixelsForCode('KeyA'))
assert.deepEqual(panPixelsForCode('ArrowRight'), panPixelsForCode('KeyD'))
assert.deepEqual(panPixelsForCode('ArrowDown'), panPixelsForCode('KeyS'))
assert.ok(panPixelsForCode('ArrowUp'))
assert.equal(panPixelsForCode('KeyW'), null, 'negative: W must not pan')
assert.equal(panPixelsForCode('KeyE'), null, 'negative: an unbound key must not pan')

const camera = new PerspectiveCamera(50, 1, 0.1, 100)
camera.position.set(0, 0, 5)
camera.lookAt(0, 0, 0)
camera.updateMatrixWorld()
const target = new Vector3(0, 0, 0)
const moved = panOrbitByPixels(camera, target, 10, 0, 200)
assert.equal(moved, true)
assert.ok(target.x < 0, `ArrowLeft must slide the look-at left, got x=${target.x}`)
assert.ok(camera.position.x < 0, 'camera must travel with the look-at')
assert.ok(Math.abs(camera.position.z - 5) < 1e-6, 'distance along the view must stay put')

const untouched = new Vector3(0, 0, 0)
const skipped = panOrbitByPixels(new PerspectiveCamera(50, 1, 0.1, 100), untouched, 10, 0, 0)
assert.equal(skipped, false, 'negative: a zero-height host must not pan')
assert.equal(untouched.x, 0)

console.log('keyPan: ok')
