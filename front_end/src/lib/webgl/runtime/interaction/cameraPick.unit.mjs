/**
 * Camera-through-cursor picking: NDC from the canvas, closest mesh, world point.
 * Run: npx tsx front_end/src/lib/webgl/runtime/interaction/cameraPick.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Raycaster,
} from 'three'
import {
  findPickRoot,
  firstMeshHit,
  ndcFromClient,
  pickFromIntersections,
  pickRootFromCamera,
  worldNormalFromFace,
} from './cameraPick.ts'

const ndc = ndcFromClient(50, 25, { left: 0, top: 0, width: 100, height: 100 })
assert.equal(ndc.x, 0)
assert.equal(ndc.y, 0.5)

assert.deepEqual(ndcFromClient(0, 0, { left: 0, top: 0, width: 0, height: 0 }), { x: 0, y: 0 }, 'negative: empty rect is center')

assert.deepEqual(worldNormalFromFace({ x: 0, y: 0, z: 1 }, { elements: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] }), [
  0, 0, 1,
])

const lineOnly = firstMeshHit([{ point: { x: 9, y: 9, z: 9 }, object: { isMesh: false, type: 'Line' } }])
assert.equal(lineOnly, null, 'negative: a line hit must not become a surface pick')

const line2 = firstMeshHit([{ point: { x: 9, y: 9, z: 9 }, object: { isMesh: true, type: 'Line2' } }])
assert.equal(line2, null, 'negative: Line2 is a Mesh and must still be skipped')
assert.equal(
  firstMeshHit([
    {
      point: { x: 1, y: 1, z: 1 },
      object: { isMesh: true, type: 'InstancedMesh', userData: { webglWireOverlay: true } },
    },
  ]),
  null,
  'negative: surface-style nodes must not steal a pick',
)

const pickRoot = new Group()
pickRoot.userData.webglPickRoot = true
assert.equal(findPickRoot(pickRoot), pickRoot)
assert.equal(findPickRoot(new Group()), null, 'negative: a scene without the subject flag must not be a pick root')

assert.equal(
  pickFromIntersections([{ point: { x: 1, y: 2, z: 3 }, object: { isMesh: true, visible: true, name: 'Hand' } }])?.objectName,
  'Hand',
)

const group = new Group()
group.scale.setScalar(0.01)
const mesh = new Mesh(new BoxGeometry(100, 100, 100), new MeshBasicMaterial())
group.add(mesh)
group.updateMatrixWorld(true)

const camera = new PerspectiveCamera(50, 1, 0.1, 100)
camera.position.set(0, 0, 3)
camera.lookAt(0, 0, 0)
camera.updateMatrixWorld()

const hit = pickRootFromCamera(camera, group, { x: 0, y: 0 }, new Raycaster())
assert.ok(hit, 'center camera ray must hit the scaled box')
assert.equal(hit.object, mesh)
assert.ok(
  Math.hypot(hit.point[0], hit.point[1], hit.point[2]) < 2,
  `world hit must sit on the visible model, not in raw glTF units, got ${hit.point.join(',')}`,
)

const miss = pickRootFromCamera(camera, group, { x: 0.99, y: 0.99 }, new Raycaster())
assert.equal(miss, null, 'negative: a ray that misses the mesh must not pick')

console.log('cameraPick: ok')
