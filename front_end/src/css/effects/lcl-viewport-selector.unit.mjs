/**
 * 16:9 LCL screen is an 8×8 paint grid, not four quadrants.
 * Flame ink is a separate reusable asset — not defined or composed here.
 * Run: node front_end/src/css/effects/lcl-viewport-selector.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(fileURLToPath(import.meta.url))
const css = fs.readFileSync(path.join(dir, 'lcl-viewport-selector.css'), 'utf8')
const selector = fs.readFileSync(
  path.resolve(dir, '../../components/webglToolkit/LclViewportSelector.tsx'),
  'utf8',
)

assert.match(css, /aspect-ratio:\s*16\s*\/\s*9/)
assert.match(css, /grid-template-columns:\s*repeat\(8,\s*1fr\)/)
assert.match(css, /grid-template-rows:\s*repeat\(8,\s*1fr\)/)
assert.doesNotMatch(
  css,
  /grid-template-columns:\s*repeat\(2,\s*1fr\)/,
  'negative: LCL is not a four-quadrant split',
)
assert.match(css, /--lcl-tone:\s*oklch\(0\.68 0\.18 145\)/)
assert.match(css, /--lcl-tone:\s*oklch\(0\.65 0\.2 350\)/)
assert.doesNotMatch(
  css,
  /data-tone='1'\] \{[^}]*--theme-text/,
  'negative: section colours must not stay blue and grey',
)
assert.match(selector, /LCL_GRID_CELLS/)
assert.match(selector, /serializeLclViewportSections/)
assert.doesNotMatch(selector, /style=/, 'negative: no inline style on the selector')
assert.match(selector, /theme-lcl-selector__scene/)
assert.match(selector, /sceneId \? \(/)
assert.match(css, /theme-lcl-selector__scene \{/)
assert.match(css, /pointer-events:\s*none/)
assert.match(css, /\[data-scene='true'\] \{[^}]*background:\s*#000000/)
assert.match(css, /theme-lcl-selector__grid \{[^}]*z-index:\s*1/)
assert.match(css, /\.theme-lcl-preview \{/)
assert.match(css, /min-height:\s*100svh/)
assert.match(css, /theme-lcl-preview \.theme-lcl-layout__tile \{[^}]*pointer-events:\s*none/)
assert.match(css, /theme-lcl-preview \.theme-lcl-layout__nest \{[^}]*pointer-events:\s*auto/)
assert.match(css, /theme-lcl-preview \.theme-lcl-layout__nest-item \{[^}]*pointer-events:\s*auto/)
assert.match(css, /\[data-id='s1'\] \{[^}]*justify-content:\s*flex-start/)
assert.match(css, /\[data-id='s2'\] \{[^}]*justify-content:\s*flex-start/)
assert.match(css, /\[data-id='s2'\] \{[^}]*align-items:\s*flex-start/)
assert.match(
  css,
  /\[data-id='s2'\] > \.theme-hairline-fx \{[^}]*width:\s*100%/,
)
assert.match(css, /theme-lcl-preview__display-head \{[^}]*padding-bottom:\s*0\.75rem/)
assert.doesNotMatch(
  css,
  /theme-lcl-preview__crumb/,
  'negative: crumb chrome lives in lcl-breadcrumb.css',
)
assert.match(css, /theme-lcl-preview \.theme-lcl-layout__nest-item \{[^}]*color:\s*#ffffff/)
assert.match(css, /theme-hairline-fx__rule \{[^}]*background-color:\s*#ffffff/)
assert.match(css, /\[data-id='s3'\] \{[^}]*justify-content:\s*flex-start/)
assert.match(css, /theme-lcl-preview__text-steps \{/)
assert.match(css, /theme-lcl-preview__text-steps\.theme-prose-inline/)
assert.doesNotMatch(
  css,
  /theme-lcl-preview__text-step \{/,
  'negative: stacked __text-step chrome moved to prose-inline-links',
)
assert.match(css, /theme-lcl-preview \.theme-lcl-layout__nest-item \.theme-scroll-enter__mask \{[^}]*padding-inline-start:\s*var\(--type-anim-distance\)/)
assert.doesNotMatch(
  css,
  /theme-lcl-preview__crumb[\s\S]{0,800}theme-link-fx/,
  'negative: crumb underline is plain ::after, not link-fx / Eirene',
)
assert.doesNotMatch(
  css,
  /--theme-lcl-ink-gradient|theme-lcl-ink-bloom|theme-flame-ink-bloom/,
  'negative: flame ink lives in flame-ink.css, not LCL preview CSS',
)
assert.doesNotMatch(
  css,
  /background-clip:\s*text/,
  'negative: text mask is not inlined in LCL selectors (use .theme-flame-ink when composing)',
)
assert.doesNotMatch(
  css,
  /filter:\s*var\(--theme-lcl-scatter/,
  'negative: no filter / drop-shadow stack',
)
assert.doesNotMatch(
  css,
  /\[data-id='s1'\] \{[^}]*grid-column:\s*1\s*\/\s*4/,
  'negative: preview placement lives on data-cs tiles, not hardcoded s1 columns',
)

console.log('lcl-viewport-selector: ok')
