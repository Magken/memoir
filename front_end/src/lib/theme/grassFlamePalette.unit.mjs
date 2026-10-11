/**
 * Flame band extractor from warm RGB samples.
 * Run: npx tsx front_end/src/lib/theme/grassFlamePalette.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  GRASS_FLAME_FROM_REFS,
  extractGrassFlamePalette,
  isWarmFlamePixel,
  rgbToHex,
} from './grassFlamePalette.ts'

assert.equal(rgbToHex({ r: 255, g: 196, b: 0 }), '#FFC400')
assert.equal(GRASS_FLAME_FROM_REFS.bright, '#FFC400')
assert.equal(GRASS_FLAME_FROM_REFS.dirty, '#4A1F00')
assert.equal(GRASS_FLAME_FROM_REFS.flame, '#B86A08')

assert.equal(isWarmFlamePixel({ r: 184, g: 106, b: 8 }), true)
assert.equal(isWarmFlamePixel({ r: 10, g: 10, b: 10 }), false, 'negative: near-black is not flame body')
assert.equal(isWarmFlamePixel({ r: 58, g: 200, b: 220 }), false, 'negative: cyan spark is not warm body')

/** Synthetic ramp: dirty → ember → flame → gold → bright + specular + cyan. */
const ramp = []
for (let i = 0; i < 40; i++) {
  const t = i / 39
  ramp.push({
    r: Math.round(74 + t * 181),
    g: Math.round(31 + t * 165),
    b: Math.round(0 + t * 20),
  })
}
for (let i = 0; i < 8; i++) ramp.push({ r: 255, g: 240, b: 179 })
for (let i = 0; i < 4; i++) ramp.push({ r: 58, g: 177, b: 220 })

const out = extractGrassFlamePalette(ramp)
assert.match(out.dirty, /^#[0-9A-F]{6}$/)
assert.match(out.bright, /^#[0-9A-F]{6}$/)
const d = Number.parseInt(out.dirty.slice(1, 3), 16)
const b = Number.parseInt(out.bright.slice(1, 3), 16)
assert.ok(b > d, 'bright red channel should exceed dirty')
assert.equal(out.cyan, '#3AB1DC')

const tiny = extractGrassFlamePalette([{ r: 1, g: 1, b: 1 }])
assert.deepEqual(tiny, GRASS_FLAME_FROM_REFS, 'negative: sparse input falls back to ref bake')

console.log('grassFlamePalette: ok')
