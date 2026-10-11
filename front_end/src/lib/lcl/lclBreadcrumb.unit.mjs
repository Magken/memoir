import assert from 'node:assert/strict'
import { lclCrumbsForPath } from './lclBreadcrumb.ts'

const atEmber = lclCrumbsForPath(['Kindling', 'Ember'], 'Title')
assert.deepEqual(
  atEmber.map((crumb) => crumb.label),
  ['Title', 'Kindling', 'Ember'],
)
assert.equal(atEmber.at(-1)?.current, true)
assert.equal(atEmber[0]?.current, false)
assert.equal(
  atEmber.find((crumb) => crumb.label === 'Flare'),
  undefined,
  'negative: an unopened paragraph link is not a crumb',
)
assert.equal(atEmber.find((crumb) => crumb.label === 'Coal'), undefined)

const afterFlare = lclCrumbsForPath(['Kindling', 'Ember', 'Flare'], 'Title')
assert.deepEqual(
  afterFlare.map((crumb) => crumb.label),
  ['Title', 'Kindling', 'Ember', 'Flare'],
)
assert.equal(afterFlare.at(-1)?.depth, 3)
assert.equal(afterFlare.at(-1)?.current, true)
assert.equal(afterFlare[2]?.current, false)

assert.deepEqual(lclCrumbsForPath([], 'Title'), [])
assert.deepEqual(lclCrumbsForPath([], 'About', { rootWhenEmpty: true }), [
  { label: 'About', depth: 0, current: true },
])
assert.notEqual(
  lclCrumbsForPath([], 'About', { rootWhenEmpty: true }).length,
  0,
  'negative: About Home must not hide the starting About crumb',
)

console.log('lclBreadcrumb: ok')
