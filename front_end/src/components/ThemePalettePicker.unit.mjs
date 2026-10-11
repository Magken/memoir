/**
 * Theme palette picker lists Grass beside Brand / Eugenia / Ember.
 * Run: node front_end/src/components/ThemePalettePicker.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = fs.readFileSync(fileURLToPath(new URL('./ThemePalettePicker.tsx', import.meta.url)), 'utf8')

assert.match(src, /id: 'grass'/)
assert.match(src, /label: 'Grass'/)
assert.match(src, /Sparkles/)
assert.doesNotMatch(
  src,
  /familyOptions:[\s\S]*\{ id: 'ember'[\s\S]*\}\s*\]/,
  'negative: Grass must be listed with Brand / Eugenia / Ember',
)

console.log('ThemePalettePicker: ok')
