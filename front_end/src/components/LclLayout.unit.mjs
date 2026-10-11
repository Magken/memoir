/**
 * Reusable LCL layout expands painted sections in place.
 * Run: node front_end/src/components/LclLayout.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = fs.readFileSync(fileURLToPath(new URL('./LclLayout.tsx', import.meta.url)), 'utf8')

assert.match(src, /export function LclLayout/)
assert.match(src, /gridPlacementFromCells/)
assert.match(src, /lclLayerAt/)
assert.match(src, /useAnimatedFoldMount/)
assert.match(src, /FluidLineText/)
assert.match(src, /theme-fluid-media/)
assert.match(src, /if \(!open \|\| !shown \|\| phase !== 'in'\) return/)
assert.match(src, /playFluidCharsIn\(stage\)/)
assert.match(src, /playFluidCharsOut/)
assert.match(src, /playFluidMediaIn/)
assert.match(src, /playFluidMediaOut/)
assert.match(src, /playFluidFit/)
assert.match(src, /captureTileSeat/)
assert.match(src, /<FluidCover rest/)
assert.match(src, /type-h3 mb-0/)
assert.match(src, /aria-label="Return"/)
assert.match(src, /type-h1/)
assert.match(src, /type-lead/)
assert.match(src, /type-display-sm/)
assert.match(src, /CopyButton/)
assert.match(src, /data-cs=\{String\(place\.columnStart\)\}/)
assert.match(src, /enterChild/)
assert.match(src, /goBack/)
assert.match(src, /GrasUnderlineButton/)
assert.match(src, /layout="nest"/)
assert.doesNotMatch(
  src,
  /className="theme-lcl-layout__nest-item"/,
  'negative: nest rows use GrasUnderlineButton, not hand-rolled nest class strings',
)
assert.doesNotMatch(src, /style=/, 'negative: tiles must sit on data-cs grid lines, not inline style')
assert.doesNotMatch(src, /WebglStage/, 'negative: LclLayout is not a Canvas')
assert.doesNotMatch(src, /TypeAnimText/, 'negative: LCL no longer uses rotateX TypeAnim')
assert.doesNotMatch(src, /playFluidFlip/, 'negative: Flip.from must not yank the 8×8 grid')
assert.doesNotMatch(src, /captureFluidFlip/, 'negative: Flip.getState is not wired on LCL tiles')
assert.doesNotMatch(src, /playFluidCharsIn\(copyRef\.current\)/, 'negative: pane play waits for shown, then targets stage/title')
assert.doesNotMatch(src, /playFluidCharsIn\(rootRef/, 'negative: closed tiles curtain per tile, not the whole grid root')
assert.doesNotMatch(
  src,
  /nest-item[\s\S]*child\.body/,
  'negative: nest index must not dump child body copy',
)

console.log('LclLayout: ok')
