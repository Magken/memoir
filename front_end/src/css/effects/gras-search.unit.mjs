/**
 * Gras search CSS — fixed shell; label translates only.
 * Run: node front_end/src/css/effects/gras-search.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const css = fs.readFileSync(fileURLToPath(new URL('./gras-search.css', import.meta.url)), 'utf8')

assert.match(css, /\.theme-gras-search/)
assert.match(css, /theme-hairline-fx__pill/)
assert.match(css, /theme-gras-search__icon-slot/)
assert.match(
  css,
  /\.theme-gras-search__shell \{[\s\S]{0,200}align-items:\s*flex-start/,
  'shell starts icon + field from the same top edge',
)
assert.match(
  css,
  /theme-gras-search__icon-slot \{[\s\S]{0,200}padding:\s*0\.35rem 0 0\.15rem/,
  'icon slot uses the same vertical pad as the field type line',
)
assert.match(
  css,
  /icon-slot \.theme-scroll-enter__mask \{[^}]*overflow:\s*hidden/,
  'icon clip box stays overflow hidden so leave can drop',
)
assert.match(
  css,
  /\.theme-gras-search__icon \{[\s\S]{0,120}height:\s*1\.35rem/,
  'leave height comes from the icon box, not a shorter mask',
)
assert.doesNotMatch(
  css,
  /\.theme-gras-search__shell \{[\s\S]{0,200}align-items:\s*center/,
  'negative: center parks the icon above the type line (field has more top pad)',
)
assert.doesNotMatch(
  css,
  /icon-slot \.theme-scroll-enter__mask \{[^}]*height:\s*1\.35rem/,
  'negative: a hard mask height clips the SVG stroke',
)
assert.match(
  css,
  /__float \.theme-scroll-enter__mask \{[^}]*overflow:\s*hidden/,
  'float label clip is a block mask so Search projects can leave',
)
assert.doesNotMatch(
  css,
  /__float \.theme-scroll-enter__mask[\s\S]{0,80}display:\s*inline[;\s]/,
  'negative: inline mask collapses yPercent and leaves a squished label',
)
assert.match(css, /is-label-up[\s\S]{0,200}translate3d/)
assert.match(css, /padding:\s*1\.25rem 0 0\.2rem/, 'shell pad is fixed')
assert.match(
  css,
  /\.theme-gras-search__float \{[\s\S]{0,400}transition:[\s\S]{0,200}0\.52s/,
  'float settle-back is slow/smooth (not the snappy 0.22s fluid out)',
)
assert.match(
  css,
  /is-label-up[\s\S]{0,200}transition-duration:\s*0\.4s/,
  'lift-off is slightly shorter than settle-back',
)
assert.doesNotMatch(
  css,
  /\.theme-gras-search__float \{[\s\S]{0,400}0\.22s/,
  'negative: 0.22s fluid-out is too abrupt for the description float',
)
assert.doesNotMatch(
  css,
  /is-label-up[\s\S]{0,80}padding-top/,
  'negative: focus must not add padding-top (that pushes the bar down)',
)
assert.doesNotMatch(css, /theme-gras-search__rule/, 'negative: no custom rule — eirene owns the underline')
assert.doesNotMatch(
  css,
  /\.theme-gras-search\s*>\s*\.theme-hairline-fx__wipe\s*\{[^}]*scaleX:\s*1/,
  'negative: do not force wipe visible — LCL startLclListIn/Out owns scaleX',
)
assert.doesNotMatch(css, /theme-vurify-input/, 'negative: Gras search tokens are not Vurify input classes')

console.log('gras-search: ok')
