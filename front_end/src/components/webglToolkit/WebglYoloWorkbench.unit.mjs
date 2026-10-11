/**
 * YOLO page calls the dev proxy and draws 2D boxes on the test image.
 * Run: node front_end/src/components/webglToolkit/WebglYoloWorkbench.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'WebglYoloWorkbench.tsx'), 'utf8')

assert.match(src, /export function WebglYoloWorkbench/)
assert.match(src, /\/api\/yolo\/health/)
assert.match(src, /\/api\/yolo\/sample/)
assert.match(src, /\/api\/yolo\/predict/)
assert.match(src, /buildYoloPredictRequest/)
assert.match(src, /parseYoloPredict/)
assert.match(src, /theme-yolo-view__boxes/)
assert.match(src, /\{open \?/)
assert.doesNotMatch(src, /10\.103\.5\.156/, 'negative: the page does not call the lab host directly')
assert.doesNotMatch(src, /style=\{/, 'negative: boxes are positioned by the svg viewBox')
assert.doesNotMatch(src, /WebglStage/, 'negative: the YOLO page is an image viewer, not a scene')
assert.doesNotMatch(src, /box_xyz/, 'negative: the viewer does not draw a 3D cuboid')

console.log('WebglYoloWorkbench: ok')
