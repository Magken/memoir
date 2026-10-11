/**
 * A gzip SPZ v2 fixture decodes to a known count. PLY, HTML, empty, and
 * other non-SPZ payloads throw.
 * Run: npx tsx front_end/src/lib/webgl/runtime/assets/loadSplatAsset.unit.mjs
 */
import assert from 'node:assert/strict'
import { gzipSync } from 'node:zlib'
import { NormalBlending, PerspectiveCamera } from 'three'
import { cropSplatShell, decodeSplatBytes } from './decodeSplat.ts'
import { countingSort, createSplatMesh, disposeSplatMesh, sortSplatMesh } from './splatMesh.ts'

const SH_C0 = 0.2820947917738781
const COLOR_SCALE = SH_C0 / 0.15

function colorByte(i) {
  const clamped = new Uint8ClampedArray(1)
  clamped[0] = ((i / 255 - 0.5) * COLOR_SCALE + 0.5) * 255
  return clamped[0]
}

function writeU32(buf, offset, value) {
  buf[offset] = value & 255
  buf[offset + 1] = (value >>> 8) & 255
  buf[offset + 2] = (value >>> 16) & 255
  buf[offset + 3] = (value >>> 24) & 255
}

function writeInt24(buf, offset, value) {
  const v = value | 0
  buf[offset] = v & 255
  buf[offset + 1] = (v >> 8) & 255
  buf[offset + 2] = (v >> 16) & 255
}

function encodeV2() {
  const count = 2
  const fractionalBits = 12
  const positionsSize = count * 9
  const raw = new Uint8Array(16 + positionsSize + count + count * 3 + count * 3 + count * 3)
  writeU32(raw, 0, 0x5053474e)
  writeU32(raw, 4, 2)
  writeU32(raw, 8, count)
  raw[12] = 0
  raw[13] = fractionalBits
  raw[14] = 0
  const fixed = 1 << fractionalBits
  let offset = 16
  for (const value of [1, 2, 3, -1, 0, 4]) {
    writeInt24(raw, offset, Math.round(value * fixed))
    offset += 3
  }
  raw[offset] = 200
  raw[offset + 1] = 10
  offset += count
  raw[offset] = 128
  raw[offset + 1] = 128
  raw[offset + 2] = 128
  raw[offset + 3] = 0
  raw[offset + 4] = 255
  raw[offset + 5] = 0
  offset += count * 3
  for (let i = 0; i < count * 3; i++) raw[offset + i] = 160
  offset += count * 3
  for (let i = 0; i < count * 3; i++) raw[offset + i] = 128
  return gzipSync(raw)
}

function encodeV2Sh1() {
  const count = 2
  const raw = new Uint8Array(16 + count * 9 + count + count * 3 + count * 3 + count * 3 + count * 9)
  writeU32(raw, 0, 0x5053474e)
  writeU32(raw, 4, 2)
  writeU32(raw, 8, count)
  raw[12] = 1
  raw[13] = 12
  let offset = 16 + count * 9 + count + count * 3 + count * 3 + count * 3
  for (let i = 0; i < count * 9; i++) raw[offset + i] = i * 10
  return gzipSync(raw)
}

function encodeV3Identity() {
  const count = 1
  const raw = new Uint8Array(16 + 9 + 1 + 3 + 3 + 4)
  writeU32(raw, 0, 0x5053474e)
  writeU32(raw, 4, 3)
  writeU32(raw, 8, count)
  raw[12] = 0
  raw[13] = 12
  raw[14] = 0
  let offset = 16 + 9
  raw[offset] = 255
  offset += 1
  raw[offset] = 128
  raw[offset + 1] = 128
  raw[offset + 2] = 128
  offset += 3
  raw[offset] = 160
  raw[offset + 1] = 160
  raw[offset + 2] = 160
  offset += 3
  writeU32(raw, offset, 3 << 30)
  return gzipSync(raw)
}

