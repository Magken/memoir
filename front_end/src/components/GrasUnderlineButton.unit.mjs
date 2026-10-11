/**
 * GrasUnderlineButton copies the LCL nest hairline recipe; no invented underline.
 * Run: node front_end/src/components/GrasUnderlineButton.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = fs.readFileSync(fileURLToPath(new URL('./GrasUnderlineButton.tsx', import.meta.url)), 'utf8')
const css = fs.readFileSync(
  fileURLToPath(new URL('../css/effects/gras-underline-button.css', import.meta.url)),
  'utf8',
)
const nestCss = fs.readFileSync(
  fileURLToPath(new URL('../css/effects/lcl-layout.css', import.meta.url)),
  'utf8',
)
const hairlineCss = fs.readFileSync(
  fileURLToPath(new URL('../css/effects/link-hover-styles.css', import.meta.url)),
  'utf8',
)

assert.match(src, /export const GrasUnderlineButton/)
assert.match(src, /theme-lcl-layout__nest-item/)
assert.match(src, /theme-hairline-fx--eirene/)
assert.match(src, /theme-hairline-fx__pill/)
assert.match(src, /GRAS_NEST_BUTTON_CLASS/)
assert.doesNotMatch(src, /theme-link-fx--/, 'negative: nest button is hairline eirene, not Codrops link-fx')
assert.doesNotMatch(src, /housing=\{/, 'negative: no Vurify housing')
assert.match(nestCss, /theme-lcl-layout__nest-item/)
assert.match(hairlineCss, /theme-hairline-fx--eirene/)
assert.doesNotMatch(css, /::before/, 'negative: do not invent a second underline in gras CSS')
assert.doesNotMatch(css, /scaleX|clip-path/, 'negative: underline motion stays in link-hover-styles')

console.log('GrasUnderlineButton: ok')
