/**
 * LCL constructor workbench lists five layouts and mounts one preview.
 * Run: node front_end/src/components/webglToolkit/WebglLclWorkbench.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = fs.readFileSync(fileURLToPath(new URL('./WebglLclWorkbench.tsx', import.meta.url)), 'utf8')

assert.match(src, /export function WebglLclWorkbench/)
assert.match(src, />\s*LCL constructor\s*</)
assert.match(src, /LclViewportSelector/)
assert.match(src, /LclViewportPreview/)
assert.match(src, /LclLedgerPreview/)
assert.match(src, /LclReelPreview/)
assert.match(src, /LclAtlasPreview/)
assert.match(src, /LclTypePreview/)
assert.match(src, /LclFeatureChips/)
assert.match(src, /lclLayoutMenuDetail/)
assert.match(src, /parseLclLayoutId/)
assert.match(src, /searchParams\.get\('layout'\)/)
assert.match(src, /previewRef\.current\?\.leave/)
assert.match(src, /<Preview key=\{layoutId\} ref=\{previewRef\} \/>/)
assert.match(src, /\{open \?/)
assert.match(src, /theme-webgl-toolkit__lcl-layouts/)
assert.match(src, /aria-label="LCL layouts"/)
{
  const titlebar = src.match(/<header className="theme-webgl-toolkit__titlebar">[\s\S]*?<\/header>/)
  assert.ok(titlebar, 'constructor titlebar must exist')
  assert.doesNotMatch(
    titlebar[0],
    /MenuButton/,
    'negative: the layout picker must not sit in the constructor titlebar',
  )
}
{
  const selectorAt = src.indexOf('<LclViewportSelector')
  const layoutsAt = src.indexOf('theme-webgl-toolkit__lcl-layouts')
  const previewAt = src.indexOf('<Preview')
  assert.ok(
    selectorAt >= 0 && layoutsAt > selectorAt && previewAt > layoutsAt,
    'layout picker sits above the LCL preview canvas',
  )
}
assert.doesNotMatch(src, /LayoutGrid/, 'negative: LayoutGrid is the Pages menu icon, not the LCL layout picker')
assert.doesNotMatch(src, /WebglStage/, 'negative: the constructor panel must not mount a Canvas — the selector overlay does')
assert.doesNotMatch(src, /SceneWorld/, 'negative: LCL is not a second Scene editor')
assert.doesNotMatch(
  src,
  />\s*LCL\s*</,
  'negative: the titlebar is LCL constructor, not the Pages menu label',
)
assert.doesNotMatch(src, /Coming soon/, 'negative: do not fill the empty lab with placeholder copy')
assert.doesNotMatch(src, /from ['"]\.\.\/LclLayout['"]/, 'negative: the constructor page does not mount the old sample layout')
assert.doesNotMatch(
  src,
  /<LclViewportPreview[\s\S]*<LclLedgerPreview/,
  'negative: only one preview mounts at a time',
)

console.log('WebglLclWorkbench: ok')
