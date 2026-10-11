/**
 * Grid is an overlay, not a shadow catcher.
 * Run: node front_end/src/lib/webgl/runtime/helpers/SceneHelpers.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

export function helperKnobs(src) {
  return {
    grid: /grid\?: boolean/.test(src),
    axes: /axes\?: boolean/.test(src),
    box: /box\?: boolean/.test(src) && /<Box[\s>]/.test(src),
    boxOnGround: /position=\{\[0,\s*boxSize \/ 2,\s*0\]\}/.test(src),
    gridLifted: /SCENE_HELPER_GRID_Y/.test(src) && /position=\{\[0,\s*SCENE_HELPER_GRID_Y,\s*0\]\}/.test(src),
    gridNoShadow: /receiveShadow=\{false\}/.test(src) && /castShadow=\{false\}/.test(src),
  }
}

const src = fs.readFileSync(fileURLToPath(new URL('./SceneHelpers.tsx', import.meta.url)), 'utf8')
const knobs = helperKnobs(src)
assert.equal(knobs.grid, true, 'grid knob missing')
assert.equal(knobs.axes, true, 'axes knob missing')
assert.equal(knobs.box, true, 'bbox knob / <Box> missing')
assert.equal(knobs.boxOnGround, true, 'helper bbox must sit on the ground, not through it')
assert.equal(knobs.gridLifted, true, 'grid must sit above ShadowGround')
assert.equal(knobs.gridNoShadow, true, 'grid must not receive or cast shadows')

const stripped = src.replace(/box\?: boolean/g, '').replace(/<Box[\s\S]*?<\/Box>/g, '')
assert.equal(helperKnobs(stripped).box, false, 'negative: a helper without box must fail')
assert.equal(helperKnobs(stripped).boxOnGround, false, 'negative: a missing bbox cannot sit on the ground')

const coplanar = src
  .replace(/SCENE_HELPER_GRID_Y/g, '')
  .replace(/receiveShadow=\{false\}/g, '')
assert.equal(helperKnobs(coplanar).gridLifted, false, 'negative: a coplanar receiving grid must fail')
assert.equal(helperKnobs(coplanar).gridNoShadow, false, 'negative: a shadow-receiving grid must fail')

console.log('SceneHelpers: ok')
