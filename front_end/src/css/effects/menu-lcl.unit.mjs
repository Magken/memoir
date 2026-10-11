/**
 * Menu LCL CSS: top-center Menu, bottom-left horizontal Quick access + header rule.
 * Run: node front_end/src/css/effects/menu-lcl.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const css = fs.readFileSync(fileURLToPath(new URL('./menu-lcl.css', import.meta.url)), 'utf8')

assert.match(css, /\.theme-menu-lcl/)
assert.match(css, /theme-menu-lcl__menu/)
assert.match(css, /theme-menu-lcl__quick/)
assert.match(css, /left:\s*50%/)
assert.match(css, /translateX\(-50%\)/)
assert.match(css, /\.theme-menu-lcl__quick \{[^}]*left:/)
assert.match(css, /\.theme-menu-lcl__quick \{[^}]*bottom:/)
assert.match(css, /flex-direction:\s*row/)
assert.match(css, /theme-menu-lcl__menu-icon/)
assert.match(css, /theme-menu-lcl__menu-icon-enter/)
assert.match(
  css,
  /menu:is\(:hover, :focus-within\) \.theme-menu-lcl__menu-icon-enter \{[\s\S]{0,120}translate3d\(0,\s*-4px/,
  'hamburger lifts with the Menu eirene bounce on hover',
)
assert.doesNotMatch(
  css,
  /menu-icon-enter \{[\s\S]{0,200}transition:\s*none(?!\s*!important)/,
  'negative: icon must not skip the hover lift transition at rest',
)
assert.match(css, /\.theme-menu-lcl__menu \{[^}]*display:\s*inline-flex/)
assert.match(css, /align-items:\s*center/)
assert.match(css, /margin-bottom:\s*0/, 'icon shares letter row — no pad matching old btn padding')
assert.match(css, /--menu-lcl-icon-w:\s*1\.35em/)
assert.match(css, /--menu-lcl-icon-h:\s*0\.52em/, 'optical cap-height — sized under Megrim Menu')
assert.doesNotMatch(
  css,
  /--menu-lcl-icon-h:\s*0\.68em/,
  'negative: prior 0.68em icon still reads too large beside Menu',
)
assert.doesNotMatch(
  css,
  /--menu-lcl-icon-h:\s*1em/,
  'negative: 1em stroke-filled box dwarfs Megrim Menu letters',
)
assert.doesNotMatch(
  css,
  /--menu-lcl-icon-w:\s*1\.75em/,
  'negative: prior oversized width',
)
assert.doesNotMatch(
  css,
  /--menu-lcl-icon-w:\s*2\.55em/,
  'negative: prior oversized width',
)
assert.match(
  css,
  /\.theme-menu-lcl__menu-btn \{[^}]*padding:\s*0\s+0\.05rem\s+0\s+0/,
  'no bottom pad on Menu — underline sits under glyphs',
)
assert.match(
  css,
  /\.theme-menu-lcl__menu-btn \.theme-hairline-fx__wipe \{[^}]*height:\s*3px/,
  'short wipe — no detached underline gap',
)
assert.match(
  css,
  /\.theme-menu-lcl__menu-icon-enter \.theme-scroll-enter__mask \{[^}]*overflow:\s*hidden/,
  'icon mask clips enter like Menu letters — no visible deep fall',
)
assert.match(
  css,
  /\.theme-menu-lcl__menu-icon-enter \.theme-scroll-enter__char \{[^}]*height:\s*var\(--menu-lcl-icon-h\)/,
  'enter char height tracks icon so yPercent stays near Menu letters',
)
assert.match(
  css,
  /\.theme-menu-lcl__menu-icon\.theme-stroke-menu-icon \{[^}]*height:\s*var\(--menu-lcl-icon-h\)/,
  'layout box height matches enter travel',
)
assert.match(
  css,
  /\.theme-menu-lcl__menu-icon\.theme-stroke-menu-icon \{[^}]*width:\s*var\(--menu-lcl-icon-w\)/,
  'layout box width matches cropped stroke aspect',
)
assert.match(
  css,
  /\.theme-menu-lcl__menu-btn \.theme-scroll-enter__mask \{[^}]*height:\s*auto/,
  'Menu label mask is natural height — does not pad the underline down',
)
assert.doesNotMatch(
  css,
  /\.theme-menu-lcl__menu-btn \.theme-scroll-enter__char \{[^}]*height:\s*[^a]/,
  'negative: do not force a tall height on Menu letter chars (pushes eirene down)',
)
assert.doesNotMatch(
  css,
  /\.theme-menu-lcl__menu-icon-enter[\s\S]{0,280}overflow:\s*visible/,
  'negative: icon enter must stay clipped — visible overflow shows a deeper fall than Menu',
)
assert.doesNotMatch(
  css,
  /--menu-lcl-icon-stroke-scale/,
  'negative: no uniform SVG scale (stubs the hamburger lines)',
)
assert.doesNotMatch(
  css,
  /--menu-lcl-icon-size:\s*1\.55em/,
  'negative: no oversized absolute icon box (that forced overflow:visible and a deep enter)',
)
assert.match(
  css,
  /\.theme-menu-lcl:not\(\.is-open\)[\s\S]{0,120}focus-within:not\(:hover\)[\s\S]{0,80}scale3d\(1,\s*0\.14,\s*1\)/,
)
assert.match(css, /gap:\s*1\.25rem/)
assert.match(css, /\.theme-menu-lcl__menu-btn \.type-display \{[^}]*font-size:\s*1em/)
assert.doesNotMatch(css, /theme-menu-lcl__menu-row/, 'negative: underline is label-only; no shared menu-row')
assert.doesNotMatch(
  css,
  /gap:\s*0\.12em/,
  'negative: icon sits tight beside Menu, not a wide flex gap',
)
assert.match(
  css,
  /\.theme-menu-lcl__quick-item \.theme-gras-underline-btn \{[^}]*color:\s*var\(--theme-text-muted\)/,
)
assert.match(
  css,
  /\.theme-menu-lcl__quick-item \.theme-gras-underline-btn:is\(:hover, :focus-visible\) \{[^}]*color:\s*var\(--theme-text\)/,
)
assert.doesNotMatch(css, /theme-menu-lcl__stakeholder-divider/, 'negative: no Stakeholder Vertical Divider on Quick access')
assert.doesNotMatch(
  css,
  /\.theme-menu-lcl__quick-item \.theme-gras-underline-btn \{[^}]*color:\s*var\(--theme-accent\)/,
  'negative: Quick access is gray at rest, not accent yellow',
)
assert.doesNotMatch(css, /theme-menu-lcl__quick-sep/, 'negative: no hand-rolled sep')
assert.doesNotMatch(
  css,
  /\.theme-menu-lcl__quick \{[^}]*right:/,
  'negative: Quick access is bottom-left, not bottom-right',
)
assert.doesNotMatch(css, /theme-vurify/, 'negative: Menu LCL is GRAS chrome, not Vurify')

console.log('menu-lcl: ok')
