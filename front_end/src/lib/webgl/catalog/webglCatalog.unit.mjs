/**
 * Catalog integrity: unique ids, enum kinds/layers, built modules on disk,
 * referenceIds resolve in the sample registry.
 * Run: npx tsx front_end/src/lib/webgl/catalog/webglCatalog.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  WEBGL_FEATURES,
  WEBGL_BUILT_FEATURES,
  harvestPlannedFeatures,
  builtModuleGaps,
} from './features.ts'
import { WEBGL_KIND_SET, WEBGL_LAYER_SET } from '../types.ts'
import { getWebglFeature } from './manifest.ts'

const dir = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(dir, '../../../../../')
const REGISTRY = path.join(ROOT, 'item-reference/front-end/webgl-samples/_toolkit/registry.json')

const ids = WEBGL_FEATURES.map((row) => row.id)
assert.equal(new Set(ids).size, ids.length, `duplicate catalog ids: ${ids}`)

for (const row of WEBGL_FEATURES) {
  assert.ok(WEBGL_KIND_SET.has(row.kind), `${row.id} has unknown kind ${row.kind}`)
  assert.ok(WEBGL_LAYER_SET.has(row.layer), `${row.id} has unknown layer ${row.layer}`)
  if (row.status === 'built') {
    assert.ok(row.module, `${row.id} is built but has no module`)
  } else {
    assert.equal(row.module, null, `${row.id} is planned but has a module`)
  }
}

const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'))
const registryIds = new Set(registry.features.map((f) => f.id))

for (const row of WEBGL_FEATURES) {
  for (const ref of row.referenceIds) {
    assert.ok(
      registryIds.has(ref),
      `${row.id} referenceIds includes unknown ${ref}`,
    )
  }
}

const exists = (repoPath) => fs.existsSync(path.join(ROOT, repoPath))
const gaps = builtModuleGaps(WEBGL_FEATURES, exists)
assert.deepEqual(gaps, [], `built modules missing on disk:\n  ${gaps.join('\n  ')}`)

const covered = new Set()
for (const row of WEBGL_FEATURES) {
  for (const ref of row.referenceIds) covered.add(ref)
  if (registryIds.has(row.id)) covered.add(row.id)
}
const uncovered = [...registryIds].filter((id) => !covered.has(id))
assert.deepEqual(uncovered, [], `registry features not in catalog:\n  ${uncovered.join('\n  ')}`)

assert.ok(getWebglFeature('webgl-stage'), 'manifest must find a built feature')
assert.equal(getWebglFeature('not-a-real-feature'), undefined, 'negative: missing id is undefined')

const missingGaps = builtModuleGaps(WEBGL_BUILT_FEATURES, () => false)
assert.ok(missingGaps.length > 0, 'negative: a missing module must be reported')
assert.ok(
  missingGaps.some((line) => line.includes('webgl-stage')),
  `negative: gaps should name webgl-stage, got ${missingGaps.join('; ')}`,
)

const harvested = harvestPlannedFeatures(
  [{ id: 'webgl-renderer-canvas', kind: 'Renderer', layer: 'Present', summary: 'dup' }],
  WEBGL_BUILT_FEATURES,
)
assert.equal(
  harvested.length,
  0,
  'negative: a registry row already referenced by a built feature must not be harvested again',
)

console.log(`webglCatalog: ok (${WEBGL_FEATURES.length} rows, ${WEBGL_BUILT_FEATURES.length} built)`)
