/**
 * LCL element catalog: unique ids, built helpers exist, heavy names deferred mount.
 * Run: npx tsx front_end/src/lib/lcl/lclElements.unit.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { LCL_ELEMENTS, LCL_ELEMENT_BY_ID, lclElement } from './lclElements.ts'

const ids = LCL_ELEMENTS.map((entry) => entry.id)
assert.equal(new Set(ids).size, ids.length, 'element ids must be unique')

const scrollSrc = fs.readFileSync(fileURLToPath(new URL('../animations/scrollEnter.ts', import.meta.url)), 'utf8')
const exported = new Set(
  [...scrollSrc.matchAll(/export (?:async )?function (\w+)/g)].map((match) => match[1]),
)

for (const entry of LCL_ELEMENTS) {
  if (entry.status !== 'built') continue
  assert.ok(entry.enter, `${entry.id} built entries name an enter helper`)
  assert.ok(entry.leave, `${entry.id} built entries name a leave helper`)
  assert.ok(exported.has(entry.enter), `${entry.id} enter ${entry.enter} must exist in scrollEnter.ts`)
  assert.ok(exported.has(entry.leave), `${entry.id} leave ${entry.leave} must exist in scrollEnter.ts`)
  assert.ok(entry.reference, `${entry.id} built entries name a reference file`)
  if (entry.heavy) {
    assert.equal(entry.heavy, true)
    assert.match(entry.reference, /LclReelPreview|LclMediaFrame/, `${entry.id} heavy must declare deferred mount in a media host`)
  }
}

assert.equal(LCL_ELEMENT_BY_ID['option-list']?.status, 'built')
assert.equal(lclElement('option-list')?.family, 'text')
assert.equal(lclElement('missing'), undefined, 'negative: unknown ids are not in the catalog')

const fakeBuilt = { id: 'no-helper', status: 'built', enter: 'startLclDoesNotExist', leave: 'startLclListOut' }
assert.equal(exported.has(fakeBuilt.enter), false, 'negative: a built entry whose helper does not exist fails')

console.log('lclElements: ok')
