/**
 * buildPaletteVars emits page + scene tokens for grass.
 * Run: node front_end/src/lib/theme/buildPaletteVars.unit.mjs
 */
import assert from 'node:assert/strict'
import { colorPalettes } from './colorPalettes.ts'
import { buildPaletteVars } from './buildPaletteVars.ts'

const grass = buildPaletteVars(colorPalettes.grassDark)
assert.equal(grass['--theme-page-bg'], '#000000')
assert.equal(grass['--theme-bg'], '#000000')
assert.equal(grass['--theme-accent'], '#FFC400')
assert.equal(grass['--theme-complement'], '#E29D0E')
assert.equal(grass['--theme-scene-yellow-bright'], '#FFC400')
assert.equal(grass['--theme-scene-yellow'], '#E29D0E')
assert.equal(grass['--theme-scene-orange'], '#4A1F00')

const brand = buildPaletteVars(colorPalettes.brand)
assert.equal(brand['--theme-scene-yellow-bright'], undefined)
assert.equal(brand['--theme-bg'], colorPalettes.brand.pageBg)

console.log('buildPaletteVars: ok')
