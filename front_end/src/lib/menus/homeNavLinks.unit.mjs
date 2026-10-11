/**
 * Live Home: Book now is its own cluster; Sign in is auth (not Sign up, not a radio).
 * Run: node front_end/src/lib/menus/homeNavLinks.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const linksSrc = readFileSync(join(dir, 'homeNavLinks.ts'), 'utf8')
const menuSrc = readFileSync(join(dir, '../../components/SceneStackMenu.tsx'), 'utf8')
const cssSrc = readFileSync(join(dir, '../../css/effects/scene-stack-menu.css'), 'utf8')
const homeSrc = readFileSync(join(dir, '../../pages/HomePage.tsx'), 'utf8')

const launchBlock = linksSrc.match(
  /HOME_SCENE_STACK_LAUNCH_AUTH_OPTIONS = \[[\s\S]*?\] as const/,
)?.[0]
assert.ok(launchBlock, 'LAUNCH_AUTH_OPTIONS missing')
assert.match(launchBlock, /VURIFY_BOOK_NOW_TARGET_ID/)
assert.match(launchBlock, /VURIFY_LOGIN_TARGET_ID/)
assert.match(launchBlock, /label: 'Sign in'/)
assert.doesNotMatch(
  launchBlock,
  /VURIFY_SIGN_UP_TARGET_ID/,
  'negative: Sign up must not be on Home',
)

assert.match(homeSrc, /authOptions=\{HOME_SCENE_STACK_LAUNCH_AUTH_OPTIONS\}/)
assert.match(menuSrc, /bookNowOption/)
assert.match(menuSrc, /theme-scene-stack-menu__book-now-item/)
assert.match(
  menuSrc,
  /accountOptions = authOptions\.filter\(\s*\(option\) => option\.value !== VURIFY_BOOK_NOW_TARGET_ID/,
)

const guestPane = menuSrc.match(
  /auth-pane--guest"[\s\S]*?auth-pane--member"/,
)?.[0]
assert.ok(guestPane, 'guest auth pane missing')
assert.doesNotMatch(
  guestPane,
  /bookNowOption|VURIFY_BOOK_NOW_TARGET_ID|Book now/,
  'negative: Book now must not live in the Sign in/out swap',
)

assert.doesNotMatch(
  menuSrc,
  /theme-scene-stack-menu__top-auth-divider/,
  'negative: standalone auth hairlines do not GSAP with items',
)
assert.match(
  cssSrc,
  /\.theme-scene-stack-menu__top-end > \.theme-scene-stack-menu__top-item:not\(:last-child\)[\s\S]{0,120}border-right/,
)

console.log('homeNavLinks.unit.mjs: ok')
