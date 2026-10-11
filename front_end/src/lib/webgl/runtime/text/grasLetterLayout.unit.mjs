/**
 * Vertical GRAS stack: G on top, S on the ground. One Adam-scale cursor lamp, not letter lamps.
 * Run: npx tsx front_end/src/lib/webgl/runtime/text/grasLetterLayout.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  GRAS_EXPAND_PREFIX,
  GRAS_EXPAND_SLIDE,
  GRAS_EXPAND_DURATION,
  GRAS_EXPAND_SUFFIX,
  GRAS_LETTER_SIZE,
  GRAS_LETTER_TRACKING,
  GRAS_LETTERS,
  GRAS_LIGHT_GAIN_MAX,
  GRAS_OBJECT_COLOR,
  GRAS_SUFFIX_SIZE,
  GRAS_TYPEFACE_URL,
  grasClipLeftX,
  grasClipRightX,
  grasLetterCentersY,
  grasCursorLightDistance,
  grasCursorLightIntensity,
  grasCursorLightLift,
  grasCursorLightWorldScale,
  grasIdleLightIntensity,
  grasIdleLightY,
  grasLightEase,
  GRAS_CURSOR_LIGHT_DISTANCE,
  GRAS_CURSOR_LIGHT_LIFT,
  GRAS_CURSOR_LIGHT_POWER,
  GRAS_IDLE_LIGHT_POWER,
  grasPrefixSlideX,
  grasRowAlignX,
  grasRowHitSize,
  grasRowLayout,
  grasSuffixSlideX,
  grasWordCentersX,
  grasWordmarkHeight,
  grasWordmarkOriginY,
  GRAS_FRONT_YAW,
} from './grasLetterLayout.ts'
import { WIRE_LIGHT_HOVER_INTENSITY, WIRE_LIGHT_WAVE_INTENSITY } from '../materials/wireLights.ts'

assert.deepEqual([...GRAS_LETTERS], ['G', 'R', 'A', 'S'])
assert.equal(GRAS_OBJECT_COLOR, '#f2c48a')
assert.equal(GRAS_LIGHT_GAIN_MAX, 2)
assert.equal(GRAS_TYPEFACE_URL, '/fonts/megrim.typeface.json')

const even = [0.4, 0.4, 0.4, 0.4]
const centers = grasLetterCentersY(even, 0.1)
assert.ok(centers[0] > centers[3], `G must sit above S, got ${centers.join(',')}`)
assert.equal(centers[3], 0.2, `S center should be half its height on the ground, got ${centers[3]}`)
assert.ok(Math.abs(grasWordmarkHeight(even, 0.1) - 1.9) < 1e-9)
assert.equal(grasWordmarkOriginY('ground', 1.98), 0)
assert.equal(grasWordmarkOriginY('top', 1.98), -1.98)
assert.notEqual(
  grasWordmarkOriginY('top', 1.98),
  0,
  'negative: ground origin puts the pin under S instead of on G',
)
assert.equal(GRAS_FRONT_YAW, -Math.PI / 2)
assert.notEqual(GRAS_FRONT_YAW, 0, 'negative: +Z letter fronts read sideways from Adam Home')

assert.equal(grasCursorLightIntensity(true), GRAS_CURSOR_LIGHT_POWER)
assert.equal(grasCursorLightIntensity(false), 0, 'negative: cursor lamp must not stay on after leave')
assert.equal(
  GRAS_CURSOR_LIGHT_POWER,
  WIRE_LIGHT_HOVER_INTENSITY,
  'GRAS hover lamp matches Adam’s single cursor lamp',
)
assert.notEqual(
  GRAS_CURSOR_LIGHT_POWER,
  2000,
  'negative: webgpu_lights_pointlights glyph-interior power is not the hover lamp',
)
assert.equal(grasCursorLightWorldScale(0.1, 0.1, 0.1), 0.1)
assert.equal(grasCursorLightDistance(1), GRAS_CURSOR_LIGHT_DISTANCE)
assert.equal(grasCursorLightDistance(0.1), GRAS_CURSOR_LIGHT_DISTANCE * 0.1)
assert.equal(grasCursorLightLift(0.1), GRAS_CURSOR_LIGHT_LIFT * 0.1)
assert.equal(grasCursorLightIntensity(true, 0.1), GRAS_CURSOR_LIGHT_POWER * 0.1)
assert.notEqual(
  grasCursorLightDistance(0.1),
  GRAS_CURSOR_LIGHT_DISTANCE,
  'negative: unscaled 0.8m range ignores the landing GRAS scale of 0.1',
)
assert.notEqual(
  grasCursorLightIntensity(true, 0.1),
  GRAS_CURSOR_LIGHT_POWER,
  'negative: full-size lamp power on a 0.1 wordmark floods the scene',
)
assert.equal(GRAS_IDLE_LIGHT_POWER, WIRE_LIGHT_WAVE_INTENSITY)
assert.equal(grasIdleLightIntensity(false), GRAS_IDLE_LIGHT_POWER)
assert.equal(grasIdleLightIntensity(true), 0, 'negative: rest lamp must not stay on while hovering')
const idlePath = [1.6, 1.1, 0.6, 0.2]
assert.equal(grasIdleLightY(0, idlePath), idlePath[0])
assert.equal(grasIdleLightY(0.25, idlePath), idlePath[1])
assert.notEqual(
  grasIdleLightY(0.1, idlePath),
  grasIdleLightY(0, idlePath),
  'negative: rest lamp must travel between letters',
)
assert.ok(grasLightEase(1.85, 0, 1 / 60) > 0, 'leave must not snap the lamp off')
assert.ok(grasLightEase(1.85, 0, 1 / 60) < 1.85)
assert.ok(grasLightEase(0, 1.85, 1 / 60) > 0 && grasLightEase(0, 1.85, 1 / 60) < 1.85)
assert.equal(GRAS_EXPAND_DURATION, 0.64, 'letter expand is not part of the scene speed pass')
assert.ok(GRAS_EXPAND_DURATION > 0.55, 'expand/contract must be slower than a snap')
assert.notEqual(GRAS_EXPAND_DURATION, 0.42, 'negative: 0.42s expand is too abrupt')

assert.throws(
  () => grasLetterCentersY([0.4, 0.4], 0.1),
  /expected 4 heights/,
  'negative: a short stack is not GRAS',
)
assert.ok(
  grasLetterCentersY([0.5, 0.4, 0.4, 0.3], 0.1)[0] >
    grasLetterCentersY([0.5, 0.4, 0.4, 0.3], 0.1)[3],
)

const reversed = [...centers].reverse()
assert.notDeepEqual(centers, reversed, 'negative: reading bottom-to-top is not the stacked order')

const dir = path.dirname(fileURLToPath(import.meta.url))
const names = fs.readdirSync(dir)
assert.equal(
  names.filter((name) => name.toLowerCase() === 'grasletters.ts').length,
  0,
  'negative: a GrasLetters.ts sibling steals the component URL on Windows',
)
assert.ok(names.includes('GrasWordmark.tsx'))
assert.ok(names.includes('grasLetterLayout.ts'))
assert.equal(
  names.filter((name) => name.toLowerCase() === 'grasletters.tsx' || name.toLowerCase() === 'grasletters.ts').length,
  0,
  'negative: GrasLetters.tsx / .ts must not sit beside the wordmark',
)

const typefacePath = path.resolve(dir, '../../../../../public/fonts/megrim.typeface.json')
const typeface = JSON.parse(fs.readFileSync(typefacePath, 'utf8'))
assert.match(String(typeface.familyName ?? ''), /Megrim/i)
for (const letter of GRAS_LETTERS) {
  assert.ok(typeface.glyphs?.[letter], `Megrim typeface must include ${letter}`)
}
assert.equal(typeface.glyphs?.['字'], undefined, 'negative: CJK is outside the latin Megrim cut')

assert.deepEqual(
  { G: GRAS_EXPAND_SUFFIX.G, R: GRAS_EXPAND_SUFFIX.R, A: GRAS_EXPAND_SUFFIX.A, S: GRAS_EXPAND_SUFFIX.S },
  { G: 'eneral', R: 'epresentation', A: 'bstract', S: 'ystems' },
)
assert.deepEqual(
  { G: GRAS_EXPAND_PREFIX.G, R: GRAS_EXPAND_PREFIX.R, A: GRAS_EXPAND_PREFIX.A, S: GRAS_EXPAND_PREFIX.S },
  { G: '', R: '', A: 'of', S: '' },
)
assert.ok(GRAS_SUFFIX_SIZE < GRAS_LETTER_SIZE, 'remainder glyphs must be smaller than the stem')
assert.notEqual(GRAS_SUFFIX_SIZE, GRAS_LETTER_SIZE, 'negative: same-size remainder does not fit the row')
for (const letter of GRAS_LETTERS) {
  for (const ch of `${GRAS_EXPAND_PREFIX[letter]}${GRAS_EXPAND_SUFFIX[letter]}`) {
    assert.ok(typeface.glyphs?.[ch], `Megrim typeface must include ${letter} expand ${ch}`)
  }
}

const packed = grasWordCentersX([0.4, 0.2, 0.2], 0.05)
assert.equal(packed.totalWidth, 0.9)
assert.ok(Math.abs(packed.centersX[0] - (-0.25)) < 1e-9, `stem center in a centered word, got ${packed.centersX[0]}`)
assert.equal(grasWordCentersX([]).totalWidth, 0, 'negative: an empty word has no width')

assert.equal(grasRowAlignX(-0.25, 0), 0.25, 'rest: shift the row so the stem sits on x = 0')
assert.equal(grasRowAlignX(-0.25, 1), 0, 'expanded: the word is already centered')
assert.notEqual(grasRowAlignX(-0.25, 0), 0, 'negative: leaving the row at 0 keeps the stem left of center')

assert.equal(grasSuffixSlideX(0.1, 0), 0.1 + GRAS_EXPAND_SLIDE)
assert.equal(grasSuffixSlideX(0.1, 1), 0.1)
assert.notEqual(grasSuffixSlideX(0.1, 0), 0.1, 'negative: rest must sit to the right of the final glyph')
assert.equal(grasPrefixSlideX(0.1, 0), 0.1 - GRAS_EXPAND_SLIDE)
assert.equal(grasPrefixSlideX(0.1, 1), 0.1)
assert.notEqual(grasPrefixSlideX(0.1, 0), 0.1, 'negative: of must sit to the left of A at rest')

assert.equal(grasClipRightX(0.2, 1.0, 0), 0.2)
assert.equal(grasClipRightX(0.2, 1.0, 1), 1.0)
assert.ok(grasClipRightX(0.2, 1.0, 0) < grasClipRightX(0.2, 1.0, 1))
assert.equal(grasClipLeftX(-0.2, -1.0, 0), -0.2)
assert.equal(grasClipLeftX(-0.2, -1.0, 1), -1.0)
assert.ok(grasClipLeftX(-0.2, -1.0, 1) < grasClipLeftX(-0.2, -1.0, 0))

const general = grasRowLayout('G', (ch) => (ch === 'G' ? 0.4 : 0.2), GRAS_LETTER_TRACKING)
assert.equal(general.suffix, 'eneral')
assert.equal(general.prefix, '')
assert.equal(general.chars.join(''), 'General')
assert.equal(general.stemIndex, 0)
assert.ok(general.stemCenterX < 0, 'G sits left of the expanded word center')
assert.ok(general.wordRight > general.stemRight)
assert.notEqual(general.totalWidth, general.widths[0], 'negative: General is not a single G')

const abstract = grasRowLayout('A', (ch) => (ch === 'A' ? 0.4 : 0.2), GRAS_LETTER_TRACKING)
assert.equal(abstract.prefix, 'of')
assert.equal(abstract.suffix, 'bstract')
assert.equal(abstract.chars.join(''), 'ofAbstract')
assert.equal(abstract.stemIndex, 2)
assert.ok(abstract.wordLeft < abstract.stemLeft, 'of sits in front of the big A')

const systems = grasRowLayout('S', (ch) => (ch === 'S' ? 0.4 : 0.2), GRAS_LETTER_TRACKING)
assert.equal(systems.prefix, '')
assert.equal(systems.stemIndex, 0)
assert.notEqual(systems.prefix, 'of', 'negative: of belongs on Abstract, not Systems')

const hit = grasRowHitSize(general.totalWidth, 0.4)
assert.ok(hit[0] > general.totalWidth, 'hover box covers the expanded word, not just the stem')
assert.notEqual(hit[0], general.widths[0], 'negative: a stem-sized detector misses the rest of the row as letters move')

const src = fs.readFileSync(path.join(dir, 'GrasWordmark.tsx'), 'utf8')
assert.equal(
  (src.match(/<pointLight/g) ?? []).length,
  2,
  'one rest lamp plus one cursor lamp, not a lamp per glyph',
)
assert.match(src, /applyCeramicScatter/)
assert.match(src, /syncCeramicScatter/)
assert.match(src, /grasCursorLightIntensity/)
assert.match(src, /grasIdleLightY/)
assert.match(src, /grasLightEase/)
assert.match(src, /gras-idle-light/)
assert.match(src, /grasCursorLightDistance/)
assert.match(src, /getWorldScale/)
assert.match(src, /gras-cursor-light/)
assert.match(src, /event\.point/)
assert.match(src, /grasWordmarkOriginY/)
assert.match(src, /GRAS_FRONT_YAW/)
assert.match(src, /GRAS_TYPEFACE_URL/)
assert.match(src, /export const GrasWordmark/)
assert.doesNotMatch(src, /applyWireframe/, 'negative: the wordmark is not a pulse cage')
assert.doesNotMatch(
  src,
  /grasLetterLightIntensity/,
  'negative: letters must not map viewer gain onto inner lamps',
)
assert.doesNotMatch(
  src,
  /intensity=\{lamp\}/,
  'negative: a PointLight on each stem turns the word into four light sources',
)
assert.doesNotMatch(
  src,
  /distance=\{GRAS_CURSOR_LIGHT_DISTANCE\}/,
  'negative: a hardcoded 0.8m lamp ignores the scene scale of the wordmark',
)
assert.match(src, /gras-row-hit-/)
assert.match(src, /grasRowHitSize/)
assert.match(src, /skipLetterRaycast/)
assert.match(src, /onPointerOver/)
assert.match(src, /onHoverChange/)
assert.match(src, /hoverEnabled = true/)
assert.match(
  src,
  /const onOver = contextSafe\(\(\) => \{\s*if \(!hoverEnabled\) return/,
  'the letter expand uses the same hover lock as the cursor lamp',
)
assert.doesNotMatch(
  src,
  /const onOver = contextSafe\(\(\) => \{\s*if \(prefixRef/,
  'negative: the row hit must not expand while the crane has hover locked',
)
assert.doesNotMatch(
  src,
  /onPointerOver=\{\(event\) => \{\s*hovering\.current = true/,
  'negative: GRAS hover must not start while hoverEnabled is off',
)
assert.match(src, /onPointerOut/)
assert.doesNotMatch(
  src,
  /ref=\{rowRef\}[\s\S]{0,120}onPointerOver/,
  'negative: hover on the moving letter group leaves the cursor as the row recenters',
)
assert.match(src, /clippingPlanes/)
assert.match(src, /grasSuffixSlideX/)
assert.match(src, /grasRowAlignX/)
assert.match(src, /easeCarouselWheel/)
assert.match(src, /GRAS_EXPAND_SUFFIX/)
assert.match(src, /GRAS_EXPAND_PREFIX/)
assert.match(src, /GRAS_SUFFIX_SIZE/)
assert.match(src, /grasPrefixSlideX/)
assert.match(src, /gras-letter-\$\{layout\.letter\}-prefix-/)
assert.doesNotMatch(
  src,
  /meshBasicMaterial/,
  'negative: expanded glyphs skip Adam ceramic scatter',
)

const stageSrc = fs.readFileSync(path.resolve(dir, '../core/WebglStage.tsx'), 'utf8')
assert.match(stageSrc, /localClippingEnabled/)

console.log('grasLetterLayout: ok')
