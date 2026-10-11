/**
 * A splat stays in capture coordinates. The sculpture normalize stays on glTF.
 * Run: node front_end/src/components/webglToolkit/WebglSubjects.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'

const src = fs.readFileSync(new URL('./WebglSubjects.tsx', import.meta.url), 'utf8')
const split = src.indexOf('export const SplatSubject')
assert.ok(split > 0, 'SplatSubject must be declared')
const gltf = src.slice(0, split)
const splat = src.slice(split)
assert.match(gltf, /targetSize:\s*1\.4/, 'a glTF subject is still framed as a sculpture')
assert.doesNotMatch(splat, /targetSize/, 'negative: a splat must not be scaled into the sculpture frame')
assert.match(splat, /: \[0, 0, 0\]/)
assert.doesNotMatch(splat, /\[Math\.PI, 0, 0\]/, 'negative: SPZ is already y-up, a 180° turn shows it upside down and backwards')
assert.doesNotMatch(splat, /cropSplatShell/, 'negative: the far splats are the sky and surroundings, three.js GaussianSplat draws them all')
assert.match(splat, /perspective\.far/)

console.log('WebglSubjects: ok')
