/**
 * Footer preview media must not size the peel (explore links stay put).
 * Run: node front_end/src/css/effects/home-footer.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'home-footer.css'),
  'utf8',
)

const previewBlock = css.match(
  /\.theme \.home-footer__preview \{[\s\S]*?\n  \}/,
)?.[0]
assert.ok(previewBlock, 'preview block missing')
assert.match(previewBlock, /height:\s*0;/)
assert.match(previewBlock, /min-height:\s*100%;/)

assert.match(
  css,
  /\.home-footer__preview-panel\[data-layout='media'\] \{[\s\S]*?grid-template-rows:\s*minmax\(0,\s*1fr\) auto/,
)

assert.doesNotMatch(
  previewBlock,
  /min-height:\s*min\(14rem/,
  'negative: preview must not set its own hug height from the illustration',
)
assert.doesNotMatch(
  css,
  /preview-panel\[data-layout='media'\][\s\S]{0,80}minmax\(10rem,\s*1fr\)/,
  'negative: media row must not grow from a 10rem intrinsic floor',
)

console.log('home-footer.unit.mjs: ok')
