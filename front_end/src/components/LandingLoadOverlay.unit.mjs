import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'LandingLoadOverlay.tsx'), 'utf8')

assert.match(src, /lclScene\('loader'\)/)
assert.match(src, /pacedLoadPercent/)
assert.match(src, /startLclListIn/)
assert.match(src, /theme-scroll-enter__char/)
assert.match(src, /theme-landing-load__sizer/)
assert.match(src, /theme-landing-load__stack/)
assert.doesNotMatch(src, /section\.id === 's2'|data-id='s2'/, 'negative: one display area, not two cells')
assert.match(src, /theme-hairline-fx__wipe/)
assert.doesNotMatch(src, /is-settled/, 'negative: enter does not swap a second layout')
assert.match(src, /formatLoadPercent/)
assert.match(src, /SHAPES = \['plus', 'triangle', 'circle'\]/)
assert.match(src, /useState<'rest' \| 'out' \| 'in'>\('rest'\)/)
assert.doesNotMatch(src, /ScrollEnterText/, 'negative: enter stays on the same slots, no second mount')
assert.doesNotMatch(src, /otherLetter|abcdefghijklmnopqrstuvwxyz/, 'negative: a letter flips into a shape, not a random letter')
assert.doesNotMatch(src, /nextDisplayedPercent/, 'negative: the count is not a timer chase')
assert.match(src, /startLclListOut/)
assert.doesNotMatch(src, /setTimeout\(\(\) => onCompleteRef/, 'negative: the overlay does not unmount before the LCL out')
assert.doesNotMatch(src, /CurtainLoading/, 'negative: the overlay is not the curtain')

console.log('LandingLoadOverlay: ok')
