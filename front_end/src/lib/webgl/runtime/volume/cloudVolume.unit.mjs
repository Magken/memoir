/**
 * Poly maps to raymarch steps. Density is a three.js-style 3D Perlin volume.
 * Run: npx tsx front_end/src/lib/webgl/runtime/volume/cloudVolume.unit.mjs
 */
import assert from 'node:assert/strict'
import { ClampToEdgeWrapping, RedFormat } from 'three'
import {
  CLOUD_BASE,
  CLOUD_FRAGMENT,
  CLOUD_OPACITY,
  CLOUD_PROFILE_FILL,
  CLOUD_PROFILE_XZ,
  CLOUD_PROFILE_Y,
  CLOUD_RANGE,
  CLOUD_SIZE,
  CLOUD_THRESHOLD,
  CLOUD_VERTEX,
  cloudMarchSteps,
  makeCloudDensityTexture,
} from './cloudVolume.ts'

assert.ok(CLOUD_SIZE.y > 0)
assert.ok(CLOUD_SIZE.x >= 2, 'hull must fill Home; 1.4 m plus a 0.38 m profile was a speck')
assert.ok(
  CLOUD_PROFILE_XZ >= (Math.min(CLOUD_SIZE.x, CLOUD_SIZE.z) / 2) * 0.85,
  'profile must fill most of the hull, not a 0.38 m core',
)
assert.equal(CLOUD_PROFILE_FILL, 0.9)
assert.ok(CLOUD_PROFILE_Y > 0.5)
assert.equal(cloudMarchSteps(1) < cloudMarchSteps(8), true, 'higher poly must march more steps')
assert.equal(cloudMarchSteps(5), 100, 'poly 5 matches three.js webgl_volume_cloud default steps')
assert.equal(CLOUD_BASE, 0x798aa0)
assert.equal(CLOUD_THRESHOLD, 0.25)
assert.equal(CLOUD_RANGE, 0.1)
assert.equal(CLOUD_OPACITY, 0.5)
assert.ok(
  CLOUD_THRESHOLD - CLOUD_RANGE > 0,
  'negative: threshold 0.15 / range 0.2 makes smoothstep(−0.05) and empty air becomes a fog cube',
)
assert.match(CLOUD_FRAGMENT, /dimensionalProfile/)
assert.match(CLOUD_FRAGMENT, /perlinWorley - \( 1\.0 - profile \)/)
assert.match(CLOUD_FRAGMENT, /uProfileY/)
assert.match(CLOUD_FRAGMENT, /uProfileXZ/)
assert.doesNotMatch(
  CLOUD_FRAGMENT,
  /raw \*= raw/,
  'negative: squaring eroded density shrinks the cloud to a speck (cutoff already kills fog)',
)
assert.match(CLOUD_FRAGMENT, /if \( d > 0\.0 \)/)
assert.match(CLOUD_FRAGMENT, /sample1\( texP \)/)
assert.match(
  CLOUD_FRAGMENT,
  /for \( float i = 0\.0; i < steps; i \+= 1\.0 \)/,
  'march bound must be the steps uniform like webgl_volume_cloud (not a 128 unroll)',
)
assert.doesNotMatch(
  CLOUD_FRAGMENT,
  /MAX_STEPS/,
  'negative: a compile-time 128 cap forces extra iterations on ANGLE',
)
assert.match(CLOUD_FRAGMENT, /ac\.rgb \+= \( 1\.0 - ac\.a \) \* d \* col/)
assert.match(CLOUD_FRAGMENT, /shading\( texP \) \* 3\.0/)
assert.doesNotMatch(
  CLOUD_FRAGMENT,
  /float worley/,
  'negative: GLSL Worley in the march loop is why the cloud was laggy vs three.js',
)
assert.doesNotMatch(
  CLOUD_FRAGMENT,
  /fbm3/,
  'negative: four extra 3D samples per step is not the three.js inner loop',
)
assert.doesNotMatch(
  CLOUD_FRAGMENT,
  /marchDirectionalLight/,
  'negative: a nested light march per sample is not webgl_volume_cloud',
)
assert.doesNotMatch(
  CLOUD_FRAGMENT,
  /multipleScattering/,
  'negative: HG / multi-scatter in the inner loop is FarazzShaikh-FBO cost, not three.js',
)
assert.doesNotMatch(
  CLOUD_FRAGMENT,
  /return e \* e/,
  'negative: squared ellipsoid is a pill, not a Nubis cloud',
)
assert.doesNotMatch(
  CLOUD_FRAGMENT,
  /float lobe\(/,
  'negative: q-space ellipsoid lobes stretch into a pill',
)
assert.match(CLOUD_VERTEX, /vOrigin/)
assert.match(CLOUD_VERTEX, /vDirection/)
assert.match(CLOUD_VERTEX, /cameraPos/)
assert.match(CLOUD_FRAGMENT, /sampler3D/)
assert.match(CLOUD_FRAGMENT, /uniform float uTime/)
assert.match(CLOUD_FRAGMENT, /fract\( p \/ \( uHalfSize \* 2\.0 \) \+ 0\.5 \+ uTime \* vec3\( 0\.018, -0\.003, -0\.012 \) \)/)
assert.doesNotMatch(CLOUD_FRAGMENT, /texture2D/, 'negative: a 2D noise slice is not the 3D density map')

const tex = makeCloudDensityTexture(8)
assert.equal(tex.image.width, 8)
assert.equal(tex.image.depth, 8)
assert.equal(tex.format, RedFormat)
assert.equal(tex.wrapS, ClampToEdgeWrapping)
assert.equal(tex.wrapR, ClampToEdgeWrapping)
tex.dispose()

console.log('cloudVolume: ok')
