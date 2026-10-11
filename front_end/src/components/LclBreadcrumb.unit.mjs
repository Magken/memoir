import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'LclBreadcrumb.tsx'), 'utf8')

assert.match(src, /rootWhenEmpty/)
assert.match(src, /lclCrumbsForPath/)
assert.match(src, /aria-label="Breadcrumb"/)
assert.match(src, /aria-current="page"/)
assert.match(src, /theme-lcl-breadcrumb__arrow/)
assert.match(src, /crumbs\.length > 1[\s\S]{0,180}theme-lcl-breadcrumb__arrow/)
assert.doesNotMatch(
  src,
  /aria-label="Breadcrumb">\s*<span className="theme-lcl-breadcrumb__arrow"/,
  'negative: a single crumb does not show the arrow',
)
assert.doesNotMatch(
  src,
  /ArrowLeft className="theme-lcl-breadcrumb__arrow"/,
  'negative: arrow chrome is an HTML clip host, not the SVG itself',
)
assert.match(src, /theme-lcl-breadcrumb__current[\s\S]{0,240}ScrollEnterText/)
assert.match(src, /onSelect\(crumb\.depth\)/)
assert.doesNotMatch(src, /kind:\s*'forward'/, 'negative: unopened next links are not crumbs')
assert.doesNotMatch(
  src,
  /theme-lcl-breadcrumb__sep[\s\S]{0,80}>\s*\//,
  'negative: separator is a 1px node, not a slash',
)
assert.doesNotMatch(src, /crumb--back-only/, 'negative: no back-only shortcut')

console.log('LclBreadcrumb: ok')
