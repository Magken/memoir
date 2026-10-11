import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'lcl-breadcrumb.css'), 'utf8')

assert.match(css, /theme-lcl-breadcrumb \{/)
assert.match(css, /theme-lcl-breadcrumb__btn \{/)
assert.match(css, /theme-lcl-breadcrumb__arrow \{/)
assert.match(css, /theme-lcl-breadcrumb__arrow \{[^}]*overflow:\s*hidden/)
assert.match(css, /theme-lcl-breadcrumb__trail \{/)
assert.match(css, /theme-lcl-breadcrumb__sep \{[^}]*width:\s*1px/)
assert.match(css, /theme-lcl-breadcrumb__current \{[^}]*color:\s*color-mix/)
assert.match(css, /theme-lcl-breadcrumb__current \{[^}]*pointer-events:\s*none/)
assert.doesNotMatch(
  css,
  /theme-lcl-breadcrumb__current \{[^}]*color:\s*#ffffff/,
  'negative: the current crumb is grey, not the selectable white',
)
assert.doesNotMatch(
  css,
  /theme-lcl-breadcrumb[\s\S]{0,800}theme-link-fx/,
  'negative: crumb underline is plain ::after, not link-fx',
)
assert.doesNotMatch(css, /filter:/, 'negative: no filter bloom on the trail')

console.log('lcl-breadcrumb: ok')
