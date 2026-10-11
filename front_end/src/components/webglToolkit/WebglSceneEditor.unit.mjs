/**
 * Scene editor picks a catalog scene and plays it in the existing Canvas.
 * Run: node front_end/src/components/webglToolkit/WebglSceneEditor.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = fs.readFileSync(fileURLToPath(new URL('./WebglSceneEditor.tsx', import.meta.url)), 'utf8')

assert.match(src, /WEBGL_SCENES/)
assert.match(src, /bakedSceneDoc/)
assert.match(src, /label="Scene"/)
assert.match(src, /RefreshCw/)
assert.match(src, /aria-label="Refresh scene"/)
assert.match(src, /requestFullscreen/)
assert.match(src, /aria-label=\{fullscreen \? 'Leave full screen' : 'Full screen'\}/)
assert.match(src, /theme-webgl-toolkit__panel--fullscreen/)
assert.match(src, /refreshScene/)
assert.match(src, /setSceneTicket/)
assert.match(src, /key=\{`\$\{sceneId\}:\$\{sceneTicket\}`\}/)
assert.doesNotMatch(
  src,
  /location\.reload/,
  'negative: Refresh remounts SceneWorld from the bake, it does not reload the page',
)
assert.doesNotMatch(
  src,
  /key=\{sceneId\}/,
  'negative: sceneId alone cannot remount the same scene after a hop',
)
assert.match(src, /<SceneWorld/)
assert.match(src, /label="View"/)
assert.match(src, /label="Play"/)
assert.match(src, /playMotion/)
assert.match(src, /replayMotion/)
assert.match(src, /cameraMotions/)
assert.match(src, /showViews/)
assert.match(src, /flyTicket/)
assert.match(src, /sceneViewpointMarks/)
assert.match(src, /label="Camera"/)
assert.match(src, /SCENE_LOOK_FOCUS_MAX/)
assert.match(src, /SCENE_LOOK_FOCAL_LENGTH_MAX/)
assert.match(src, /\['cursor', 'Pointer'\]/)
assert.match(src, /showCursor=\{toggles.cursor\}/)
assert.match(src, /cursor: false/)
assert.match(src, /label="Grain"/)
assert.match(src, /label="ACM"/)
assert.match(src, /SCENE_ACM_INTENSITY_MAX/)
assert.match(src, /acm=\{acm\}/)
assert.match(src, /setAcm\(\{ \.\.\.acm, intensity: value \}\)/)
assert.match(src, />\s*Lock\s*</)
assert.match(src, /easing in after a hop/)
assert.doesNotMatch(
  src,
  /no ambient motion/,
  'negative: lock off must not kill ACM on the real page',
)
assert.match(src, /setAcm\(\{ \.\.\.acm, lock: event\.target\.checked \}\)/)
assert.doesNotMatch(
  src,
  /setAcm\(\{ intensity: value \}\)/,
  'negative: intensity-only setAcm would drop camera.acm.lock',
)
assert.match(src, /SCENE_NOISE_KINDS/)
assert.match(src, /look=\{look\}/)
assert.match(src, /CameraLookRig|lookNeedsComposer/)
assert.doesNotMatch(src, /<WebglScenePlayer/, 'negative: do not nest a second Canvas via the player wrapper')
assert.match(src, /serializeSceneSession/)
assert.match(src, /liveViewPose/)
assert.match(src, /poseRef=\{poseRef\}/)
assert.match(src, /Copy session/)
assert.match(src, /label="Path"/)
assert.match(src, /Capture camera/)
assert.match(src, /Copy path/)
assert.match(src, /Clear path/)
assert.match(src, /serializeCameraPath/)
assert.match(src, /CAMERA_PATH_KIND/)
assert.match(src, /setPathStills\(\[\]\)/)
assert.doesNotMatch(
  src,
  /kind: CAMERA_PATH_KIND[\s\S]{0,80}assetId/,
  'negative: scene Path copy names the scene, not an asset',
)
assert.doesNotMatch(
  src,
  /kind: 'webgl-scene-session'[\s\S]{0,80}stills/,
  'negative: Path copy must not dump a full scene session',
)
assert.match(src, /label="Ref"/)
assert.match(src, /label="Object"/)
assert.match(src, /Copy object/)
assert.match(src, /serializeSceneObjectPose/)
assert.match(src, /selectedObjectId=\{objectId\}/)
assert.match(src, /objectEdits=\{objectEdits\}/)
assert.doesNotMatch(
  src,
  /onSelect=\{setAssetId\}/,
  'negative: scene objects are picked from the baked scene, not the model-viewer asset list',
)
assert.match(src, /serializeReferencePointer/)
assert.match(src, /referencePointerHome/)
assert.match(src, /<ReferencePointer/)
assert.match(src, /orbitEnabled=\{!locatorDragging && !objectDragging\}/)
assert.doesNotMatch(
  src,
  /orbitEnabled=\{!locatorDragging\}/,
  'negative: object drag must freeze orbit the same way the Ref pointer does',
)
assert.match(src, /tag="scene"/)
assert.match(src, /serializeReferencePointer\(\{ position: locatorPos, rotation: locatorRot \}, 'scene'\)/)
assert.doesNotMatch(
  src,
  /JSON\.stringify\(\{ sceneId, look, featureIds \}/,
  'negative: Copy must not write look sliders without the live camera',
)
assert.doesNotMatch(
  src,
  /from '\.\.\/\.\.\/lib\/webgl\/runtime\/helpers\/referencePointer'/,
  'negative: a helpers/referencePointer.ts sibling steals ReferencePointer.tsx on Windows',
)
assert.doesNotMatch(src, /setLocatorTag/, 'negative: the scene editor tag is always scene, not a scene/item toggle')

console.log('WebglSceneEditor: ok')
