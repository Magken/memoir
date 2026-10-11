/**
 * Tab title names GRAS. The public icon is that mark, not the Vurify tile.
 * Run: node front_end/src/components/TitleLoop.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '../../..')
const src = readFileSync(join(here, 'TitleLoop.tsx'), 'utf8')
const icon = readFileSync(join(root, 'front_end/public/favicon.svg'), 'utf8')
const manifest = readFileSync(join(root, 'front_end/public/site.webmanifest'), 'utf8')
const html = readFileSync(join(root, 'front_end/index.html'), 'utf8')

assert.match(src, /const OPENER = 'GRAS'/)
assert.match(src, /General Representation of Abstract Systems/)
assert.match(src, /export const TITLE_LOOP_ENABLED = false/)
assert.doesNotMatch(src, /Vurify/, 'negative: the tab title does not name Vurify')
assert.doesNotMatch(src, /Talent made visible/, 'negative: the old product line is gone')

assert.match(icon, /aria-label="GRAS"/)
assert.match(icon, /fill="#000"/)
assert.match(icon, /<path /)
assert.doesNotMatch(icon, /<rect/, 'negative: the icon has no background tile')
assert.doesNotMatch(icon, /Vurify/, 'negative: the icon does not name Vurify')
assert.doesNotMatch(icon, /#3B39F0/, 'negative: the icon is not the indigo tile')

assert.match(manifest, /"name": "GRAS"/)
assert.match(manifest, /"short_name": "GRAS"/)
assert.doesNotMatch(manifest, /Vurify/, 'negative: the icon name is not Vurify')

assert.match(html, /<title>GRAS \| General Representation of Abstract Systems<\/title>/)

console.log('TitleLoop: ok')
