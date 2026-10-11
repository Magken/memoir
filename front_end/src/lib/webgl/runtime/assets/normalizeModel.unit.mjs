/**
 * Center / scale / sit-on-ground for a loaded mesh box.
 * Run: npx tsx front_end/src/lib/webgl/runtime/assets/normalizeModel.unit.mjs
 */
import assert from 'node:assert/strict'
import { normalizeModelTransform } from './normalizeModel.ts'

const unit = normalizeModelTransform({ min: [-2, -1, -2], max: [2, 1, 2] }, { targetSize: 1 })
assert.ok(Math.abs(unit.scale - 0.25) < 1e-9, `scale should be 1/4, got ${unit.scale}`)
assert.deepEqual(unit.rotation, [0, 0, 0])
const worldMinY = -1 * unit.scale + unit.position[1]
assert.ok(Math.abs(worldMinY) < 1e-9, `default sitOnGround must rest min Y on 0, got ${worldMinY}`)

const zUp = normalizeModelTransform({ min: [0, 0, 0], max: [2, 2, 2] }, { upAxis: 'z' })
assert.ok(Math.abs(zUp.rotation[0] + Math.PI / 2) < 1e-9, 'Z-up must pitch −90°')
assert.ok(zUp.position[1] >= -1e-9, `Z-up sitOnGround must not bury the mesh, got y=${zUp.position[1]}`)

const empty = normalizeModelTransform({ min: [0, 0, 0], max: [0, 0, 0] })
assert.ok(empty.scale > 0, 'negative: a degenerate box must not yield scale 0')
assert.ok(Number.isFinite(empty.scale), `negative: scale must be finite, got ${empty.scale}`)

const centered = normalizeModelTransform({ min: [-2, -1, -2], max: [2, 1, 2] }, { sitOnGround: false })
assert.ok(
  Math.abs(centered.position[1]) < 1e-9,
  `negative: sitOnGround false must keep the box centered (clipped by y=0), got ${centered.position[1]}`,
)

console.log('normalizeModel: ok')
