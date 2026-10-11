/**
 * ScrollEnterText splits chars into the Codrops Enter mask.
 * Run: node front_end/src/components/ScrollEnterText.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = fs.readFileSync(fileURLToPath(new URL('./ScrollEnterText.tsx', import.meta.url)), 'utf8')

assert.match(src, /export function ScrollEnterText/)
assert.match(src, /applyScrollEnter/)
assert.match(src, /theme-scroll-enter__char/)
assert.match(src, /theme-scroll-enter__mask/)
assert.match(src, /useGSAP/)
assert.match(src, /scrollerRef/)
assert.match(src, /split = 'chars'/)
assert.match(src, /bind = 'scroll'/)
assert.match(src, /bind === 'none'/)
assert.match(src, /attachScroll/)
assert.doesNotMatch(
  src,
  /const bind = \(\) =>/,
  'negative: local attach fn must not shadow the bind prop (TDZ crash)',
)
assert.doesNotMatch(src, /style=/, 'negative: clip mask is a class, not inline style')
assert.doesNotMatch(src, /PageScrollType/, 'negative: this is not stretch-rise Effect 2/6')

console.log('ScrollEnterText: ok')
