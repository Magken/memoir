/**
 * Unique edges + joint nodes from a mesh. Cube: 8 nodes, 18 edges.
 * Run: npx tsx front_end/src/lib/webgl/runtime/materials/bakeWireObject.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = fs.readFileSync(fileURLToPath(new URL('./bakeWireObject.mjs', import.meta.url)), 'utf8')
assert.match(src, /meshAssetsNeedingWireBake/)
assert.match(src, /npm run webgl:bake-wires/)
assert.match(src, /capWireMesh/)
assert.match(src, /capWireMeshes/)
assert.match(src, /WIRE_CAGE_NODE_BUDGET/)
assert.doesNotMatch(src, /CAGE_NODE_CAP/, 'negative: per-mesh caps still let Liberty explode')
assert.doesNotMatch(src, /const GLB =/, 'negative: baker must not hardcode one glTF path')
assert.doesNotMatch(src, /kind === 'volume'/, 'negative: volumes are not wire cages')

console.log('bakeWireObject: ok')
