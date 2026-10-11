/**
 * About Text inset LCL: top-right title, center note, one-row Coming soon list.
 * Run: npx tsx front_end/src/components/AboutCollaborateOverlay.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ABOUT_COLLAB_LCL_IN_S } from './AboutCollaborateOverlay.tsx'
import { lclScene } from '../lib/lcl/lclScenes.ts'

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'AboutCollaborateOverlay.tsx'), 'utf8')

assert.equal(ABOUT_COLLAB_LCL_IN_S, 2.6)
assert.equal(lclScene('aboutCollaborate').sections.map((section) => section.id).join(','), 's1,s2')
assert.match(src, /lclScene\('aboutCollaborate'\)/)
assert.match(src, /section\.id === 's1'/)
assert.match(src, /section\.id === 's2'/)
assert.match(src, /aboutCollabTitleRows/)
assert.match(src, /theme-about-home-lcl__stack/)
assert.doesNotMatch(
  src,
  /DisplayChars text=\{ABOUT_COLLAB_DISPLAY\}/,
  'negative: the title is three rows, not one line',
)
assert.match(src, /theme-about-collab-lcl__display/)
assert.match(src, /ABOUT_COLLAB_INTRO/)
assert.match(src, /ABOUT_COLLAB_SOON/)
assert.match(src, /theme-lcl-layout__nest/)
assert.match(src, /GrasUnderlineButton/)
assert.match(src, /layout="nest"/)
assert.doesNotMatch(
  src,
  /className="theme-lcl-layout__nest-item/,
  'negative: nest rows use GrasUnderlineButton, not hand-rolled nest class strings',
)
assert.match(src, /LclBreadcrumb/)
assert.match(src, /rootWhenEmpty/)
assert.match(src, /startLclCrumbIn/)
assert.match(src, /startLclCrumbOut/)
assert.match(src, /startLclListIn/)
assert.match(src, /startLclListOut/)
assert.match(src, /playLclProseIn/)
assert.match(src, /playLclProseOut/)
assert.doesNotMatch(src, /text-center/, 'negative: Coming soon is a list row, not centered prose')
assert.doesNotMatch(src, /section\.id === 's3'/, 'negative: the title is not the old bottom band')
assert.doesNotMatch(
  src,
  /startAboutCollabLclIn/,
  'negative: the top title is horizontal, not the sideways right strip',
)
assert.doesNotMatch(src, /\u2014|\u2013/, 'negative: reader copy has no em or en dash')

console.log('AboutCollaborateOverlay: ok')
