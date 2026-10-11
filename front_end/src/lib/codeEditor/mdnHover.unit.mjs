/**
 * MDN hover rewrite — strip outbound links, inline summary.
 * Run: npx tsx front_end/src/lib/codeEditor/mdnHover.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  extractMdnUrls,
  isHandledHoverLink,
  isMdnUrl,
  mdnIndexJsonUrl,
  parseMdnIndexJson,
  rewriteMdnHoverMarkdown,
  stripMdnMarkdownLinks,
} from './mdnHover.ts'

const mdn =
  'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map'
assert.equal(isMdnUrl(mdn), true)
assert.equal(isMdnUrl('https://example.com/docs/map'), false)
assert.deepEqual(extractMdnUrls(`See [MDN Reference](${mdn})`), [mdn])
assert.equal(
  mdnIndexJsonUrl(mdn),
  'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map/index.json',
)

const stripped = stripMdnMarkdownLinks(`Array#map\n\n[MDN Reference](${mdn})`)
assert.equal(stripped.includes('http'), false)
assert.match(stripped, /MDN/)

const rewritten = rewriteMdnHoverMarkdown(`[MDN Reference](${mdn})`, [
  { title: 'Array.prototype.map()', summary: 'Creates a new array from calling a function.', url: mdn },
])
assert.equal(rewritten.includes('developer.mozilla.org'), false)
assert.match(rewritten, /Array\.prototype\.map/)
assert.match(rewritten, /Creates a new array/)

const parsed = parseMdnIndexJson(
  { doc: { title: 'map()', summary: 'Calls a function on every element.' } },
  mdn,
)
assert.equal(parsed?.title, 'map()')
assert.match(parsed?.summary ?? '', /Calls a function/)

assert.equal(isHandledHoverLink(mdn), true)
assert.equal(isHandledHoverLink('https://example.com', { blockAllHttps: true }), true)
assert.equal(isHandledHoverLink('https://example.com', { blockAllHttps: false }), false)

console.log('ok — mdnHover')
