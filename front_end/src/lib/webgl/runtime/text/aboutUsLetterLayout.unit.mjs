/**
 * Two-row About Us: A/U stems, bout/s clip-slide play-in, no leave reverse.
 * Run: npx tsx front_end/src/lib/webgl/runtime/text/aboutUsLetterLayout.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  GRAS_EXPAND_DURATION,
  GRAS_EXPAND_SLIDE,
  GRAS_FRONT_YAW,
  GRAS_LETTER_SIZE,
  GRAS_LETTER_TRACKING,
  GRAS_SUFFIX_SIZE,
  GRAS_TYPEFACE_URL,
  grasIdleLightY,
  grasRowAlignX,
  grasSuffixSlideX,
} from './grasLetterLayout.ts'
import {
  ABOUT_US_EXPAND,
  ABOUT_US_SCENE_FRONT_YAW,
  ABOUT_US_STEMS,
  ABOUT_US_WORD_GAP,
  aboutUsIdleCenters,
  aboutUsPackX,
  aboutUsRowLayout,
  aboutUsVisibleWidth,
  expandRowLayout,
} from './aboutUsLetterLayout.ts'

assert.deepEqual([...ABOUT_US_STEMS], ['A', 'U'])
assert.equal(ABOUT_US_EXPAND.A.suffix, 'bout')
assert.equal(ABOUT_US_EXPAND.U.suffix, 's')
assert.equal(ABOUT_US_EXPAND.A.prefix, '')
assert.equal(ABOUT_US_EXPAND.U.prefix, '')
assert.ok(ABOUT_US_WORD_GAP > GRAS_LETTER_TRACKING)
assert.equal(GRAS_TYPEFACE_URL, '/fonts/megrim.typeface.json')
assert.equal(GRAS_FRONT_YAW, -Math.PI / 2)

const about = aboutUsRowLayout('A', (ch) => (ch === 'A' ? 0.4 : 0.2), GRAS_LETTER_TRACKING)
assert.equal(about.chars.join(''), 'About')
assert.equal(about.letter, 'A')
assert.equal(about.stemIndex, 0)
assert.ok(about.stemCenterX < 0, 'A sits left of the expanded About center')
assert.ok(about.wordRight > about.stemRight)
assert.notEqual(about.totalWidth, about.widths[0], 'negative: About is not a single A')

const us = aboutUsRowLayout('U', (ch) => (ch === 'U' ? 0.4 : 0.2), GRAS_LETTER_TRACKING)
assert.equal(us.chars.join(''), 'Us')
assert.equal(us.letter, 'U')
assert.equal(us.suffix, 's')
assert.notEqual(us.chars.join(''), 'US', 'negative: Us is not two capitals')
assert.notEqual(us.suffix, 'bout', 'negative: bout belongs on About, not Us')

const generic = expandRowLayout('A', '', 'bout', (ch) => (ch === 'A' ? 0.4 : 0.2))
assert.deepEqual(generic.chars, about.chars)

const restPack = aboutUsPackX(about, us, 0)
const openPack = aboutUsPackX(about, us, 1)
assert.ok(restPack.aboutY > restPack.usY, 'About sits above Us at rest')
assert.ok(openPack.aboutY > openPack.usY, 'About sits above Us when expanded')
assert.notEqual(restPack.aboutY, restPack.usY, 'negative: About and Us must not share one row')
assert.ok(openPack.totalWidth > restPack.totalWidth, 'play-in grows the wider row')
assert.equal(openPack.totalHeight, restPack.totalHeight, 'row stack height is not a play-in')
assert.ok(openPack.totalHeight > GRAS_LETTER_SIZE, 'two rows are taller than one glyph')
assert.notEqual(
  restPack.totalWidth,
  openPack.totalWidth,
  'negative: rest packing is not the expanded phrase',
)
const leftRest = aboutUsPackX(about, us, 0, ABOUT_US_WORD_GAP, 'left')
const leftOpen = aboutUsPackX(about, us, 1, ABOUT_US_WORD_GAP, 'left')
const restAboutW = aboutUsVisibleWidth(about, 0)
assert.ok(Math.abs(leftRest.aboutX - restAboutW / 2) < 1e-12, 'left pin is the left of A at rest')
assert.equal(leftRest.aboutY, 0, 'scene pin is the About row')
assert.ok(leftRest.usY < 0, 'Us sits below the pin')
assert.ok(leftOpen.aboutX > leftRest.aboutX, 'About grows to the right of the pin')
assert.notEqual(
  leftRest.aboutY,
  leftRest.usY,
  'negative: left pack must not keep About and Us on one row',
)
assert.notEqual(
  leftRest.aboutX,
  restPack.aboutX,
  'negative: viewer center pack must not steal the scene left pin',
)
assert.equal(ABOUT_US_SCENE_FRONT_YAW, Math.PI / 2)
assert.notEqual(ABOUT_US_SCENE_FRONT_YAW, GRAS_FRONT_YAW, 'negative: About scene Home looks from +X, not Adam −X')
assert.equal(aboutUsVisibleWidth(about, 0), about.stemRight - about.stemLeft)
assert.equal(aboutUsVisibleWidth(about, 1), about.totalWidth)

const restIdle = aboutUsIdleCenters(about, us, 0)
const openIdle = aboutUsIdleCenters(about, us, 1)
assert.equal(restIdle.x[0], restPack.aboutX)
assert.equal(restIdle.x[1], restPack.usX)
assert.equal(restIdle.y[0], restPack.aboutY)
assert.equal(restIdle.y[1], restPack.usY)
assert.ok(restIdle.y[0] > restIdle.y[1], 'idle walks from the About row down to Us')
assert.notEqual(openIdle.x[0], restIdle.x[0], 'negative: A must travel as About expands')
assert.notEqual(restIdle.y[0], restIdle.y[1], 'negative: idle path must not stay on one row')
assert.equal(grasIdleLightY(0, restIdle.x), restIdle.x[0])
assert.equal(grasIdleLightY(0.5, restIdle.x), restIdle.x[1])
assert.equal(grasIdleLightY(0, restIdle.y), restIdle.y[0])
assert.equal(grasIdleLightY(0.5, restIdle.y), restIdle.y[1])

assert.equal(grasRowAlignX(about.stemCenterX, 0), -about.stemCenterX)
assert.equal(grasRowAlignX(about.stemCenterX, 1), 0)
assert.equal(grasSuffixSlideX(0.1, 0), 0.1 + GRAS_EXPAND_SLIDE)
assert.equal(GRAS_EXPAND_DURATION, 0.64, 'letter expand is not part of the scene speed pass')
assert.ok(GRAS_EXPAND_DURATION > 0.55, 'play-in must be slower than a snap')
assert.ok(GRAS_SUFFIX_SIZE < GRAS_LETTER_SIZE)

const dir = path.dirname(fileURLToPath(import.meta.url))
const names = fs.readdirSync(dir)
assert.ok(names.includes('AboutUsWordmark.tsx'))
assert.ok(names.includes('aboutUsLetterLayout.ts'))
assert.equal(
  names.filter((name) => name.toLowerCase() === 'aboutus.ts').length,
  0,
  'negative: an AboutUs.ts sibling steals the component URL on Windows',
)
assert.equal(
  names.filter((name) => name.toLowerCase() === 'aboutus.tsx' || name.toLowerCase() === 'aboutus.ts').length,
  0,
  'negative: AboutUs.tsx / .ts must not sit beside the wordmark',
)

const typefacePath = path.resolve(dir, '../../../../../public/fonts/megrim.typeface.json')
const typeface = JSON.parse(fs.readFileSync(typefacePath, 'utf8'))
assert.match(String(typeface.familyName ?? ''), /Megrim/i)
for (const letter of ABOUT_US_STEMS) {
  assert.ok(typeface.glyphs?.[letter], `Megrim typeface must include ${letter}`)
  for (const ch of `${ABOUT_US_EXPAND[letter].prefix}${ABOUT_US_EXPAND[letter].suffix}`) {
    assert.ok(typeface.glyphs?.[ch], `Megrim typeface must include ${letter} expand ${ch}`)
  }
}
assert.equal(typeface.glyphs?.['字'], undefined, 'negative: CJK is outside the latin Megrim cut')

const src = fs.readFileSync(path.join(dir, 'AboutUsWordmark.tsx'), 'utf8')
assert.equal((src.match(/<pointLight/g) ?? []).length, 2, 'one rest lamp plus one cursor lamp, not a lamp per glyph')
assert.match(src, /export const AboutUsWordmark/)
assert.match(src, /applyCeramicScatter/)
assert.match(src, /syncCeramicScatter/)
assert.match(src, /grasIdleLightY/)
assert.match(src, /aboutUsIdleCenters/)
assert.match(src, /aboutY/)
assert.match(src, /usY/)
assert.match(src, /hitY/)
assert.doesNotMatch(src, /aboutUsIdleCentersX/, 'negative: idle path is XY, not a single X pair')
assert.match(src, /grasLightEase/)
assert.match(src, /about-us-idle-light/)
assert.match(src, /about-us-cursor-light/)
assert.match(src, /grasCursorLightIntensity/)
assert.match(src, /grasCursorLightLift/)
assert.match(src, /grasCursorLightDistance/)
assert.match(src, /getWorldScale/)
assert.match(src, /event\.point/)
assert.match(src, /hoverEnabled = true/)
assert.match(src, /if \(!hoverEnabled\) return/)
assert.match(src, /grasWordmarkOriginY/)
assert.match(src, /GRAS_FRONT_YAW/)
assert.match(src, /GRAS_TYPEFACE_URL/)
assert.match(src, /ABOUT_US_EXPAND/)
assert.match(src, /grasSuffixSlideX/)
assert.match(src, /grasRowAlignX/)
assert.match(src, /easeCarouselWheel/)
assert.match(src, /tl\.play\(\)/)
assert.match(src, /about-us-phrase-hit/)
assert.match(src, /skipLetterRaycast/)
assert.match(src, /clippingPlanes/)
assert.match(src, /onPointerOver/)
assert.doesNotMatch(src, /\.reverse\(\)/, 'negative: About Us must not reverse the play-in')
assert.doesNotMatch(src, /onReverseComplete/, 'negative: there is no leave reverse to complete')
assert.doesNotMatch(src, /onPointerOut/, 'negative: there is no unhover contract on the letters')
assert.match(src, /onHoverChange\?\.\(true\)/)
assert.match(src, /onHoverChange\?\.\(false\)/)
assert.doesNotMatch(
  src,
  /onHoverChange=\{setGrasHover\}/,
  'negative: the wordmark must not close over scene dim state',
)
assert.doesNotMatch(
  src,
  /onPointerOver=\{\(event\) => \{\s*hovering\.current = true/,
  'negative: cursor lamp must not start while hoverEnabled is off',
)
assert.doesNotMatch(src, /gras-cursor-light/, 'negative: About Us uses its own cursor lamp name')
assert.doesNotMatch(src, /applyWireframe/, 'negative: the wordmark is not a pulse cage')
assert.doesNotMatch(
  src,
  /intensity=\{lamp\}/,
  'negative: a PointLight on each stem turns the word into lamps',
)
assert.doesNotMatch(
  src,
  /meshBasicMaterial/,
  'negative: expanded glyphs skip Adam ceramic scatter',
)

console.log('aboutUsLetterLayout: ok')
