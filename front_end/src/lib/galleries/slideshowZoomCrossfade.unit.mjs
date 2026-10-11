/**
 * Theme SlideshowGallery demo3 (Zoom crossfade) helper.
 * Run: node front_end/src/lib/galleries/slideshowZoomCrossfade.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runSlideshowZoomCrossfade, SLIDESHOW_ZOOM_CROSSFADE } from './slideshowZoomCrossfade.ts'

const dir = dirname(fileURLToPath(import.meta.url))

function fakeGsap() {
  const calls = []
  const tl = {
    addLabel(name, pos) {
      calls.push({ kind: 'addLabel', name, pos })
      return tl
    },
    to(_target, vars, pos) {
      calls.push({ kind: 'to', vars, pos })
      return tl
    },
    fromTo(_target, from, to, pos) {
      calls.push({ kind: 'fromTo', from, to, pos })
      return tl
    },
  }
  return {
    calls,
    timeline(vars) {
      calls.push({ kind: 'timeline', vars })
      return tl
    },
  }
}

assert.equal(SLIDESHOW_ZOOM_CROSSFADE.duration, 1.1)
assert.equal(SLIDESHOW_ZOOM_CROSSFADE.outScale, 0.4)
assert.equal(SLIDESHOW_ZOOM_CROSSFADE.innerScale, 1.5)
assert.equal(SLIDESHOW_ZOOM_CROSSFADE.middleAt, 0.65)
assert.equal(SLIDESHOW_ZOOM_CROSSFADE.incomingEase, 'expo')

const nextFx = fakeGsap()
runSlideshowZoomCrossfade(nextFx, {
  currentSlide: {},
  currentInner: {},
  upcomingSlide: {},
  upcomingInner: {},
  direction: 1,
})
const nextOut = nextFx.calls.find((call) => call.kind === 'to' && call.vars?.scale === 0.4)
assert.ok(nextOut, 'outgoing slide scales to 0.4')
const nextIn = nextFx.calls.find((call) => call.kind === 'fromTo' && call.from?.yPercent === 100)
assert.ok(nextIn, 'next incoming slide starts at yPercent 100')
assert.equal(nextIn.to.yPercent, 0)
const nextInner = nextFx.calls.find(
  (call) => call.kind === 'fromTo' && call.from?.yPercent === -30,
)
assert.ok(nextInner, 'next incoming inner counters with yPercent -30')
assert.equal(nextInner.from.scale, 1.5)
assert.equal(nextInner.to.scale, 1)

const prevFx = fakeGsap()
runSlideshowZoomCrossfade(prevFx, {
  currentSlide: {},
  currentInner: {},
  upcomingSlide: {},
  upcomingInner: {},
  direction: -1,
})
const prevIn = prevFx.calls.find((call) => call.kind === 'fromTo' && call.from?.yPercent === -100)
assert.ok(prevIn, 'prev incoming slide starts at yPercent -100')
assert.equal(
  prevFx.calls.some((call) => call.kind === 'fromTo' && call.from?.yPercent === 100),
  false,
  'negative: prev must not use the next-direction yPercent',
)

const navigators = readFileSync(join(dir, 'slideshowNavigators.ts'), 'utf8')
const demo3Start = navigators.indexOf('export function navigateDemo3')
const demo4Start = navigators.indexOf('export function navigateDemo4')
assert.ok(demo3Start >= 0 && demo4Start > demo3Start, 'demo3 sits before demo4')
const demo3 = navigators.slice(demo3Start, demo4Start)
assert.match(demo3, /runSlideshowZoomCrossfade/)
assert.match(navigators, /name: 'Zoom crossfade'/)
assert.doesNotMatch(
  demo3,
  /scale: 0\.4/,
  'negative: demo3 must call the shared helper, not inline the 0.4 scale tween',
)

const helper = readFileSync(join(dir, 'slideshowZoomCrossfade.ts'), 'utf8')
assert.doesNotMatch(
  helper,
  /runSlideshowZoomCrossfade3d/,
  'negative: Zoom crossfade 3D is not used on the bent card',
)
const scene = readFileSync(
  join(dir, '../../components/curvedMonitorCard/CurvedMonitorScene.tsx'),
  'utf8',
)
assert.match(scene, /mediaCrossfadeOpacity/)
assert.doesNotMatch(
  scene,
  /runSlideshowZoomCrossfade3d/,
  'negative: the bent still fades in place, it does not Zoom-crossfade',
)
assert.doesNotMatch(scene, /<img/)
const card = readFileSync(join(dir, '../../components/CurvedMonitorCard.tsx'), 'utf8')
assert.doesNotMatch(
  card,
  /theme-curved-monitor-card__fx/,
  'negative: stills must not leave the bent card for a flat overlay',
)

console.log('slideshowZoomCrossfade.unit.mjs: ok')
