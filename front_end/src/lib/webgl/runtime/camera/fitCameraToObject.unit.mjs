/**
 * Fit a perspective camera to a bounding box.
 * Run: npx tsx front_end/src/lib/webgl/runtime/camera/fitCameraToObject.unit.mjs
 */
import assert from 'node:assert/strict'
import { fitCameraToObject } from './fitCameraToObject.ts'

const box = { min: [-1, -1, -1], max: [1, 1, 1] }
const fit = fitCameraToObject(box, { fov: 45, aspect: 1, padding: 1.25 })

assert.deepEqual(fit.lookAt, [0, 0, 0], `lookAt should be box center, got ${fit.lookAt}`)
assert.ok(fit.position[2] > 0, `camera should sit in +Z, got ${fit.position}`)
assert.ok(fit.far > fit.near, `far (${fit.far}) must exceed near (${fit.near})`)

const tight = fitCameraToObject(box, { padding: 1 })
const loose = fitCameraToObject(box, { padding: 3 })
const dist = (p) => Math.hypot(p[0], p[1], p[2])
assert.ok(
  dist(loose.position) > dist(tight.position),
  `negative: larger padding must back the camera up (tight ${dist(tight.position)} loose ${dist(loose.position)})`,
)

console.log('fitCameraToObject: ok')
