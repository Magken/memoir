/**
 * Key shadow fits the subject and filters softly. A 12 m map at 1024 is blocky on the hands.
 * Run: node front_end/src/lib/webgl/runtime/lights/StudioLightRig.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = fs.readFileSync(fileURLToPath(new URL('./StudioLightRig.tsx', import.meta.url)), 'utf8')
assert.match(src, /shadow-mapSize-width=\{2048\}/)
assert.match(src, /shadow-radius=\{3\}/)
assert.match(src, /shadow-camera-left=\{-2\.2\}/)
assert.doesNotMatch(src, /shadow-mapSize-width=\{1024\}/, 'negative: 1024 across 12 m is a blocky shadow')
assert.doesNotMatch(src, /shadow-camera-left=\{-6\}/, 'negative: a 12 m shadow frustum wastes texels')

const stage = fs.readFileSync(fileURLToPath(new URL('../core/WebglStage.tsx', import.meta.url)), 'utf8')
assert.match(stage, /PCFSoftShadowMap/)
assert.doesNotMatch(stage, /shadows=\{shadows\}/, 'negative: a boolean shadow flag keeps the hard map')

console.log('StudioLightRig: ok')
