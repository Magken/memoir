/**
 * LCL layer path lookup.
 * Run: npx tsx front_end/src/lib/lcl/lclLayer.unit.mjs
 */
import assert from 'node:assert/strict'
import { LCL_PREVIEW_LAYERS, lclLayerAt } from './lclLayer.ts'

const root = LCL_PREVIEW_LAYERS.s1
assert.ok(root)
assert.equal(lclLayerAt(root, ['s1'])?.title, 'Dev Box')
assert.equal(lclLayerAt(root, ['s1'])?.meta, 'microsoft · 13')
assert.ok(lclLayerAt(root, ['s1'])?.lead)
assert.equal(lclLayerAt(root, ['s1', 'install'])?.title, 'Installation')
const install = lclLayerAt(root, ['s1', 'install'])
assert.ok(install?.blocks?.some((block) => block.kind === 'code'), 'install layer must keep the registry JSON sample')
assert.equal(lclLayerAt(root, ['s1', 'missing']), null)
assert.equal(lclLayerAt(root, ['s2', 'install']), null, 'negative: a path must start at this root')
assert.ok(LCL_PREVIEW_LAYERS.s2?.layers?.some((layer) => layer.id === 'auth'))
assert.ok(LCL_PREVIEW_LAYERS.s2?.layers?.some((layer) => layer.id === 'lifecycle'))
assert.ok(LCL_PREVIEW_LAYERS.s1.cover === 0)
assert.ok(LCL_PREVIEW_LAYERS.s2.cover === 1)
assert.ok(
  LCL_PREVIEW_LAYERS.s1.layers?.every((layer) => !layer.body),
  'negative: nested layers must not dump a body teaser on the parent index',
)

console.log('lclLayer: ok')
