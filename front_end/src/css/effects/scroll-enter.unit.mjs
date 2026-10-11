/**
 * Named scroll-enter clip + rotateX tokens.
 * Run: node front_end/src/css/effects/scroll-enter.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const css = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'scroll-enter.css'), 'utf8')

assert.match(css, /--theme-scroll-enter-in/)
assert.match(css, /theme-scroll-enter__mask/)
assert.match(css, /overflow:\s*hidden/)
assert.match(css, /perspective:\s*1000px/)
assert.match(css, /theme-scroll-enter__char/)
assert.match(css, /transform-origin:\s*50% 100%/)
assert.doesNotMatch(css, /opacity:\s*0/, 'negative: Codrops Enter does not fade glyphs')

console.log('scroll-enter: ok')