const cloud = await decodeSplatBytes(encodeV2())
assert.equal(cloud.count, 2)
assert.equal(cloud.centers[0], 1)
assert.equal(cloud.centers[1], 2)
assert.equal(cloud.centers[2], 3)
assert.equal(cloud.centers[3], -1)
assert.equal(cloud.centers[4], 0)
assert.equal(cloud.centers[5], 4)
assert.equal(cloud.colors[3], 200)
assert.equal(cloud.colors[7], 10)
assert.equal(cloud.colors[0], colorByte(128))
assert.equal(cloud.colors[4], colorByte(0))
assert.ok(Math.abs(cloud.scales[0] - 1) < 1e-6)
const qx = 128 / 127.5 - 1
const qw = Math.sqrt(Math.max(0, 1 - 3 * qx * qx))
assert.ok(Math.abs(cloud.quaternions[0] - qx) < 1e-6)
assert.ok(Math.abs(cloud.quaternions[3] - qw) < 1e-6)

assert.equal(cloud.shDegree, 0)
assert.equal(cloud.sh.length, 0)

const withSh = await decodeSplatBytes(encodeV2Sh1())
assert.equal(withSh.shDegree, 1)
assert.equal(withSh.sh.length, 18)
assert.equal(withSh.sh[0], 0)
assert.equal(withSh.sh[9], 90, 'the second splat starts nine bytes in')
assert.equal(withSh.sh[17], 170)
const shMesh = createSplatMesh(withSh)
assert.equal(shMesh.material.defines.SH_DEGREE, 1)
assert.equal(shMesh.material.defines.SH_TEXELS, 3)
const shTexels = shMesh.material.uniforms.shData.value.image.data
assert.equal(shTexels[12], 90, 'the second splat starts on its own texel')
assert.match(shMesh.material.vertexShader, /-0\.4886025 \* y/)
const shCamera = new PerspectiveCamera()
shCamera.position.set(0, 0, 5)
shCamera.updateMatrixWorld()
shMesh.rotation.set(Math.PI, 0, 0)
shMesh.updateMatrixWorld()
sortSplatMesh(shMesh, shCamera)
const local = shMesh.material.uniforms.localCamera.value
assert.ok(Math.abs(local.z + 5) < 1e-6, 'the camera is moved into the turned splat frame')
assert.notEqual(Math.round(local.z), 5, 'negative: a world-space camera would read the wrong view direction')
disposeSplatMesh(shMesh)

{
  // A dense scene 1 unit deep sits next to sky splats 400 units out: the log key still orders it.
  const n = 2000
  const depths = new Float32Array(n)
  for (let i = 0; i < n; i++) depths[i] = i < 20 ? 300 + i * 5 : 0.5 + ((i * 7919) % n) / n
  const keys = new Float32Array(n)
  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < n; i++) {
    keys[i] = -Math.log(depths[i])
    min = Math.min(min, keys[i])
    max = Math.max(max, keys[i])
  }
  const out = new Float32Array(n)
  countingSort(keys, n, min, max, out)
  assert.equal(new Set(out).size, n, 'every splat appears once')
  let inversions = 0
  for (let i = 1; i < n; i++) if (depths[out[i]] > depths[out[i - 1]] + 1e-3) inversions++
  assert.equal(inversions, 0, 'far splats draw first, to within a millimetre')

  const linear = new Float32Array(n)
  for (let i = 0; i < n; i++) linear[i] = -depths[i]
  countingSort(linear, n, -depths[19], -0.5, out)
  let linearInversions = 0
  for (let i = 1; i < n; i++) if (depths[out[i]] > depths[out[i - 1]] + 1e-3) linearInversions++
  assert.ok(linearInversions > 0, 'negative: linear depth buckets stretched by the sky misorder the near scene')
}

const v3 = await decodeSplatBytes(encodeV3Identity())
assert.equal(v3.count, 1)
assert.equal(v3.centers[0], 0)
assert.equal(v3.quaternions[0], 0)
assert.equal(v3.quaternions[1], 0)
assert.equal(v3.quaternions[2], 0)
assert.equal(v3.quaternions[3], 1)
assert.notEqual(v3.count, 2, 'negative: the v3 fixture is one gaussian, not the v2 pair')

