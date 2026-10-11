/**
 * Volumetric cloud hull sits on y=0 and raymarches inside.
 * Run: node front_end/src/lib/webgl/runtime/volume/VolumetricCloud.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = fs.readFileSync(fileURLToPath(new URL('./VolumetricCloud.tsx', import.meta.url)), 'utf8')
assert.match(src, /CLOUD_SIZE\.y \/ 2/)
assert.match(src, /position=\{\[0, CLOUD_SIZE\.y \/ 2, 0\]\}/)
assert.match(src, /webglPickRoot/)
assert.match(src, /cloudMarchSteps/)
assert.match(src, /BackSide/)
assert.match(src, /RawShaderMaterial/)
assert.match(src, /GLSL3/)
assert.match(src, /makeCloudDensityTexture/)
assert.match(src, /CLOUD_PROFILE_Y/)
assert.match(src, /CLOUD_PROFILE_XZ/)
assert.match(src, /uProfileY/)
assert.doesNotMatch(
  src,
  /AdditiveBlending/,
  'negative: three.js webgl_volume_cloud uses normal transparency, not additive',
)
assert.match(src, /uTime/)
assert.match(src, /delta/)
assert.doesNotMatch(
  src,
  /rotation\.y/,
  'negative: spinning the hull is a rock, not a cloud (three.js example does this)',
)
assert.doesNotMatch(src, /side: DoubleSide/, 'negative: FrontSide/DoubleSide hides the volume (example uses BackSide)')
assert.doesNotMatch(src, /position=\{\[0, 0, 0\]\}/, 'negative: a hull through the origin is clipped by the ground')

console.log('VolumetricCloud: ok')
