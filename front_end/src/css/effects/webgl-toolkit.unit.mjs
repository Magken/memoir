/**
 * Toolkit pages menu + one deferred-mount workbench; Canvas fills leftover.
 * Run: node front_end/src/css/effects/webgl-toolkit.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const dir = path.dirname(fileURLToPath(import.meta.url))
const css = fs.readFileSync(path.join(dir, 'webgl-toolkit.css'), 'utf8')
const page = fs.readFileSync(path.resolve(dir, '../../pages/WglToolkitPage.tsx'), 'utf8')
const loader = fs.readFileSync(
  path.resolve(dir, '../../components/webglToolkit/WebglAssetLoader.tsx'),
  'utf8',
)
const editor = fs.readFileSync(
  path.resolve(dir, '../../components/webglToolkit/WebglSceneEditor.tsx'),
  'utf8',
)
const lcl = fs.readFileSync(
  path.resolve(dir, '../../components/webglToolkit/WebglLclWorkbench.tsx'),
  'utf8',
)

export function stackedViewport(src) {
  return {
    column: /flex-direction:\s*column/.test(src),
    svh: /height:\s*100svh/.test(src) && /min-height:\s*100svh/.test(src),
    vhFallback: /height:\s*100vh/.test(src),
    fill: /theme-webgl-toolkit__stage > div:has\(canvas\)/.test(src) && /inset:\s*0/.test(src),
    pageSvh: /\.theme \.theme-webgl-toolkit \{[^}]*height:\s*100svh/.test(src),
    panelFlex: /theme-webgl-toolkit__panel--open \{[^}]*flex:\s*1/.test(src),
    noTwoCol: !/grid-template-columns:\s*1fr 1fr/.test(src),
  }
}

const layout = stackedViewport(css)
assert.equal(layout.column, true, 'page must stack panels in a column')
assert.equal(layout.svh, true, 'page must be 100svh')
assert.equal(layout.vhFallback, true, 'page must keep a 100vh fallback')
assert.equal(layout.fill, true, 'r3f wrapper must fill the stage')
assert.equal(layout.pageSvh, true, 'the toolkit shell owns the viewport')
assert.equal(layout.panelFlex, true, 'the open workbench fills leftover under the pages menu')
assert.equal(layout.noTwoCol, true, 'must not sit side by side at desktop')
assert.match(css, /inset:\s*0/, 'canvas host must fill the viewport')
assert.match(css, /theme-webgl-toolkit__viewport/, 'open panel needs a flex viewport')
assert.match(lcl, /theme-webgl-toolkit__viewport--lcl/)
assert.match(lcl, /LclViewportSelector/)
assert.doesNotMatch(lcl, /WebglStage/, 'negative: LCL must not mount a Canvas')
{
  const from = css.indexOf('.theme-webgl-toolkit__viewport--lcl {')
  const until = css.indexOf('}', from)
  const lclViewport = from >= 0 && until > from ? css.slice(from, until + 1) : ''
  assert.match(lclViewport, /background: var\(--theme-bg\)/, 'LCL stage is a text surface, not a 3D void')
  assert.doesNotMatch(lclViewport, /#000000/, 'negative: LCL leftover must not stay pitch black')
}

assert.match(loader, /onOpenChange \?/)
assert.match(editor, /onOpenChange \?/)
assert.match(loader, /theme-webgl-toolkit__viewport/)
assert.match(editor, /theme-webgl-toolkit__viewport/)
assert.match(page, /WGL_TOOLKIT_PAGES/)
assert.match(page, /id: 'viewer'/)
assert.match(page, /id: 'editor'/)
assert.match(page, /id: 'lcl'/)
assert.match(page, /label: 'Viewer'/)
assert.match(page, /label: 'Scene editor'/)
assert.match(page, /label: 'LCL'/)
assert.match(page, /MenuButton/)
assert.match(page, /aria-label="Toolkit pages"/)
assert.match(page, /Workbench: WebglAssetLoader/)
assert.match(page, /Workbench: WebglSceneEditor/)
assert.match(page, /Workbench: WebglLclWorkbench/)
assert.doesNotMatch(
  page,
  /label: 'Layered Content Layout'/,
  'negative: the Pages menu label is LCL, not the expanded name',
)
assert.match(page, /useSearchParams/)
assert.match(page, /searchParams.get\('page'\)/)
assert.match(page, />Pages</)
assert.doesNotMatch(
  page,
  /triggerLabelAnim=\{false\}/,
  'negative: pages menu TypeAnim must run when switching Viewer / Scene editor / LCL',
)
assert.match(editor, /WEBGL_SCENES/)
assert.match(editor, /label="Scene"/)
assert.match(editor, /aria-label="Refresh scene"/)
assert.match(editor, /label="Object"/)
assert.match(editor, /label="Camera"/)
assert.match(editor, /label="Grain"/)
assert.match(editor, /SCENE_NOISE_KINDS/)
assert.match(editor, /SceneWorld/)
assert.match(css, /theme-webgl-toolkit__look/)
assert.doesNotMatch(editor, /PrimitiveBox/, 'negative: scene editor must play catalog scenes, not the sample box')
assert.match(page, /data-page=\{pageId\}/)
assert.match(lcl, /LclViewportPreview/)
assert.match(css, /\[data-page='lcl'\] \{[^}]*overflow-y:\s*auto/)
{
  const shell = css.slice(css.indexOf('.theme .theme-webgl-toolkit {'), css.indexOf('.theme .theme-webgl-scene-host'))
  assert.match(shell, /overflow:\s*hidden/, 'Viewer / Scene editor keep a clipped 100svh shell')
  assert.doesNotMatch(shell, /overflow-y:\s*auto/, 'negative: the base toolkit must not scroll')
}
assert.match(page, /<Workbench key=\{pageId\} open/)
assert.doesNotMatch(page, /setAssetOpen/, 'negative: both workbenches must not stay stacked')
assert.doesNotMatch(page, /<WebglAssetLoader open=\{assetOpen\}/)
assert.doesNotMatch(
  page,
  /<Workbench[\s\S]*open[\s\S]*\/>[\s\S]*<Workbench[\s\S]*open/,
  'negative: only the selected workbench mounts',
)
assert.match(css, /theme-webgl-toolkit__nav/)
assert.match(css, /theme-webgl-scene-host/)
{
  const host = css.slice(css.indexOf('.theme-webgl-scene-host'), css.indexOf('.theme-webgl-toolkit__nav'))
  assert.match(host, /background: #000000/, 'landing host is a pitch-black void')
  assert.doesNotMatch(host, /#050508/, 'negative: landing host must not keep a lifted navy')
}
{
  const viewport = css.slice(
    css.indexOf('.theme-webgl-toolkit__viewport {'),
    css.indexOf('.theme-webgl-toolkit__stage'),
  )
  assert.match(viewport, /background: #000000/, 'scene editor leftover around the canvas is pitch black')
  assert.doesNotMatch(viewport, /#111318/, 'negative: editor viewport must not keep charcoal around the canvas')
}

assert.match(css, /theme-webgl-toolkit__titlebar/, 'editor-density titlebar')
assert.match(css, /theme-webgl-toolkit__ribbon/, 'single-row ribbon')
assert.match(loader, /label="Model"/)
assert.match(loader, /label="View"/)
assert.match(loader, /label="Place"/)
assert.match(loader, /id: 'select'/)
assert.match(loader, /MousePointer2/)
assert.match(loader, /iconDropdown/)
assert.match(loader, /onHover/)
assert.match(loader, /cursorHit/)
assert.match(loader, /pick\.onPointerMove/)
assert.match(loader, /onDrawDrag/)
assert.match(loader, /\[showLabels, setShowLabels\] = useState\(true\)/)
assert.match(loader, /left press-drag a freehand loop/)
assert.match(loader, /showLabels/)
assert.match(loader, /showPoints/)
assert.match(css, /theme-webgl-toolkit__mark-label/)
assert.match(css, /theme-webgl-toolkit__mark-label-wrap/)
assert.match(css, /theme-webgl-toolkit__mark-label--pick/)
assert.match(css, /pointer-events:\s*none !important/)
assert.doesNotMatch(
  css,
  /theme-webgl-toolkit__mark-label-wrap \{[^}]*pointer-events:\s*auto/,
  'negative: the Html wrap must not eat the viewport',
)
assert.match(css, /theme-webgl-toolkit__stage > div:has\(canvas\)/)
assert.match(css, /theme-webgl-toolkit__stage > div:not\(:has\(canvas\)\)/)
assert.doesNotMatch(
  css,
  /theme-webgl-toolkit__stage > div,/,
  'negative: a blanket stage > div fill stretches Html tags across the viewport',
)
assert.match(css, /font-size:\s*0\.6875rem/)
assert.doesNotMatch(css, /font-size:\s*0\.5rem/, 'negative: mark names must not stay at 0.5rem')
assert.doesNotMatch(loader, /Hold E/)
assert.doesNotMatch(loader, /KeyE/)
assert.doesNotMatch(loader, /rootRef/, 'negative: canvas camera pick root must not replace mesh hover')
assert.doesNotMatch(loader, /isNearPoint\(lifted/, 'negative: live stroke must not snap-close on a wide gap')
assert.match(loader, /simplifyStroke/)
assert.match(loader, /from '\.\.\/Slider'/)
assert.match(loader, /regionPoly/)
assert.match(loader, /poly=\{regionPoly\}/)
assert.match(loader, /aria-label="Model poly"/)
assert.match(loader, /aria-label="Light intensity"/)
assert.match(loader, /setLightGain/)
assert.match(loader, /useState\(0\.05\)/)
assert.match(loader, /showValue/)
assert.match(loader, /aria-label="Ceramic scatter"/)
assert.match(loader, /setScatter/)
assert.match(loader, /useState\(1\.5\)/)
assert.match(loader, /aria-label="Mesh color"/)
assert.match(loader, /aria-label="Object color"/)
assert.match(loader, /lightColor, meshColor, lightGain, scatter/)
assert.doesNotMatch(loader, /aria-label="Light color"/, 'negative: lamp tint is Object color, not a second mesh glaze')
assert.doesNotMatch(loader, /aria-label="Region poly"/, 'negative: Poly must not be a selected-region control')
assert.doesNotMatch(
  loader,
  /mark\.id === viewId && mark\.kind === 'region'/,
  'negative: Poly must not write onto the selected region mark',
)
assert.match(css, /theme-webgl-toolkit__poly/)
assert.match(loader, /deletable: true/)
assert.match(loader, /onDelete=\{deleteMark\}/)
{
  const from = loader.indexOf('const deleteMark')
  const until = loader.indexOf('function onLabelChange')
  const del = from >= 0 && until > from ? loader.slice(from, until) : ''
  assert.match(del, /setMarks/, 'deleteMark must remove the mark')
  assert.doesNotMatch(del, /homeViewPose/, 'negative: deleting a mark must not fly the camera Home')
}
assert.match(loader, /homeViewPose\(marks\)/)
assert.match(loader, /homeViewPose\(loaded\.marks\)/)
assert.match(loader, /orbitFromPose/)
assert.match(loader, /modelRef/)
assert.match(loader, /function copySession/)
assert.match(loader, /liveViewPose/)
assert.match(loader, /poseFromLiveOrbit/)
assert.match(loader, /orbitHandleRef/)
assert.match(loader, /onClick=\{\(\) => copySession\(\)\}/)
assert.doesNotMatch(
  loader,
  /const sessionJson = serializeSessionPayload/,
  'negative: a render-time snapshot is the Home pose after an orbit',
)
assert.doesNotMatch(
  loader,
  /const live = poseRef\.current/,
  'negative: Copy must not serialize the last React render’s Home pose',
)
assert.match(loader, /annotations: marks/)
assert.doesNotMatch(
  loader,
  /annotations: stampLiveViewpoint/,
  'negative: Copy must not overwrite a stored viewpoint with the live camera',
)
assert.match(loader, /id === VIEW_HOME_MARK_ID \? VIEW_HOME_ID/)
assert.match(loader, /kind: 'viewpoint', heading: 'Viewpoints'/)
assert.match(loader, /ViewpointFly/)
assert.doesNotMatch(loader, /function ViewpointFly/, 'negative: the fly lives in ViewpointFly.tsx, not inlined in the loader')
assert.doesNotMatch(
  loader,
  /id === VIEW_HOME_ID\) \{\s*setFlyPose\(homeViewPose\(\)\)/,
  'negative: Home must use the baked viewpoint-home, not WEBGL_SPACE',
)
assert.match(loader, /kind === 'volume'/)
assert.match(loader, /VolumetricCloud/)
assert.match(loader, /kind === 'text'/)
assert.match(loader, /GrasWordmark/)
assert.match(loader, /AboutUsWordmark/)
assert.match(loader, /ProjectsWordmark/)
assert.match(loader, /assetId === 'about-us-letters'/)
assert.match(loader, /kind === 'text' && assetId === 'about-us-letters'/)
assert.match(loader, /assetId === 'projects-letters'/)
assert.match(loader, /kind === 'text' && assetId === 'projects-letters'/)
assert.match(loader, /grasLetterLayout/)
assert.match(loader, /GRAS_LIGHT_GAIN_MAX/)
assert.doesNotMatch(
  loader,
  /assetId === 'about-us-letters'[\s\S]{0,120}<GrasWordmark/,
  'negative: About Us must not mount GrasWordmark',
)
assert.doesNotMatch(
  loader,
  /text\/GrasLetters['"]/,
  'negative: GrasLetters.ts is a stale Vite URL and has no GrasWordmark export',
)
assert.doesNotMatch(
  loader,
  /text\/AboutUs['"]/,
  'negative: AboutUs.ts is a stale Vite URL and has no AboutUsWordmark export',
)
assert.doesNotMatch(
  loader,
  /text\/Projects['"]/,
  'negative: Projects.ts is a stale Vite URL and has no ProjectsWordmark export',
)
assert.doesNotMatch(
  loader,
  /\{url \? \(/,
  'negative: missing url must not be the only branch for a volume asset',
)
assert.match(loader, /position=\{openingPose\.position\}/)
assert.match(loader, /target=\{openingPose\.target\}/)
assert.match(loader, /cameraPosition=\{openingPose\.position\}/)
assert.match(loader, /setFlyTicket/)
assert.doesNotMatch(loader, /lastKey/, 'negative: a poseKey stamp skips Home until back-of-scene is clicked first')
assert.match(loader, /lookAt=\{openingPose\.target\}/)
assert.doesNotMatch(loader, /<OrbitRig enabled=\{orbitEnabled\} \/>/, 'negative: orbit must not boot on the cube look-at')
assert.doesNotMatch(
  loader,
  /id: VIEW_HOME_ID, label: 'Home', deletable/,
  'negative: Home must not carry a bin',
)
assert.doesNotMatch(loader, /from '\.\.\/Select'/)
assert.doesNotMatch(loader, /from '\.\.\/Field'/)
assert.match(css, /theme-webgl-toolkit__ribbon-col/)
assert.match(css, /theme-webgl-toolkit__lcl-layouts/)
assert.match(lcl, /theme-webgl-toolkit__lcl-layouts/)
assert.doesNotMatch(lcl, /LayoutGrid/, 'negative: LayoutGrid stays on the Pages menu')
assert.doesNotMatch(page, /id: 'ledger'/, 'negative: Pages items stay Viewer / Scene editor / LCL / Logo')
assert.doesNotMatch(page, /lclLayoutMenuDetail/, 'negative: the Pages menu does not list LCL layouts')
{
  const titlebar = lcl.match(/<header className="theme-webgl-toolkit__titlebar">[\s\S]*?<\/header>/)
  assert.ok(titlebar)
  assert.doesNotMatch(titlebar[0], /MenuButton/, 'negative: LCL layout picker is not in the constructor titlebar')
}
{
  const selectorAt = lcl.indexOf('<LclViewportSelector')
  const layoutsAt = lcl.indexOf('theme-webgl-toolkit__lcl-layouts')
  const previewAt = lcl.indexOf('<Preview')
  assert.ok(
    selectorAt >= 0 && layoutsAt > selectorAt && previewAt > layoutsAt,
    'layout picker sits above the LCL preview',
  )
}
const noLayouts = css.replace(/theme-webgl-toolkit__lcl-layouts/g, 'theme-webgl-toolkit__lcl-opts')
assert.equal(
  /theme-webgl-toolkit__lcl-layouts/.test(noLayouts),
  false,
  'negative: dropping lcl-layouts must fail',
)

export function ribbonInnerDirection(src) {
  const block = src.match(/\.theme \.theme-webgl-toolkit__ribbon-inner \{([^}]+)\}/)
  const dir = block?.[1].match(/flex-direction:\s*(row|column)/)
  return dir?.[1] ?? null
}

assert.equal(ribbonInnerDirection(css), 'row', 'ribbon clusters must sit in a row')
const innerCol = css.replace(
  /(\.theme \.theme-webgl-toolkit__ribbon-inner \{[^}]*?)flex-direction:\s*row/,
  '$1flex-direction: column',
)
assert.equal(ribbonInnerDirection(innerCol), 'column', 'negative: a column ribbon-inner must fail')

export function ribbonInnerAlign(src) {
  const block = src.match(/\.theme \.theme-webgl-toolkit__ribbon-inner \{([^}]+)\}/)
  const align = block?.[1].match(/align-items:\s*(center|flex-end|flex-start)/)
  return align?.[1] ?? null
}

assert.equal(ribbonInnerAlign(css), 'center', 'ribbon controls must share DrawCanvas vertical center')
const innerEnd = css.replace(
  /(\.theme \.theme-webgl-toolkit__ribbon-inner \{[^}]*?)align-items:\s*center/,
  '$1align-items: flex-end',
)
assert.equal(ribbonInnerAlign(innerEnd), 'flex-end', 'negative: flex-end ribbon-inner must fail')

const fatHead = css.replace(/theme-webgl-toolkit__titlebar/g, 'theme-webgl-toolkit__head')
assert.equal(/theme-webgl-toolkit__titlebar/.test(fatHead), false, 'negative: dropping titlebar must fail')

const twoCol = `${css}\n.theme .theme-webgl-toolkit { grid-template-columns: 1fr 1fr; }\n`
assert.equal(stackedViewport(twoCol).noTwoCol, false, 'negative: a two-column desktop grid must fail')

const row = css.replace(/flex-direction:\s*column/g, 'flex-direction: row')
assert.equal(stackedViewport(row).column, false, 'negative: a row layout must fail')

console.log('webgl-toolkit layout: ok')