const headerOnly = new Uint8Array(16)
writeU32(headerOnly, 0, 0x5053474e)
writeU32(headerOnly, 4, 2)
writeU32(headerOnly, 8, 2)
await assert.rejects(() => decodeSplatBytes(gzipSync(headerOnly)), /byte length/)

await assert.rejects(() => decodeSplatBytes(Buffer.from('ply\nformat ascii 1.0\n')), /PLY/)
await assert.rejects(() => decodeSplatBytes(Buffer.from('<!DOCTYPE html><html></html>')), /HTML/)
await assert.rejects(() => decodeSplatBytes(new ArrayBuffer(0)), /empty/)
await assert.rejects(() => decodeSplatBytes(Buffer.from([1, 2, 3, 4, 5, 6, 7, 8])), /Not an SPZ/)
assert.notEqual(cloud.centers.length, 0, 'negative: a decoded SPZ must not be an empty mesh')

const mesh = createSplatMesh(cloud)
assert.equal(mesh.geometry.getAttribute('position').count, 4)
assert.equal(mesh.material.fog, false)
assert.equal(mesh.material.lights, false)
assert.equal(mesh.material.toneMapped, false)
assert.doesNotMatch(mesh.material.fragmentShader, /linearToOutputTexel/, 'negative: SPZ color bytes are display values, as in three.js GaussianSplat')
assert.match(mesh.material.fragmentShader, /r2 > 4\.0/)
assert.match(mesh.material.vertexShader, /vColor\.a \*= sqrt/)
assert.equal(mesh.material.blending, NormalBlending)
assert.equal(mesh.geometry.getAttribute('position').array[0], -2)
assert.equal(mesh.material.defines.SH_DEGREE, 0)
assert.ok(mesh.material.uniforms.localCamera)
assert.equal(mesh.geometry.getAttribute('corner'), undefined, 'negative: the quad must be the position attribute')
assert.ok(mesh.material.uniforms.viewport)
assert.match(mesh.material.vertexShader, /viewport/)
assert.match(mesh.material.vertexShader, /0\.3/)
assert.doesNotMatch(mesh.material.vertexShader, /corner/, 'negative: screen size must not use the old corner attribute')
disposeSplatMesh(mesh)

function shellCloud() {
  const count = 80
  const centers = new Float32Array(count * 3)
  const scales = new Float32Array(count * 3)
  const quaternions = new Float32Array(count * 4)
  const colors = new Uint8Array(count * 4)
  for (let i = 0; i < count; i++) {
    const i3 = i * 3
    const i4 = i * 4
    if (i < 70) {
      centers[i3] = (i % 7) * 0.1
      centers[i3 + 1] = ((i * 3) % 5) * 0.1
      centers[i3 + 2] = ((i * 5) % 6) * 0.1
    } else {
      centers[i3] = i % 2 === 0 ? 240 : -240
      centers[i3 + 1] = 240
      centers[i3 + 2] = -240
    }
    quaternions[i4 + 3] = 1
    colors[i4 + 3] = 255
  }
  const sh = new Uint8Array(count * 9)
  for (let i = 0; i < count; i++) sh[i * 9] = i
  return { count, centers, scales, quaternions, colors, shDegree: 1, sh }
}
const shelled = shellCloud()
const cropped = cropSplatShell(shelled)
assert.equal(cropped.count, 70)
assert.equal(cropped.shDegree, 1)
assert.equal(cropped.sh.length, 70 * 9)
assert.equal(cropped.sh[69 * 9], 69, 'view-dependent color stays with its splat after the crop')
assert.ok(Math.abs(cropped.centers[0]) < 2, 'the dense dots stay')
const tight = cropSplatShell({
  count: 70,
  centers: shelled.centers.slice(0, 70 * 3),
  scales: shelled.scales.slice(0, 70 * 3),
  quaternions: shelled.quaternions.slice(0, 70 * 4),
  colors: shelled.colors.slice(0, 70 * 4),
  shDegree: 1,
  sh: shelled.sh.slice(0, 70 * 9),
})
assert.equal(tight.count, 70, 'negative: a cloud with no far shell is left whole')

console.log('loadSplatAsset: ok')
