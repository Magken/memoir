/**
 * Static JSON cage lookup. Mesh assets match the registry; volumes stay out.
 * Run: npx tsx front_end/src/lib/webgl/assets/wireBakes.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { WEBGL_ASSETS } from './assetManifest.ts'
import { WIRE_CAGE_NODE_BUDGET } from '../runtime/materials/wireObject.ts'
import {
  bakedWireIds,
  getWireBake,
  meshAssetsNeedingWireBake,
} from './wireBakes.ts'

const src = fs.readFileSync(fileURLToPath(new URL('./wireBakes.ts', import.meta.url)), 'utf8')
assert.doesNotMatch(src, /extractWireMesh/, 'negative: lookup must not walk a mesh')
assert.doesNotMatch(src, /GLTFLoader/)

const needed = meshAssetsNeedingWireBake()
  .map((asset) => asset.id)
  .sort()
assert.deepEqual([...bakedWireIds()].sort(), needed, 'every mesh asset must have a wire bake import')
assert.equal(
  needed.includes('volumetric-cloud'),
  false,
  'negative: a volume has no triangle cage',
)
assert.equal(getWireBake('volumetric-cloud'), undefined)

assert.equal(
  needed.includes('gras-letters'),
  false,
  'negative: GRAS letters are lamps, not a triangle cage',
)
assert.equal(getWireBake('gras-letters'), undefined)

assert.equal(
  needed.includes('about-us-letters'),
  false,
  'negative: About Us letters are lamps, not a triangle cage',
)
assert.equal(getWireBake('about-us-letters'), undefined)

for (const asset of WEBGL_ASSETS) {
  if (asset.kind === 'gltf' || asset.kind === 'primitive') {
    const bake = getWireBake(asset.id)
    assert.ok(bake, `${asset.id} must have a wire bake`)
    assert.equal(bake.assetId, asset.id)
    assert.ok(bake.meshes.length >= 1)
  }
}

const box = getWireBake('builtin-box')
assert.ok(box)
assert.equal(box.meshes[0].nodes.length / 3, 8)

const liberty = getWireBake('statue-of-liberty')
assert.ok(liberty)
assert.equal(liberty.assetId, 'statue-of-liberty')
assert.equal(liberty.meshes.length, 3, 'the lighter Liberty glTF has three meshes')
const libertyNodes = liberty.meshes.reduce((sum, mesh) => sum + mesh.nodes.length / 3, 0)
assert.ok(libertyNodes > 400, `Liberty cage is too thin, got ${libertyNodes} nodes`)
assert.ok(
  libertyNodes <= WIRE_CAGE_NODE_BUDGET,
  `negative: Liberty must stay at or under the cage budget ${WIRE_CAGE_NODE_BUDGET}, got ${libertyNodes}`,
)
assert.ok(liberty.meshes.length < 8, 'negative: the 8-mesh 29 MB source must not return')
const owlCage = getWireBake('statue-of-an-owl')
assert.ok(owlCage)
assert.equal(owlCage.assetId, 'statue-of-an-owl')
assert.equal(owlCage.meshes.length, 1)
assert.equal(owlCage.meshes[0].objectName, 'Object_2')
const owlNodes = owlCage.meshes.reduce((sum, mesh) => sum + mesh.nodes.length / 3, 0)
assert.ok(owlNodes > 400, `owl cage is too thin, got ${owlNodes} nodes`)
assert.ok(
  owlNodes <= WIRE_CAGE_NODE_BUDGET,
  `negative: the owl must stay at or under the cage budget ${WIRE_CAGE_NODE_BUDGET}, got ${owlNodes}`,
)
assert.notEqual(owlCage.assetId, 'statue-of-liberty', 'negative: the owl must not reuse the Liberty cage')
const monkeyCage = getWireBake('darwins-monkey')
assert.ok(monkeyCage)
assert.equal(monkeyCage.assetId, 'darwins-monkey')
assert.equal(monkeyCage.meshes.length, 1)
assert.equal(monkeyCage.meshes[0].objectName, 'Object_2')
const monkeyNodes = monkeyCage.meshes.reduce((sum, mesh) => sum + mesh.nodes.length / 3, 0)
assert.ok(monkeyNodes > 400, `monkey cage is too thin, got ${monkeyNodes} nodes`)
assert.ok(
  monkeyNodes <= WIRE_CAGE_NODE_BUDGET,
  `negative: the monkey must stay at or under the cage budget ${WIRE_CAGE_NODE_BUDGET}, got ${monkeyNodes}`,
)
assert.notEqual(monkeyCage.assetId, 'statue-of-an-owl', 'negative: the monkey must not reuse the owl cage')
const lanternCage = getWireBake('stone-lantern')
assert.ok(lanternCage)
assert.equal(lanternCage.assetId, 'stone-lantern')
assert.equal(lanternCage.meshes.length, 1)
assert.equal(lanternCage.meshes[0].objectName, 'defaultMaterial')
const lanternNodes = lanternCage.meshes.reduce((sum, mesh) => sum + mesh.nodes.length / 3, 0)
assert.ok(lanternNodes > 400, `lantern cage is too thin, got ${lanternNodes} nodes`)
assert.ok(
  lanternNodes <= WIRE_CAGE_NODE_BUDGET,
  `negative: the lantern must stay at or under the cage budget ${WIRE_CAGE_NODE_BUDGET}, got ${lanternNodes}`,
)
assert.notEqual(lanternCage.assetId, 'darwins-monkey', 'negative: the lantern must not reuse the monkey cage')
const adam = getWireBake('the-creation-of-adam')
assert.ok(adam)
const adamNodes = adam.meshes.reduce((sum, mesh) => sum + mesh.nodes.length / 3, 0)
assert.ok(adamNodes <= WIRE_CAGE_NODE_BUDGET)
assert.equal(adamNodes, 6250, 'Adam stays at its exact cage — the budget must not coarsen it')

assert.equal(getWireBake('no-such-asset'), undefined, 'negative: unknown assets have no invented cage')

console.log('wireBakes: ok')
