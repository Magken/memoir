/**
 * LCL layout CSS — 8×8 tiles, fluid pane, no percent offsets.
 * Run: node front_end/src/css/effects/lcl-layout.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(fileURLToPath(import.meta.url))
const css = fs.readFileSync(path.join(dir, 'lcl-layout.css'), 'utf8')

assert.match(css, /grid-template-columns:\s*repeat\(8,\s*1fr\)/)
assert.match(css, /\[data-cs='1'\] \{[^}]*grid-column-start:\s*1/)
assert.match(css, /\[data-ce='4'\] \{[^}]*grid-column-end:\s*4/)
assert.match(css, /\[data-rs='1'\] \{[^}]*grid-row-start:\s*1/)
assert.match(css, /\[data-re='9'\] \{[^}]*grid-row-end:\s*9/)
assert.match(css, /theme-lcl-layout__hero/)
assert.match(css, /max-height:\s*12rem/)
assert.match(css, /--theme-fluid-in/)
assert.match(css, /prefers-reduced-motion/)
assert.match(css, /\.theme-lcl-layout__pane\.is-open/)
assert.match(css, /li:last-child \.theme-lcl-layout__nest-item \{[^}]*border-bottom:\s*0/)
assert.match(css, /li:last-child \.theme-hairline-fx__wipe \{[^}]*display:\s*none/)
assert.match(
  css,
  /\.theme-lcl-layout__tile \{[^}]*border:\s*1px solid var\(--theme-border\)[^}]*background:\s*transparent/,
)
assert.doesNotMatch(
  css,
  /theme-lcl-layout__tile \{[^}]*background:\s*var\(--theme-surface-raised\)/,
  'negative: tag tiles are border-only, not grey glass fills',
)
assert.doesNotMatch(
  css,
  /grid-template-columns:\s*repeat\(2,\s*1fr\)/,
  'negative: LCL is not a four-quadrant split',
)
assert.doesNotMatch(
  css,
  /theme-lcl-layer-out-left/,
  'negative: crude 1.25rem copy slides are gone',
)

console.log('lcl-layout: ok')
