/**
 * CameraRig must honour both CAMERA_PRESETS types.
 * Run: node front_end/src/lib/webgl/runtime/camera/CameraRig.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

export function cameraKinds(src) {
  return {
    perspective: /<PerspectiveCamera[\s>]/.test(src),
    orthographic: /spec\.type === 'orthographic'/.test(src) && /<OrthographicCamera[\s>]/.test(src),
  }
}

const src = fs.readFileSync(fileURLToPath(new URL('./CameraRig.tsx', import.meta.url)), 'utf8')
const kinds = cameraKinds(src)
assert.equal(kinds.perspective, true, 'PerspectiveCamera missing')
assert.equal(kinds.orthographic, true, 'OrthographicCamera branch missing')

assert.match(src, /position \?\? spec\.position/)
assert.match(src, /placed\.current/)
assert.match(src, /position\.set/)
assert.match(src, /lookAt\(/)
assert.doesNotMatch(src, /<PerspectiveCamera[\s\S]*position=\{start\}/, 'negative: a position prop would snap the camera back to Home on re-render')
assert.doesNotMatch(src, /position=\{\[\.\.\.spec\.position\]\}/, 'negative: CameraRig must not force the cube home every render')

const stripped = src.replace(/<OrthographicCamera[\s\S]*?\/>/g, '').replace(/spec\.type === 'orthographic'/g, '')
assert.equal(cameraKinds(stripped).orthographic, false, 'negative: a perspective-only rig must fail')

console.log('CameraRig: ok')
