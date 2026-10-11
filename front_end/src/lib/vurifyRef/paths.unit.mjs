/**
 * Vurify pages are Theme references under /theme/vurify/*; `/` is blank.
 * Run: node front_end/src/lib/vurifyRef/paths.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const src = (rel) => readFileSync(join(dir, rel), 'utf8')

const pathsSrc = src('paths.ts')
assert.match(pathsSrc, /export const VURIFY_REF_ROOT = '\/theme\/vurify'/)
assert.match(pathsSrc, /export function isBlankLandingPath/)
{
  const body = pathsSrc.slice(pathsSrc.indexOf('export function isBlankLandingPath'))
  const fnSrc = body.slice(body.indexOf('{') + 1, body.indexOf('\n}'))
  const isBlank = new Function('path', fnSrc)
  for (const path of ['/', '/memoir', '/memoir/', '/memoir/home']) assert.equal(isBlank(path), true, `${path} skips the Vurify curtain`)
  for (const path of ['/memoirs', '/theme/vurify/landing', '/WGLTOOLKIT']) {
    assert.equal(isBlank(path), false, `negative: ${path} is not a GRAS blank page`)
  }
}
assert.match(pathsSrc, /landing: `\$\{VURIFY_REF_ROOT\}\/landing`/)
assert.match(pathsSrc, /dashboard: `\$\{VURIFY_REF_ROOT\}\/dashboard`/)
assert.match(pathsSrc, /interview: `\$\{VURIFY_REF_ROOT\}\/interview`/)
assert.match(pathsSrc, /tryInterview: `\$\{VURIFY_REF_ROOT\}\/try-interview`/)
assert.match(pathsSrc, /landing2: `\$\{VURIFY_REF_ROOT\}\/landing-2`/)
assert.match(pathsSrc, /deck: `\$\{VURIFY_REF_ROOT\}\/deck`/)
assert.match(pathsSrc, /assessmentCover: `\$\{VURIFY_REF_ROOT\}\/assessment-cover`/)
assert.match(pathsSrc, /'\/dashboard': VURIFY_REF_PATHS\.dashboard/)
assert.doesNotMatch(
  pathsSrc,
  /['"]\/['"]:\s*VURIFY_REF_PATHS/,
  'negative: `/` stays the current-project landing',
)

const stageSrc = src('../appStage/appStageConfig.ts')
assert.match(stageSrc, /VURIFY_REF_PATHS\.landing/)
assert.match(stageSrc, /VURIFY_REF_PATHS\.dashboard/)
assert.match(stageSrc, /VURIFY_REF_PATHS\.interview/)
assert.match(stageSrc, /VURIFY_REF_PATHS\.tryInterview/)
assert.doesNotMatch(
  stageSrc,
  /path:\s*['"]\/['"]/,
  'negative: App Stage home is not `/`',
)

const routesSrc = src('../../routes/appRoutes.tsx')
assert.match(routesSrc, /path=["']\/["']/)
assert.match(routesSrc, /<LandingPage/)
assert.match(routesSrc, /VURIFY_REF_PATHS\.landing/)
assert.match(routesSrc, /VURIFY_REF_PATHS\.dashboard/)
assert.match(routesSrc, /Navigate to=\{to\}/)
assert.doesNotMatch(
  routesSrc,
  /path=["']\/["']\s+element=\{<AppStageMirror/,
  'negative: `/` is not an App Stage mirror',
)

const landingSrc = src('../../pages/LandingPage.tsx')
const landingBody = landingSrc.match(/export function LandingPage\(\) \{[\s\S]*$/)?.[0] ?? ''
assert.match(landingBody, /aria-label="Landing"/)
assert.doesNotMatch(landingBody, /HomePage|IsometricWordCloud/)
assert.doesNotMatch(
  landingBody,
  /We help you find/,
  'negative: blank landing has no Vurify copy',
)

const homeSrc = src('../../pages/HomePage.tsx')
assert.match(homeSrc, /VURIFY_REF_PATHS\.landing/)
assert.doesNotMatch(homeSrc, /activePath === ['"]\/['"]/)

const stageHost = src('../appStage/AppStage.tsx')
assert.match(stageHost, /isBlankLandingPath/)
assert.match(stageHost, /if \(blankLanding\) return/, 'negative missing: `/` must not preload stage chunks')

const themeNavSrc = src('../theme/themeNav.ts')
assert.match(themeNavSrc, /id: 'vurify-ref-nav'/)
assert.match(themeNavSrc, /href: VURIFY_REF_PATHS\.landing/)
assert.match(themeNavSrc, /href: VURIFY_REF_PATHS\.dashboard/)

const themePageSrc = src('../../pages/ThemePage.tsx')
assert.match(themePageSrc, /themeNavLinkHref/)
assert.match(themePageSrc, /navigate\(href\)/)

const coverSrc = src('../interviewRunApi/sittingPolicy/types.ts')
assert.match(coverSrc, /VURIFY_REF_PATHS\.assessmentCover/)
assert.doesNotMatch(coverSrc, /SITTING_COVER_PATH = ['"]\/assessment-cover['"]/)

console.log('vurifyRef paths: ok')
