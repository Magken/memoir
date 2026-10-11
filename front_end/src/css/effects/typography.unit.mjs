/**
 * Oversized display roles use Megrim + display weight; section H1 stays on display-sans.
 * Run: node front_end/src/css/effects/typography.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(fileURLToPath(import.meta.url))
const css = fs.readFileSync(path.join(dir, 'typography.css'), 'utf8')
const fonts = fs.readFileSync(path.join(dir, 'typography-fonts.css'), 'utf8')

const root = css.slice(css.indexOf(':root'), css.indexOf('@theme'))
assert.match(root, /--font-display: 'Megrim'/)
assert.match(root, /--font-display-weight: 700/)
assert.match(root, /--font-display-sans: 'Space Mono'/)
assert.match(root, /--font-sans: 'Nunito'/)
assert.doesNotMatch(root, /--font-display: 'Bricolage Grotesque'/, 'negative: oversize default is not Cosmic')
assert.doesNotMatch(root, /--font-display-sans: 'Bricolage Grotesque'/, 'negative: secondary titles are Monotalic, not Cosmic')

const xl = css.slice(css.indexOf('.theme .type-display-xl'), css.indexOf('.theme .type-display-lg'))
assert.match(xl, /font-family: var\(--font-display\)/)
assert.match(xl, /font-weight: var\(--font-display-weight/)

const h1 = css.slice(css.indexOf('.theme .type-h1'), css.indexOf('.theme .type-h2'))
assert.match(h1, /font-family: var\(--font-display-sans\)/)
assert.doesNotMatch(
  h1,
  /font-family: var\(--font-display\);/,
  'negative: section H1 must not take the oversize Megrim face',
)

const hero = css.slice(css.indexOf('.theme .type-hero-name'), css.indexOf('.theme .type-role-bridge'))
assert.match(hero, /font-weight: var\(--font-display-weight/)

assert.match(fonts, /@fontsource\/megrim\/400\.css/)
assert.match(fonts, /@fontsource\/space-mono\/400\.css/)
assert.match(fonts, /@fontsource\/nunito\/400\.css/)

console.log('typography: ok')
