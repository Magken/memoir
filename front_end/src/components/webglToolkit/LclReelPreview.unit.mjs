/**
 * Reel: pager, crumb swap, wheel lock. Video is deferred.
 * Run: node front_end/src/components/webglToolkit/LclReelPreview.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = fs.readFileSync(fileURLToPath(new URL('./LclReelPreview.tsx', import.meta.url)), 'utf8')
assert.match(src, /export const LclReelPreview/)
assert.match(src, /goFrame/)
assert.match(src, /lockRef/)
assert.match(src, /onWheel/)
assert.match(src, /startLclMediaOut/)
assert.match(src, /startLclMediaIn/)
assert.match(src, /dir/)
assert.match(src, /showVideo/)
assert.match(src, /posterDone/)
assert.doesNotMatch(src, /<video/, 'negative: video is not in the static tree; LclMediaFrame mounts it when showVideo')
assert.match(src, /if \(lockRef\.current\) return/)
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
  /onSelect=\{\(depth\) => \{\s*if \(depth === 0\) setPath\(\[\]\)/,
  'negative: crumb back must leave then enter, not setPath in place',
)

console.log('LclReelPreview: ok')
