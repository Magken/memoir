/**
 * ProjectSim create bodies stay inside the documented standard and measured shapes.
 * Run: npx tsx front_end/src/lib/kps/payload.unit.mjs
 */
import assert from 'node:assert/strict'
import { KpsPayloadError, buildKpsCreate, readAccountAssets } from './payload.ts'

const chair = buildKpsCreate({
  route: 'standard',
  name: 'Office chair',
  text: 'A wooden office chair with four legs',
})

assert.equal(chair.path, '/v1/assets/standard')
assert.equal(chair.body.params.physics.simulator, 'agnostic')
assert.equal(chair.body.params.physics.body, 'rigid')
assert.equal(chair.body.params.physics.collision, 'auto')
assert.equal(chair.body.params.mesh.quality, 'low')
assert.equal(chair.body.params.texture.resolution, 2048)
assert.equal(chair.body.inputs.text, 'A wooden office chair with four legs')
assert.equal('images' in chair.body.inputs, false)
assert.equal('capture' in chair.body.inputs, false)

const still = buildKpsCreate({
  route: 'standard',
  image: { url: 'https://example.com/chair.png' },
})
assert.deepEqual(still.body.inputs.images, [{ url: 'https://example.com/chair.png' }])
assert.equal('text' in still.body.inputs, false)

assert.throws(
  () =>
    buildKpsCreate({
      route: 'standard',
      text: 'chair',
      capture: { url: 'https://example.com/room.mp4' },
    }),
  (error) => error instanceof KpsPayloadError && error.field === 'capture',
  'negative: standard rejects a capture video',
)

assert.throws(
  () => buildKpsCreate({ route: 'standard', text: 'chair', audio: 'room-tone.wav' }),
  (error) => error instanceof KpsPayloadError && error.field === 'audio',
  'negative: audio is not an input',
)

assert.throws(
  () =>
    buildKpsCreate({
      route: 'standard',
      text: 'chair',
      image: { url: 'https://example.com/chair.png' },
    }),
  (error) => error instanceof KpsPayloadError && error.field === 'text',
  'negative: image and text together are rejected',
)

assert.throws(
  () =>
    buildKpsCreate({
      route: 'measured',
      image: { url: 'https://example.com/pitcher.png' },
    }),
  (error) => error instanceof KpsPayloadError && error.field === 'capture',
  'negative: measured without a video is rejected',
)

const measured = buildKpsCreate({
  route: 'measured',
  name: 'Pitcher',
  image: { data: 'abc' },
  capture: { url: 'https://example.com/pitcher.mp4' },
})
assert.equal(measured.path, '/v1/assets/measured')
assert.equal(measured.body.params.physics.simulator, 'agnostic')
assert.deepEqual(measured.body.inputs.capture, [{ url: 'https://example.com/pitcher.mp4' }])

assert.deepEqual(readAccountAssets({ data: [{ id: 'ast_1', name: 'Chair' }] }), [{ id: 'ast_1', name: 'Chair' }])
assert.deepEqual(readAccountAssets({ assets: [{ asset_id: 'ast_2' }] }), [{ id: 'ast_2', name: '' }])
assert.deepEqual(readAccountAssets({ assets: [{ name: 'no id' }, { id: '../nope' }] }), [], 'negative: a row without a safe id is dropped')
assert.deepEqual(readAccountAssets({ nope: true }), [])

console.log('payload: ok')
