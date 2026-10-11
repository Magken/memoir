/**
 * About Text canvas stage-2 LCL: motto, nest list, breadcrumb notes.
 * Run: npx tsx front_end/src/components/AboutWorkOverlay.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ABOUT_WORK_DISPLAY, ABOUT_WORK_LCL_IN_S, ABOUT_WORK_ROOT_LABEL } from './AboutWorkOverlay.tsx'
import { splitAboutDisplayTitle } from '../lib/lcl/aboutHomeContent.ts'
import { lclScene } from '../lib/lcl/lclScenes.ts'

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'AboutWorkOverlay.tsx'), 'utf8')

assert.equal(ABOUT_WORK_DISPLAY, 'how we work')
assert.equal(ABOUT_WORK_ROOT_LABEL, 'How we work')
assert.equal(ABOUT_WORK_LCL_IN_S, 1.6)
assert.deepEqual(splitAboutDisplayTitle(ABOUT_WORK_DISPLAY), ['how we', 'work'])
assert.equal(lclScene('aboutWork').sections[0]?.id, 's1')
assert.match(src, /lclScene\('aboutWork'\)/)
assert.match(src, /LclBreadcrumb/)
assert.match(src, /rootWhenEmpty/)
assert.match(src, /startAboutHomeLclIn/)
assert.match(src, /startAboutHomeLclOut/)
assert.match(src, /playScrollHairlineIn/)
assert.match(src, /playScrollHairlineOut/)
assert.match(src, /startLclCrumbIn/)
assert.match(src, /startLclCrumbOut/)
assert.match(src, /theme-about-home-lcl__display/)
assert.match(src, /theme-about-home-lcl__panel/)
assert.match(src, /ABOUT_WORK_INTRO_REST/)
assert.match(src, /size="sm"/)
assert.doesNotMatch(src, /size="md"|size="lg"/, 'negative: the motto links stay at body size, not the medium or large prose size')
assert.match(src, /subsections/)
assert.doesNotMatch(
  src,
  /openSection\(link/,
  'negative: repository links must not open breadcrumb pages',
)
assert.match(src, /ABOUT_WORK_PILLARS/)
assert.match(src, /GrasUnderlineButton/)
assert.match(src, /layout="nest"/)
assert.doesNotMatch(
  src,
  /className="theme-lcl-layout__nest-item/,
  'negative: nest rows use GrasUnderlineButton, not hand-rolled nest class strings',
)
assert.match(src, /theme-lcl-layout__nest/)
assert.match(src, /playLclProseIn/)
assert.match(src, /playLclProseOut/)
assert.match(src, /startLclListIn/)
assert.match(src, /startLclListOut/)
assert.match(src, /aboutWorkSectionByLabel/)
assert.match(src, /theme-about-home-lcl__refs/)
assert.match(src, /current\.links/)
assert.doesNotMatch(
  src,
  /openSection\(link/,
  'negative: repository links must not open breadcrumb pages',
)
assert.doesNotMatch(
  src,
  /ABOUT_HOME_AREAS/,
  'negative: How we work must not reuse the Home area list',
)
assert.doesNotMatch(
  src,
  /lclScene\('aboutHome'\)/,
  'negative: stage 2 must not reuse the Home panel cells',
)
assert.doesNotMatch(src, /\u2014|\u2013/, 'negative: reader copy has no em or en dash')

console.log('AboutWorkOverlay: ok')
