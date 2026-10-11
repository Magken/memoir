/**
 * Buzz page detects Dots and posts one button to the dev proxy.
 * Run: node front_end/src/components/webglToolkit/WebglBuzzWorkbench.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'WebglBuzzWorkbench.tsx'), 'utf8')

assert.match(src, /export function WebglBuzzWorkbench/)
assert.match(src, /\/api\/haptics\/dots/)
assert.match(src, /\/api\/haptics\/buzz/)
assert.match(src, /parseHapticDots/)
assert.match(src, /buzzBody/)
assert.match(src, /Dot \$\{dot\.address\}/)
assert.match(src, /\{open \?/)
assert.doesNotMatch(src, /127\.0\.0\.1:5288/, 'negative: the page does not call the kit host directly')
assert.doesNotMatch(src, /COM7/, 'negative: the page does not pick the serial port')
assert.doesNotMatch(src, /WebglStage/, 'negative: the buzz page is buttons, not a scene')

console.log('WebglBuzzWorkbench: ok')
