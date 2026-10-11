/**
 * Independent dots follow the cursor. Links only redraw.
 * Run: npx tsx front_end/src/lib/webgl/runtime/materials/wireElasticity.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three'
import { attachBakedWire, extractWireMesh, WIRE_JAG_FRAC, WIRE_REACH_FRAC, WIRE_SPRING_KEY, wireReachAt } from './wireObject.ts'
import { stepMountedWires, stepSpring, stepWireOffsets, wireDotInfluence, impulseHitFromMark, WIRE_HOVER_HOLD, WIRE_IMPULSE_HOLD, WIRE_SPRING_DAMPING, WIRE_SPRING_STIFFNESS } from './wireElasticity.ts'

assert.ok(WIRE_SPRING_STIFFNESS < 80, 'the swell must follow slowly')
assert.ok(WIRE_SPRING_DAMPING < 22)

const src = fs.readFileSync(fileURLToPath(new URL('./wireElasticity.ts', import.meta.url)), 'utf8')
assert.doesNotMatch(src, /limitWireStrain/, 'negative: links are not a physical net')
assert.doesNotMatch(src, /WIRE_GATHER/, 'negative: dots must not drag other dots')
assert.doesNotMatch(src, /tangentGather/)
assert.doesNotMatch(src, /hit\.nx \* state\.lift/, 'negative: the wave must not yank every dot along one shared pull')
assert.doesNotMatch(src, /stepWireWanderer/, 'negative: the swell is not a crawling probe')
assert.doesNotMatch(src, /state\.pulse/, 'negative: the swell is not a stagnant sin pool')
assert.match(src, /if \(!same\) fillWireField\(state\)/)
assert.match(src, /weight === 0/)
assert.doesNotMatch(src, /else if \(pointer\) \{\s*fillWireField/, 'negative: a held cursor must not rebuild the geodesic')
assert.match(src, /applyWirePose\(group, camera\)/)
assert.doesNotMatch(src, /applyWirePose\(group\)\s*$/m, 'negative: pose must see the camera for frustum culling')

const springSrc = fs.readFileSync(fileURLToPath(new URL('./WireCageSpring.tsx', import.meta.url)), 'utf8')
assert.match(springSrc, /useThree\(\(state\) => state\.camera\)/)
assert.match(springSrc, /stepMountedWires\(scene, hitRef\.current, dt, impulse, camera\)/)

assert.ok(WIRE_REACH_FRAC >= 0.25)
assert.ok(WIRE_JAG_FRAC > 0.2)
assert.notEqual(wireReachAt(0, 0, 0, 1), wireReachAt(0.8, 0.1, 0.4, 1), 'negative: influence must not be a uniform disk')
assert.equal(wireDotInfluence(2, 1), 0, 'negative: outside the wave there is no pull')
assert.equal(wireDotInfluence(0, 1), 1)
assert.ok(wireDotInfluence(0.5, 1) > 0 && wireDotInfluence(0.5, 1) < 1)

let pos = 0
let vel = 0
let peak = 0
for (let i = 0; i < 90; i++) {
  const next = stepSpring(pos, vel, 1, 0.016, WIRE_SPRING_STIFFNESS, WIRE_SPRING_DAMPING)
  pos = next.pos
  vel = next.vel
  if (pos > peak) peak = pos
}
assert.ok(peak < 1.12, `negative: a long ring means the net is too elastic, peak ${peak}`)

pos = peak
vel = 0
for (let i = 0; i < 180; i++) {
  const next = stepSpring(pos, vel, 0, 0.016)
  pos = next.pos
  vel = next.vel
}
assert.ok(Math.abs(pos) < 0.05, `release must settle home, got ${pos}`)

const box = new BoxGeometry(1, 1, 1)
const mat = new MeshStandardMaterial()
const mesh = new Mesh(box, mat)
const before = Array.from(box.getAttribute('position').array)
const root = new Group()
root.add(mesh)
attachBakedWire(root, { assetId: 'builtin-box', meshes: [extractWireMesh(box, '')] })
const cage = mesh.children[0]
const state = cage.userData[WIRE_SPRING_KEY]
assert.ok(state)
let seed = 0
let seedFace = -2
for (let i = 0; i < state.rest.length / 3; i++) {
  const face = state.normals[i * 3 + 1]
  if (face > seedFace) {
    seedFace = face
    seed = i
  }
}
const hit = {
  x: state.rest[seed * 3],
  y: state.rest[seed * 3 + 1],
  z: state.rest[seed * 3 + 2],
  nx: 0,
  ny: 1,
  nz: 0,
}
state.rippleSpeed = 0
state.field.fill(0)
for (let i = 0; i < 70; i++) stepWireOffsets(state, hit, 0.016)
const nx = state.normals[seed * 3]
const ny = state.normals[seed * 3 + 1]
const nz = state.normals[seed * 3 + 2]
const along =
  state.offset[seed * 3] * nx + state.offset[seed * 3 + 1] * ny + state.offset[seed * 3 + 2] * nz
assert.ok(along >= 0, 'negative: a cursor aimed into the solid must not push the cage through it')
assert.ok(along > state.lift * 0.5, 'the hovered dot lifts along the surface, like a wave')

const pair = {
  rest: new Float32Array([0, 0, 0, 0.05, 0, 0]),
  offset: new Float32Array(6),
  vel: new Float32Array(6),
  edges: new Uint32Array([0, 1]),
  normals: new Float32Array([0, 1, 0, 0, 1, 0]),
  lineRadius: 0.001,
  nodeRadius: 0.002,
  reach: 0.2,
  lift: 0.1,
  asleep: false,
  rippleSpeed: 0,
  field: new Float32Array(2),
}
const pairHit = { x: 0, y: 0, z: 0, nx: 0, ny: 1, nz: 0 }
for (let i = 0; i < 70; i++) stepWireOffsets(pair, pairHit, 0.016)
assert.ok(pair.offset[1] > 0.05, 'the dot under the mouse lifts')
assert.ok(pair.offset[4] > 0, 'a nearby independent dot also lifts')
assert.ok(Math.abs(pair.offset[3]) < 0.01, 'negative: dots do not slide toward other dots')
assert.ok(0.05 + pair.offset[3] - pair.offset[0] > 0.04, 'links may stretch; they must not pull dots together')

const slab = {
  rest: new Float32Array([0, 0, 0, 0, 0, 0.03]),
  offset: new Float32Array(6),
  vel: new Float32Array(6),
  edges: new Uint32Array(0),
  normals: new Float32Array([0, 0, 1, 0, 0, -1]),
  lineRadius: 0.001,
  nodeRadius: 0.002,
  reach: 0.4,
  lift: 0.1,
  asleep: false,
  rippleSpeed: 0,
  field: new Float32Array(2),
}
const slabHit = { x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 1 }
for (let i = 0; i < 70; i++) stepWireOffsets(slab, slabHit, 0.016)
assert.ok(slab.offset[2] > 0.05, 'the facing sheet lifts')
assert.ok(Math.abs(slab.offset[5]) < 0.001, 'negative: a close point on the far side of the surface stays put')

state.asleep = false
state.offset[seed * 3] = -nx * 0.2
state.offset[seed * 3 + 1] = -ny * 0.2
state.offset[seed * 3 + 2] = -nz * 0.2
state.vel[seed * 3] = -nx
state.vel[seed * 3 + 1] = -ny
state.vel[seed * 3 + 2] = -nz
stepWireOffsets(state, null, 0.016)
const separated =
  state.offset[seed * 3] * nx + state.offset[seed * 3 + 1] * ny + state.offset[seed * 3 + 2] * nz
assert.ok(separated >= -1e-6, `negative: cage must leave the solid, along ${separated}`)

const far = state.rest.length - 3
const farDist = Math.hypot(state.rest[far] - hit.x, state.rest[far + 1] - hit.y, state.rest[far + 2] - hit.z)
if (farDist > state.reach) {
  assert.ok(Math.abs(state.offset[far]) < 0.001, 'negative: a dot outside the wave stays put')
}
assert.deepEqual(Array.from(box.getAttribute('position').array), before, 'negative: the shaded mesh vertices do not move')

const autoRoot = new Group()
const autoMesh = new Mesh(box, mat)
autoRoot.add(autoMesh)
attachBakedWire(autoRoot, { assetId: 'builtin-box', meshes: [extractWireMesh(box, 'Auto')] })
const autoState = autoMesh.children[0].userData[WIRE_SPRING_KEY]
let idlePeak = 0
for (const value of autoState.field) idlePeak = Math.max(idlePeak, value)
assert.ok(idlePeak > 0.5, 'idle waves write a field without a cursor')
const other = new Mesh(box, mat)
other.name = 'gras-letter'
autoRoot.add(other)
for (let i = 0; i < 5; i++) stepMountedWires(autoRoot, null, 0.016)
const ageIdle = autoState.rippleAge[0]
stepMountedWires(
  autoRoot,
  {
    point: [0, 0.5, 0],
    normal: [0, 1, 0],
    faceIndex: 0,
    objectName: 'gras-letter',
    object: other,
  },
  0.016,
)
assert.equal(autoState.hasFocus, false, 'negative: a hit on another asset must not take the pointer lamp')
assert.notEqual(
  autoState.rippleAge[0],
  ageIdle,
  'negative: a hit on another asset must not freeze this cage',
)
autoRoot.remove(other)
const ageBefore = autoState.rippleAge[0]
let hoverSeed = 0
let hoverFace = -2
for (let i = 0; i < autoState.rest.length / 3; i++) {
  const face = autoState.normals[i * 3 + 1]
  if (face > hoverFace) {
    hoverFace = face
    hoverSeed = i
  }
}
const cursorHit = {
  x: autoState.rest[hoverSeed * 3],
  y: autoState.rest[hoverSeed * 3 + 1],
  z: autoState.rest[hoverSeed * 3 + 2],
  nx: 0,
  ny: 1,
  nz: 0,
}
for (let i = 0; i < 40; i++) stepWireOffsets(autoState, cursorHit, 0.016)
assert.equal(autoState.rippleAge[0], ageBefore, 'negative: a cursor pulse must freeze idle waves')
let cursorField = 0
for (const value of autoState.field) cursorField = Math.max(cursorField, value)
assert.ok(cursorField < 1e-6, 'negative: idle waves must not keep pulsing under the cursor')
const pin = 0
const pinVal = autoState.surfaceDist[pin]
autoState.surfaceDist[pin] = 12345
stepWireOffsets(autoState, cursorHit, 0.016)
assert.equal(autoState.surfaceDist[pin], 12345, 'negative: a still cursor must not rebuild the geodesic')
autoState.surfaceDist[pin] = pinVal
stepWireOffsets(autoState, null, 0.016)
assert.equal(autoState.hasFocus, true, 'a one-frame miss must not drop the pointer lamp')
assert.equal(autoState.rippleAge[0], ageBefore, 'negative: a miss must not spawn a new wave lamp')
let leave = 0
while (autoState.hasFocus && leave < 40) {
  stepWireOffsets(autoState, null, 0.016)
  leave++
}
assert.equal(autoState.hasFocus, false, 'the pointer lamp releases after the hold')
assert.ok(leave * 0.016 > WIRE_HOVER_HOLD * 0.5, 'the hold must last more than a miss')
assert.ok(autoState.rippleAge[0] < 0.05, 'idle waves restart when the cursor leaves')
let again = 0
for (const value of autoState.field) again = Math.max(again, value)
assert.ok(again > 0.2, 'a fresh wave is on the mesh after the cursor leaves')

for (let i = 0; i < 90; i++) stepMountedWires(autoRoot, null, 0.016)
let lifted = 0
for (let i = 0; i < autoState.offset.length; i++) lifted = Math.max(lifted, Math.abs(autoState.offset[i]))
assert.ok(lifted > 1e-4, 'random traveling waves keep the swell alive without a cursor')

autoState.offset.fill(0)
autoState.vel.fill(0)
autoState.field.fill(0)
autoState.rippleAge.fill(99)
autoState.linkAlpha.fill(0)
autoState.nodeAlpha.fill(0)
assert.equal(
  stepMountedWires(autoRoot, null, 0.016),
  true,
  'a releasing lamp must keep the loop awake',
)

const loader = fs.readFileSync(
  fileURLToPath(new URL('../../../../components/webglToolkit/WebglAssetLoader.tsx', import.meta.url)),
  'utf8',
)
assert.match(loader, /WireCageSpring/)
assert.match(loader, /onSurface: onCageSurface/)

assert.ok(WIRE_IMPULSE_HOLD > 1.2, 'the fingertip poke must hold through the high point')
assert.ok(WIRE_IMPULSE_HOLD > WIRE_HOVER_HOLD, 'a boom-peak poke must outlast a raycast gap')
autoMesh.name = 'Object_5'
autoState.offset.fill(0)
autoState.vel.fill(0)
autoState.hasFocus = false
autoState.hoverHold = 0
const poke = impulseHitFromMark(autoRoot, {
  position: [autoState.rest[0], autoState.rest[1], autoState.rest[2]],
  normal: [0, 1, 0],
  objectName: 'Object_5',
})
assert.equal(poke?.object, autoMesh)
for (let i = 0; i < 70; i++) stepMountedWires(autoRoot, null, 0.016, poke)
assert.equal(autoState.hasFocus, true, 'an impulse on the named mesh takes the cage')
assert.ok(Math.abs(autoState.offset[1]) > 0.01 || autoState.offset[0] !== 0 || autoState.offset[2] !== 0)

const stray = new Mesh(box, mat)
stray.name = 'stray'
autoRoot.add(stray)
autoState.offset.fill(0)
autoState.vel.fill(0)
autoState.hasFocus = false
autoState.hoverHold = 0
const miss = impulseHitFromMark(autoRoot, {
  position: [autoState.rest[0], autoState.rest[1], autoState.rest[2]],
  normal: [0, 1, 0],
  objectName: 'stray',
})
stepMountedWires(autoRoot, null, 0.016, miss)
assert.equal(autoState.hasFocus, false, 'negative: an impulse on another mesh must not poke this cage')
autoRoot.remove(stray)

const spring = fs.readFileSync(fileURLToPath(new URL('./WireCageSpring.tsx', import.meta.url)), 'utf8')
assert.match(spring, /peakTicket/)
assert.match(spring, /impulseHitFromMark/)
assert.match(spring, /WIRE_IMPULSE_HOLD/)

const player = fs.readFileSync(
  fileURLToPath(new URL('../../../../components/webglToolkit/WebglScenePlayer.tsx', import.meta.url)),
  'utf8',
)
assert.match(player, /WireCageSpring/)
assert.match(player, /onSurface: onCageSurface/)
assert.match(player, /onPointerMove=\{pick.onPointerMove\}/)
assert.doesNotMatch(
  player,
  /<GrasWordmark[\s\S]{0,400}pick\.onPointerMove/,
  'negative: GRAS hover must not feed the Adam cage spring',
)
assert.doesNotMatch(
  player,
  /<GltfSubject ref=\{modelRef\} url=\{asset.path\} assetId=\{asset.id\} upAxis=\{asset.upAxis\} \/>/,
  'negative: scene objects must receive pointer pick, not a pointerless subject',
)

box.dispose()
mat.dispose()
console.log('wireElasticity: ok')
