/**
 * Menu LCL: LCL enter/out, Megrim display Menu, bottom-left horizontal Quick access.
 * Run: node front_end/src/components/MenuLclOverlay.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = fs.readFileSync(fileURLToPath(new URL('./MenuLclOverlay.tsx', import.meta.url)), 'utf8')

assert.match(src, /export function MenuLclOverlay/)
assert.match(src, /GrasUnderlineButton/)
assert.match(src, /StrokeMenuIcon/)
assert.match(src, /variant="cross-1"/)
assert.match(src, /checked=\{open\}/)
assert.match(src, /onCheckedChange=\{setOpen\}/)
assert.match(src, /hit=\{false\}/)
assert.match(src, /viewBox="0 38 62 24"/, 'cropped viewBox fills letter-height enter box')
assert.match(src, /theme-menu-lcl__menu-icon/)
assert.match(src, /theme-menu-lcl__menu-icon-enter/)
assert.match(
  src,
  /theme-scroll-enter__char[\s\S]{0,200}StrokeMenuIcon/,
  'icon is a scroll-enter char like Menu letters',
)
assert.doesNotMatch(
  src,
  /<ScrollEnterText[^>]*>\s*<StrokeMenuIcon/,
  'negative: icon must not use ScrollEnterText (its useGSAP races startLclListIn)',
)
assert.match(src, /if \(open\) button\.blur\(\)/)
assert.doesNotMatch(
  src,
  /setOpen\(\(prev\) => \{[\s\S]*blur/,
  'negative: blur must not run inside the setState updater (currentTarget is null there)',
)
assert.doesNotMatch(src, /decorative/, 'negative: icon sits beside the underline button, not inside it')
assert.doesNotMatch(src, /theme-menu-lcl__menu-row/, 'negative: underline wraps Menu label only')
assert.match(src, /startLclListIn/)
assert.match(src, /startLclListOut/)
assert.match(src, /theme-scroll-enter__char/)
assert.match(src, /type-display/)
assert.match(src, /theme-hairline-fx__rule/)
assert.match(src, /theme-menu-lcl__quick-row/)
assert.match(src, /onMenuOpenChange/)
assert.match(src, /playRetreat\(open \? 1 : 0\)/)
assert.match(src, /ease: 'power2\.out'/)
assert.doesNotMatch(src, /easeCarouselWheel/, 'negative: lamp kill uses a snappy power2.out, not the carousel ease')
assert.doesNotMatch(src, /theme-divider--vertical/, 'negative: Quick access has no vertical divider')
assert.doesNotMatch(src, /theme-menu-lcl__stakeholder-divider/, 'negative: Stakeholder Vertical Divider removed from Quick access')
assert.doesNotMatch(src, /theme-menu-lcl__quick-sep/, 'negative: no hand-rolled sep')
assert.doesNotMatch(src, /type-display-sm/, 'negative: Menu uses Megrim type-display, not display-sm sans')
assert.doesNotMatch(src, /TypeAnimText/, 'negative: Menu LCL enter is scroll-enter chars, not TypeAnim')
assert.doesNotMatch(src, /theme-lcl-layout__nest/, 'negative: Quick access is a horizontal row, not a nest list')
assert.doesNotMatch(
  src,
  /className="type-body mb-0"/,
  'negative: Quick access links are type-h3, not body',
)
assert.doesNotMatch(
  src,
  /theme-menu-lcl__panel[\s\S]{0,200}GrasUnderlineButton/,
  'negative: open menu body stays empty for now',
)
assert.doesNotMatch(src, /VurifyMenuButton/, 'negative: Menu LCL uses GrasUnderlineButton')

console.log('MenuLclOverlay: ok')
