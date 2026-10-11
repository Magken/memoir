/**
 * Camera path payload: captured stills for sampleBoomArc.
 * Run: npx tsx front_end/src/lib/webgl/runtime/controls/cameraPath.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  CAMERA_PATH_KIND,
  parseCameraPath,
  serializeCameraPath,
  stillFromViewPose,
} from './cameraPath.ts'
import { orbitFromPose } from './cameraJourney.ts'

const pose = {
  position: [-0.27, 0.66, 0.34],
  target: [0.07, 0.31, 0],
  orbit: { azimuth: -0.79, polar: 0.94, radius: 0.6 },
  up: [0, 1, 0],
}
const still = stillFromViewPose(pose)
assert.deepEqual(still.target, pose.target)
assert.equal(still.orbit.azimuth, -0.79)
assert.equal(still.orbit.radius, 0.6)

const payload = {
  kind: CAMERA_PATH_KIND,
  assetId: 'the-creation-of-adam',
  stills: [
    stillFromViewPose({
      position: [0.46, 0.01, 0.06],
      target: [0.05, 0.28, 0],
      orbit: { azimuth: 1.42, polar: 2.15, radius: 0.5 },
    }),
    still,
    stillFromViewPose({
      position: [-0.51, 0.21, -0.11],
      target: [0.07, 0.31, 0],
      orbit: { azimuth: -1.76, polar: 1.75, radius: 0.6 },
    }),
  ],
}
const json = serializeCameraPath(payload)
assert.match(json, /webgl-camera-path/)
const parsed = parseCameraPath(JSON.parse(json))
assert.ok(!('error' in parsed), `round-trip should parse, got ${JSON.stringify(parsed)}`)
if (!('error' in parsed)) {
  assert.equal(parsed.stills.length, 3)
  assert.equal(parsed.stills[0].orbit.azimuth, 1.42)
  assert.equal(parsed.assetId, 'the-creation-of-adam')
}

const scenePayload = {
  kind: CAMERA_PATH_KIND,
  sceneId: 'about',
  stills: payload.stills,
}
const sceneJson = serializeCameraPath(scenePayload)
assert.match(sceneJson, /"sceneId": "about"/)
assert.doesNotMatch(sceneJson, /"assetId"/, 'negative: a scene path must not pretend to be an asset')
const sceneParsed = parseCameraPath(JSON.parse(sceneJson))
assert.ok(!('error' in sceneParsed), `scene path should parse, got ${JSON.stringify(sceneParsed)}`)
if (!('error' in sceneParsed)) {
  assert.equal(sceneParsed.sceneId, 'about')
  assert.equal(sceneParsed.assetId, undefined)
}

const noOwner = parseCameraPath({ kind: CAMERA_PATH_KIND, stills: payload.stills })
assert.ok('error' in noOwner, 'negative: a path must name an asset or a scene')
assert.match(noOwner.error, /assetId or sceneId/)

const derived = parseCameraPath({
  kind: CAMERA_PATH_KIND,
  assetId: 'the-creation-of-adam',
  stills: [
    { position: [0, 0, 1], target: [0, 0, 0] },
    { position: [1, 0, 0], target: [0, 0, 0] },
  ],
})
assert.ok(!('error' in derived))
if (!('error' in derived)) {
  const orbit = orbitFromPose({ position: [0, 0, 1], target: [0, 0, 0] })
  assert.equal(derived.stills[0].orbit.radius, orbit.radius)
}

const tooFew = parseCameraPath({ kind: CAMERA_PATH_KIND, assetId: 'x', stills: [still] })
assert.ok('error' in tooFew, 'negative: one capture is not a path')
assert.match(tooFew.error, /at least two/)

const badKind = parseCameraPath({ kind: 'webgl-model-session', assetId: 'x', stills: [still, still] })
assert.ok('error' in badKind, 'negative: a full session is not a camera path')

const loader = fs.readFileSync(
  fileURLToPath(new URL('../../../../components/webglToolkit/WebglAssetLoader.tsx', import.meta.url)),
  'utf8',
)
assert.match(loader, /label="Path"/)
assert.match(loader, /Capture camera/)
assert.match(loader, /Copy path/)
assert.match(loader, /Clear path/)
assert.match(loader, /Copy point/)
assert.match(loader, /serializeCameraPath/)
assert.match(loader, /serializeModelPoint/)
assert.doesNotMatch(
  loader,
  /kind: MODEL_SESSION_KIND[\s\S]{0,200}stills/,
  'negative: Path copy must not dump a full model session',
)

const editor = fs.readFileSync(
  fileURLToPath(new URL('../../../../components/webglToolkit/WebglSceneEditor.tsx', import.meta.url)),
  'utf8',
)
assert.match(editor, /label="Path"/)
assert.match(editor, /Capture camera/)
assert.match(editor, /Copy path/)
assert.match(editor, /Clear path/)
assert.match(editor, /serializeCameraPath/)
assert.match(editor, /sceneId,/)
assert.doesNotMatch(editor, /assetId:/, 'negative: scene Path copy names sceneId, not an asset')
assert.doesNotMatch(
  editor,
  /kind: 'webgl-scene-session'[\s\S]{0,120}stills/,
  'negative: Path copy must not dump a full scene session',
)

console.log('cameraPath: ok')
