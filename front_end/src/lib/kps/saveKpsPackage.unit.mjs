/**
 * Package save keeps relative paths and refuses a path that leaves the folder.
 * Run: npx tsx front_end/src/lib/kps/saveKpsPackage.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { listLocalKpsPackages, saveKpsPackage } from './saveKpsPackage.ts'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kps-pkg-'))

const saved = await saveKpsPackage({
  assetId: 'ast_test',
  destRoot: root,
  files: [
    {
      kind: 'glb',
      path: 'assets/chair/chair.glb',
      url: 'https://downloads.example/chair.glb',
      expires_at: '2026-10-10T00:00:00Z',
    },
    {
      kind: 'physics_sidecar',
      path: 'assets/chair/chair.json',
      url: 'https://downloads.example/chair.json',
      expires_at: '2026-10-10T00:00:00Z',
    },
  ],
  fetchImpl: async () => new Response(new Uint8Array([7, 7]), { status: 200 }),
})

assert.equal(saved.glbPublicPath, '/3d/kps/ast_test/assets/chair/chair.glb')
assert.equal(fs.readFileSync(path.join(root, 'ast_test/assets/chair/chair.glb')).length, 2)
assert.equal(saved.written.length, 2)

await assert.rejects(() =>
  saveKpsPackage({
    assetId: 'ast_test',
    destRoot: root,
    files: [
      {
        kind: 'glb',
        path: '../outside.glb',
        url: 'https://downloads.example/nope.glb',
        expires_at: '2026-10-10T00:00:00Z',
      },
    ],
    fetchImpl: async () => {
      throw new Error('negative: an escaping path must not be fetched')
    },
  }),
)

assert.equal(fs.existsSync(path.join(root, 'outside.glb')), false)

fs.mkdirSync(path.join(root, 'ast_side'), { recursive: true })
fs.writeFileSync(path.join(root, 'ast_side', 'only.json'), '{}')
fs.mkdirSync(path.join(root, 'ast_both', 'mesh'), { recursive: true })
fs.writeFileSync(path.join(root, 'ast_both', 'mesh', 'simready_model.glb'), 's')
fs.writeFileSync(path.join(root, 'ast_both', 'mesh', 'model.glb'), 'g')
fs.writeFileSync(path.join(root, 'not a package'), 'skip')

const listed = listLocalKpsPackages(root)
const both = listed.find((pkg) => pkg.assetId === 'ast_both')
assert.ok(both)
assert.equal(both.glbPublicPath, '/3d/kps/ast_both/mesh/model.glb')
assert.equal(both.files.length, 2)
assert.equal(listed.some((pkg) => pkg.assetId === 'ast_side'), false, 'negative: a folder with no GLB is not listed')
assert.equal(listed.some((pkg) => pkg.assetId.includes(' ')), false, 'negative: an unsafe folder name is not listed')
assert.equal(listed.every((pkg) => pkg.glbPublicPath.startsWith('/3d/kps/') && !pkg.glbPublicPath.includes('..')), true)

fs.rmSync(root, { recursive: true, force: true })

console.log('saveKpsPackage: ok')
