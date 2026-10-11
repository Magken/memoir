/**
 * White ceramic SSS. Host maps are stripped.
 * Run: npx tsx front_end/src/lib/webgl/runtime/materials/ceramicScatter.unit.mjs
 */
import assert from 'node:assert/strict'
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture } from 'three'
import { applyCeramicScatter, bakeThicknessMap, CERAMIC_MATERIAL_NAME, CERAMIC_MESH_DEFAULT, CERAMIC_SCATTER_DEFAULT, CERAMIC_SCATTER_MESH_MULT, ceramicMeshScale, createCeramicMaterial, ensureMeshUv, getCeramicMeshColor, getCeramicScatterScale, setCeramicMeshColor, setCeramicScatterScale, syncCeramicScatter } from './ceramicScatter.ts'

const geo = new BoxGeometry(1, 1, 1)
geo.deleteAttribute('uv')
ensureMeshUv(geo)
assert.ok(geo.getAttribute('uv'), 'ceramic SSS needs UVs')

const thick = bakeThicknessMap(geo)
let lo = 255
let hi = 0
for (let i = 0; i < thick.image.data.length; i += 4) {
  lo = Math.min(lo, thick.image.data[i])
  hi = Math.max(hi, thick.image.data[i])
}
assert.ok(hi > lo + 8, 'thickness varies like the bunny map, not a flat fill')
let jump = 0
const pix = thick.image.data
const size = thick.image.width
for (let y = 0; y < size; y++) {
  for (let x = 0; x < size - 1; x++) {
    jump = Math.max(jump, Math.abs(pix[(y * size + x) * 4] - pix[(y * size + x + 1) * 4]))
  }
}
assert.ok(jump < 20, `negative: thickness must not stamp square patches, jump ${jump}`)

const map = new Texture()
const mat = new MeshStandardMaterial({ color: 0xff0000, map, roughnessMap: map })
const mesh = new Mesh(geo, mat)
applyCeramicScatter(mesh)
assert.equal(mesh.material.name, CERAMIC_MATERIAL_NAME)
assert.ok(mesh.material.uniforms.map.value, 'the glaze is a white map, not the source texture')
assert.notEqual(mesh.material.uniforms.map.value, map, 'negative: the painted texture must not remain')
const ceramic = createCeramicMaterial()
assert.equal(ceramic.lights, true)
assert.equal(ceramic.fog, true)
assert.equal(ceramic.uniforms.shininess.value, 500)
assert.equal(getCeramicScatterScale(), CERAMIC_SCATTER_DEFAULT)
assert.equal(ceramic.uniforms.thicknessScale.value, CERAMIC_SCATTER_DEFAULT * CERAMIC_SCATTER_MESH_MULT, 'mesh scatter is triple the slider')
assert.ok(ceramic.uniforms.specular.value.r > 0.9, 'Phong stays a hard highlight')
assert.ok(ceramic.uniforms.diffuse.value.g < 0.35, 'the host is the SSS receiver from the bunny sample, not a white lamp')
assert.equal(ceramic.uniforms.thicknessAmbient.value, 0.4, 'ambient keeps the mesh readable in the dark')
assert.notEqual(
  ceramic.uniforms.thicknessScale.value,
  getCeramicScatterScale(),
  'negative: the slider must not be the mesh thicknessScale',
)
assert.ok(
  ceramic.uniforms.thicknessMap.value.image.width >= 64,
  'thickness must vary like bunny_thickness, not a 1×1 white',
)
assert.notEqual(ceramic.uniforms.thicknessMap.value, ceramic.uniforms.map.value, 'negative: thickness is not the glaze')

const overlay = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ color: 0x00ff00 }))
overlay.userData.webglWireOverlay = true
applyCeramicScatter(overlay)
assert.notEqual(overlay.material.name, CERAMIC_MATERIAL_NAME, 'negative: the cage must not become ceramic')

const root = new Group()
root.add(mesh)
setCeramicScatterScale(3)
assert.equal(getCeramicScatterScale(), 3)
assert.equal(ceramicMeshScale(3), 9)
syncCeramicScatter(root)
assert.equal(mesh.material.uniforms.thicknessScale.value, 9)
assert.ok(mesh.material.uniforms.thicknessAmbient.value > 0.4, 'ambient tracks the mesh scale')
const scaled = createCeramicMaterial()
assert.equal(scaled.uniforms.thicknessScale.value, 9)
setCeramicMeshColor('#00ff40')
assert.equal(getCeramicMeshColor(), '#00ff40')
syncCeramicScatter(root)
assert.ok(mesh.material.uniforms.diffuse.value.g > 0.9, 'mesh color tints the ceramic')
assert.ok(mesh.material.uniforms.diffuse.value.r < 0.1, 'negative: object/light tint must not be the mesh glaze')
setCeramicMeshColor('nope')
assert.equal(getCeramicMeshColor(), '#00ff40', 'negative: a bad hex must not clear the mesh color')
setCeramicMeshColor(CERAMIC_MESH_DEFAULT)
setCeramicScatterScale(CERAMIC_SCATTER_DEFAULT)
assert.equal(getCeramicScatterScale(), CERAMIC_SCATTER_DEFAULT)
syncCeramicScatter(root)
assert.equal(mesh.material.uniforms.thicknessScale.value, CERAMIC_SCATTER_DEFAULT * CERAMIC_SCATTER_MESH_MULT)
geo.dispose()
console.log('ceramicScatter: ok')
