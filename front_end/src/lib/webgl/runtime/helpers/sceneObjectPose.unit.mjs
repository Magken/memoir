/**
 * Scene object copy payload is pointer-shaped plus scale.
 * Run: npx tsx front_end/src/lib/webgl/runtime/helpers/sceneObjectPose.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { SCENE_OBJECT_POSE_KIND, serializeSceneObjectPose } from './sceneObjectPose.ts'

const json = serializeSceneObjectPose('projects', 'owl', {
  position: [0.1, 0.2, 0.3],
  rotation: [0, 0.5, 0],
  scale: [0.2, 0.2, 0.2],
})
const payload = JSON.parse(json)
assert.equal(payload.kind, SCENE_OBJECT_POSE_KIND)
assert.equal(payload.sceneId, 'projects')
assert.equal(payload.objectId, 'owl')
assert.deepEqual(payload.position, [0.1, 0.2, 0.3])
assert.deepEqual(payload.rotation, [0, 0.5, 0])
assert.deepEqual(payload.scale, [0.2, 0.2, 0.2])
assert.equal(payload.tag, undefined, 'negative: scene objects are not pointer tags')
assert.notEqual(SCENE_OBJECT_POSE_KIND, 'webgl-reference-pointer', 'negative: object copy must not reuse the pointer kind')

const src = fs.readFileSync(fileURLToPath(new URL('./SceneObjectGizmo.tsx', import.meta.url)), 'utf8')
assert.match(src, /disableScaling=\{false\}/)
assert.match(src, /PivotControls/)
assert.doesNotMatch(src, /disableScaling=\{true\}/, 'negative: scene objects must be resizable')
assert.doesNotMatch(
  src,
  /from '\.\/sceneObjectPose'[\s\S]{0,40}ReferencePointer/,
  'negative: the object gizmo is not the locator pin',
)

console.log('sceneObjectPose: ok')
