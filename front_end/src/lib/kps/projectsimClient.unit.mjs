/**
 * ProjectSim client attaches the bearer token on API calls and omits it on file downloads.
 * Run: npx tsx front_end/src/lib/kps/projectsimClient.unit.mjs
 */
import assert from 'node:assert/strict'
import { KpsHttpError, createProjectSimClient } from './projectsimClient.ts'

const calls = []

function mockFetch(status, body, urlMust) {
  return async (url, init) => {
    calls.push({ url, init })
    if (urlMust && !String(url).includes(urlMust)) {
      throw new Error(`unexpected url ${url}`)
    }
    return new Response(JSON.stringify(body), { status })
  }
}

const token = 'kps_test_example'
calls.length = 0
const client = createProjectSimClient(
  token,
  mockFetch(202, { id: 'ast_test', job_id: 'job_test' }, '/v1/assets/standard'),
)

const created = await client.createStandardAsset({ name: 'chair' }, 'idem-1')
assert.equal(created.job_id, 'job_test')
assert.equal(calls[0].init.method, 'POST')
assert.equal(calls[0].init.headers.get('Authorization'), 'Bearer kps_test_example')
assert.equal(calls[0].init.headers.get('Idempotency-Key'), 'idem-1')

calls.length = 0
const downloadClient = createProjectSimClient(token, async (url, init) => {
  calls.push({ url, init })
  return new Response(new Uint8Array([1, 2, 3]), { status: 200 })
})
const file = await downloadClient.downloadFile('https://downloads.example/file.glb')
assert.equal(file.status, 200)
assert.equal(calls[0].init, undefined, 'download must not send the bearer token')
assert.equal(String(calls[0].url).includes('api.projectsim.ai'), false)

const failing = createProjectSimClient(
  token,
  mockFetch(401, { title: 'Invalid or missing API token', detail: 'provide a valid Bearer token' }),
)
await assert.rejects(() => failing.listAssets(), (error) => error instanceof KpsHttpError && error.status === 401)

console.log('projectsimClient: ok')
