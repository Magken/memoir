/**
 * About Home LCL chrome: flipped type in s1; s2 mirrors LclViewportPreview.
 * Run: npx tsx front_end/src/css/effects/about-home-lcl.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'about-home-lcl.css'), 'utf8')

assert.match(css, /color:\s*#ffffff/)
assert.match(css, /writing-mode:\s*sideways-lr/)
assert.match(css, /theme-about-collab-lcl__display \{[\s\S]*?writing-mode:\s*horizontal-tb/)
assert.doesNotMatch(
  css,
  /theme-about-collab-lcl__display \{[^}]*writing-mode:\s*sideways-rl/,
  'negative: the top title is horizontal, not the old right strip',
)
assert.match(css, /type-display-xl/)
assert.match(css, /16vh/)
assert.doesNotMatch(css, /10vh/, 'negative: type must not keep the smaller strip size')
assert.match(css, /theme-about-home-lcl__panel/)
assert.match(css, /transform-origin:\s*50%\s*50%/)
assert.match(css, /padding-block:\s*0\.28em/)
assert.match(
  css,
  /tile\[data-id='s2'\][\s\S]*?overflow:\s*visible/,
  's2 must not clip nest/prose like the invented overflow:hidden panel',
)
assert.doesNotMatch(
  css,
  /tile\[data-id='s2'\] \{[^}]*overflow:\s*hidden/,
  'negative: s2 must not clip LCL chrome',
)
assert.match(
  css,
  /\.theme \.theme-about-home-lcl \{[^}]*pointer-events:\s*none/,
  'overlay root must pass mouse through to the WebGL canvas',
)
assert.match(
  css,
  /html\[data-lcl-scale\] \.theme \.theme-lcl-scale-host \{[^}]*width:\s*calc\(100% \/ var\(--lcl-scale\)\)[^}]*transform:\s*scale\(var\(--lcl-scale\)\)[^}]*transform-origin:\s*top left/,
  'short viewports lay the LCL sheet out large, then scale that one host',
)
assert.doesNotMatch(
  css,
  /theme-about-home-lcl \{[^}]*transform:\s*scale/,
  'negative: each overlay is not scaled on its own',
)
assert.match(
  css,
  /\.theme-about-home-lcl__panel \{[^}]*pointer-events:\s*auto/,
  'collective panel must accept clicks on the area list',
)
assert.doesNotMatch(
  css,
  /\.theme \.theme-about-home-lcl \{[^}]*pointer-events:\s*auto/,
  'negative: root must not reclaim hit-testing over the scene',
)
assert.doesNotMatch(
  css,
  /rotate\(-90deg\)/,
  'negative: do not spin the block with transform rotate',
)
assert.doesNotMatch(
  css,
  /transform-origin:\s*left\s+bottom/,
  'negative: left-bottom origin swings the type off the left edge',
)
assert.match(css, /__display \.theme-hairline-fx \{[\s\S]*?width:\s*max-content/)
assert.doesNotMatch(
  css,
  /\.theme-about-home-lcl \.theme-hairline-fx \{[\s\S]*?width:\s*max-content/,
  'negative: max-content on every hairline shortens nest list rules',
)
assert.match(
  css,
  /__panel \.theme-lcl-layout__nest-item \{[\s\S]*?width:\s*100%/,
  'nest rows must span the tile so hairlines reach the end',
)
assert.match(
  css,
  /__panel \.theme-lcl-layout__nest-item \{[\s\S]*?text-align:\s*end/,
  'About area labels hug the right edge',
)
assert.match(
  css,
  /li:last-child \.theme-hairline-fx__wipe \{[^}]*display:\s*block/,
  'last area keeps its hairline',
)
assert.doesNotMatch(
  css,
  /theme-about-home-lcl__nest-rule/,
  'negative: no divider between intro paragraph and nest list',
)
assert.doesNotMatch(
  css,
  /__panel \.theme-lcl-layout__nest li:last-child \.theme-hairline-fx__wipe \{[^}]*display:\s*none/,
  'negative: About must not hide the last nest rule',
)
assert.match(
  css,
  /__display-head \{[^}]*padding-bottom:\s*0\.2rem/,
  'crumb-to-divider gap is tight',
)
assert.match(
  css,
  /theme-about-home-lcl__panel \.theme-lcl-breadcrumb \{[\s\S]{0,80}margin-top:\s*0/,
  'About trail has no title, so drop the toolkit crumb top margin',
)
assert.match(
  css,
  /__are \{[\s\S]*?margin-inline-start:\s*0\.4em/,
  'second stack column indent stays modest so long titles do not clip',
)
assert.doesNotMatch(
  css,
  /__are \{[\s\S]*?margin-inline-start:\s*1\.35em/,
  'negative: do not keep the oversized who/are nest indent on long titles',
)
assert.match(
  css,
  /theme-scroll-enter__mask \{[\s\S]*?padding-block:\s*0\.28em/,
  'sideways char masks keep extra room so glyphs are not clipped',
)
assert.match(css, /__refs \{[\s\S]*?align-items:\s*flex-end/,
  'reference links hug the right',
)
assert.match(
  css,
  /__steps \.theme-prose-inline__p \{[^}]*font-size:\s*1\.375rem/,
  'About intro body is visibly larger than type-body-lg',
)
assert.match(css, /__steps \.type-body-lg \{[\s\S]*?color:\s*inherit/)
assert.match(
  css,
  /color:\s*inherit/,
  'prose inherits rest/dim so link hover greys the sentence',
)
assert.doesNotMatch(
  css,
  /__steps \.type-body[^{]*\{[^}]*color:\s*#ffffff/,
  'negative: forced white on body blocks the prose-inline grey-out',
)
assert.match(
  css,
  /__steps \.theme-prose-inline__link \{[\s\S]*?font-family:\s*inherit/,
  'About prose links use the body face so phrases wrap with the sentence',
)
assert.match(
  css,
  /__steps \.theme-prose-inline__link \{[\s\S]*?line-height:\s*inherit/,
  'About prose links share the paragraph line box',
)
assert.match(
  css,
  /__steps \.theme-prose-inline__link \{[\s\S]*?white-space:\s*normal/,
  'About multi-word links may break at spaces',
)
assert.match(
  css,
  /__steps \.theme-prose-inline__link--sm \{[\s\S]*?--theme-prose-inline-link-size:\s*1em/,
  'GRAS matches body size at rest',
)
assert.match(
  css,
  /__steps \.theme-prose-inline__link--sm \{[\s\S]*?--theme-prose-inline-link-size-hover:\s*1\.12em/,
  'GRAS hover grow stays gentle',
)
assert.match(
  css,
  /__steps\.theme-prose-inline \{[\s\S]*?--theme-prose-inline-expand-dur:\s*0\.72s/,
  'About prose-inline expand is slower than toolkit default',
)
assert.doesNotMatch(
  css,
  /__steps \.theme-prose-inline__link--sm \{[\s\S]*?--theme-prose-inline-link-size:\s*1\.45em/,
  'negative: About must not keep the oversized toolkit sm rest size',
)
assert.match(
  css,
  /color-mix\(in srgb, #ffffff 40%, transparent\)/,
  'current crumb stays grey over the panel white type',
)
assert.doesNotMatch(
  css,
  /__panel \.type-lead,/,
  'negative: do not force every type-lead white over the current crumb',
)

console.log('about-home-lcl: ok')
