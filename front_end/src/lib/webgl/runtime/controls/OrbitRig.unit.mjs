/**
 * Close orbit so fingernail-scale highlights are in reach.
 * Run: node front_end/src/lib/webgl/runtime/controls/OrbitRig.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = fs.readFileSync(fileURLToPath(new URL('./OrbitRig.tsx', import.meta.url)), 'utf8')

assert.match(src, /ORBIT_MIN_DISTANCE = 0\.005/)
assert.match(src, /zoomSpeed=\{ORBIT_ZOOM_SPEED\}/)
assert.match(src, /zoomToCursor/)
assert.match(src, /panPixelsForCode/)
assert.match(src, /panOrbitByPixels/)
assert.match(src, /keydown/)
assert.doesNotMatch(src, /_pan/, 'negative: three-stdlib does not expose _pan')
assert.ok(0.005 < 0.4, 'negative: the old 0.4 m floor is farther than the close-inspect min')
assert.doesNotMatch(src, /minDistance = 0\.4/, 'negative: 0.4 m minDistance must not return')
assert.match(src, /enabled=\{enabled\}/)
assert.match(src, /useFrame/)
assert.match(src, /controlsRef\.current\?\.update/)
assert.match(src, /if \(enabled\) return/)
assert.doesNotMatch(
  src,
  /if \(enabled\) controlsRef/,
  'negative: user-orbit off must still update so a hop cannot leave a stale spherical',
)
assert.match(src, /enableZoom=\{enabled && enableZoom\}/)
assert.doesNotMatch(
  src,
  /enableZoom=\{enableZoom\}/,
  'negative: wheel zoom must turn off with rotate/pan when the rig is locked',
)
assert.match(src, /useState\(target\)/)
assert.match(src, /placed\.current/)
assert.match(src, /lookAt\.set\(/)
assert.match(src, /cameraPosition/)
assert.match(src, /object\.position\.set/)
assert.doesNotMatch(src, /target=\{startTarget\}/, 'negative: a target prop would yank orbit back to Home on re-render')
assert.doesNotMatch(src, /target=\{target\}/, 'negative: a live target prop would yank orbit back to Home')

console.log('OrbitRig: ok')
