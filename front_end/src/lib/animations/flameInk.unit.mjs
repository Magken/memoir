/**
 * Flame ink helpers — class + stable seed.
 * Run: node front_end/src/lib/animations/flameInk.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  FLAME_INK_CLASS,
  FLAME_INK_LINE_CLASS,
  FLAME_INK_SEED_COUNT,
  flameInkClass,
  flameInkProps,
  flameInkSeed,
} from './flameInk.ts'

assert.equal(FLAME_INK_CLASS, 'theme-flame-ink')
assert.equal(FLAME_INK_LINE_CLASS, 'theme-flame-ink__line')
assert.equal(FLAME_INK_SEED_COUNT, 8)
assert.equal(flameInkClass(), FLAME_INK_CLASS)

const a = flameInkSeed('Kindling')
const b = flameInkSeed('Kindling')
const c = flameInkSeed('Ashfall')
assert.equal(a, b, 'same label keeps the same seed')
assert.notEqual(a, c, 'different labels usually diverge')
assert.ok(a >= 0 && a < FLAME_INK_SEED_COUNT)
assert.ok(c >= 0 && c < FLAME_INK_SEED_COUNT)

const props = flameInkProps('Ember')
assert.equal(props.className, FLAME_INK_CLASS)
assert.equal(props['data-ink'], String(flameInkSeed('Ember')))
assert.doesNotMatch(props.className, /data-ink/, 'negative: seed is a data attr, not a class')

console.log('flameInk: ok')
