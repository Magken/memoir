/**
 * Inverse Eirene hairline: pill grows on hover; label rises; wipe is a separate GSAP layer.
 * Run: node front_end/src/css/effects/link-hover-styles.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const css = fs.readFileSync(fileURLToPath(new URL('./link-hover-styles.css', import.meta.url)), 'utf8')

assert.match(css, /\.theme-link-fx--eirene:hover::before \{[\s\S]*?transform:\s*scale3d\(1\.2,\s*0\.1,\s*1\)/)
assert.match(css, /\.theme-hairline-fx__wipe \{[\s\S]*?height:\s*1px/)
assert.match(css, /\.theme-hairline-fx__wipe \{[\s\S]*?transform-origin:\s*100%\s*50%/)
assert.match(css, /\.theme-hairline-fx__rule \{/)
assert.doesNotMatch(
  css,
  /\.theme-hairline-fx:hover \.theme-hairline-fx__rule/,
  'negative: the plain 1px rule does not thicken on hover',
)
assert.match(css, /\.theme-hairline-fx__pill \{[\s\S]*?transform:\s*scale3d\(1,\s*0\.14,\s*1\)/)
assert.match(css, /\.theme-hairline-fx__pill \{[\s\S]*?border-radius:\s*20px/)
assert.match(
  css,
  /\.theme-hairline-fx--eirene:hover \.theme-hairline-fx__pill[\s\S]*?transform:\s*scale3d\(1,\s*1,\s*1\)/,
)
assert.match(
  css,
  /\.theme-hairline-fx--eirene:hover \.theme-hairline-fx__pill[\s\S]*?cubic-bezier\(0\.2,\s*0\.57,\s*0\.67,\s*1\.53\)/,
)
assert.match(
  css,
  /\.theme-hairline-fx--eirene:hover > \.theme-scroll-enter[\s\S]*?translate3d\(0,\s*-4px,\s*0\)/,
)
assert.doesNotMatch(
  css,
  /\.theme-hairline-fx--eirene:hover span/,
  'negative: do not translate descendant spans (TypeAnim owns those transforms)',
)
assert.doesNotMatch(
  css,
  /\.theme-hairline-fx--eirene:hover \.theme-hairline-fx__pill[\s\S]*?scale3d\(1\.2,\s*0\.1,\s*1\)/,
  'negative: inverse Eirene must not flatten the pill on hover',
)
assert.doesNotMatch(
  css,
  /\.theme-hairline-fx__wipe \{[\s\S]*?transform-origin:\s*0%\s*50%/,
  'negative: wipe origin stays on the right so reverse exits left-to-right',
)

console.log('link-hover-styles: ok')
