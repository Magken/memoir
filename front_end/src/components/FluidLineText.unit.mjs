/**
 * Fluid line text splits into clip-curtain units.
 * Run: node front_end/src/components/FluidLineText.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = fs.readFileSync(fileURLToPath(new URL('./FluidLineText.tsx', import.meta.url)), 'utf8')

assert.match(src, /export function FluidLineText/)
assert.match(src, /theme-fluid-line/)
assert.match(src, /theme-fluid-chars__fill/)
assert.match(src, /theme-fluid-line__fill/)
assert.match(src, /data-flip-id/)
assert.doesNotMatch(src, /style=/, 'negative: curtain markup is classes, not inline style')
assert.doesNotMatch(src, /TypeAnimText/, 'negative: this is not the rotateX TypeAnim preset')

console.log('FluidLineText: ok')
