/**
 * Mesh hover pick via R3F events; closest camera intersection in world space.
 * Run: node front_end/src/lib/webgl/runtime/interaction/useRaycastPick.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = fs.readFileSync(fileURLToPath(new URL('./useRaycastPick.ts', import.meta.url)), 'utf8')

assert.match(src, /hitFromEvent/)
assert.match(src, /pickFromIntersections/)
assert.match(src, /onPointerMove/)
assert.match(src, /onSurface\?\.\(hit\)/)
assert.match(src, /onSurface\?\.\(null\)/)
assert.doesNotMatch(
  src,
  /if \(!toolActive \|\| !onHover\) return\s+onSurface/,
  'negative: Select must still feed the cage, not only place tools',
)
assert.doesNotMatch(src, /gl\.domElement/, 'negative: hover must not use the canvas-rect camera pick that hid the cursor')
assert.doesNotMatch(src, /\?\? event\.point/, 'negative: a miss must not fall back to event.point')
assert.match(src, /isPlacePointerButton/)
assert.match(src, /nativeEvent\.button/)
assert.doesNotMatch(src, /placeHeld/, 'negative: placement must not wait on a held key')

console.log('useRaycastPick: ok')
