/**
 * ACM pan/tilt follows the pointer; intensity 0 is still.
 * Run: npx tsx front_end/src/lib/webgl/runtime/controls/acm.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  ACM_FOLLOW,
  ACM_LOCK_IN,
  ACM_WAKE,
  ACM_UNLOCK_IN,
  ACM_MAX_PAN,
  ACM_MAX_PITCH,
  ACM_MAX_YAW,
  acmFollow,
  acmLerpTriple,
  acmLimitTravel,
  acmNdcFromClient,
  acmOffsetAroundTarget,
  acmPanTilt,
  acmPeekFromRest,
  acmShouldRestorePeek,
  acmSoftAxis,
  acmWakeIntensity,
} from './acm.ts'

const rest = acmPanTilt(0, 0, 1)
assert.ok(rest.yaw === 0)
assert.ok(rest.pitch === 0)

const off = acmPanTilt(1, 1, 0)
assert.ok(off.yaw === 0)
assert.ok(off.pitch === 0, 'negative: intensity 0 must not peek')

const right = acmPanTilt(1, 0, 1)
assert.ok(right.yaw < 0, 'pointer right looks right (rotateY negative)')
assert.ok(Math.abs(right.yaw) < ACM_MAX_YAW, 'negative: the edge must ease into the cap, not clip to it')
assert.notEqual(right.yaw, -ACM_MAX_YAW)
assert.ok(right.pitch === 0)
assert.ok(Math.abs(acmPanTilt(1, 0, 1).yaw) > Math.abs(acmPanTilt(0.4, 0, 1).yaw))

const up = acmPanTilt(0, 1, 1)
assert.ok(up.pitch < 0, 'pointer up looks up (rotateX negative)')
assert.ok(Math.abs(up.pitch) < ACM_MAX_PITCH)
assert.ok(up.yaw === 0)

const half = acmPanTilt(1, 0, 0.5)
assert.ok(Math.abs(half.yaw - right.yaw / 2) < 1e-12)

const clamped = acmPanTilt(1, 0, 4)
assert.equal(clamped.yaw, right.yaw, 'negative: intensity above 1 must not amplify past the cap')

assert.ok(Math.abs(acmSoftAxis(1)) < 1, 'negative: tanh must not reach a hard 1 at the edge')
assert.ok(acmSoftAxis(0) === 0)

const followed = acmFollow(0, 1, 1 / 4)
assert.ok(followed > 0 && followed < 1)
assert.ok(acmFollow(0.4, 0.4, 0.16) === 0.4)

assert.ok(ACM_LOCK_IN > 0)
assert.ok(ACM_LOCK_IN < ACM_FOLLOW, 'lock-in must be heavier than pointer follow')
assert.ok(ACM_WAKE < ACM_LOCK_IN, 'wake must be heavier than lock-in so intensity does not snap')
assert.ok(ACM_UNLOCK_IN < ACM_WAKE, 'lock-off seat-in must be heavier than wake so a View hop cannot jerk toward the mouse')
assert.notEqual(ACM_LOCK_IN, 20, 'negative: a snap rate hijacks the camera after the crane')
assert.notEqual(ACM_WAKE, ACM_FOLLOW, 'negative: pointer follow is too fast to raise ACM after a hop')
assert.notEqual(ACM_UNLOCK_IN, ACM_FOLLOW, 'negative: lock-off must not follow the pointer at full ACM rate the frame a hop ends')
const lockFirst = acmFollow(0, 1, 1 / 60, ACM_LOCK_IN)
assert.ok(lockFirst > 0 && lockFirst < 0.2, `first lock-in frame must stay near rest, got ${lockFirst}`)
const wakeFirst = acmWakeIntensity(0, 0.3, 1 / 60)
assert.ok(wakeFirst > 0 && wakeFirst < 0.05, `first wake frame must stay near 0, got ${wakeFirst}`)
assert.notEqual(wakeFirst, 0.3, 'negative: ACM must not snap to 0.3 the frame a View hop ends')
const unlockFirst = acmFollow(0, 1, 1 / 60, ACM_UNLOCK_IN)
assert.ok(unlockFirst > 0 && unlockFirst < 0.05, `first lock-off seat-in frame must stay near rest, got ${unlockFirst}`)
assert.ok(unlockFirst < lockFirst, 'lock-off after a View hop must ease in slower than lock-on')
const seated = [0, 0, 1]
const mousePeek = acmPeekFromRest({ position: seated, target: [0, 0, 0] }, 1, 0, 0.3)
const firstUnlock = acmLerpTriple(seated, mousePeek.position, unlockFirst)
assert.notDeepEqual(
  firstUnlock,
  mousePeek.position,
  'negative: lock-off must not snap onto the mouse peek the frame a View hop ends',
)
const firstTravel = Math.hypot(firstUnlock[0] - seated[0], firstUnlock[1] - seated[1], firstUnlock[2] - seated[2])
const fullTravel = Math.hypot(
  mousePeek.position[0] - seated[0],
  mousePeek.position[1] - seated[1],
  mousePeek.position[2] - seated[2],
)
assert.ok(firstTravel < fullTravel * 0.1, `lock-off first frame must stay under 10% of the mouse peek, got ${firstTravel} of ${fullTravel}`)
assert.deepEqual(acmLerpTriple([0, 0, 0], [2, 4, 6], 0), [0, 0, 0])
assert.deepEqual(acmLerpTriple([0, 0, 0], [2, 4, 6], 1), [2, 4, 6])
const midLock = acmLerpTriple([0, 0, 2], [1, 0, 1], lockFirst)
assert.notDeepEqual(midLock, [1, 0, 1], 'negative: the first locked frame must not snap onto the peek')
assert.ok(midLock[2] > 1, 'lock-in starts at the crane camera and eases toward Home')

const stage = { left: 100, top: 50, width: 200, height: 100 }
const mid = acmNdcFromClient(200, 100, stage)
assert.ok(mid.inside)
assert.ok(Math.abs(mid.x) < 1e-9)
assert.ok(Math.abs(mid.y) < 1e-9)
const rightEdge = acmNdcFromClient(300, 100, stage)
assert.ok(rightEdge.inside)
assert.ok(rightEdge.x > 0.99)
const outside = acmNdcFromClient(10, 10, stage)
assert.equal(outside.inside, false)
assert.ok(outside.x === 0 && outside.y === 0, 'negative: a pointer off the stage must not peek')

assert.ok(ACM_MAX_YAW >= 0.5, 'negative: peek must be large enough to read at intensity 0.4')
assert.ok(ACM_MAX_PITCH >= 0.3)

const around = acmOffsetAroundTarget([0, 0, 1], [0, 0, 0], 0, 0)
assert.ok(Math.abs(around[0]) < 1e-9 && Math.abs(around[2] - 1) < 1e-9)
const rightPeek = acmOffsetAroundTarget([0, 0, 1], [0, 0, 0], acmPanTilt(1, 0, 1).yaw, 0)
assert.ok(rightPeek[0] > 0.2, `pointer right must slide the camera +X, got ${rightPeek[0]}`)
const still = acmOffsetAroundTarget([0, 0, 1], [0, 0, 0], acmPanTilt(1, 0, 0).yaw, 0)
assert.ok(Math.abs(still[0]) < 1e-9, 'negative: intensity 0 must not slide the camera')

const home = { position: [0, 0, 1], target: [0, 0, 0] }
const locked = acmPeekFromRest(home, 1, 0, 1)
assert.deepEqual(locked.target, [0, 0, 0], 'focal point must not move')
assert.ok(locked.position[0] > 0)
const travel = Math.hypot(locked.position[0] - 0, locked.position[1] - 0, locked.position[2] - 1)
assert.ok(travel <= ACM_MAX_PAN + 1e-9, `pan must stay inside ${ACM_MAX_PAN} m, got ${travel}`)
const stillLock = acmPeekFromRest(home, 1, 1, 0)
assert.deepEqual(stillLock.position, [0, 0, 1], 'negative: intensity 0 must stay on rest')
assert.deepEqual(stillLock.target, [0, 0, 0])

const libertyHome = {
  position: [0.461175686088034, 0.27613195277294944, -0.040229274207341154],
  target: [-0.06627943244351724, 0.748802608867931, 0.07678242631809161],
}
const aboutInit = acmPeekFromRest(libertyHome, 0.35, 0.55, 0)
assert.deepEqual(aboutInit.position, libertyHome.position, 'About ACM 0 must copy Liberty viewer Home')
assert.deepEqual(aboutInit.target, libertyHome.target)
const aboutPeek = acmPeekFromRest(libertyHome, 0.35, 0.55, 0.3)
const peekMeters = Math.hypot(
  aboutPeek.position[0] - libertyHome.position[0],
  aboutPeek.position[1] - libertyHome.position[1],
  aboutPeek.position[2] - libertyHome.position[2],
)
assert.ok(peekMeters > 0.01, `0.3 ACM must leave Liberty Home, got ${peekMeters} m`)
assert.notDeepEqual(
  aboutPeek.position,
  libertyHome.position,
  'negative: landing-style ACM peek is the Copy-session drift off Liberty Home',
)
const peekedAgain = acmPeekFromRest(
  { position: aboutPeek.position, target: aboutPeek.target },
  0.35,
  0.55,
  0.3,
)
assert.notDeepEqual(
  peekedAgain.position,
  aboutPeek.position,
  'negative: peeking from an already-peeked camera walks off rest',
)
const stable = acmPeekFromRest(libertyHome, 0.35, 0.55, 0.3)
assert.deepEqual(stable.position, aboutPeek.position, 'the same rest must seat the same peek')

const homeRest = { position: [0, 0, 1], target: [0, 0, 0] }
assert.equal(acmShouldRestorePeek(true, homeRest, [0, 0, 1.05]), true)
assert.equal(
  acmShouldRestorePeek(true, homeRest, [2, 0, 1]),
  false,
  'negative: a View hop must not restore the previous rest',
)
assert.equal(
  acmShouldRestorePeek(false, homeRest, [0, 0, 1.05]),
  false,
  'negative: ACM off (lock-off hop) must not restore rest onto the seated label',
)
assert.equal(acmShouldRestorePeek(true, null, [0, 0, 1]), false)

const far = acmLimitTravel([0, 0, 0], [10, 0, 0], 0.12)
assert.ok(far[0] <= 0.12 && far[0] > 0.08, `soft pan stop, got ${far[0]}`)
assert.ok(far[0] < 10, 'negative: travel must not keep a 10 m walk')

const src = fs.readFileSync(fileURLToPath(new URL('./AcmRig.tsx', import.meta.url)), 'utf8')
assert.match(src, /export function AcmRig/)
assert.match(src, /useFrame\(/)
assert.match(src, /rotateY/)
assert.match(src, /rotateX/)
assert.match(src, /window\.addEventListener\('pointermove'/)
assert.match(src, /capture: true/)
assert.match(src, /acmShouldRestorePeek/)
assert.match(src, /acmPeekFromRest/)
assert.match(src, /restPose/)
assert.match(src, /freeRest/)
assert.match(src, /if \(enabled\) return/)
assert.doesNotMatch(
  src,
  /if \(!peeked\.current \|\| !freeRest\.current\) return/,
  'negative: lock-off hops must not restore rest without a drift check',
)
assert.match(src, /useFrame\(\(\) => \{/)
assert.match(src, /,\s*-2\s*\)/)
assert.match(src, /state\.pointer/)
assert.match(src, /ACM_STAGE_CLASS/)
assert.match(src, /lookAt/)
assert.doesNotMatch(src, /gl\.domElement\.getBoundingClientRect/, 'negative: map against the stage host, not the pointer-events-none canvas')
assert.doesNotMatch(src, /useFrame\([^)]*,\s*1\s*\)/, 'negative: priority 1 steals the render from EffectComposer')
assert.doesNotMatch(
  src,
  /gl\.domElement\.addEventListener/,
  'negative: the canvas is pointer-events none under eventSource',
)
assert.doesNotMatch(src, /hover\.current/, 'negative: ACM must not wait on a canvas hover flag')
assert.doesNotMatch(
  src,
  /events\.connected/,
  'negative: do not bind ACM to R3F connected — that identity is set after mount',
)
assert.doesNotMatch(src, /lerpPose\(/, 'negative: ACM is a peek, not a View hop')
assert.match(src, /if \(!enabled\)/)
assert.match(src, /ACM_LOCK_IN/)
assert.match(src, /acmLerpTriple/)
assert.match(src, /lockBlend/)
assert.match(src, /lockFrom/)
assert.match(src, /acmWakeIntensity/)
assert.match(src, /liveGain/)
assert.doesNotMatch(
  src,
  /acmPeekFromRest\(restPose, nx\.current, ny\.current, intensity\)/,
  'negative: ACM must not peek at the slider the frame a hop ends',
)
assert.doesNotMatch(
  src,
  /acmPanTilt\(nx\.current, ny\.current, intensity\)/,
  'negative: unlocked ACM must not apply full intensity on a View release',
)
assert.doesNotMatch(
  src,
  /acmOffsetAroundTarget\(\s*\[[^\]]*camera\.position/,
  'negative: unlocked ACM must not offset the already-peeked camera each frame',
)
assert.match(src, /ACM_UNLOCK_IN/)
assert.match(src, /unlockBlend/)
assert.match(src, /acmLerpTriple\(rest\.position, orbitPeek\.position/)
assert.doesNotMatch(
  src,
  /camera\.position\.set\(orbitPeek\.position\[0\]/,
  'negative: lock-off must not snap onto the mouse peek the frame a View hop ends',
)
assert.doesNotMatch(
  src,
  /camera\.position\.set\(peek\.position\[0\]/,
  'negative: lock must not snap the camera onto the peek the frame a crane ends',
)

const css = fs.readFileSync(fileURLToPath(new URL('../../../../css/effects/webgl-toolkit.css', import.meta.url)), 'utf8')
assert.match(
  css,
  /div:not\(:has\(canvas\)\)[\s\S]*pointer-events:\s*none\s*!important/,
  'negative: leftover Html wraps must not keep pointer-events or stretch over the stage',
)

console.log('acm: ok')
