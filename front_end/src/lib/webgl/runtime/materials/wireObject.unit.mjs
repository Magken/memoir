/**
 * Unique edges + joint nodes from a mesh. Cube: 8 nodes, 18 edges.
 * Run: npx tsx front_end/src/lib/webgl/runtime/materials/wireObject.unit.mjs
 */
import assert from 'node:assert/strict'
import { BoxGeometry, BufferGeometry, Group, InstancedMesh, Mesh, MeshStandardMaterial, PerspectiveCamera } from 'three'
import {
  applyWirePose,
  attachBakedWire,
  extractWireMesh,
  capWireMesh,
  capWireMeshes,
  wireMeshNodeCount,
  fillWireField,
  hostWireColor,
  stepLinkAlphas,
  stepNodeAlphas,
  stepWireRipples,
  WIRE_CAGE_NODE_BUDGET,
  WIRE_CHORD_FRAC,
  WIRE_EDGE_DOT,
  WIRE_FADE_FRAC,
  WIRE_FACE_DOT,
  WIRE_JAG_FRAC,
  WIRE_LINE_RADIUS_FRAC,
  WIRE_LINK_RATE,
  WIRE_NODE_RADIUS_FRAC,
  WIRE_REACH_FRAC,
  WIRE_RIPPLE_COUNT,
  WIRE_RIPPLE_DIE,
  WIRE_RIPPLE_EXTRA,
  WIRE_RIPPLE_SPEED_FRAC,
  WIRE_SPRING_KEY,
  WIRE_WAVE_LIGHTS,
  WIRE_HOVER_LIGHTS,
  WIRE_COMPACT_PULSE_IDS,
  wireFadeOpacity,
  wireLinkAllowed,
  wireReachAt,
  wireRipple,
  wireRippleCount,
} from './wireObject.ts'

assert.ok(WIRE_LINE_RADIUS_FRAC < 0.00055, 'tubes must stay thin')
assert.ok(WIRE_NODE_RADIUS_FRAC > WIRE_LINE_RADIUS_FRAC * 1.8, 'nodes must sit on the joints')
assert.ok(
  WIRE_NODE_RADIUS_FRAC < WIRE_LINE_RADIUS_FRAC * 4,
  'negative: nodes must not swell into boils',
)
assert.ok(WIRE_REACH_FRAC >= 0.25, 'the influence must cover more than a pin-prick')
assert.ok(WIRE_FADE_FRAC > WIRE_REACH_FRAC, 'the skirt must extend past the lift')
assert.ok(WIRE_JAG_FRAC > 0.2, 'the blob must not be a circle')
assert.equal(wireFadeOpacity(0, 1, 2), 1)
assert.equal(wireFadeOpacity(1, 1, 2), 1)
assert.ok(wireFadeOpacity(1.5, 1, 2) > 0 && wireFadeOpacity(1.5, 1, 2) < 1)
assert.equal(wireFadeOpacity(2, 1, 2), 0, 'negative: past the fade the net is gone')
assert.ok(WIRE_FACE_DOT > 0.1, 'the wave stays on the facing sheet')
assert.ok(WIRE_EDGE_DOT > 0.1, 'tubes must not span a crease')
assert.ok(WIRE_CHORD_FRAC < 1.8, 'negative: stretched chords through the solid must not draw')
assert.equal(
  wireLinkAllowed(
    {
      rest: new Float32Array([0, 0, 0, 0, 0, 1]),
      normals: new Float32Array([0, 0, 1, 0, 0, -1]),
    },
    0,
    1,
    1,
  ),
  false,
  'negative: a link across opposite sides of the surface is not drawn',
)

const box = new BoxGeometry(1, 1, 1)
const extracted = extractWireMesh(box, 'Box')
assert.equal(extracted.objectName, 'Box')
assert.equal(extracted.nodes.length / 3, 8, 'a cube has 8 joints')
let maxAbs = 0
for (const value of extracted.nodes) maxAbs = Math.max(maxAbs, Math.abs(value))
assert.ok(maxAbs > 0.5, 'the tube centers sit just outside the face')
assert.ok(maxAbs < 0.501, 'negative: a millimetre inflate lifts the net off the skin')
assert.equal(extracted.edges.length / 2, 18, 'a triangulated cube has 12 sides plus 6 face diagonals')
assert.ok(extracted.nodeRadius > extracted.lineRadius)

const empty = extractWireMesh(new BufferGeometry(), '')
assert.equal(empty.nodes.length, 0, 'negative: empty geometry has no cage')
assert.equal(empty.edges.length, 0)

