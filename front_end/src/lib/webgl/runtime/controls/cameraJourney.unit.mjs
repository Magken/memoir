/**
 * Camera journeys orbit the look-at instead of teleporting or cutting through the mesh.
 * Run: npx tsx front_end/src/lib/webgl/runtime/controls/cameraJourney.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  easeInOutCubic,
  journeyEase,
  JOURNEY_DAMP,
  flipOrbit,
  isOrbitFrameHandle,
  JOURNEY_MAX_S,
  JOURNEY_METRE_S,
  JOURNEY_MIN_S,
  journeyDuration,
  lerpPose,
  lerpTriple,
  orbitDrivesCamera,
  orbitFromPose,
  orbitSpan,
  poseDistance,
  poseFromOrbit,
  poseFromOrbitHandle,
  poseFromLiveOrbit,
  poseKey,
  shortestAngle,
} from './cameraJourney.ts'

const from = {
  position: [-0.5054449693328621, 0.20935624209362158, -0.10912691270966193],
  target: [0.07211756881207634, 0.3130456736689876, -0.00020925034262128808],
}
const zoomed = {
  position: [-0.5660976514074321, 0.25424870888960405, -0.12515496691836872],
  target: [0.07464488770995359, 0.3115124494980408, -0.004322719429604285],
}

assert.equal(easeInOutCubic(0), 0)
assert.equal(easeInOutCubic(1), 1)
assert.equal(journeyEase(0), 0)
assert.equal(journeyEase(1), 1)
assert.ok(journeyEase(0.9) < easeInOutCubic(0.9), 'View hops must linger into the stop like a Play crane')
assert.notEqual(JOURNEY_DAMP, 0, 'negative: a View hop without damp is the cubic punch')

const homeOrbit = orbitFromPose(from)
const zoomOrbit = orbitFromPose(zoomed)
assert.ok(
  Math.abs(shortestAngle(homeOrbit.azimuth, zoomOrbit.azimuth)) < 0.05,
  'a same-heading zoom keeps azimuth',
)
assert.ok(zoomOrbit.radius > homeOrbit.radius)
const zoomedHop = lerpPose(from, zoomed, 1)
assert.ok(poseDistance(zoomedHop, zoomed) < 1e-6)

const capturedBack = {
  position: [0.46060052924629785, 0.006298760296870376, 0.06340836206686079],
  target: [0.05028552835531321, 0.27856532646983845, 0.0024437998666976247],
}
assert.ok(from.position[0] * capturedBack.position[0] < 0, 'captured back of scene is the other side of the model')
assert.ok(Math.abs(shortestAngle(homeOrbit.azimuth, orbitFromPose(capturedBack).azimuth)) > 2.5)
assert.ok(poseDistance(lerpPose(from, capturedBack, 1), capturedBack) < 1e-6)

const back = poseFromOrbit(flipOrbit(homeOrbit))
assert.ok(Math.abs(shortestAngle(homeOrbit.azimuth, orbitFromPose(back).azimuth)) > 3)
assert.ok(from.position[0] * back.position[0] < 0, '180° heading is the other side of the model')

const start = lerpPose(from, back, 0)
assert.ok(poseDistance(start, from) < 1e-9)
const end = lerpPose(from, back, 1)
assert.ok(poseDistance(end, back) < 1e-6)

const mid = lerpPose(from, back, 0.5)
const midRadius = Math.hypot(
  mid.position[0] - from.target[0],
  mid.position[1] - from.target[1],
  mid.position[2] - from.target[2],
)
assert.ok(
  Math.abs(midRadius - homeOrbit.radius) < 0.02,
  `a 180° journey must ride the orbit sphere, got radius ${midRadius}`,
)
const linearMid = {
  position: lerpTriple(from.position, back.position, 0.5),
  target: from.target,
}
const linearRadius = Math.hypot(
  linearMid.position[0] - from.target[0],
  linearMid.position[1] - from.target[1],
  linearMid.position[2] - from.target[2],
)
assert.ok(
  midRadius > linearRadius + 0.15,
  'negative: a world-XYZ lerp would cut through the sculpture on a 180° hop',
)

assert.equal(JOURNEY_MIN_S, 0.35)
assert.equal(JOURNEY_MAX_S, 1.5)
assert.equal(JOURNEY_METRE_S, 0.74)
assert.notEqual(JOURNEY_MIN_S, 0.44, 'negative: hops must not keep the slower 0.44 s floor')
assert.notEqual(JOURNEY_MAX_S, 1.9, 'negative: hops must not keep the slower 1.9 s cap')
assert.equal(JOURNEY_DAMP, 0.06)
assert.notEqual(JOURNEY_DAMP, 0.075, 'negative: View hop linger must not keep the heavier damp')
assert.equal(journeyDuration(from, from), 0)
const duration = journeyDuration(from, back)
assert.ok(duration >= JOURNEY_MIN_S, `got ${duration}`)
assert.ok(duration <= JOURNEY_MAX_S, `got ${duration}`)
assert.ok(orbitSpan(homeOrbit, flipOrbit(homeOrbit)) > 1)

assert.notEqual(poseKey(from), poseKey(back))

const handle = {
  target: { x: 0.07, y: 0.31, z: 0 },
  getAzimuthalAngle: () => 1.2,
  getPolarAngle: () => 1.4,
  getDistance: () => 0.8,
}
assert.equal(isOrbitFrameHandle(handle), true)
assert.equal(isOrbitFrameHandle({ target: { x: 0, y: 0, z: 0 } }), false, 'negative: xyz alone is not an orbit frame')
const cam = { id: 'visible' }
assert.equal(orbitDrivesCamera({ object: cam }, cam), true)
assert.equal(orbitDrivesCamera({ object: { id: 'canvas-default' } }, cam), false, 'negative: leftover canvas camera is not the visible camera')
assert.equal(orbitDrivesCamera({ target: { x: 0, y: 0, z: 0 } }, cam), false)
const framed = poseFromOrbitHandle(handle)
assert.equal(framed.orbit.azimuth, 1.2)
assert.equal(framed.orbit.radius, 0.8)
assert.ok(Math.abs(framed.pose.position[0] - poseFromOrbit({ ...framed.orbit, target: [0.07, 0.31, 0] }).position[0]) < 1e-12)

const live = poseFromLiveOrbit(handle, from)
assert.equal(live.orbit.azimuth, 1.2)
assert.notEqual(poseKey(live.pose), poseKey(from), 'live orbit must not keep the Home pose')
const missing = poseFromLiveOrbit(null, from)
assert.equal(poseKey(missing.pose), poseKey(from), 'negative: without an orbit handle, capture would stay Home')

const journeySrc = fs.readFileSync(fileURLToPath(new URL('./cameraJourney.ts', import.meta.url)), 'utf8')
assert.match(journeySrc, /const u = journeyEase\(t\)/)
assert.doesNotMatch(
  journeySrc,
  /const u = easeInOutCubic\(t\)/,
  'negative: View hops must not keep the cubic punch',
)

const loader = fs.readFileSync(
  fileURLToPath(new URL('../../../../components/webglToolkit/WebglAssetLoader.tsx', import.meta.url)),
  'utf8',
)
assert.match(loader, /ViewpointFly/)
assert.doesNotMatch(loader, /function ViewpointFly/, 'negative: the fly must live in ViewpointFly.tsx so scenes can reuse it')

const fly = fs.readFileSync(fileURLToPath(new URL('./ViewpointFly.tsx', import.meta.url)), 'utf8')
assert.match(fly, /export function ViewpointFly/)
assert.match(fly, /useFrame/)
assert.match(fly, /lerpPose\(/)
assert.match(fly, /orbitDrivesCamera/)
assert.match(fly, /if \(!orbitDrivesCamera\(controls, camera\)\) \{\s*invalidate\(\)/)
assert.match(fly, /lastTicket/)
assert.match(fly, /onTripRef/)
assert.doesNotMatch(
  fly,
  /\[onTrip\]/,
  'negative: onTrip in effect deps calls false on every parent render and re-enables ACM mid-hop',
)
assert.doesNotMatch(fly, /lastKey/, 'negative: poseKey lastKey skips Home until another viewpoint is clicked')
assert.doesNotMatch(
  fly,
  /useLayoutEffect\(\(\) => \{\s*if \(!pose\) return\s*camera\.position\.set\(\.\.\.pose\.position\)/,
  'negative: a mark or viewpoint must not teleport the camera',
)
assert.doesNotMatch(
  fly,
  /if \(!pose\) return\s*const key = poseKey/,
  'negative: Home must not stamp lastKey before OrbitControls exist',
)

console.log('cameraJourney: ok')
