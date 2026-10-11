/**
 * Word-cloud park / Home veil — return-to-Home must not flash the idle canvas.
 * Run: node front_end/src/lib/isometrics/isometricWordCloud.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ISOMETRIC_WORD_CLOUD_SCENE,
  homeWordCloudHostHidden,
  parkWordCloudBehindFog,
  wordCloudEntranceSteps,
} from './isometricWordCloud.ts'

const dir = dirname(fileURLToPath(import.meta.url))
const { farZ, revealStagger } = ISOMETRIC_WORD_CLOUD_SCENE.loading

assert.equal(
  homeWordCloudHostHidden({
    homeOwnsBootstrap: true,
    homeLive: false,
    entrancePending: true,
  }),
  false,
  '% loading cloud stays visible',
)
assert.equal(
  homeWordCloudHostHidden({
    homeOwnsBootstrap: false,
    homeLive: false,
    entrancePending: false,
  }),
  true,
  'parked / incoming Home covers the last framebuffer',
)
assert.equal(
  homeWordCloudHostHidden({
    homeOwnsBootstrap: false,
    homeLive: true,
    entrancePending: true,
  }),
  true,
  'stay covered until the fog park paints',
)
assert.equal(
  homeWordCloudHostHidden({
    homeOwnsBootstrap: false,
    homeLive: true,
    entrancePending: false,
  }),
  false,
  'live Home after park lifts the veil',
)
assert.equal(
  homeWordCloudHostHidden({
    homeOwnsBootstrap: true,
    homeLive: false,
    entrancePending: false,
  }),
  false,
  'negative: bootstrap must not use the return-to-Home veil',
)

const idle = [
  { localX: 1, localY: 2, coverX: 4, coverY: 0 },
  { localX: -3, localY: 0, coverX: -1, coverY: 1 },
]
const meshes = idle.map((word) => ({
  visible: true,
  position: { x: word.localX, y: word.localY, z: 2 },
}))
parkWordCloudBehindFog(idle, meshes)
assert.equal(meshes[0].visible, false)
assert.equal(meshes[0].position.z, farZ)
assert.equal(meshes[1].visible, false)
assert.equal(meshes[1].position.z, farZ)
assert.notEqual(
  meshes[0].position.z,
  2,
  'negative: parked meshes must not keep the idle rest Z',
)

const steps = wordCloudEntranceSteps(idle)
assert.equal(steps.length, 2)
assert.ok(steps[0].at === 0)
assert.equal(steps[1].at, revealStagger)
assert.equal(steps[0].fromZ, farZ)
assert.notEqual(steps[0].toZ, farZ)
assert.ok(
  steps[0].index === 1,
  'left-most coverX starts the stagger (coverX -1 before 4)',
)
assert.doesNotMatch(
  JSON.stringify(steps),
  /"fromZ":2/,
  'negative: entrance must start from fog, not idle rest',
)

const homeSrc = readFileSync(join(dir, '../../pages/HomePage.tsx'), 'utf8')
assert.match(homeSrc, /homeWordCloudHostHidden/)
assert.match(homeSrc, /active=\{cloudActive\}/)
assert.match(homeSrc, /page-scene--home__word-cloud-veil/)
assert.match(homeSrc, /onEntranceStart=\{\(\) => setEntrancePending\(false\)\}/)
assert.doesNotMatch(
  homeSrc,
  /page-scene--home__word-cloud--parked/,
  'negative: do not visibility-hide the canvas host (that pauses the park frame)',
)

const sceneSrc = readFileSync(
  join(dir, '../../components/IsometricWordCloudScene.tsx'),
  'utf8',
)
assert.match(sceneSrc, /parkWordCloudBehindFog\(built, meshRefs\.current\)/)
assert.match(sceneSrc, /wordCloudEntranceSteps\(built\)/)
assert.match(sceneSrc, /becameActive/)
assert.doesNotMatch(
  sceneSrc,
  /if \(!becameActive\) \{\s*restoreIdleCloud/,
  'negative: returning to Home must not snap the idle cloud before the stagger',
)

const pageCss = readFileSync(join(dir, '../../css/effects/page-scenes.css'), 'utf8')
assert.match(
  pageCss,
  /page-scene--home__word-cloud-veil \{[\s\S]*?z-index: 1/,
)
assert.match(
  pageCss,
  /page-scene--home__word-cloud-veil\[data-hidden='true'\] \{[\s\S]*?opacity: 1/,
)

console.log('isometricWordCloud.unit.mjs: ok')
