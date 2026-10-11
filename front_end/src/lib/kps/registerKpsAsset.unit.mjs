/**
 * Viewer registration inserts one glTF row and does not duplicate it.
 * Run: npx tsx front_end/src/lib/kps/registerKpsAsset.unit.mjs
 */
import assert from 'node:assert/strict'
import { appendWebglAssetSource } from './registerKpsAsset.ts'

const source = `export const WEBGL_ASSETS = [
  {
    id: 'gras-letters',
    label: 'GRAS',
    kind: 'text',
    units: 'm',
    upAxis: 'y',
  },
]

export function getWebglAsset(id: string) {
  return id
}
`

const once = appendWebglAssetSource(source, {
  id: 'office-chair',
  label: "Chair's seat",
  path: '/3d/kps/ast_test/assets/chair/chair.glb',
})
assert.match(once, /id: 'office-chair'/)
assert.match(once, /kind: 'gltf'/)
assert.match(once, /units: 'm'/)
assert.equal(once.indexOf("id: 'office-chair'"), once.lastIndexOf("id: 'office-chair'"))

const twice = appendWebglAssetSource(once, {
  id: 'office-chair',
  label: 'Office chair',
  path: '/3d/kps/ast_test/assets/chair/chair.glb',
})
assert.equal(twice, once, 'negative: a second register does not insert another row')

assert.throws(
  () =>
    appendWebglAssetSource(source, {
      id: '../nope',
      label: 'Nope',
      path: '/3d/kps/ast_test/chair.glb',
    }),
  /kebab-case/,
  'negative: a path-like id is rejected',
)

console.log('registerKpsAsset: ok')
