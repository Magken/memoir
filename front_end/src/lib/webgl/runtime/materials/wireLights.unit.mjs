/**
 * One averaged lamp per pulse rides the wave; it does not hop joints.
 * Run: npx tsx front_end/src/lib/webgl/runtime/materials/wireLights.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { BoxGeometry, BufferGeometry, Group, Mesh, MeshStandardMaterial, PointLight } from 'three'
import {
  attachBakedWire,
  extractWireMesh,
  fillGeodesicFrom,
  stepWireRipples,
  WIRE_HOVER_LIGHTS,
  WIRE_SPRING_KEY,
  WIRE_WAVE_LIGHTS,
} from './wireObject.ts'
import {
  easeToward,
  getWireLightGain,
  poseWireLights,
  pulseCentroid,
  pulseEnvelope,
  setWireLightColor,
  setWireLightGain,
  WIRE_LIGHT_ATTACK,
  WIRE_LIGHT_FADE,
  WIRE_LIGHT_GAIN_DEFAULT,
  WIRE_LIGHT_HOVER_INTENSITY,
  WIRE_LIGHT_RELEASE,
  WIRE_LIGHT_WAVE_INTENSITY,
} from './wireLights.ts'

assert.equal(getWireLightGain(), WIRE_LIGHT_GAIN_DEFAULT)
setWireLightGain(1)
assert.equal(getWireLightGain(), 1)

assert.ok(easeToward(0, 1, WIRE_LIGHT_FADE, 0.016) < 0.12, 'one frame must not blink a lamp on')
assert.ok(easeToward(1, 0, WIRE_LIGHT_FADE, 0.016) > 0.88, 'one frame must not blink a lamp off')
assert.ok(easeToward(0, 1, WIRE_LIGHT_FADE, 0.016) > 0, 'negative: the fade must still move')
assert.ok(WIRE_LIGHT_RELEASE < WIRE_LIGHT_FADE, 'release is slower than the wave so a crest cannot snap the lamp off')
assert.ok(easeToward(1, 0, WIRE_LIGHT_RELEASE, 0.016) > 0.97, 'one release frame must not blink a lamp off')
const wireSrc = fs.readFileSync(fileURLToPath(new URL('./wireLights.ts', import.meta.url)), 'utf8')
assert.match(wireSrc, /light\.intensity = ease\.intensity \* lightGain/)
assert.doesNotMatch(
  wireSrc,
  /WIRE_LIGHT_WAVE_INTENSITY \* lightGain/,
  'negative: gain must not ride inside the wave ease (Menu LCL lag-then-blink)',
)
{
  const src = fs.readFileSync(fileURLToPath(new URL('./wireLights.ts', import.meta.url)), 'utf8')
  assert.doesNotMatch(src, /pulse\.amp \*\s*WIRE_LIGHT_WAVE/, 'negative: lamp power must not track the crest amp')
}
assert.equal(pulseEnvelope(0), 0, 'a new lamp starts at 0')
assert.ok(pulseEnvelope(WIRE_LIGHT_ATTACK) > 0.6, 'attack rises from 0 instead of appearing')
assert.ok(pulseEnvelope(0.016) < 0.05, 'negative: the first pointer frame must not be full power')

const box = new BoxGeometry(1, 1, 1)
const mesh = new Mesh(box, new MeshStandardMaterial())
const root = new Group()
root.add(mesh)
attachBakedWire(root, { assetId: 'builtin-box', meshes: [extractWireMesh(box, '')] })
const cage = mesh.children[0]
const pack = cage.getObjectByName('wire-lights')
assert.ok(pack)
assert.equal(pack.children.length, WIRE_WAVE_LIGHTS + WIRE_HOVER_LIGHTS, 'one lamp per pulse plus hover')
assert.ok(
  !pack.children.some((child) => child.isMesh),
  'negative: the lamp itself must stay invisible',
)
const wave = pack.getObjectByName('wire-wave-light-0')
assert.ok(wave instanceof PointLight)
assert.equal(wave.decay, 2, 'inverse-square so the whole mesh is not lit at once')
assert.equal(wave.intensity, 0, 'negative: lights stay off until the pulse is posed')
assert.equal(pack.getObjectByName('wire-link-light-0'), undefined, 'negative: links must not add extra strobes')

const state = cage.userData[WIRE_SPRING_KEY]
stepWireRipples(state, 0)
const pulse = pulseCentroid(state, 0)
assert.ok(pulse)
poseWireLights(cage, 0.016)
assert.ok(wave.intensity < WIRE_LIGHT_WAVE_INTENSITY * 0.12, `first wave frame must ramp from 0, got ${wave.intensity}`)
for (let i = 0; i < 8; i++) poseWireLights(cage, 0.016)
assert.ok(wave.intensity < WIRE_LIGHT_WAVE_INTENSITY * 0.35, `negative: ramp must not follow the crest, got ${wave.intensity}`)
for (let i = 0; i < 180; i++) poseWireLights(cage, 0.016)
assert.ok(wave.intensity > 0.2, `a live crest must light the ceramic, got ${wave.intensity}`)
assert.ok(wave.intensity <= WIRE_LIGHT_WAVE_INTENSITY + 1e-6)
assert.equal(wave.decay, 2)
const along =
  (wave.position.x - pulse.x) * pulse.nx +
  (wave.position.y - pulse.y) * pulse.ny +
  (wave.position.z - pulse.z) * pulse.nz
assert.ok(along > 0.01, 'the lamp floats off the skin, it is not the mesh itself')

const before = wave.position.clone()
const lit = wave.intensity
state.rippleOrigin[0] = (state.rippleOrigin[0] + 4) % (state.rest.length / 3)
state.rippleAge[0] = 0
const dest = state.rippleDist.subarray(0, state.rest.length / 3)
for (let i = 0; i < dest.length; i++) dest[i] = i === state.rippleOrigin[0] ? 0 : 10
poseWireLights(cage, 0.016)
const jumped = Math.hypot(wave.position.x - before.x, wave.position.y - before.y, wave.position.z - before.z)
assert.ok(jumped < 0.05, `negative: a new origin must not teleport the lamp, got ${jumped}`)
assert.ok(wave.intensity > lit * 0.9, `a new origin must keep dimming from ${lit}, got ${wave.intensity}`)
assert.ok(wave.intensity < lit, 'negative: a spent slot must start releasing instead of jumping to a new crest')

state.field.fill(0)
state.rippleAge.fill(99)
for (let i = 0; i < 12; i++) poseWireLights(cage, 0.016)
assert.ok(wave.intensity > lit * 0.7, `negative: a dead wave must not deinit the lamp, got ${wave.intensity}`)
for (let i = 0; i < 800; i++) poseWireLights(cage, 0.016)
assert.equal(wave.intensity, 0, 'negative: a spent pulse must go to no light')

const hover = pack.getObjectByName('wire-hover-light')
assert.ok(hover instanceof PointLight)
state.hasFocus = true
state.hoverAge = 0
state.focusX = 0.4
state.focusY = 0.2
state.focusZ = -0.1
state.focusNX = 0
state.focusNY = 1
state.focusNZ = 0
state.field[0] = 1
poseWireLights(cage, 0.016)
assert.ok(hover.intensity < WIRE_LIGHT_HOVER_INTENSITY * 0.15, `first pointer frame must ramp from 0, got ${hover.intensity}`)
for (let i = 0; i < 260; i++) poseWireLights(cage, 0.016)
assert.ok(hover.intensity > WIRE_LIGHT_HOVER_INTENSITY * 0.8, 'hover lights the raycast hit')
assert.ok(Math.abs(hover.position.x - 0.4) < 0.08, 'hover follows the hit, not a random peak')
assert.ok(hover.position.y > 0.2, 'hover sits along the hit normal')
assert.ok(wave.intensity < 0.2, 'negative: idle waves must not keep strobing while the pointer is down')
const hoverLit = hover.intensity
state.focusX = 4.2
state.focusZ = -3.1
poseWireLights(cage, 0.016)
assert.ok(
  hover.intensity > hoverLit * 0.85,
  `negative: a moving pointer must not kill and recreate the lamp, got ${hover.intensity} from ${hoverLit}`,
)
setWireLightColor('#ff0040')
poseWireLights(cage, 0.05)
assert.ok(hover.color.r > 0.9 && hover.color.g < 0.1, 'the viewer color tints the cage lights')
state.hasFocus = false
for (let i = 0; i < 800; i++) poseWireLights(cage, 0.016)
assert.equal(hover.intensity, 0, 'negative: leaving the mesh dims the hover lamp')

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
const chainState = chainMesh.children[0].userData[WIRE_SPRING_KEY]
chainState.rippleOrigin[0] = 0
chainState.rippleAge[0] = 0
chainState.rippleSpeed = 0.2
chainState.rippleWidth = 0.08
fillGeodesicFrom(chainState, 0, chainState.rippleDist.subarray(0, 12))
const born = pulseCentroid(chainState, 0)
assert.ok(born)
assert.ok(Math.abs(born.x) < 0.15, 'a new pulse averages around its origin, not a far joint')
chainState.rippleAge[0] = 2
const ridden = pulseCentroid(chainState, 0)
assert.ok(ridden)
assert.ok(ridden.x > born.x + 0.15, `the average lamp rides the wave, got ${ridden.x} from ${born.x}`)
assert.ok(ridden.x - born.x < 1.6, 'negative: one pulse must not teleport to the far end')
const hop = pulseCentroid(chainState, 0)
assert.ok(hop)
assert.ok(
  Math.hypot(hop.x - ridden.x, hop.y - ridden.y, hop.z - ridden.z) < 1e-9,
  'negative: the same field must not pick a different joint each call',
)

const libertyMesh = new Mesh(box, new MeshStandardMaterial())
const libertyRoot = new Group()
libertyRoot.add(libertyMesh)
attachBakedWire(libertyRoot, { assetId: 'statue-of-liberty', meshes: [extractWireMesh(box, '')] })
const libertyHover = libertyMesh.children[0].getObjectByName('wire-hover-light')
assert.ok(libertyHover instanceof PointLight, 'Liberty uses the same PointLight moat as Adam')
assert.equal(libertyHover.type, 'PointLight')
assert.notEqual(libertyHover.type, 'SpotLight', 'negative: Liberty must not keep a wrap spotlight')
assert.equal(
  libertyMesh.children[0].getObjectByName('wire-lights').children.length,
  WIRE_WAVE_LIGHTS + WIRE_HOVER_LIGHTS,
  'negative: Liberty stays at two idle pulses',
)
assert.equal(libertyMesh.children[0].getObjectByName('wire-wave-light-2'), undefined)

const owlMesh = new Mesh(box, new MeshStandardMaterial())
const owlRoot = new Group()
owlRoot.add(owlMesh)
attachBakedWire(owlRoot, { assetId: 'statue-of-an-owl', meshes: [extractWireMesh(box, '')] })
const owlCage = owlMesh.children[0]
const owlExtra = owlCage.getObjectByName('wire-wave-light-2')
assert.ok(owlExtra instanceof PointLight, 'owl gets two extra pulse lamps')
assert.ok(owlCage.getObjectByName('wire-wave-light-3'))
assert.equal(owlCage.getObjectByName('wire-lights').children.length, WIRE_WAVE_LIGHTS + 2 + WIRE_HOVER_LIGHTS)
const owlState = owlCage.userData[WIRE_SPRING_KEY]
owlState.rippleAge[2] = 0
owlState.rippleAge[3] = 0
stepWireRipples(owlState, 0)
for (let i = 0; i < 180; i++) poseWireLights(owlCage, 0.016)
assert.ok(owlExtra.intensity > 0.05, `the extra owl pulse must light the ceramic, got ${owlExtra.intensity}`)

const monkeyMesh = new Mesh(box, new MeshStandardMaterial())
const monkeyRoot = new Group()
monkeyRoot.add(monkeyMesh)
attachBakedWire(monkeyRoot, { assetId: 'darwins-monkey', meshes: [extractWireMesh(box, '')] })
assert.equal(
  monkeyMesh.children[0].getObjectByName('wire-lights').children.length,
  WIRE_WAVE_LIGHTS + 2 + WIRE_HOVER_LIGHTS,
)
const lanternMesh = new Mesh(box, new MeshStandardMaterial())
const lanternRoot = new Group()
lanternRoot.add(lanternMesh)
attachBakedWire(lanternRoot, { assetId: 'stone-lantern', meshes: [extractWireMesh(box, '')] })
assert.equal(
  lanternMesh.children[0].getObjectByName('wire-lights').children.length,
  WIRE_WAVE_LIGHTS + 2 + WIRE_HOVER_LIGHTS,
)

setWireLightGain(0)
assert.equal(getWireLightGain(), 0)
state.hasFocus = false
stepWireRipples(state, 0)
for (let i = 0; i < 180; i++) poseWireLights(cage, 0.016)
assert.equal(wave.intensity, 0, 'negative: gain 0 must not light the mesh')
setWireLightGain(1)

box.dispose()
console.log('wireLights: ok')
