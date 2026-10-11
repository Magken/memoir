/**
 * Logo workbench: draw canvas, clear SVG and PNG.
 * Run: node front_end/src/components/webglToolkit/LogoMarkWorkbench.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(here, 'LogoMarkWorkbench.tsx'), 'utf8')

assert.match(src, /export function LogoMarkWorkbench/)
assert.match(src, /DrawCanvas/)
assert.match(src, /clearExport/)
assert.match(src, /exportClear\('svg'\)/)
assert.match(src, /exportClear\('png'\)/)
assert.match(src, /\{open \?/)
assert.doesNotMatch(src, /sceneFrames/, 'negative: size frames are not drawn over the canvas')
assert.doesNotMatch(src, /Favicon/, 'negative: size labels are not on this page')
assert.doesNotMatch(src, /withBackground: true/, 'negative: logo downloads do not paint a background')
assert.doesNotMatch(src, /WebglStage/, 'negative: the logo page is the draw canvas, not a scene')
assert.doesNotMatch(src, /Coming soon/, 'negative: do not fill the lab with placeholder copy')

console.log('LogoMarkWorkbench: ok')
