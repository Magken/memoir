/**
 * Asset byte progress drives the landing percent. Display is that number, padded.
 * Run: npx tsx front_end/src/lib/webgl/assetPreload.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assetLoadPercent, formatLoadPercent, pacedLoadPercent, LOAD_COUNT_MIN_MS } from './assetPreload.ts'

assert.equal(assetLoadPercent([]), 100)
assert.equal(assetLoadPercent([0, 0, 0]), 0)
assert.equal(assetLoadPercent([1, 0, 0]), 33)
assert.equal(assetLoadPercent([0.5, 0.5]), 50)
assert.equal(assetLoadPercent([1, 1, 1]), 100)
assert.equal(formatLoadPercent(0), '000')
assert.equal(formatLoadPercent(7), '007')
assert.equal(formatLoadPercent(42), '042')
assert.equal(formatLoadPercent(100), '100')
assert.notEqual(formatLoadPercent(5), '5', 'negative: a place must not be left blank')
assert.equal(LOAD_COUNT_MIN_MS, 2000)
assert.equal(pacedLoadPercent(100, 0), 0)
assert.equal(pacedLoadPercent(100, 1000), 50)
assert.equal(pacedLoadPercent(100, 1999), 99)
assert.equal(pacedLoadPercent(100, 2000), 100)
assert.equal(pacedLoadPercent(40, 2000), 40)
assert.notEqual(pacedLoadPercent(100, 0), 100, 'negative: a finished load must not jump to 100')

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'assetPreload.ts'), 'utf8')
assert.match(src, /WEBGL_ASSETS/)
assert.match(src, /kind !== 'splat'/)
assert.match(src, /onprogress/)
assert.match(src, /xhr\.abort/)
assert.doesNotMatch(src, /setInterval/, 'negative: progress comes from the request, not a timer')
assert.doesNotMatch(src, /nextDisplayedPercent/, 'negative: the count is the loaded fraction, not a chase')

console.log('assetPreload: ok')
