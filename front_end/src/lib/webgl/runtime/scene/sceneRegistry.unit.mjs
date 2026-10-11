/**
 * Named sub-scene registry.
 * Run: npx tsx front_end/src/lib/webgl/runtime/scene/sceneRegistry.unit.mjs
 */
import assert from 'node:assert/strict'
import { createSceneRegistry } from './sceneRegistry.ts'

const registry = createSceneRegistry()
registry.register({ id: 'lobby', label: 'Lobby', featureIds: ['webgl-stage', 'orbit-rig'] })
assert.equal(registry.get('lobby')?.label, 'Lobby')
assert.deepEqual(registry.featuresFor('lobby'), ['webgl-stage', 'orbit-rig'])
assert.equal(registry.list().length, 1)
assert.equal(registry.unregister('lobby'), true)
assert.equal(registry.get('lobby'), undefined)
assert.deepEqual(registry.featuresFor('lobby'), [], 'negative: missing scene has no features')
assert.equal(registry.unregister('lobby'), false, 'negative: second unregister is false')

console.log('sceneRegistry: ok')
