/**
 * Feature chips list the current layout features.
 * Run: node front_end/src/components/LclFeatureChips.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = fs.readFileSync(fileURLToPath(new URL('./LclFeatureChips.tsx', import.meta.url)), 'utf8')
assert.match(src, /export function LclFeatureChips/)
assert.match(src, /theme-lcl-chips/)
assert.match(src, /features\.map/)
assert.doesNotMatch(src, /style=/, 'negative: chips use classes, not inline style')

console.log('LclFeatureChips: ok')
