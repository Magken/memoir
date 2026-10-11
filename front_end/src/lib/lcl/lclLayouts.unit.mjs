/**
 * Layout manifests: feature ids exist, scenes exist, overlap rule holds.
 * Run: npx tsx front_end/src/lib/lcl/lclLayouts.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  LCL_LAYOUTS,
  LCL_SHARED_FEATURES_MAX,
  lclLayout,
  lclLayoutMenuDetail,
  parseLclLayoutId,
} from './lclLayouts.ts'
import { LCL_ELEMENT_BY_ID } from './lclElements.ts'
import { LCL_SCENES } from './lclScenes.ts'

assert.equal(LCL_LAYOUTS.length, 5)
assert.equal(parseLclLayoutId('ledger'), 'ledger')
assert.equal(parseLclLayoutId('nope'), 'reference', 'negative: unknown layout ids fall back to reference')
assert.equal(parseLclLayoutId(null), 'reference')

const owners = new Map()
for (const layout of LCL_LAYOUTS) {
  assert.ok(layout.scene in LCL_SCENES, `${layout.id} scene ${layout.scene} must exist`)
  let shared = 0
  for (const id of layout.features) {
    const entry = LCL_ELEMENT_BY_ID[id]
    assert.ok(entry, `${layout.id} feature ${id} must exist in the catalog`)
    if (entry.family === 'base') continue
    const seen = owners.get(id) ?? []
    seen.push(layout.id)
    owners.set(id, seen)
    if (entry.sharedWith?.includes(layout.id) || (entry.sharedWith?.length && seen.length > 1)) {
      shared += 1
    }
  }
  assert.ok(shared <= LCL_SHARED_FEATURES_MAX, `${layout.id} has ${shared} shared features`)
  assert.ok(lclLayoutMenuDetail(layout).includes('·'))
}

for (const [id, layouts] of owners) {
  if (layouts.length <= 1) continue
  const sharedWith = LCL_ELEMENT_BY_ID[id]?.sharedWith ?? []
  const extras = layouts.filter((layoutId) => sharedWith.includes(layoutId))
  const ownersOf = layouts.filter((layoutId) => !sharedWith.includes(layoutId))
  assert.equal(ownersOf.length, 1, `${id} must have one owner layout`)
  assert.equal(extras.length, layouts.length - 1, `${id} extras must be listed in sharedWith`)
}

const clash = { id: 'option-list', layouts: ['reference', 'ledger'] }
assert.equal(
  Boolean(LCL_ELEMENT_BY_ID[clash.id]?.sharedWith?.includes('ledger')),
  false,
  'negative: a feature in two layouts without sharedWith fails the overlap rule',
)

assert.equal(lclLayout('ledger')?.label, 'Ledger')
assert.equal(lclLayout('missing'), undefined)

console.log('lclLayouts: ok')
