/**
 * Toolkit lab is case-insensitive at the first path segment.
 * Run: node front_end/src/routes/appRoutes.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = fs.readFileSync(fileURLToPath(new URL('./appRoutes.tsx', import.meta.url)), 'utf8')

assert.match(src, /path="\/WGLTOOLKIT"/)
assert.match(src, /path="\/wgltoolkit"/)
assert.match(src, /<Navigate to="\/WGLTOOLKIT" replace \/>/)
assert.match(src, /path="\/projects"/)
assert.match(src, /ProjectsIndexPage/)
assert.match(src, /path="\/" element=\{<LandingPage \/>\}/)
assert.match(src, /path="\/memoir" element=\{<MemoirPage \/>\}/)
assert.doesNotMatch(
  src,
  /path="\/memoir" element=\{withRouteFallback/,
  'negative: /memoir shows the GRAS loader, not the Vurify word-cloud page loader',
)
const memoirSrc = fs.readFileSync(fileURLToPath(new URL('../pages/MemoirPage.tsx', import.meta.url)), 'utf8')
assert.match(memoirSrc, /return <MemoirHomePage \/>/, '/memoir shows the splat home')
assert.doesNotMatch(memoirSrc, /LclBreadcrumb|theme-hairline-fx/, 'negative: /memoir carries no crumb or hairline')
assert.match(src, /path="\/memoir\/home" element=\{<MemoirHomePage \/>\}/)
assert.doesNotMatch(
  src,
  /path="\/memoir\/home" element=\{withRouteFallback/,
  'negative: the GRAS loader is the only loader on /memoir/home, not the generic page loader first',
)
const homeSrc = fs.readFileSync(fileURLToPath(new URL('../pages/MemoirHomePage.tsx', import.meta.url)), 'utf8')
assert.match(homeSrc, /<LandingLoadOverlay progress=\{progress\} onComplete=\{\(\) => setLoading\(false\)\}/)
assert.doesNotMatch(homeSrc, /LclBreadcrumb|theme-hairline-fx/, 'negative: the home page carries no crumb or hairline')
{
  const showAt = homeSrc.indexOf('await created.show(HOME_SPLAT')
  const viewAt = homeSrc.indexOf('created.setView(HOME_SPLAT_VIEW)')
  const doneAt = homeSrc.indexOf('if (live) setProgress(100)')
  assert.ok(showAt > 0 && viewAt > showAt && doneAt > viewAt, 'the loader reaches 100 only after the splat is parsed and framed')
  assert.match(homeSrc, /Math\.floor\(fraction \* DOWNLOAD_SHARE\)/, 'the download alone cannot finish the loader')
  assert.match(homeSrc, /const DOWNLOAD_SHARE = (\d+)/)
  assert.ok(Number(homeSrc.match(/const DOWNLOAD_SHARE = (\d+)/)[1]) < 100, 'negative: a full download must not read 100%')
  assert.match(homeSrc, /camera: \[0\.1815, 0\.5759, 0\.6748\]/)
  assert.match(homeSrc, /lclScene\('memoirFrame'\)/, 'the frame comes from the named LCL scene')
  assert.ok(
    homeSrc.indexOf('{loading ? null : <MemoirFrame side={side} />}') > homeSrc.indexOf('className="theme-webgl-toolkit__stage"'),
    'the glass frame sits above the full-page canvas',
  )
}
assert.doesNotMatch(
  src,
  /path="\/memoir\/home" element=\{<(Navigate|AppStageMirror)/,
  'negative: /memoir/home mounts its own page',
)
assert.doesNotMatch(
  src,
  /path="\/memoir" element=\{<Navigate/,
  'negative: /memoir must mount MemoirPage, not redirect',
)
assert.doesNotMatch(
  src,
  /path="\/memoir" element=\{<AppStageMirror/,
  'negative: /memoir is an outflow page, not an App Stage mirror',
)
assert.doesNotMatch(
  src,
  /path="\/wgltoolkit" element=\{withRouteFallback/,
  'negative: lowercase must redirect, not mount a second toolkit page',
)

console.log('appRoutes: ok')
