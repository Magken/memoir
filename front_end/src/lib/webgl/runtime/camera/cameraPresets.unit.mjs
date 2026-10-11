/**
 * Near plane must allow close inspection zoom.
 * Run: npx tsx front_end/src/lib/webgl/runtime/camera/cameraPresets.unit.mjs
 */
import assert from 'node:assert/strict'
import { CAMERA_PRESETS } from './cameraPresets.ts'

assert.ok(CAMERA_PRESETS.perspective.near <= 0.001)
assert.ok(CAMERA_PRESETS.orthographic.near <= 0.001)
assert.ok(
  CAMERA_PRESETS.perspective.near < 0.1,
  'negative: a 10 cm near plane clips fingernail-scale zoom',
)

console.log('cameraPresets: ok')
