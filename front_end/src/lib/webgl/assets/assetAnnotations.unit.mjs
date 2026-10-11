/**
 * Asset annotation schema.
 * Run: npx tsx front_end/src/lib/webgl/assets/assetAnnotations.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  emptyAnnotationDoc,
  parseAssetAnnotationDoc,
  parseSessionPayload,
  serializeAssetAnnotationDoc,
  serializeHitPayload,
  serializeModelPoint,
  MODEL_POINT_KIND,
} from './assetAnnotations.ts'

const doc = emptyAnnotationDoc('builtin-box')
doc.annotations.push({
  id: 'front-1',
  kind: 'front',
  label: 'Front',
  position: [0, 0, 1],
  normal: [0, 0, 1],
})
const round = parseAssetAnnotationDoc(JSON.parse(serializeAssetAnnotationDoc(doc)))
assert.ok(!('error' in round), `round-trip should parse, got ${JSON.stringify(round)}`)
if (!('error' in round)) {
  assert.equal(round.annotations[0].kind, 'front')
  assert.deepEqual(round.annotations[0].position, [0, 0, 1])
}

const regionDoc = parseAssetAnnotationDoc({
  assetId: 'the-creation-of-adam',
  units: 'm',
  upAxis: 'y',
  notes: 'fingernail region',
  annotations: [
    {
      id: 'region-1',
      kind: 'region',
      label: 'Adam fingernail',
      position: [0.1, 0.8, 0.2],
      radius: 0.04,
      color: '#c45c4a',
      poly: 6,
      ring: [
        [0.08, 0.8, 0.2],
        [0.12, 0.8, 0.2],
        [0.1, 0.82, 0.2],
      ],
    },
    {
      id: 'view-1',
      kind: 'viewpoint',
      label: 'Fingers',
      position: [0, 0.7, 0],
      camera: [1, 1.2, 1.4],
      target: [0, 0.7, 0],
    },
  ],
})
assert.ok(!('error' in regionDoc), `region doc should parse, got ${JSON.stringify(regionDoc)}`)
if (!('error' in regionDoc)) {
  assert.equal(regionDoc.notes, 'fingernail region')
  assert.equal(regionDoc.annotations[0].kind, 'region')
  assert.equal(regionDoc.annotations[0].color, '#c45c4a')
  assert.equal(regionDoc.annotations[0].poly, 6)
  assert.equal(regionDoc.annotations[0].ring?.length, 3)
  assert.equal(regionDoc.annotations[1].kind, 'viewpoint')
}

const orbitDoc = parseAssetAnnotationDoc({
  assetId: 'the-creation-of-adam',
  units: 'm',
  upAxis: 'y',
  annotations: [
    {
      id: 'viewpoint-back-of-scene',
      kind: 'viewpoint',
      label: 'back of scene',
      position: [0, 0.3, 0],
      camera: [0.65, 0.21, 0.11],
      target: [0.07, 0.31, 0],
      orbit: { azimuth: 1.384, polar: 1.745, radius: 0.597 },
      up: [0, 1, 0],
    },
  ],
})
assert.ok(!('error' in orbitDoc), `orbit viewpoint should parse, got ${JSON.stringify(orbitDoc)}`)
if (!('error' in orbitDoc)) {
  assert.equal(orbitDoc.annotations[0].orbit?.azimuth, 1.384)
}

const badOrbit = parseAssetAnnotationDoc({
  assetId: 'x',
  units: 'm',
  upAxis: 'y',
  annotations: [
    {
      id: 'v',
      kind: 'viewpoint',
      label: 'x',
      position: [0, 0, 0],
      orbit: { azimuth: 0, polar: 1, radius: 0 },
    },
  ],
})
assert.ok('error' in badOrbit, 'negative: orbit radius 0 must fail')

const bad = parseAssetAnnotationDoc({
  assetId: 'x',
  units: 'm',
  upAxis: 'y',
  annotations: [{ id: 'a', kind: 'nope', label: 'x', position: [0, 0, 0] }],
})
assert.ok('error' in bad, 'negative: unknown kind must fail')
assert.match(bad.error, /unknown annotation kind/)

const badColor = parseAssetAnnotationDoc({
  assetId: 'x',
  units: 'm',
  upAxis: 'y',
  annotations: [{ id: 'a', kind: 'color', label: 'x', position: [0, 0, 0], color: 'red' }],
})
assert.ok('error' in badColor, 'negative: non-hex color must fail')
assert.match(badColor.error, /color must be a #hex/)

const badPoly = parseAssetAnnotationDoc({
  assetId: 'x',
  units: 'm',
  upAxis: 'y',
  annotations: [{ id: 'a', kind: 'region', label: 'x', position: [0, 0, 0], poly: 0 }],
})
assert.ok('error' in badPoly, 'negative: poly 0 must fail')
assert.match(badPoly.error, /poly must be an integer 1–8/)

const payload = serializeHitPayload({
  assetId: 'the-creation-of-adam',
  tool: 'highlight',
  label: 'fingernail',
  point: [0.1, 0.8, 0.2],
  normal: [0, 1, 0],
  faceIndex: 12,
  objectName: 'AdamHand',
  color: '#c45c4a',
})
assert.match(payload, /"tool": "highlight"/)

const session = parseSessionPayload({
  kind: 'webgl-model-session',
  assetId: 'the-creation-of-adam',
  camera: { position: [2.4, 1.6, 3.2], target: [0, 0.5, 0] },
  view: { wireframe: false, shadows: true, helpers: false, cameraGizmos: false },
  annotations: [],
  selectedId: null,
})
assert.ok(!('error' in session), `session should parse, got ${JSON.stringify(session)}`)
if (!('error' in session)) {
  assert.equal(session.kind, 'webgl-model-session')
  assert.deepEqual(session.camera.position, [2.4, 1.6, 3.2])
}

const sessionOrbit = parseSessionPayload({
  kind: 'webgl-model-session',
  assetId: 'the-creation-of-adam',
  camera: {
    position: [0.65, 0.21, 0.11],
    target: [0.07, 0.31, 0],
    orbit: { azimuth: 1.384, polar: 1.745, radius: 0.597 },
    up: [0, 1, 0],
    quaternion: [0, 0, 0, 1],
  },
  view: { wireframe: false, shadows: false, helpers: false, cameraGizmos: false },
  annotations: [],
  selectedId: 'viewpoint-back-of-scene',
  model: {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    quaternion: [0, 0, 0, 1],
    scale: [1, 1, 1],
  },
})
assert.ok(!('error' in sessionOrbit), `orbit session should parse, got ${JSON.stringify(sessionOrbit)}`)
if (!('error' in sessionOrbit)) {
  assert.equal(sessionOrbit.camera.orbit?.azimuth, 1.384)
  assert.deepEqual(sessionOrbit.model?.quaternion, [0, 0, 0, 1])
}

const sessionHidden = parseSessionPayload({
  kind: 'webgl-model-session',
  assetId: 'the-creation-of-adam',
  camera: { position: [2.4, 1.6, 3.2], target: [0, 0.5, 0] },
  view: {
    wireframe: false,
    shadows: true,
    helpers: false,
    cameraGizmos: false,
    showPoints: false,
    showLabels: false,
  },
  annotations: [],
  selectedId: null,
})
assert.ok(!('error' in sessionHidden), `hidden-mark flags should parse, got ${JSON.stringify(sessionHidden)}`)
if (!('error' in sessionHidden)) {
  assert.equal(sessionHidden.view.showLabels, false)
}

const sessionPoly = parseSessionPayload({
  kind: 'webgl-model-session',
  assetId: 'the-creation-of-adam',
  camera: { position: [2.4, 1.6, 3.2], target: [0, 0.5, 0] },
  view: {
    wireframe: false,
    shadows: true,
    helpers: false,
    cameraGizmos: false,
    regionPoly: 7,
  },
  annotations: [],
  selectedId: null,
})
assert.ok(!('error' in sessionPoly), `regionPoly should parse, got ${JSON.stringify(sessionPoly)}`)
if (!('error' in sessionPoly)) {
  assert.equal(sessionPoly.view.regionPoly, 7)
}

const sessionLights = parseSessionPayload({
  kind: 'webgl-model-session',
  assetId: 'the-creation-of-adam',
  camera: { position: [2.4, 1.6, 3.2], target: [0, 0.5, 0] },
  view: {
    wireframe: false,
    shadows: true,
    helpers: false,
    cameraGizmos: false,
    lightColor: '#f2c48a',
    meshColor: '#ff3333',
    lightGain: 0.2,
    scatter: 2,
  },
  annotations: [],
  selectedId: null,
})
assert.ok(!('error' in sessionLights), `light session fields should parse, got ${JSON.stringify(sessionLights)}`)
if (!('error' in sessionLights)) {
  assert.equal(sessionLights.view.lightColor, '#f2c48a')
  assert.equal(sessionLights.view.meshColor, '#ff3333')
  assert.equal(sessionLights.view.lightGain, 0.2)
  assert.equal(sessionLights.view.scatter, 2)
}

const badLights = parseSessionPayload({
  kind: 'webgl-model-session',
  assetId: 'the-creation-of-adam',
  camera: { position: [2.4, 1.6, 3.2], target: [0, 0.5, 0] },
  view: {
    wireframe: false,
    shadows: true,
    helpers: false,
    cameraGizmos: false,
    lightGain: -1,
  },
  annotations: [],
  selectedId: null,
})
assert.ok('error' in badLights, 'negative: lightGain below 0 must fail')

const badSession = parseSessionPayload({
  assetId: 'x',
  camera: { position: [0, 0, 0], target: [0, 0, 0] },
  view: { wireframe: false, shadows: true, helpers: false, cameraGizmos: false },
  annotations: [],
  selectedId: null,
})
assert.ok('error' in badSession, 'negative: missing kind must fail')
assert.match(badSession.error, /kind must be webgl-model-session/)

const impulseDoc = parseAssetAnnotationDoc({
  assetId: 'the-creation-of-adam',
  units: 'm',
  upAxis: 'y',
  annotations: [
    {
      id: 'point-finger-tip',
      kind: 'point',
      label: 'finger tip',
      position: [0.02, 0.34, -0.03],
      impulse: true,
    },
  ],
})
assert.ok(!('error' in impulseDoc))
if (!('error' in impulseDoc)) {
  assert.equal(impulseDoc.annotations[0].impulse, true)
}

const badImpulse = parseAssetAnnotationDoc({
  assetId: 'x',
  units: 'm',
  upAxis: 'y',
  annotations: [{ id: 'a', kind: 'point', label: 'x', position: [0, 0, 0], impulse: 'yes' }],
})
assert.ok('error' in badImpulse, 'negative: impulse must be a boolean')

const pointJson = serializeModelPoint({
  kind: MODEL_POINT_KIND,
  assetId: 'the-creation-of-adam',
  annotation: {
    id: 'point-finger-tip',
    kind: 'point',
    label: 'finger tip',
    position: [0.02, 0.34, -0.03],
    impulse: true,
  },
})
assert.match(pointJson, /webgl-model-point/)
assert.doesNotMatch(pointJson, /webgl-model-session/)

console.log('assetAnnotations: ok')
