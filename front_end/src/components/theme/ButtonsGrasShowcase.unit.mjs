/**
 * GRAS Theme section demos GrasUnderlineButton nest recipe and LinkHoverFx; no invented underline.
 * Run: node front_end/src/components/theme/ButtonsGrasShowcase.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = fs.readFileSync(fileURLToPath(new URL('./ButtonsGrasShowcase.tsx', import.meta.url)), 'utf8')

assert.match(src, /export function ButtonsGrasShowcase/)
assert.match(src, /GrasUnderlineButton/)
assert.match(src, /layout="nest"/)
assert.match(src, /LinkHoverFx/)
assert.match(src, /proseInlineLinkClass/)
assert.doesNotMatch(src, /VurifyMenuButton/, 'negative: GRAS showcase does not demo Vurify chrome')
assert.doesNotMatch(
  src,
  /theme-gras-underline-btn--/,
  'negative: do not invent a second size/underline scale in the showcase',
)

console.log('ButtonsGrasShowcase: ok')
