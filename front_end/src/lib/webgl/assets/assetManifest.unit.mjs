/**
 * Registered /3d/ assets exist on disk.
 * Run: npx tsx front_end/src/lib/webgl/assets/assetManifest.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { WEBGL_ASSETS, getWebglAsset } from './assetManifest.ts'

const dir = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC_3D = path.resolve(dir, '../../../../public/3d')

const ids = WEBGL_ASSETS.map((asset) => asset.id)
assert.equal(new Set(ids).size, ids.length, `duplicate asset ids: ${ids.join(', ')}`)

const adam = getWebglAsset('the-creation-of-adam')
assert.ok(adam, 'the-creation-of-adam must be registered')
assert.equal(adam.kind, 'gltf')
assert.equal(adam.path, '/3d/the_creation_of_adam.glb')

const liberty = getWebglAsset('statue-of-liberty')
assert.ok(liberty, 'statue-of-liberty must be registered')
assert.equal(liberty.kind, 'gltf')
assert.equal(liberty.path, '/3d/statue_of_liberty.glb')
assert.equal(liberty.upAxis, 'y')
assert.notEqual(liberty.id, 'the-creation-of-adam', 'negative: Liberty is a second glTF, not an Adam alias')

const owl = getWebglAsset('statue-of-an-owl')
assert.ok(owl, 'statue-of-an-owl must be registered')
assert.equal(owl.kind, 'gltf')
assert.equal(owl.path, '/3d/statue_of_an_owl.glb')
assert.equal(owl.upAxis, 'y')
assert.equal(owl.label, 'Statue of an Owl')
assert.notEqual(owl.id, 'statue-of-liberty', 'negative: the owl is a third glTF, not a Liberty alias')

const monkey = getWebglAsset('darwins-monkey')
assert.ok(monkey, 'darwins-monkey must be registered')
assert.equal(monkey.kind, 'gltf')
assert.equal(monkey.path, '/3d/darwins_monkey.glb')
assert.equal(monkey.upAxis, 'y')
assert.equal(monkey.label, "Darwin's Monkey")
assert.notEqual(monkey.id, 'statue-of-an-owl', 'negative: the monkey is a fourth glTF, not an owl alias')

const lantern = getWebglAsset('stone-lantern')
assert.ok(lantern, 'stone-lantern must be registered')
assert.equal(lantern.kind, 'gltf')
assert.equal(lantern.path, '/3d/stone_lantern.glb')
assert.equal(lantern.upAxis, 'y')
assert.equal(lantern.label, 'Stone lantern')
assert.notEqual(lantern.id, 'darwins-monkey', 'negative: the lantern is a fifth glTF, not a monkey alias')

const fortMason = getWebglAsset('fort-mason')
assert.ok(fortMason, 'fort-mason must be registered')
assert.equal(fortMason.kind, 'splat')
assert.equal(fortMason.path, '/3d/fort-mason.spz')
assert.equal(fortMason.upAxis, 'y')
assert.equal(fortMason.label, 'Fort Mason')
assert.notEqual(fortMason.kind, 'gltf', 'negative: Fort Mason is a splat, not a glTF')

const cloud = getWebglAsset('volumetric-cloud')
assert.ok(cloud, 'volumetric-cloud must be registered')
assert.equal(cloud.kind, 'volume')
assert.equal(cloud.path, undefined, 'negative: a volume asset must not point at a GLB')

const gras = getWebglAsset('gras-letters')
assert.ok(gras, 'gras-letters must be registered')
assert.equal(gras.kind, 'text')
assert.equal(gras.label, 'GRAS')
assert.equal(gras.path, undefined, 'negative: a text asset must not point at a GLB')

const aboutUs = getWebglAsset('about-us-letters')
assert.ok(aboutUs, 'about-us-letters must be registered')
assert.equal(aboutUs.kind, 'text')
assert.equal(aboutUs.label, 'About Us')
assert.equal(aboutUs.path, undefined, 'negative: a text asset must not point at a GLB')
assert.notEqual(aboutUs.id, 'gras-letters', 'negative: About Us is a second wordmark, not a GRAS alias')

const projectsLetters = getWebglAsset('projects-letters')
assert.ok(projectsLetters, 'projects-letters must be registered')
assert.equal(projectsLetters.kind, 'text')
assert.equal(projectsLetters.label, 'Projects')
assert.equal(projectsLetters.path, undefined, 'negative: a text asset must not point at a GLB')
assert.notEqual(projectsLetters.id, 'about-us-letters', 'negative: Projects is a third wordmark, not an About Us alias')

for (const asset of WEBGL_ASSETS) {
  if (asset.kind !== 'gltf' && asset.kind !== 'splat') continue
  assert.ok(asset.path?.startsWith('/3d/'), `${asset.id} path must live under /3d/`)
  const disk = path.join(PUBLIC_3D, asset.path.slice('/3d/'.length))
  assert.ok(fs.existsSync(disk), `missing ${asset.kind} file ${disk}`)
}

assert.equal(getWebglAsset('no-such-asset'), undefined, 'negative: unknown id is undefined')

console.log('assetManifest: ok')
