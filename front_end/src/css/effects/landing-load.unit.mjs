import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'landing-load.css'), 'utf8')

assert.match(css, /theme-hairline-fx__rule/)
assert.match(css, /--type-anim-duration:\s*1\.2s/)
assert.match(css, /cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\)/)
assert.match(css, /animation-delay:\s*0\.035s/)
assert.match(css, /justify-content:\s*flex-start/)
assert.match(css, /theme-lcl-preview__display-head/)
assert.match(css, /theme-landing-load__stack/)
assert.match(css, /gap:\s*0\.75rem/)
assert.match(css, /padding-bottom:\s*0\.75rem/)
assert.doesNotMatch(css, /space-between|0\.85em/, 'negative: the box must not stretch the word and the percent apart')
assert.doesNotMatch(css, /data-id='s2'/, 'negative: the percent is not a second cell')
assert.match(css, /flex-wrap:\s*nowrap/)
assert.match(css, /theme-landing-load__sizer/)
assert.match(css, /theme-landing-load__glyph/)
assert.doesNotMatch(css, /max-content|is-settled|padding-top:\s*1\.75rem/, 'negative: no second geometry after enter')
assert.match(css, /type-anim-flip-in/)
assert.match(css, /vurify-menu-type-flip-out/)
assert.doesNotMatch(
  css,
  /theme-landing-load \.type-anim--flip \.type-anim__unit \{[^}]*overflow:\s*hidden/,
  'negative: flip glyphs must not clip',
)
assert.doesNotMatch(css, /filter:/, 'negative: no filter bloom on the load type')
assert.doesNotMatch(
  css,
  /theme-landing-load \{[^}]*transform:\s*scale/,
  'negative: the load overlay is not scaled on its own',
)

console.log('landing-load: ok')
