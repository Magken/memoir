/**
 * Toolkit pages menu switches one workbench via ?page=.
 * Run: node front_end/src/pages/WglToolkitPage.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = fs.readFileSync(fileURLToPath(new URL('./WglToolkitPage.tsx', import.meta.url)), 'utf8')

assert.match(src, /WGL_TOOLKIT_PAGES/)
assert.match(src, /useSearchParams/)
assert.match(src, /searchParams.get\('page'\)/)
assert.match(src, />Pages</)
assert.match(src, /id: 'kps'/)
assert.match(src, /label: 'KPS'/)
assert.match(src, /Workbench: WebglKpsWorkbench/)
assert.doesNotMatch(src, /kps_api_token/, 'negative: the toolkit page does not read the KPS token')
assert.match(src, /label: 'Scene editor'/)
assert.match(src, /id: 'lcl'/)
assert.match(src, /id: 'logo'/)
assert.match(src, /label: 'Logo'/)
assert.match(src, /Workbench: LogoMarkWorkbench/)
assert.match(src, /id: 'yolo'/)
assert.match(src, /label: 'YOLO'/)
assert.match(src, /Workbench: WebglYoloWorkbench/)
assert.match(src, /id: 'buzz'/)
assert.match(src, /label: 'Buzz'/)
assert.match(src, /Workbench: WebglBuzzWorkbench/)
assert.match(src, /id: 'dotpad'/)
assert.match(src, /label: 'Dot Pad'/)
assert.match(src, /Workbench: WebglDotPadWorkbench/)
assert.doesNotMatch(src, /5288/, 'negative: the pages menu does not embed the kit host')
assert.doesNotMatch(src, /10\.103\.5\.156/, 'negative: the pages menu does not embed the lab host')
assert.doesNotMatch(
  src,
  /forcedPaletteId=\{pageId === 'logo'/,
  'negative: Logo keeps the stored palette so the draw canvas stays readable',
)
assert.match(src, /label: 'LCL'/)
assert.match(src, /Workbench: WebglLclWorkbench/)
assert.doesNotMatch(
  src,
  /label: 'Layered Content Layout'/,
  'negative: the Pages menu label is LCL, not the expanded name',
)
assert.match(src, /forcedPaletteId=\{pageId === 'lcl' \? 'grassDark' : undefined\}/)
assert.doesNotMatch(
  src,
  /forcedPaletteId=\{pageId === 'editor'/,
  'negative: Scene editor keeps the stored palette; only LCL forces grassDark',
)
assert.doesNotMatch(
  src,
  /<Workbench[\s\S]*open[\s\S]*\/>[\s\S]*<Workbench[\s\S]*open/,
  'negative: only the selected workbench mounts',
)
assert.doesNotMatch(src, /id: 'ledger'/, 'negative: Pages does not list LCL layouts')
assert.doesNotMatch(src, /id: 'reference'/, 'negative: Pages does not list LCL layouts')
assert.doesNotMatch(src, /lclLayoutMenuDetail/, 'negative: Pages does not own the LCL layout picker')

console.log('WglToolkitPage: ok')
