/**
 * Screen 0–1 / viewport % ↔ world metres.
 * Run: npx tsx front_end/src/lib/webgl/runtime/space/screenMap.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  cameraDistance,
  frustumSliceMeters,
  screenToWorldAtDistance,
  screenToWorldOnGround,
  worldAtViewportPercent,
  worldToScreen,
} from './screenMap.ts'

const alongZ = {
  position: [0, 0, 5],
  target: [0, 0, 0],
  fov: 90,
  aspect: 1,
}

assert.ok(Math.abs(cameraDistance(alongZ) - 5) < 1e-9)
const originScreen = worldToScreen([0, 0, 0], alongZ)
assert.ok(Math.abs(originScreen.x - 0.5) < 1e-6, `look-at should be screen center, got ${originScreen.x}`)
assert.ok(Math.abs(originScreen.y - 0.5) < 1e-6, `look-at should be screen center y, got ${originScreen.y}`)
assert.equal(originScreen.visible, true)
assert.ok(Math.abs(originScreen.depth - 5) < 1e-6)

const mid = screenToWorldAtDistance({ x: 0.5, y: 0.5 }, alongZ, 5)
assert.ok(mid, 'center ray must return a point')
assert.ok(Math.hypot(mid[0], mid[1], mid[2]) < 1e-5, `center at look distance should be origin, got ${mid}`)

const right = worldAtViewportPercent(75, 50, alongZ)
assert.ok(right, '75% viewport must map')
assert.ok(right[0] > 0, `75% width must sit in +X, got ${right}`)
const rightBack = worldToScreen(right, alongZ)
assert.ok(Math.abs(rightBack.x - 0.75) < 1e-5, `round-trip 75% x, got ${rightBack.x}`)
assert.ok(Math.abs(rightBack.y - 0.5) < 1e-5, `round-trip 50% y, got ${rightBack.y}`)

const slice = frustumSliceMeters(alongZ, 5)
assert.ok(slice.height > slice.width * 0.5, '90° fov at 5 m is a wide slice')

const groundCam = {
  position: [0, 2, 5],
  target: [0, 0, 0],
  fov: 45,
  aspect: 1,
}
const groundHit = screenToWorldOnGround({ x: 0.5, y: 0.5 }, groundCam)
assert.ok(groundHit, 'center ray should hit the ground')
assert.ok(Math.abs(groundHit[1]) < 1e-5, `ground hit y must be 0, got ${groundHit[1]}`)
assert.ok(Math.hypot(groundHit[0], groundHit[2]) < 0.15, `center ground hit near origin, got ${groundHit}`)

assert.equal(
  screenToWorldOnGround({ x: 0.5, y: 0.5 }, alongZ),
  null,
  'negative: a camera parallel to the ground must not invent a hit',
)
assert.equal(
  screenToWorldAtDistance({ x: 0.5, y: 0.5 }, alongZ, 0),
  null,
  'negative: distance 0 is not a world point in front of the camera',
)

const behind = worldToScreen([0, 0, 10], alongZ)
assert.equal(behind.visible, false, 'negative: a point behind the camera is not on screen')

console.log('screenMap: ok')
