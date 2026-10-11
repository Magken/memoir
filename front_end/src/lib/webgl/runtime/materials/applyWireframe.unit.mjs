/**
 * Baked cage lookup. Never extracts live geometry.
 * Run: npx tsx front_end/src/lib/webgl/runtime/materials/applyWireframe.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { BoxGeometry, Group, InstancedMesh, Mesh, MeshStandardMaterial } from 'three'
import { applyWireframe } from './applyWireframe.ts'
import { getWireBake } from '../../assets/wireBakes.ts'
import { setWireLightColor } from './wireLights.ts'

const src = fs.readFileSync(fileURLToPath(new URL('./applyWireframe.ts', import.meta.url)), 'utf8')
assert.match(src, /getWireLightColor\(\)/)
assert.doesNotMatch(src, /WIRE_LIGHT_DEFAULT/, 'negative: a new cage must not be born at the full default lamp')
assert.doesNotMatch(src, /extractWireMesh\(/, 'negative: page load must not walk the live mesh')
assert.doesNotMatch(src, /WireframeGeometry/, 'negative: live WireframeGeometry is a regenerate-every-load path')
assert.doesNotMatch(src, /worldUnits/, 'negative: world-space line width swallowed the joint nodes')
assert.doesNotMatch(src, /LineSegments2/)

const bake = getWireBake('builtin-box')
assert.ok(bake)
assert.equal(bake.meshes[0].nodes.length / 3, 8)
assert.equal(bake.meshes[0].edges.length / 2, 18)

const adam = getWireBake('the-creation-of-adam')
assert.ok(adam)
assert.ok(adam.meshes.length >= 1)
assert.ok(
  adam.meshes.some((mesh) => mesh.nodes.length / 3 > 8 && mesh.edges.length / 2 > 12),
  'Adam bake must store the cage, not an empty stub',
)

const box = new BoxGeometry(1, 1, 1)
const mat = new MeshStandardMaterial({ color: 0x334155, wireframe: false })
const mesh = new Mesh(box, mat)
const root = new Group()
root.add(mesh)
setWireLightColor('#112233')
applyWireframe(root, 'builtin-box')
assert.equal(mat.wireframe, false)
const overlay = mesh.children[0]
assert.ok(overlay)
const nodes = overlay.getObjectByName('wire-nodes')
const lines = overlay.getObjectByName('wire-lines')
assert.ok(nodes instanceof InstancedMesh)
assert.equal(nodes.material.color.getHexString(), '112233')
assert.notEqual(nodes.material.color.getHexString(), 'f2c48a', 'negative: the opening cage must not flash the full lamp')
assert.ok(lines instanceof InstancedMesh)
assert.equal(nodes.instanceMatrix.array.length / 16, 8)
assert.equal(lines.instanceMatrix.array.length / 16, 18)
assert.equal(nodes.count, 0, 'negative: dark joints must not draw')
assert.equal(lines.count, 0, 'negative: links stay off until a wave or hover steps')
assert.equal(mesh.material.name, 'ceramic-scatter', 'the host is ceramic, not the imported paint')

applyWireframe(root, 'no-such-asset')
assert.equal(mesh.children.length, 0, 'negative: a missing bake must not invent live geometry')

applyWireframe(root, 'builtin-box')
assert.equal(mesh.children.length, 1)

assert.equal(applyWireframe.length, 2)

const subjects = fs.readFileSync(
  fileURLToPath(new URL('../../../../components/webglToolkit/WebglSubjects.tsx', import.meta.url)),
  'utf8',
)
assert.match(subjects, /applyWireframe\(clone, assetId\)/)
assert.match(subjects, /applyWireframe\(node, 'builtin-box'\)/)

const loader = fs.readFileSync(
  fileURLToPath(new URL('../../../../components/webglToolkit/WebglAssetLoader.tsx', import.meta.url)),
  'utf8',
)
assert.match(loader, /assetId=\{assetId\}/)
assert.match(loader, /assetId=\{asset\?\.id \?\? 'builtin-box'\}/)

box.dispose()
mat.dispose()
console.log('applyWireframe: ok')
