/**
 * Spawn beside Home look-at; copy includes Euler orientation.
 * Run: npx tsx front_end/src/lib/webgl/runtime/helpers/referencePointerLayout.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  REFERENCE_POINTER_KIND,
  REFERENCE_POINTER_OFFSET,
  REFERENCE_POINTER_ROTATION,
  referencePointerHome,
  referencePointerLabel,
  serializeReferencePointer,
} from './referencePointerLayout.ts'

const home = [0.07, 0.31, 0]
const beside = referencePointerHome(home)
assert.deepEqual(beside, [0.07 + REFERENCE_POINTER_OFFSET[0], 0.31, 0])
assert.notDeepEqual(beside, home, 'negative: sitting on Home look-at hides the pin inside the subject')
assert.equal(referencePointerLabel('scene'), 'Scene tag')
assert.equal(referencePointerLabel('item'), 'Item tag')
assert.deepEqual(REFERENCE_POINTER_ROTATION, [0, 0, 0])

const json = serializeReferencePointer(
  { position: [1, 2, 3], rotation: [0, 1.57, 0] },
  'scene',
)
assert.match(json, /"kind": "webgl-reference-pointer"/)
assert.match(json, /"tag": "scene"/)
assert.match(json, /"position": \[\s*1,\s*2,\s*3\s*\]/)
assert.match(json, /"rotation": \[\s*0,\s*1\.57,\s*0\s*\]/)
assert.deepEqual(JSON.parse(json).rotation, [0, 1.57, 0])
assert.notEqual(REFERENCE_POINTER_KIND, 'webgl-scene-session')

const dir = path.dirname(fileURLToPath(import.meta.url))
const names = fs.readdirSync(dir)
assert.equal(
  names.filter((name) => name.toLowerCase() === 'referencepointer.ts').length,
  0,
  'negative: a referencePointer.ts sibling steals the component URL on Windows',
)
assert.ok(names.includes('ReferencePointer.tsx'))
assert.ok(names.includes('referencePointerLayout.ts'))

const src = fs.readFileSync(path.join(dir, 'ReferencePointer.tsx'), 'utf8')
assert.match(src, /PivotControls/)
assert.match(src, /disableScaling/)
assert.match(src, /poseFromMatrix/)
assert.match(src, /onPose/)
assert.match(src, /wrapperClass="theme-webgl-toolkit__mark-label-wrap"/)
assert.match(src, /pointerEvents="none"/)
assert.match(src, /annotations=\{false\}/)
assert.doesNotMatch(
  src,
  /annotations=\{selected\}/,
  'negative: PivotControls annotation Html has no pass-through wrap and covers the stage',
)
assert.doesNotMatch(
  src,
  /disableRotations/,
  'negative: rotation rings must stay on so orientation can be copied',
)
assert.doesNotMatch(
  src,
  /OrbitControls/,
  'negative: the pointer must not replace the scene orbit camera',
)

console.log('referencePointerLayout: ok')
