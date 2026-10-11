/**
 * Place-tool clicks vs Select (orbit). No modifier key.
 * Run: npx tsx front_end/src/lib/webgl/runtime/interaction/placeFromPointer.unit.mjs
 */
import assert from 'node:assert/strict'
import { isExpandDrag, isPlacePointerButton, isTypingTarget, shouldPlaceMark } from './placeFromPointer.ts'

assert.equal(isPlacePointerButton(0), true)
assert.equal(isPlacePointerButton(2), false, 'negative: the right button must not place')

assert.equal(
  shouldPlaceMark({ toolActive: true, down: { x: 10, y: 10 }, up: { x: 11, y: 10 } }),
  true,
  'left-click with a place tool selected places',
)

assert.equal(
  shouldPlaceMark({ toolActive: true, down: { x: 10, y: 10 }, up: { x: 11, y: 10 }, button: 2 }),
  false,
  'negative: right-click must pan, not place',
)

assert.equal(
  shouldPlaceMark({ toolActive: false, down: { x: 10, y: 10 }, up: { x: 11, y: 10 } }),
  false,
  'negative: Select tool must not place',
)

assert.equal(
  shouldPlaceMark({ toolActive: true, down: { x: 0, y: 0 }, up: { x: 20, y: 0 } }),
  false,
  'negative: a drag is orbit, not a click-place',
)

assert.equal(
  isExpandDrag({ toolActive: true, down: { x: 0, y: 0 }, now: { x: 20, y: 0 } }),
  true,
  'highlight press-drag expands',
)

assert.equal(
  isExpandDrag({ toolActive: true, down: { x: 0, y: 0 }, now: { x: 1, y: 0 } }),
  false,
  'negative: tiny move is still a click',
)

assert.equal(isTypingTarget({ tagName: 'INPUT' }), true)
assert.equal(isTypingTarget(null), false, 'negative: null is not typing')

console.log('placeFromPointer: ok')
