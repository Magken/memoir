/**
 * The dev route refuses a create unless Generate set confirm, and the page never reads the token.
 * Run: npx tsx front_end/src/lib/kps/kpsDevPlugin.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { kpsCreateAllowed } from './kpsDevPlugin.ts'
import { readKpsToken } from './readKpsToken.ts'

const dir = path.dirname(fileURLToPath(import.meta.url))
const pluginSrc = fs.readFileSync(path.join(dir, 'kpsDevPlugin.ts'), 'utf8')
const workbenchSrc = fs.readFileSync(
  path.resolve(dir, '../../components/webglToolkit/WebglKpsWorkbench.tsx'),
  'utf8',
)

const guardAt = pluginSrc.indexOf('if (!kpsCreateAllowed(body))')
const createAt = pluginSrc.indexOf('client.createStandardAsset')
assert.ok(guardAt !== -1 && createAt !== -1 && guardAt < createAt, 'confirm guard runs before create')
assert.match(pluginSrc, /body.confirm === true/)
assert.doesNotMatch(pluginSrc, /kps_live_/, 'negative: the plugin source has no live token')
assert.doesNotMatch(workbenchSrc, /kps_api_token/, 'negative: the workbench does not read the token')
assert.doesNotMatch(workbenchSrc, /api\.projectsim\.ai/, 'negative: the workbench does not call ProjectSim directly')
assert.match(workbenchSrc, /WebglStage/, 'a saved GLB mounts the viewer')
assert.match(workbenchSrc, /download=/, 'a saved GLB can be downloaded')
assert.match(workbenchSrc, /\/api\/kps\/local/)
const localAt = pluginSrc.indexOf("url === '/api/kps/local'")
const tokenAt = pluginSrc.indexOf('const token = readKpsToken')
assert.ok(localAt !== -1 && tokenAt !== -1 && localAt < tokenAt, 'saved files list before the token is read')

assert.equal(kpsCreateAllowed({ confirm: true, idempotencyKey: 'idem-1' }), true)
assert.equal(kpsCreateAllowed({ confirm: false, idempotencyKey: 'idem-1' }), false)
assert.equal(kpsCreateAllowed({ confirm: 'true', idempotencyKey: 'idem-1' }), false, 'negative: the string true is not a confirm')
assert.equal(kpsCreateAllowed({ confirm: true, idempotencyKey: '' }), false)

const envFile = path.join(os.tmpdir(), 'kps-token-test.env')
fs.writeFileSync(envFile, 'kps_api_token = kps_test_example\n')
assert.equal(readKpsToken(envFile), 'kps_test_example')
fs.writeFileSync(envFile, 'kps_api_token=sk_live_nope\n')
assert.throws(() => readKpsToken(envFile), /kps_/, 'negative: a token without the kps_ prefix is rejected')
fs.rmSync(envFile, { force: true })

console.log('kpsDevPlugin: ok')
