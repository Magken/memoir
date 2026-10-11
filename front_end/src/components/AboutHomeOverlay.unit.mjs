/**
 * About Home stage-1 LCL: breadcrumb-only s2 head (no title), nest + prose.
 * Run: npx tsx front_end/src/components/AboutHomeOverlay.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ABOUT_HOME_LCL_IN_S } from './AboutHomeOverlay.tsx'
import { ABOUT_HOME_AREAS } from '../lib/lcl/aboutHomeContent.ts'
import { lclScene } from '../lib/lcl/lclScenes.ts'

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'AboutHomeOverlay.tsx'), 'utf8')

assert.equal(ABOUT_HOME_LCL_IN_S, 3.6)
assert.match(src, /lclScene\('aboutHome'\)/)
assert.match(src, /LclBreadcrumb/)
assert.match(src, /rootWhenEmpty/)
assert.match(src, /ABOUT_HOME_AREAS/)
assert.match(src, /GrasUnderlineButton/)
assert.match(src, /layout="nest"/)
assert.doesNotMatch(
  src,
  /className="theme-lcl-layout__nest-item/,
  'negative: nest rows use GrasUnderlineButton, not hand-rolled nest class strings',
)
assert.match(src, /theme-lcl-preview__text-steps/)
assert.match(src, /PROSE_INLINE_CLASS/)
assert.match(src, /playLclProseIn/)
assert.match(src, /playScrollHairlineIn/)
assert.match(src, /playScrollHairlineOut/)
assert.match(src, /startLclCrumbOut/)
assert.match(src, /startLclListOut/)
assert.match(src, /type-body-lg/)
assert.match(src, /ABOUT_HOME_INTRO_STUDENTS/)
assert.match(src, /ABOUT_HOME_INTRO_PEERS/)
assert.match(src, /function IntroLink/)
assert.match(src, /function IntroLink\([\s\S]*?return \(\s*<a\b/)
assert.doesNotMatch(
  src,
  /function IntroLink\([\s\S]*?return \(\s*<button\b/,
  'negative: intro links are anchors so multi-word phrases wrap with the paragraph',
)
assert.doesNotMatch(
  src,
  /holdScrollHairline/,
  'negative: head divider must play out, not stay pinned',
)
assert.doesNotMatch(
  src,
  /startLclListOut\(panel/,
  'negative: overlay leave must not bulk-out the panel (that skips arrow chrome)',
)
assert.doesNotMatch(
  src,
  /theme-about-home-lcl__gras-expand|GrasLetters/,
  'negative: GRAS uses LCL prose-inline links, not an invented letter expand',
)
assert.doesNotMatch(
  src,
  />\s*GRAS\s*</,
  'negative: link label keeps G(eneral) R(…) parentheses, not bare GRAS',
)
assert.doesNotMatch(
  src,
  /PROSE_INLINE_P_CLASS\} type-body-sm/,
  'negative: About prose is larger than type-body-sm',
)
assert.doesNotMatch(
  src,
  /PROSE_INLINE_P_CLASS\} type-body(?!-lg)/,
  'negative: About prose uses type-body-lg',
)
assert.doesNotMatch(
  src,
  /titleHostRef|displayCopy|type-display-sm|type-display-lg/,
  'negative: s2 head is breadcrumb only, not a title',
)
assert.doesNotMatch(
  src,
  /General Research Across/,
  'negative: GRAS is not General Research Across Systems',
)
assert.doesNotMatch(
  src,
  /ScrollEnterText className="type-lead/,
  'negative: do not duplicate the crumb as a separate type-lead title',
)
assert.doesNotMatch(
  src,
  /startLclListIn\(panel/,
  'negative: s2 must self-orchestrate, not bulk-enter the panel',
)
assert.match(src, /text="are we \?"/)
assert.doesNotMatch(src, /text="are we\?"/, 'negative: the question mark needs a space before it')
assert.match(src, /ABOUT_HOME_DISPLAY_ROOT/)
assert.match(src, /function AboutDisplay/)
assert.match(src, /function TitleStack/)
assert.match(src, /splitAboutDisplayTitle/)
assert.match(src, /flushSync/)
assert.match(src, /type-display-xl/)
assert.match(
  src,
  /theme-about-home-lcl__who[\s\S]*?theme-about-home-lcl__are/,
  'multi-word titles reuse the who / are we? two-column nest',
)
assert.match(
  src,
  /startAboutHomeLclOut\(display/,
  'dive / back outs the sideways display title before swap',
)
assert.match(
  src,
  /startAboutHomeLclIn\(nextDisplay/,
  'selected title enters sideways after path swap, before crumb',
)
assert.doesNotMatch(src, /LclLayout/, 'negative: product overlay is not the constructor layout')
assert.doesNotMatch(src, /\u2014|\u2013/, 'negative: no em or en dashes in the overlay source')

assert.equal(ABOUT_HOME_AREAS.length, 4)
assert.match(src, /ABOUT_HOME_AREAS\.map/)
assert.match(src, /theme-about-home-lcl__refs/)
assert.match(src, /current\.links/)
assert.match(src, /current\.relationAfter/)
assert.match(src, /current\.subsections/)
assert.match(src, /ABOUT_HOME_JEPA_CRUMB/)
assert.match(src, /path\.slice\(0, depth\)/)
assert.doesNotMatch(
  src,
  /depth > 0\) return/,
  'negative: breadcrumb must allow stepping back from nested JEPA',
)
assert.doesNotMatch(
  src,
  /theme-about-home-lcl__nest-rule/,
  'negative: no divider between intro paragraph and nest list',
)
assert.match(src, /current\.relation/)
assert.match(src, /openSection\(area\.label\)/)
assert.doesNotMatch(
  src,
  /className="italic underline"/,
  'negative: Students / peers use IntroLink prose-inline, not bare italic underline',
)
assert.doesNotMatch(
  src,
  /openArea\(/,
  'negative: nest and intro links share openSection',
)
assert.doesNotMatch(
  src,
  /aboutHomeAreaByLabel/,
  'negative: overlay resolves sections via aboutHomeSectionByLabel',
)
assert.doesNotMatch(
  src,
  /startLclTitleIn|startLclTitleOut/,
  'negative: s1 title uses sideways AboutHome helpers, not upright Title plays',
)

const scene = lclScene('aboutHome')
assert.equal(scene.sections.length, 2)
assert.deepEqual(scene.sections[1]?.bounds, { x: 0.625, y: 0, w: 0.375, h: 0.75 })

console.log('AboutHomeOverlay: ok')
