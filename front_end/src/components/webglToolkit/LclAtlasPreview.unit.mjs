/**
 * Atlas hover columns change the grid only after leave done.
 * Run: node front_end/src/components/webglToolkit/LclAtlasPreview.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = fs.readFileSync(fileURLToPath(new URL('./LclAtlasPreview.tsx', import.meta.url)), 'utf8')
assert.match(src, /export const LclAtlasPreview/)
assert.match(src, /theme-lcl-atlas-cols/)
assert.match(src, /theme-lcl-sideways/)
assert.match(src, /orderRef/)
assert.match(src, /orderRef\.current\.push\('leave'\)/)
assert.match(src, /orderRef\.current\.push\('structure'\)/)
assert.match(src, /orderRef\.current\.push\('enter'\)/)
assert.match(src, /startAboutHomeLclOut/)
assert.match(src, /sticky: true/)
assert.doesNotMatch(
  src,
  /setWide\([\s\S]{0,40}startAboutHomeLclOut/,
  'negative: the grid template must not change before leave done',
)
assert.match(src, /goToDepth/)
assert.match(src, /onSelect=\{\(depth\) => void goToDepth\(depth\)\}/)
assert.match(src, /GrasUnderlineButton/)
assert.doesNotMatch(
  src,
  /className="theme-lcl-layout__nest-item/,
  'negative: nest rows use GrasUnderlineButton, not hand-rolled nest class strings',
)
assert.doesNotMatch(
  src,
  /onSelect=\{\(\) => setPath\(\[\]\)\}/,
  'negative: crumb back must leave then enter, not setPath in place',
)

console.log('LclAtlasPreview: ok')
