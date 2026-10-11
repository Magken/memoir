/**
 * Theme GRAS breadcrumb section demos LclBreadcrumb only — no invented trail.
 * Run: node front_end/src/components/theme/BreadcrumbGrasShowcase.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = fs.readFileSync(fileURLToPath(new URL('./BreadcrumbGrasShowcase.tsx', import.meta.url)), 'utf8')

assert.match(src, /export function BreadcrumbGrasShowcase/)
assert.match(src, /LclBreadcrumb/)
assert.match(src, /rootWhenEmpty/)
assert.match(src, /onSelect/)
assert.match(src, /lclCrumbsForPath|GrasUnderlineButton/)
assert.doesNotMatch(
  src,
  /theme-lcl-breadcrumb__trail[\s\S]*map\(/,
  'negative: showcase must not rebuild the trail markup inline',
)
assert.doesNotMatch(src, /FileExplorerBreadcrumbs/, 'negative: GRAS trail is LclBreadcrumb, not explorer crumbs')

console.log('BreadcrumbGrasShowcase: ok')
