/**
 * Offer accordion: WebP mid frames; hover copy + exclusive fan; Scene 02 reel plays.
 * Run: node front_end/src/lib/animations/offerAccordionMotion.unit.mjs
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  OFFER_VISUAL_ENTER_START,
  offerDesktopLayoutOpen,
  pickExclusiveCopyId,
  pickExclusiveFanId,
  pickExclusiveFollowVisual,
  midHasTimedPreview,
  nextOfferFrameIndex,
  OFFER_FRAME_HOLD_MS,
} from './offerAccordionMotion.ts'

const dir = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(dir, '../../../../')

assert.equal(
  offerDesktopLayoutOpen({
    alwaysExpanded: true,
    suppressMobileExpand: true,
    fineHover: true,
    compactViewport: false,
  }),
  true,
  'desktop offer uses exclusive fan + hover copy',
)
assert.equal(
  offerDesktopLayoutOpen({
    alwaysExpanded: true,
    suppressMobileExpand: true,
    fineHover: true,
    compactViewport: true,
  }),
  false,
  'negative: compact viewport is not the always-open layout',
)
assert.equal(
  offerDesktopLayoutOpen({
    alwaysExpanded: false,
    suppressMobileExpand: false,
    fineHover: true,
    compactViewport: false,
  }),
  false,
  'negative: Theme hover accordion still expands on hover',
)

assert.equal(pickExclusiveFanId('a', 'b'), 'a', 'hover owns the illustration fan')
assert.equal(
  pickExclusiveFanId(null, 'b'),
  'b',
  'without hover, the exclusive copy row fans',
)
assert.equal(
  pickExclusiveFanId(null, null),
  null,
  'negative: no hover and no copy row leaves every fan collapsed',
)

assert.equal(pickExclusiveFollowVisual([]), null, 'negative: empty has no tilt target')
assert.equal(
  pickExclusiveFollowVisual([
    { visual: 'a', progress: 0.1 },
    { visual: 'b', progress: 0.48 },
    { visual: 'c', progress: 0.9 },
  ]),
  'b',
  'mid-viewport row owns the wobble',
)

assert.equal(OFFER_FRAME_HOLD_MS, 800)
assert.equal(nextOfferFrameIndex(0, 4), 1, 'hover stills advance to the next timestamp')
assert.equal(nextOfferFrameIndex(3, 4), 0, 'hover stills loop')
assert.equal(nextOfferFrameIndex(0, 1), 0, 'negative: a single still does not cycle')
assert.equal(midHasTimedPreview({ frames: ['a.webp', 'b.webp'] }), true)
assert.equal(midHasTimedPreview({ kind: 'video' }), true)
assert.equal(
  midHasTimedPreview({ kind: 'image', frames: ['a.webp'] }),
  false,
  'negative: one still is not a timed preview',
)

assert.equal(pickExclusiveCopyId([]), null, 'negative: empty has no copy target')
assert.equal(
  pickExclusiveCopyId([
    { id: 'a', ratio: 0 },
    { id: 'b', ratio: 0 },
  ]),
  null,
  'negative: off-screen rows do not open copy',
)
assert.equal(
  pickExclusiveCopyId([
    { id: 'a', ratio: 0.2 },
    { id: 'b', ratio: 0.9 },
    { id: 'c', ratio: 0.4 },
  ]),
  'b',
  'most-visible row owns the body',
)
assert.equal(
  pickExclusiveCopyId(
    [
      { id: 'a', ratio: 0.5 },
      { id: 'b', ratio: 0.54 },
    ],
    'a',
  ),
  'a',
  'hold current unless another row is clearly more visible',
)
assert.equal(
  pickExclusiveCopyId(
    [
      { id: 'a', ratio: 0.35 },
      { id: 'b', ratio: 0.7 },
    ],
    'a',
  ),
  'b',
  'switch when the next row clearly wins',
)

assert.equal(OFFER_VISUAL_ENTER_START, 'top 88%')

const offerSrc = readFileSync(join(dir, '../../components/VurifyOfferAccordion.tsx'), 'utf8')
assert.match(offerSrc, /alwaysExpanded/)
assert.match(offerSrc, /OFFER_VISUAL_ENTER_START/)
assert.match(offerSrc, /pickExclusiveFollowVisual/)
assert.doesNotMatch(offerSrc, /offerBatchEnterDelay/, 'negative: enter has no stagger delay')
assert.doesNotMatch(offerSrc, /ScrollTrigger\.batch/, 'negative: batch stagger is not the enter')

const accordionSrc = readFileSync(
  join(dir, '../../components/WebGpuIsometricAccordion.tsx'),
  'utf8',
)
assert.match(accordionSrc, /alwaysExpanded/)
assert.match(accordionSrc, /offerDesktopLayoutOpen/)
assert.match(accordionSrc, /data-expand/)
assert.match(accordionSrc, /pickExclusiveCopyId/)
assert.match(accordionSrc, /pickExclusiveFanId/)
assert.match(accordionSrc, /data-copy=\{copyOpenId === item.id \? 'open' : undefined\}/)
assert.match(
  accordionSrc,
  /const isActive = fanOpenId === item.id/,
  'illustration fan is exclusive — one --active row',
)
assert.doesNotMatch(
  accordionSrc,
  /const isActive = layoutOpen \|\| activeId === item.id/,
  'negative: alwaysExpanded must not mark every row --active (kills fan expand)',
)
assert.match(
  accordionSrc,
  /textExpanded=\{isActive\}/,
  'offer copy expands with hover / --active, like the illustration fan',
)
assert.doesNotMatch(
  accordionSrc,
  /textExpanded=\{layoutOpen \? true : isActive\}/,
  'negative: copy must not stay frozen open',
)
assert.match(accordionSrc, /checkPainted: false/)
assert.doesNotMatch(
  accordionSrc,
  /OFFER_HOVER_SCROLL_SETTLE_MS/,
  'negative: scroll-settle hold is gone',
)
assert.match(accordionSrc, /useVisualActivity/)

assert.doesNotMatch(
  offerSrc,
  /pickExclusiveCopyId/,
  'negative: offer visual enter does not drive exclusive copy',
)
assert.match(offerSrc, /whole interview/)
assert.doesNotMatch(
  offerSrc,
  /whole day/,
  'negative: Home offer copy must not name the interview "the day"',
)

const offerInfoSrc = readFileSync(join(dir, '../menus/sceneStackMenuInfo.ts'), 'utf8')
assert.match(offerInfoSrc, /Topics and interview structure/)
assert.match(offerInfoSrc, /whole interview/)
assert.doesNotMatch(
  offerInfoSrc,
  /day structure/,
  'negative: offer info peel must not say "day structure"',
)
assert.doesNotMatch(
  offerInfoSrc,
  /whole day/,
  'negative: offer info peel must not say "the whole day"',
)
assert.match(
  'One story for the whole day.',
  /whole day/,
  'negative: the jargon gate still matches the old Home offer phrase',
)

const offerCss = readFileSync(
  join(dir, '../../css/effects/vurify-offer-accordion.css'),
  'utf8',
)
assert.doesNotMatch(
  offerCss,
  /\[data-expand='open'\][\s\S]*?\.theme-webgpu-iso-accordion__body[\s\S]*?transition:\s*none/,
  'negative: copy must not freeze title/body in the open pose',
)
assert.match(
  offerCss,
  /\.theme-webgpu-iso-accordion__row--active[\s\S]*?\.theme-webgpu-iso-accordion__body[\s\S]*?max-height:\s*8\.5rem/,
  'hover --active still expands copy',
)
assert.match(
  offerCss,
  /__card--mid[\s\S]*?__media--still[\s\S]*?object-fit:\s*cover/,
  'mid WebP frames cover-fit the card',
)
assert.doesNotMatch(
  offerCss,
  /\[data-expand='open'\] \.theme-webgpu-iso-accordion__card \{[\s\S]*?transition:\s*none/,
  'negative: open layout must not freeze the illustration fan',
)
assert.doesNotMatch(
  offerCss,
  /\[data-in-view='false'\][\s\S]*?transform:\s*none/,
  'negative: data-in-view must not zero the deck transform (kills fan scale)',
)

const isoCss = readFileSync(
  join(dir, '../../css/effects/webgpu-isometric-accordion.css'),
  'utf8',
)
assert.doesNotMatch(
  isoCss,
  /\[data-in-view='false'\][\s\S]*?transform:\s*none/,
  'negative: base accordion must not zero the deck transform off-screen',
)

assert.match(offerSrc, /offerMidFrame/, 'offer mids use WebP frames, not video elements')
assert.match(offerSrc, /asset\.frames/, 'offer mids pass timestamp stills into the card')
assert.doesNotMatch(offerSrc, /kind: 'video'/, 'negative: offer accordion must not mount mid videos')
assert.doesNotMatch(offerSrc, /pauseVideos/, 'negative: offer no longer pauses videos — it uses stills')
assert.doesNotMatch(offerSrc, /HOME_PAUSE_SCENE_VIDEOS/)
assert.match(
  accordionSrc,
  /nextOfferFrameIndex/,
  'hover stills advance with nextOfferFrameIndex',
)
assert.match(accordionSrc, /OFFER_FRAME_HOLD_MS/)

const catalogSrc = readFileSync(join(dir, '../homeAssets/catalog.ts'), 'utf8')
assert.match(catalogSrc, /\.f1\.webp/)
assert.match(catalogSrc, /frames:/)
assert.doesNotMatch(catalogSrc, /HOME_PAUSE_SCENE_VIDEOS/)
assert.match(catalogSrc, /whatWeDoReel/)
assert.match(catalogSrc, /what-we-do-reel\.mp4/)

const offerStems = [
  'agency-management',
  'interview-creation',
  'cv-intake',
  'live-interview',
  'hiring-package',
]
for (const stem of offerStems) {
  for (const n of [1, 2, 3, 4]) {
    const frame = `${stem}.f${n}.webp`
    assert.equal(
      existsSync(join(repoRoot, 'front_end/public/home/offer', frame)),
      true,
      `offer timestamp still missing: ${frame}`,
    )
  }
}

assert.doesNotMatch(
  readFileSync(join(dir, '../../components/theme/GalleryShowcase.tsx'), 'utf8'),
  /pauseVideos/,
  'negative: Theme gallery accordion still plays',
)

const reelSrc = readFileSync(join(dir, '../../components/HomeWhatWeDoVideoReel.tsx'), 'utf8')
assert.doesNotMatch(
  reelSrc,
  /HOME_PAUSE_SCENE_VIDEOS/,
  'negative: See beyond the résumé reel is not paused by the offer stills',
)
assert.doesNotMatch(
  reelSrc,
  /PRODUCT_DEMO_REEL/,
  'negative: Scene 02 no longer cycles five separate offer mp4s',
)
assert.doesNotMatch(
  reelSrc,
  /offerAgencyManagementVideo/,
  'negative: Scene 02 reel must not load the organisation source clip',
)
assert.match(reelSrc, /HOME_ASSETS\.whatWeDoReel/)
assert.match(reelSrc, /src=\{REEL\.src\}/)
assert.match(reelSrc, /loop/)
assert.match(reelSrc, /preload=\{playing \? 'metadata' : 'none'\}/)

const reelFile = join(repoRoot, 'front_end/public/home/what-we-do-reel.mp4')
assert.equal(existsSync(reelFile), true, 'merged Scene 02 reel file missing')
assert.ok(
  statSync(reelFile).size < 8 * 1024 * 1024,
  'negative: merged reel must stay far under the source mp4s',
)
const probe = spawnSync(
  'ffprobe',
  ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', reelFile],
  { encoding: 'utf8' },
)
assert.equal(probe.status, 0, 'ffprobe must read the merged reel')
const reelSeconds = Number(probe.stdout.trim())
assert.ok(
  reelSeconds >= 19 && reelSeconds <= 21,
  `merged reel duration should be five 4s beats, got ${reelSeconds}`,
)
assert.equal(
  existsSync(join(repoRoot, 'front_end/public/home/what-we-do-reel.poster.webp')),
  true,
  'merged reel poster missing',
)

const wwdScene = readFileSync(join(dir, '../../pages/HomeWhatWeDoScene.tsx'), 'utf8')
assert.match(wwdScene, /PointerFollowDeck/)
assert.equal(
  wwdScene.split('<PointerFollowDeck').length - 1,
  2,
  'both résumé illustrations use the 3D follow deck',
)
assert.match(wwdScene, /plain/)
assert.match(wwdScene, /autoPivot/)
assert.match(wwdScene, /idleWobble/)
assert.match(wwdScene, /size="lg"/)
assert.match(wwdScene, /ticket-label type-title/)
assert.doesNotMatch(
  wwdScene,
  /<img[^>]*data-flavour="art"/,
  'negative: résumé art must not stay a flat img',
)
assert.doesNotMatch(
  wwdScene,
  /ticket-icon[\s\S]*size="sm"/,
  'negative: toast icons must not stay sm',
)
assert.doesNotMatch(
  wwdScene,
  /ticket-label type-label/,
  'negative: toast titles must not stay type-label',
)

const followCss = readFileSync(join(dir, '../../css/effects/pointer-follow-deck.css'), 'utf8')
assert.match(followCss, /data-plain='true'/)
assert.match(
  followCss,
  /data-plain='true'\] \.theme-pointer-follow-deck__card--ghost/,
)
assert.match(
  followCss,
  /\[data-plain='true'\]\[data-fit='contain'\] img[\s\S]*?max-height: none[\s\S]*?filter: none/,
)
assert.doesNotMatch(
  followCss,
  /\[data-fit='contain'\] img[\s\S]*?filter: none[\s\S]*?drop-shadow/,
  'negative: menu/timeline contain stills keep their drop-shadow',
)

const wwdCss = readFileSync(join(dir, '../../css/effects/home-what-we-do.css'), 'utf8')
assert.match(wwdCss, /page-scene--home-what-we-do__art \{[^}]*pointer-events: auto/)
assert.match(wwdCss, /width: min\(17\.25rem/)
assert.doesNotMatch(
  wwdCss,
  /page-scene--home-what-we-do__art \{[^}]*object-fit: contain/,
  'negative: the art host is a 3D deck, not a replaced img',
)

const timelineSrc = readFileSync(join(dir, '../../components/VurifyExpertiseTimeline.tsx'), 'utf8')
assert.doesNotMatch(
  timelineSrc,
  /plain/,
  'negative: timeline illustrations keep the stacked deck plates',
)

console.log('offerAccordionMotion.unit.mjs: ok')
