/**
 * Short viewports scale the LCL only. 800px vertical height is the threshold.
 * Run: npx tsx front_end/src/lib/viewport/shortViewport.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SHORT_VPH, SHORT_VPH_SCALE, viewportScale } from './shortViewport.ts'

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'shortViewport.ts'), 'utf8')

assert.equal(SHORT_VPH, 800)
assert.equal(SHORT_VPH_SCALE, 0.75)
assert.equal(viewportScale(799), 0.75)
assert.equal(viewportScale(800), 1, 'negative: 800px is the threshold and does not scale')
assert.equal(viewportScale(1200), 1, 'negative: a tall viewport stays full size')
assert.match(src, /--lcl-scale/)
assert.doesNotMatch(src, /style\.zoom/, 'negative: the scene is not zoomed with the LCL')

console.log('shortViewport: ok')
