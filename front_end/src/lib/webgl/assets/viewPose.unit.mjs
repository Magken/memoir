/**
 * View / region pose helpers.
 * Run: npx tsx front_end/src/lib/webgl/assets/viewPose.unit.mjs
 */
import assert from 'node:assert/strict'
import { WEBGL_SPACE } from '../runtime/space/webglSpace.ts'
import { homeViewPose, INSPECT_LOOK_M, INSPECT_MIN_POLAR, isNearPoint, poseForAnnotation, regionFromRing, stampLiveViewpoint, VIEW_HOME_ID, VIEW_HOME_MARK_ID } from './viewPose.ts'

assert.equal(VIEW_HOME_ID, '__home__')
assert.equal(VIEW_HOME_MARK_ID, 'viewpoint-home')
const home = homeViewPose()
assert.deepEqual(home.position, [...WEBGL_SPACE.cameraHome])
assert.deepEqual(home.target, [...WEBGL_SPACE.lookAt])

const bakedHome = homeViewPose([
  {
    id: VIEW_HOME_MARK_ID,
    kind: 'viewpoint',
    position: [0.07, 0.31, 0],
    camera: [-0.56, 0.42, -0.15],
    target: [0.07, 0.31, 0],
  },
])
assert.deepEqual(bakedHome.position, [-0.56, 0.42, -0.15])
assert.deepEqual(bakedHome.target, [0.07, 0.31, 0])

assert.deepEqual(
  homeViewPose([{ id: VIEW_HOME_MARK_ID, kind: 'point', position: [1, 1, 1], camera: [9, 9, 9] }]).position,
  [...WEBGL_SPACE.cameraHome],
  'negative: a non-viewpoint mark must not become Home',
)

const fromCamera = poseForAnnotation({
  position: [0, 0.5, 0],
  camera: [2, 1, 3],
  target: [0, 0.4, 0],
})
assert.deepEqual(fromCamera.position, [2, 1, 3])
assert.deepEqual(fromCamera.target, [0, 0.4, 0])

const fromNormal = poseForAnnotation({
  position: [0, 0, 0],
  normal: [0, 0, 1],
})
assert.ok(Math.abs(fromNormal.position[2] - INSPECT_LOOK_M) < 1e-9)
assert.deepEqual(fromNormal.target, [0, 0, 0])
assert.ok(Math.abs((fromNormal.orbit?.polar ?? 0) - Math.PI / 2) < 1e-9)

const fromZenith = poseForAnnotation({
  position: [0, 0, 0],
  normal: [0, 1, 0],
})
assert.equal(fromZenith.orbit?.polar, INSPECT_MIN_POLAR)
assert.ok((fromZenith.orbit?.polar ?? 0) > 0.3)
assert.notEqual(
  fromZenith.orbit?.polar,
  0,
  'negative: a +Y normal must not seat lookAt on the up axis',
)

const region = regionFromRing([
  [0, 0, 0],
  [2, 0, 0],
  [0, 2, 0],
])
assert.equal(region.position[0], 2 / 3)
assert.equal(region.position[1], 2 / 3)
assert.ok(region.radius > 1)

assert.equal(isNearPoint([0, 0, 0], [0.01, 0, 0], 0.045), true)
assert.equal(isNearPoint([0, 0, 0], [1, 0, 0], 0.045), false)

assert.throws(() => regionFromRing([[0, 0, 0], [1, 0, 0]]), /region needs 3 points/)

const fromOrbit = poseForAnnotation({
  position: [0, 0.5, 0],
  camera: [9, 9, 9],
  target: [0.07, 0.31, 0],
  orbit: { azimuth: 1.3844037240810663, polar: 1.745419226128741, radius: 0.5968191022951148 },
})
assert.ok(fromOrbit.position[0] > 0, 'orbit heading wins over a stale camera xyz')
assert.notDeepEqual(fromOrbit.position, [9, 9, 9], 'negative: stale world xyz must not override orbit heading')

const stamped = stampLiveViewpoint(
  [
    { id: VIEW_HOME_MARK_ID, kind: 'viewpoint', label: 'Home', position: [0, 0.5, 0], camera: [1, 1, 1], target: [0, 0, 0] },
    { id: 'point-1', kind: 'point', label: 'pt', position: [0, 0, 0] },
  ],
  VIEW_HOME_ID,
  {
    position: [0.65, 0.21, 0.11],
    target: [0.07, 0.31, 0],
    orbit: { azimuth: 1.38, polar: 1.74, radius: 0.6 },
    up: [0, 1, 0],
  },
)
assert.deepEqual(stamped[0].camera, [0.65, 0.21, 0.11])
assert.equal(stamped[0].orbit?.azimuth, 1.38)
assert.equal(stamped[1].kind, 'point')
assert.equal(stamped[1].camera, undefined, 'negative: Copy must not stamp a point mark')

console.log('viewPose: ok')
