/**
 * Footer LCL: home subtitle, divider, compact left links.
 * Run: npx tsx front_end/src/components/FooterLinksOverlay.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FOOTER_LCL_IN_S } from './FooterLinksOverlay.tsx'
import { lclScene } from '../lib/lcl/lclScenes.ts'

const here = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(here, 'FooterLinksOverlay.tsx'), 'utf8')
const css = readFileSync(join(here, '../css/effects/about-home-lcl.css'), 'utf8')

assert.equal(FOOTER_LCL_IN_S, 3.2)
assert.equal(lclScene('footerLinks').sections.map((section) => section.id).join(','), 's1,s2')
assert.match(src, /lclScene\('footerLinks'\)/)
assert.match(src, /section\.id === 's1'/)
assert.match(src, /section\.id === 's2'/)
assert.match(src, /FOOTER_MARK/)
assert.match(src, /FOOTER_COPYRIGHT/)
assert.match(src, /FOOTER_HOME_LABEL/)
assert.match(src, /FOOTER_LINKS\.map/)
assert.match(src, /GrasUnderlineButton/)
assert.match(src, /layout="nest"/)
assert.doesNotMatch(
  src,
  /className="theme-lcl-layout__nest-item/,
  'negative: nest rows use GrasUnderlineButton, not hand-rolled nest class strings',
)
assert.match(src, /theme-footer-home/)
assert.doesNotMatch(src, /type-lead/, 'negative: the footer home line is display caps, not the lead size')
assert.match(src, /type-body mb-0/)
assert.doesNotMatch(src, /className="type-body-sm mb-0">\s*\{link/, 'negative: footer links are a step above the small body size')
assert.match(src, /theme-hairline-fx__rule/)
assert.match(src, /startLclListIn/)
assert.match(src, /startLclListOut/)
assert.match(src, /onOpen\(link\.id\)/)
assert.match(css, /\.theme-footer-lcl \.theme-about-home-lcl__panel \{[^}]*width: max-content/)
assert.doesNotMatch(
  css,
  /\.theme-footer-lcl \.theme-about-home-lcl__panel \{[^}]*[^-]width: 100%/,
  'negative: footer lines fit the copy, they do not span the tile',
)
assert.match(css, /\.theme-footer-lcl \.theme-about-home-lcl__panel \.theme-lcl-layout__nest-item \{[^}]*justify-items: start/)
assert.match(css, /\.theme-about-home-lcl__panel \.theme-lcl-layout__nest-item \{[^}]*justify-items: end/)
assert.doesNotMatch(src, /type-h3/, 'negative: footer links stay smaller than the About list')
assert.doesNotMatch(src, /text-align: end/, 'negative: footer links are left aligned')
assert.doesNotMatch(src, /LclBreadcrumb/, 'negative: home is a subtitle, not a trail')
assert.match(css, /\.theme-footer-home \{[^}]*font-family: var\(--font-display\)/)
assert.match(css, /\.theme-footer-home \{[^}]*font-weight: 700/)
assert.match(css, /\.theme-footer-home \{[^}]*text-transform: uppercase/)
assert.match(css, /\.theme-footer-mark__name \{[^}]*font-family: var\(--font-display\)/)
assert.doesNotMatch(
  css,
  /\.theme-footer-mark__name \{[^}]*font-size: clamp\(3rem/,
  'negative: the footer mark stays smaller than the poster display',
)
assert.doesNotMatch(src, /\u2014|\u2013/, 'negative: reader copy has no em or en dash')

console.log('FooterLinksOverlay: ok')
