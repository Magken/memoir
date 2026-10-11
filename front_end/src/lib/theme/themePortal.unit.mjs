/**
 * Fullscreen hides anything portaled to document.body.
 * Run: npx tsx front_end/src/lib/theme/themePortal.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = fs.readFileSync(fileURLToPath(new URL('./themePortal.ts', import.meta.url)), 'utf8')

assert.match(src, /document\.fullscreenElement/)
assert.match(src, /fullscreen instanceof HTMLElement \? fullscreen : document\.body/)
assert.doesNotMatch(
  src,
  /parent:\s*document\.body/,
  'negative: a fullscreen scene editor must not leave dropdowns on the page behind it',
)

console.log('themePortal: ok')
