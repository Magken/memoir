/**
 * The dev route only forwards health, dots, and buzz.
 * Run: node --experimental-strip-types front_end/src/lib/haptics/hapticsDevPlugin.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { hapticsOrigin, hapticsUpstreamPath, HAPTICS_ORIGIN_DEFAULT } from './hapticsDevPlugin.ts'

assert.equal(hapticsUpstreamPath('/api/haptics/health', 'GET'), '/health')
assert.equal(hapticsUpstreamPath('/api/haptics/dots', 'GET'), '/dots')
assert.equal(hapticsUpstreamPath('/api/haptics/buzz', 'POST'), '/buzz')
assert.equal(hapticsUpstreamPath('/api/haptics/buzz?x=1', 'POST'), '/buzz')
assert.equal(hapticsUpstreamPath('/api/haptics/buzz', 'GET'), null, 'negative: buzz is POST only')
assert.equal(hapticsUpstreamPath('/api/haptics/../../../etc/passwd', 'GET'), null, 'negative: a path outside the three routes is not forwarded')
assert.equal(hapticsUpstreamPath('/api/yolo/predict', 'POST'), null, 'negative: the YOLO route is not a haptics route')

assert.equal(hapticsOrigin({}), HAPTICS_ORIGIN_DEFAULT)
assert.equal(hapticsOrigin({ HAPTICS_ORIGIN: 'http://127.0.0.1:5290/' }), 'http://127.0.0.1:5290')

const src = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'hapticsDevPlugin.ts'), 'utf8')
assert.match(src, /apply: 'serve'/)
assert.doesNotMatch(src, /COM7/, 'negative: the page proxy does not pick the serial port')

console.log('hapticsDevPlugin: ok')
