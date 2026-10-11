/**
 * Scroll-enter is Codrops wrap_chars + expo.out, reverse on leave.
 * Run: node front_end/src/lib/animations/scrollEnter.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = fs.readFileSync(fileURLToPath(new URL('./scrollEnter.ts', import.meta.url)), 'utf8')

assert.match(src, /export const SCROLL_ENTER_FROM/)
assert.match(src, /yPercent: 100/)
assert.match(src, /rotateX: 60/)
assert.match(src, /ease: 'expo\.out'/)
assert.match(src, /stagger: 0\.035/)
assert.match(src, /toggleActions: 'play none none reverse'/)
assert.match(src, /scroller/)
assert.match(src, /export const SCROLL_HAIRLINE_FROM/)
assert.match(src, /export function applyScrollHairline/)
assert.match(src, /closest\('\.theme-hairline-fx'\)/)
assert.match(src, /transformOrigin: '100% 50%'/)
assert.match(src, /scaleX: 0/)
assert.match(src, /scaleX: 1/)
assert.match(src, /export const LCL_CHAIN_AT = 0\.2/)
assert.match(src, /export function tweenChainReady/)
assert.match(src, /export function startLclListIn/)
assert.match(src, /export function startAboutHomeLclIn/)
assert.match(src, /export function startAboutHomeLclOut/)
assert.match(src, /function lclProseMotionTargets/)
assert.match(src, /theme-about-home-lcl__ref-link/)
assert.match(src, /export function playLclProseIn[\s\S]{0,280}lclProseMotionTargets/)
assert.match(src, /export function playLclProseOut[\s\S]{0,280}lclProseMotionTargets/)
assert.doesNotMatch(
  src,
  /export function playLclProseOut[\s\S]{0,220}querySelectorAll<HTMLElement>\('\.theme-prose-inline__p'\)/,
  'negative: prose out must not leave the external links sitting still',
)
assert.match(src, /export function playLclProseOut/)
assert.match(src, /clipPath: 'inset\(0 100% 0 0\)'/)
assert.match(
  src,
  /export function playLclProseOut[\s\S]{0,480}clipPath: 'inset\(0 0 0 100%\)'/,
  'prose out wipes left-to-right',
)
assert.match(src, /export function playLclProseOut[\s\S]{0,480}x: 20/)
assert.doesNotMatch(
  src,
  /export function playLclProseIn[\s\S]{0,220}rotateX/,
  'negative: LCL prose must clip from the side, not Codrops rotateX',
)
assert.doesNotMatch(
  src,
  /export function playLclProseOut[\s\S]{0,420}y: -10/,
  'negative: prose out must not slide up',
)
assert.match(src, /SIDEWAYS_ENTER_FROM/)
assert.match(src, /xPercent: 110/)
assert.match(src, /rotateY: 60/)
assert.match(src, /SIDEWAYS_RL_ENTER_FROM/)
assert.match(src, /rotateY: -60/)
assert.match(src, /xPercent: -110/)
assert.match(
  src,
  /export function startAboutCollabLclIn[\s\S]{0,200}playSidewaysRlCharsIn/,
  'the right title yaws the other way',
)
assert.doesNotMatch(
  src,
  /export function startAboutCollabLclIn[\s\S]{0,180}playSidewaysCharsIn\(/,
  'negative: the right title must not reuse the left-strip yaw',
)
assert.match(src, /playSidewaysCharsIn/)
assert.match(
  src,
  /playSidewaysCharsIn[\s\S]{0,280}rotateY:\s*0/,
  'sideways settle clears the orientation-matched yaw',
)
assert.doesNotMatch(
  src,
  /SIDEWAYS_ENTER_FROM[\s\S]{0,120}rotateX/,
  'negative: sideways strip enter must not use Codrops rotateX',
)
assert.doesNotMatch(
  src,
  /startAboutHomeLclIn[\s\S]{0,120}playScrollCharsIn/,
  'negative: About Home must not call the horizontal char enter',
)
assert.match(src, /ready: awaitPlays\(tweens, LCL_CHAIN_AT\)/)
assert.match(src, /done: awaitPlays\(tweens, 'complete'\)/)
assert.match(src, /export async function playLclListOut/)
assert.match(src, /export async function playLclTitleOut/)
assert.match(src, /until: LclPlayUntil = 'complete'/)
assert.match(src, /export async function playLclTitleIn/)
assert.match(src, /export async function playLclCrumbIn/)
assert.match(src, /export function holdScrollHairline/)
assert.match(src, /playLclListOut[\s\S]*playScrollHairlineOut/)
assert.match(src, /playCrumbChromeIn/)
assert.match(src, /theme-lcl-breadcrumb__arrow/)
assert.match(
  src,
  /export async function playLclTitleOut\([^)]*\) \{\s*await awaitPlays\(\[playScrollCharsOut/,
)
assert.doesNotMatch(
  src,
  /export async function playLclTitleOut\([^)]*\) \{\s*await awaitPlays\(\[playScrollHairline/,
  'negative: title out must not wipe the title divider',
)
assert.doesNotMatch(
  src,
  /playScrollChars(?:In|Out)[\s\S]{0,120}autoAlpha/,
  'negative: Enter does not fade glyphs',
)
assert.doesNotMatch(
  src,
  /export async function playLcl\w+\([^)]*until: LclPlayUntil = LCL_CHAIN_AT/,
  'negative: default play must run full duration; overlap is startLcl*.ready only',
)
assert.doesNotMatch(src, /PAGE_SCROLL_TYPE_EFFECT_2/, 'negative: this is not stretch-rise Effect 2')
assert.doesNotMatch(
  src,
  /applyScrollHairline[\s\S]*transformOrigin: '0% 50%'/,
  'negative: enter origin is the right edge so reverse exits left-to-right',
)
assert.match(src, /export function startLclMediaOut/)
assert.match(src, /export function startLclMediaIn/)
assert.match(src, /export function startLclCountIn/)
assert.match(src, /export function startLclDimIn/)
assert.match(src, /export function startLclDimOut/)
assert.match(src, /export async function lclImageReady/)
assert.match(src, /export function startLclDecodeIn/)
assert.match(src, /dir < 0 \? 'inset\(0 100% 0 0\)' : 'inset\(0 0 0 100%\)'/)
assert.match(src, /x: 20 \* dir/)
assert.match(src, /x: -20 \* dir/)
assert.match(src, /opacity: 0\.38/)
assert.doesNotMatch(
  src,
  /startLclMediaIn[\s\S]{0,400}crossfade|mix-blend/,
  'negative: media must not morph or crossfade in place',
)

function makeTween(vars, hang = false) {
  let progress = hang ? 0 : 1
  let onUpdate = null
  let onComplete = null
  const tween = {
    vars,
    progress: () => progress,
    eventCallback(name, fn) {
      if (name === 'onUpdate') onUpdate = fn
      if (name === 'onComplete') onComplete = fn
      return tween
    },
    then(fn) {
      return Promise.resolve().then(fn)
    },
    advance(at) {
      progress = at
      onUpdate?.()
      if (at >= 1) onComplete?.()
    },
  }
  if (!hang) {
    queueMicrotask(() => {
      progress = 0.2
      onUpdate?.()
      progress = 1
      onComplete?.()
      vars.onComplete?.()
      vars.onUpdate?.()
    })
  }
  return tween
}

function makeGsap() {
  return {
    killTweensOf() {},
    set() {},
    to(_target, vars) {
      return makeTween(vars)
    },
  }
}

const { startLclMediaOut, startLclMediaIn, tweenChainReady } = await import('./scrollEnter.ts')

const frame = {
  querySelector: () => ({ className: 'theme-lcl-media__img' }),
  querySelectorAll: () => [],
}

const outHandle = startLclMediaOut(frame, makeGsap(), 1)
assert.ok(outHandle.ready)
assert.ok(outHandle.done)
await outHandle.ready

const back = startLclMediaOut(frame, makeGsap(), -1)
await back.ready

const hangTween = makeTween({}, true)
const pending = tweenChainReady(hangTween, 0.2)
let pendingDone = false
void pending.then(() => {
  pendingDone = true
})
await new Promise((resolve) => setTimeout(resolve, 20))
assert.equal(pendingDone, false, 'negative: ready stays pending when progress never reaches 0.2')

void startLclMediaIn

console.log('scrollEnter: ok')
