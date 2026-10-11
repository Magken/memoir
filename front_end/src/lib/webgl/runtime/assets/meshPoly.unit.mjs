/**
 * Poly 1–8 changes rendered triangle count (SimplifyModifier / TessellateModifier).
 * Run: npx tsx front_end/src/lib/webgl/runtime/assets/meshPoly.unit.mjs
 */
import assert from 'node:assert/strict'
import { BoxGeometry, Mesh } from 'three'
import {
  applyMeshPoly,
  polyKeepRatio,
  polyTessellatePasses,
  verticesToRemove,
} from './meshPoly.ts'

assert.equal(polyKeepRatio(5), 1, 'poly 5 is the original asset')
assert.equal(polyKeepRatio(1), 0.125, 'poly 1 matches the three.js simplifier sample default')
assert.equal(polyTessellatePasses(5), 0)
assert.equal(polyTessellatePasses(8), 3)
assert.ok(polyKeepRatio(1) < polyKeepRatio(4), 'lower poly must keep fewer vertices')

const source = new BoxGeometry(1, 1, 1, 8, 8, 8)
assert.ok(verticesToRemove(source, 1) > 0)
assert.equal(verticesToRemove(source, 5), 0, 'negative: original poly must not remove vertices')

const mesh = new Mesh(source)
const originals = new Map()
const fullCount = source.attributes.position.count

applyMeshPoly(mesh, 5, originals)
assert.equal(mesh.geometry, source, 'poly 5 must keep the imported geometry')

applyMeshPoly(mesh, 1, originals)
assert.ok(
  mesh.geometry.attributes.position.count < fullCount,
  `poly 1 must drop verts, got ${mesh.geometry.attributes.position.count} from ${fullCount}`,
)

applyMeshPoly(mesh, 8, originals)
assert.ok(
  mesh.geometry.attributes.position.count > fullCount,
  `poly 8 must add faces, got ${mesh.geometry.attributes.position.count} from ${fullCount}`,
)

applyMeshPoly(mesh, 5, originals)
assert.equal(mesh.geometry, source, 'negative: returning to 5 must restore the original, not keep a modifier')

const overlayGeo = source.clone()
const overlay = new Mesh(overlayGeo)
overlay.userData.webglWireOverlay = true
mesh.add(overlay)
const overlayCount = overlayGeo.attributes.position.count
applyMeshPoly(mesh, 1, originals)
assert.equal(
  overlay.geometry.attributes.position.count,
  overlayCount,
  'negative: Poly must not rewrite the wire overlay',
)
overlayGeo.dispose()

console.log('meshPoly: ok')