const denseBox = new BoxGeometry(1, 1, 1, 8, 8, 8)
const denseCage = extractWireMesh(denseBox, 'Grid')
const coarseCage = extractWireMesh(denseBox, 'Grid', 4)
assert.ok(coarseCage.nodes.length < denseCage.nodes.length, 'negative: a coarse weld must drop vertices')
assert.equal(wireMeshNodeCount(capWireMesh(extracted, 100)), 8, 'a cube under the cap stays 8 joints')
const limited = capWireMesh(denseCage, 40)
assert.ok(wireMeshNodeCount(limited) <= 40, `capWireMesh must honor maxNodes, got ${wireMeshNodeCount(limited)}`)
assert.ok(wireMeshNodeCount(limited) < wireMeshNodeCount(denseCage), 'negative: the cap must not keep the dense cage')
const pair = capWireMeshes([denseCage, denseCage], 50)
assert.ok(
  pair.reduce((sum, mesh) => sum + wireMeshNodeCount(mesh), 0) <= 50,
  'capWireMeshes must keep the asset under the budget',
)
assert.ok(WIRE_CAGE_NODE_BUDGET >= 4000 && WIRE_CAGE_NODE_BUDGET <= 8000)
denseBox.dispose()

const mat = new MeshStandardMaterial({ color: 0x334155, wireframe: false })
const mesh = new Mesh(box, mat)
mesh.name = 'Box'
const root = new Group()
root.add(mesh)
assert.equal(hostWireColor(mesh), 0x334155)

attachBakedWire(root, { assetId: 'builtin-box', meshes: [extracted] })
assert.equal(mat.wireframe, false, 'negative: host material must stay shaded')
const overlay = mesh.children[0]
assert.ok(overlay)
const lines = overlay.getObjectByName('wire-lines')
const nodes = overlay.getObjectByName('wire-nodes')
assert.ok(lines instanceof InstancedMesh)
assert.ok(nodes instanceof InstancedMesh)
assert.equal(lines.instanceMatrix.array.length / 16, 18, 'wires must be instanced sprites')
assert.equal(nodes.instanceMatrix.array.length / 16, 8, 'joints must be instanced sprites')
assert.ok(
  nodes.geometry.getAttribute('position').count < 16,
  'negative: joints must be camera-facing discs, not tessellated spheres',
)
assert.ok(
  lines.geometry.getAttribute('position').count <= 4,
  'negative: links must be billboard quads, not tessellated cylinders',
)
assert.ok(WIRE_LINK_RATE < 4, 'links must reconstruct slowly enough to see')
assert.equal(lines.count, 0, 'negative: links stay off until a wave or hover steps')
assert.equal(nodes.count, 0, 'negative: dark joints must not draw')
assert.equal(overlay.getObjectByName('wire-wanderer'), undefined, 'negative: there is no crawling probe')
assert.equal(lines.material.name, 'wire-line')
assert.equal(nodes.material.name, 'wire-node')
assert.equal(nodes.material.type, 'MeshBasicMaterial', 'cage bulbs must not shade like the host')
assert.equal(nodes.material.transparent, true)
assert.equal(lines.material.transparent, true)
assert.equal(nodes.material.emissiveIntensity, undefined)
const lights = overlay.getObjectByName('wire-lights')
assert.ok(lights)
assert.equal(lights.children.length, WIRE_WAVE_LIGHTS + WIRE_HOVER_LIGHTS, 'each cage keeps a small live light pool')
assert.equal(overlay.getObjectByName('wire-wave-light-0').intensity, 0, 'negative: lights stay dark until a pulse is posed')
assert.equal(overlay.getObjectByName('wire-link-light-0'), undefined, 'negative: links must not add extra strobes')

const state = overlay.userData[WIRE_SPRING_KEY]
assert.ok(state)
state.nodeAlpha.fill(1)
state.linkAlpha.fill(1)
applyWirePose(overlay)
assert.equal(nodes.count, 8, 'without a camera every glowing joint still draws')
assert.ok(lines.count > 0, 'without a camera glowing links still draw')
const cam = new PerspectiveCamera(50, 1, 0.1, 8)
cam.position.set(0, 0, 3)
cam.lookAt(0, 0, 0)
root.updateWorldMatrix(true, true)
cam.updateMatrixWorld()
applyWirePose(overlay, cam)
assert.ok(nodes.count > 0, 'joints in the camera frame still draw')
assert.ok(nodes.count <= 8)
cam.position.set(0, 0, 20)
cam.lookAt(0, 0, 30)
cam.updateMatrixWorld()
applyWirePose(overlay, cam)
assert.equal(nodes.count, 0, 'negative: joints behind the camera must not draw')
assert.equal(lines.count, 0, 'negative: links outside the frame must not draw')
state.nodeAlpha.fill(0)
state.linkAlpha.fill(0)
applyWirePose(overlay)

