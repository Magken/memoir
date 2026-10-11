/**
 * Projects detail LCL — crumb + prose + nest, interruptible dive helpers.
 * Run: npx tsx front_end/src/components/ProjectsDetailOverlay.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PROJECTS_DETAIL_SEARCH_LABEL } from './ProjectsDetailOverlay.tsx'
import { lclCrumbsForPath } from '../lib/lcl/lclBreadcrumb.ts'

const src = fs.readFileSync(fileURLToPath(new URL('./ProjectsDetailOverlay.tsx', import.meta.url)), 'utf8')

assert.equal(PROJECTS_DETAIL_SEARCH_LABEL, 'Search')
assert.match(src, /lclScene\('projectsDetail'\)/)
assert.match(src, /startLclCrumbIn/)
assert.match(src, /startLclCrumbOut/)
assert.match(src, /playLclProseIn/)
assert.match(src, /playLclProseOut/)
assert.match(src, /startLclListIn/)
assert.match(src, /startLclListOut/)
assert.match(src, /LclBreadcrumb/)
assert.match(src, /PROJECTS_DETAIL_SEARCH_LABEL/)
assert.match(src, /onBackToCatalog/)
assert.match(src, /depth === 0/)
assert.match(src, /setPath\(\[doc\.name\]\)/, 'detail opens already on Search → project title')
assert.match(src, /path\.length <= 1/, 'project root is the title segment, not an empty path')
assert.match(src, /setPath\(\[\.\.\.path, label\]\)/, 'dives push onto Search → title, they do not replace the title')
assert.match(
  src,
  /depth === 0[\s\S]{0,120}onBackToCatalog/,
  'only the Search crumb leaves to the catalog',
)
assert.match(
  src,
  /setPath\(path\.slice\(0, depth\)\)/,
  'ancestor crumbs truncate within the detail',
)
assert.doesNotMatch(src, /rootWhenEmpty/, 'negative: trail is never a single project-name root')
assert.doesNotMatch(
  src,
  /setPath\(atRoot \? \[label\]/,
  'negative: diving must not wipe Search → title down to a bare section',
)
assert.doesNotMatch(
  src,
  /rootLabel=\{doc\.name\}/,
  'negative: project title is a path segment, not the catalog root crumb',
)

const landing = lclCrumbsForPath(['gras_to_text'], PROJECTS_DETAIL_SEARCH_LABEL)
assert.equal(landing.map((c) => c.label).join('>'), 'Search>gras_to_text')
assert.equal(landing[0]?.depth, 0)
assert.equal(landing[1]?.current, true)

const nested = lclCrumbsForPath(['gras_to_text', 'Overview'], PROJECTS_DETAIL_SEARCH_LABEL)
assert.equal(nested.map((c) => `${c.label}:${c.depth}:${c.current}`).join('|'), 'Search:0:false|gras_to_text:1:false|Overview:2:true')

assert.match(src, /busyRef/)
assert.match(src, /motionGen/)
assert.match(src, /GrasUnderlineButton/)
assert.match(src, /projectsDetailById/)
assert.match(src, /PROJECTS_DETAIL_LCL_IN_S/)
assert.match(src, /theme-lcl-preview__text-steps/)
assert.match(src, /playLclProseIn/)
assert.doesNotMatch(
  src,
  /showSteps[\s\S]{0,200}ScrollEnterText/,
  'negative: body prose must not use ScrollEnterText',
)
assert.match(src, /theme-about-collab-lcl__display/, 'horizontal title band like Collaborate')
assert.doesNotMatch(src, /startAboutHomeLclIn/, 'negative: detail title is upright list in, not sideways strip')
assert.doesNotMatch(src, /\u2014|\u2013/, 'negative: reader copy has no em or en dash')

console.log('ProjectsDetailOverlay: ok')
