/**
 * Scene camera look maps onto DoF / vignette knobs; off look skips the composer.
 * Run: npx tsx front_end/src/lib/webgl/runtime/camera/cameraLook.unit.mjs
 */
import assert from 'node:assert/strict'
import { DEFAULT_SCENE_LOOK, VIEWER_SCENE_LOOK } from '../../assets/sceneDoc.ts'
import { dofFromLook, lookNeedsComposer, noiseKindIndex } from './cameraLook.ts'

const razor = {
  focus: 0,
  focalLength: 50,
  focalDistance: 0,
  noise: 'off',
  grain: 0,
}

assert.equal(lookNeedsComposer(razor), false)
assert.equal(lookNeedsComposer(VIEWER_SCENE_LOOK), false, 'viewer look is razor so the composer stays off')
assert.equal(lookNeedsComposer(DEFAULT_SCENE_LOOK), true, 'default look is max Focus / tele Lens so the composer must mount')
assert.equal(lookNeedsComposer({ ...razor, focus: 0.2 }), true)
assert.equal(lookNeedsComposer({ ...razor, grain: 0.4, noise: 'film' }), true)
assert.equal(
  lookNeedsComposer({ ...razor, grain: 0.9, noise: 'off' }),
  false,
  'negative: grain with noise off must not open the composer',
)

const sharp = dofFromLook(razor)
assert.equal(sharp.bokehScale, 0)
assert.equal(sharp.vignetteDarkness, 0)

const soft = dofFromLook(DEFAULT_SCENE_LOOK)
const wide = dofFromLook({ ...DEFAULT_SCENE_LOOK, focalLength: 24 })
assert.ok(soft.bokehScale > 0)
assert.ok(soft.focusRange < wide.focusRange, `got tele ${soft.focusRange} vs wide ${wide.focusRange}`)
assert.ok(soft.vignetteDarkness > 0)

assert.equal(noiseKindIndex('off'), 0)
assert.equal(noiseKindIndex('simplex'), 3)

console.log('cameraLook: ok')
