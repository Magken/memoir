import assert from 'node:assert/strict'
import {
  formatReferenceOption,
  patchPhaseReferences,
  readReferencesPhaseId,
  scrubReferencesToEarlier,
  writeReferences,
} from './creator2References.ts'

assert.equal(readReferencesPhaseId(undefined), null)
assert.equal(readReferencesPhaseId(null), null)
assert.equal(readReferencesPhaseId({ phaseIds: [] }), null)
assert.equal(readReferencesPhaseId({ phaseIds: ['ph.code'] }), 'ph.code')
assert.deepEqual(writeReferences(''), null)
assert.deepEqual(writeReferences('ph.code'), { phaseIds: ['ph.code'] })

const earlier = new Set(['ph.a', 'ph.b'])
assert.deepEqual(
  scrubReferencesToEarlier({ phaseIds: ['ph.a', 'ph.late', 'ph.a'] }, earlier),
  { phaseIds: ['ph.a'] },
)
assert.equal(scrubReferencesToEarlier({ phaseIds: ['ph.late'] }, earlier), null)
assert.equal(
  patchPhaseReferences('ph.c', 'ph.a', [
    { id: 'ph.a' },
    { id: 'ph.b' },
    { id: 'ph.c' },
  ])?.phaseIds[0],
  'ph.a',
)
assert.equal(
  patchPhaseReferences('ph.a', 'ph.c', [
    { id: 'ph.a' },
    { id: 'ph.b' },
    { id: 'ph.c' },
  ]),
  null,
)
assert.equal(
  patchPhaseReferences('ph.b', 'ph.b', [{ id: 'ph.a' }, { id: 'ph.b' }]),
  null,
)
assert.match(formatReferenceOption({ id: 'ph.x', title: 'Two Sum', kind: 'coding' }), /Coding/)

assert.deepEqual(writeReferences(['ph.a', 'ph.b', 'ph.c', 'ph.d']), {
  phaseIds: ['ph.a', 'ph.b', 'ph.c'],
})
assert.deepEqual(
  patchPhaseReferences('ph.d', ['ph.a', 'ph.b'], [
    { id: 'ph.a' },
    { id: 'ph.b' },
    { id: 'ph.c' },
    { id: 'ph.d' },
  ])?.phaseIds,
  ['ph.a', 'ph.b'],
)

console.log('creator2References.unit: ok')