const chainNodes = []
const chainNormals = []
const chainEdges = []
for (let i = 0; i < 12; i++) {
  chainNodes.push(i * 0.2, 0, 0)
  chainNormals.push(0, 1, 0)
  if (i) chainEdges.push(i - 1, i)
}
const chainMesh = new Mesh(new BufferGeometry(), new MeshStandardMaterial())
const chainRoot = new Group()
chainRoot.add(chainMesh)
attachBakedWire(chainRoot, {
  assetId: 'chain',
  meshes: [{ objectName: '', nodeRadius: 0.01, lineRadius: 0.004, nodes: chainNodes, normals: chainNormals, edges: chainEdges }],
})
const chainCage = chainMesh.children[0]
const chainState = chainCage.userData[WIRE_SPRING_KEY]
const chainDots = chainCage.getObjectByName('wire-nodes')
const chainLines = chainCage.getObjectByName('wire-lines')
assert.ok(chainDots instanceof InstancedMesh)
assert.ok(chainLines instanceof InstancedMesh)
assert.equal(chainDots.count, 0, 'negative: dark joints must not draw')
assert.equal(chainLines.count, 0, 'negative: links stay off until a wave or hover steps')
chainState.rippleSpeed = 0
chainState.field.fill(0)
chainState.hasFocus = true
chainState.focusX = 0
chainState.focusY = 0
chainState.focusZ = 0
fillWireField(chainState)
stepLinkAlphas(chainState, 0.016)
stepNodeAlphas(chainState, 0.016)
applyWirePose(chainCage)
assert.ok(chainLines.count >= 1, 'links begin to grow on hover')
assert.ok(chainDots.count >= 1, 'glowing joints begin to draw on hover')
let grown = 0
for (const a of chainState.linkAlpha) if (a > grown) grown = a
assert.ok(grown > 0 && grown < 0.2, 'negative: a link must not pop on in one frame')
assert.ok(Math.max(...chainState.nodeAlpha) < 0.2, 'negative: a joint must not pop glow on in one frame')
for (let i = 0; i < 180; i++) {
  stepLinkAlphas(chainState, 0.016)
  stepNodeAlphas(chainState, 0.016)
}
applyWirePose(chainCage)
assert.ok(Math.max(...chainState.linkAlpha) > 0.8, 'the web finishes reconstructing')
assert.ok(chainLines.count > 3, 'hover weaves the local web')
assert.ok(chainLines.count < 11, 'negative: far links stay unlinked')
assert.ok(chainDots.count > 3, 'hover lights the local joints')
chainState.hasFocus = false
const beforeLeave = Math.max(...chainState.linkAlpha)
stepLinkAlphas(chainState, 0.016)
assert.ok(Math.max(...chainState.linkAlpha) > beforeLeave * 0.7, 'negative: leaving must not blink the web off')
applyWirePose(chainCage)
assert.ok(chainDots.count >= 1, 'unlinking joints stay visible while they fade')
assert.ok(chainLines.count >= 1, 'unlinking is still visible after one frame')

assert.equal(WIRE_RIPPLE_COUNT, 2, 'two places swell at once')
assert.equal(WIRE_RIPPLE_EXTRA, 2, 'compact sculptures add two more pulses')
assert.equal(wireRippleCount('the-creation-of-adam'), WIRE_RIPPLE_COUNT)
assert.equal(wireRippleCount('statue-of-liberty'), WIRE_RIPPLE_COUNT)
assert.equal(wireRippleCount('statue-of-an-owl'), WIRE_RIPPLE_COUNT + WIRE_RIPPLE_EXTRA)
assert.equal(wireRippleCount('darwins-monkey'), WIRE_RIPPLE_COUNT + WIRE_RIPPLE_EXTRA)
assert.equal(wireRippleCount('stone-lantern'), WIRE_RIPPLE_COUNT + WIRE_RIPPLE_EXTRA)
assert.deepEqual([...WIRE_COMPACT_PULSE_IDS], ['statue-of-an-owl', 'darwins-monkey', 'stone-lantern'])
assert.equal(
  wireRippleCount('the-creation-of-adam'),
  WIRE_RIPPLE_COUNT,
  'negative: bigger statues keep two idle pulses',
)
assert.ok(WIRE_RIPPLE_SPEED_FRAC > 0.05, 'the crest must travel')
assert.ok(WIRE_RIPPLE_DIE > 1, 'a wave has time to cross before it dies')
assert.ok(wireRipple(0, 0, 0.2, 0.065, 10) > 0.9)
assert.ok(wireRipple(0.4, 0, 0.2, 0.065, 10) < 0.05, 'negative: the swell is not a stagnant pool at the origin')
assert.ok(wireRipple(0.4, 2, 0.2, 0.065, 10) > 0.7, 'the crest travels along the mesh')
assert.ok(wireRipple(0, 2, 0.2, 0.065, 10) < 0.05, 'negative: the origin must not keep breathing in place')
assert.ok(wireRipple(0.4, 40, 0.2, 0.065, 10) < 0.02, 'the wave dies down')

