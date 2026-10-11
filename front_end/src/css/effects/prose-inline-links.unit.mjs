/**
 * Prose inline links — sizes + host class.
 * Run: node front_end/src/css/effects/prose-inline-links.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(fileURLToPath(import.meta.url))
const css = fs.readFileSync(path.join(dir, 'prose-inline-links.css'), 'utf8')

assert.match(css, /\.theme-prose-inline/)
assert.match(css, /theme-prose-inline__link--sm/)
assert.match(css, /theme-prose-inline__link--md/)
assert.match(css, /theme-prose-inline__link--lg/)
assert.match(css, /--theme-prose-inline-link-size-hover/)
assert.match(css, /transition:[\s\S]{0,120}font-size/)
assert.match(css, /:has\(\.theme-prose-inline__link:is\(:hover/)
assert.match(css, /--theme-prose-inline-dim/)
assert.match(css, /--theme-prose-inline-link-size:\s*2\.35em/)
assert.match(css, /--theme-prose-inline-link-size-hover:\s*3\.45em/)
assert.match(css, /font-family:\s*var\(--font-display-sans\)/)
assert.match(css, /white-space:\s*normal/)
assert.doesNotMatch(
  css,
  /transform:\s*scale\(/,
  'negative: hover grow must reflow via font-size, not transform scale',
)
assert.doesNotMatch(css, /filter:/, 'negative: no filter stacks on prose links')
assert.doesNotMatch(
  css,
  /white-space:\s*nowrap/,
  'negative: multi-word prose links must wrap with the paragraph',
)

console.log('prose-inline-links: ok')
