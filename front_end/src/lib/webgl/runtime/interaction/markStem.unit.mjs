/**
 * Short label stem along the surface normal; highlight radius clamp.
 * Run: npx tsx front_end/src/lib/webgl/runtime/interaction/markStem.unit.mjs
 */
import assert from 'node:assert/strict'
import { clampHighlightRadius, clampPoly, CURSOR_STEM, HIGHLIGHT_MIN, STEM_LENGTH, SURFACE_LIFT, openRing, regionFanIndices, ringCentroid, ringNewellNormal, shouldAppendStroke, simplifyStroke, strokeGapForPoly, stemTip, surfaceCirclePoints, worldDistance } from './markStem.ts'

const tip = stemTip([0, 0, 0], [0, 0, 1], 0.05)
assert.deepEqual(tip, [0, 0, 0.05])
assert.ok(CURSOR_STEM < STEM_LENGTH, 'cursor tick must be shorter than the old label stem')

assert.equal(worldDistance([0, 0, 0], [3, 4, 0]), 5)

assert.equal(clampHighlightRadius(0), HIGHLIGHT_MIN)
assert.equal(clampHighlightRadius(0.02), 0.02)
assert.ok(clampHighlightRadius(9) < 9, 'negative: huge drags must clamp')

assert.equal(shouldAppendStroke(null, [0, 0, 0]), true)
assert.equal(shouldAppendStroke([0, 0, 0], [0.02, 0, 0]), true)
assert.equal(shouldAppendStroke([0, 0, 0], [0.0002, 0, 0]), false, 'negative: a tiny jitter must not add a stroke point')

function hitPlaneY0(from, dir) {
  if (Math.abs(dir[1]) < 1e-8) return null
  const t = -from[1] / dir[1]
  if (t < 0) return null
  return [from[0] + dir[0] * t, 0, from[2] + dir[2] * t]
}

const ring = surfaceCirclePoints([0, 0, 0], [0, 1, 0], 0.1, 8, hitPlaneY0)
assert.equal(ring.length, 8)
for (const point of ring) {
  assert.ok(Math.abs(point[1] - SURFACE_LIFT) < 1e-6, 'projected ring must sit on the lifted surface')
  assert.ok(Math.abs(Math.hypot(point[0], point[2]) - 0.1) < 1e-6, 'projected ring must keep the drag radius')
}

const missed = surfaceCirclePoints([0, 0, 0], [0, 1, 0], 0.1, 4, () => null)
assert.equal(missed.length, 4)
const bogus = surfaceCirclePoints([0, 0, 0], [0, 1, 0], 0.1, 8, () => [9, 9, 9])
assert.ok(
  bogus.every((point) => Math.abs(Math.hypot(point[0], point[2]) - 0.1) > 1),
  'negative: a bogus far hit must not look like a planar radius-0.1 ring',
)

const square = [
  [0, 0, 0],
  [2, 0, 0],
  [2, 0, 2],
  [0, 0, 2],
]
assert.deepEqual(ringCentroid(square), [1, 0, 1])
assert.deepEqual(ringNewellNormal(square), [0, -1, 0])
assert.deepEqual(openRing([...square, square[0]]), square)
assert.equal(regionFanIndices(4).length, 12)
assert.deepEqual(regionFanIndices(2), [], 'negative: a two-point stroke must not fill')
assert.equal(ringCentroid(square.slice(0, 2)), null, 'negative: a line has no region centroid')

const colinear = Array.from({ length: 16 }, (_, i) => [i * 0.001, 0, 0])
assert.equal(simplifyStroke(colinear).length, 2, 'a finished stroke must drop colinear wobble')

const box = []
for (let i = 0; i < 10; i++) box.push([i / 10, 0, 0])
for (let i = 0; i < 10; i++) box.push([1, 0, i / 10])
for (let i = 0; i < 10; i++) box.push([1 - i / 10, 0, 1])
for (let i = 0; i < 10; i++) box.push([0, 0, 1 - i / 10])
const trimmedBox = simplifyStroke(box, 0.02)
assert.ok(trimmedBox.length >= 4 && trimmedBox.length <= 8, `square should stay a square, got ${trimmedBox.length}`)
assert.deepEqual(
  simplifyStroke([
    [0, 0, 0],
    [1, 0, 0],
  ]),
  [
    [0, 0, 0],
    [1, 0, 0],
  ],
  'negative: a two-point stroke is not turned into a region',
)

assert.equal(clampPoly(0), 1)
assert.equal(clampPoly(99), 8)
assert.ok(strokeGapForPoly(1) > strokeGapForPoly(8), 'low poly must sample coarser than high poly')
assert.ok(strokeGapForPoly(5) < strokeGapForPoly(1))
assert.equal(clampPoly(Number.NaN), 5, 'negative: a non-number poly must fall back to the default')

console.log('markStem: ok')
