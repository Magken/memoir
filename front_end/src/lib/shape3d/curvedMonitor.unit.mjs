/**
 * Curved card layout — signed curvature, gentle flex, rounded outline.
 * Run: node front_end/src/lib/shape3d/curvedMonitor.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  bentCardZAt,
  clampCurveDegree,
  clampCurvature,
  curvedCardZ,
  curvedMonitorLayout,
  curvatureFromBowl,
  flexCurvature,
  mediaSlideIndex,
  focusedFeature,
  nextFeatureCycleIndex,
  wrapGroupIndex,
  groupNavDirection,
  mediaCrossfadeOpacity,
  activeFeatureId,
  CURVED_MONITOR_MEDIA_FADE_MS,
  CURVED_MONITOR_CHROME_OUT_MS,
  CURVED_MONITOR_CHROME_IN_MS,
  roundedRectSDF,
  CURVED_MONITOR_ASPECT,
  CURVED_MONITOR_CONCAVE,
  CURVED_MONITOR_CONVEX,
  CURVED_MONITOR_CORNER_RATIO,
  CURVED_MONITOR_CURVE_DEFAULT,
  CURVED_MONITOR_CURVE_HOVER,
  CURVED_MONITOR_CURVE_MAX,
  hoverCurveDegree,
  CURVED_MONITOR_FEATURE_CYCLE_MS,
  CURVED_MONITOR_FOV,
  CURVED_MONITOR_CAMERA_FIT,
  CURVED_MONITOR_MEDIA_INTERVAL_MS,
  CURVED_MONITOR_SAGITTA_RATIO,
  pickOfferFrame,
  decodeImageSrcs,
  DECODE_IMAGE_SRC_TIMEOUT_MS,
} from './curvedMonitor.ts'
import { HOME_ASSETS } from '../homeAssets/catalog.ts'

const dir = dirname(fileURLToPath(import.meta.url))

assert.equal(clampCurveDegree(-2), 0)
assert.equal(clampCurveDegree(3), 1)
assert.equal(clampCurvature(-4), -1)
assert.equal(clampCurvature(4), 1)
assert.equal(curvatureFromBowl('concave'), CURVED_MONITOR_CONCAVE)
assert.equal(curvatureFromBowl('convex'), CURVED_MONITOR_CONVEX)

const layout = curvedMonitorLayout()
assert.equal(layout.aspect, CURVED_MONITOR_ASPECT)
assert.equal(layout.curve, CURVED_MONITOR_CURVE_DEFAULT)
assert.ok(Math.abs(layout.sagitta / layout.width - CURVED_MONITOR_SAGITTA_RATIO) < 1e-9)
assert.equal(layout.width, layout.height * layout.aspect)
assert.ok(layout.cameraZ > layout.sagitta, 'camera sits in front of the card, not inside a tube')
{
  const fovRad = (CURVED_MONITOR_FOV * Math.PI) / 180
  const fit = layout.height / 2 / Math.tan(fovRad / 2)
  assert.ok(
    Math.abs(layout.cameraZ - (fit * CURVED_MONITOR_CAMERA_FIT + layout.sagitta)) < 1e-9,
    'cameraZ uses CAMERA_FIT, not a loose 1.22 letterbox',
  )
  assert.ok(
    CURVED_MONITOR_CAMERA_FIT < 1.22,
    'bowl fills more of the CSS box so tags sit next to the painted screen',
  )
  assert.ok(
    CURVED_MONITOR_CAMERA_FIT > 1,
    'keep a little frustum pad so hover edges do not clip',
  )
}
{
  const layoutSrc = readFileSync(join(dir, 'curvedMonitor.ts'), 'utf8')
  assert.match(
    layoutSrc,
    /cameraZ: fit \* CURVED_MONITOR_CAMERA_FIT \+ sagitta/,
    'layout uses CAMERA_FIT at the cameraZ assignment',
  )
  assert.doesNotMatch(
    layoutSrc,
    /fit \* 1\.22/,
    'negative: 1.22 letterbox parked tags far from the painted screen',
  )
}
assert.ok(layout.corner > 0, 'rounded outline has a corner radius')
assert.ok(
  Math.abs(layout.corner / Math.min(layout.width, layout.height) - CURVED_MONITOR_CORNER_RATIO) < 1e-9,
)
assert.ok(
  layout.corner / Math.min(layout.width, layout.height) < 0.06,
  'Vurify corners are short (≈0.5–1rem), not a long stadium fillet',
)

const dishEdge = curvedCardZ(layout.width / 2, layout.radius)
assert.equal(curvedCardZ(0, layout.radius), 0)
assert.ok(Math.abs(dishEdge - layout.sagitta) < 1e-6)

const concaveZ = bentCardZAt(layout.width / 2, layout.radius, -1, layout.sagitta)
const convexZ = bentCardZAt(layout.width / 2, layout.radius, 1, layout.sagitta)
const flatZ = bentCardZAt(layout.width / 2, layout.radius, 0, layout.sagitta)
const midZ = bentCardZAt(layout.width / 2, layout.radius, -0.4, layout.sagitta)
assert.ok(concaveZ > 0, 'concave: edges toward the camera')
assert.ok(convexZ < 0, 'convex: edges away from the camera')
assert.equal(flatZ, 0)
assert.ok(midZ > 0 && midZ < concaveZ, 'curve degree of the bowl scales with |curvature|')
assert.equal(
  bentCardZAt(layout.width / 2, layout.radius, -1, 0),
  0,
  'curve=0 stays flat even when the bowl is concave',
)

const first = flexCurvature(-1, 1, 0.016)
assert.ok(first > -1 && first < -0.7, 'one frame does not teleport concave → convex')
assert.doesNotMatch(String(first), /^1$/, 'negative: flex is not an instant assign to the target')
const settled = flexCurvature(-1, 1, 6)
assert.ok(settled > 0.98, 'a long flex settles on convex')
assert.equal(flexCurvature(-1, 1, 0.016, 3.1, true), 1, 'snap skips the flex')
const through = flexCurvature(-1, 1, 0.45)
assert.ok(through > -1 && through < 1, 'mid-flex is between the two bowls')

const halfW = layout.width / 2
const halfH = layout.height / 2
const r = layout.corner
assert.ok(roundedRectSDF(0, 0, halfW, halfH, r) < 0, 'center is inside the rounded card')
assert.ok(
  roundedRectSDF(halfW, halfH, halfW, halfH, r) > 0,
  'sharp rectangle corner is outside once the edge is curved',
)
assert.ok(
  roundedRectSDF(halfW - 0.01, 0, halfW, halfH, r) < 0,
  'straight side stays inside',
)
const t = Math.SQRT1_2
const circularArc = roundedRectSDF(halfW - r + r * t, halfH - r + r * t, halfW, halfH, r, 2)
const squircleArc = roundedRectSDF(halfW - r + r * t, halfH - r + r * t, halfW, halfH, r, 4)
assert.ok(Math.abs(circularArc) < 0.02, 'n=2 is a circular fillet')
assert.ok(squircleArc < circularArc, 'squircle sits closer to the square than a long circular arc')
assert.doesNotMatch(
  String(CURVED_MONITOR_CORNER_RATIO),
  /^0\.11/,
  'negative: 0.11 of the short side was the long cold fillet',
)

const features = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
assert.equal(focusedFeature(features, null)?.id, 'a')
assert.equal(focusedFeature(features, 'b')?.id, 'b')
assert.equal(focusedFeature(features, 'missing')?.id, 'a')
assert.equal(focusedFeature([], 'a'), undefined)
assert.notEqual(
  focusedFeature(features, 'c')?.id,
  'a',
  'negative: a hovered tag must not keep the first feature caption',
)

assert.equal(CURVED_MONITOR_FEATURE_CYCLE_MS, 3000)
assert.notEqual(
  CURVED_MONITOR_FEATURE_CYCLE_MS,
  5000,
  'negative: 5s between tags was too long',
)
assert.equal(nextFeatureCycleIndex(0, 4), 1)
assert.equal(nextFeatureCycleIndex(3, 4), 0)
assert.equal(nextFeatureCycleIndex(0, 1), 0)
assert.equal(activeFeatureId(features, null, 0, false), null)
assert.equal(activeFeatureId(features, null, 0, true), 'a')
assert.equal(activeFeatureId(features, null, 2, true), 'c')
assert.equal(activeFeatureId(features, 'b', 0, true), 'b')
assert.notEqual(
  activeFeatureId(features, null, 0, false),
  'a',
  'negative: a collapsed card must not select the first tag',
)
assert.notEqual(
  nextFeatureCycleIndex(0, 4),
  0,
  'negative: the hover cycle must leave the first tag after one step',
)

assert.equal(wrapGroupIndex(0, 3, 1), 1)
assert.equal(wrapGroupIndex(2, 3, 1), 0)
assert.equal(wrapGroupIndex(0, 3, -1), 2)
assert.equal(wrapGroupIndex(5, 3), 2)
assert.notEqual(
  wrapGroupIndex(0, 3, 1),
  0,
  'negative: next group must leave the first stack item',
)
assert.deepEqual(mediaCrossfadeOpacity(0), { outgoing: 1, incoming: 0 })
assert.deepEqual(mediaCrossfadeOpacity(1), { outgoing: 0, incoming: 1 })
assert.deepEqual(mediaCrossfadeOpacity(0.5), { outgoing: 0.5, incoming: 0.5 })
assert.notEqual(
  mediaCrossfadeOpacity(0.5).outgoing,
  1,
  'negative: a mid fade must not leave the outgoing still fully opaque',
)
assert.equal(CURVED_MONITOR_MEDIA_FADE_MS, 450)
assert.equal(groupNavDirection(0, 1, 3), 1)
assert.equal(groupNavDirection(1, 0, 3), -1)
assert.equal(groupNavDirection(2, 0, 3), 1)
assert.equal(groupNavDirection(0, 2, 3), -1)
assert.notEqual(
  groupNavDirection(0, 1, 3),
  -1,
  'negative: next must not animate as prev',
)
assert.equal(CURVED_MONITOR_CURVE_DEFAULT, 0.7)
assert.equal(CURVED_MONITOR_CURVE_HOVER, 1)
assert.equal(hoverCurveDegree(CURVED_MONITOR_CURVE_DEFAULT, false), 0.7)
assert.equal(hoverCurveDegree(CURVED_MONITOR_CURVE_DEFAULT, true), 1)
assert.notEqual(
  hoverCurveDegree(0.7, true),
  0.7,
  'negative: hover must deepen the rest bowl',
)
assert.notEqual(
  CURVED_MONITOR_CURVE_DEFAULT,
  1,
  'negative: rest bowl must not stay at max',
)
assert.equal(CURVED_MONITOR_CHROME_OUT_MS, 360)
assert.equal(CURVED_MONITOR_CHROME_IN_MS, 720)

assert.equal(mediaSlideIndex(0, 3), 0)
assert.equal(mediaSlideIndex(CURVED_MONITOR_MEDIA_INTERVAL_MS, 3), 1)
assert.equal(mediaSlideIndex(CURVED_MONITOR_MEDIA_INTERVAL_MS * 2, 3), 2)
assert.equal(
  mediaSlideIndex(CURVED_MONITOR_MEDIA_INTERVAL_MS * 9, 3, CURVED_MONITOR_MEDIA_INTERVAL_MS, true, 1),
  1,
  'expanded view keeps the current still',
)
assert.notEqual(
  mediaSlideIndex(CURVED_MONITOR_MEDIA_INTERVAL_MS * 9, 3, CURVED_MONITOR_MEDIA_INTERVAL_MS, false, 1),
  1,
  'negative: unfrozen elapsed time must advance the still',
)

const flatLayout = curvedMonitorLayout(1.72, 16 / 9, 0)
assert.equal(flatLayout.sagitta, 0)
const maxLayout = curvedMonitorLayout(1.72, 16 / 9, 2)
assert.ok(Math.abs(maxLayout.sagitta / maxLayout.width - CURVED_MONITOR_CURVE_MAX) < 1e-9)

const showcase = readFileSync(join(dir, '../../components/theme/GalleryShowcase.tsx'), 'utf8')
assert.match(
  showcase,
  /<WebGpuIsometricAccordion effect=\{isoAccordionEffect\} \/>[\s\S]*<CurvedMonitorCard/,
  'Theme WebGPU panel mounts the curved card after the accordion',
)
assert.match(showcase, /Feature group card/)
assert.match(showcase, /curvature=\{cardCurvature\}/)
assert.match(showcase, /curve=\{cardCurve\}/)
assert.match(showcase, /variant="nav"/)
assert.match(showcase, /NAV_FEATURE_GROUPS/)
assert.match(showcase, /preloadCurvedMonitorStills/)
assert.doesNotMatch(
  showcase,
  /Dots and prev\/next/,
  'negative: the gallery demo must not keep the dotted nav copy',
)
assert.doesNotMatch(
  showcase,
  /<CurvedMonitorCard[\s\S]*<WebGpuIsometricAccordion effect=\{isoAccordionEffect\} \/>/,
  'negative: curved card must not sit above the accordion',
)

const scene = readFileSync(join(dir, '../../components/curvedMonitorCard/CurvedMonitorScene.tsx'), 'utf8')
assert.match(scene, /flexCurvature/)
assert.match(scene, /bentCardZAt/)
assert.match(scene, /mediaCrossfadeOpacity/)
assert.match(scene, /meshBasicMaterial/)
assert.match(scene, /toneMapped=\{false\}/)
assert.doesNotMatch(
  scene,
  /runSlideshowZoomCrossfade3d/,
  'negative: Zoom crossfade scaled the whole bowl',
)
assert.doesNotMatch(
  scene,
  /upcomingSlideRef/,
  'negative: incoming still must not live on a second sliding card group',
)
assert.doesNotMatch(
  scene,
  /from '\.\.\/\.\.\/lib\/gsap'/,
  'negative: media fade is opacity on the face, not a GSAP card tween',
)
assert.doesNotMatch(scene, /<img/)
assert.doesNotMatch(scene, /floatSrc/, 'negative: no floating illustration mesh')
assert.doesNotMatch(scene, /talentMadeVisible/)
assert.doesNotMatch(scene, /idleWobble/, 'negative: accent does not orbit apart from the card')
assert.match(scene, /pow\(qn\.x, 4\.0\)/)
assert.doesNotMatch(
  scene,
  /float d = length\(max\(q, 0\.0\)\)/,
  'negative: circular length() fillet is the long cold arc',
)
assert.doesNotMatch(
  scene,
  /SHADOW_LAYERS/,
  'negative: no stratified 3D shadow planes behind the card',
)
assert.doesNotMatch(scene, /ContactShadows/, 'negative: shadow is not a floor diorama')

const css = readFileSync(join(dir, '../../css/effects/curved-monitor-card.css'), 'utf8')
assert.match(css, /drop-shadow/)
assert.match(css, /--theme-shadow-brutal/)
assert.doesNotMatch(
  css,
  /drop-shadow\([^)]+\)\s+drop-shadow/,
  'negative: one blended blur, not stacked shadow layers',
)
assert.doesNotMatch(
  css,
  /var\(--theme-shadow-outer\)/,
  'negative: outer is already ~12% on light palettes — mixing it made the shadow invisible',
)
assert.doesNotMatch(scene, /cylinderGeometry/, 'negative: the card is a bent plane, not a TV tube')
assert.doesNotMatch(scene, /boxGeometry/, 'negative: no TV stand foot')

const card = readFileSync(join(dir, '../../components/CurvedMonitorCard.tsx'), 'utf8')
const groupsSrc = readFileSync(
  join(dir, '../../components/curvedMonitorCard/featureGroups.tsx'),
  'utf8',
)
assert.match(card, /curvature\?:/)
assert.match(card, /curve\?:/)
assert.match(card, /groups\?:/)
assert.match(card, /variant\?:/)
assert.doesNotMatch(
  card,
  /DottedNavMenu/,
  'negative: gallery chrome no longer uses the dotted nav',
)
assert.match(card, /ChevronLeft/)
assert.match(card, /ChevronRight/)
assert.match(card, /wrapGroupIndex/)
assert.match(card, /DEFAULT_GROUPS/)
assert.match(card, /Previous feature group/)
assert.match(groupsSrc, /title: 'Security'/)
assert.match(groupsSrc, /title: 'Live interview'/)
assert.match(groupsSrc, /title: 'Output card'/)
assert.match(groupsSrc, /Web monitoring/)
assert.match(groupsSrc, /CURVED_MONITOR_OFFER_STILLS/)
assert.match(groupsSrc, /cvIntake/)
assert.match(groupsSrc, /liveInterview/)
assert.match(groupsSrc, /hiringPackage/)
assert.match(groupsSrc, /DEFAULT_GROUPS/)
assert.match(groupsSrc, /HOME_FEATURE_GROUPS/)
assert.match(groupsSrc, /NAV_FEATURE_GROUPS/)
assert.match(groupsSrc, /title: 'Organisation'/)
assert.match(groupsSrc, /title: 'Interview extras'/)
assert.match(groupsSrc, /title: 'Around the hire'/)
assert.match(groupsSrc, /title: 'Scheduling'/)
assert.match(groupsSrc, /VURIFY_MORE_FEATURES/)
assert.doesNotMatch(
  groupsSrc,
  /DEFAULT_GROUPS: readonly FeatureGroup\[\] = \[DEFAULT_GROUP\]/,
  'negative: the stack must hold more than the Security group',
)
assert.match(card, /focusedFeature/)
assert.match(card, /activeFeatureId/)
assert.match(card, /nextFeatureCycleIndex/)
assert.match(card, /CURVED_MONITOR_FEATURE_CYCLE_MS/)
assert.match(card, /setInterval/)
assert.match(card, /explicitId/)
assert.match(card, /cycleIndex/)
assert.match(card, /caption-copy/)
assert.match(card, /key=\{caption.id\}/)
assert.match(card, /data-has-focus=\{edgeFocusId \? 'true' : 'false'\}/)
assert.match(card, /lineTone=\{focused \? 'accent' : 'text'\}/)
assert.match(card, /<VurifyMenuButton/)
assert.match(card, /size="sm"/)
assert.doesNotMatch(
  card,
  /<VurifyMenuButton[\s\S]{0,80}size="md"/,
  'negative: extras tags stay compact sm, not md submenu type',
)
assert.match(card, /onHostLeave/)
assert.doesNotMatch(
  card,
  /DocArticleLayout/,
  'negative: extras tags sit on the screen grid, not a DocArticle sticky aside',
)
assert.match(card, /theme-curved-monitor-feature__pair/)
assert.match(card, /theme-curved-monitor-feature__screen/)
assert.match(card, /theme-divider theme-divider--vertical theme-curved-monitor-card__gutter/)
assert.match(
  card,
  /theme-curved-monitor-feature__screen[\s\S]*theme-curved-monitor-card__gutter[\s\S]*theme-curved-monitor-card__edge[\s\S]*theme-curved-monitor-feature__mast/,
  'gutter sits between the bowl and the tags; mast stays under the still',
)
assert.match(card, /aria-pressed=\{focused\}/)
assert.doesNotMatch(
  card,
  /variant="bordered"/,
  'negative: tags are Vurify submenu buttons, not bordered icon chips',
)
assert.doesNotMatch(
  card,
  /theme-curved-monitor-card__tag-label/,
  'negative: tag copy lives in VurifyMenuButton, not a custom chip label',
)
assert.doesNotMatch(
  card,
  /housing/,
  'negative: tags are submenu rows, not housing main-menu buttons',
)
assert.doesNotMatch(
  card,
  /data-has-focus=\{focusId \? 'true' : 'false'\}/,
  'negative: first caption used to show while no tag was selected',
)
assert.doesNotMatch(card, /tone=\{focusId === item.id/)
assert.match(card, /theme-curved-monitor-card__caption-body/)
assert.match(card, /caption\.body/)
assert.doesNotMatch(card, /caption-lead/)
assert.doesNotMatch(card, /caption\.points/, 'negative: caption is one paragraph, not bullets')
assert.doesNotMatch(card, /<em>/, 'negative: caption stays white, no palette emphasis')
{
  const copy = groupsSrc
  assert.doesNotMatch(copy, /\u2014/, 'negative: no em dashes in the floating copy')
  assert.doesNotMatch(copy, /\bthe day\b/, 'negative: reader copy must not name an interview "the day"')
  assert.doesNotMatch(
    copy,
    /\bthe sitting\b|\bthis sitting\b|\bsitting tabs\b/,
    'negative: reader copy must not name an interview "the sitting"',
  )
  assert.doesNotMatch(copy, /\bthe seat\b/, 'negative: reader copy must not name a session "the seat"')
  assert.match(copy, /Pause the interview/)
  assert.match(copy, /Keep the interview/)
  assert.match(copy, /lock the\s+session/)
  assert.match(copy, /rest of the interview/)
  assert.match(
    'Pause the day if the page leaves the path you set.',
    /\bthe day\b/,
    'negative: the jargon gate still matches the old Home/Theme phrase',
  )
}
assert.doesNotMatch(card, /See more/, 'negative: expand is hover / tap, not a See more control')
assert.doesNotMatch(card, /theme-curved-monitor-card__details/, 'negative: no extra text card over the still')
assert.doesNotMatch(card, /theme-curved-monitor-card__scrim/, 'negative: no vignette card under the caption')
assert.match(card, /data-has-focus/)
assert.doesNotMatch(card, /useVisualActivity/)
assert.match(card, /hoverCurveDegree/)
assert.match(card, /bowlCurve/)
assert.match(card, /type-display-sm/)
assert.match(card, /size="lg"/)
assert.match(card, /theme-curved-monitor-feature__nav/)
assert.match(card, /TypeAnimText/)
assert.match(card, /anim="slide-up"/)
assert.match(card, /data-chrome/)
assert.match(card, /incomingSrc/)
assert.doesNotMatch(
  card,
  /theme-curved-monitor-card__fx/,
  'negative: stills must stay on the bent card',
)
assert.doesNotMatch(
  card,
  /type-display-lg/,
  'negative: display-lg made the group title huge',
)
assert.doesNotMatch(
  card,
  /type-display-md/,
  'negative: gallery title stepped down from display-md',
)
assert.doesNotMatch(
  card,
  /type-h3/,
  'negative: group title uses display-sm, not type-h3',
)
assert.doesNotMatch(
  card,
  /groupNavDirection/,
  'negative: fade does not slide the card by nav direction',
)
assert.doesNotMatch(
  card,
  /size="xxl"/,
  'negative: xxl chevrons sat larger than the title',
)
assert.doesNotMatch(
  card,
  /size="xxs"/,
  'negative: prev/next must not stay on the xxs chevron',
)
assert.doesNotMatch(
  card,
  /type-h4 theme-curved-monitor-feature__title/,
  'negative: type-h4 is smaller than the gallery heading',
)
assert.match(card, /data-expanded/)
assert.match(card, /DEFAULT_STILL/)
assert.match(groupsSrc, /CURVED_MONITOR_OFFER_STILLS/)
assert.doesNotMatch(card, /mediaSlideIndex/, 'negative: one placeholder still, no cycle')
assert.doesNotMatch(card, /GALLERY_DEMO_IMAGES/, 'negative: no rotating Unsplash stills')
assert.doesNotMatch(card, /setElapsed/)
assert.doesNotMatch(card, /HOME_ASSETS/, 'negative: no illustration overlay on the card')
assert.doesNotMatch(card, /PointerFollowDeck/)
assert.match(card, /theme-curved-monitor-feature__board/)
assert.match(
  card,
  /className="theme-curved-monitor-card"[\s\S]*theme-curved-monitor-feature__mast/,
)
assert.doesNotMatch(
  card,
  /theme-curved-monitor-feature__mast[\s\S]*className="theme-curved-monitor-card"/,
  'negative: gallery title and chevrons sit below the bent card',
)
assert.match(
  card,
  /theme-curved-monitor-card__edge[\s\S]*theme-curved-monitor-feature__mast/,
  'tags sit on the bowl row; mast stays under the still',
)
assert.doesNotMatch(
  card,
  /theme-curved-monitor-feature__mast[\s\S]*theme-curved-monitor-card__edge/,
  'negative: tags must not sit below the title column',
)
assert.doesNotMatch(
  card,
  /theme-curved-monitor-feature__heading[\s\S]*theme-curved-monitor-card[\s\S]*theme-curved-monitor-feature__heading/,
  'negative: group title sits below the bent card, not on it',
)

assert.match(css, /theme-curved-monitor-feature__mast/)
assert.match(css, /theme-curved-monitor-feature__board/)
assert.match(css, /justify-self: start/)
assert.match(css, /justify-self: end/)
assert.doesNotMatch(
  css,
  /theme-curved-monitor-feature__dots/,
  'negative: dotted nav chrome is gone from the bent card',
)
assert.match(css, /theme-curved-monitor-feature__heading/)
assert.match(
  css,
  /theme-curved-monitor-feature__heading \{[^}]*display: grid/,
)
assert.match(
  css,
  /grid-template-columns:\s*var\(--curved-monitor-nav-icon\) minmax\(0, 1fr\) var\(--curved-monitor-nav-icon\)/,
)
assert.doesNotMatch(
  css,
  /theme-curved-monitor-feature__heading \{[^}]*display: flex/,
  'negative: flex+gap shoved the chevrons with the title',
)
assert.doesNotMatch(
  css,
  /theme-curved-monitor-feature__heading \{[^}]*gap: 0\.22rem/,
  'negative: hugging the title moved the buttons on each swap',
)
assert.match(css, /justify-content:\s*center/)
assert.match(css, /margin-top:\s*0\.55rem/)
assert.doesNotMatch(
  css,
  /margin-bottom:\s*-2\.5rem/,
  'negative: title no longer overlaps the top of the still',
)
assert.doesNotMatch(
  css,
  /theme-curved-monitor-feature__heading \{[^}]*margin-bottom:\s*0\.1rem/,
  'negative: title sat in the empty canvas gap above the still',
)
assert.match(
  css,
  /theme-curved-monitor-feature__mast \{[^}]*width: 100%/,
)
assert.doesNotMatch(
  css,
  /--curved-monitor-chip-gutter/,
  'negative: a growing chip gutter parked tags off the media',
)
assert.doesNotMatch(
  css,
  /width: calc\(100% - var\(--curved-monitor-chip-gutter\)\)/,
  'negative: mast and card must match the media box, not a viewport gutter',
)
assert.match(css, /1\.85rem/)
assert.match(
  css,
  /--curved-monitor-nav-icon:\s*1\.85rem/,
)
assert.match(css, /theme-curved-monitor-feature__nav/)
assert.match(
  css,
  /\.theme-curved-monitor-feature__nav\.theme-btn svg[\s\S]*?width: var\(--curved-monitor-nav-icon\)/,
)
assert.match(
  css,
  /heading-label \.theme-vurify-icon/,
)
assert.doesNotMatch(
  css,
  /--curved-monitor-nav-icon:\s*clamp\(1\.75rem/,
  'negative: chevrons no longer track the display-md title clamp',
)
assert.doesNotMatch(
  css,
  /--curved-monitor-nav-icon:\s*clamp\(2\.15rem/,
  'negative: 2.15–3.5rem chevrons sat larger than the title',
)
assert.doesNotMatch(
  css,
  /font-size: var\(--curved-monitor-nav-icon\)/,
  'negative: title type is display-sm, not the chrome icon size',
)
assert.doesNotMatch(
  css,
  /grid-template-columns:\s*5rem/,
  'negative: 5rem columns still left the glyph at IconButton size-5',
)
assert.match(css, /theme-curved-monitor-tag-in/)
assert.match(css, /theme-curved-monitor-caption-out/)
assert.match(css, /theme-curved-monitor-title-out/)
assert.match(css, /cubic-bezier\(0\.22, 1, 0\.36, 1\)/)
assert.doesNotMatch(
  css,
  /theme-curved-monitor-card__fx/,
  'negative: Zoom crossfade is on the bent meshes, not a flat overlay',
)
assert.doesNotMatch(
  css,
  /visibility:\s*hidden/,
  'negative: the bent card must stay visible during the still swap',
)
assert.doesNotMatch(
  css,
  /grid-template-columns: 2\.25rem/,
  'negative: heading columns were the xxs chevron slots',
)
assert.doesNotMatch(
  css,
  /grid-template-columns: 3\.25rem/,
  'negative: 3.25rem columns still read as tiny chevrons',
)
assert.match(css, /aspect-ratio: 16 \/ 9/)
assert.match(css, /aspect-ratio: 4 \/ 3/)
assert.match(css, /theme-curved-monitor-card__edge/)
assert.match(
  css,
  /theme-curved-monitor-feature__screen \{[^}]*grid-template-columns: max-content max-content var\(--curved-monitor-tag-col\)/,
)
assert.match(
  css,
  /theme-curved-monitor-feature__screen \{[^}]*align-items: center/,
  'tags sit on the still mid-line',
)
assert.doesNotMatch(
  css,
  /theme-curved-monitor-feature__screen \{[^}]*align-items: stretch/,
  'negative: stretching the screen row parks tags at the top',
)
assert.doesNotMatch(
  css,
  /theme-doc-article__layout-aside \{[^}]*position: sticky/,
  'negative: extras tags are not a DocArticle sticky aside',
)
assert.doesNotMatch(
  css,
  /theme-curved-monitor-card__edge \{[^}]*position: sticky/,
  'negative: homemade sticky on __edge is not the extras layout',
)
assert.match(
  css,
  /theme-curved-monitor-feature__screen \{[^}]*column-gap: var\(--curved-monitor-tag-gap\)/,
)
assert.doesNotMatch(
  css,
  /theme-curved-monitor-card__gutter\.theme-divider--vertical \{[^}]*height: 2\.75rem/,
  'negative: the 2.75rem sliver must not remain',
)
assert.match(
  css,
  /theme-curved-monitor-card__edge \{[^}]*height: max-content/,
)
assert.doesNotMatch(
  css,
  /theme-curved-monitor-card__edge \{[^}]*align-self: stretch/,
  'negative: stretching the table to the bowl height parks rows at the top',
)
assert.match(
  css,
  /theme-curved-monitor-card__edge-item:not\(:last-child\) \{[^}]*border-bottom: 1px solid var\(--theme-border\)/,
  'edge tags use menu-style full-width row rules',
)
assert.doesNotMatch(
  css,
  /theme-curved-monitor-feature__pair \{[^}]*minmax\(0, 1fr\) max-content/,
  'negative: a 1fr pair parked tags on the viewport edge',
)
assert.match(
  css,
  /theme-curved-monitor-card__edge \{[^}]*display: flex/,
)
assert.doesNotMatch(
  css,
  /theme-curved-monitor-card__edge \{[^}]*right:\s*0/,
  'negative: tags sit after the screen column, not clipped on the bowl',
)
assert.match(css, /@media \(max-width: 52rem\)/)
assert.match(
  css,
  /theme-curved-monitor-card__edge \{[^}]*display: none/,
)
assert.match(
  css,
  /theme-curved-monitor-card__gutter,\s*\.theme \.theme-curved-monitor-card__edge \{[^}]*display: none/,
)
assert.doesNotMatch(
  css,
  /theme-curved-monitor-card__edge \{[^}]*display: none;[^}]*flex-direction/,
  'negative: compact hide is display-none only, not the desktop edge stack',
)
assert.match(
  css,
  /theme-curved-monitor-feature__title \{[^}]*text-overflow: ellipsis/,
)
assert.match(
  css,
  /theme-curved-monitor-feature__heading-label \{[^}]*overflow: hidden/,
)
assert.match(css, /translate\(-50%, -50%\)/)
assert.doesNotMatch(
  css,
  /translate\(50%, -50%\)/,
  'negative: tags must not straddle the bowl at 50% translate',
)
assert.match(css, /caption-chip/)
assert.match(
  css,
  /caption-chip \{[^}]*border-radius: 0/,
)
assert.doesNotMatch(
  css,
  /caption-chip \{[^}]*border-radius: 999px/,
  'negative: still labels must not be round capsules',
)
assert.match(css, /caption-section/)
assert.match(css, /caption--nav/)
assert.doesNotMatch(
  css,
  /left:\s*8%/,
  'negative: tags belong after the right edge of the screen, not inset on the still',
)
assert.doesNotMatch(
  css,
  /right:\s*-1\.35rem/,
  'negative: hanging the tags wholly off the CSS box missed the bowl',
)
assert.match(css, /--theme-shadow-brutal/)
assert.doesNotMatch(
  css,
  /theme-curved-monitor-card__tag\.theme-vurify-menu-button \{[^}]*max-width: 16rem/,
  'negative: md tag width was a loose list, not compact buttons',
)
assert.doesNotMatch(
  css,
  /theme-curved-monitor-card__tag\.theme-vurify-menu-button \{[^}]*max-width: 9\.5rem/,
  'negative: 9.5rem clipped Interview features / Candidate onboarding',
)
assert.doesNotMatch(
  css,
  /theme-curved-monitor-card__tag\.theme-vurify-menu-button \{[^}]*max-width:/,
  'negative: tag labels must not clip at a rem cap',
)
assert.match(css, /--curved-monitor-tag-col:\s*17rem/)
assert.match(css, /--curved-monitor-tag-gap:\s*1rem/)
assert.doesNotMatch(
  css,
  /--curved-monitor-tag-gap:\s*0\.32rem/,
  'negative: 0.32rem left no air for the short rule',
)
assert.doesNotMatch(
  css,
  /--curved-monitor-tag-gap:\s*0\.2rem/,
  'negative: 0.2rem was the too-close gap',
)
assert.match(css, /--curved-monitor-gutter:\s*1px/)
assert.match(css, /--curved-monitor-bowl-inset:\s*0\.4rem/)
assert.doesNotMatch(
  css,
  /--curved-monitor-bowl-inset:\s*1\.25rem/,
  'negative: 1.25rem tucked tags onto the short rule',
)
assert.doesNotMatch(
  css,
  /--curved-monitor-bowl-inset:\s*2\.5rem/,
  'negative: 2.5rem tucked tags onto the painted rim',
)
assert.match(
  css,
  /theme-curved-monitor-card__edge \{[^}]*width: var\(--curved-monitor-tag-col\)/,
)
assert.match(
  css,
  /--curved-monitor-tag-span:\s*calc\(\s*var\(--curved-monitor-tag-gap\) \* 2 \+ var\(--curved-monitor-gutter\) \+ var\(--curved-monitor-tag-col\)\s*-\s*var\(--curved-monitor-bowl-inset\)\s*\)/,
)
assert.match(
  css,
  /theme-curved-monitor-card__edge \{[^}]*margin-inline-start: calc\(-1 \* var\(--curved-monitor-bowl-inset\)\)/,
)
assert.doesNotMatch(
  css,
  /theme-curved-monitor-card__tag::before/,
  'negative: submenu tags have no ticket spine',
)
assert.doesNotMatch(
  css,
  /translateX\(-0\.22rem\)/,
  'negative: only the submenu button chrome changes, tags do not slide onto the still',
)
assert.doesNotMatch(
  css,
  /theme-curved-monitor-card__tag \{[^}]*border-radius: 999px/,
  'negative: round capsules do not match Home tickets',
)
assert.doesNotMatch(
  css,
  /scale\(1\.12\)/,
  'negative: tags must not balloon on focus',
)
assert.doesNotMatch(
  css,
  /transform-origin: center left/,
  'negative: tags must not grow from the media left',
)
assert.match(css, /align-items:\s*stretch/)
assert.match(css, /width: 100%/)
assert.match(css, /translate\(-50%, -50%\)/)
assert.match(css, /width: min\(22rem, calc\(100% - 1\.75rem\)\)/)
assert.match(css, /caption-rule/)
assert.match(css, /max-width:\s*36ch/)
assert.match(css, /text-align:\s*center/)
assert.doesNotMatch(css, /caption-lead/)
assert.doesNotMatch(css, /li::marker/)
assert.match(css, /--theme-accent/)
assert.doesNotMatch(
  css,
  /left:\s*12%/,
  'negative: caption is centered on the media, not shifted off-centre',
)
assert.doesNotMatch(
  css,
  /right:\s*28%/,
  'negative: a left/right pocket pulled the copy off the middle',
)
assert.doesNotMatch(
  css,
  /caption-body em/,
  'negative: no palette-colored inline emphasis on the still',
)
assert.doesNotMatch(css, /theme-curved-monitor-card__scrim/)
assert.doesNotMatch(
  css,
  /radial-gradient/,
  'negative: caption must not sit on a vignette card',
)
assert.doesNotMatch(css, /theme-curved-monitor-card__see-more/)
assert.doesNotMatch(css, /theme-curved-monitor-card__details/)
assert.doesNotMatch(
  css,
  /data-expanded='true'\] \.theme-curved-monitor-card__edge \{/,
  'negative: tags stay on the media while a feature is focused',
)
assert.match(css, /theme-curved-monitor-card__caption/)
assert.match(css, /caption-copy/)
assert.match(css, /opacity 0\.85s ease/)
assert.match(css, /theme-curved-monitor-caption-in/)
assert.match(css, /filter 0\.8s ease/)
assert.doesNotMatch(
  css,
  /opacity 0\.35s ease/,
  'negative: caption used to snap in at 0.35s',
)
assert.match(css, /color: #fff/)
assert.match(css, /caption-body strong/)
assert.match(
  css,
  /caption-title,[\s\S]*caption-body,[\s\S]*caption-body strong \{[\s\S]*text-shadow:/,
  'white caption glow on title and body',
)
assert.match(css, /255 255 255/)
assert.match(css, /caption-rule[\s\S]*box-shadow: 0 0 0\.65rem rgb\(255 255 255/)
assert.doesNotMatch(
  css,
  /caption-title \{[\s\S]*color: #fff;[\s\S]*caption-body \{/,
  'negative: caption color without a shared white glow is the old still-on-dark wash',
)
assert.match(css, /grayscale\(0\.55\)/)
assert.match(css, /brightness\(0\.28\)/)
{
  const restHostAt = css.indexOf('.theme .theme-curved-monitor-card__canvas-host {')
  const expandedAt = css.indexOf("[data-expanded='true'] .theme-curved-monitor-card__canvas-host")
  assert.ok(restHostAt >= 0 && expandedAt > restHostAt)
  assert.doesNotMatch(
    css.slice(restHostAt, expandedAt),
    /grayscale/,
    'negative: idle still must not carry the hover grey tint',
  )
}
assert.doesNotMatch(
  css,
  /brightness\(0\.55\)/,
  'negative: the still tint was too light for white copy',
)
assert.doesNotMatch(css, /theme-curved-monitor-card__float/)

const canvas = readFileSync(join(dir, '../../components/curvedMonitorCard/CurvedMonitorCanvas.tsx'), 'utf8')
assert.match(canvas, /frameloop=\{runLoop \? 'always' : 'never'\}/)
assert.match(canvas, /invalidate\(\)/)
assert.match(canvas, /incomingSrc/)
assert.match(canvas, /onFxComplete/)
assert.match(canvas, /NoToneMapping/)
assert.doesNotMatch(
  canvas,
  /ACESFilmicToneMapping/,
  'negative: ACES greys the idle still',
)
assert.doesNotMatch(
  canvas,
  /fxDirection/,
  'negative: fade does not slide the bowl by direction',
)
assert.doesNotMatch(
  canvas,
  /active \? 'always' : 'demand'/,
  'negative: demand waits for scroll before the still can mount',
)
assert.doesNotMatch(
  canvas,
  /active \? 'always' : 'never'/,
  'negative: never skips the first still until a pointer event invalidates',
)
assert.match(scene, /useThree/)
assert.match(scene, /invalidate\(\)/)

const homeScene = readFileSync(join(dir, '../../pages/HomeMoreFeaturesScene.tsx'), 'utf8')
assert.match(homeScene, /CurvedMonitorCard/)
assert.match(homeScene, /HOME_FEATURE_GROUPS/)
assert.match(card, /data-variant=\{variant\}/)
assert.match(card, /caption-chip/)
assert.match(card, /variant === 'nav'/)
assert.doesNotMatch(
  homeScene,
  /variant="nav"/,
  'negative: Home extras stay on the gallery card',
)
assert.doesNotMatch(
  homeScene,
  /NAV_FEATURE_GROUPS/,
  'negative: the nav stack is on hold for Home',
)
assert.match(homeScene, /gsap\.set\(stage,/)
assert.doesNotMatch(
  homeScene,
  /theme-doc-article__layout-main/,
  'negative: extras GSAP targets the stage, not a DocArticle main',
)
assert.doesNotMatch(
  homeScene,
  /theme-doc-article__layout-aside/,
  'negative: extras GSAP must not target a sticky aside',
)
assert.doesNotMatch(
  homeScene,
  /VURIFY_MORE_FEATURES\.map/,
  'negative: Home extras must not stay a mini-card grid',
)
assert.doesNotMatch(
  homeScene,
  /page-scene--home-more-features__grid/,
  'negative: the bent card replaced the extras grid',
)
assert.doesNotMatch(
  homeScene,
  /Around the interview path/,
  'negative: Scene 04b must not keep the overline',
)
assert.doesNotMatch(
  homeScene,
  /interview path is the core/,
  'negative: Scene 04b must not keep the interview-path lead',
)
assert.doesNotMatch(
  homeScene,
  /home-more-features__overline/,
  'negative: the extras header is the page title only',
)

const pageScenes = readFileSync(join(dir, '../../css/effects/page-scenes.css'), 'utf8')
assert.match(
  pageScenes,
  /page-scene--home-more-features \{[^}]*height: 100svh/,
)
assert.match(
  pageScenes,
  /page-scene--home-more-features__layout \{[^}]*--curved-monitor-home-scale: 0\.94/,
)
assert.match(
  pageScenes,
  /page-scene--home-more-features__layout \{[^}]*flex-direction: column/,
  'extras stacks the title over the card',
)
assert.match(
  pageScenes,
  /page-scene--home-more-features__stage \{[^}]*container-type: size/,
  'bowl sizes from the extras stage container',
)
assert.doesNotMatch(
  pageScenes,
  /page-scene--home-more-features__stage \{[^}]*display: contents/,
  'negative: display contents flattened the card and tag table',
)
assert.doesNotMatch(
  pageScenes,
  /page-scene--home-more-features__stage \.theme-curved-monitor-feature__screen\.theme-doc-article__layout--sidebar \.theme-doc-article__layout-aside \{[^}]*position: sticky/,
  'negative: How-it-works sticky rail must not wrap extras tags',
)
assert.doesNotMatch(
  pageScenes,
  /page-scene--home-more-features__stage \.theme-curved-monitor-card \{[^}]*100svh - 8\.5rem/,
  'negative: viewport-minus-8.5rem was the sticky-rail bowl size',
)
assert.match(
  pageScenes,
  /page-scene--home-more-features__stage \.theme-curved-monitor-card \{[^}]*aspect-ratio: 16 \/ 9/,
)
assert.match(
  pageScenes,
  /width: min\(\s*calc\(\(100cqw - var\(--curved-monitor-tag-span\)\) \* var\(--curved-monitor-home-scale\)\)/,
  'bowl width is the extras stage, minus the tag span, then scaled down a bit',
)
assert.doesNotMatch(
  pageScenes,
  /page-scene--home-more-features \{[^}]*overflow: hidden/,
  'negative: overflow hidden on extras clips the bowl',
)
assert.doesNotMatch(
  pageScenes,
  /100cqw - 10\.5rem/,
  'negative: a 10.5rem reserve was smaller than unclipped labels',
)
assert.doesNotMatch(
  pageScenes,
  /page-scene--home-more-features__stage \.theme-curved-monitor-card \{[^}]*width: min\(100%, calc\(\(100cqh - 4\.25rem\)/,
  'negative: 100% of a max-content screen collapses the 16:9 bowl',
)
assert.doesNotMatch(
  pageScenes,
  /page-scene--home-more-features__overline/,
  'negative: extras overline CSS must not remain',
)
assert.doesNotMatch(
  pageScenes,
  /page-scene--home-more-features__grid/,
  'negative: mini-card grid CSS must not remain',
)
assert.doesNotMatch(
  pageScenes,
  /page-scene--home-more-features__stage \{[^}]*padding-inline-end: 6\.5rem/,
  'negative: tags sit in the pair grid, not in a stage gutter that shrinks the screen',
)
assert.doesNotMatch(
  pageScenes,
  /page-scene--home-more-features__layout \{[^}]*grid-template-columns: minmax\(0, max-content\) max-content/,
  'negative: extras is not the How-it-works sticky-rail grid',
)
assert.doesNotMatch(
  pageScenes,
  /page-scene--home-more-features__stage \.theme-curved-monitor-feature__pair \{[^}]*align-items: stretch/,
  'negative: stretching the pair parked tags at the stage top-right',
)
assert.doesNotMatch(
  pageScenes,
  /page-scene--home-more-features__stage \.theme-curved-monitor-feature__pair \{[^}]*height: 100%/,
  'negative: a full-height pair is not the card height',
)
assert.match(
  pageScenes,
  /page-scene--home-more-features__stage \.theme-curved-monitor-card \{[^}]*aspect-ratio: 4 \/ 3/,
)
assert.match(pageScenes, /100cqh - 3\.25rem/)
assert.doesNotMatch(
  pageScenes,
  /100cqh - 8rem/,
  'negative: the 8rem mast reserve kept the bowl small',
)

assert.equal(
  pickOfferFrame(['/home/offer/cv-intake.f1.webp', '/home/offer/cv-intake.f2.webp'], 'CV intake').src,
  '/home/offer/cv-intake.f1.webp',
)
assert.equal(
  pickOfferFrame(HOME_ASSETS.offerCvIntakeVideo.frames, HOME_ASSETS.offerCvIntakeVideo.alt).src,
  HOME_ASSETS.offerCvIntakeVideo.frames[0],
)
assert.equal(
  pickOfferFrame(HOME_ASSETS.offerLiveInterviewVideo.frames, HOME_ASSETS.offerLiveInterviewVideo.alt).src,
  HOME_ASSETS.offerLiveInterviewVideo.frames[0],
)
assert.equal(
  pickOfferFrame(HOME_ASSETS.offerHiringPackageVideo.frames, HOME_ASSETS.offerHiringPackageVideo.alt).src,
  HOME_ASSETS.offerHiringPackageVideo.frames[0],
)
assert.ok(
  pickOfferFrame(HOME_ASSETS.offerCvIntakeVideo.frames, 'x').src.endsWith('.webp'),
)
assert.doesNotMatch(
  pickOfferFrame(HOME_ASSETS.offerCvIntakeVideo.frames, 'x').src,
  /\.mp4$/,
  'negative: bent stills are offer frames, not the looping mp4',
)
assert.throws(
  () => pickOfferFrame(undefined, 'x'),
  /missing offer frame/,
)
assert.equal(DECODE_IMAGE_SRC_TIMEOUT_MS, 4000)
assert.ok(
  DECODE_IMAGE_SRC_TIMEOUT_MS < 10_000,
  'negative: extras decode must not wait out the whole loading sequence',
)
assert.equal(await decodeImageSrcs(['/home/offer/cv-intake.f1.webp']), undefined)

const stillsFile = readFileSync(join(dir, '../../components/curvedMonitorCard/stills.ts'), 'utf8')
assert.match(stillsFile, /pickOfferFrame/)
assert.match(stillsFile, /HOME_ASSETS.offerCvIntakeVideo/)
assert.match(stillsFile, /HOME_ASSETS.offerLiveInterviewVideo/)
assert.match(stillsFile, /HOME_ASSETS.offerHiringPackageVideo/)
assert.match(stillsFile, /decodeImageSrcs/)
assert.doesNotMatch(
  stillsFile,
  /offerAgencyManagementVideo/,
  'negative: extras stills are the three later offer frames',
)

const preloadSrc = readFileSync(
  join(dir, '../../components/curvedMonitorCard/preloadStills.ts'),
  'utf8',
)
assert.match(preloadSrc, /useTexture.preload/)
assert.match(preloadSrc, /decodeCurvedMonitorStills/)
assert.doesNotMatch(preloadSrc, /<Canvas/, 'negative: preload must not mount WebGL')

const homePage = readFileSync(join(dir, '../../pages/HomePage.tsx'), 'utf8')
assert.match(homePage, /void preloadHomeMedia\(\)/)
assert.match(homePage, /preloadHomeMedia\(\)\.finally/)
assert.match(homePage, /DEFERRED_EXTRAS_SCENE_ROOT_MARGIN/)
assert.match(
  homePage,
  /id="home-scene-4b"[\s\S]{0,280}rootMargin=\{DEFERRED_EXTRAS_SCENE_ROOT_MARGIN\}/,
)
assert.doesNotMatch(
  homePage,
  /id="home-scene-2"[\s\S]{0,280}rootMargin/,
  'negative: only extras look ahead two viewports',
)

console.log('curvedMonitor.unit.mjs: ok')
