/**
 * Fluid motion helpers — clip curtains, not opacity slides.
 * Run: node front_end/src/lib/animations/fluidMotion.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = fs.readFileSync(fileURLToPath(new URL('./fluidMotion.ts', import.meta.url)), 'utf8')
const barrel = fs.readFileSync(fileURLToPath(new URL('../gsap.ts', import.meta.url)), 'utf8')

assert.match(src, /export const FLUID_IN_S = 0\.9/)
assert.match(src, /export const FLUID_OUT_S = 0\.55/)
assert.match(src, /yPercent: 110/)
assert.match(src, /yPercent: 0/)
assert.match(src, /clipPath: 'inset\(100% 0% 0% 0%\)'/)
assert.match(src, /scale: 1\.18/)
assert.match(src, /absolute: false/)
assert.match(src, /clearProps/)
assert.match(src, /easeFluidIn/)
assert.match(src, /theme-fluid-flip/)
assert.match(src, /export function playFluidFit/)
assert.match(src, /Flip\.fit/)
assert.match(src, /runBackwards: true/)
assert.match(barrel, /easeFluidIn/, 'public lib/gsap.ts barrel must re-export easeFluidIn')
assert.match(barrel, /easeFluidOut/, 'public lib/gsap.ts barrel must re-export easeFluidOut')
assert.doesNotMatch(src, /autoAlpha/, 'negative: Lusion curtains do not fade glyphs')
assert.doesNotMatch(
  src,
  /Flip\.fit\([\s\S]*absolute:\s*true/,
  'negative: Flip.fit must not absolute the source grid',
)

console.log('fluidMotion: ok')
