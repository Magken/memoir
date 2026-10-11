/**
 * Splat library: listing, imports, views round-trip, and the three-r186 resolver.
 * Run: npx tsx front_end/src/lib/webgl/splat/splatDevPlugin.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { remapThreeImport } from './splatDevPlugin.ts'
import { listSplatFiles, readSplatViews, saveSplatImport, writeSplatViews } from './splatFiles.ts'
import { flipFor, parseSplatView, readViewsDoc, safeSplatName, serializeSplatSession } from './splatViews.ts'

assert.equal(flipFor({ views: [] }, 'ply'), true, 'a raw .ply opens turned')
assert.equal(flipFor({ views: [] }, 'spz'), false, 'negative: a y-up .spz is not turned')
assert.equal(flipFor(readViewsDoc({ a: { flip: false, views: [] } }).a, 'ply'), false, 'a saved "not turned" survives and wins')

const r186 = 'C:/repo/front_end/node_modules/three-r186/examples/jsm/objects/GaussianSplat.js'
assert.equal(remapThreeImport('three/webgpu', r186), 'three-r186/webgpu')
assert.equal(remapThreeImport('three', r186), 'three-r186')
assert.equal(remapThreeImport('three/tsl', r186.replace(/\//g, '\\')), 'three-r186/tsl', 'Windows importer paths remap too')
assert.equal(remapThreeImport('three', 'C:/repo/front_end/src/App.tsx'), null, 'negative: app code keeps its own three')
assert.equal(remapThreeImport('three-stdlib', r186), null, 'negative: a package that only starts with "three" is left alone')

assert.equal(safeSplatName('C:\\Downloads\\Fort Mason.SPZ'), 'fort-mason.spz')
assert.equal(safeSplatName('../../etc/passwd.ply'), 'passwd.ply', 'path parts are dropped')
assert.equal(safeSplatName('model.glb'), null, 'negative: only .spz and .ply are splats')
assert.equal(safeSplatName('.ply'), null)

const probeCopy = '{"camera":[0.125,-0.04,-0.03],"target":[0.125,-0.04,-0.33],"fov":45,"flip":false}'
assert.deepEqual(parseSplatView(probeCopy), { camera: [0.125, -0.04, -0.03], target: [0.125, -0.04, -0.33], fov: 45 })
assert.equal(parseSplatView('{"camera":[1,2],"target":[0,0,0]}'), null, 'negative: a short vector is not a view')
assert.equal(parseSplatView('not json'), null)
const session = serializeSplatSession({
  camera: { position: [1, 2, 3], target: [0, 0, 0], up: [0, 1, 0], quaternion: [0, 0, 0, 1], fov: 50, near: 0.01, far: 100, orbit: { azimuth: 0, polar: 1, radius: 3.7 } },
  model: { position: [0, 0, 0], rotation: [Math.PI, 0, 0], quaternion: [1, 0, 0, 0], scale: [1, 1, 1] },
  bounds: { center: [0, 0, 0], radius: 240 },
  viewport: { width: 800, height: 600, pixelRatio: 1 },
  backend: 'webgl2',
  splat: { path: '/3d/a.ply', name: 'a.ply', format: 'ply', bytes: 10, count: 5, flip: true },
  home: null,
  views: [],
})
assert.match(session, /"kind": "webgl-splat-session"/)
assert.match(session, /"path": "\/3d\/a\.ply"/, 'the session names the splat file')
assert.deepEqual(parseSplatView(session), { camera: [1, 2, 3], target: [0, 0, 0], fov: 50 }, 'Paste view reads a copied session')

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'splat-lib-'))
fs.mkdirSync(path.join(root, '3d'), { recursive: true })
fs.writeFileSync(path.join(root, '3d', 'fort-mason.spz'), Buffer.from([1, 2, 3]))
fs.writeFileSync(path.join(root, '3d', 'adam.glb'), Buffer.from([1]))
const saved = saveSplatImport(root, 'Site Location.PLY', Buffer.from([9, 9]))
assert.equal(saved.path, '/3d/splats/site-location.ply')
assert.ok(fs.existsSync(path.join(root, '3d', 'splats', 'site-location.ply')), 'the import is written to disk')
assert.throws(() => saveSplatImport(root, 'scene.glb', Buffer.from([1])), /spz or \.ply/, 'negative: a mesh is refused')
assert.throws(() => saveSplatImport(root, 'empty.spz', Buffer.alloc(0)), /empty/)

const listed = listSplatFiles(root)
assert.deepEqual(
  listed.map((file) => file.path),
  ['/3d/fort-mason.spz', '/3d/splats/site-location.ply'],
  'served and imported splats both list; the glb does not',
)
assert.equal(listed[0].bytes, 3)

assert.deepEqual(readSplatViews(root), {}, 'no views file reads as empty')
const written = writeSplatViews(root, {
  '/3d/fort-mason.spz': {
    home: { camera: [0, 1, 2], target: [0, 0, 0], fov: 50 },
    flip: true,
    views: [
      { id: 'v1', label: 'Desk', camera: [1, 1, 1], target: [0, 0, 0], fov: 45 },
      { id: 'bad', label: 'Broken', camera: [1], target: [0, 0, 0] },
    ],
  },
})
assert.equal(written['/3d/fort-mason.spz'].views.length, 1, 'negative: a broken viewpoint is dropped, not saved')
assert.deepEqual(readSplatViews(root), written, 'views survive a reload from disk')
assert.equal(readSplatViews(root)['/3d/fort-mason.spz'].flip, true)
fs.rmSync(root, { recursive: true, force: true })

console.log('splatDevPlugin: ok')
