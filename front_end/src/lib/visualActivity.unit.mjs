/**
 * Off-screen / hidden-tab / parked loops must stop; on-screen live loops must not.
 * Run: node front_end/src/lib/visualActivity.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  deferredSceneObserverInit,
  DEFERRED_EXTRAS_SCENE_ROOT_MARGIN,
  DEFERRED_SCENE_ROOT_MARGIN,
  elementLooksPainted,
  motionLoopShouldRun,
  nearestThemeScrollRoot,
  resolveR3fFrameloop,
  THEME_SCROLL_VIEWPORT_SELECTOR,
  HOME_WEBGL_WARM_MS,
  visualActivityObserverInit,
  visualActivityShouldRun,
  WEBGL_POWER_PREFERENCE,
} from './visualActivity.ts'
import {
  sceneMenuFooterTriggerVisible,
  sceneMenuTriggerVisible,
} from './menus/sceneStackMenu.ts'

const dir = dirname(fileURLToPath(import.meta.url))

const live = {
  enabled: true,
  intersecting: true,
  documentVisible: true,
  painted: true,
}

assert.equal(visualActivityShouldRun(live), true, 'on-screen live loop stays on')

assert.equal(
  visualActivityShouldRun({ ...live, intersecting: false }),
  false,
  'negative: off-screen stops',
)
assert.equal(
  visualActivityShouldRun({ ...live, documentVisible: false }),
  false,
  'negative: hidden tab stops',
)
assert.equal(
  visualActivityShouldRun({ ...live, enabled: false }),
  false,
  'negative: parked / closed peel stops',
)
assert.equal(
  visualActivityShouldRun({ ...live, painted: false }),
  false,
  'negative: CSS-hidden (mobile settled cloud) stops',
)

assert.equal(
  elementLooksPainted(
    { display: 'block', visibility: 'hidden', opacity: '1' },
    { width: 100, height: 100 },
  ),
  false,
  'visibility:hidden is unpainted',
)
assert.equal(
  elementLooksPainted(
    { display: 'block', visibility: 'visible', opacity: '1' },
    { width: 100, height: 100 },
  ),
  true,
  'visible box is painted',
)

assert.equal(
  resolveR3fFrameloop('always', true),
  'always',
  'live requested always keeps always',
)
assert.equal(
  resolveR3fFrameloop('always', false),
  'never',
  'negative: off-screen always becomes never',
)
assert.equal(
  resolveR3fFrameloop('never', true),
  'never',
  'negative: parked never stays never even when intersecting',
)
assert.equal(
  resolveR3fFrameloop('always', true, false),
  'demand',
  'visible idle loop is demand, not always',
)
assert.equal(
  resolveR3fFrameloop('always', true, true),
  'always',
  'visible busy loop stays always',
)
assert.equal(
  resolveR3fFrameloop('never', true, false),
  'never',
  'negative: parked never stays never even when idle',
)

const scroller = { nodeName: 'DIV' }
assert.equal(visualActivityObserverInit().root, undefined)
assert.equal(
  visualActivityObserverInit(null).root,
  undefined,
  'negative: null root is the browser viewport, not a fake element',
)
assert.equal(visualActivityObserverInit(scroller).root, scroller)

const nestedScroller = { id: 'theme-scroll' }
assert.equal(
  nearestThemeScrollRoot({
    closest: (sel) => (sel === THEME_SCROLL_VIEWPORT_SELECTOR ? nestedScroller : null),
  }),
  nestedScroller,
  'nested ThemeScroll is the observer root',
)
assert.equal(
  nearestThemeScrollRoot({ closest: () => null }),
  null,
  'negative: no ThemeScroll ancestor uses the window',
)
assert.equal(nearestThemeScrollRoot(null), null, 'negative: missing host is not a fake root')

assert.equal(deferredSceneObserverInit(scroller).root, scroller)
assert.equal(deferredSceneObserverInit(scroller).rootMargin, DEFERRED_SCENE_ROOT_MARGIN)
assert.equal(
  deferredSceneObserverInit(scroller, DEFERRED_EXTRAS_SCENE_ROOT_MARGIN).rootMargin,
  DEFERRED_EXTRAS_SCENE_ROOT_MARGIN,
)
assert.notEqual(
  DEFERRED_EXTRAS_SCENE_ROOT_MARGIN,
  DEFERRED_SCENE_ROOT_MARGIN,
  'negative: extras lookahead is wider than the default one-viewport slot',
)
assert.equal(WEBGL_POWER_PREFERENCE, 'high-performance')

assert.equal(
  motionLoopShouldRun({
    visuallyActive: true,
    spinning: true,
    tweening: false,
    dragging: false,
  }),
  true,
  'visible spin keeps rAF',
)
assert.equal(
  motionLoopShouldRun({
    visuallyActive: true,
    spinning: false,
    tweening: false,
    dragging: false,
  }),
  false,
  'negative: idle on-screen does not keep rAF',
)
assert.equal(
  motionLoopShouldRun({
    visuallyActive: false,
    spinning: true,
    tweening: false,
    dragging: false,
  }),
  false,
  'negative: off-screen spin does not keep rAF',
)

const cloudSrc = readFileSync(join(dir, '../components/IsometricWordCloud.tsx'), 'utf8')
assert.match(cloudSrc, /useVisualActivity/)
assert.match(cloudSrc, /resolveR3fFrameloop/)
assert.match(
  cloudSrc,
  /frameloop=\{resolvedFrameloop\}/,
  'word cloud Canvas must use the resolved loop, not the raw prop',
)

assert.match(cloudSrc, /visibilityRootRef/)
assert.match(cloudSrc, /WEBGL_POWER_PREFERENCE/)
assert.match(cloudSrc, /needsFrames/)
assert.match(
  cloudSrc,
  /mode === 'loading' \|\| waveEnabled/,
  'demand when visible but not loading/waving',
)

const homeSrc = readFileSync(join(dir, '../pages/HomePage.tsx'), 'utf8')
assert.match(homeSrc, /wordCloudLoop/)
assert.match(homeSrc, /visibilityRootRef=\{scrollViewportRef\}/)
assert.match(homeSrc, /DeferredHomeScene/)
assert.match(homeSrc, /id="home-scene-2"/)
assert.match(homeSrc, /id="home-scene-6"/)
assert.match(homeSrc, /id="home-scene-7"/)
assert.match(homeSrc, /preloadHomeMedia/)
assert.match(
  homeSrc,
  /homeBootstrapDisplayProgress\(stageProgress, homeMediaReady\)/,
)
assert.match(homeSrc, /eager=\{homeOwnsBootstrap \|\| homeLive\}/)
assert.equal(
  (homeSrc.match(/eager=\{homeOwnsBootstrap \|\| homeLive\}/g) ?? []).length,
  7,
  'scenes 02–07 eager-mount during Home % and stay mounted',
)
assert.match(homeSrc, /DEFERRED_EXTRAS_SCENE_ROOT_MARGIN/)
assert.match(
  homeSrc,
  /id="home-scene-4b"[\s\S]{0,280}rootMargin=\{DEFERRED_EXTRAS_SCENE_ROOT_MARGIN\}/,
)
assert.doesNotMatch(
  homeSrc,
  /<DeferredHomeScene[\s\S]*id="home-scene-1"/,
  'negative: landing scene 1 is not deferred',
)
assert.doesNotMatch(
  homeSrc,
  /id="home-scene-2"[\s\S]{0,280}rootMargin/,
  'negative: only extras look ahead two viewports',
)

const deferHookSrc = readFileSync(join(dir, '../hooks/useDeferredSceneMount.ts'), 'utf8')
assert.match(deferHookSrc, /deferredSceneObserverInit\(root, rootMargin\)/)
const deferSceneSrc = readFileSync(join(dir, '../components/DeferredHomeScene.tsx'), 'utf8')
assert.match(deferSceneSrc, /eager\?:/)
assert.match(deferSceneSrc, /useDeferredSceneMount\(hostRef, scrollerRef, rootMargin, eager\)/)
assert.match(deferHookSrc, /eager = false/)
assert.equal(HOME_WEBGL_WARM_MS, 1600)

const reached = {
  sceneTwoReached: true,
  open: false,
  footerSurface: false,
  inputLocked: false,
}
assert.equal(
  sceneMenuTriggerVisible(reached),
  true,
  'Menu dock shows after Scene 2 while the page is live',
)
assert.equal(
  sceneMenuTriggerVisible({ ...reached, inputLocked: true }),
  false,
  'negative: Scene 2 must not keep Menu visible during load or App Stage nav',
)
assert.equal(
  sceneMenuTriggerVisible({
    sceneTwoReached: false,
    open: false,
    footerSurface: false,
    inputLocked: false,
  }),
  false,
  'negative: landing Scene 1 does not show Menu',
)
assert.equal(
  sceneMenuFooterTriggerVisible({ footerSurface: true, inputLocked: false }),
  true,
)
assert.equal(
  sceneMenuFooterTriggerVisible({ footerSurface: true, inputLocked: true }),
  false,
  'negative: footer Close hides during load or App Stage nav',
)

const shellSrc = readFileSync(join(dir, '../components/SceneMenuShell.tsx'), 'utf8')
assert.match(
  shellSrc,
  /triggerVisible = sceneMenuTriggerVisible\(\{/,
  'Menu dock uses the shared lock helper, not a Scene-2-only check',
)
assert.match(shellSrc, /footerTriggerVisible = sceneMenuFooterTriggerVisible\(\{/)
assert.doesNotMatch(
  shellSrc,
  /const triggerVisible = \(sceneTwoReached \|\| open\) && !footerSurface$/,
  'negative: Scene 2 must not keep Menu up while input is locked',
)

const shellCss = readFileSync(join(dir, '../css/effects/scene-menu-shell.css'), 'utf8')
assert.match(
  shellCss,
  /data-scroll-locked='true'\][\s\S]*?__trigger-clip[\s\S]*?transition: none/,
  'locked shell hides Menu without the 220ms clip fade',
)
assert.match(
  shellCss,
  /theme-scroll__viewport \{[\s\S]*?scrollbar-gutter: stable both-edges/,
  'Home mini rail keeps a stable gutter',
)
assert.match(
  shellCss,
  /data-scroll-locked='true'\][\s\S]*?scrollbar-width: none/,
  'locked Home scroller hides the mini rail thumb',
)
assert.doesNotMatch(
  shellCss,
  /data-scroll-locked='true'[\s\S]*scrollbar-gutter:\s*auto/,
  'negative: lock must not drop the stable gutter',
)

const stageCss = readFileSync(join(dir, '../css/effects/app-stage.css'), 'utf8')
assert.match(
  stageCss,
  /data-stage-loading='true'[\s\S]*?data-stage-navigating='true'[\s\S]*?scrollbar-width: none/,
  'App Stage hides scroll thumbs while loading and while navigating',
)

const extrasCanvasSrc = readFileSync(
  join(dir, '../components/curvedMonitorCard/CurvedMonitorCanvas.tsx'),
  'utf8',
)
assert.match(extrasCanvasSrc, /useVisualActivity/)
assert.match(extrasCanvasSrc, /HOME_WEBGL_WARM_MS/)
assert.match(extrasCanvasSrc, /frameloop=\{runLoop \? 'always' : 'never'\}/)

const reelSrc = readFileSync(join(dir, '../components/HomeWhatWeDoVideoReel.tsx'), 'utf8')
assert.match(reelSrc, /preload="auto"/)
assert.doesNotMatch(
  reelSrc,
  /preload=\{playing/,
  'negative: the reel must not wait until play to fetch',
)

const accordionSrc = readFileSync(join(dir, '../components/WebGpuIsometricAccordion.tsx'), 'utf8')
assert.match(accordionSrc, /preload="auto"/)
assert.doesNotMatch(
  accordionSrc,
  /removeAttribute\('src'\)/,
  'negative: offer videos must pause without detaching src',
)
assert.doesNotMatch(
  accordionSrc,
  /VIDEO_UNLOAD_MS/,
  'negative: offer videos must not unload after pause',
)

const shiftSrc = readFileSync(join(dir, '../components/VurifyTestimonialShift.tsx'), 'utf8')
assert.match(shiftSrc, /theme-vurify-testimonial-shift__copy-sizer/)
assert.match(
  shiftSrc,
  /copy-sizer[\s\S]*VurifyIcon[\s\S]*theme-vurify-testimonial-card__quote/,
)
assert.doesNotMatch(
  shiftSrc,
  /copy-sizer[\s\S]*<span key=\{starIndex\} className="theme-vurify-testimonial-card__star" \/>/,
  'negative: empty star stubs undersize the review sizer',
)

const shiftCss = readFileSync(
  join(dir, '../css/effects/vurify-testimonial-shift.css'),
  'utf8',
)
assert.match(
  shiftCss,
  /theme-vurify-testimonial-shift__panel--copy \{[^}]*position: absolute/,
)
assert.match(
  shiftCss,
  /copy-sizer \.theme-vurify-testimonial-card__quote,[\s\S]*?panel--copy \.theme-vurify-testimonial-card__quote \{[^}]*max-width: 32rem/,
)
assert.doesNotMatch(
  shiftCss,
  /copy-sizer,\s*\.theme \.theme-vurify-testimonial-shift__panel--copy \{[^}]*grid-area/,
  'negative: live review copy must not share in-flow height with the sizer',
)

assert.match(
  homeSrc,
  /homeLive && \(framing !== 'mobileLanding' \|\| !copyReady\)/,
  'settled mobile landing must not keep the WebGL loop',
)
assert.match(homeSrc, /frameloop=\{wordCloudLoop \? 'always' : 'never'\}/)
assert.match(homeSrc, /homeWordCloudHostHidden/)
assert.match(homeSrc, /page-scene--home__word-cloud-veil/)
assert.doesNotMatch(
  homeSrc,
  /frameloop=\{homeOwnsBootstrap \|\| homeLive \? 'always' : 'never'\}/,
  'negative: parked-only ternary is not enough — mobile hide + wordCloudLoop',
)
assert.doesNotMatch(
  homeSrc,
  /page-scene--home__word-cloud--parked/,
  'negative: do not visibility-hide the canvas host (that pauses the park frame)',
)

const deckSrc = readFileSync(join(dir, '../components/PointerFollowDeck.tsx'), 'utf8')
assert.match(deckSrc, /motionEnabled/)
assert.match(deckSrc, /useVisualActivity/)
assert.match(deckSrc, /rootRef: scrollerRef/)
assert.match(deckSrc, /plain\?:/)
assert.match(deckSrc, /data-plain=\{plain \? 'true' : undefined\}/)

const curtainSrc = readFileSync(join(dir, '../components/CurtainLoading.tsx'), 'utf8')
assert.match(curtainSrc, /WEBGL_POWER_PREFERENCE/)

const previewSrc = readFileSync(
  join(dir, '../components/SceneStackMenuPreviewPanel.tsx'),
  'utf8',
)
assert.match(previewSrc, /motionEnabled/)

const menuSrc = readFileSync(join(dir, '../components/SceneStackMenu.tsx'), 'utf8')
assert.match(
  menuSrc,
  /motionEnabled=\{menuOpen\}/,
  'menu illustrations must pause when the peel is closed',
)
assert.match(menuSrc, /MenuInfoVideo/)
assert.match(menuSrc, /active=\{menuOpen\}/)

const footerSrc = readFileSync(join(dir, '../components/HomeFooter.tsx'), 'utf8')
assert.match(
  footerSrc,
  /motionEnabled=\{footerSurface\}/,
  'footer illustrations must pause when the peel is closed',
)

const zdogSrc = readFileSync(join(dir, '../hooks/useShape3dIllustration.ts'), 'utf8')
assert.match(zdogSrc, /motionLoopShouldRun/)
assert.match(zdogSrc, /useVisualActivity/)

const cssSrc = readFileSync(join(dir, '../hooks/useCssShape3dView.ts'), 'utf8')
assert.match(cssSrc, /motionLoopShouldRun/)
assert.match(cssSrc, /useVisualActivity/)

const r3fMotionSrc = readFileSync(join(dir, '../hooks/useR3fShape3dMotion.ts'), 'utf8')
assert.match(r3fMotionSrc, /motionLoopShouldRun/)
assert.match(r3fMotionSrc, /useVisualActivity/)
assert.match(r3fMotionSrc, /resolveR3fFrameloop/)
assert.match(r3fMotionSrc, /frameloop/)

const r3fCanvasSrc = readFileSync(
  join(dir, '../components/r3fShape3d/R3fShape3dCanvas.tsx'),
  'utf8',
)
assert.match(r3fCanvasSrc, /frameloop/)
assert.match(
  r3fCanvasSrc,
  /powerPreference: WEBGL_POWER_PREFERENCE/,
  'Theme R3F shape canvases share the Home GPU hint',
)

const hookSrc = readFileSync(join(dir, '../hooks/useVisualActivity.ts'), 'utf8')
assert.match(
  hookSrc,
  /rootRef\?\.current \?\? nearestThemeScrollRoot\(el\)/,
  'Theme lab hosts must pick the nearest ThemeScroll when rootRef is omitted',
)
assert.match(hookSrc, /checkPainted/)

const themePageSrc = readFileSync(join(dir, '../pages/ThemePage.tsx'), 'utf8')
assert.match(themePageSrc, /IsometricsShowcase/)
assert.match(themePageSrc, /Shape3dShowcase/)

const repoRoot = join(dir, '../../..')
const themeMemoir = readFileSync(
  join(repoRoot, 'project_indexer/front_end/src/pages/ThemePage.md'),
  'utf8',
)
assert.match(
  themeMemoir,
  /visualActivity/,
  'Theme page memoir must note the shared 3D pause path',
)
assert.match(themeMemoir, /3d-shapes/)

const isoShowMemoir = readFileSync(
  join(repoRoot, 'project_indexer/front_end/src/components/IsometricsShowcase.md'),
  'utf8',
)
assert.match(isoShowMemoir, /visualActivity/)

const shapeShowMemoir = readFileSync(
  join(repoRoot, 'project_indexer/front_end/src/components/theme/Shape3dShowcase.md'),
  'utf8',
)
assert.match(shapeShowMemoir, /visualActivity/)

const notFoundSrc = readFileSync(join(dir, '../pages/NotFoundPage.tsx'), 'utf8')
assert.match(
  notFoundSrc,
  /footerSurface/,
  '404 footer peel must pass surface so motion can resume when open',
)

const pageScenesCss = readFileSync(join(dir, '../css/effects/page-scenes.css'), 'utf8')
function homeSceneBox(modifier) {
  const match = pageScenesCss.match(
    new RegExp(`\\.theme \\.page-scene--${modifier} \\{([^}]+)\\}`),
  )
  assert.ok(match, `${modifier} scene box missing`)
  return match[1]
}

const pricingBox = homeSceneBox('home-pricing')
assert.match(pricingBox, /height: auto/)
assert.match(pricingBox, /min-height: 0/)
assert.doesNotMatch(
  pricingBox,
  /100svh/,
  'negative: live pricing must not fill leftover viewport',
)

const tryBox = homeSceneBox('home-try-vurify')
assert.match(tryBox, /height: auto/)
assert.match(tryBox, /min-height: 0/)
assert.doesNotMatch(
  tryBox,
  /100svh/,
  'negative: live reviews must not fill leftover viewport',
)
assert.doesNotMatch(
  pageScenesCss,
  /page-scene--home-try-vurify__layout \{[^}]*minmax\(0, 1fr\)/,
  'negative: leftover 1fr must not sit around the reviews',
)

const offerBox = homeSceneBox('home-what-we-offer')
assert.match(offerBox, /min-height: 0/)
assert.doesNotMatch(
  offerBox,
  /100svh/,
  'negative: offer scene must hug the accordion',
)

assert.match(
  pageScenesCss,
  /page-scene--home-pricing\[data-deferred='slot'\]/,
  'unmounted pricing stub still reserves a viewport',
)
assert.match(
  pageScenesCss,
  /page-scene--home-pricing__layout \{[^}]*grid-template-rows: auto auto/,
)
assert.match(
  pageScenesCss,
  /page-scene--home-pricing__body \{[^}]*justify-content: flex-start/,
)
assert.doesNotMatch(
  pageScenesCss,
  /page-scene--home-pricing__layout \{[^}]*minmax\(0, 1fr\)/,
  'negative: leftover 1fr must not sit between the statement and the table',
)
const takeBox = homeSceneBox('home-try-interview')
assert.match(takeBox, /height: auto/)
assert.match(takeBox, /min-height: 0/)
assert.doesNotMatch(
  takeBox,
  /100svh/,
  'negative: live take-interview must not fill leftover viewport',
)

assert.match(
  pageScenesCss,
  /page-scene--home-try-interview\[data-deferred='slot'\]/,
  'unmounted take-interview stub still reserves a viewport',
)
assert.doesNotMatch(
  pageScenesCss,
  /page-scene--home-try-interview__layout \{[^}]*minmax\(0, 1fr\)/,
  'negative: leftover 1fr must not sit around the take kit',
)
assert.match(
  homeSceneBox('home-more-features'),
  /height: 100svh/,
  'extras card stays one viewport',
)
assert.match(
  pageScenesCss,
  /page-scene--home-more-features__header \{[^}]*align-items: center/,
  'More Vurify features title is centered',
)
assert.doesNotMatch(
  pageScenesCss,
  /page-scene--home-more-features__header \{[^}]*align-items: flex-start/,
  'negative: more-features header must not stay left-aligned',
)
assert.match(
  pageScenesCss,
  /theme-home-try-kit__section-title\.type-display-lg[\s\S]*font-size: clamp\(2\.15rem, 5\.2vw, 3\.5rem\)/,
  'Take a test interview uses the What gets it done title size',
)
assert.match(
  pageScenesCss,
  /page-scene--home-more-features__title\.type-display-lg[\s\S]*font-size: clamp\(2\.15rem, 5\.2vw, 3\.5rem\)/,
)
assert.doesNotMatch(
  pageScenesCss,
  /page-scene--home-try-vurify__title\.type-display-lg[\s\S]{0,80}clamp\(2\.5rem, 5\.2vw, 3\.85rem\)/,
  'negative: What people say must not keep the larger standalone clamp',
)

const moreFeaturesSrc = readFileSync(join(dir, '../pages/HomeMoreFeaturesScene.tsx'), 'utf8')
assert.match(moreFeaturesSrc, /type-display-lg/)
assert.match(moreFeaturesSrc, /theme-page-scroll-type--center/)
assert.doesNotMatch(
  moreFeaturesSrc,
  /type-display-md/,
  'negative: More Vurify features must not stay on display-md',
)

const curtainSceneSrc = readFileSync(join(dir, '../components/CurtainLoadingScene.tsx'), 'utf8')
assert.match(
  curtainSceneSrc,
  /position=\{\[localX, localY \+ V_GAP \/ 2, heroRestZ\]\}/,
  'Curtain V is stacked above % on first paint',
)
assert.match(
  curtainSceneSrc,
  /position=\{\[localX, localY - V_GAP \/ 2, heroRestZ\]\}/,
)
assert.doesNotMatch(
  curtainSceneSrc,
  /<mesh ref=\{vRef\} geometry=\{vGeometry\} material=\{accentMaterial\} \/>/,
  'negative: V must not mount at the default origin on top of the counter',
)

const talkCss = readFileSync(join(dir, '../css/effects/interview-talk-page.css'), 'utf8')
assert.match(
  talkCss,
  /data-talk-live='true'\] \.theme-interview-gate__talk-live \{[^}]*min-height: calc\(100svh/,
  'Talk column fills the remaining viewport so the composer starts at the bottom',
)
assert.doesNotMatch(
  talkCss,
  /data-talk-live='true'\] \.theme-interview-gate__talk-live \{[^}]*min-height: 0/,
  'negative: talk-live must not shrink-wrap in the middle of the page',
)

const webglStageSrc = readFileSync(
  join(dir, './webgl/runtime/core/WebglStage.tsx'),
  'utf8',
)
assert.match(webglStageSrc, /useVisualActivity|useFrameloopGate/)
assert.match(webglStageSrc, /resolveR3fFrameloop|useFrameloopGate/)
assert.match(webglStageSrc, /WEBGL_POWER_PREFERENCE/)
assert.match(webglStageSrc, /frameloop=\{frameloop\}/)
assert.match(webglStageSrc, /webglcontextlost/)
assert.doesNotMatch(
  webglStageSrc,
  /frameloop=["']always["']/,
  'negative: WebglStage must not hard-code always frameloop',
)

const frameloopGateSrc = readFileSync(
  join(dir, './webgl/runtime/core/useFrameloopGate.ts'),
  'utf8',
)
assert.match(frameloopGateSrc, /useVisualActivity/)
assert.match(frameloopGateSrc, /resolveR3fFrameloop/)

const envRigSrc = readFileSync(
  join(dir, './webgl/runtime/lights/EnvironmentRig.tsx'),
  'utf8',
)
assert.match(envRigSrc, /RoomEnvironment/)
assert.match(envRigSrc, /PMREMGenerator/)
assert.doesNotMatch(
  envRigSrc,
  /import\s*\{[^}]*\bEnvironment\b/,
  'negative: EnvironmentRig must not import drei Environment (CDN)',
)

console.log('visualActivity.unit.mjs: ok')
