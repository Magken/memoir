/**
 * Dot Pad page loads the SDK before the click, then connects from the button.
 * Run: node front_end/src/components/webglToolkit/WebglDotPadWorkbench.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'WebglDotPadWorkbench.tsx'), 'utf8')

assert.match(src, /export function WebglDotPadWorkbench/)
assert.match(src, /loadDotPadBridge\(\)/)
assert.match(src, /useEffect\([\s\S]*loadDotPadBridge/)
assert.match(src, /connectDotPad\(bridge, link/)
assert.match(src, /Connect USB/)
assert.match(src, /Connect Bluetooth/)
assert.match(src, /brailleLine\(text\)/)
assert.match(src, /\{open \?/)
assert.doesNotMatch(src, /requestDevice/, 'negative: the page does not open the picker itself')
assert.doesNotMatch(src, /requestPort/, 'negative: the page does not open the serial picker itself')
assert.doesNotMatch(src, /5288/, 'negative: Dot Pad is not the DataFeel kit')
assert.doesNotMatch(src, /WebglStage/, 'negative: the Dot Pad page is buttons, not a scene')

console.log('WebglDotPadWorkbench: ok')
