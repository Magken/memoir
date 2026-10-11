/**
 * Model viewer is a dark fog void. Studio fill stays off.
 * Run: node front_end/src/lib/webgl/runtime/lights/DarkFogRig.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = fs.readFileSync(fileURLToPath(new URL('./DarkFogRig.tsx', import.meta.url)), 'utf8')
assert.match(src, /FogExp2/)
assert.match(src, /DARK_FOG_COLOR = '#000000'/)
assert.match(src, /environment = null/)
assert.match(src, /environmentIntensity = 0/)
assert.match(src, /setClearColor/)
assert.doesNotMatch(src, /hemisphereLight/, 'negative: dark fog is not a studio fill')
assert.doesNotMatch(src, /#050508/, 'negative: the void must not keep a lifted navy')

const loader = fs.readFileSync(
  fileURLToPath(new URL('../../../../components/webglToolkit/WebglAssetLoader.tsx', import.meta.url)),
  'utf8',
)
assert.match(loader, /DarkFogRig/)
assert.match(loader, /WireCageLights/)
assert.match(loader, /Object color/)
assert.doesNotMatch(loader, /StudioLightRig/, 'negative: the model viewer has no external key light')
assert.doesNotMatch(loader, /EnvironmentRig/, 'negative: the model viewer has no environment lighting')
const player = fs.readFileSync(
  fileURLToPath(new URL('../../../../components/webglToolkit/WebglScenePlayer.tsx', import.meta.url)),
  'utf8',
)
assert.match(player, /DarkFogRig/)
assert.doesNotMatch(player, /StudioLightRig/, 'negative: scenes have no studio fill')
assert.doesNotMatch(player, /EnvironmentRig/, 'negative: scenes have no environment lighting')

console.log('DarkFogRig: ok')