chainState.rippleSpeed = chainState.rest.length > 0 ? 0.4 : 0.2
chainState.rippleWidth = 0.08
chainState.rippleDie = WIRE_RIPPLE_DIE
stepWireRipples(chainState, 0)
assert.equal(chainState.rippleOrigin.length, 2)
assert.notEqual(chainState.rippleOrigin[0], chainState.rippleOrigin[1], 'the two places must not be the same joint')
const origin0 = chainState.rippleOrigin[0]
assert.ok(chainState.field[origin0] > 0.4, 'a fresh wave starts at its joint')
const firstOrigins = [chainState.rippleOrigin[0], chainState.rippleOrigin[1]]
for (let i = 0; i < 220; i++) stepWireRipples(chainState, 0.05)
assert.ok(
  chainState.rippleOrigin[0] !== firstOrigins[0] || chainState.rippleOrigin[1] !== firstOrigins[1],
  'slots pick new places after a wave dies',
)

const meshA = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial())
meshA.name = 'Box'
const meshB = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial())
meshB.name = 'Other'
const pairRoot = new Group()
pairRoot.add(meshA)
pairRoot.add(meshB)
attachBakedWire(pairRoot, {
  assetId: 'builtin-box',
  meshes: [
    { ...extracted, objectName: 'Box' },
    { ...extracted, objectName: 'Other' },
  ],
})
assert.equal(meshA.children[0].getObjectByName('wire-wanderer'), undefined)
assert.equal(meshB.children[0].getObjectByName('wire-wanderer'), undefined, 'negative: no probe mesh')
const seedA = meshA.children[0].userData[WIRE_SPRING_KEY].rippleSeed
const seedB = meshB.children[0].userData[WIRE_SPRING_KEY].rippleSeed
assert.notEqual(seedA, seedB, 'negative: two objects must not share one pulse clock')
assert.equal(meshA.children[0].userData[WIRE_SPRING_KEY].rippleOrigin.length, 2)
assert.equal(meshB.children[0].userData[WIRE_SPRING_KEY].rippleOrigin.length, 2)
meshA.geometry.dispose()
meshB.geometry.dispose()

const compactMesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial())
const compactRoot = new Group()
compactRoot.add(compactMesh)
attachBakedWire(compactRoot, { assetId: 'statue-of-an-owl', meshes: [extracted] })
const compactCage = compactMesh.children[0]
const compactLights = compactCage.getObjectByName('wire-lights')
const compactPulses = WIRE_RIPPLE_COUNT + WIRE_RIPPLE_EXTRA
assert.equal(compactCage.userData[WIRE_SPRING_KEY].rippleCount, compactPulses)
assert.equal(compactCage.userData[WIRE_SPRING_KEY].rippleOrigin.length, compactPulses)
assert.equal(compactLights.children.length, compactPulses + WIRE_HOVER_LIGHTS)
assert.ok(compactCage.getObjectByName('wire-wave-light-2'))
assert.ok(compactCage.getObjectByName('wire-wave-light-3'))
assert.equal(overlay.getObjectByName('wire-wave-light-2'), undefined, 'negative: Adam-sized cages keep two idle pulses')
const monkeyMesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial())
const monkeyRoot = new Group()
monkeyRoot.add(monkeyMesh)
attachBakedWire(monkeyRoot, { assetId: 'darwins-monkey', meshes: [extracted] })
assert.equal(monkeyMesh.children[0].userData[WIRE_SPRING_KEY].rippleCount, compactPulses)
assert.equal(
  monkeyMesh.children[0].getObjectByName('wire-lights').children.length,
  compactPulses + WIRE_HOVER_LIGHTS,
)
const lanternMesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial())
const lanternRoot = new Group()
lanternRoot.add(lanternMesh)
attachBakedWire(lanternRoot, { assetId: 'stone-lantern', meshes: [extracted] })
assert.equal(lanternMesh.children[0].userData[WIRE_SPRING_KEY].rippleCount, compactPulses)
assert.equal(
  lanternMesh.children[0].getObjectByName('wire-lights').children.length,
  compactPulses + WIRE_HOVER_LIGHTS,
)
compactMesh.geometry.dispose()
monkeyMesh.geometry.dispose()
lanternMesh.geometry.dispose()

attachBakedWire(root, { assetId: 'builtin-box', meshes: [extracted] })
assert.equal(mesh.children.length, 1, 're-applying must not stack cages')

box.dispose()
mat.dispose()
console.log('wireObject: ok')
