/**
 * Bake mesh-local wire objects for registered mesh assets.
 * Run: npm run webgl:bake-wires
 */
import path from 'node:path'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { BoxGeometry } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { extractWireMesh, capWireMesh, capWireMeshes, WIRE_CAGE_NODE_BUDGET } from './wireObject.ts'
import { meshAssetsNeedingWireBake } from '../../assets/wireBakes.ts'

globalThis.self = globalThis

const here = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(here, '../../../../../../')
const OUT_DIR = path.join(ROOT, 'front_end/src/lib/webgl/assets/wireframes')
const PUBLIC = path.join(ROOT, 'front_end/public')
const DRACO = path.join(PUBLIC, '3d/decoders/gltf/')

function writeBake(assetId, data) {
  mkdirSync(OUT_DIR, { recursive: true })
  const dest = path.join(OUT_DIR, `${assetId}.json`)
  writeFileSync(dest, `${JSON.stringify(data)}\n`)
  const nodes = data.meshes.reduce((sum, mesh) => sum + mesh.nodes.length / 3, 0)
  const edges = data.meshes.reduce((sum, mesh) => sum + mesh.edges.length / 2, 0)
  console.log(`wrote ${path.relative(ROOT, dest)} — ${data.meshes.length} mesh(es), ${nodes} nodes, ${edges} edges`)
}

function bakePrimitive(assetId) {
  const geo = new BoxGeometry(1, 1, 1)
  const data = { assetId, meshes: [extractWireMesh(geo, '')] }
  geo.dispose()
  return data
}

async function bakeGltf(asset) {
  const rel = (asset.path ?? '').replace(/^\//, '')
  const file = path.join(PUBLIC, rel)
  const loader = new GLTFLoader()
  const draco = new DRACOLoader()
  draco.setDecoderPath(`${DRACO}${path.sep}`)
  loader.setDRACOLoader(draco)
  const buf = readFileSync(file)
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  const gltf = await loader.parseAsync(ab, '')
  gltf.scene.updateMatrixWorld(true)
  const meshes = []
  gltf.scene.traverse((obj) => {
    const mesh = obj
    if (!mesh.isMesh || !mesh.geometry) return
    meshes.push(capWireMesh(extractWireMesh(mesh.geometry, mesh.name || ''), WIRE_CAGE_NODE_BUDGET))
  })
  draco.dispose()
  return { assetId: asset.id, meshes: capWireMeshes(meshes, WIRE_CAGE_NODE_BUDGET) }
}

for (const asset of meshAssetsNeedingWireBake()) {
  if (asset.kind === 'primitive') writeBake(asset.id, bakePrimitive(asset.id))
  else if (asset.kind === 'gltf') writeBake(asset.id, await bakeGltf(asset))
}
