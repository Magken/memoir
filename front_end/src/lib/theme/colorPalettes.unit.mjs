/**
 * Grass palette is pitch-black with scene yellows/orange for LCL + WebGL.
 * Run: node front_end/src/lib/theme/colorPalettes.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  THEME_PALETTE_FAMILIES,
  colorPalettes,
  resolveThemePaletteId,
  themePaletteFamily,
  themePaletteMode,
} from './colorPalettes.ts'

assert.ok(THEME_PALETTE_FAMILIES.includes('grass'))
assert.equal(themePaletteFamily('grassDark'), 'grass')
assert.equal(themePaletteMode('grassDark'), 'dark')
assert.equal(resolveThemePaletteId('grass', 'dark'), 'grassDark')

const grass = colorPalettes.grassDark
assert.equal(grass.pageBg, '#000000')
assert.equal(grass.sceneYellowBright, '#FFC400')
assert.equal(grass.sceneYellow, '#E29D0E')
assert.equal(grass.sceneOrange, '#4A1F00')
assert.equal(grass.info, '#3AB1DC')
assert.equal(grass.accent, grass.sceneYellowBright)
assert.equal(grass.complement, grass.sceneYellow)
assert.equal(grass.warning, grass.sceneOrange)

const src = fs.readFileSync(fileURLToPath(new URL('./colorPalettes.ts', import.meta.url)), 'utf8')
assert.doesNotMatch(
  src,
  /THEME_PALETTE_FAMILIES = \['brand', 'eugenia', 'ember'\]/,
  'negative: grass must be a first-class palette family',
)

console.log('colorPalettes: ok')
