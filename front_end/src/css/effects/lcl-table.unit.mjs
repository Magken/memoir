/**
 * LCL table — sibling dim + row hairline pill color.
 * Run: node front_end/src/css/effects/lcl-table.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const css = fs.readFileSync(fileURLToPath(new URL('./lcl-table.css', import.meta.url)), 'utf8')

assert.match(css, /\.theme-lcl-table/)
assert.match(
  css,
  /:has\(tr:hover\) \.theme-lcl-table__row:not\(:hover\) \{[\s\S]{0,80}--theme-prose-inline-dim/,
  'sibling rows dim via the prose token when any row is hovered',
)
assert.match(
  css,
  /theme-lcl-table__row \.theme-hairline-fx__pill \{[\s\S]{0,80}--theme-prose-inline-dim/,
  'row pills rest gray (not white currentColor)',
)
assert.match(
  css,
  /theme-lcl-table__row:is\(:hover, :focus-within\) \.theme-hairline-fx__pill \{[\s\S]{0,80}--theme-text/,
  'expanded/hover row pill goes white',
)
assert.doesNotMatch(
  css,
  /theme-lcl-table__row \.theme-hairline-fx__pill \{[\s\S]{0,80}currentColor/,
  'negative: currentColor rest flashes white when :has(tr:hover) drops between rows',
)
assert.match(
  css,
  /\}\s*\n+\s*\/\*[\s\S]*?Unlayered[\s\S]*?theme-lcl-table__row \.theme-hairline-fx__pill/,
  'pill color sits outside @layer so it beats eirene currentColor',
)

console.log('lcl-table: ok')
