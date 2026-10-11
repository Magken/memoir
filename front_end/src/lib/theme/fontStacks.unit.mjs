/**
 * Default stack is GRAS (Megrim / Space Mono / Nunito). Vurify stays the Cosmic reference.
 * Run: npx tsx front_end/src/lib/theme/fontStacks.unit.mjs
 */
import assert from 'node:assert/strict'
import { buildFontVars } from './buildFontVars.ts'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEFAULT_FONT_STACK_ID, fontStacks, THEME_FONT_STACK_STORAGE_KEY } from './fontStacks.ts'

assert.equal(DEFAULT_FONT_STACK_ID, 'gras')
assert.equal(THEME_FONT_STACK_STORAGE_KEY, 'theme_font_stack_v2')
assert.doesNotMatch(DEFAULT_FONT_STACK_ID, /^vurify$/, 'negative: Theme default is GRAS, not Vurify')
assert.equal(Object.keys(fontStacks)[0], 'gras', 'GRAS must lead the Theme font picker')
assert.equal(fontStacks.gras.name, 'GRAS')
assert.match(fontStacks.gras.display, /Megrim/)
assert.equal(fontStacks.gras.displayWeight, 700)
assert.match(fontStacks.gras.displaySans ?? '', /Space Mono/)
assert.match(fontStacks.gras.sans, /Nunito/)
assert.doesNotMatch(
  fontStacks.gras.displaySans ?? '',
  /Megrim/,
  'negative: smaller titles must not use the oversize Megrim face',
)
assert.doesNotMatch(
  fontStacks.gras.sans,
  /Space Mono/,
  'negative: regular text stays Hoss Round, not Monotalic',
)

assert.equal(fontStacks.vurify.name, 'Vurify')
assert.match(fontStacks.vurify.display, /Bricolage Grotesque/)
assert.doesNotMatch(fontStacks.vurify.display, /Megrim/, 'negative: Vurify stays Cosmic, not the GRAS display face')

const vars = buildFontVars(fontStacks.gras)
assert.equal(vars['--font-display'], fontStacks.gras.display)
assert.equal(vars['--font-display-weight'], '700')
assert.match(String(vars['--font-display-sans']), /Space Mono/)
assert.match(String(vars['--font-sans']), /Nunito/)

const brand = buildFontVars(fontStacks.brand)
assert.equal(brand['--font-display-weight'], '600', 'negative: stacks without displayWeight stay at 600')

const dir = path.dirname(fileURLToPath(import.meta.url))
const showcase = fs.readFileSync(
  path.join(dir, '../../components/theme/TypographyShowcase.tsx'),
  'utf8',
)
assert.match(showcase, /Default stack is[\s\S]{0,80}GRAS/)
assert.doesNotMatch(
  showcase,
  /Default stack is[\s\S]{0,80}Vurify/,
  'negative: Theme copy must not still name Vurify as the default stack',
)

console.log('fontStacks: ok')
