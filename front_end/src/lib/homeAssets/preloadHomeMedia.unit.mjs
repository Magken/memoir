/**
 * Home media warmup lists reel + offer mp4s for the % load.
 * Run: node front_end/src/lib/homeAssets/preloadHomeMedia.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homeMediaSrcs } from './homeMediaSrcs.ts'
import {
  HOME_LOAD_HOLD_CAP,
  homeBootstrapDisplayProgress,
} from './preloadHomeMedia.ts'

const dir = dirname(fileURLToPath(import.meta.url))
const srcs = homeMediaSrcs()

assert.ok(srcs.includes('/home/what-we-do-reel.mp4'))
assert.ok(srcs.includes('/home/offer/agency-management.mp4'))
assert.ok(srcs.includes('/home/offer/live-interview.f1.webp'))
assert.ok(
  srcs.filter((src) => src.endsWith('.mp4')).length >= 6,
  `Home warmup must include the reel and offer clips, got ${srcs.filter((src) => src.endsWith('.mp4')).length}`,
)
assert.equal(
  srcs.some((src) => src.includes('try-interview')),
  false,
  'negative: warmup is Home public media, not the interview route',
)

const preloadSrc = readFileSync(join(dir, 'preloadHomeMedia.ts'), 'utf8')
assert.match(preloadSrc, /preloadCurvedMonitorStills/)
assert.match(preloadSrc, /homeMediaSrcs\(\)/)
assert.match(preloadSrc, /decodeVideoSrc/)
assert.match(preloadSrc, /if \(homeMediaWarm\) return homeMediaWarm/)
assert.equal(HOME_LOAD_HOLD_CAP, 94)
assert.equal(homeBootstrapDisplayProgress(40, false), 40)
assert.equal(homeBootstrapDisplayProgress(100, false), HOME_LOAD_HOLD_CAP)
assert.equal(homeBootstrapDisplayProgress(100, true), 100)
assert.notEqual(
  homeBootstrapDisplayProgress(100, false),
  100,
  'negative: chunk 100 must not finish the glyph while media is still warming',
)

const homeSrc = readFileSync(join(dir, '../../pages/HomePage.tsx'), 'utf8')
assert.match(
  homeSrc,
  /homeBootstrapDisplayProgress\(stageProgress, homeMediaReady\)/,
  '% uses media-gated progress, not raw stageProgress',
)
assert.doesNotMatch(
  homeSrc,
  /progress=\{homeOwnsBootstrap \? stageProgress : undefined\}/,
  'negative: raw chunk progress must not drive the Home % glyph',
)

console.log('preloadHomeMedia.unit.mjs: ok')
