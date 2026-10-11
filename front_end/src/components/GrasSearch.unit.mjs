/**
 * GrasSearch: resting type-line label; lift only on focus/value.
 * Run: node front_end/src/components/GrasSearch.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = fs.readFileSync(fileURLToPath(new URL('./GrasSearch.tsx', import.meta.url)), 'utf8')

assert.match(src, /export function GrasSearch/)
assert.match(src, /theme-gras-search/)
assert.match(src, /theme-hairline-fx--eirene/)
assert.match(src, /theme-hairline-fx__pill/)
assert.match(src, /is-label-up/)
assert.match(src, /labelUp = focused \|\| hasValue/)
assert.match(src, /type-body-lg/)
assert.doesNotMatch(src, /theme-hairline-fx__label/, 'negative: shell must not use eirene label lift')
assert.doesNotMatch(
  src,
  /filled = focused \|\|/,
  'negative: do not treat focus as filled for resting layout',
)
assert.doesNotMatch(src, /theme-gras-search__rule/, 'negative: no custom underline rule — use eirene')
assert.doesNotMatch(src, /theme-vurify-input/, 'negative: GrasSearch is GRAS chrome, not VurifyInput')
assert.match(src, /placeholder = ''/, 'default: no secondary hint under the float label')
assert.doesNotMatch(
  src,
  /placeholder = 'Search…'/,
  'negative: do not default a second placeholder — float label is the description',
)
assert.match(src, /strokeWidth=\{2\.6\}/, 'search icon stroke matches menu icon weight')
assert.match(src, /ScrollEnterText/, 'LCL list in/out drives icon + float label')
assert.match(src, /theme-gras-search__icon-slot/, 'icon slot shares the field type-line pad')
assert.match(
  src,
  /ScrollEnterText[\s\S]{0,120}theme-gras-search__icon/,
  'search icon is a scroll-enter unit',
)
assert.match(
  src,
  /theme-gras-search__float[\s\S]{0,120}ScrollEnterText/,
  'float label is a scroll-enter unit',
)
assert.doesNotMatch(
  src,
  /strokeWidth=\{1\.75\}/,
  'negative: 1.75 is too thin next to the Menu hamburger',
)
assert.doesNotMatch(src, /theme-field/, 'negative: GrasSearch is not the Field shell SearchInput')

console.log('GrasSearch: ok')
