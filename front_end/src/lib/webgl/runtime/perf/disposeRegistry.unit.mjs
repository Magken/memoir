/**
 * Dispose registry collects and runs cleanup callbacks.
 * Run: npx tsx front_end/src/lib/webgl/runtime/perf/disposeRegistry.unit.mjs
 */
import assert from 'node:assert/strict'
import { createDisposeRegistry } from './disposeRegistry.ts'

const registry = createDisposeRegistry()
const calls = []
registry.add(() => calls.push('a'))
registry.add(() => calls.push('b'))
assert.equal(registry.size, 2)
assert.equal(registry.disposeAll(), 2)
assert.deepEqual(calls, ['a', 'b'])
assert.equal(registry.size, 0, 'disposeAll must empty the set')

const leftover = []
const empty = createDisposeRegistry()
assert.equal(empty.disposeAll(), 0, 'negative: empty registry disposes nothing')
assert.deepEqual(leftover, [], 'negative: empty dispose must not call stray fns')

console.log('disposeRegistry: ok')
