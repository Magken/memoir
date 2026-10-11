/**
 * One-row Projects: P stem, rojects clip-slide play-in, no leave reverse.
 * Run: npx tsx front_end/src/lib/webgl/runtime/text/projectsLetterLayout.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  GRAS_EXPAND_DURATION,
  GRAS_FRONT_YAW,
  GRAS_LETTER_SIZE,
  GRAS_LETTER_TRACKING,
  GRAS_TYPEFACE_URL,
  grasIdleLightY,
} from './grasLetterLayout.ts'
import { aboutUsVisibleWidth } from './aboutUsLetterLayout.ts'
import {
  PROJECTS_EXPAND,
  PROJECTS_SCENE_FRONT_YAW,
  PROJECTS_STEM,
  projectsIdleCenters,
  projectsPackX,
  projectsRowLayout,
} from './projectsLetterLayout.ts'

assert.equal(PROJECTS_STEM, 'P')
assert.equal(PROJECTS_EXPAND.prefix, '')
assert.equal(PROJECTS_EXPAND.suffix, 'rojects')
assert.equal(GRAS_TYPEFACE_URL, '/fonts/megrim.typeface.json')

const row = projectsRowLayout((ch) => (ch === 'P' ? 0.4 : 0.2), GRAS_LETTER_TRACKING)
assert.equal(row.chars.join(''), 'Projects')
assert.equal(row.letter, 'P')
assert.equal(row.stemIndex, 0)
assert.ok(row.stemCenterX < 0, 'P sits left of the expanded Projects center')
assert.ok(row.wordRight > row.stemRight)
assert.notEqual(row.chars.join(''), 'PROJECTS', 'negative: Projects is not all capitals')
assert.notEqual(row.suffix, 'bout', 'negative: bout belongs on About, not Projects')

const restPack = projectsPackX(row, 0)
const openPack = projectsPackX(row, 1)
assert.equal(restPack.y, 0)
assert.equal(openPack.y, 0)
assert.ok(openPack.totalWidth > restPack.totalWidth, 'play-in grows the row')
assert.equal(openPack.totalHeight, restPack.totalHeight)
assert.ok(openPack.totalHeight <= GRAS_LETTER_SIZE + 1e-12, 'Projects is one row')
const leftRest = projectsPackX(row, 0, 'left')
const leftOpen = projectsPackX(row, 1, 'left')
const restW = aboutUsVisibleWidth(row, 0)
assert.ok(Math.abs(leftRest.x - restW / 2) < 1e-12, 'left pin is the left of P at rest')
assert.ok(leftOpen.x > leftRest.x, 'Projects grows to the right of the pin')
assert.notEqual(leftRest.x, restPack.x, 'negative: viewer center pack must not steal the scene left pin')
assert.equal(PROJECTS_SCENE_FRONT_YAW, 0)
assert.notEqual(PROJECTS_SCENE_FRONT_YAW, GRAS_FRONT_YAW, 'negative: Projects scene Home looks from +Z, not Adam −X')

const restIdle = projectsIdleCenters(row, 0)
const openIdle = projectsIdleCenters(row, 1)
assert.equal(restIdle.y[0], restIdle.y[1])
assert.ok(openIdle.x[1] > openIdle.x[0], 'idle walks from P toward the last letter')
assert.notEqual(openIdle.x[0], restIdle.x[0], 'negative: P must travel as Projects expands')
assert.equal(grasIdleLightY(0, restIdle.x), restIdle.x[0])
assert.equal(GRAS_EXPAND_DURATION, 0.64, 'letter expand is not part of the scene speed pass')
assert.ok(GRAS_EXPAND_DURATION > 0.55, 'play-in must be slower than a snap')

const dir = path.dirname(fileURLToPath(import.meta.url))
const names = fs.readdirSync(dir)
assert.ok(names.includes('ProjectsWordmark.tsx'))
assert.ok(names.includes('projectsLetterLayout.ts'))
assert.equal(
  names.filter((name) => name.toLowerCase() === 'projects.ts').length,
  0,
  'negative: a Projects.ts sibling steals the component URL on Windows',
)
assert.equal(
  names.filter((name) => name.toLowerCase() === 'projects.tsx' || name.toLowerCase() === 'projects.ts').length,
  0,
  'negative: Projects.tsx / .ts must not sit beside the wordmark',
)

const typefacePath = path.resolve(dir, '../../../../../public/fonts/megrim.typeface.json')
const typeface = JSON.parse(fs.readFileSync(typefacePath, 'utf8'))
assert.ok(typeface.glyphs?.[PROJECTS_STEM], 'Megrim typeface must include P')
for (const ch of `${PROJECTS_EXPAND.prefix}${PROJECTS_EXPAND.suffix}`) {
  assert.ok(typeface.glyphs?.[ch], `Megrim typeface must include Projects expand ${ch}`)
}

const src = fs.readFileSync(path.join(dir, 'ProjectsWordmark.tsx'), 'utf8')
assert.equal((src.match(/<pointLight/g) ?? []).length, 2, 'one rest lamp plus one cursor lamp, not a lamp per glyph')
assert.match(src, /export const ProjectsWordmark/)
assert.match(src, /applyCeramicScatter/)
assert.match(src, /projects-idle-light/)
assert.match(src, /projects-cursor-light/)
assert.match(src, /tl\.play\(\)/)
assert.match(src, /projects-phrase-hit/)
assert.doesNotMatch(src, /\.reverse\(\)/, 'negative: Projects must not reverse the play-in')
assert.doesNotMatch(src, /applyWireframe/, 'negative: the wordmark is not a pulse cage')
assert.doesNotMatch(src, /meshBasicMaterial/, 'negative: expanded glyphs skip Adam ceramic scatter')

console.log('projectsLetterLayout: ok')
