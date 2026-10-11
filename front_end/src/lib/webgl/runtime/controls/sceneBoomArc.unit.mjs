/**
 * Boom-arc crane: one smooth orbit-space move — up, around, drop.
 * Stills are a shape reference, not corners. Not world-Y, not a View hop.
 * Run: npx tsx front_end/src/lib/webgl/runtime/controls/sceneBoomArc.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  lerpPose,
  lerpTriple,
  orbitFromPose,
  poseDistance,
  poseFromOrbit,
  shortestAngle,
} from './cameraJourney.ts'
import { bakedSceneDoc, sceneViewPose } from '../../assets/sceneDoc.ts'
import {
  BOOM_ARC_DURATION,
  BOOM_ARC_HOLD,
  BOOM_ARC_HOME_START,
  BOOM_ARC_IMPULSE_T,
  BOOM_ARC_PEAK_T,
  BOOM_ARC_SLOWMO,
  cosineEase,
  craneEase,
  homeBlendStart,
  journeyEase,
  posesFromWaypoints,
  sampleBoomArc,
  settleEase,
  slowMoMid,
  yawAlong,
} from './sceneBoomArc.ts'

const landing = bakedSceneDoc('landing')
assert.ok(!('error' in landing), 'landing scene must parse')
const crane = !('error' in landing) ? landing.cameraMotions[0] : undefined
assert.equal(crane?.id, 'back-to-front')
assert.equal(crane?.waypoints?.length, 5, 'captured stills remain as the shape reference')
assert.equal(BOOM_ARC_DURATION, 4)
assert.equal(BOOM_ARC_HOLD, 0.5)
assert.equal(BOOM_ARC_SLOWMO, 0.06)
assert.notEqual(BOOM_ARC_DURATION, 5, 'negative: default crane must not keep the slower 5 s')
assert.notEqual(BOOM_ARC_HOLD, 0.6, 'negative: default hold must not keep the slower 0.6 s')
assert.notEqual(BOOM_ARC_SLOWMO, 0.075, 'negative: slow-mo must not keep the heavier linger')
assert.equal(crane?.duration, 4)
assert.equal(crane?.hold, 0.5)
assert.ok((crane?.hold ?? 0) > 0, 'negative: landing must pause before the crane')

const from = {
  position: [0.46060052924629785, 0.006298760296870376, 0.06340836206686079],
  target: [0.05028552835531321, 0.27856532646983845, 0.0024437998666976247],
}
const to = {
  position: [-0.5054449693328621, 0.20935624209362158, -0.10912691270966193],
  target: [0.07211756881207634, 0.3130456736689876, -0.00020925034262128808],
}
const waypoints = posesFromWaypoints(crane?.waypoints ?? [])

assert.equal(slowMoMid(0), 0)
assert.equal(slowMoMid(1), 1)
assert.ok(Math.abs(cosineEase(0)) < 1e-12)
assert.ok(Math.abs(cosineEase(1) - 1) < 1e-12)
assert.equal(settleEase(0.5), 0.5)
const cosineCruise = 0.5 - 0.5 * Math.cos(Math.PI * 0.2)
assert.ok(settleEase(0.2) < cosineCruise, 'the start ramps up; a cosine cruise leaves too hard')
assert.ok(settleEase(0.8) > 1 - cosineCruise, 'the end ramps down; a cosine cruise arrives too hard')
assert.notEqual(settleEase(0.2), 0.2, 'negative: a linear clock is a constant speed')
assert.ok(Math.abs(cosineEase(0.2) - cosineCruise) < 1e-12, 'the boom orbit keeps landing’s cosine')
assert.ok(
  craneEase(0.2) < slowMoMid(cosineEase(0.2)),
  'a crane leaves softer than a cosine cruise',
)
assert.ok(Math.abs(craneEase(0)) < 1e-12)
assert.ok(Math.abs(craneEase(1) - 1) < 1e-12)

const start = sampleBoomArc(from, to, 0, waypoints)
const end = sampleBoomArc(from, to, 1, waypoints)
assert.ok(poseDistance(start, from) < 1e-8, `t=0 must be the back pose, got ${start.position}`)
assert.ok(poseDistance(end, to) < 1e-6, `t=1 must be Home, got ${end.position}`)

const STEPS = 40
const samples = Array.from({ length: STEPS + 1 }, (_, i) => {
  const t = i / STEPS
  const pose = sampleBoomArc(from, to, t, waypoints)
  return { t, pose, orbit: orbitFromPose(pose) }
})

const ys = samples.map((row) => row.pose.position[1])
const polars = samples.map((row) => row.orbit.polar)
const yMaxAt = ys.indexOf(Math.max(...ys))
assert.ok(yMaxAt > 8 && yMaxAt < STEPS - 8, 'the boom peaks in the middle of the shot')
const polarMinAt = polars.indexOf(Math.min(...polars))
assert.ok(polarMinAt > 8 && polarMinAt < STEPS - 8, 'polar has one high point in the middle')

function signChanges(values) {
  let changes = 0
  let prev = Math.sign(values[1] - values[0])
  for (let i = 2; i < values.length; i += 1) {
    const next = Math.sign(values[i] - values[i - 1])
    if (next === 0 || prev === 0) {
      if (next !== 0) prev = next
      continue
    }
    if (next !== prev) {
      changes += 1
      prev = next
    }
  }
  return changes
}

assert.equal(signChanges(ys), 1, 'height is one arch — up then down, no extra jerks')
assert.equal(signChanges(polars), 1, 'polar is one valley — no copied-still bounce')

const az0 = samples[0].orbit.azimuth
let unwrapped = az0
for (let i = 1; i < samples.length; i += 1) {
  const step = shortestAngle(samples[i - 1].orbit.azimuth, samples[i].orbit.azimuth)
  assert.ok(step >= -1e-6, 'azimuth advances one way around Adam')
  unwrapped += step
}
assert.ok(Math.abs(unwrapped - az0) > 2.8, 'the around is a ~180° yaw')

const rise = samples[Math.round(0.2 * STEPS)]
assert.ok(rise.pose.position[1] > from.position[1] + 0.12, 'camera is already booming up')
assert.ok(Math.abs(shortestAngle(rise.orbit.azimuth, az0)) > 0.12, 'yaw is inside the boom, not a later beat')
assert.ok(
  Math.hypot(...rise.pose.target.map((n, i) => n - from.target[i])) < 1e-6,
  'look-at stays on Adam through the rise',
)

const peak = sampleBoomArc(from, to, 0.5, waypoints)
const peakOrbit = orbitFromPose(peak)
assert.ok(peak.position[1] > 0.62, 'mid-arc is above the sculpture')
assert.ok(peakOrbit.polar < 0.45, 'mid-arc is high, not a polar lerp toward Home')
assert.ok(Math.abs(peakOrbit.radius - 0.49618964202819127) < 0.02, 'peak stays on the back orbit sphere')
assert.ok(
  Math.hypot(...peak.target.map((n, i) => n - from.target[i])) < 1e-6,
  'look-at does not lerp toward Home during the 180',
)

const late = sampleBoomArc(from, to, 0.82, waypoints)
assert.ok(late.position[0] < 0, 'the drop is already on the Home side')

const orbitMid = lerpPose(from, to, 0.5)
assert.ok(
  Math.abs(orbitFromPose(orbitMid).polar - peakOrbit.polar) > 1,
  'negative: lerping polar start→Home never goes overhead',
)
const fakeOldY = orbitMid.position[1] + 0.52
assert.ok(Math.abs(peak.position[1] - fakeOldY) > 0.08, 'negative: extra world-Y on a chord is the rejected boom')

function yawDelta(t0, t1) {
  return Math.abs(
    shortestAngle(
      orbitFromPose(sampleBoomArc(from, to, t0, waypoints)).azimuth,
      orbitFromPose(sampleBoomArc(from, to, t1, waypoints)).azimuth,
    ),
  )
}
assert.ok(yawDelta(0.48, 0.54) < yawDelta(0.22, 0.28), 'mid-turn yaw is slower than the shoulders')

function piecewiseStills(t) {
  const keys = [from, ...waypoints, to]
  const u = Math.min(1, Math.max(0, t))
  const n = keys.length - 1
  const x = u * n
  const i = Math.min(n - 1, Math.floor(x))
  const f = x - i
  const a = orbitFromPose(keys[i])
  const b = orbitFromPose(keys[i + 1])
  return poseFromOrbit({
    target: lerpTriple(a.target, b.target, f),
    radius: a.radius + (b.radius - a.radius) * f,
    polar: a.polar + (b.polar - a.polar) * f,
    azimuth: a.azimuth + shortestAngle(a.azimuth, b.azimuth) * f,
  })
}

const stillPeakDelta = Math.abs(
  orbitFromPose(piecewiseStills(0.5)).polar - orbitFromPose(piecewiseStills(2 / 3)).polar,
)
const smoothPeakDelta = Math.abs(
  peakOrbit.polar - orbitFromPose(sampleBoomArc(from, to, 2 / 3, waypoints)).polar,
)
assert.ok(
  smoothPeakDelta < stillPeakDelta * 0.55,
  'negative: snapping off the zenith still is the up-down jerk',
)
assert.ok(BOOM_ARC_HOME_START > 0.5, 'Home look-at waits until the around is done')
assert.equal(BOOM_ARC_PEAK_T, 0.5)
assert.ok(BOOM_ARC_IMPULSE_T < BOOM_ARC_PEAK_T, 'the cage poke starts on the rise, not at the polar peak')
assert.ok(BOOM_ARC_IMPULSE_T > 0.25, 'negative: the poke must not fire at the start of the boom')

const sampler = fs.readFileSync(fileURLToPath(new URL('./sceneBoomArc.ts', import.meta.url)), 'utf8')
assert.doesNotMatch(sampler, /lift \* Math\.sin/, 'negative: the old sin-π world-Y boom must stay gone')
assert.doesNotMatch(sampler, /BACK_TO_FRONT_KNOTS/, 'negative: knot-to-knot stills are not the motion')

const src = fs.readFileSync(fileURLToPath(new URL('./SceneMotionFly.tsx', import.meta.url)), 'utf8')
assert.match(src, /sampleBoomArc/)
assert.match(src, /export function SceneMotionFly/)
assert.match(
  src,
  /if \(!orbitDrivesCamera\(controls, camera\)\) \{\s*invalidate\(\)/,
  'a copy hop must keep the demand loop alive until OrbitControls drives the visible camera',
)
assert.match(src, /onPeak/)
assert.match(src, /hold = 0/)
assert.match(src, /slowMoAt \?\? 0\.5/)
assert.match(src, /journeyEase/)
assert.match(src, /reverse = false/)
assert.match(src, /impulseAt !== undefined/)
assert.match(src, /current\.seated = true/)
assert.match(src, /impulseAt <= 0/)
assert.match(
  src,
  /if \(current\.age < wait\) \{[\s\S]*?step !== 0 && impulseAt !== undefined && impulseAt <= 0[\s\S]*?onPeak/,
  'a parked crane does not poke the cage until the rate is live',
)
assert.doesNotMatch(
  src,
  /if \(!current\.seated\) \{[^}]*impulseAt !== undefined && impulseAt <= 0 && clock\.t <= 0 && peakedFor/,
  'negative: seating at rate 0 must not fire the torch pulse before the mesh exists',
)
assert.doesNotMatch(
  src,
  /impulseAt = BOOM_ARC_IMPULSE_T/,
  'negative: a copy arch must not inherit the landing cage poke',
)
assert.match(src, /reverse \? 1 - t : t/, 'inset→canvas plays the arch backward')
assert.match(src, /kind === 'journey'/, 'Footer Top to Home is a View-style lerp')
assert.match(src, /lerpPose\(/)
assert.match(
  src,
  /kind === 'journey'[\s\S]*lerpPose\([\s\S]*sampleBoomArc\(/,
  'journey hops with lerpPose; boom-arc still samples the crane',
)
assert.doesNotMatch(
  src,
  /t >= BOOM_ARC_PEAK_T/,
  'negative: the fingertip poke must not wait for the polar peak',
)
assert.doesNotMatch(src, /lift \* /, 'negative: world-Y lift is not the boom')

const footerScene = bakedSceneDoc('footer')
assert.ok(!('error' in footerScene), 'footer scene must parse')
if (!('error' in footerScene)) {
  const footerTop = sceneViewPose(footerScene, 'entrance-start')
  const footerHome = sceneViewPose(footerScene)
  const hopMid = lerpPose(footerTop, footerHome, 0.5)
  const boomMid = sampleBoomArc(footerTop, footerHome, 0.5, [], 0.5)
  assert.ok(
    poseDistance(hopMid, boomMid) > 0.05,
    'negative: Footer Top to Home must not boom-yaw then dump into Home',
  )
  assert.equal(footerScene.cameraMotions[0]?.kind, 'journey')
  assert.notEqual(footerScene.cameraMotions[0]?.kind, 'boom-arc')
  assert.ok(
    journeyEase(0.15, 0.1) < 0.15,
    'Footer slow-mo at the lamp top holds early progress back',
  )
  assert.equal(journeyEase(0.4), 0.4, 'negative: a hop with no slowMoAt stays linear')
}

const about = bakedSceneDoc('about')
assert.ok(!('error' in about), 'about scene must parse')
const aboutCrane = !('error' in about) ? about.cameraMotions[0] : undefined
assert.equal(aboutCrane?.from, 'flame-top')
assert.equal(aboutCrane?.to, 'home')
assert.equal(aboutCrane?.duration, 4)
assert.equal(aboutCrane?.hold, 0.7)
assert.notEqual(aboutCrane?.hold, 0.9, 'negative: About hold must not keep the slower 0.9 s')
assert.equal(aboutCrane?.slowMoAt, 0.72)
assert.equal(aboutCrane?.impulseAt, 0)
assert.notEqual(aboutCrane?.impulseAt, 0.36, 'negative: torch poke is the hold, not the Adam rise')
assert.equal(aboutCrane?.waypoints?.length, 2)
assert.equal(
  aboutCrane?.waypoints?.[1]?.orbit.azimuth,
  -2.3422751054280777,
  'last remaining still is the around key, not the near-Home duplicate',
)
assert.notEqual(aboutCrane?.waypoints?.length, 3, 'negative: the near-Home still must not sit in front of Home')
assert.notEqual(aboutCrane?.slowMoAt, 0.5, 'negative: About linger is not landing mid-turn')

if (!('error' in about)) {
  const aboutFrom = sceneViewPose(about, 'flame-top')
  const aboutTo = sceneViewPose(about)
  const aboutWay = posesFromWaypoints(aboutCrane?.waypoints ?? [])
  const linger = aboutCrane?.slowMoAt ?? 0.72
  assert.ok(poseDistance(sampleBoomArc(aboutFrom, aboutTo, 0, aboutWay, linger), aboutFrom) < 1e-8)
  assert.ok(poseDistance(sampleBoomArc(aboutFrom, aboutTo, 1, aboutWay, linger), aboutTo) < 1e-6)
  const aboutStartOrbit = orbitFromPose(aboutFrom)
  const aboutEndOrbit = orbitFromPose(aboutTo)
  const along = yawAlong(aboutStartOrbit, aboutEndOrbit, aboutWay)
  const short = shortestAngle(aboutStartOrbit.azimuth, aboutEndOrbit.azimuth)
  assert.ok(along < 0, 'About yaws the captured way around Liberty')
  assert.ok(Math.abs(along) > Math.abs(short) + 0.5, 'About follows the Path, not the short from→Home arc')
  assert.notEqual(Math.sign(along), Math.sign(short), 'negative: the short arc is the wrong around')
  const aboutMidPolar = orbitFromPose(sampleBoomArc(aboutFrom, aboutTo, 0.5, aboutWay, linger)).polar
  assert.ok(aboutMidPolar > 0.5, 'About stays at torch height through the around')
  assert.ok(
    aboutMidPolar < aboutStartOrbit.polar + 0.2,
    'negative: About must not invent an overhead boom like landing',
  )
  function aboutYawDelta(t0, t1) {
    return Math.abs(
      shortestAngle(
        orbitFromPose(sampleBoomArc(aboutFrom, aboutTo, t0, aboutWay, linger)).azimuth,
        orbitFromPose(sampleBoomArc(aboutFrom, aboutTo, t1, aboutWay, linger)).azimuth,
      ),
    )
  }
  assert.ok(
    aboutYawDelta(0.68, 0.76) < aboutYawDelta(0.22, 0.28),
    'fourth-still linger is slower than the shoulders',
  )
}

const projects = bakedSceneDoc('projects')
assert.ok(!('error' in projects), 'projects scene must parse')
const projectsCrane = !('error' in projects) ? projects.cameraMotions[0] : undefined
assert.equal(projectsCrane?.from, 'entrance-start')
assert.equal(projectsCrane?.to, 'home')
assert.equal(projectsCrane?.duration, 3.2)
assert.equal(projectsCrane?.hold, 0.4)
assert.equal(projectsCrane?.slowMoAt, 0.5)
assert.equal(projectsCrane?.impulseAt, 0.5)
assert.notEqual(projectsCrane?.duration, 4, 'negative: Projects must not keep the previous 4 s crane')
assert.notEqual(projectsCrane?.hold, 0.5, 'negative: Projects hold must not keep the previous 0.5 s')
assert.equal(projectsCrane?.waypoints?.length, 2)
assert.equal(projectsCrane?.waypoints?.[1]?.orbit.azimuth, 1.6663534567880078)
assert.notEqual(projectsCrane?.waypoints?.length, 3, 'negative: Home must not sit in the Path as a third still')
assert.notEqual(projectsCrane?.impulseAt, 0, 'negative: the wing poke is mid-crane, not the hold')

if (!('error' in projects)) {
  const projectsFrom = sceneViewPose(projects, 'entrance-start')
  const projectsTo = sceneViewPose(projects)
  const projectsWay = posesFromWaypoints(projectsCrane?.waypoints ?? [])
  const linger = projectsCrane?.slowMoAt ?? 0.5
  assert.ok(poseDistance(sampleBoomArc(projectsFrom, projectsTo, 0, projectsWay, linger), projectsFrom) < 1e-8)
  assert.ok(poseDistance(sampleBoomArc(projectsFrom, projectsTo, 1, projectsWay, linger), projectsTo) < 1e-6)
  const midOrbit = orbitFromPose(sampleBoomArc(projectsFrom, projectsTo, 0.5, projectsWay, linger))
  assert.ok(Math.abs(midOrbit.polar - 0.6327525787349001) < 0.2, 'linger sits near the wing still polar')
  assert.ok(midOrbit.polar > 0.4, 'negative: Projects must not invent an overhead boom like landing')
}

if (!('error' in about)) {
  const canvasToInset = about.cameraMotions.find((motion) => motion.id === 'canvas-to-inset')
  const insetToCanvas = about.cameraMotions.find((motion) => motion.id === 'inset-to-canvas')
  assert.equal(canvasToInset?.from, 'text-canvas')
  assert.equal(canvasToInset?.to, 'text-inset')
  assert.equal(canvasToInset?.duration, 3.2)
  assert.equal(insetToCanvas?.duration, 3.2)
  assert.notEqual(canvasToInset?.duration, 2, 'negative: the wider last leg must not keep the 2 s clock')
  assert.equal(insetToCanvas?.reverse, true)
  assert.equal(canvasToInset?.waypoints?.length, 2)
  const copyFrom = sceneViewPose(about, 'text-canvas')
  const copyTo = sceneViewPose(about, 'text-inset')
  assert.equal(homeBlendStart(orbitFromPose(copyFrom), orbitFromPose(copyTo)), 0.5)
  assert.equal(homeBlendStart(orbitFromPose(from), orbitFromPose(to)), BOOM_ARC_HOME_START)
  assert.notEqual(
    homeBlendStart(orbitFromPose(from), orbitFromPose(to)),
    0.5,
    'negative: landing must keep its short settle',
  )
  const copyWay = posesFromWaypoints(canvasToInset?.waypoints ?? [])
  assert.ok(poseDistance(sampleBoomArc(copyFrom, copyTo, 0, copyWay), copyFrom) < 1e-8)
  assert.ok(poseDistance(sampleBoomArc(copyFrom, copyTo, 1, copyWay), copyTo) < 1e-6)
  const archPeak = copyWay[1]
  const boomMid = sampleBoomArc(copyFrom, copyTo, 0.5, copyWay)
  const lerpMid = lerpPose(copyFrom, copyTo, 0.5)
  assert.ok(
    poseDistance(boomMid, archPeak) < poseDistance(lerpMid, archPeak),
    'negative: canvas↔inset must not take the short hop through Liberty',
  )
  const copyAlong = yawAlong(orbitFromPose(copyFrom), orbitFromPose(copyTo), copyWay)
  const copyShort = shortestAngle(orbitFromPose(copyFrom).azimuth, orbitFromPose(copyTo).azimuth)
  assert.ok(Math.abs(copyAlong) > Math.abs(copyShort) + 0.2, 'the copied arch is the long way around')
  assert.notEqual(Math.sign(copyAlong), Math.sign(copyShort), 'negative: lerpPose shortest clips the sculpture')
  const copyMidOrbit = orbitFromPose(boomMid)
  assert.ok(Math.abs(copyMidOrbit.polar - 1.643416224442309) < 0.15, 'second still is the arch peak')
  assert.ok(copyMidOrbit.polar > 1.2, 'negative: the copy arch must not invent an overhead boom')
  assert.ok(Math.abs(copyMidOrbit.radius - 1.1389991690695853) < 0.08, 'peak stays at canvas radius so it clears Liberty')
  const reverseStart = sampleBoomArc(copyFrom, copyTo, 1, copyWay)
  const reverseEnd = sampleBoomArc(copyFrom, copyTo, 0, copyWay)
  assert.ok(poseDistance(reverseStart, copyTo) < 1e-6, 'reverse t=0 is the inset')
  assert.ok(poseDistance(reverseEnd, copyFrom) < 1e-8, 'reverse t=1 is the canvas')
  assert.ok(poseDistance(sampleBoomArc(copyFrom, copyTo, 0.5, copyWay), boomMid) < 1e-9)
  const reverseOut = orbitFromPose(sampleBoomArc(copyFrom, copyTo, 1 - 0.45, copyWay))
  assert.ok(
    reverseOut.radius > 0.9,
    'playing the arch backward expands off the inset before the around',
  )

  const homePose = sceneViewPose(about)
  const emptyCanvasMid = sampleBoomArc(homePose, copyFrom, 0.5, [])
  const emptyInsetMid = sampleBoomArc(homePose, copyTo, 0.5, [])
  const lerpCanvasMid = lerpPose(homePose, copyFrom, 0.5)
  const lerpInsetMid = lerpPose(homePose, copyTo, 0.5)
  function targetGap(a, b) {
    return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
  }
  assert.ok(
    targetGap(emptyCanvasMid.target, homePose.target) < 1e-6,
    `empty boom-arc at t=0.5 still looks at Home (got ${emptyCanvasMid.target})`,
  )
  assert.ok(
    targetGap(emptyInsetMid.target, homePose.target) < 1e-6,
    `empty Home → inset boom-arc at t=0.5 still looks at Home (got ${emptyInsetMid.target})`,
  )
  assert.ok(
    targetGap(lerpCanvasMid.target, homePose.target) > 0.05,
    'negative: Home → canvas ViewpointFly must have left Home look-at by mid-hop',
  )
  assert.ok(
    targetGap(lerpInsetMid.target, homePose.target) > 0.05,
    'negative: Home → inset ViewpointFly must have left Home look-at by mid-hop',
  )
}

console.log('sceneBoomArc: ok')
