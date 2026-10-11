/**
 * The dev route only forwards health, info, predict, and a sample image.
 * Run: node --experimental-strip-types front_end/src/lib/yolo/yoloDevPlugin.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isYoloSampleUrl, randomSampleUrl, yoloOrigin, yoloUpstreamPath, YOLO_ORIGIN_DEFAULT } from './yoloDevPlugin.ts'

assert.equal(yoloUpstreamPath('/api/yolo/health'), '/health')
assert.equal(yoloUpstreamPath('/api/yolo/info'), '/info')
assert.equal(yoloUpstreamPath('/api/yolo/predict'), '/predict')
assert.equal(yoloUpstreamPath('/api/yolo/predict?x=1'), '/predict')
assert.equal(yoloUpstreamPath('/api/yolo/sample'), null)
assert.equal(isYoloSampleUrl('/api/yolo/sample?seed=abc'), true)
assert.equal(yoloUpstreamPath('/api/yolo/../../../etc/passwd'), null, 'negative: a path outside the four routes is not forwarded')
assert.equal(yoloUpstreamPath('/api/kps/assets'), null, 'negative: the KPS route is not a YOLO route')

assert.equal(yoloOrigin({}), YOLO_ORIGIN_DEFAULT)
assert.equal(yoloOrigin({ YOLO_ORIGIN: 'http://127.0.0.1:20000/' }), 'http://127.0.0.1:20000')

const sample = randomSampleUrl('seed/../evil')
assert.equal(sample, 'https://picsum.photos/seed/seedevil/1280/827')
assert.equal(randomSampleUrl(''), 'https://picsum.photos/seed/yolo/1280/827')

const src = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'yoloDevPlugin.ts'), 'utf8')
assert.match(src, /apply: 'serve'/)
assert.doesNotMatch(src, /from_pretrained/, 'negative: the proxy does not download weights')

console.log('yoloDevPlugin: ok')
