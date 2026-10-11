/**
 * Type specimens enter on a keyed node (out then in, not in-place).
 * Run: node front_end/src/components/webglToolkit/LclTypePreview.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = fs.readFileSync(fileURLToPath(new URL('./LclTypePreview.tsx', import.meta.url)), 'utf8')
assert.match(src, /export const LclTypePreview/)
assert.match(src, /<SpecimenStage key=\{current\}/)
assert.match(src, /startLclDecodeIn/)
assert.match(src, /theme-lcl-mark/)
assert.match(src, /theme-lcl-strike/)
assert.match(src, /theme-lcl-quote/)
assert.doesNotMatch(
  src,
  /<SpecimenStage name=\{current\} \/>/,
  'negative: an unkeyed specimen node reused across the swap fails',
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

console.log('LclTypePreview: ok')
