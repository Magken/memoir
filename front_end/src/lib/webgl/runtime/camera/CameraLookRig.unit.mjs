/**
 * Camera look composer mounts only behind lookNeedsComposer.
 * Run: node front_end/src/lib/webgl/runtime/camera/CameraLookRig.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = fs.readFileSync(fileURLToPath(new URL('./CameraLookRig.tsx', import.meta.url)), 'utf8')

assert.match(src, /lookNeedsComposer/)
assert.match(src, /EffectComposer/)
assert.match(src, /DepthOfField/)
assert.match(src, /CameraLookGrain/)
assert.match(src, /if \(!lookNeedsComposer\(look\)\) return null/)
assert.doesNotMatch(
  src,
  /<EffectComposer[\s\S]*lookNeedsComposer/,
  'negative: composer must not mount before the look guard',
)

console.log('CameraLookRig: ok')
